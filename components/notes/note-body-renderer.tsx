import type { ReactNode } from "react";
import type { SerializedEditorState } from "lexical";

function parseEditorState(value: string): SerializedEditorState | null {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && "root" in parsed) {
      return parsed as SerializedEditorState;
    }
  } catch {
    return null;
  }
  return null;
}

function textFromLexicalNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as Record<string, unknown>;
  const ownText = typeof record.text === "string" ? record.text : "";
  const children = Array.isArray(record.children)
    ? record.children.map(textFromLexicalNode).filter(Boolean).join(" ")
    : "";
  return [ownText, children].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function textStyleFromFormat(format: unknown) {
  const flags = typeof format === "number" ? format : 0;
  return {
    fontWeight: flags & 1 ? 700 : undefined,
    fontStyle: flags & 2 ? "italic" : undefined,
    textDecoration: [
      flags & 8 ? "underline" : "",
      flags & 4 ? "line-through" : "",
    ].filter(Boolean).join(" ") || undefined,
  };
}

function renderInlineNode(node: unknown, key: string): ReactNode {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  const type = String(record.type ?? "");

  if (type === "image" && typeof record.src === "string") {
    return (
      <span key={key} className="my-4 block overflow-hidden rounded-md border bg-muted/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={record.src}
          alt={typeof record.altText === "string" ? record.altText : "Note image"}
          className="max-h-[460px] w-full object-contain"
        />
      </span>
    );
  }

  if (type === "link" && typeof record.url === "string") {
    const children = Array.isArray(record.children)
      ? record.children.map((child, index) => renderInlineNode(child, `${key}-${index}`))
      : record.url;
    return (
      <a
        key={key}
        href={record.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline underline-offset-4"
      >
        {children}
      </a>
    );
  }

  if (typeof record.text === "string") {
    return (
      <span key={key} style={textStyleFromFormat(record.format)}>
        {record.text}
      </span>
    );
  }

  if (Array.isArray(record.children)) {
    return record.children.map((child, index) => renderInlineNode(child, `${key}-${index}`));
  }

  return null;
}

function blockChildren(node: Record<string, unknown>, keyPrefix: string) {
  return Array.isArray(node.children)
    ? node.children.map((child, index) => renderInlineNode(child, `${keyPrefix}-${index}`))
    : null;
}

function renderTableCellContent(node: Record<string, unknown>, keyPrefix: string): ReactNode {
  if (!Array.isArray(node.children)) return null;
  return node.children.map((child, index) => {
    const childRecord = child && typeof child === "object" ? child as Record<string, unknown> : {};
    const childType = String(childRecord.type ?? "");
    if (childType === "paragraph") {
      return (
        <p key={`${keyPrefix}-${index}`} className="min-h-5 leading-6">
          {blockChildren(childRecord, `${keyPrefix}-${index}`)}
        </p>
      );
    }
    return renderEditorBlock(child, index);
  });
}

function renderEditorBlock(node: unknown, index: number): ReactNode {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  const type = String(record.type ?? "");
  const tag = String(record.tag ?? "");
  const key = `${type}-${index}`;
  const children = blockChildren(record, key);

  if (type === "heading" || ["h1", "h2", "h3"].includes(tag)) {
    if (tag === "h1") {
      return <h1 key={key} className="text-2xl font-bold leading-tight text-foreground">{children}</h1>;
    }
    if (tag === "h2") {
      return <h2 key={key} className="text-xl font-semibold leading-snug text-foreground">{children}</h2>;
    }
    return <h3 key={key} className="text-lg font-semibold leading-snug text-foreground">{children}</h3>;
  }

  if (type === "quote") {
    return (
      <blockquote key={key} className="border-l-4 border-primary/50 pl-4 text-muted-foreground">
        {children}
      </blockquote>
    );
  }

  if (type === "table") {
    const rows = Array.isArray(record.children) ? record.children : [];
    return (
      <div key={key} className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowRecord = row && typeof row === "object" ? row as Record<string, unknown> : {};
              const cells = Array.isArray(rowRecord.children) ? rowRecord.children : [];
              return (
                <tr key={`${key}-row-${rowIndex}`} className="border-b last:border-b-0">
                  {cells.map((cell, cellIndex) => {
                    const cellRecord = cell && typeof cell === "object" ? cell as Record<string, unknown> : {};
                    const isHeader = Number(cellRecord.headerState ?? 0) > 0;
                    const CellTag = isHeader ? "th" : "td";
                    return (
                      <CellTag
                        key={`${key}-cell-${rowIndex}-${cellIndex}`}
                        colSpan={Number(cellRecord.colSpan ?? 1)}
                        rowSpan={Number(cellRecord.rowSpan ?? 1)}
                        className="border-r px-4 py-3 text-left align-top last:border-r-0"
                      >
                        <div className={isHeader ? "font-semibold text-foreground" : "text-foreground"}>
                          {renderTableCellContent(cellRecord, `${key}-cell-${rowIndex}-${cellIndex}`)}
                        </div>
                      </CellTag>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "layout-container") {
    const layoutChildren = Array.isArray(record.children) ? record.children : [];
    const templateColumns =
      typeof record.templateColumns === "string" && record.templateColumns.trim()
        ? record.templateColumns
        : `repeat(${Math.max(layoutChildren.length, 1)}, minmax(0, 1fr))`;

    return (
      <div
        key={key}
        className="grid gap-4 rounded-md border bg-muted/10 p-3"
        style={{ gridTemplateColumns: templateColumns }}
      >
        {layoutChildren.map((child, childIndex) => renderEditorBlock(child, childIndex))}
      </div>
    );
  }

  if (type === "layout-item") {
    const itemChildren = Array.isArray(record.children) ? record.children : [];
    return (
      <div key={key} className="min-w-0 space-y-3 rounded-md border bg-background/50 p-3">
        {itemChildren.map((child, childIndex) => renderEditorBlock(child, childIndex))}
      </div>
    );
  }

  if (type === "list") {
    const listChildren = Array.isArray(record.children)
      ? record.children.map((child, childIndex) => {
          const childRecord = child && typeof child === "object" ? child as Record<string, unknown> : {};
          return <li key={`${key}-${childIndex}`}>{blockChildren(childRecord, `${key}-${childIndex}`)}</li>;
        })
      : null;
    return tag === "ol" || record.listType === "number"
      ? <ol key={key} className="list-decimal space-y-1 pl-6 text-foreground">{listChildren}</ol>
      : <ul key={key} className="list-disc space-y-1 pl-6 text-foreground">{listChildren}</ul>;
  }

  if (type === "code") {
    return <pre key={key} className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">{textFromLexicalNode(record)}</pre>;
  }

  return <p key={key} className="text-base leading-7 text-foreground">{children}</p>;
}

export function NoteBodyRenderer({ value }: { value: string }) {
  const state = parseEditorState(value);
  if (state && Array.isArray((state.root as Record<string, unknown>).children)) {
    const children = (state.root as Record<string, unknown>).children as unknown[];
    return <div className="space-y-4">{children.map(renderEditorBlock)}</div>;
  }

  if (/^\s*</.test(value)) {
    return (
      <div
        className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return <p className="whitespace-pre-wrap text-base leading-7 text-foreground">{value}</p>;
}
