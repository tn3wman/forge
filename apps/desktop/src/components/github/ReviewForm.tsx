import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ReviewFormProps {
  onSubmit: (event: string, body: string) => void;
  isSubmitting?: boolean;
}

export function ReviewForm({ onSubmit, isSubmitting = false }: ReviewFormProps) {
  const [body, setBody] = useState("");

  const handleSubmit = (event: string) => {
    onSubmit(event, body);
    setBody("");
  };

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a review comment..."
          className="min-h-[80px] w-full resize-y rounded bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          onClick={() => handleSubmit("COMMENT")}
        >
          Comment
        </Button>
        <Button
          size="sm"
          disabled={isSubmitting}
          onClick={() => handleSubmit("APPROVE")}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          Approve
        </Button>
        <Button
          size="sm"
          disabled={isSubmitting}
          onClick={() => handleSubmit("REQUEST_CHANGES")}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          Request Changes
        </Button>
      </div>
    </div>
  );
}
