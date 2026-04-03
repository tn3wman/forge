"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguage = detectLanguage;
var EXT_TO_LANG = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    rb: "ruby",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "ini",
    xml: "xml",
    html: "xml",
    css: "css",
    scss: "scss",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    md: "markdown",
    dockerfile: "dockerfile",
    makefile: "makefile",
    graphql: "graphql",
    gql: "graphql",
};
function detectLanguage(filePath) {
    var _a, _b;
    if (!filePath)
        return undefined;
    var basename = (_a = filePath.split("/").pop()) !== null && _a !== void 0 ? _a : "";
    var lower = basename.toLowerCase();
    if (lower === "dockerfile")
        return "dockerfile";
    if (lower === "makefile")
        return "makefile";
    var ext = (_b = lower.split(".").pop()) !== null && _b !== void 0 ? _b : "";
    return EXT_TO_LANG[ext];
}
