import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cn } from "@/lib/utils";

interface MarkdownBodyProps {
  content: string;
  className?: string;
}

// Allow GitHub-style HTML elements through sanitization
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "details",
    "summary",
    "sub",
    "sup",
    "kbd",
    "abbr",
    "mark",
  ],
  attributes: {
    ...defaultSchema.attributes,
    details: ["open"],
    summary: [],
    input: ["type", "checked", "disabled"],
  },
};

function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

export function MarkdownBody({ content, className }: MarkdownBodyProps) {
  if (!content) return null;

  const cleaned = stripHtmlComments(content);

  return (
    <div className={cn("markdown-body text-sm text-foreground", className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={{
          h1: ({ children, ...props }) => (
            <h1 className="text-xl font-semibold border-b border-border pb-2 mb-3 mt-4 first:mt-0" {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-lg font-semibold border-b border-border pb-1.5 mb-2.5 mt-4 first:mt-0" {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0" {...props}>{children}</h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="text-sm font-semibold mb-2 mt-3 first:mt-0" {...props}>{children}</h4>
          ),
          p: ({ children, ...props }) => (
            <p className="mb-3 last:mb-0 leading-relaxed" {...props}>{children}</p>
          ),
          a: ({ children, href, ...props }) => (
            <a
              className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/40 hover:decoration-blue-300/60 cursor-pointer"
              role="link"
              onClick={async (e) => {
                e.preventDefault();
                if (!href) return;
                try {
                  const { openUrl } = await import("@tauri-apps/plugin-opener");
                  await openUrl(href);
                } catch {
                  window.open(href, "_blank");
                }
              }}
              {...props}
            >
              {children}
            </a>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-foreground" {...props}>{children}</strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic" {...props}>{children}</em>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-[3px] border-border pl-3 my-3 text-muted-foreground [&>p]:mb-1 [&>p:last-child]:mb-0"
              {...props}
            >
              {children}
            </blockquote>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-5 mb-3 last:mb-0 space-y-1 [&_ul]:mb-0 [&_ul]:mt-1" {...props}>{children}</ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-5 mb-3 last:mb-0 space-y-1 [&_ol]:mb-0 [&_ol]:mt-1" {...props}>{children}</ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed [&>p]:mb-1 [&>p:last-child]:mb-0" {...props}>{children}</li>
          ),
          code: ({ children, className: codeClassName, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code
                  className="rounded-md bg-muted/80 px-1.5 py-0.5 text-[0.85em] font-mono text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={cn("text-[0.85em] font-mono", codeClassName)} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => (
            <pre
              className="overflow-x-auto rounded-md border border-border bg-muted/50 p-3 text-[0.85em] leading-snug mb-3 last:mb-0"
              {...props}
            >
              {children}
            </pre>
          ),
          hr: ({ ...props }) => (
            <hr className="border-border my-4" {...props} />
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto mb-3 last:mb-0">
              <table className="min-w-full border-collapse text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted/50" {...props}>{children}</thead>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-border px-3 py-1.5 text-left text-xs font-semibold" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-3 py-1.5 text-xs" {...props}>
              {children}
            </td>
          ),
          img: ({ src, alt, ...props }) => (
            <img
              src={src}
              alt={alt ?? ""}
              className="max-w-full rounded-md my-2"
              loading="lazy"
              {...props}
            />
          ),
          input: ({ checked, ...props }) => (
            <input
              type="checkbox"
              checked={checked}
              disabled
              className="mr-1.5 rounded border-border accent-blue-500"
              {...props}
            />
          ),
          del: ({ children, ...props }) => (
            <del className="text-muted-foreground line-through" {...props}>{children}</del>
          ),
          // HTML elements used in GitHub comments
          details: ({ children, ...props }) => (
            <details
              className="my-2 rounded-md border border-border overflow-hidden [&[open]>summary]:border-b [&[open]>summary]:border-border [&>:not(summary)]:px-3 [&>:not(summary)]:py-1 [&>:last-child]:pb-2 [&>details]:ml-2"
              {...props}
            >
              {children}
            </details>
          ),
          summary: ({ children, ...props }) => (
            <summary className="cursor-pointer select-none bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-muted/50" {...props}>
              {children}
            </summary>
          ),
          sub: ({ children, ...props }) => (
            <sub className="text-xs text-muted-foreground" {...props}>{children}</sub>
          ),
          sup: ({ children, ...props }) => (
            <sup className="text-xs" {...props}>{children}</sup>
          ),
          kbd: ({ children, ...props }) => (
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono shadow-sm" {...props}>{children}</kbd>
          ),
        }}
      >
        {cleaned}
      </Markdown>
    </div>
  );
}
