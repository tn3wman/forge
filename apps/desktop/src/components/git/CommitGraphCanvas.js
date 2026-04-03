"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitGraphCanvas = CommitGraphCanvas;
var react_1 = require("react");
var LANE_WIDTH = 20;
var NODE_RADIUS = 4;
var COLOR_PALETTE = [
    "#4ec9b0",
    "#569cd6",
    "#c586c0",
    "#ce9178",
    "#dcdcaa",
    "#9cdcfe",
    "#d16969",
    "#608b4e",
];
function CommitGraphCanvas(_a) {
    var rows = _a.rows, rowHeight = _a.rowHeight, scrollTop = _a.scrollTop, width = _a.width;
    var canvasRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var canvas = canvasRef.current;
        if (!canvas)
            return;
        var ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        var dpr = window.devicePixelRatio || 1;
        var height = canvas.clientHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);
        var firstVisible = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
        var lastVisible = Math.min(rows.length - 1, Math.ceil((scrollTop + height) / rowHeight) + 1);
        function laneX(col) {
            return col * LANE_WIDTH + LANE_WIDTH / 2;
        }
        function rowCenterY(index) {
            return index * rowHeight + rowHeight / 2 - scrollTop;
        }
        // Draw lines first (behind nodes)
        for (var i = firstVisible; i <= lastVisible; i++) {
            var row = rows[i];
            var cy = rowCenterY(i);
            for (var _i = 0, _a = row.lines; _i < _a.length; _i++) {
                var line = _a[_i];
                var color = COLOR_PALETTE[line.colorIndex % COLOR_PALETTE.length];
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                var fromX = laneX(line.fromColumn);
                var toX = laneX(line.toColumn);
                var topY = cy - rowHeight / 2;
                var bottomY = cy + rowHeight / 2;
                if (line.fromColumn === line.toColumn) {
                    // Straight vertical line
                    ctx.moveTo(fromX, topY);
                    ctx.lineTo(toX, bottomY);
                }
                else {
                    // Quadratic bezier curve between columns
                    ctx.moveTo(fromX, topY);
                    ctx.quadraticCurveTo(fromX, cy, toX, bottomY);
                }
                ctx.stroke();
            }
        }
        // Draw commit nodes on top
        for (var i = firstVisible; i <= lastVisible; i++) {
            var row = rows[i];
            var cx = laneX(row.column);
            var cy = rowCenterY(i);
            var color = COLOR_PALETTE[row.column % COLOR_PALETTE.length];
            // Outer circle
            ctx.beginPath();
            ctx.arc(cx, cy, NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            // Inner dot for merge commits
            if (row.commit.parents.length > 1) {
                ctx.beginPath();
                ctx.arc(cx, cy, NODE_RADIUS - 2, 0, Math.PI * 2);
                ctx.fillStyle = "#1e1e1e";
                ctx.fill();
            }
        }
    }, [rows, rowHeight, scrollTop, width]);
    return (<canvas ref={canvasRef} style={{ width: width, height: "100%" }} className="pointer-events-none"/>);
}
