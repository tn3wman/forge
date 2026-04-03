"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTimeAgo = formatTimeAgo;
exports.TimeAgo = TimeAgo;
var react_1 = require("react");
var MINUTE = 60;
var HOUR = 3600;
var DAY = 86400;
var WEEK = 604800;
var MONTH = 2592000;
var YEAR = 31536000;
function formatTimeAgo(date) {
    var now = Date.now();
    var then = new Date(date).getTime();
    var seconds = Math.floor((now - then) / 1000);
    if (seconds < 0)
        return "just now";
    if (seconds < MINUTE)
        return "just now";
    if (seconds < HOUR) {
        var m = Math.floor(seconds / MINUTE);
        return "".concat(m, "m ago");
    }
    if (seconds < DAY) {
        var h = Math.floor(seconds / HOUR);
        return "".concat(h, "h ago");
    }
    if (seconds < WEEK) {
        var d = Math.floor(seconds / DAY);
        return "".concat(d, "d ago");
    }
    if (seconds < MONTH) {
        var w = Math.floor(seconds / WEEK);
        return "".concat(w, "w ago");
    }
    if (seconds < YEAR) {
        var mo = Math.floor(seconds / MONTH);
        return "".concat(mo, "mo ago");
    }
    var y = Math.floor(seconds / YEAR);
    return "".concat(y, "y ago");
}
function TimeAgo(_a) {
    var date = _a.date;
    var _b = (0, react_1.useState)(function () { return formatTimeAgo(date); }), text = _b[0], setText = _b[1];
    (0, react_1.useEffect)(function () {
        setText(formatTimeAgo(date));
        var interval = setInterval(function () {
            setText(formatTimeAgo(date));
        }, 60000);
        return function () { return clearInterval(interval); };
    }, [date]);
    return (<time dateTime={date} title={new Date(date).toLocaleString()} className="text-xs text-muted-foreground tabular-nums">
      {text}
    </time>);
}
