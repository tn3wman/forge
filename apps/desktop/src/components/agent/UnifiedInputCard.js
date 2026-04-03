"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedInputCard = UnifiedInputCard;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
var SlashCommandMenu_1 = require("./SlashCommandMenu");
var AgentSelector_1 = require("./AgentSelector");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
var ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
var MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB base64 limit (~3.75MB raw)
var MAX_IMAGES = 5;
var MODE_COMMANDS = {
    supervised: "supervised",
    assisted: "assisted",
    full: "fullAccess",
    yolo: "fullAccess",
};
var MODE_CONFIG = {
    supervised: { label: "Supervised", icon: lucide_react_1.Shield },
    assisted: { label: "Assisted", icon: lucide_react_1.ShieldAlert },
    fullAccess: { label: "Full Access", icon: lucide_react_1.ShieldCheck },
};
var MODEL_PRESETS = [
    { value: "", label: "Default" },
    { value: "claude-opus-4-6", label: "Opus 4.6" },
    { value: "claude-sonnet-4-6", label: "Sonnet 4.6" },
    { value: "claude-haiku-4-5", label: "Haiku 4.5" },
];
var EFFORT_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
];
function UnifiedInputCard(_a) {
    var _b, _c, _d, _e, _f;
    var onSend = _a.onSend, onAbort = _a.onAbort, agentState = _a.agentState, disabled = _a.disabled, _g = _a.mode, mode = _g === void 0 ? "assisted" : _g, onModeChange = _a.onModeChange, planMode = _a.planMode, onPlanModeChange = _a.onPlanModeChange, _h = _a.slashCommands, slashCommands = _h === void 0 ? [] : _h, model = _a.model, onModelChange = _a.onModelChange, effort = _a.effort, onEffortChange = _a.onEffortChange, showAgentSelector = _a.showAgentSelector, clis = _a.clis, selectedCli = _a.selectedCli, onSelectCli = _a.onSelectCli, clisLoading = _a.clisLoading, showTerminalButton = _a.showTerminalButton, onOpenTerminal = _a.onOpenTerminal, onFocusChange = _a.onFocusChange, onClear = _a.onClear;
    var _j = (0, react_1.useState)(""), text = _j[0], setText = _j[1];
    var _k = (0, react_1.useState)([]), images = _k[0], setImages = _k[1];
    var _l = (0, react_1.useState)(null), imageError = _l[0], setImageError = _l[1];
    var _m = (0, react_1.useState)(false), slashMenuDismissed = _m[0], setSlashMenuDismissed = _m[1];
    var _o = (0, react_1.useState)(null), confirmation = _o[0], setConfirmation = _o[1];
    var _p = (0, react_1.useState)(false), isDragging = _p[0], setIsDragging = _p[1];
    var textareaRef = (0, react_1.useRef)(null);
    var fileInputRef = (0, react_1.useRef)(null);
    var isRunning = agentState === "thinking" || agentState === "executing";
    var showSlashMenu = text.startsWith("/") && !text.includes(" ") && !slashMenuDismissed;
    var slashFilter = text.slice(1);
    var currentModeConfig = (_b = MODE_CONFIG[mode]) !== null && _b !== void 0 ? _b : MODE_CONFIG.assisted;
    var ModeIcon = currentModeConfig.icon;
    var currentModelLabel = (_d = (_c = MODEL_PRESETS.find(function (p) { return p.value === (model !== null && model !== void 0 ? model : ""); })) === null || _c === void 0 ? void 0 : _c.label) !== null && _d !== void 0 ? _d : (model || "Default");
    var currentEffortLabel = (_f = (_e = EFFORT_OPTIONS.find(function (o) { return o.value === (effort !== null && effort !== void 0 ? effort : "medium"); })) === null || _e === void 0 ? void 0 : _e.label) !== null && _f !== void 0 ? _f : "Medium";
    (0, react_1.useEffect)(function () {
        if (!text.startsWith("/")) {
            setSlashMenuDismissed(false);
        }
    }, [text]);
    var adjustHeight = (0, react_1.useCallback)(function () {
        var el = textareaRef.current;
        if (!el)
            return;
        el.style.height = "auto";
        el.style.height = "".concat(Math.min(el.scrollHeight, 200), "px");
    }, []);
    (0, react_1.useEffect)(function () {
        adjustHeight();
    }, [text, adjustHeight]);
    var processFiles = (0, react_1.useCallback)(function (files) {
        setImageError(null);
        var fileArray = Array.from(files);
        var _loop_1 = function (file) {
            if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
                setImageError("Unsupported format: ".concat(file.type || "unknown", ". Use PNG, JPEG, GIF, or WebP."));
                return "continue";
            }
            var reader = new FileReader();
            reader.onload = function () {
                var dataUrl = reader.result;
                // dataUrl format: "data:image/png;base64,iVBOR..."
                var commaIndex = dataUrl.indexOf(",");
                var base64Data = dataUrl.slice(commaIndex + 1);
                if (base64Data.length > MAX_IMAGE_SIZE_BYTES) {
                    setImageError("Image too large (max 5MB). Try a smaller image.");
                    return;
                }
                setImages(function (prev) {
                    if (prev.length >= MAX_IMAGES) {
                        setImageError("Maximum ".concat(MAX_IMAGES, " images per message."));
                        return prev;
                    }
                    return __spreadArray(__spreadArray([], prev, true), [{
                            data: base64Data,
                            mediaType: file.type,
                            fileName: file.name,
                        }], false);
                });
            };
            reader.readAsDataURL(file);
        };
        for (var _i = 0, fileArray_1 = fileArray; _i < fileArray_1.length; _i++) {
            var file = fileArray_1[_i];
            _loop_1(file);
        }
    }, []);
    var removeImage = (0, react_1.useCallback)(function (index) {
        setImages(function (prev) { return prev.filter(function (_, i) { return i !== index; }); });
        setImageError(null);
    }, []);
    var handlePaste = (0, react_1.useCallback)(function (e) {
        var _a;
        var items = (_a = e.clipboardData) === null || _a === void 0 ? void 0 : _a.items;
        if (!items)
            return;
        var imageFiles = [];
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var item = items_1[_i];
            if (item.type.startsWith("image/")) {
                var file = item.getAsFile();
                if (file)
                    imageFiles.push(file);
            }
        }
        if (imageFiles.length > 0) {
            e.preventDefault();
            processFiles(imageFiles);
        }
    }, [processFiles]);
    var handleDragOver = (0, react_1.useCallback)(function (e) {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    var handleDragLeave = (0, react_1.useCallback)(function (e) {
        e.preventDefault();
        setIsDragging(false);
    }, []);
    var handleDrop = (0, react_1.useCallback)(function (e) {
        var _a;
        e.preventDefault();
        setIsDragging(false);
        var files = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files;
        if (files === null || files === void 0 ? void 0 : files.length) {
            processFiles(Array.from(files).filter(function (f) { return f.type.startsWith("image/"); }));
        }
    }, [processFiles]);
    var showConfirmationMsg = (0, react_1.useCallback)(function (msg) {
        setConfirmation(msg);
        setTimeout(function () { return setConfirmation(null); }, 1000);
    }, []);
    var handleSlashCommandSelect = (0, react_1.useCallback)(function (cmd) {
        if (cmd.category === "local") {
            switch (cmd.name) {
                case "clear":
                    onClear === null || onClear === void 0 ? void 0 : onClear();
                    showConfirmationMsg("Messages cleared");
                    break;
                case "abort":
                    onAbort === null || onAbort === void 0 ? void 0 : onAbort();
                    break;
                case "plan":
                    onPlanModeChange === null || onPlanModeChange === void 0 ? void 0 : onPlanModeChange(true);
                    showConfirmationMsg("Plan mode enabled");
                    break;
                case "default":
                    onPlanModeChange === null || onPlanModeChange === void 0 ? void 0 : onPlanModeChange(false);
                    showConfirmationMsg("Plan mode disabled");
                    break;
                default: {
                    var m = MODE_COMMANDS[cmd.name];
                    if (m) {
                        onModeChange === null || onModeChange === void 0 ? void 0 : onModeChange(m);
                        showConfirmationMsg("Mode changed to ".concat(m));
                    }
                }
            }
        }
        else {
            onSend("/".concat(cmd.name));
        }
        setText("");
    }, [onClear, onAbort, onModeChange, onPlanModeChange, onSend, showConfirmationMsg]);
    var handleSend = (0, react_1.useCallback)(function () {
        var trimmed = text.trim();
        if (!trimmed && images.length === 0)
            return;
        var lower = trimmed.toLowerCase();
        if (lower === "/clear") {
            onClear === null || onClear === void 0 ? void 0 : onClear();
            setText("");
            showConfirmationMsg("Messages cleared");
            return;
        }
        if (lower === "/abort") {
            onAbort === null || onAbort === void 0 ? void 0 : onAbort();
            setText("");
            return;
        }
        if (lower === "/plan") {
            onPlanModeChange === null || onPlanModeChange === void 0 ? void 0 : onPlanModeChange(true);
            setText("");
            showConfirmationMsg("Plan mode enabled");
            return;
        }
        if (lower === "/default") {
            onPlanModeChange === null || onPlanModeChange === void 0 ? void 0 : onPlanModeChange(false);
            setText("");
            showConfirmationMsg("Plan mode disabled");
            return;
        }
        var modeCmd = MODE_COMMANDS[lower.slice(1)];
        if (lower.startsWith("/") && modeCmd) {
            onModeChange === null || onModeChange === void 0 ? void 0 : onModeChange(modeCmd);
            setText("");
            showConfirmationMsg("Mode changed to ".concat(modeCmd));
            return;
        }
        onSend(trimmed, images.length > 0 ? images : undefined);
        setText("");
        setImages([]);
        setImageError(null);
    }, [text, images, onSend, onAbort, onModeChange, onPlanModeChange, onClear, showConfirmationMsg]);
    var handleKeyDown = (0, react_1.useCallback)(function (e) {
        if (e.key === "Escape") {
            if (showSlashMenu) {
                e.preventDefault();
                setSlashMenuDismissed(true);
                return;
            }
            if (isRunning) {
                e.preventDefault();
                onAbort === null || onAbort === void 0 ? void 0 : onAbort();
            }
            return;
        }
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend, isRunning, onAbort, showSlashMenu]);
    var isDisabled = disabled || (showAgentSelector && !selectedCli);
    return (<div className="shrink-0 px-4 pb-1">
      {confirmation && (<div className="flex justify-center pb-2">
          <div className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground animate-in fade-in zoom-in duration-150">
            {confirmation}
          </div>
        </div>)}
      <div className={(0, utils_1.cn)("relative rounded-xl border border-border bg-muted/30", "focus-within:ring-1 focus-within:ring-ring focus-within:border-ring", "transition-colors", isDragging && "ring-2 ring-primary border-primary")} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple className="hidden" onChange={function (e) {
            var _a;
            if ((_a = e.target.files) === null || _a === void 0 ? void 0 : _a.length)
                processFiles(e.target.files);
            e.target.value = "";
        }}/>
        <SlashCommandMenu_1.SlashCommandMenu filter={slashFilter} commands={slashCommands} onSelect={handleSlashCommandSelect} onDismiss={function () { return setSlashMenuDismissed(true); }} visible={showSlashMenu}/>
        <textarea ref={textareaRef} value={text} onChange={function (e) { return setText(e.target.value); }} onKeyDown={handleKeyDown} onPaste={handlePaste} onFocus={function () { return onFocusChange === null || onFocusChange === void 0 ? void 0 : onFocusChange(true); }} onBlur={function () { return onFocusChange === null || onFocusChange === void 0 ? void 0 : onFocusChange(false); }} rows={2} disabled={isDisabled} placeholder={isRunning
            ? "Agent is working..."
            : "Ask for follow-up changes or attach images"} className={(0, utils_1.cn)("w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm", "placeholder:text-muted-foreground/50 focus:outline-none", isDisabled && "opacity-50 cursor-not-allowed")}/>

        {/* Image previews */}
        {images.length > 0 && (<div className="flex gap-2 px-3 pb-2 overflow-x-auto">
            {images.map(function (img, i) {
                var _a;
                return (<div key={i} className="relative group shrink-0">
                <img src={"data:".concat(img.mediaType, ";base64,").concat(img.data)} alt={(_a = img.fileName) !== null && _a !== void 0 ? _a : "Image ".concat(i + 1)} className="h-12 w-12 rounded-md border border-border object-cover"/>
                <button type="button" onClick={function () { return removeImage(i); }} className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <lucide_react_1.X className="h-2.5 w-2.5"/>
                </button>
              </div>);
            })}
          </div>)}

        {/* Image error */}
        {imageError && (<p className="px-3 pb-2 text-xs text-destructive">{imageError}</p>)}

        {/* Controls row */}
        <div className="flex items-center gap-0 px-3 pb-3">
          {/* Agent selector (PreSessionView only) */}
          {showAgentSelector && (<>
              {clisLoading ? (<div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground/60">
                  <lucide_react_1.Loader2 className="h-3.5 w-3.5 animate-spin"/>
                </div>) : (<AgentSelector_1.AgentSelector clis={clis !== null && clis !== void 0 ? clis : []} selected={selectedCli !== null && selectedCli !== void 0 ? selectedCli : null} onSelect={onSelectCli !== null && onSelectCli !== void 0 ? onSelectCli : (function () { })} disabled={isDisabled}/>)}
              <Separator />
            </>)}

          {/* Model selector (PreSessionView only, when Claude) */}
          {onModelChange && (<>
              <dropdown_menu_1.DropdownMenu>
                <dropdown_menu_1.DropdownMenuTrigger disabled={isDisabled} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                  <lucide_react_1.Sparkles className="h-3.5 w-3.5"/>
                  <span className="font-medium">{currentModelLabel}</span>
                  <lucide_react_1.ChevronDown className="h-3 w-3"/>
                </dropdown_menu_1.DropdownMenuTrigger>
                <dropdown_menu_1.DropdownMenuContent align="start">
                  {MODEL_PRESETS.map(function (preset) { return (<dropdown_menu_1.DropdownMenuItem key={preset.value} onClick={function () { return onModelChange(preset.value); }} className={(0, utils_1.cn)((model !== null && model !== void 0 ? model : "") === preset.value && "bg-accent")}>
                      {preset.label}
                    </dropdown_menu_1.DropdownMenuItem>); })}
                </dropdown_menu_1.DropdownMenuContent>
              </dropdown_menu_1.DropdownMenu>
              <Separator />
            </>)}

          {/* Effort selector (PreSessionView only, when Claude) */}
          {onEffortChange && (<>
              <dropdown_menu_1.DropdownMenu>
                <dropdown_menu_1.DropdownMenuTrigger disabled={isDisabled} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                  <lucide_react_1.Gauge className="h-3.5 w-3.5"/>
                  <span className="font-medium">{currentEffortLabel}</span>
                  <lucide_react_1.ChevronDown className="h-3 w-3"/>
                </dropdown_menu_1.DropdownMenuTrigger>
                <dropdown_menu_1.DropdownMenuContent align="start">
                  {EFFORT_OPTIONS.map(function (option) { return (<dropdown_menu_1.DropdownMenuItem key={option.value} onClick={function () { return onEffortChange(option.value); }} className={(0, utils_1.cn)((effort !== null && effort !== void 0 ? effort : "medium") === option.value && "bg-accent")}>
                      {option.label}
                    </dropdown_menu_1.DropdownMenuItem>); })}
                </dropdown_menu_1.DropdownMenuContent>
              </dropdown_menu_1.DropdownMenu>
              <Separator />
            </>)}

          {/* Unified mode dropdown */}
          <dropdown_menu_1.DropdownMenu>
            <dropdown_menu_1.DropdownMenuTrigger disabled={isDisabled} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
              <ModeIcon className="h-3.5 w-3.5"/>
              <span className="font-medium">{currentModeConfig.label}</span>
              <lucide_react_1.ChevronDown className="h-3 w-3"/>
            </dropdown_menu_1.DropdownMenuTrigger>
            <dropdown_menu_1.DropdownMenuContent align="start">
              <dropdown_menu_1.DropdownMenuItem onClick={function () { return onModeChange === null || onModeChange === void 0 ? void 0 : onModeChange("supervised"); }} className={(0, utils_1.cn)(mode === "supervised" && "bg-accent")}>
                <lucide_react_1.Shield className="mr-2 h-3.5 w-3.5"/>
                Supervised
              </dropdown_menu_1.DropdownMenuItem>
              <dropdown_menu_1.DropdownMenuItem onClick={function () { return onModeChange === null || onModeChange === void 0 ? void 0 : onModeChange("assisted"); }} className={(0, utils_1.cn)(mode === "assisted" && "bg-accent")}>
                <lucide_react_1.ShieldAlert className="mr-2 h-3.5 w-3.5"/>
                Assisted
              </dropdown_menu_1.DropdownMenuItem>
              <dropdown_menu_1.DropdownMenuItem onClick={function () { return onModeChange === null || onModeChange === void 0 ? void 0 : onModeChange("fullAccess"); }} className={(0, utils_1.cn)(mode === "fullAccess" && "bg-accent")}>
                <lucide_react_1.ShieldCheck className="mr-2 h-3.5 w-3.5"/>
                Full Access
              </dropdown_menu_1.DropdownMenuItem>
            </dropdown_menu_1.DropdownMenuContent>
          </dropdown_menu_1.DropdownMenu>

          {/* Plan mode toggle */}
          {onPlanModeChange && (<>
              <Separator />
              <button type="button" onClick={function () { return onPlanModeChange(!planMode); }} disabled={isDisabled} className={(0, utils_1.cn)("flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors disabled:opacity-50", planMode
                ? "text-primary font-semibold bg-primary/10"
                : "text-muted-foreground hover:text-foreground")} title={planMode ? "Plan mode ON — agent will propose a plan before executing" : "Plan mode OFF"}>
                <lucide_react_1.ClipboardList className="h-3.5 w-3.5"/>
                <span className="font-medium">Plan</span>
              </button>
            </>)}

          {/* Terminal button (PreSessionView only) */}
          {showTerminalButton && (<>
              <Separator />
              <button onClick={onOpenTerminal} disabled={isDisabled} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                <lucide_react_1.Terminal className="h-3.5 w-3.5"/>
                <span className="font-medium">Terminal</span>
              </button>
            </>)}

          {/* Attach image button */}
          <button type="button" onClick={function () { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} disabled={isDisabled || images.length >= MAX_IMAGES} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50" title="Attach images">
            <lucide_react_1.Paperclip className="h-3.5 w-3.5"/>
          </button>

          <div className="flex-1"/>

          {/* Send / Abort button */}
          {isRunning ? (<button type="button" onClick={function () { return onAbort === null || onAbort === void 0 ? void 0 : onAbort(); }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700">
              <lucide_react_1.Square className="h-3.5 w-3.5"/>
            </button>) : isDisabled ? (<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/>
            </div>) : (<button type="button" onClick={handleSend} disabled={!text.trim() && images.length === 0} className={(0, utils_1.cn)("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors", text.trim() || images.length > 0
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed")}>
              <lucide_react_1.ArrowUp className="h-4 w-4"/>
            </button>)}
        </div>
      </div>
    </div>);
}
function Separator() {
    return <div className="mx-1 h-4 w-px bg-border"/>;
}
