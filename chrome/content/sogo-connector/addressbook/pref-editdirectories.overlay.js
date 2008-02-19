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

function SCEditDirectory() {
	var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
	var abURI = "moz-abdavdirectory://" + gCurrentDirectoryServerId;
	var ab = rdf.GetResource(abURI).QueryInterface(Components.interfaces.nsIAbDirectory);

	if (ab.directoryProperties.URI.indexOf("carddav://") == 0) {
		window.openDialog("chrome://sogo-connector/content/addressbook/preferences.addressbook.groupdav.xul",
											"", "chrome,modal=yes,resizable=no,centerscreen", abURI);
		if (gUpdate) {
			var directoriesList = document.getElementById("directoriesList");
			var selectedNode = directoriesList.selectedItems[0]; 
			selectedNode.setAttribute('label', gNewServer); 
			selectedNode.setAttribute('string', gNewServerString);
			window.opener.gRefresh = true; 
		}
	}
	else {
		this.oldEditDirectory();
	}
}

function onSCLoad() {
	this.oldEditDirectory = this.editDirectory;
	this.editDirectory = this.SCEditDirectory;
}

window.addEventListener("load", onSCLoad, false);
