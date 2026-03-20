let g_FolderDropdown = {  
    timer: null,  
    lastClick: 0,  
    Ctrl: null,  
    s: null  
};  
 
AddType("Folder Dropdown", {  
    Exec: function (Ctrl, s, type, hwnd, pt) {  
        if (!s) { return S_FALSE; }  
  
        const now = new Date().getTime();  
        const doubleClickTime = sha.GetSystemInformation("DoubleClickTime");  
  
        if (g_FolderDropdown.timer !== null && (now - g_FolderDropdown.lastClick) < doubleClickTime) {  
            clearTimeout(g_FolderDropdown.timer);  
            g_FolderDropdown.timer = null;  
            // Double-click: open the configured folder in a new tab  
            return ExecOpen(Ctrl, s, "Open in new tab", hwnd, pt, SBSP_NEWBROWSER);  
        }  
  
        g_FolderDropdown.lastClick = now;  
        g_FolderDropdown.Ctrl = Ctrl;  
        g_FolderDropdown.s = s;  
  
        g_FolderDropdown.timer = setTimeout(function () {  
            if (g_FolderDropdown.timer !== null) {  
                g_FolderDropdown.timer = null;  
                const folder = ExtractMacro(g_FolderDropdown.Ctrl, g_FolderDropdown.s);  
                const pos = api.GetCursorPos();  
                FolderMenu.Clear();  
                const pid = FolderMenu.Open(folder, pos.x, pos.y, "*", 1);  
                if (pid) {  
                    FolderMenu.Invoke(pid, SBSP_NEWBROWSER);  
                }  
            }  
        }, doubleClickTime);  
  
        return S_OK;  
    },  
    Ref: BrowseForFolder  
});