import { memo, useCallback, useState } from "react";
import { MessageCircleQuestion, ShieldAlert } from "lucide-react";
import { agentIpc } from "@/ipc/agent";
import type { AgentMessage } from "@/stores/agentStore";
import { ToolInputSummary } from "./tool-renderers/ToolInputSummary";

interface PermissionPromptProps {
  message: AgentMessage;
  sessionId: string;
}

interface StructuredOption {
  label: string;
  description?: string;
}

interface StructuredQuestion {
  question: string;
  header?: string;
  options?: StructuredOption[];
}

export const PermissionPrompt = memo(function PermissionPrompt({
  message,
  sessionId,
}: PermissionPromptProps) {
  const toolUseId = message.toolUseId;

  const handleRespond = useCallback(
    (allow: boolean, resultText?: string) => {
      if (!toolUseId) return;
      agentIpc.respondPermission(sessionId, toolUseId, allow, resultText);
    },
    [sessionId, toolUseId],
  );

  if (message.toolName === "AskUserQuestion") {
    const questions = message.toolInput?.questions as StructuredQuestion[] | undefined;
    const hasStructuredOptions =
      Array.isArray(questions) &&
      questions.some((q) => Array.isArray(q.options) && q.options.length > 0);

    if (hasStructuredOptions) {
      return (
        <StructuredQuestionPrompt
          questions={questions!}
          onRespond={handleRespond}
        />
      );
    }

    const question =
      (message.toolInput?.question as string) ?? message.content;
    return (
      <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 px-4 py-3">
        <div className="flex items-start gap-3">
          <MessageCircleQuestion className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-foreground">{question}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleRespond(false)}
                className="rounded-md border border-border bg-transparent px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => handleRespond(true)}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
        <div className="flex-1 space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {message.toolName ? `Approve ${message.toolName}` : message.content}
            </p>
            {message.detail && (
              <p className="text-xs text-muted-foreground">{message.detail}</p>
            )}
          </div>
          {message.toolInput && (
            <div className="max-h-40 overflow-auto rounded-md border border-yellow-500/20 bg-background/80 p-2">
              <ToolInputSummary
                toolName={message.toolName ?? "tool"}
                toolInput={message.toolInput}
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleRespond(false)}
              className="rounded-md border border-border bg-transparent px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Deny
            </button>
            <button
              type="button"
              onClick={() => handleRespond(true)}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

function StructuredQuestionPrompt({
  questions,
  onRespond,
}: {
  questions: StructuredQuestion[];
  onRespond: (allow: boolean, resultText?: string) => void;
}) {
  const [selections, setSelections] = useState<Record<number, string>>({});
  const isSingleQuestion = questions.length === 1 && questions[0].options && questions[0].options.length > 0;

  const handleSelect = (questionIndex: number, label: string) => {
    if (isSingleQuestion) {
      onRespond(true, label);
      return;
    }
    setSelections((prev) => ({ ...prev, [questionIndex]: label }));
  };

  const allAnswered = questions.every((_, i) => selections[i] !== undefined);

  const handleSubmit = () => {
    if (!allAnswered) return;
    const result = questions
      .map((q, i) => `${q.header ?? q.question}: ${selections[i]}`)
      .join("\n");
    onRespond(true, result);
  };

  return (
    <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <MessageCircleQuestion className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
        <div className="flex-1 space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="space-y-2">
              {q.header && (
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                  {q.header}
                </p>
              )}
              <p className="text-sm font-medium text-foreground">{q.question}</p>
              {q.options && q.options.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {q.options.map((opt) => {
                    const isSelected = selections[qi] === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => handleSelect(qi, opt.label)}
                        className={`rounded-md border px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-500/15 text-foreground"
                            : "border-border bg-background/60 text-foreground hover:border-blue-500/50 hover:bg-blue-500/5"
                        }`}
                      >
                        <span className="text-xs font-medium">{opt.label}</span>
                        {opt.description && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {opt.description}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRespond(false)}
              className="rounded-md border border-border bg-transparent px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Dismiss
            </button>
            {!isSingleQuestion && (
              <button
                type="button"
                disabled={!allAnswered}
                onClick={handleSubmit}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
