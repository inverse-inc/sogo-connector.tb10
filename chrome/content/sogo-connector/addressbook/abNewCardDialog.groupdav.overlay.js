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

jsInclude(["chrome://sogo-connector/content/addressbook/cardedit-overlay-common.js"]);

function OnLoadHandler() {
	this.OldNewCardOKButton = this.NewCardOKButton;
	this.NewCardOKButton = this.SCNewCardOKButton;
};

function SCNewCardOKButton() {
	var result = this.OldNewCardOKButton();
	if (result) {
		setDocumentDirty(true);
		saveCard(true);
	}

	return result;
}

window.addEventListener("load", OnLoadHandler, false);
