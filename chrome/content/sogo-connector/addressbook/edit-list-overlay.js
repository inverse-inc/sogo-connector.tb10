/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

function jsInclude(files, target) {
	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		.getService(Components.interfaces.mozIJSSubScriptLoader);
	for (var i = 0; i < files.length; i++) {
		try {
			loader.loadSubScript(files[i], target);
		}
		catch(e) {
			dump("abNewCardDialog.groupdav.overlay.js: failed to include '" + files[i] + "'\n" + e + "\n");
		}
	}
}

jsInclude(["chrome://sogo-connector/content/addressbook/folder-handling.js",
					 "chrome://sogo-connector/content/general/sync.addressbook.groupdav.js",
					 "chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js"]);

function OnLoadEditListOverlay() {
	this.SCOldMailListOKButton = this.MailListOKButton;
	this.MailListOKButton = this.SCMailListOKButton;
	this.SCOldEditListOKButton = this.EditListOKButton;
	this.EditListOKButton = this.SCEditListOKButton;

// 	if (window.arguments && window.arguments[0]) {
// 		var card = window.arguments[0].abCard;
// 		dump("card: " + card + "\n");
// 		var list = card.QueryInterface(Components.interfaces.nsIAbDirectory);
// 		dump("list: " + list + "\n");
// 	}
}

function _getLastMailingList(uri) {
	var last = null;

	var directory = SCGetDirectoryFromURI(uri);
	var nodes = directory.childNodes;
	while (nodes.hasMoreElements())
		last = nodes.getNext();

	return last;
}

function SCMailListOKButton() {
	var rc = this.SCOldMailListOKButton();
	if (rc) {
		var popup = document.getElementById('abPopup');
		var uri = popup.getAttribute('value');
		if (isGroupdavDirectory(uri))
			window.opener.SCSynchronizeFromChildWindow(uri);
	}

	return rc;
}

function SCEditListOKButton() {
	var rc = this.SCOldEditListOKButton();
	if (rc) {
		var listURI = window.arguments[0].listURI;
		var parentURI = GetParentDirectoryFromMailingListURI(listURI);

		if (isGroupdavDirectory(parentURI)) {
			var list = SCGetDirectoryFromURI(listURI);
			var attributes = new GroupDAVListAttributes(list);
			attributes.version = "-1";
 			window.opener.SCSynchronizeFromChildWindow(parentURI);
		}
	}

	return rc;
}

window.addEventListener("load", OnLoadEditListOverlay, false);
