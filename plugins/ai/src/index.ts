/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PluginManifest } from "@lab/core";
import { randomUUID } from "node:crypto";
import pg from "pg";

// ── Types ──────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  name?: string;
  reasoning_content?: string;
}

interface ChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

interface ChatResponse {
  reply: string;
  sources?: KnowledgeSource[];
}

interface KnowledgeSource {
  id: string;
  title: string;
  content: string;
  snippet: string;
  score?: number;
}

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  sourceFileName?: string;
  sourceMimeType?: string;
  sourceImportMethod?: "manual" | "upload";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeCreateRequest {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  sourceFileName?: string;
  sourceMimeType?: string;
  sourceImportMethod?: "manual" | "upload";
}

interface KnowledgeUpdateRequest {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  sourceFileName?: string;
  sourceMimeType?: string;
  sourceImportMethod?: "manual" | "upload";
}

interface KnowledgeUploadRequest {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  fileName?: string;
  mimeType?: string;
}

interface ChatHistoryRecord {
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface FaqTemplate {
  id: string;
  question: string;
  category: string;
  sortOrder: number;
}

// ── AI Provider Interface ──────────────────────────────

interface ChatProvider {
  chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponseMessage>;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
}

interface ChatResponseMessage {
  content: string | null;
  toolCalls?: ToolCall[];
  reasoningContent?: string;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

// ── Ollama Provider ────────────────────────────────────

class OllamaChatProvider implements ChatProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponseMessage> {
    const cleanMessages = messages.map((m) => {
      if (m.role === "assistant" && m.tool_calls?.length) {
        return { ...m, content: null };
      }
      return m;
    });

    const body: any = {
      model: this.model,
      messages: cleanMessages,
      stream: false,
      options: { temperature: 0.7, num_predict: 2048 }
    };
    if (tools?.length) body.tools = tools;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      message?: {
        content?: string;
        reasoning_content?: string;
        tool_calls?: Array<{ function: { name: string; arguments: any } }>;
      };
    };
    const content = data.message?.content ?? null;
    const reasoningContent = data.message?.reasoning_content;
    const rawCalls = data.message?.tool_calls;
    const toolCalls: ToolCall[] | undefined = rawCalls?.map((tc, i) => ({
      id: `call_${i}`,
      name: tc.function.name,
      arguments: tc.function.arguments
    }));

    return { content, toolCalls, reasoningContent };
  }
}

// ── OpenAI Compatible Provider ─────────────────────────

class OpenAICompatibleChatProvider implements ChatProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(baseUrl: string, apiKey: string, model: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ChatResponseMessage> {
    // Clean messages for API compatibility
    const cleanMessages = messages.map((m) => {
      if (m.role === "assistant" && m.tool_calls?.length) {
        const msg: any = {
          role: m.role,
          content: null,
          tool_calls: m.tool_calls
        };
        if (m.reasoning_content) msg.reasoning_content = m.reasoning_content;
        return msg;
      }
      if (m.role === "tool") {
        return { role: m.role, tool_call_id: m.tool_call_id, content: m.content };
      }
      if (m.role === "assistant" && m.reasoning_content) {
        return { role: m.role, content: m.content, reasoning_content: m.reasoning_content };
      }
      return { role: m.role, content: m.content };
    });

    const body: any = {
      model: this.model,
      messages: cleanMessages,
      temperature: 0.7,
      max_tokens: 2048
    };
    if (tools?.length) {
      body.tools = tools.map((t) => ({ type: "function", function: t }));
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      choices?: {
        message?: {
          content?: string;
          reasoning_content?: string;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
      }[];
    };
    const msg = data.choices?.[0]?.message;
    const content = msg?.content ?? null;
    const reasoningContent = msg?.reasoning_content;
    const rawCalls = msg?.tool_calls;
    const toolCalls: ToolCall[] | undefined = rawCalls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>
    }));

    return { content, toolCalls, reasoningContent };
  }
}

// ── Provider Factory ───────────────────────────────────

function createChatProvider(): ChatProvider {
  const provider = (process.env.AI_PROVIDER ?? "ollama").toLowerCase();

  if (provider === "openai") {
    return new OpenAICompatibleChatProvider(
      process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      process.env.OPENAI_API_KEY ?? "",
      process.env.OPENAI_MODEL ?? "gpt-4o-mini"
    );
  }

  // Default: Ollama (open-source, self-hosted)
  return new OllamaChatProvider(
    process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    process.env.OLLAMA_MODEL ?? "qwen2.5:7b"
  );
}

// ── Embedding Provider Interface ────────────────────────

interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

class OllamaEmbeddingProvider implements EmbeddingProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, prompt: text })
      });
      if (!response.ok) {
        throw new Error(`Ollama embedding error ${response.status}`);
      }
      const data = (await response.json()) as { embedding?: number[] };
      if (data.embedding) {
        results.push(data.embedding);
      } else {
        results.push(new Array(768).fill(0));
      }
    }
    return results;
  }
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(baseUrl: string, apiKey: string, model: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ model: this.model, input: texts })
    });
    if (!response.ok) {
      throw new Error(`OpenAI embedding error ${response.status}`);
    }
    const data = (await response.json()) as { data?: Array<{ embedding: number[] }> };
    return (data.data ?? []).map((d) => d.embedding);
  }
}

class NoopEmbeddingProvider implements EmbeddingProvider {
  async embed(_texts: string[]): Promise<number[][]> {
    return _texts.map(() => new Array(384).fill(0));
  }
}

