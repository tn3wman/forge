import {
  GitMerge,
  CircleDot,
  CircleX,
  Tag,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownBody } from "@/components/common/MarkdownBody";
import { TimeAgo } from "@/components/common/TimeAgo";
import type { TimelineEvent } from "@forge/shared";

interface CommentThreadProps {
  events: TimelineEvent[];
}

export function CommentThread({ events }: CommentThreadProps) {
  if (!events.length) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No activity yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <EventItem key={event.id ?? index} event={event} />
      ))}
    </div>
  );
}

function EventItem({ event }: { event: TimelineEvent }) {
  switch (event.eventType) {
    case "comment":
      return <CommentEvent event={event} />;
    case "labeled":
      return <LabelEvent event={event} added />;
    case "unlabeled":
      return <LabelEvent event={event} added={false} />;
    case "closed":
      return <StatusEvent event={event} icon={CircleX} color="text-red-400" verb="closed this" />;
    case "reopened":
      return <StatusEvent event={event} icon={CircleDot} color="text-green-400" verb="reopened this" />;
    case "merged":
      return <StatusEvent event={event} icon={GitMerge} color="text-purple-400" verb="merged this" />;
    default:
      return <DefaultEvent event={event} />;
  }
}

function CommentEvent({ event }: { event: TimelineEvent }) {
  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        {event.actorAvatarUrl ? (
          <img
            src={event.actorAvatarUrl}
            alt={event.actorLogin ?? ""}
            className="h-5 w-5 rounded-full"
          />
        ) : (
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-xs font-medium text-foreground">
          {event.actorLogin ?? "unknown"}
        </span>
        {event.createdAt && <TimeAgo date={event.createdAt} />}
      </div>
      {event.body && (
        <div className="px-3 py-2">
          <MarkdownBody content={event.body} />
        </div>
      )}
    </div>
  );
}

function LabelEvent({ event, added }: { event: TimelineEvent; added: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{event.actorLogin}</span>
        {added ? " added " : " removed "}
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
          {event.label}
        </span>
      </span>
      {event.createdAt && <TimeAgo date={event.createdAt} />}
    </div>
  );
}

function StatusEvent({
  event,
  icon: Icon,
  color,
  verb,
}: {
  event: TimelineEvent;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  verb: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <Icon className={cn("h-3.5 w-3.5", color)} />
      <span className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{event.actorLogin}</span>{" "}
        {verb}
      </span>
      {event.createdAt && <TimeAgo date={event.createdAt} />}
    </div>
  );
}

function DefaultEvent({ event }: { event: TimelineEvent }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <span className="text-xs text-muted-foreground">
        {event.actorLogin && (
          <span className="font-medium text-foreground">{event.actorLogin} </span>
        )}
        {event.eventType}
      </span>
      {event.createdAt && <TimeAgo date={event.createdAt} />}
    </div>
  );
}
