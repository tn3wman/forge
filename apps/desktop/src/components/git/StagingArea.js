"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StagingArea = StagingArea;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var button_1 = require("@/components/ui/button");
var useGitStatus_1 = require("@/queries/useGitStatus");
var useGitMutations_1 = require("@/queries/useGitMutations");
var STATUS_LETTER = {
    modified: "M",
    added: "A",
    deleted: "D",
    renamed: "R",
    untracked: "?",
    conflicted: "C",
};
var STATUS_COLOR = {
    modified: "text-yellow-400",
    added: "text-green-400",
    deleted: "text-red-400",
    renamed: "text-blue-400",
    untracked: "text-muted-foreground",
    conflicted: "text-orange-400",
};
function splitPath(filePath) {
    var idx = filePath.lastIndexOf("/");
    if (idx === -1)
        return { dir: "", base: filePath };
    return { dir: filePath.slice(0, idx + 1), base: filePath.slice(idx + 1) };
}
function StagingArea(_a) {
    var localPath = _a.localPath, selectedFile = _a.selectedFile, onSelectFile = _a.onSelectFile;
    var _b = (0, useGitStatus_1.useGitStatus)(localPath).data, files = _b === void 0 ? [] : _b;
    var stageFiles = (0, useGitMutations_1.useStageFiles)();
    var unstageFiles = (0, useGitMutations_1.useUnstageFiles)();
    var stageAll = (0, useGitMutations_1.useStageAll)();
    var _c = (0, react_1.useState)(true), unstagedOpen = _c[0], setUnstagedOpen = _c[1];
    var _d = (0, react_1.useState)(true), stagedOpen = _d[0], setStagedOpen = _d[1];
    var unstaged = files.filter(function (f) { return !f.staged; });
    var staged = files.filter(function (f) { return f.staged; });
    return (<div className="flex flex-col overflow-hidden">
      {/* Unstaged section */}
      <Section title={"Unstaged Changes (".concat(unstaged.length, ")")} open={unstagedOpen} onToggle={function () { return setUnstagedOpen(function (v) { return !v; }); }} actionLabel="Stage All" actionIcon={<lucide_react_1.Plus className="h-3 w-3"/>} actionLoading={stageAll.isPending} onAction={function () { return stageAll.mutate({ path: localPath }); }} files={unstaged} selectedFile={selectedFile} onSelectFile={function (path) { return onSelectFile(path, false); }} onFileAction={function (path) { return stageFiles.mutate({ path: localPath, paths: [path] }); }} fileActionIcon={<lucide_react_1.Plus className="h-3 w-3"/>} fileActionLoading={stageFiles.isPending}/>

      {/* Staged section */}
      <Section title={"Staged Changes (".concat(staged.length, ")")} open={stagedOpen} onToggle={function () { return setStagedOpen(function (v) { return !v; }); }} actionLabel="Unstage All" actionIcon={<lucide_react_1.Minus className="h-3 w-3"/>} actionLoading={unstageFiles.isPending} onAction={function () {
            if (staged.length > 0) {
                unstageFiles.mutate({ path: localPath, paths: staged.map(function (f) { return f.path; }) });
            }
        }} files={staged} selectedFile={selectedFile} onSelectFile={function (path) { return onSelectFile(path, true); }} onFileAction={function (path) { return unstageFiles.mutate({ path: localPath, paths: [path] }); }} fileActionIcon={<lucide_react_1.Minus className="h-3 w-3"/>} fileActionLoading={unstageFiles.isPending}/>
    </div>);
}
function Section(_a) {
    var title = _a.title, open = _a.open, onToggle = _a.onToggle, actionLabel = _a.actionLabel, actionIcon = _a.actionIcon, actionLoading = _a.actionLoading, onAction = _a.onAction, files = _a.files, selectedFile = _a.selectedFile, onSelectFile = _a.onSelectFile, onFileAction = _a.onFileAction, fileActionIcon = _a.fileActionIcon, fileActionLoading = _a.fileActionLoading;
    return (<div className="flex flex-col min-h-0">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <button type="button" onClick={onToggle} className="flex items-center gap-1 text-xs font-medium text-foreground hover:text-foreground/80">
          {open ? <lucide_react_1.ChevronDown className="h-3 w-3"/> : <lucide_react_1.ChevronRight className="h-3 w-3"/>}
          {title}
        </button>
        <div className="flex-1"/>
        <button_1.Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={function (e) {
            e.stopPropagation();
            onAction();
        }} disabled={files.length === 0 || actionLoading}>
          {actionLoading ? <lucide_react_1.Loader2 className="h-3 w-3 animate-spin"/> : actionIcon}
          {actionLabel}
        </button_1.Button>
      </div>

      {open && (<div className="flex-1 overflow-y-auto">
          {files.length === 0 ? (<p className="px-3 py-2 text-xs text-muted-foreground italic">No changes</p>) : (files.map(function (file) {
                var _a, _b;
                var _c = splitPath(file.path), dir = _c.dir, base = _c.base;
                var isSelected = (selectedFile === null || selectedFile === void 0 ? void 0 : selectedFile.path) === file.path && (selectedFile === null || selectedFile === void 0 ? void 0 : selectedFile.staged) === file.staged;
                return (<div key={file.path} className={(0, utils_1.cn)("group flex items-center gap-1.5 px-2 py-0.5 cursor-pointer hover:bg-accent/50", isSelected && "bg-accent")} onClick={function () { return onSelectFile(file.path); }}>
                  <span className={(0, utils_1.cn)("flex h-4 w-4 shrink-0 items-center justify-center text-[10px] font-bold", (_a = STATUS_COLOR[file.status]) !== null && _a !== void 0 ? _a : "text-muted-foreground")}>
                    {(_b = STATUS_LETTER[file.status]) !== null && _b !== void 0 ? _b : "?"}
                  </span>
                  <span className="flex-1 truncate font-mono text-xs">
                    {dir && <span className="text-muted-foreground">{dir}</span>}
                    <span className="font-semibold">{base}</span>
                  </span>
                  <button_1.Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100" onClick={function (e) {
                        e.stopPropagation();
                        onFileAction(file.path);
                    }} disabled={fileActionLoading}>
                    {fileActionIcon}
                  </button_1.Button>
                </div>);
            }))}
        </div>)}
    </div>);
}