function createEmbeddingProvider(): EmbeddingProvider {
  const provider = (
    process.env.EMBEDDING_PROVIDER ??
    process.env.AI_PROVIDER ??
    "noop"
  ).toLowerCase();

  if (provider === "openai") {
    return new OpenAIEmbeddingProvider(
      process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      process.env.OPENAI_API_KEY ?? "",
      process.env.EMBEDDING_MODEL ?? "text-embedding-3-small"
    );
  }

  if (provider === "ollama") {
    return new OllamaEmbeddingProvider(
      process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
      process.env.EMBEDDING_MODEL ?? "nomic-embed-text"
    );
  }

  return new NoopEmbeddingProvider();
}

interface KnowledgeRepository {
  initialize(): Promise<void>;
  search(query: string, limit?: number): Promise<KnowledgeSource[]>;
  listAll(): Promise<KnowledgeDocument[]>;
  create(input: KnowledgeCreateRequest & { createdBy: string }): Promise<KnowledgeDocument>;
  createWithEmbedding(
    input: KnowledgeCreateRequest & { createdBy: string }
  ): Promise<KnowledgeDocument>;
  update(
    id: string,
    input: KnowledgeUpdateRequest
  ): Promise<KnowledgeDocument | { error: string; status: number }>;
  delete(id: string): Promise<{ error?: string; status?: number }>;
  reindexAll(): Promise<number>;
}

interface ChatHistoryRepository {
  initialize(): Promise<void>;
  getHistory(userId: string, limit?: number): Promise<ChatHistoryRecord[]>;
  addMessage(
    userId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<ChatHistoryRecord>;
  clearHistory(userId: string): Promise<void>;
}

interface FaqTemplateRepository {
  initialize(): Promise<void>;
  listAll(): Promise<FaqTemplate[]>;
}

class PostgresKnowledgeRepository implements KnowledgeRepository {
  private readonly pool: pg.Pool;
  private readonly embeddingProvider: EmbeddingProvider;

  constructor(databaseUrl: string, embeddingProvider?: EmbeddingProvider) {
    this.pool = new pg.Pool({ connectionString: databaseUrl });
    this.embeddingProvider = embeddingProvider ?? createEmbeddingProvider();
  }

  async initialize(): Promise<void> {
    // Create schema and core tables first (no vector dependency)
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS ai;

      CREATE TABLE IF NOT EXISTS ai.knowledge_document (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        tags TEXT[] NOT NULL DEFAULT '{}',
        source_file_name TEXT,
        source_mime_type TEXT,
        source_import_method TEXT NOT NULL DEFAULT 'manual',
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS ai.chat_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_chat_history_user_id
        ON ai.chat_history(user_id, created_at);

      CREATE TABLE IF NOT EXISTS ai.faq_template (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        sort_order INTEGER NOT NULL DEFAULT 0
      );
    `);

    await this.pool.query(`
      ALTER TABLE ai.knowledge_document
        ADD COLUMN IF NOT EXISTS source_file_name TEXT,
        ADD COLUMN IF NOT EXISTS source_mime_type TEXT,
        ADD COLUMN IF NOT EXISTS source_import_method TEXT NOT NULL DEFAULT 'manual';
    `);

    // Try pgvector extension; if installed, use native vector type, else TEXT fallback
    let hasVector = false;
    try {
      await this.pool.query("CREATE EXTENSION IF NOT EXISTS vector");
      // Verify the extension is usable
      const r = await this.pool.query("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
      hasVector = r.rows.length > 0;
    } catch {
      hasVector = false;
    }

    if (hasVector) {
      try {
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS ai.knowledge_embedding (
            id TEXT PRIMARY KEY,
            doc_id TEXT NOT NULL REFERENCES ai.knowledge_document(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL DEFAULT 0,
            chunk_text TEXT NOT NULL,
            embedding vector(384)
          )
        `);
        await this.pool.query(
          "CREATE INDEX IF NOT EXISTS idx_embedding_doc ON ai.knowledge_embedding(doc_id)"
        );
      } catch {
        // vector type still not available, fall through to TEXT fallback
        hasVector = false;
      }
    }

