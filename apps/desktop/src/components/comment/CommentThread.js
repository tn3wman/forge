"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentThread = CommentThread;
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var MarkdownBody_1 = require("@/components/common/MarkdownBody");
var TimeAgo_1 = require("@/components/common/TimeAgo");
function CommentThread(_a) {
    var events = _a.events;
    if (!events.length) {
        return (<p className="py-4 text-center text-sm text-muted-foreground">
        No activity yet.
      </p>);
    }
    return (<div className="space-y-3">
      {events.map(function (event, index) {
            var _a;
            return (<EventItem key={(_a = event.id) !== null && _a !== void 0 ? _a : index} event={event}/>);
        })}
    </div>);
}
function EventItem(_a) {
    var event = _a.event;
    switch (event.eventType) {
        case "comment":
            return <CommentEvent event={event}/>;
        case "labeled":
            return <LabelEvent event={event} added/>;
        case "unlabeled":
            return <LabelEvent event={event} added={false}/>;
        case "closed":
            return <StatusEvent event={event} icon={lucide_react_1.CircleX} color="text-red-400" verb="closed this"/>;
        case "reopened":
            return <StatusEvent event={event} icon={lucide_react_1.CircleDot} color="text-green-400" verb="reopened this"/>;
        case "merged":
            return <StatusEvent event={event} icon={lucide_react_1.GitMerge} color="text-purple-400" verb="merged this"/>;
        default:
            return <DefaultEvent event={event}/>;
    }
}
function CommentEvent(_a) {
    var _b, _c;
    var event = _a.event;
    return (<div className="rounded-md border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        {event.actorAvatarUrl ? (<img src={event.actorAvatarUrl} alt={(_b = event.actorLogin) !== null && _b !== void 0 ? _b : ""} className="h-5 w-5 rounded-full"/>) : (<lucide_react_1.MessageSquare className="h-4 w-4 text-muted-foreground"/>)}
        <span className="text-xs font-medium text-foreground">
          {(_c = event.actorLogin) !== null && _c !== void 0 ? _c : "unknown"}
        </span>
        {event.createdAt && <TimeAgo_1.TimeAgo date={event.createdAt}/>}
      </div>
      {event.body && (<div className="px-3 py-2">
          <MarkdownBody_1.MarkdownBody content={event.body}/>
        </div>)}
    </div>);
}
function LabelEvent(_a) {
    var event = _a.event, added = _a.added;
    return (<div className="flex items-center gap-2 px-3 py-1">
      <lucide_react_1.Tag className="h-3.5 w-3.5 text-muted-foreground"/>
      <span className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{event.actorLogin}</span>
        {added ? " added " : " removed "}
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
          {event.label}
        </span>
      </span>
      {event.createdAt && <TimeAgo_1.TimeAgo date={event.createdAt}/>}
    </div>);
}
function StatusEvent(_a) {
    var event = _a.event, Icon = _a.icon, color = _a.color, verb = _a.verb;
    return (<div className="flex items-center gap-2 px-3 py-1">
      <Icon className={(0, utils_1.cn)("h-3.5 w-3.5", color)}/>
      <span className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{event.actorLogin}</span>{" "}
        {verb}
      </span>
      {event.createdAt && <TimeAgo_1.TimeAgo date={event.createdAt}/>}
    </div>);
}
function DefaultEvent(_a) {
    var event = _a.event;
    return (<div className="flex items-center gap-2 px-3 py-1">
      <span className="text-xs text-muted-foreground">
        {event.actorLogin && (<span className="font-medium text-foreground">{event.actorLogin} </span>)}
        {event.eventType}
      </span>
      {event.createdAt && <TimeAgo_1.TimeAgo date={event.createdAt}/>}
    </div>);
}
