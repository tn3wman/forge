"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeChatView = ClaudeChatView;
var ChatView_1 = require("./ChatView");
function ClaudeChatView(_a) {
    var sessionId = _a.sessionId;
    return <ChatView_1.ChatView sessionId={sessionId} variant="claude"/>;
}
