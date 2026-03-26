import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MarkdownBody } from "@/components/common/MarkdownBody";

interface CommentEditorProps {
  onSubmit: (body: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function CommentEditor({
  onSubmit,
  onCancel,
  placeholder = "Leave a comment...",
  submitLabel = "Comment",
  isSubmitting = false,
}: CommentEditorProps) {
  const [value, setValue] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value);
    setValue("");
    setShowPreview(false);
  };

  return (
    <div className="rounded-md border border-border bg-background">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        <button
          type="button"
          className={cn(
            "px-3 py-1.5 text-xs font-medium transition-colors",
            !showPreview
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setShowPreview(false)}
        >
          Write
        </button>
        <button
          type="button"
          className={cn(
            "px-3 py-1.5 text-xs font-medium transition-colors",
            showPreview
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setShowPreview(true)}
        >
          Preview
        </button>
      </div>

      {/* Content area */}
      <div className="p-2">
        {showPreview ? (
          <div className="min-h-[100px] px-1">
            {value.trim() ? (
              <MarkdownBody content={value} />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nothing to preview
              </p>
            )}
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="min-h-[100px] w-full resize-y rounded bg-transparent p-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-border px-2 py-1.5">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!value.trim() || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
