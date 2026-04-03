"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIssueLinkedPrs = useIssueLinkedPrs;
var react_1 = require("react");
var usePullRequests_1 = require("@/queries/usePullRequests");
function useIssueLinkedPrs() {
    var _a = (0, usePullRequests_1.usePullRequests)().data, pullRequests = _a === void 0 ? [] : _a;
    return (0, react_1.useMemo)(function () {
        var _a, _b;
        var map = new Map();
        for (var _i = 0, pullRequests_1 = pullRequests; _i < pullRequests_1.length; _i++) {
            var pr = pullRequests_1[_i];
            if (!pr.linkedIssues || pr.linkedIssues.length === 0)
                continue;
            for (var _c = 0, _d = pr.linkedIssues; _c < _d.length; _c++) {
                var issue = _d[_c];
                var key = "".concat(pr.repoFullName, "#").concat(issue.number);
                var existing = (_a = map.get(key)) !== null && _a !== void 0 ? _a : [];
                existing.push({
                    prNumber: pr.number,
                    prTitle: pr.title,
                    prState: pr.state,
                    repoFullName: (_b = pr.repoFullName) !== null && _b !== void 0 ? _b : "",
                    headRef: pr.headRef,
                });
                map.set(key, existing);
            }
        }
        return map;
    }, [pullRequests]);
}