    if (!hasVector) {
      // Fallback: TEXT column for embedding (keyword search only)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ai.knowledge_embedding (
          id TEXT PRIMARY KEY,
          doc_id TEXT NOT NULL REFERENCES ai.knowledge_document(id) ON DELETE CASCADE,
          chunk_index INTEGER NOT NULL DEFAULT 0,
          chunk_text TEXT NOT NULL,
          embedding_text TEXT
        )
      `);
      await this.pool.query(
        "CREATE INDEX IF NOT EXISTS idx_embedding_doc ON ai.knowledge_embedding(doc_id)"
      );
    }

    // Store whether vector search is available for search() to use
    (this as Record<string, unknown>)._hasVector = hasVector;

    await this.seedFaqTemplates();
  }

  private async seedFaqTemplates(): Promise<void> {
    const count = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM ai.faq_template"
    );
    if (Number(count.rows[0]?.count ?? 0) > 0) return;

    const templates: Omit<FaqTemplate, "id">[] = [
      { question: "实验室的开放时间是？", category: "规章制度", sortOrder: 1 },
      { question: "如何申请实验耗材？", category: "耗材管理", sortOrder: 2 },
      { question: "会议室如何预约？", category: "会议管理", sortOrder: 3 },
      { question: "如何上传实验数据？", category: "文件管理", sortOrder: 4 },
      { question: "忘记密码怎么办？", category: "账号管理", sortOrder: 5 },
      { question: "设备使用规范有哪些？", category: "规章制度", sortOrder: 6 },
      { question: "实验室安全培训要求？", category: "安全培训", sortOrder: 7 },
      { question: "如何加入课题组？", category: "项目管理", sortOrder: 8 }
    ];

    for (const tmpl of templates) {
      await this.pool.query(
        `INSERT INTO ai.faq_template (id, question, category, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [randomUUID(), tmpl.question, tmpl.category, tmpl.sortOrder]
      );
    }
  }

  async search(query: string, limit = 3): Promise<KnowledgeSource[]> {
    // 1. Try embedding-based semantic search
    try {
      const queryEmbeds = await this.embeddingProvider.embed([query]);
      const queryVec = queryEmbeds[0];
      if (queryVec && queryVec.some((v) => v !== 0)) {
        const vecStr = `[${queryVec.join(",")}]`;
        const result = await this.pool.query<{
          id: string;
          title: string;
          content: string;
          chunk_text: string;
          distance: number;
        }>(
          `SELECT d.id, d.title, d.content, e.chunk_text,
                  e.embedding <=> $1::vector AS distance
           FROM ai.knowledge_embedding e
           JOIN ai.knowledge_document d ON d.id = e.doc_id
           ORDER BY e.embedding <=> $1::vector
           LIMIT $2`,
          [vecStr, limit]
        );
        if (result.rows.length > 0) {
          return result.rows.map((row: any) => ({
            id: row.id,
            title: row.title,
            content: row.content,
            snippet:
              (row.chunk_text ?? row.content).slice(0, 300) +
              ((row.chunk_text ?? row.content).length > 300 ? "..." : ""),
            score: 1 - (row.distance ?? 0)
          }));
        }
      }
    } catch {
      // pgvector embedding search unavailable, fall back to ILIKE
    }

    // 2. Fallback to keyword search
    const result = await this.pool.query<{
      id: string;
      title: string;
      content: string;
    }>(
      `SELECT id, title, content FROM ai.knowledge_document
       WHERE title ILIKE $1 OR content ILIKE $1
       ORDER BY
         CASE WHEN title ILIKE $1 THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT $2`,
      [`%${query}%`, limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      snippet: row.content.slice(0, 300) + (row.content.length > 300 ? "..." : "")
    }));
  }

  async listAll(): Promise<KnowledgeDocument[]> {
    const result = await this.pool.query(
      "SELECT * FROM ai.knowledge_document ORDER BY updated_at DESC"
    );
    return result.rows.map(mapKnowledgeRow);
  }

  async create(input: KnowledgeCreateRequest & { createdBy: string }): Promise<KnowledgeDocument> {
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO ai.knowledge_document (
        id, title, content, category, tags, source_file_name, source_mime_type,
        source_import_method, created_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        input.title,
        input.content,
        input.category ?? "general",
        input.tags ?? [],
        input.sourceFileName ?? null,
        input.sourceMimeType ?? null,
        input.sourceImportMethod ?? "manual",
        input.createdBy
      ]
    );
    return mapKnowledgeRow(result.rows[0]);
  }

  async update(
    id: string,
    input: KnowledgeUpdateRequest
  ): Promise<KnowledgeDocument | { error: string; status: number }> {
    const existing = await this.pool.query("SELECT * FROM ai.knowledge_document WHERE id = $1", [
      id
    ]);
    if (!existing.rows[0]) {
      return { error: "Knowledge document not found", status: 404 };
    }

    const title = input.title ?? existing.rows[0].title;
    const content = input.content ?? existing.rows[0].content;
    const category = input.category ?? existing.rows[0].category;
    const tags = input.tags ?? existing.rows[0].tags;
    const sourceFileName = input.sourceFileName ?? existing.rows[0].source_file_name;
    const sourceMimeType = input.sourceMimeType ?? existing.rows[0].source_mime_type;
    const sourceImportMethod =
      input.sourceImportMethod ?? existing.rows[0].source_import_method ?? "manual";

    const result = await this.pool.query(
      `UPDATE ai.knowledge_document
       SET title = $2, content = $3, category = $4, tags = $5, source_file_name = $6,
           source_mime_type = $7, source_import_method = $8, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, title, content, category, tags, sourceFileName, sourceMimeType, sourceImportMethod]
    );
    return mapKnowledgeRow(result.rows[0]);
  }

  async delete(id: string): Promise<{ error?: string; status?: number }> {
    // Delete embeddings first
    await this.pool.query("DELETE FROM ai.knowledge_embedding WHERE doc_id = $1", [id]);
    const result = await this.pool.query("DELETE FROM ai.knowledge_document WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return { error: "Knowledge document not found", status: 404 };
    }
    return {};
  }

  async createWithEmbedding(
    input: KnowledgeCreateRequest & { createdBy: string }
  ): Promise<KnowledgeDocument> {
    const doc = await this.create(input);

    // Chunk and embed the content
    const chunks = chunkText(doc.content, 500, 100);
    try {
      const embeddings = await this.embeddingProvider.embed(chunks);
      for (let i = 0; i < chunks.length; i++) {
        const vecStr = `[${embeddings[i].join(",")}]`;
        try {
          await this.pool.query(
            `INSERT INTO ai.knowledge_embedding (id, doc_id, chunk_index, chunk_text, embedding)
             VALUES ($1, $2, $3, $4, $5::vector)`,
            [randomUUID(), doc.id, i, chunks[i], vecStr]
          );
        } catch {
          // Fallback: store as text when no pgvector
          await this.pool.query(
            `INSERT INTO ai.knowledge_embedding (id, doc_id, chunk_index, chunk_text, embedding_text)
             VALUES ($1, $2, $3, $4, $5)`,
            [randomUUID(), doc.id, i, chunks[i], vecStr]
          );
        }
      }
    } catch {
      // Embedding generation failed — doc is still searchable via keyword
    }

    return doc;
  }

  async reindexAll(): Promise<number> {
    const docs = await this.listAll();
    // Clear existing embeddings
    await this.pool.query("DELETE FROM ai.knowledge_embedding");
    let count = 0;
    for (const doc of docs) {
      const chunks = chunkText(doc.content, 500, 100);
      try {
        const embeddings = await this.embeddingProvider.embed(chunks);
        for (let i = 0; i < chunks.length; i++) {
          const vecStr = `[${embeddings[i].join(",")}]`;
          try {
            await this.pool.query(
              `INSERT INTO ai.knowledge_embedding (id, doc_id, chunk_index, chunk_text, embedding)
               VALUES ($1, $2, $3, $4, $5::vector)`,
              [randomUUID(), doc.id, i, chunks[i], vecStr]
            );
          } catch {
            await this.pool.query(
              `INSERT INTO ai.knowledge_embedding (id, doc_id, chunk_index, chunk_text, embedding_text)
               VALUES ($1, $2, $3, $4, $5)`,
              [randomUUID(), doc.id, i, chunks[i], vecStr]
            );
          }
        }
        count++;
      } catch {
        // Skip docs that fail embedding
      }
    }
    return count;
  }
}

// ── Text Chunking Utility ────────────────────────────────

function chunkText(text: string, maxLen: number, overlap: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLen;
    if (end < text.length) {
      // Try to break at sentence boundary
      const lastPeriod = text.lastIndexOf("。", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline, end - 50);
      end = breakPoint > start + 50 ? breakPoint + 1 : end;
    }
    chunks.push(text.slice(start, Math.min(end, text.length)));
    start = end - overlap;
    if (start < 0) start = 0;
    if (start >= text.length) break;
  }
  return chunks;
}

class PostgresChatHistoryRepository implements ChatHistoryRepository {
  private readonly pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  async initialize(): Promise<void> {
    // Table created by KnowledgeRepository.initialize()
  }

  async getHistory(userId: string, limit = 20): Promise<ChatHistoryRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM ai.chat_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map(mapChatHistoryRow).reverse(); // Return in chronological order
  }

  async addMessage(
    userId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<ChatHistoryRecord> {
    const id = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO ai.chat_history (id, user_id, role, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, userId, role, content]
    );
    return mapChatHistoryRow(result.rows[0]);
  }

  async clearHistory(userId: string): Promise<void> {
    await this.pool.query("DELETE FROM ai.chat_history WHERE user_id = $1", [userId]);
  }
}

class PostgresFaqTemplateRepository implements FaqTemplateRepository {
  private readonly pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  async initialize(): Promise<void> {
    // Table created by KnowledgeRepository.initialize()
  }

  async listAll(): Promise<FaqTemplate[]> {
    const result = await this.pool.query("SELECT * FROM ai.faq_template ORDER BY sort_order");
    return result.rows.map((row: any) => ({
      id: String(row.id),
      question: String(row.question),
      category: String(row.category),
      sortOrder: Number(row.sort_order)
    }));
  }
}

// ── Row Mappers ────────────────────────────────────────

function mapKnowledgeRow(row: any | { [key: string]: unknown }): KnowledgeDocument {
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    category: String(row.category),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    sourceFileName: row.source_file_name ? String(row.source_file_name) : undefined,
    sourceMimeType: row.source_mime_type ? String(row.source_mime_type) : undefined,
    sourceImportMethod: row.source_import_method === "upload" ? "upload" : ("manual" as const),
    createdBy: String(row.created_by),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

function mapChatHistoryRow(row: any): ChatHistoryRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    role: row.role as "user" | "assistant",
    content: String(row.content),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

// ── RAG Engine ─────────────────────────────────────────

const SYSTEM_PROMPT = `你是实验室智能助手，可以主动查询项目数据并帮助用户操作。

你有以下能力：
1. 查询库存、申请、会议、通知、文件等实时项目数据
2. 帮助用户提交耗材申请
3. 基于知识库回答实验室规章制度和流程问题

使用工具获取数据，不要编造数据。回答简洁专业，用中文。
如果用户问的问题需要当前数据（如库存还剩多少、有哪些待审批），必须调用对应工具查询后回答。
如果用户要求执行操作（如帮我申请耗材），先确认信息再调用工具。`;

function buildRagPrompt(userMessage: string, sources: KnowledgeSource[]): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];

  if (sources.length > 0) {
    const context = sources
      .map((s, i) => `[参考文档${i + 1}] ${s.title}\n${s.content ?? s.snippet}`)
      .join("\n\n");
    messages.push({
      role: "system",
      content: `以下是知识库中与用户问题相关的参考文档，请优先基于这些文档回答：\n\n${context}`
    });
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

// ── Agent Tools ────────────────────────────────────────

const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "get_inventory_status",
    description: "查询当前耗材库存状态，包括所有耗材的名称、库存量、预警阈值、位置",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_pending_applications",
    description: "查询待审批的耗材申请列表",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_my_applications",
    description: "查询当前用户的耗材申请记录及状态",
    parameters: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_stock_movements",
    description: "查询最近的库存流水记录（入库/出库）",
    parameters: {
      type: "object",
      properties: {
        material_name: { type: "string", description: "可选，按耗材名称筛选" },
        limit: { type: "number", description: "返回条数，默认 10" }
      },
      required: []
    }
  },
  {
    name: "get_meetings",
    description: "查询近期会议安排",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "可选，scheduled=未开会, completed=已完成" }
      },
      required: []
    }
  },
  {
    name: "get_notifications",
    description: "查询站内通知",
    parameters: {
      type: "object",
      properties: {
        unread_only: { type: "boolean", description: "是否只看未读，默认 true" }
      },
      required: []
    }
  },
  {
    name: "get_file_list",
    description: "浏览文件资料列表",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "可选，按标题搜索" },
        category: { type: "string", description: "可选，分类：sop/template/record/dataset/other" }
      },
      required: []
    }
  },
  {
    name: "submit_application",
    description: "为用户提交耗材申请（需确认耗材名称和数量）",
    parameters: {
      type: "object",
      properties: {
        material_name: { type: "string", description: "耗材名称（需与库存中名称一致）" },
        quantity: { type: "number", description: "申请数量" },
        reason: { type: "string", description: "用途说明" }
      },
      required: ["material_name", "quantity", "reason"]
    }
  }
];

async function executeTool(toolCall: ToolCall, pool: pg.Pool, actorId: string): Promise<string> {
  const args = toolCall.arguments;
  const client = await pool.connect();
  try {
    switch (toolCall.name) {
      case "get_inventory_status": {
        const r = await client.query(
          "SELECT name, spec, stock, warn_stock, unit, location FROM inventory.material ORDER BY name"
        );
        if (!r.rows.length) return "当前库存中没有耗材记录。";
        return r.rows
          .map(
            (row: any) =>
              `${row.name}（${row.spec}）：库存 ${row.stock}${row.unit}，` +
              `${row.stock <= row.warn_stock ? "⚠️ 低于预警值 " + row.warn_stock + "，" : ""}` +
              `存放于 ${row.location}`
          )
          .join("\n");
      }

      case "get_pending_applications": {
        const r = await client.query(
          "SELECT applicant_name, material_name, quantity, reason, status, created_at " +
            "FROM inventory.application WHERE status = 'pending' ORDER BY created_at DESC"
        );
        if (!r.rows.length) return "当前没有待审批的申请。";
        return r.rows
          .map(
            (row: any) =>
              `${row.applicant_name} 申请 ${row.material_name} × ${row.quantity}，` +
              `用途：${row.reason}（${new Date(row.created_at).toLocaleString()}）`
          )
          .join("\n");
      }

      case "get_my_applications": {
        const r = await client.query(
          "SELECT material_name, quantity, reason, status, created_at " +
            "FROM inventory.application WHERE applicant_id = $1 ORDER BY created_at DESC LIMIT 10",
          [actorId]
        );
        if (!r.rows.length) return "你还没有提交过耗材申请。";
        return r.rows
          .map(
            (row: any) =>
              `[${row.status === "pending" ? "待审批" : row.status === "approved" ? "已批准" : "已拒绝"}] ` +
              `${row.material_name} × ${row.quantity}，用途：${row.reason}`
          )
          .join("\n");
      }

      case "get_stock_movements": {
        const materialFilter = args.material_name as string | undefined;
        const limit = (args.limit as number) || 10;
        let query =
          "SELECT material_id as name, quantity, type, remark, created_at FROM inventory.stock_movement";
        const params: unknown[] = [];
        if (materialFilter) {
          query += " WHERE material_id ILIKE $1";
          params.push(`%${materialFilter}%`);
        }
        query += " ORDER BY created_at DESC LIMIT $" + (params.length + 1);
        params.push(limit);
        const r = await client.query(query, params);
        if (!r.rows.length) return "暂无库存流水记录。";
        return r.rows
          .map(
            (row: any) =>
              `${row.type === "stock_in" ? "入库" : "出库"} ${row.name} × ${row.quantity}，` +
              `备注：${row.remark}（${new Date(row.created_at).toLocaleString()}）`
          )
          .join("\n");
      }

      case "get_meetings": {
        const status = args.status as string | undefined;
        let query =
          "SELECT title, starts_at, ends_at, location, status, summary FROM collaboration.meeting";
        const params: unknown[] = [];
        if (status) {
          query += " WHERE status = $1";
          params.push(status);
        }
        query += " ORDER BY starts_at DESC LIMIT 10";
        const r = await client.query(query, params);
        if (!r.rows.length) return "暂无会议记录。";
        return r.rows
          .map(
            (row: any) =>
              `[${row.status === "scheduled" ? "未开" : row.status === "completed" ? "已完成" : "已取消"}] ` +
              `${row.title}，${new Date(row.starts_at).toLocaleString()} @ ${row.location}`
          )
          .join("\n");
      }

      case "get_notifications": {
        const unreadOnly = args.unread_only !== false;
        const query = unreadOnly
          ? "SELECT title, content, type, created_at FROM collaboration.notification WHERE read_at IS NULL ORDER BY created_at DESC LIMIT 10"
          : "SELECT title, content, type, created_at FROM collaboration.notification ORDER BY created_at DESC LIMIT 10";
        const r = await client.query(query);
        if (!r.rows.length) return unreadOnly ? "没有未读通知。" : "暂无通知。";
        return r.rows
          .map(
            (row: any) =>
              `[${row.type}] ${row.title}：${String(row.content).slice(0, 80)}` +
              `${String(row.content).length > 80 ? "..." : ""}`
          )
          .join("\n");
      }

      case "get_file_list": {
        const search = args.search as string | undefined;
        const category = args.category as string | undefined;
        const conditions: string[] = ["node_type = 'file'"];
        const params: unknown[] = [];
        if (search) {
          conditions.push(`title ILIKE $${params.length + 1}`);
          params.push(`%${search}%`);
        }
        if (category) {
          conditions.push(`category = $${params.length + 1}`);
          params.push(category);
        }
        const r = await client.query(
          `SELECT title, category, current_version, description FROM files.lab_file WHERE ${conditions.join(" AND ")} ORDER BY updated_at DESC LIMIT 10`,
          params
        );
        if (!r.rows.length) return "没有找到匹配的文件。";
        return r.rows
          .map(
            (row: any) =>
              `[${row.category}] ${row.title}（v${row.current_version}）：${String(row.description).slice(0, 60)}`
          )
          .join("\n");
      }

      case "submit_application": {
        const materialName = args.material_name as string;
        const quantity = (args.quantity as number) || 1;
        const reason = (args.reason as string) || "AI 协助申请";

        // Match by name, or name+spec combined
        let mat = await client.query(
          "SELECT id, name, stock, unit FROM inventory.material WHERE name ILIKE $1 OR (name || '（' || spec || '）') ILIKE $1",
          [`%${materialName}%`]
        );
        if (!mat.rows.length) {
          mat = await client.query(
            "SELECT id, name, stock, unit FROM inventory.material WHERE name ILIKE $1",
            [`%${materialName.replace(/（.*）$/, "")}%`]
          );
        }
        if (!mat.rows.length)
          return `错误：耗材"${materialName}"不存在，请先使用 get_inventory_status 查看可用耗材。`;
        const m = mat.rows[0];

        const appId = randomUUID();
        await client.query(
          `INSERT INTO inventory.application (id, material_id, material_name, applicant_id, applicant_name, quantity, reason, status, created_at)
           VALUES ($1, $2, $3, $4, 'AI_Agent', $5, $6, 'pending', now())`,
          [appId, m.id, m.name, actorId, quantity, reason]
        );

        await client.query(
          `INSERT INTO inventory.stock_movement (id, material_id, operator_id, quantity, type, remark, created_at)
           VALUES ($1, $2, $3, $4, 'application_out', $5, now())`,
          [randomUUID(), m.id, actorId, quantity, `AI Agent 提交申请：${reason}`]
        );

        return `已提交申请：${m.name} × ${quantity}${m.unit}，用途：${reason}。申请状态：待审批。`;
      }

      default:
        return `未知工具：${toolCall.name}`;
    }
  } finally {
    client.release();
  }
}

// ── Plugin Manifest ────────────────────────────────────

export const aiPlugin: PluginManifest = {
  name: "ai",
  version: "0.1.0",
  description: "AI 智能问答模块：支持 LLM 对话、知识库 RAG 问答、FAQ 模板",
  capabilities: ["ai:chat", "ai:knowledge", "ai:templates"],
  routes: [
    {
      method: "POST",
      path: "/ai/chat",
      permission: "ai:use",
      summary: "发送消息给 AI 助手，获取回复"
    },
    {
      method: "GET",
      path: "/ai/chat-history",
      permission: "ai:use",
      summary: "获取当前用户的对话历史"
    },
    {
      method: "DELETE",
      path: "/ai/chat-history",
      permission: "ai:use",
      summary: "清除当前用户的对话历史"
    },
    {
      method: "GET",
      path: "/ai/knowledge",
      permission: "ai:use",
      summary: "查询知识库文档列表"
    },
    {
      method: "POST",
      path: "/ai/knowledge",
      permission: "ai:use",
      summary: "添加知识库文档"
    },
    {
      method: "PUT",
      path: "/ai/knowledge/:id",
      permission: "ai:use",
      summary: "更新知识库文档"
    },
    {
      method: "DELETE",
      path: "/ai/knowledge/:id",
      permission: "ai:use",
      summary: "删除知识库文档"
    },
    {
      method: "GET",
      path: "/ai/templates",
      permission: "ai:use",
      summary: "获取 FAQ 问题模板"
    }
  ],
  eventsPublished: ["ai.chat.completed"],
  eventsSubscribed: [],
  async activate(context) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      context.logger.warn("ai.plugin.noDatabase", {
        message: "DATABASE_URL not set, AI plugin running without persistence"
      });
      return {
        name: "ai",
        routes: [
          {
            method: "POST",
            path: "/ai/chat",
            permission: "ai:use",
            summary: "发送消息给 AI 助手",
            handler: async ({ actor }) => {
              if (!actor) return { status: 401, body: { error: "Unauthorized" } };
              return {
                body: {
                  reply:
                    "AI 服务未配置数据库连接，请设置 DATABASE_URL 环境变量。如需使用 AI 功能，请参考 docs/06-delivery/ai-provider-integration.md 配置 AI 提供商。",
                  sources: []
                } as ChatResponse
              };
            }
          }
        ]
      };
    }

    const pool = new pg.Pool({ connectionString: databaseUrl });
    const embeddingProvider = createEmbeddingProvider();
    const knowledgeRepo = new PostgresKnowledgeRepository(databaseUrl, embeddingProvider);
    const chatHistoryRepo = new PostgresChatHistoryRepository(pool);
    const faqRepo = new PostgresFaqTemplateRepository(pool);
    const chatProvider = createChatProvider();

    await knowledgeRepo.initialize();
    await chatHistoryRepo.initialize();
    await faqRepo.initialize();

    context.logger.info("ai.plugin.ready", {
      provider: process.env.AI_PROVIDER ?? "ollama",
      model:
        process.env.AI_PROVIDER === "openai"
          ? (process.env.OPENAI_MODEL ?? "gpt-4o-mini")
          : (process.env.OLLAMA_MODEL ?? "qwen2.5:7b")
    });

    return {
      name: "ai",
      routes: [
        // ── Chat ──
        {
          method: "POST",
          path: "/ai/chat",
          permission: "ai:use",
          summary: "发送消息给 AI 助手（支持 Agent 工具调用）",
          handler: async ({ actor, body }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };

            const request = body as Partial<ChatRequest>;
            if (!request.message?.trim()) {
              return { status: 400, body: { error: "message is required" } };
            }

            try {
              // 1. Search knowledge base with embeddings
              const sources = await knowledgeRepo.search(request.message);

              // 2. Get chat history (use passed history from frontend + DB history)
              const dbHistory = await chatHistoryRepo.getHistory(actor.id, 6);
              const passedHistory: ChatMessage[] = (request.history ?? []).map((h) => ({
                role: h.role as "user" | "assistant",
                content: h.content
              }));
              const recentMessages: ChatMessage[] = [
                ...dbHistory.map((h) => ({ role: h.role, content: h.content }) as ChatMessage),
                ...passedHistory
              ].slice(-10);

              // 3. Build messages with improved context management
              const ragMessages = buildRagPrompt(request.message, sources);
              const messages: ChatMessage[] = [
                ragMessages[0]!,
                ...ragMessages.slice(1, -1),
                ...recentMessages,
                ragMessages[ragMessages.length - 1]!
              ];

              // Deduplicate consecutive identical messages
              const deduped: ChatMessage[] = [];
              for (const m of messages) {
                const prev = deduped[deduped.length - 1];
                if (prev && prev.role === m.role && prev.content === m.content) continue;
                deduped.push(m);
              }

              // 4. Agent loop: call AI with tools, execute tool calls, repeat
              let reply = "";
              let toolCallCount = 0;
              const maxToolRounds = 3;

              for (let round = 0; round < maxToolRounds; round++) {
                const result = await chatProvider.chat(deduped, AGENT_TOOLS);

                let toolCalls: ToolCall[] = result.toolCalls || [];

                // Fallback: parse text-based <invoke> tool calls from content
                if (!toolCalls.length && result.content) {
                  const invokeRegex = /<invoke name="([^"]+)">[\s\S]*?<\/invoke>/g;
                  let match;
                  let callIdx = 0;
                  while ((match = invokeRegex.exec(result.content)) !== null) {
                    const name = match[1]!;
                    const args: any = {};
                    const paramRegex =
                      /<parameter name="([^"]+)" string="(true|false)">([^<]*)<\/parameter>/g;
                    let pm;
                    while ((pm = paramRegex.exec(match[0])) !== null) {
                      const val = pm[3]!;
                      args[pm[1]!] = pm[2] === "false" ? Number(val) || val : val;
                    }
                    toolCalls.push({ id: `fallback_${callIdx++}`, name, arguments: args });
                  }
                }

                if (toolCalls.length) {
                  const assistantMsg: ChatMessage = {
                    role: "assistant",
                    content: result.content || "",
                    tool_calls: toolCalls.map((tc) => ({
                      id: tc.id,
                      type: "function",
                      function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
                    }))
                  };
                  if (result.reasoningContent)
                    assistantMsg.reasoning_content = result.reasoningContent;
                  deduped.push(assistantMsg);
                  for (const tc of toolCalls) {
                    const toolResult = await executeTool(tc, pool, actor.id);
                    deduped.push({
                      role: "tool",
                      tool_call_id: tc.id,
                      content: toolResult
                    } as ChatMessage);
                    toolCallCount++;
                  }
                } else if (result.content) {
                  reply = result.content;
                  break;
                } else {
                  reply = "（AI 未返回有效响应）";
                  break;
                }
              }

              if (!reply && toolCallCount > 0) {
                // Final call to summarize tool results
                const finalResult = await chatProvider.chat(deduped);
                reply = finalResult.content ?? "（工具已执行，但 AI 未返回总结）";
              }

              // 5. Save to history
              await chatHistoryRepo.addMessage(actor.id, "user", request.message);
              await chatHistoryRepo.addMessage(actor.id, "assistant", reply);

              // 6. Audit
              await context.audit.record({
                actorId: actor.id,
                action: "ai.chat.completed",
                targetType: "ai_chat",
                occurredAt: new Date().toISOString(),
                metadata: {
                  messageLength: request.message.length,
                  replyLength: reply.length,
                  sourcesCount: sources.length,
                  toolCalls: toolCallCount
                }
              });

              return {
                body: { reply, sources } as ChatResponse
              };
            } catch (error) {
              context.logger.error("ai.chat.error", {
                error: error instanceof Error ? error.message : "Unknown error"
              });
              return {
                status: 502,
                body: {
                  error: "AI 服务暂时不可用，请检查 AI 提供商配置或稍后重试。",
                  detail: error instanceof Error ? error.message : "Unknown error"
                }
              };
            }
          }
        },

        // ── Chat History ──
        {
          method: "GET",
          path: "/ai/chat-history",
          permission: "ai:use",
          summary: "获取对话历史",
          handler: async ({ actor }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };
            const history = await chatHistoryRepo.getHistory(actor.id);
            return { body: history };
          }
        },
        {
          method: "DELETE",
          path: "/ai/chat-history",
          permission: "ai:use",
          summary: "清除对话历史",
          handler: async ({ actor }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };
            await chatHistoryRepo.clearHistory(actor.id);
            return { body: { ok: true } };
          }
        },

        // ── Knowledge Base ──
        {
          method: "GET",
          path: "/ai/knowledge",
          permission: "ai:use",
          summary: "查询知识库文档",
          handler: async () => {
            const docs = await knowledgeRepo.listAll();
            return { body: docs };
          }
        },
        {
          method: "POST",
          path: "/ai/knowledge",
          permission: "ai:use",
          summary: "添加知识库文档",
          handler: async ({ actor, body }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };

            const input = body as Partial<KnowledgeCreateRequest>;
            if (!input.title?.trim() || !input.content?.trim()) {
              return { status: 400, body: { error: "title and content are required" } };
            }

            const doc = await knowledgeRepo.createWithEmbedding({
              title: input.title,
              content: input.content,
              category: input.category,
              tags: input.tags,
              sourceFileName: input.sourceFileName,
              sourceMimeType: input.sourceMimeType,
              sourceImportMethod: input.sourceImportMethod,
              createdBy: actor.id
            });

            await context.audit.record({
              actorId: actor.id,
              action: "ai.knowledge.created",
              targetType: "ai_knowledge",
              targetId: doc.id,
              occurredAt: new Date().toISOString(),
              metadata: { title: doc.title }
            });

            return { status: 201, body: doc };
          }
        },
        {
          method: "PUT",
          path: "/ai/knowledge/:id",
          permission: "ai:use",
          summary: "更新知识库文档",
          handler: async ({ actor, params, body }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };

            const input = body as Partial<KnowledgeUpdateRequest>;
            const result = await knowledgeRepo.update(params.id, input);
            if ("error" in result) {
              return { status: result.status, body: { error: result.error } };
            }

            await context.audit.record({
              actorId: actor.id,
              action: "ai.knowledge.updated",
              targetType: "ai_knowledge",
              targetId: result.id,
              occurredAt: new Date().toISOString(),
              metadata: { title: result.title }
            });

            return { body: result };
          }
        },
        {
          method: "DELETE",
          path: "/ai/knowledge/:id",
          permission: "ai:use",
          summary: "删除知识库文档",
          handler: async ({ actor, params }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };

            const result = await knowledgeRepo.delete(params.id);
            if (result.error) {
              return { status: result.status!, body: { error: result.error } };
            }

            await context.audit.record({
              actorId: actor.id,
              action: "ai.knowledge.deleted",
              targetType: "ai_knowledge",
              targetId: params.id,
              occurredAt: new Date().toISOString()
            });

            return { body: { ok: true } };
          }
        },

        // ── Document Upload ──
        {
          method: "POST",
          path: "/ai/knowledge/upload",
          permission: "ai:use",
          summary: "上传文档到知识库（支持 Markdown/JSON/TXT，自动生成向量嵌入）",
          handler: async ({ actor, body }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };

            const input = body as Partial<KnowledgeUploadRequest>;
            if (!input.title?.trim() || !input.content?.trim()) {
              return { status: 400, body: { error: "title and content are required" } };
            }

            const doc = await knowledgeRepo.createWithEmbedding({
              title: input.title.trim(),
              content: input.content.trim(),
              category: input.category ?? "general",
              tags: input.tags ?? [],
              sourceFileName: input.fileName?.trim() || undefined,
              sourceMimeType: input.mimeType?.trim() || undefined,
              sourceImportMethod: "upload",
              createdBy: actor.id
            });

            await context.audit.record({
              actorId: actor.id,
              action: "ai.knowledge.uploaded",
              targetType: "ai_knowledge",
              targetId: doc.id,
              occurredAt: new Date().toISOString(),
              metadata: {
                title: doc.title,
                fileName: input.fileName ?? "unknown",
                mimeType: input.mimeType ?? "text/plain",
                contentLength: input.content.length
              }
            });

            return { status: 201, body: doc };
          }
        },

        // ── Reindex ──
        {
          method: "POST",
          path: "/ai/knowledge/reindex",
          permission: "ai:use",
          summary: "重建所有知识文档的向量索引",
          handler: async ({ actor }) => {
            if (!actor) return { status: 401, body: { error: "Unauthorized" } };

            try {
              const count = await knowledgeRepo.reindexAll();
              await context.audit.record({
                actorId: actor.id,
                action: "ai.knowledge.reindexed",
                targetType: "ai_knowledge",
                occurredAt: new Date().toISOString(),
                metadata: { documentCount: count }
              });
              return { body: { ok: true, reindexedCount: count } };
            } catch (error) {
              return {
                status: 500,
                body: {
                  error: "重建索引失败",
                  detail: error instanceof Error ? error.message : "Unknown error"
                }
              };
            }
          }
        },

        // ── FAQ Templates ──
        {
          method: "GET",
          path: "/ai/templates",
          permission: "ai:use",
          summary: "获取 FAQ 问题模板",
          handler: async () => {
            const templates = await faqRepo.listAll();
            return { body: templates };
          }
        }
      ]
    };
  }
};
