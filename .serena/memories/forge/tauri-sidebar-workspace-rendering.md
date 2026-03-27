# Tauri Desktop Sidebar Workspace Rendering Analysis

## Overview
The Forge Tauri app uses an icon-based sidebar (12px width) on the left, with workspace icons at the top, followed by navigation items and settings at the bottom.

## Key File Locations
- **AppShell.tsx**: `/apps/desktop/src/components/layout/AppShell.tsx` (290 lines)
- **WorkspaceSwitcher.tsx**: `/apps/desktop/src/components/workspace/WorkspaceSwitcher.tsx` (85 lines)
- **workspaceStore.ts**: `/apps/desktop/src/stores/workspaceStore.ts` (94 lines)

---

## 1. APPSHELL WORKSPACE RENDERING (Lines 166-175)

### Workspace Icons Container
**Location**: AppShell.tsx lines 166-175
```tsx
{/* Workspace icons */}
<WorkspaceSwitcher />
```

The `WorkspaceSwitcher` component is imported and rendered directly in the icon sidebar.

### Main Sidebar Structure
```tsx
<div className="flex w-12 flex-col items-center border-r bg-sidebar py-3">
  {/* Forge logo button */}
  {/* Separator */}
  {/* WorkspaceSwitcher component */}
  {/* Separator */}
  {/* Nav items (dashboard, PRs, issues, notifications) */}
  {/* Separator */}
  {/* Git nav items (changes, commit graph, branches) */}
  {/* Flex spacer */}
  {/* Settings button */}
  {/* User menu */}
</div>
```

---

## 2. WORKSPACE SWITCHER COMPONENT

### File: WorkspaceSwitcher.tsx (Full implementation)

#### Workspace Icon Rendering (Lines 18-22)
```tsx
function WorkspaceIcon({ workspace }: { workspace: Workspace }) {
  const initial = workspace.name[0]?.toUpperCase() ?? "W";
  return (
    <span className="text-xs font-semibold">{initial}</span>
  );
}
```
- Displays first letter of workspace name in bold
- Falls back to "W" if name is empty

#### Main Component Logic (Lines 24-88)
```tsx
export function WorkspaceSwitcher() {
  const [showAdd, setShowAdd] = useState(false);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const { data: workspaces } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId, setActivePage } = useWorkspaceStore();

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        {workspaces?.map((ws, i) => (
          <Tooltip key={ws.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if (activeWorkspaceId === ws.id) {
                    setActivePage("home");
                  } else {
                    setActiveWorkspaceId(ws.id);
                  }
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  activeWorkspaceId === ws.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <WorkspaceIcon workspace={ws} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {ws.name}
              {i < 9 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {"\u2318"}{i + 1}
                </span>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
```

#### Key Features:
- **Click Behavior**: 
  - Click active workspace → go to "home" page
  - Click inactive workspace → switch to that workspace
- **Add Workspace Button**: Plus icon with tooltip
- **Keyboard Shortcut Hints**: Cmd+1 through Cmd+9 shown in tooltips for first 9 workspaces

---

## 3. ACTIVE WORKSPACE INDICATION

### Visual States
The active workspace button has `bg-primary text-primary-foreground` class while others use:
- `text-muted-foreground` (idle)
- `hover:bg-accent hover:text-accent-foreground` (hover)

### AppShell.tsx Navigation Items Pattern (Lines 174-210)
Same styling pattern applied to nav buttons:
```tsx
className={cn(
  "relative flex h-8 w-8 items-center justify-center rounded-md transition-colors",
  activePage === item.page
    ? "bg-accent text-accent-foreground"
    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
)}
```

### Workspace Keyboard Switching (Lines 109-122)
```tsx
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (!e.metaKey && !e.ctrlKey) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9 && workspaces) {
      const ws = workspaces[num - 1];
      if (ws) {
        e.preventDefault();
        setActiveWorkspaceId(ws.id);
      }
    }
  }
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [workspaces, setActiveWorkspaceId]);
```

---

## 4. WORKSPACE STORE STATE MANAGEMENT

### File: workspaceStore.ts

#### Store Type
```tsx
export type AppPage = "home" | "dashboard" | "pull-requests" | "issues" | "notifications" | "pr-detail" | "issue-detail" | "commit-graph" | "changes" | "branches" | "search" | "settings";

interface WorkspaceStore {
  activeWorkspaceId: string | null;
  activePage: AppPage;
  selectedPrNumber: number | null;
  selectedIssueNumber: number | null;
  selectedRepoFullName: string | null;
  selectedRepoLocalPath: string | null;
  navHistory: NavState[];
  // ... methods
}
```

#### Key Methods
- `setActiveWorkspaceId(id)` - Switch workspace, resets page to "home"
- `setActivePage(page)` - Navigate to page, clears history
- `navigateToPr() / navigateToIssue()` - Push history for detail views
- `goBack()` - Navigate history or fallback to sensible defaults

#### Auto-select First Workspace (AppShell.tsx lines 101-106)
```tsx
useEffect(() => {
  if (!activeWorkspaceId && workspaces && workspaces.length > 0) {
    setActiveWorkspaceId(workspaces[0].id);
  }
}, [activeWorkspaceId, workspaces, setActiveWorkspaceId]);
```

---

## 5. CONTEXT MENU / RIGHT-CLICK IMPLEMENTATION

**No context menu found** for workspace icons in the current code. The only interactions are:
- **Left click**: Switch workspace or go to home
- **Hover**: Show tooltip with name and keyboard shortcut
- **Add workspace**: Click + button to add new workspace

---

## 6. WORKSPACE AUTO-INITIALIZATION

**AppShell.tsx lines 101-106**
- On first load, if no workspace selected and workspaces exist, auto-select first workspace
- Workspace switching resets `navHistory` to prevent cross-workspace navigation history

---

## 7. STYLING & VISUAL HIERARCHY

### Sidebar Dimensions
- Width: `w-12` (48px)
- Icon size: `h-8 w-8` (32px)
- Spacing: `gap-1` between items

### Color Scheme
- Active workspace: `bg-primary text-primary-foreground`
- Active page: `bg-accent text-accent-foreground`
- Inactive: `text-muted-foreground`
- Hover: `bg-accent hover:text-accent-foreground`

### Separators
- Used between workspace icons, nav items, and git items
- Class: `w-6` (24px width, smaller than sidebar)

---

## 8. NO CONTEXT MENU IMPLEMENTATION

Currently, there is **no right-click context menu** for:
- Workspace icons
- Navigation items
- Or any sidebar buttons

All interaction is limited to left-click and keyboard shortcuts.

---

## Summary Table

| Feature | Implementation | File | Lines |
|---------|---|---|---|
| Workspace icon rendering | `WorkspaceIcon` component displays first letter | WorkspaceSwitcher.tsx | 18-22 |
| Active state styling | `bg-primary text-primary-foreground` class | WorkspaceSwitcher.tsx | 40-45 |
| Click behavior | Switch workspace or go home | WorkspaceSwitcher.tsx | 35-44 |
| Keyboard shortcuts | Cmd+1-9 to switch workspaces | AppShell.tsx | 109-122 |
| Store management | Zustand store with history tracking | workspaceStore.ts | All |
| Auto-select first | On mount if none selected | AppShell.tsx | 101-106 |
| Tooltip hints | Name + keyboard shortcut (≤9) | WorkspaceSwitcher.tsx | 48-55 |
