"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffFileTree = DiffFileTree;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var STATUS_COLORS = {
    added: "text-green-400",
    removed: "text-red-400",
    modified: "text-yellow-400",
    renamed: "text-blue-400",
};
function buildTree(files) {
    var root = { name: "", path: "", files: [], children: [] };
    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
        var file = files_1[_i];
        var parts = file.path.split("/");
        var fileName = parts.pop();
        var current = root;
        var _loop_1 = function (i) {
            var dirName = parts[i];
            var dirPath = parts.slice(0, i + 1).join("/");
            var child = current.children.find(function (c) { return c.name === dirName; });
            if (!child) {
                child = { name: dirName, path: dirPath, files: [], children: [] };
                current.children.push(child);
            }
            current = child;
        };
        for (var i = 0; i < parts.length; i++) {
            _loop_1(i);
        }
        current.files.push(file);
    }
    // Collapse single-child directories
    function collapse(node) {
        node.children = node.children.map(collapse);
        if (node.children.length === 1 && node.files.length === 0 && node.name) {
            var child = node.children[0];
            return {
                name: "".concat(node.name, "/").concat(child.name),
                path: child.path,
                files: child.files,
                children: child.children,
            };
        }
        return node;
    }
    return collapse(root);
}
function DiffFileTree(_a) {
    var files = _a.files, selectedFile = _a.selectedFile, onSelectFile = _a.onSelectFile;
    var tree = (0, react_1.useMemo)(function () { return buildTree(files); }, [files]);
    // If all files are at root level, just render flat list
    var isFlat = tree.children.length === 0;
    return (<div className="text-xs">
      {isFlat ? (<div className="space-y-px">
          {tree.files.map(function (file) { return (<FileRow key={file.path} file={file} isSelected={file.path === selectedFile} onClick={function () { return onSelectFile(file.path); }}/>); })}
        </div>) : (<div className="space-y-px">
          {tree.children.map(function (dir) { return (<DirGroup key={dir.path} node={dir} selectedFile={selectedFile} onSelectFile={onSelectFile}/>); })}
          {tree.files.map(function (file) { return (<FileRow key={file.path} file={file} isSelected={file.path === selectedFile} onClick={function () { return onSelectFile(file.path); }}/>); })}
        </div>)}
    </div>);
}
function DirGroup(_a) {
    var node = _a.node, selectedFile = _a.selectedFile, onSelectFile = _a.onSelectFile;
    var _b = (0, react_1.useState)(true), expanded = _b[0], setExpanded = _b[1];
    return (<div>
      <button type="button" onClick={function () { return setExpanded(!expanded); }} className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground">
        <lucide_react_1.ChevronRight className={(0, utils_1.cn)("h-3 w-3 shrink-0 transition-transform", expanded && "rotate-90")}/>
        <lucide_react_1.FolderOpen className="h-3 w-3 shrink-0"/>
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {expanded && (<div className="ml-3 border-l border-border pl-1">
          {node.children.map(function (child) { return (<DirGroup key={child.path} node={child} selectedFile={selectedFile} onSelectFile={onSelectFile}/>); })}
          {node.files.map(function (file) { return (<FileRow key={file.path} file={file} isSelected={file.path === selectedFile} onClick={function () { return onSelectFile(file.path); }}/>); })}
        </div>)}
    </div>);
}
function FileRow(_a) {
    var _b;
    var file = _a.file, isSelected = _a.isSelected, onClick = _a.onClick;
    var fileName = (_b = file.path.split("/").pop()) !== null && _b !== void 0 ? _b : file.path;
    return (<button type="button" onClick={onClick} className={(0, utils_1.cn)("flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors", isSelected
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>
      <lucide_react_1.File className={(0, utils_1.cn)("h-3 w-3 shrink-0", STATUS_COLORS[file.status])}/>
      <span className="truncate">{fileName}</span>
      <span className="ml-auto flex items-center gap-1 tabular-nums">
        {file.additions > 0 && (<span className="text-green-400">+{file.additions}</span>)}
        {file.deletions > 0 && (<span className="text-red-400">-{file.deletions}</span>)}
      </span>
    </button>);
}
