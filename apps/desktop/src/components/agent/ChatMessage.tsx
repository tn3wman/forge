import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import {
  Bot,
  Brain,
  ChevronDown,
  ChevronRight,
  Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentMessage } from "@/stores/agentStore";

interface ChatMessageProps {
  message: AgentMessage;
  onToggleReasoning?: () => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  onToggleReasoning,
}: ChatMessageProps) {
  const isUser = message.type === "user";
  const isAssistantStreaming =
    !isUser &&
    (message.streamState === "pending" || message.streamState === "streaming");
  const hasReasoning = !isUser && !!message.reasoning;
  const reasoningSummary = message.reasoning?.trim().split("\n")[0] ?? "Thinking";

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50 text-foreground",
        )}
      >
        {isUser ? (
          <div>
            {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
            {message.images?.length ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {message.images.map((img, i) => (
                  <img
                    key={i}
                    src={`data:${img.mediaType};base64,${img.data}`}
                    alt={img.fileName ?? `Image ${i + 1}`}
                    className="max-h-48 rounded-md border border-border/50"
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {isAssistantStreaming && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{message.content ? "Streaming response" : "Thinking"}</span>
              </div>
            )}

            {message.content ? (
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : null}

            {hasReasoning && (
              <div className="rounded-md border border-border/70 bg-background/60">
                <button
                  type="button"
                  onClick={onToggleReasoning}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40"
                >
                  {message.reasoningCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <Brain className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">Thinking</span>
                  {message.reasoningState === "streaming" && (
                    <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />
                  )}
                </button>

                {message.reasoningCollapsed ? (
                  <p className="border-t border-border/70 px-3 py-2 text-xs text-muted-foreground line-clamp-2">
                    {reasoningSummary}
                  </p>
                ) : (
                  <div className="border-t border-border/70 px-3 py-2">
                    <div className="prose prose-sm prose-invert max-w-none text-xs text-muted-foreground [&>*]:text-muted-foreground [&>*]:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {message.reasoning ?? ""}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
