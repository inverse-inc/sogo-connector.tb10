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

// 	dump("getting dir: " + uri + "\n");
	if (uri && uri.length > 0) {
		var uriParts = uri.split("/");
		var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService);
		var parentDir = rdf.GetResource("moz-abdirectory://")
			.QueryInterface(Components.interfaces.nsIAbDirectory);
		var currentURI = uriParts[0] + "/";
		var currentDirectory = parentDir;
		for (var i = 2; currentDirectory && i < uriParts.length; i++) {
			currentURI += "/" + uriParts[i];
// 			dump("currentURI:  " + currentURI + "\n");
			currentDirectory = _SCGetChildDirectoryFromURI(currentDirectory,
																										 currentURI);
		}
		directory = currentDirectory;
	}
	else {
		dump("wrong uri: " + uri + "\n");
		if (uri)
			dump("possible ab is: " + uri.Value + "\n");
		
		dump("backtrace: " + backtrace() + "\n");
		directory = null;
	}

// 	if (directory)
// 		dump("dir found!\n");

	return directory;
}

function _SCGetChildDirectoryFromURI(parentDir, uri) {
	var directory = null;

	var nodes = parentDir.childNodes;
	while (!directory && nodes.hasMoreElements()) {
		var currentChild = nodes.getNext()
			.QueryInterface(Components.interfaces.nsIRDFResource);
		if (currentChild.Value == uri)
			directory = currentChild.QueryInterface(Components.interfaces.nsIAbDirectory);
	}

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
	groupdavPrefService.setURL(url);

	return SCGetDirectoryFromURI("moz-abmdbdirectory://" + properties.fileName);
}

function SCDeleteDirectoryWithURI(uri) {
	var directory = SCGetDirectoryFromURI(uri);
	if (directory)
		SCDeleteDirectory(directory);
}

function SCDeleteDirectory(directory) {
	directory = directory.QueryInterface(Components.interfaces.nsIAbDirectory);
	var prefBranch = directory.dirPrefId;

	_SCDeleteAddressBook(directory);
	var prefService = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	prefService.deleteBranch(prefBranch + ".position");

	var rdfDirectory
		= directory.QueryInterface(Components.interfaces.nsIRDFResource);
	var clearPrefsRequired
		= (prefService.getCharPref("mail.collect_addressbook") == rdfDirectory.Value
			 && (prefService.getBoolPref("mail.collect_email_address_outgoing")
					 || prefService.getBoolPref("mail.collect_email_address_incoming")
					 || prefService.getBoolPref("mail.collect_email_address_newsgroup")));

	if (clearPrefsRequired) {
		prefService.setBoolPref("mail.collect_email_address_outgoing", false);
		prefService.setBoolPref("mail.collect_email_address_incoming", false);
		prefService.setBoolPref("mail.collect_email_address_newsgroup", false);
		prefService.setCharPref("mail.collect_addressbook",	"moz-abmdbdirectory://abook.mab");
	}
}

function _SCDeleteAddressBook(directory) {
	var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
		.getService(Components.interfaces.nsIRDFService);
	var parentDir = rdf.GetResource("moz-abdirectory://")
		.QueryInterface(Components.interfaces.nsIAbDirectory);

// 	dump("dir: " + directory + "\n");
// 	dump("dir.dirName: " + directory.dirName + "\n");
// 	dump("backtrace: " + backtrace() + "\n");
	parentDir.deleteDirectory(directory);
// 	var ab = Components.classes["@mozilla.org/addressbook;1"]
// 		.createInstance(Components.interfaces.nsIAddressBook);

// 	var parentArray = Components.classes["@mozilla.org/supports-array;1"]
// 		.createInstance(Components.interfaces.nsISupportsArray);
// 	parentArray.AppendElement(parentDir);
// 	var abArray = Components.classes["@mozilla.org/supports-array;1"]
// 		.createInstance(Components.interfaces.nsISupportsArray);
// 	parentArray.AppendElement(directory);

// 	dump("deleteaddressbook...\n");
// 	var ds = Components
// 		.classes["@mozilla.org/rdf/datasource;1?name=addressdirectory"]
// 		.getService(Components.interfaces.nsIRDFDataSource);
// 	ab.deleteAddressBooks(ds, parentArray, abArray);
// 	dump("delete done\n");
}

function SCDeleteDirectories(directories) {
	for (var i = 0; i < directories.length; i++)
		SCDeleteDirectory(directories[i]);
}

function SCDeleteDAVDirectory(uri) {
	var result = false;

	if (isGroupdavDirectory(uri) || isCardDavDirectory(uri)) {
		var directory = SCGetDirectoryFromURI(uri);
		if (directory) {
			try {
				SCDeleteDirectory(directory);
				var prefBranch = directory.dirPrefId;
				var prefService = Components.classes["@mozilla.org/preferences-service;1"]
					.getService(Components.interfaces.nsIPrefBranch);
				/* groupdav = moz-abmdbdirectory, carddav = moz-abdavdirectory */
				if (uri.indexOf("moz-abmdbdirectory://") == 0)
					prefService.deleteBranch("extensions.ca.inverse.addressbook.groupdav."
																	 + prefBranch);

				result = true;
			}
			catch(e) {};
		}
	}
	else
		throw("attempting to delete a non-DAV directory: " + uri);

	return result;
}

function SCGetChildCards(directory) {
	var childCards = [];

	var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
		.getService(Components.interfaces.nsIRDFService);
	var ds = Components.classes["@mozilla.org/rdf/datasource;1?name=addressdirectory"]
		.getService(Components.interfaces.nsIRDFDataSource);
	var childSrc = rdf.GetResource("http://home.netscape.com/NC-rdf#CardChild");
	var cards = ds.GetTargets(directory, childSrc, false);
	while (cards.hasMoreElements()) {
		var card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
		if (!card.isMailList)
			childCards.push(card);
	}

	dump("got " + childCards.length + " cards\n");

	return childCards;
}

function SCCopyAddressBook(sourceAB, destAB) {
	destAB = destAB.QueryInterface(Components.interfaces.nsIAbDirectory);
	var childCards = SCGetChildCards(sourceAB);
	for (var i = 0; i < childCards.length; i++)
		destAB.addCard(childCards[i]);

	var nodes = sourceAB.childNodes;
	while (nodes.hasMoreElements()) {
		var currentList = nodes.getNext()
			.QueryInterface(Components.interfaces.nsIAbDirectory);
		var newList = Components.classes["@mozilla.org/addressbook/directoryproperty;1"]
			.createInstance(Components.interfaces.nsIAbDirectory);
		newList.dirName = currentList.dirName;
		newList.listNickName = currentList.listNickName;
		newList.description = currentList.description;

		var childCards = SCGetChildCards(currentList);
		for (var i = 0; i < childCards.length; i++)
			newList.addressLists.AppendElement(childCards[i]);
		destAB.addMailList(newList);
	}
}
