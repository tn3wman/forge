"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Search = Search;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var input_1 = require("@/components/ui/input");
var useSearch_1 = require("@/queries/useSearch");
var workspaceStore_1 = require("@/stores/workspaceStore");
var TimeAgo_1 = require("@/components/common/TimeAgo");
var utils_1 = require("@/lib/utils");
function Search() {
    var _a = (0, react_1.useState)(""), query = _a[0], setQuery = _a[1];
    var _b = (0, useSearch_1.useSearch)(query), results = _b.data, isLoading = _b.isLoading, isFetching = _b.isFetching;
    var _c = (0, workspaceStore_1.useWorkspaceStore)(), navigateToPr = _c.navigateToPr, navigateToIssue = _c.navigateToIssue;
    function handleClick(item) {
        if (item.isPullRequest) {
            navigateToPr(item.repoFullName, item.number);
        }
        else {
            navigateToIssue(item.repoFullName, item.number);
        }
    }
    return (<div className="flex h-full flex-col">
      {/* Search input */}
      <div className="border-b px-4 py-3">
        <div className="relative">
          <lucide_react_1.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
          <input_1.Input autoFocus placeholder="Search issues and pull requests..." value={query} onChange={function (e) { return setQuery(e.target.value); }} className="pl-9"/>
        </div>
        {isFetching && !isLoading && (<p className="mt-1 text-xs text-muted-foreground">Updating...</p>)}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {query.length < 2 ? (<div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Type at least 2 characters
            </p>
          </div>) : isLoading ? (<div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Searching...</p>
          </div>) : results && results.length === 0 ? (<div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No results found</p>
          </div>) : (<ul className="divide-y">
            {results === null || results === void 0 ? void 0 : results.map(function (item) {
                var isOpen = item.state === "open";
                var Icon = item.isPullRequest ? lucide_react_1.GitPullRequest : lucide_react_1.CircleDot;
                return (<li key={"".concat(item.repoFullName, "-").concat(item.number)}>
                  <button onClick={function () { return handleClick(item); }} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors">
                    <Icon className={(0, utils_1.cn)("mt-0.5 h-4 w-4 shrink-0", isOpen ? "text-green-600" : "text-purple-600")}/>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-sm font-medium">
                          {item.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          #{item.number}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.repoFullName}</span>
                        <span>&middot;</span>
                        <span>{item.authorLogin}</span>
                        <span>&middot;</span>
                        <span>
                          <TimeAgo_1.TimeAgo date={item.updatedAt}/>
                        </span>
                      </div>
                      {item.labels.length > 0 && (<div className="mt-1 flex flex-wrap gap-1">
                          {item.labels.map(function (label) { return (<span key={label.name} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium" style={{
                                backgroundColor: "#".concat(label.color, "20"),
                                color: "#".concat(label.color),
                                border: "1px solid #".concat(label.color, "40"),
                            }}>
                              {label.name}
                            </span>); })}
                        </div>)}
                    </div>
                  </button>
                </li>);
            })}
          </ul>)}
      </div>
    </div>);
}
