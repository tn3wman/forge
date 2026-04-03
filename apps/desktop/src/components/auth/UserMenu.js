"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMenu = UserMenu;
var lucide_react_1 = require("lucide-react");
var avatar_1 = require("@/components/ui/avatar");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
var useAuth_1 = require("@/hooks/useAuth");
function UserMenu() {
    var _a;
    var _b = (0, useAuth_1.useAuth)(), user = _b.user, logout = _b.logout;
    if (!user)
        return null;
    return (<dropdown_menu_1.DropdownMenu>
      <dropdown_menu_1.DropdownMenuTrigger asChild>
        <button className="flex items-center rounded-md p-1 hover:bg-accent">
          <avatar_1.Avatar className="h-7 w-7">
            <avatar_1.AvatarImage src={user.avatarUrl} alt={user.login}/>
            <avatar_1.AvatarFallback>{(_a = user.login[0]) === null || _a === void 0 ? void 0 : _a.toUpperCase()}</avatar_1.AvatarFallback>
          </avatar_1.Avatar>
        </button>
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent align="end" side="right" className="w-56">
        <dropdown_menu_1.DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name || user.login}</p>
            <p className="text-xs text-muted-foreground">@{user.login}</p>
          </div>
        </dropdown_menu_1.DropdownMenuLabel>
        <dropdown_menu_1.DropdownMenuSeparator />
        <dropdown_menu_1.DropdownMenuItem>
          <lucide_react_1.Settings className="mr-2 h-4 w-4"/>
          Settings
        </dropdown_menu_1.DropdownMenuItem>
        <dropdown_menu_1.DropdownMenuSeparator />
        <dropdown_menu_1.DropdownMenuItem onClick={logout}>
          <lucide_react_1.LogOut className="mr-2 h-4 w-4"/>
          Sign out
        </dropdown_menu_1.DropdownMenuItem>
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>);
}
