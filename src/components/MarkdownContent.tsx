"use client";

import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Normalizes markdown text so tables are guaranteed to render as valid GFM tables:
 * 1. Ensures blank lines precede and follow pipe-table blocks (required by GFM specs).
 * 2. Inserts missing separator lines (|:---|:---|) if the model omitted them.
 * 3. Adds clean synthetic headers if the model started directly with data rows.
 */
function normalizeMarkdownTables(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split(/\r?\n/);
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line looks like a markdown table row (starts and ends with |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 2) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|") &&
        lines[i].trim().length > 2
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length > 0) {
        // Ensure an empty line before the table so GFM parser activates
        if (result.length > 0 && result[result.length - 1].trim() !== "") {
          result.push("");
        }

        // Check if there is already a separator row (e.g. |---|---| or |:---|:---|)
        const hasSeparator = tableLines.some(
          (l, idx) => idx > 0 && /^\|(\s*:?-{2,}:?\s*\|)+$/.test(l)
        );

        if (!hasSeparator) {
          const firstRow = tableLines[0];
          // Count columns by splitting by pipe
          const rawCols = firstRow.split("|");
          const colCount = Math.max(1, rawCols.length - 2);
          const separatorRow = "|" + Array(colCount).fill(" :--- ").join("|") + "|";

          // If the first row looks like data (e.g. starts with bold or spec name), add a header
          const isFirstRowData = /^\|\s*\*\*/.test(firstRow);

          if (isFirstRowData) {
            const headerRow =
              colCount === 2
                ? "| Specification / Metric | Value |"
                : colCount === 3
                ? "| Specification / Metric | Unit A | Unit B |"
                : "|" +
                  Array.from({ length: colCount }, (_, k) =>
                    k === 0 ? " Specification " : ` Option ${k} `
                  ).join("|") +
                  "|";

            result.push(headerRow);
            result.push(separatorRow);
            result.push(...tableLines);
          } else {
            // First row is already headers, just insert the separator row below it
            result.push(tableLines[0]);
            result.push(separatorRow);
            result.push(...tableLines.slice(1));
          }
        } else {
          result.push(...tableLines);
        }

        // Ensure an empty line after the table
        result.push("");
      }
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join("\n");
}

export const MarkdownContent = memo(function MarkdownContent({
  content,
  isStreaming,
}: MarkdownContentProps) {
  const processedContent = useMemo(() => {
    return normalizeMarkdownTables(content);
  }, [content]);

  if (!content && isStreaming) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-on-surface-variant font-mono py-1">
        <span className="inline-block w-1.5 h-3.5 bg-secondary animate-pulse" />
        <span>Synthesizing laboratory specifications...</span>
      </div>
    );
  }

  return (
    <div className="markdown-content text-on-surface leading-relaxed text-[12.5px] space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Well-defined Table Container & Elements
          table: ({ children }) => (
            <div className="my-3 w-full rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
              <div className="bg-surface-container-low border-b border-outline-variant px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-on-surface-variant select-none">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-secondary">
                  <span className="material-symbols-outlined text-[13px]">tune</span>
                  Hardware Specifications
                </span>
                <span className="text-[9px] uppercase tracking-widest text-on-surface-variant/70 font-mono">
                  ↔ Swipe / Scroll
                </span>
              </div>
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left border-collapse text-[11px] min-w-[340px]">
                  {children}
                </table>
              </div>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-container text-on-surface-variant uppercase font-mono text-[10px] tracking-wider border-b border-outline-variant select-none whitespace-nowrap">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-outline-variant/40 font-mono text-[11px]">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-surface-container-low/60 transition-colors odd:bg-surface-container-lowest even:bg-surface-container-low/20">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-bold text-on-surface border-r border-outline-variant/40 last:border-r-0 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-on-surface border-r border-outline-variant/30 last:border-r-0 align-top leading-snug whitespace-normal">
              {children}
            </td>
          ),
          // Headings
          h1: ({ children }) => (
            <h1 className="text-[13px] font-bold uppercase tracking-wide text-on-surface border-b border-outline-variant/60 pb-1 mt-3 mb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[15px]">label_important</span>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[12.5px] font-bold text-on-surface mt-3 mb-1 tracking-tight flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[12px] font-bold text-secondary uppercase tracking-wider mt-3 mb-1 flex items-center gap-1.5">
              <span className="w-1 h-2 bg-secondary inline-block rounded-xs" />
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[11.5px] font-bold text-secondary uppercase tracking-wider mt-2.5 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
              {children}
            </h4>
          ),
          // Paragraphs & Lists
          p: ({ children }) => (
            <p className="my-1.5 leading-relaxed text-[12.5px] text-on-surface/95 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-1 my-1.5 text-[12px] marker:text-secondary text-on-surface/90">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1 my-1.5 text-[12px] marker:text-secondary font-mono text-on-surface/90">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-on-surface font-mono tracking-tight bg-surface-container-low/70 px-1 py-0.5 rounded text-[11.5px] border border-outline-variant/30">
              {children}
            </strong>
          ),
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-surface-container font-mono text-[11px] text-secondary border border-outline-variant/40">
              {children}
            </code>
          ),
          hr: () => (
            <hr className="my-2.5 border-outline-variant/50" />
          ),
          blockquote: ({ children }) => (
            <blockquote className="pl-3 border-l-2 border-secondary/70 my-2 text-on-surface-variant italic text-[12px] bg-surface-container-low/30 py-1 rounded-r">
              {children}
            </blockquote>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 ml-1 bg-secondary animate-pulse align-middle" />
      )}
    </div>
  );
});
