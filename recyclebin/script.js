const Addon_Id = "recyclebin";  
const Default = "ToolBar2Right";  
  
const item = GetAddonElement(Addon_Id);  
if (!item.getAttribute("Set")) {  
	item.setAttribute("Default", Default);  
	item.setAttribute("Set", 1);  
}  
  
if (window.Addon == 1) {  
	const NoConfirm = item.getAttribute("NoConfirm");  
	const ShowCount = item.getAttribute("ShowCount");  
	const Delay = GetNum(item.getAttribute("Delay")) || 300;  
  
	Addons.RecycleBin = {  
		tid: null,  
		tidPoll: null,  
		lastCount: -1,  
		h: 16,  
		sIcon: null,  
  
		// Compte via Shell.Application (api.NameSpace no existeix a TE)  
		Count: async function () {  
			try {  
				const shell = api.CreateObject("Shell.Application");  
				const folder = shell.NameSpace(10); // 10 = ssfBITBUCKET (0xA)  
				return folder.Items().Count;  
			} catch (e) {  
				return -1;  
			}  
		},  
  
		Refresh: async function () {  
			const o = document.getElementById("recyclebin_img");  
			if (!o) {  
				return;  
			}  
			const rb = Addons.RecycleBin;  
			try {  
				const nCount = await rb.Count();  
				if (nCount === rb.lastCount) {  
					return; // res nou: no tocar el DOM  
				}  
				rb.lastCount = nCount;  
  
				const sSrc = rb.sIcon ||  
					"icon:C:\\Windows\\System32\\imageres.dll," + (nCount > 0 ? "49" : "50");  
				// MakeImgSrc retorna una URL vàlida per a <img src>; GetImgTag NO (retorna HTML)  
				o.src = await MakeImgSrc(sSrc, 0, false, rb.h);  
				o.title = "Recycle Bin" + (ShowCount && nCount >= 0 ? " (" + nCount + ")" : "");  
			} catch (e) { }  
		},  
  
		DelayedRefresh: function () {  
			const rb = Addons.RecycleBin;  
			clearTimeout(rb.tid);  
			rb.tid = setTimeout(rb.Refresh, Delay);  
		},  
		/*
		Popup: async function (ev) {  
			const hMenu = await api.CreatePopupMenu();  
			try {  
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, 1, await GetText("Open"));  
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, 2, await GetText("Empty Recycle Bin"));  
				const x = await ev.screenX * ui_.Zoom;  
				const y = await ev.screenY * ui_.Zoom;  
				const nVerb = await api.TrackPopupMenuEx(hMenu, TPM_RETURNCMD, x, y, ui_.hwnd, null);  
				if (nVerb == 1) {  
					Navigate(ssfBITBUCKET, SBSP_NEWBROWSER);  
				} else if (nVerb == 2) {  
					// NoConfirm -> sense diàleg de confirmació ni progrés  
					api.SHEmptyRecycleBin(ui_.hwnd, null, NoConfirm ? 1 | 2 : 0);  
					Addons.RecycleBin.DelayedRefresh();  
				}  
			} finally {  
				api.DestroyMenu(hMenu);  
			}  
		}*/
		Popup: async function (ev) {  
			const rb = Addons.RecycleBin;  
			const hMenu = await api.CreatePopupMenu();  
			try {  
				const nCount = await rb.Count();  
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING, 1, await GetText("Open"));  
				await api.InsertMenu(hMenu, MAXINT, MF_BYPOSITION | MF_STRING |  
					(nCount === 0 ? MF_GRAYED : MF_ENABLED), 2, await GetText("Empty Recycle Bin"));  
				const x = await ev.screenX * ui_.Zoom;  
				const y = await ev.screenY * ui_.Zoom;  
				const nVerb = await api.TrackPopupMenuEx(hMenu, TPM_RETURNCMD, x, y, ui_.hwnd, null);  
				if (nVerb == 1) {  
					Navigate(ssfBITBUCKET, SBSP_NEWBROWSER);  
				} else if (nVerb == 2) {  
					api.SHEmptyRecycleBin(ui_.hwnd, null, NoConfirm ? 1 | 2 : 0);  
					rb.DelayedRefresh();  
				}  
			} finally {  
				api.DestroyMenu(hMenu);  
			}  
		}		
	};  
  
	AddEvent("Layout", async function () {  
		const item = await GetAddonElement(Addon_Id);  
		const rb = Addons.RecycleBin;  
		rb.h = GetIconSize(item.getAttribute("IconSize"));  
		rb.sIcon = item.getAttribute("Icon");  
  
		const nCount = await rb.Count();  
		rb.lastCount = nCount; // estat inicial: Refresh no tocarà el DOM si no canvia  
  
		await SetAddon(Addon_Id, Default, [  
			'<span class="button" onclick="Navigate(ssfBITBUCKET, SBSP_NEWBROWSER)" ',  
			'oncontextmenu="Addons.RecycleBin.Popup(event); return false;" ',  
			'onmouseover="MouseOver(this)" onmouseout="MouseOut()">',  
			await GetImgTag({  
				id: "recyclebin_img",  
				title: "Recycle Bin" + (ShowCount && nCount >= 0 ? " (" + nCount + ")" : ""),  
				src: rb.sIcon || "icon:C:\\Windows\\System32\\imageres.dll," + (nCount > 0 ? "49" : "50"),  
				alt: "Recycle Bin"  
			}, rb.h),  
			'</span>'  
		].join(""), "middle");  
  
		// Polling: la notificació del shell no arriba de manera fiable a la paperera.  
		// Protegit per si Layout es dispara més d'una vegada.  
		if (!rb.tidPoll) {  
			rb.tidPoll = setInterval(function () { Addons.RecycleBin.Refresh(); }, 5000);  
		}  
	});  
  
	// Refresc instantani quan ChangeNotify sí que arriba (no hi fa mal)  
	AddEvent("ChangeNotify", function () {  
		Addons.RecycleBin.DelayedRefresh();  
	});  
  
	AddEvent("Navigate", function () {  
		Addons.RecycleBin.DelayedRefresh();  
	});  
} else {  
	// Context del diàleg d'opcions  
	AddonName = "RecycleBin";  
	await SetTabContents(0, "General", await ReadTextFile("addons\\" + Addon_Id + "\\options.html"));  
  
	const o = document.getElementById("RBLocation");  
	if (o) {  
		const Locations = [  
			"ToolBar1Left", "ToolBar1Center", "ToolBar1Right",  
			"ToolBar2Left", "ToolBar2Center", "ToolBar2Right",  
			"ToolBar3Left", "ToolBar3Center", "ToolBar3Right",  
			"ToolBar4Left", "ToolBar4Center", "ToolBar4Right",  
			"ToolBar5Left", "ToolBar5Center", "ToolBar5Right",  
			"BottomBar1Left", "BottomBar1Center", "BottomBar1Right",  
			"BottomBar2Left", "BottomBar2Center", "BottomBar2Right",  
			"None"  
		];  
		for (const s of Locations) {  
			const opt = document.createElement("option");  
			opt.value = opt.text = s;  
			o.appendChild(opt);  
		}  
		o.value = item.getAttribute("Location") || Default;  
	}  
}