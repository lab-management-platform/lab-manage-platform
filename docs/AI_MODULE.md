# AI 智能问答模块

AI 模块为实验室管理平台提供基于大语言模型（LLM）的智能助手，支持知识库 RAG 问答、多轮对话、常见问题模板。

## 整体架构

```text
前端 (React)                   后端 (Fastify)                  AI 提供商
──────────                     ──────────────                  ─────────
ai-chat-layout  ──POST──>  /ai/chat          ──RAG prompt──>  Ollama
ai-knowledge    ──GET───>  /ai/knowledge     <──reply──────  或 OpenAI
ai-faq-sidebar  ──GET───>  /ai/templates
                            │
                    PostgreSQL (ai schema)
                    ├── knowledge_document
                    ├── chat_history
                    └── faq_template
```

## AI 接入方式

AI 模块采用**可插拔的 AI 提供商架构**，支持两种接入方式，通过环境变量切换。

### 方式一：Ollama（推荐，开源免费）

[Ollama](https://ollama.com/) 是一个开源的大模型本地运行工具，无需付费 API Key，数据完全本地处理。

**优点：**

- 完全免费，无 API 调用费用
- 数据不出服务器，适合实验室敏感场景
- 支持多种开源模型（Qwen、Llama、DeepSeek 等）
- 离线可用

**部署步骤：**

1. 在服务器上安装 Ollama：

   ```bash
   # Linux
   curl -fsSL https://ollama.com/install.sh | sh

   # Windows / macOS：从 https://ollama.com/download 下载安装包
   ```

2. 拉取推荐模型（推荐 Qwen2.5，中文效果好）：

   ```bash
   ollama pull qwen2.5:7b          # 7B 参数，推荐配置
   ollama pull qwen2.5:3b          # 3B 参数，轻量替代
   ollama pull deepseek-r1:8b      # 深度思考模型
   ollama pull llama3.1:8b         # Meta 开源模型
   ```

3. 验证模型可用：

   ```bash
   ollama run qwen2.5:7b "你好，请介绍一下自己"
   ```

4. 配置环境变量（.env）：
   ```bash
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=qwen2.5:7b
   ```

**推荐模型说明：**

| 模型             | 参数量 | 显存需求 | 中文效果 | 适用场景             |
| ---------------- | ------ | -------- | -------- | -------------------- |
| `qwen2.5:3b`     | 3B     | ~3GB     | ★★★★     | 轻量、快速响应       |
| `qwen2.5:7b`     | 7B     | ~6GB     | ★★★★★    | 推荐，平衡效果与性能 |
| `qwen2.5:14b`    | 14B    | ~10GB    | ★★★★★    | 最佳效果，需较好显卡 |
| `deepseek-r1:8b` | 8B     | ~6GB     | ★★★★     | 深度推理             |
| `llama3.1:8b`    | 8B     | ~6GB     | ★★★      | 英文为主             |

### 方式二：OpenAI 兼容 API

使用 OpenAI 官方 API 或任何兼容 OpenAI 接口的服务（如 Azure OpenAI、DeepSeek API、通义千问 API 等）。

**优点：**

- 无需本地 GPU
- 模型能力更强
- 响应速度更快

**配置步骤：**

1. 获取 API Key：
   - OpenAI 官方：https://platform.openai.com/api-keys
   - DeepSeek：https://platform.deepseek.com/
   - 阿里云百炼（通义千问）：https://bailian.console.aliyun.com/
   - 或其他兼容 OpenAI 接口的服务商

2. 配置环境变量（.env）：

   ```bash
   # 使用 OpenAI 官方
   AI_PROVIDER=openai
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_API_KEY=sk-your-api-key-here
   OPENAI_MODEL=gpt-4o-mini

   # 或使用 DeepSeek（完全兼容 OpenAI 接口，无需改代码）
   AI_PROVIDER=openai
   OPENAI_BASE_URL=https://api.deepseek.com
   OPENAI_API_KEY=sk-your-deepseek-key
   OPENAI_MODEL=deepseek-v4-pro

   # 或使用阿里云百炼（通义千问）
   AI_PROVIDER=openai
   OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
   OPENAI_API_KEY=sk-your-qwen-key
   OPENAI_MODEL=qwen-plus
   ```

**DeepSeek 模型说明（官方文档：https://api-docs.deepseek.com ）：**

| 模型名              | 状态      | 说明                                    |
| ------------------- | --------- | --------------------------------------- |
| `deepseek-v4-pro`   | ✅ 推荐   | 最新旗舰模型，最强效果                  |
| `deepseek-v4-flash` | ✅ 推荐   | 最新轻量模型，速度快性价比高            |
| `deepseek-chat`     | ⚠️ 将弃用 | 已映射为 `deepseek-v4-flash` 非思考模式 |
| `deepseek-reasoner` | ⚠️ 将弃用 | 已映射为 `deepseek-v4-flash` 思考模式   |

> **注意**：`deepseek-chat` 和 `deepseek-reasoner` 将于 **2026年7月24日** 停用，请直接使用 `deepseek-v4-pro` 或 `deepseek-v4-flash`。

**思考模式（Reasoning / Thinking）：**

`deepseek-v4-pro` 和 `deepseek-v4-flash` 支持思考模式，通过 `reasoning_effort` 参数控制推理深度：

- `"reasoning_effort": "high"` — 深度推理，适合复杂数学、逻辑问题
- `"thinking": {"type": "enabled"}` — 开启思考链输出

DeepSeek API 同时兼容 **OpenAI 格式**（`/chat/completions`）和 **Anthropic 格式**（`/anthropic`），无需修改代码即可迁移。还支持直接作为 Claude Code、GitHub Copilot、OpenCode 等 Agent 工具的后端模型。

```bash
# cURL 测试 DeepSeek API（官方示例）
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${DEEPSEEK_API_KEY}" \
  -d '{
    "model": "deepseek-v4-pro",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "stream": false
  }'
```

### 方式三：其他开源项目集成

项目采用标准的 OpenAI 兼容 API 协议，任何提供 `/chat/completions` 端点的服务都可以接入：

- **vLLM**：高性能推理引擎 `https://github.com/vllm-project/vllm`
- **LocalAI**：OpenAI API 兼容的本地推理 `https://github.com/mudler/LocalAI`
- **Text Generation Inference (TGI)**：HuggingFace 推理服务 `https://github.com/huggingface/text-generation-inference`
- **Xinference**：分布式推理平台 `https://github.com/xorbitsai/inference`
- **LM Studio**：桌面端本地推理 `https://lmstudio.ai/`

这些服务都提供 `/v1/chat/completions` 端点，只需将 `OPENAI_BASE_URL` 指向对应地址即可。

## 环境变量完整清单

| 变量名            | 默认值                      | 说明                            |
| ----------------- | --------------------------- | ------------------------------- |
| `AI_PROVIDER`     | `ollama`                    | AI 提供商：`ollama` 或 `openai` |
| `OLLAMA_BASE_URL` | `http://localhost:11434`    | Ollama 服务地址                 |
| `OLLAMA_MODEL`    | `qwen2.5:7b`                | Ollama 模型名称                 |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI 兼容 API 地址            |
| `OPENAI_API_KEY`  | -                           | API Key                         |
| `OPENAI_MODEL`    | `gpt-4o-mini`               | 模型名称                        |

## 知识库管理

管理员可在平台界面维护知识库文档，AI 将基于这些知识回答问题（RAG 检索增强生成）。

1. **添加知识文档**：填写标题、分类（规章制度/操作流程/安全规范/设备使用/常见问题）、标签、内容
2. **编辑/删除**：在知识库列表中操作
3. **检索机制**：用户提问时自动搜索知识库中相关文档，将匹配内容作为上下文注入 prompt

**建议录入的知识内容：**

- 实验室规章制度
- 设备使用 SOP
- 安全操作规范
- 耗材申请流程
- 常见问题 FAQ
- 项目申报指南

## API 接口

所有 AI 接口需要 `ai:use` 权限（所有角色默认拥有）。

### POST /ai/chat

发送消息并获取 AI 回复（含知识库检索）。

```http
POST /ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{ "message": "如何申请实验耗材？" }
```

返回：

```json
{
  "reply": "申请实验耗材的流程如下：1. 登录平台...",
  "sources": [{ "id": "k-001", "title": "耗材申请流程", "snippet": "耗材申请需填写..." }]
}
```

### GET /ai/chat-history

获取当前用户的对话历史（最近 20 条）。

### DELETE /ai/chat-history

清除当前用户的对话历史。

### CRUD /ai/knowledge

- `GET /ai/knowledge` — 查询知识库文档列表
- `POST /ai/knowledge` — 添加知识文档（需 `title`、`content`）
- `PUT /ai/knowledge/:id` — 更新知识文档
- `DELETE /ai/knowledge/:id` — 删除知识文档

### GET /ai/templates

获取 FAQ 常见问题模板列表。

## 前端界面

- **对话问答**：左侧聊天区域 + 右侧常见问题快捷按钮
- **知识库**：文档列表 + 添加/编辑表单
- 支持多轮对话，自动保留上下文（最近 10 条历史 + 知识库相关文档）

## Docker 部署注意事项

如果 AI 服务（Ollama）运行在宿主机上，需要在 `docker-compose.yml` 中配置网络访问：

```yaml
# docker-compose.yml
services:
  api:
    environment:
      - OLLAMA_BASE_URL=http://host.docker.internal:11434 # Windows/Mac
      # - OLLAMA_BASE_URL=http://172.17.0.1:11434          # Linux
```

或在 Linux 下使用 `network_mode: host`。

## 常见问题

**Q: Ollama 响应太慢？**
A: 换用更小的模型（如 `qwen2.5:3b`），或升级 GPU。

**Q: 如何让 AI 回答更准确？**
A: 在知识库中录入更多实验室专属文档，完善常见问题模板。

**Q: 能否使用多个 AI 模型？**
A: 当前版本使用单一模型，后续可扩展为按场景路由不同模型。

**Q: 知识库检索不准确？**
A: 当前使用关键词匹配（ILIKE），后续可引入 Embedding 向量检索提升精度。
