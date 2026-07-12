# AI 提供商集成说明

适用对象：AI 模块维护者、部署实施者  
更新时间：2026-07-01  
关联文档：[技术栈](../02-architecture/technology-stack.md)、[API 总览](../04-api/api-overview.md)

## 当前能力

AI 模块当前提供：

- 问答接口
- 知识库管理
- FAQ 模板
- 文件上传入库
- PDF / DOCX 文本抽取

## 提供商模式

当前支持两类模式：

- `ollama`
- `openai` 兼容接口

## 关键环境变量

```text
AI_PROVIDER
OLLAMA_BASE_URL
OLLAMA_MODEL
OPENAI_BASE_URL
OPENAI_API_KEY
OPENAI_MODEL
```

## 当前注意事项

- 文档中的 AI 集成说明以当前实现为准
- 模型选择、推理成本和知识检索策略后续可继续重构
- 该模块当前重点是“实验室知识增强”，不是通用大模型平台
