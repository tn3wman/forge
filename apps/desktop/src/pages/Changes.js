"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Changes = Changes;
var react_1 = require("react");
var workspaceStore_1 = require("@/stores/workspaceStore");
var useGitStatus_1 = require("@/queries/useGitStatus");
var useGitDiff_1 = require("@/queries/useGitDiff");
var StagingArea_1 = require("@/components/git/StagingArea");
var CommitForm_1 = require("@/components/git/CommitForm");
var GitDiffViewer_1 = require("@/components/git/GitDiffViewer");
var RemoteActions_1 = require("@/components/git/RemoteActions");
function Changes() {
    var _a;
    var localPath = (0, workspaceStore_1.useWorkspaceStore)(function (s) { return s.selectedRepoLocalPath; });
    var _b = (0, react_1.useState)(null), selectedFile = _b[0], setSelectedFile = _b[1];
    var _c = (0, useGitStatus_1.useGitStatus)(localPath).data, files = _c === void 0 ? [] : _c;
    var stagedCount = files.filter(function (f) { return f.staged; }).length;
    var _d = (0, useGitDiff_1.useGitDiff)(localPath, (_a = selectedFile === null || selectedFile === void 0 ? void 0 : selectedFile.staged) !== null && _a !== void 0 ? _a : false, selectedFile === null || selectedFile === void 0 ? void 0 : selectedFile.path).data, diffEntries = _d === void 0 ? [] : _d;
    if (!localPath) {
        return (<div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Set a local path to view changes
        </p>
      </div>);
    }
    return (<div className="flex h-full flex-col overflow-hidden">
      {/* Top toolbar */}
      <RemoteActions_1.RemoteActions localPath={localPath}/>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: staging + commit */}
        <div className="flex w-72 shrink-0 flex-col border-r border-border overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <StagingArea_1.StagingArea localPath={localPath} selectedFile={selectedFile} onSelectFile={function (path, staged) { return setSelectedFile({ path: path, staged: staged }); }}/>
          </div>
          <CommitForm_1.CommitForm localPath={localPath} stagedCount={stagedCount}/>
        </div>

        {/* Right panel: diff viewer */}
        <div className="flex-1 overflow-auto p-4">
          <GitDiffViewer_1.GitDiffViewer entries={diffEntries} selectedFile={selectedFile === null || selectedFile === void 0 ? void 0 : selectedFile.path}/>
        </div>
      </div>
    </div>);
}
