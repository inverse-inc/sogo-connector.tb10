/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

function jsInclude(files, target) {
	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		.getService(Components.interfaces.mozIJSSubScriptLoader);
	for (var i = 0; i < files.length; i++) {
		try {
			loader.loadSubScript(files[i], target);
		}
		catch(e) {
			dump("messenger.groupdav.overlay.js: failed to include '" + files[i] +
					 "'\n" + e
					 + "\nFile: " + e.fileName
					 + "\nLine: " + e.lineNumber + "\n\n Stack:\n\n" + e.stack);
		}
	}
}

jsInclude(["chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js"]);

var oldEditDirectory = editDirectory;

function selectedDirectoryURI() {
	var prefService = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	var prefKey = gCurrentDirectoryServerId + ".uri";
	var abURI = "";
	try {
		abURI = prefService.getCharPref(prefKey);
	}
	catch(e) {};

	return abURI;
}

function editDirectory() {
	var abURI = selectedDirectoryURI();

	if (isGroupdavDirectory(abURI)) {
		window.openDialog("chrome://sogo-connector/content/addressbook/preferences.addressbook.groupdav.xul",
											"", "chrome,modal=yes,resizable=no,centerscreen", abURI,
											true);
		if (gUpdate) {
			var directoriesList = document.getElementById("directoriesList"); 
			var selectedNode = directoriesList.selectedItems[0]; 
			selectedNode.setAttribute('label', gNewServer); 
			selectedNode.setAttribute('string', gNewServerString);
			window.opener.gRefresh = true; 
		}
	}
	else {
		oldEditDirectory();
	}
}

