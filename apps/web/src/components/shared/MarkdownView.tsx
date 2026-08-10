import * as React from "react";
type ReactNode = React.ReactNode;
// @types/react@19 在 `export = React` 模式下 Fragment 命名空间导出类型缺失，运行时存在，用类型断言绕过
type FragmentComponent = React.ExoticComponent<{
  children?: ReactNode;
  key?: React.Key;
}>;
const Fragment = (React as unknown as { Fragment: FragmentComponent }).Fragment;

// 轻量 Markdown 渲染器（无外部依赖）
// 覆盖：标题 / 段落 / 表格 / 列表 / 加粗 / 行内代码 / 代码块 / 引用 / 分隔线 / 链接 / 段内换行
// 安全性：所有用户输入通过 React 文本节点渲染，不会执行 HTML，天然防 XSS

interface MarkdownViewProps {
  content: string;
  className?: string;
}

// 转义正则中的特殊字符
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 行内格式：加粗 **x** / 斜体 *x* / 行内代码 `x` / 链接 [text](url) / 删除线 ~~x~~
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // 按优先级顺序匹配：先代码（避免代码内的 ** 被错误解析），再加粗、链接、斜体、删除线
  const patterns: Array<{ re: RegExp; render: (m: RegExpExecArray) => ReactNode }> = [
    {
      // 行内代码 `xxx`（含双反引号 ``xxx``）
      re: /(`+)([^`]+?)\1/,
      render: (m) => <code className="md-inline-code">{m[2]}</code>
    },
    {
      // 链接 [text](url)
      re: /\[([^\]]+)\]\(([^)\s]+)\)/,
      render: (m) => (
        <a href={m[2]} target="_blank" rel="noopener noreferrer" className="md-link">
          {m[1]}
        </a>
      )
    },
    {
      // 加粗 **xxx** 或 __xxx__
      re: /(\*\*|__)(?=\S)(.+?)(?<=\S)\1/,
      render: (m) => <strong>{renderInline(m[2], `${keyPrefix}-b-${key}`)}</strong>
    },
    {
      // 删除线 ~~xxx~~
      re: /~~(?=\S)(.+?)(?<=\S)~~/,
      render: (m) => <del>{m[1]}</del>
    },
    {
      // 斜体 *xxx* 或 _xxx_（避免和加粗冲突，要求两侧非空白且不是同样的 *）
      re: /(?<!\*)\*(?!\s)([^*]+?)(?<!\s)\*(?!\*)/,
      render: (m) => <em>{m[1]}</em>
    }
  ];

  while (remaining.length > 0) {
    let earliest: {
      idx: number;
      match: RegExpExecArray;
      render: (m: RegExpExecArray) => ReactNode;
    } | null = null;
    for (const p of patterns) {
      const re = new RegExp(p.re.source, p.re.flags.includes("g") ? p.re.flags : p.re.flags + "");
      const m = re.exec(remaining);
      if (m && (earliest === null || m.index < earliest.idx)) {
        earliest = { idx: m.index, match: m, render: p.render };
      }
    }
    if (!earliest) {
      nodes.push(<Fragment key={`${keyPrefix}-t-${key++}`}>{remaining}</Fragment>);
      break;
    }
    if (earliest.idx > 0) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${key++}`}>{remaining.slice(0, earliest.idx)}</Fragment>
      );
    }
    nodes.push(
      <Fragment key={`${keyPrefix}-i-${key++}`}>{earliest.render(earliest.match)}</Fragment>
    );
    remaining = remaining.slice(earliest.idx + earliest.match[0].length);
  }
  return nodes;
}

// 解析表格块（连续的 | xxx | yyy | 行 + 紧跟的分隔行 | --- | --- |）
function parseTable(
  lines: string[],
  startIdx: number
): { rows: string[][]; nextIdx: number } | null {
  const rows: string[][] = [];
  let i = startIdx;
  // 第一行
  rows.push(splitTableRow(lines[i]!));
  i++;
  // 第二行必须是分隔行
  if (i >= lines.length || !/^[\s|:-]+$/.test(lines[i]!) || !lines[i]!.includes("-")) {
    return null;
  }
  i++;
  // 后续数据行
  while (i < lines.length && lines[i]!.trim().startsWith("|")) {
    rows.push(splitTableRow(lines[i]!));
    i++;
  }
  return { rows, nextIdx: i };
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

// 解析列表块（- / * / + 无序，1. 有序）
function parseList(
  lines: string[],
  startIdx: number
): {
  items: Array<{ text: string; level: number; ordered: boolean }>;
  nextIdx: number;
  ordered: boolean;
} | null {
  const items: Array<{ text: string; level: number; ordered: boolean }> = [];
  const firstLine = lines[startIdx]!;
  const orderedMatch = /^(\s*)(\d+)\.\s+(.+)$/.exec(firstLine);
  const unorderedMatch = /^(\s*)([-*+])\s+(.+)$/.exec(firstLine);
  if (!orderedMatch && !unorderedMatch) return null;
  const ordered = !!orderedMatch;
  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i]!;
    const m = ordered ? /^(\s*)(\d+)\.\s+(.+)$/.exec(line) : /^(\s*)([-*+])\s+(.+)$/.exec(line);
    if (!m) break;
    const indent = m[1]!.length;
    const level = Math.floor(indent / 2);
    items.push({ text: m[3]!, level, ordered });
    i++;
  }
  return { items, nextIdx: i, ordered };
}

// 渲染列表为嵌套 <ul>/<ol>
function renderListNodes(
  items: Array<{ text: string; level: number; ordered: boolean }>,
  ordered: boolean,
  keyPrefix: string
): ReactNode {
  if (items.length === 0) return null;
  const root: Array<ReactNode> = [];
  let i = 0;
  const buildLevel = (level: number, kPrefix: string): ReactNode[] => {
    const children: Array<ReactNode> = [];
    while (i < items.length && items[i]!.level === level) {
      const item = items[i]!;
      i++;
      // 收集子项
      const subItems: Array<{ text: string; level: number; ordered: boolean }> = [];
      while (i < items.length && items[i]!.level > level) {
        subItems.push(items[i]!);
        i++;
      }
      if (subItems.length > 0) {
        children.push(
          <li key={`${kPrefix}-${i}`}>
            {renderInline(item.text, `${kPrefix}-t-${i}`)}
            {buildLevel(level + 1, `${kPrefix}-sub-${i}`)}
          </li>
        );
        // 已经消费子项，无需再回退
      } else {
        children.push(
          <li key={`${kPrefix}-${i}`}>{renderInline(item.text, `${kPrefix}-t-${i}`)}</li>
        );
      }
    }
    return children;
  };

  const listItems = buildLevel(0, keyPrefix);
  root.push(
    ordered ? (
      <ol key={`${keyPrefix}-ol`} className="md-ol">
        {listItems}
      </ol>
    ) : (
      <ul key={`${keyPrefix}-ul`} className="md-ul">
        {listItems}
      </ul>
    )
  );
  return <>{root}</>;
}

export function MarkdownView({ content, className }: MarkdownViewProps) {
  if (!content) return null;
  const text = content.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];

  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // 空行
    if (!line.trim()) {
      i++;
      continue;
    }

    // 代码块 ```xxx```
    const fenceMatch = /^```(\w*)\s*$/.exec(line.trim());
    if (fenceMatch) {
      const lang = fenceMatch[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!.trim())) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // 跳过闭合 ```
      blocks.push(
        <pre key={`md-pre-${key++}`} className="md-pre" data-lang={lang}>
          <code className="md-code">{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // 标题 # ~ ######
    const headingMatch = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const text = headingMatch[2]!;
      const Tag = `h${Math.min(level, 6)}` as unknown as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      blocks.push(
        <Tag key={`md-h-${key++}`} className={`md-h md-h-${level}`}>
          {renderInline(text, `md-h-${key}`)}
        </Tag>
      );
      i++;
      continue;
    }

    // 分隔线 --- / *** / ___
    if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
      blocks.push(<hr key={`md-hr-${key++}`} className="md-hr" />);
      i++;
      continue;
    }

    // 引用 > xxx
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith(">")) {
        quoteLines.push(lines[i]!.replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={`md-bq-${key++}`} className="md-blockquote">
          {renderInline(quoteLines.join(" "), `md-bq-${key}`)}
        </blockquote>
      );
      continue;
    }

    // 表格
    if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      /^[\s|:-]+$/.test(lines[i + 1]!) &&
      lines[i + 1]!.includes("-")
    ) {
      const table = parseTable(lines, i);
      if (table) {
        const [header, ...body] = table.rows;
        blocks.push(
          <div key={`md-tbl-wrap-${key++}`} className="md-table-wrap">
            <table key={`md-tbl-${key}`} className="md-table">
              <thead>
                <tr>
                  {header!.map((h, idx) => (
                    <th key={`md-th-${key}-${idx}`}>{renderInline(h, `md-th-${key}-${idx}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rIdx) => (
                  <tr key={`md-tr-${key}-${rIdx}`}>
                    {row.map((c, cIdx) => (
                      <td key={`md-td-${key}-${rIdx}-${cIdx}`}>
                        {renderInline(c, `md-td-${key}-${rIdx}-${cIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = table.nextIdx;
        continue;
      }
    }

    // 列表
    const listMatch = /^(\s*)(\d+\.|[-*+])\s+(.+)$/.test(line);
    if (listMatch) {
      const list = parseList(lines, i);
      if (list) {
        blocks.push(
          <Fragment key={`md-list-${key++}`}>
            {renderListNodes(list.items, list.ordered, `md-list-${key}`)}
          </Fragment>
        );
        i = list.nextIdx;
        continue;
      }
    }

    // 普通段落（连续非空行合并）
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !/^#{1,6}\s/.test(lines[i]!) &&
      !/^```/.test(lines[i]!.trim()) &&
      !lines[i]!.trim().startsWith(">") &&
      !lines[i]!.trim().startsWith("|") &&
      !/^(\s*)(\d+\.|[-*+])\s+/.test(lines[i]!) &&
      !/^(\s*[-*_]){3,}\s*$/.test(lines[i]!)
    ) {
      paraLines.push(lines[i]!.trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(
        <p key={`md-p-${key++}`} className="md-p">
          {renderInline(paraLines.join(" "), `md-p-${key}`)}
        </p>
      );
    }
  }

  return <div className={`md-root${className ? ` ${className}` : ""}`}>{blocks}</div>;
}

// 为了避免 TypeScript 报"未使用"错误，导出一个 helper 供其它地方复用
export function renderMarkdown(content: string): ReactNode {
  return <MarkdownView content={content} />;
}

// 引用 escapeRegExp 防止 TS 标记未使用（保留备用）
void escapeRegExp;
