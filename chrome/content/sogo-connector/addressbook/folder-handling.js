/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

function jsInclude(files, target) {
	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		.getService(Components.interfaces.mozIJSSubScriptLoader);
	for (var i = 0; i < files.length; i++) {
		try {
			loader.loadSubScript(files[i], target);
		}
		catch(e) {
			dump("folder-handling.js: failed to include '" + files[i] +
					 "'\n" + e);
			if (e.fileName)
				dump ("\nFile: " + e.fileName
							+ "\nLine: " + e.lineNumber
							+ "\n\n Stack:\n\n" + e.stack);
		}
	}
}

jsInclude(["chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js"]);

/* We MUST enumerate the directories to find the current directory.
	 Otherwise, if we use the GetResource method, the top directory will not
	 recognize the CardDAV entries with the hasDirectory method. */
function SCGetDirectoryFromURI(uri) {
	var directory = null;

	if (uri && uri.length > 0) {
		var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService);
		var parentDir = rdf.GetResource("moz-abdirectory://")
			.QueryInterface(Components.interfaces.nsIAbDirectory);
		var nodes = parentDir.childNodes;
		while (!directory && nodes.hasMoreElements()) {
			var currentChild = nodes.getNext()
				.QueryInterface(Components.interfaces.nsIRDFResource);
			if (currentChild.Value == uri)
				directory = currentChild.QueryInterface(Components.interfaces.nsIAbDirectory);
		}
	}
	else
		directory = null;

	return directory;
}

function SCCreateCardDAVDirectory(description, url) {
	var properties = Components.classes["@mozilla.org/addressbook/properties;1"]
		.createInstance(Components.interfaces.nsIAbDirectoryProperties);
	properties.dirType = 0;
	properties.description = description;
	properties.URI = "carddav://" + url;
	properties.maxHits = 10; // TODO

	var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
		.getService(Components.interfaces.nsIRDFService);
	var parentDir = rdf.GetResource("moz-abdirectory://")
		.QueryInterface(Components.interfaces.nsIAbDirectory);
	parentDir.createNewDirectory(properties);

	return SCGetDirectoryFromURI("moz-abdavdirectory://" + properties.prefName);
}

function SCCreateGroupDAVDirectory(description, url) {
	var properties = Components.classes["@mozilla.org/addressbook/properties;1"]
		.createInstance(Components.interfaces.nsIAbDirectoryProperties);
	properties.dirType = 2;
	properties.description = description;

	var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
		.getService(Components.interfaces.nsIRDFService);
	var parentDir = rdf.GetResource("moz-abdirectory://")
		.QueryInterface(Components.interfaces.nsIAbDirectory);
	parentDir.createNewDirectory(properties);

	var groupdavPrefService = new GroupdavPreferenceService(properties.prefName);
	groupdavPrefService.setDirectoryName(description);
	groupdavPrefService.setURL(url);
	groupdavPrefService.setDisplayDialog(false);
	groupdavPrefService.setReadOnly(false);

	return SCGetDirectoryFromURI("moz-abmdbdirectory://" + properties.fileName);
}

function SCDeleteDAVDirectory(uri) {
	var result = false;

	var directory = SCGetDirectoryFromURI(uri);
	if (directory) {
		try {
			var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
				.getService(Components.interfaces.nsIRDFService);
			var parentDir = rdf.GetResource("moz-abdirectory://")
				.QueryInterface(Components.interfaces.nsIAbDirectory);
			parentDir.deleteDirectory(directory);

			var prefBranch = directory.dirPrefId;
			var prefService = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefBranch);
			/* groupdav = moz-abmdbdirectory, carddav = moz-abdavdirectory */
			if (uri.indexOf("moz-abmdbdirectory://") == 0) {
				prefService.deleteBranch("extensions.ca.inverse.addressbook.groupdav."
																 + prefBranch);
			}
			prefService.deleteBranch(prefBranch + ".position");

			var clearPrefsRequired
				= (prefService.getCharPref("mail.collect_addressbook") == uri
						&& (prefService.getBoolPref("mail.collect_email_address_outgoing")
								|| prefService.getBoolPref("mail.collect_email_address_incoming")
								|| prefService.getBoolPref("mail.collect_email_address_newsgroup")));

			if (clearPrefsRequired) {
				prefService.setBoolPref("mail.collect_email_address_outgoing", false);
				prefService.setBoolPref("mail.collect_email_address_incoming", false);
				prefService.setBoolPref("mail.collect_email_address_newsgroup", false);
				prefService.setCharPref("mail.collect_addressbook", kPersonalAddressbookURI);
			}

			result = true;
		}
		catch(e) {};
	}

	return result;
}
