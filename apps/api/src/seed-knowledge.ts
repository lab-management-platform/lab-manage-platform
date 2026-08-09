import { config } from "dotenv";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed AI knowledge base.");
}

const seedDir = path.resolve(__dirname, "../../../plugins/ai/src/knowledge-seed");
const seedActorId = process.env.AI_SEED_CREATED_BY || "00000000-0000-0000-0000-000000000000";
const forceRecreate = process.argv.includes("--force");

type SeedDoc = {
  title: string;
  content: string;
  category: string;
  tags: string[];
  sourceFileName: string;
};

function extractFrontMatter(md: string, fallbackTitle: string, fallbackCategory: string) {
  const mdTrimmed = md.replace(/^\uFEFF/, "");
  const fm = mdTrimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  let content = mdTrimmed;
  let category = fallbackCategory;
  let tags: string[] = [];
  let title = fallbackTitle;
  if (fm) {
    const yaml = fm[1] || "";
    content = fm[2] || "";
    for (const rawLine of yaml.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf(":");
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const rawValue = line.slice(idx + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");
      if (key === "category") category = value || fallbackCategory;
      if (key === "title") title = value || fallbackTitle;
      if (key === "tags") {
        const m = value.match(/^\[(.*)\]$/);
        if (m) {
          tags = m[1]!
            .split(",")
            .map((t) => t.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean);
        } else {
          tags = value
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        }
      }
    }
  }
  return { title, category, tags, content };
}

function inferCategoryFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  const map: Array<[RegExp, string]> = [
    [/(定位|功能边界|快速开始|登录|入口|FAQ|常见问题|索引)/, "平台概览"],
    [/(账号|密码|权限|角色|信息)/, "账号与权限"],
    [/(项目|任务|进度|汇报|笔记|项目树|归档|立项|目录|创建)/, "项目管理"],
    [/(物资|耗材|申请|审批|入库|出库|调拨|台账|器材|借还|逾期|目录|分类|库存)/, "物资管理"],
    [/(文件|资料|上传|共享|版本|NAS|索引)/, "文件资料与知识库"],
    [/(会议|纪要|通知|待办|请假)/, "会议与通知"],
    [/(AI|助手|知识库|维护规范|使用说明)/, "AI 助手"],
    [/(管理中心|成员|小组|角色模板|物资类别|审计)/, "管理中心"],
    [/(安全|培训|准入|设备|仪器|规章|规范)/, "规章制度"],
    [/(部署|运维|启动|命令|环境变量|故障)/, "部署与运维"]
  ];
  for (const [re, cat] of map) {
    if (re.test(lower)) return cat;
  }
  return "general";
}

async function collectSeedDocs(): Promise<SeedDoc[]> {
  if (!existsSync(seedDir)) {
    throw new Error(`Seed directory not found: ${seedDir}`);
  }
  const entries = await readdir(seedDir, { withFileTypes: true });
  const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => e.name);
  mdFiles.sort();

  const docs: SeedDoc[] = [];
  for (const fileName of mdFiles) {
    const full = path.join(seedDir, fileName);
    const raw = await readFile(full, "utf8");
    const defaultTitle = fileName.replace(/^\d+-/, "").replace(/\.md$/, "").trim() || fileName;
    const defaultCategory = inferCategoryFromFileName(defaultTitle);
    const parsed = extractFrontMatter(raw, defaultTitle, defaultCategory);
    const content = (parsed.content || raw).trim();
    if (!content) continue;
    if (fileName === "00-文档索引.md") continue;
    const tags =
      parsed.tags.length > 0
        ? parsed.tags
        : [parsed.category].filter(Boolean);
    docs.push({
      title: parsed.title,
      content,
      category: parsed.category,
      tags,
      sourceFileName: fileName
    });
  }
  return docs;
}

async function ensureSchema(pool: pg.Pool) {
  await pool.query(`
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
  `);
}

async function main() {
  const docs = await collectSeedDocs();
  if (!docs.length) {
    throw new Error(`No knowledge seed documents found in ${seedDir}`);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    await ensureSchema(pool);

    const client = await pool.connect();
    try {
      const existingTitles = new Map<string, string>();
      {
        const rows = await client.query<{ id: string; title: string }>(
          "SELECT id, title FROM ai.knowledge_document WHERE source_import_method = 'seed'"
        );
        for (const row of rows.rows) existingTitles.set(row.title, row.id);
      }

      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const doc of docs) {
        const existingId = existingTitles.get(doc.title);
        if (existingId) {
          if (!forceRecreate) {
            skipped++;
            console.log(`[skip ] ${doc.title} (已存在，使用 --force 覆盖更新)`);
            continue;
          }
          await client.query(
            `UPDATE ai.knowledge_document
             SET content = $2, category = $3, tags = $4, source_file_name = $5,
                 source_mime_type = 'text/markdown', updated_at = now()
             WHERE id = $1`,
            [existingId, doc.content, doc.category, doc.tags, doc.sourceFileName]
          );
          // 旧 embedding 也清理，保持一致性（不强制重新生成 embedding，等应用启动或调用 reindex 即可）
          await client.query("DELETE FROM ai.knowledge_embedding WHERE doc_id = $1", [
            existingId
          ]);
          updated++;
          console.log(`[update] ${doc.title}`);
          continue;
        }
        const id = randomUUID();
        await client.query(
          `INSERT INTO ai.knowledge_document (
             id, title, content, category, tags, source_file_name, source_mime_type,
             source_import_method, created_by
           ) VALUES ($1, $2, $3, $4, $5, $6, 'text/markdown', 'seed', $7)`,
          [
            id,
            doc.title,
            doc.content,
            doc.category,
            doc.tags,
            doc.sourceFileName,
            seedActorId
          ]
        );
        inserted++;
        console.log(`[insert] ${doc.title}`);
      }

      console.log(
        `\n完成：本次种子文档处理 ${docs.length} 篇，插入 ${inserted}、更新 ${updated}、跳过 ${skipped}。`
      );
      console.log(
        "提示：文档已写入 ai.knowledge_document。embedding 向量可通过重启后端（会触发 initialize 并写入 FAQ 模板，以及 AI 在 chat 时能通过关键词检索），或后续执行 reindexAll 生成向量。"
      );
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seed knowledge failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
