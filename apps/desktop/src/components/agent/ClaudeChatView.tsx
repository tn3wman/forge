import { ChatView } from "./ChatView";

interface ClaudeChatViewProps {
  sessionId: string;
}

export function ClaudeChatView({ sessionId }: ClaudeChatViewProps) {
  return <ChatView sessionId={sessionId} variant="claude" />;
}
