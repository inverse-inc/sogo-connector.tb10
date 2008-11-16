/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
/*********************************************************************************
Copyright:	Inverse inc., 2006-2008
Authors: 		Robert Bolduc <rbolduc@inverse.ca>
						Wolfgang Sourdeau <wsourdeau@inverse.ca>
Email:		  support@inverse.ca
URL:			  http://inverse.ca/

This file is part of "SOGo Connector" a Thunderbird extension.

"SOGo Connector" is free software; you can redistribute it
and/or modify it under the terms of the GNU General Public License version 2
as published by the Free Software Foundation;

"SOGo Connector" is distributed in the hope that it will be
useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
Public License for more details.

You should have received a copy of the GNU General Public License along
with "SOGo Connector"; if not, write to the
Free Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
02110-1301  USA
********************************************************************************/

function jsInclude(files, target) {
	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		.getService(Components.interfaces.mozIJSSubScriptLoader);
	for (var i = 0; i < files.length; i++) {
		try {
			loader.loadSubScript(files[i], target);
		}
		catch(e) {
			dump("addressbook.groupdav.overlay.js: failed to include '" + files[i] +
					 "'\n" + e);
			if (e.fileName)
				dump ("\nFile: " + e.fileName
							+ "\nLine: " + e.lineNumber
							+ "\n\n Stack:\n\n" + e.stack);
		}
	}
}

jsInclude(["chrome://inverse-library/content/sogoWebDAV.js",
					 "chrome://sogo-connector/content/addressbook/folder-handling.js",
					 "chrome://sogo-connector/content/common/common-dav.js",
					 "chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js",
					 "chrome://sogo-connector/content/general/sync.addressbook.groupdav.js",
					 "chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js"]);

/*
 * This overlay adds GroupDAV functionalities to Addressbooks
 */

var gSynchIsRunning = false;
var gSelectedDir = "";
var gCurDirectory = null;
var gLDAPPrefsService = null;

/*****************************************************************************************
 *
 *  UI functions
 *
 *****************************************************************************************/
function AbNewGroupDavContacts(){
	window.openDialog("chrome://sogo-connector/content/addressbook/preferences.addressbook.groupdav.xul",
										"", "chrome,modal=yes,resizable=no,centerscreen", null);
}

function openGroupdavPreferences(abUri) {
	window.openDialog("chrome://sogo-connector/content/addressbook/preferences.addressbook.groupdav.xul",
										"", "chrome,modal=yes,resizable=no,centerscreen", abUri);
}

function SCOpenDeleteFailureDialog(directory) {
	window.openDialog("chrome://sogo-connector/content/addressbook/deletefailure-dialog.xul",
										"", "chrome,modal=yes,resizable=no,centerscreen",
										{directory: directory});
}

/********************************************************************************************
 *
 *  Override of the  UI functionalities
 *
 ********************************************************************************************/
function SCGoUpdateGlobalEditMenuItems() {
	try {
// 		dump("connector\n");
		gSelectedDir = GetSelectedDirectory();
		goUpdateCommand("cmd_syncGroupdav");
		this.SCGoUpdateGlobalEditMenuItemsOld();
	}
	catch (e) {
		//		exceptionHandler(window,"Error",e);
	}
}

function SCCommandUpdate_AddressBook() {
	try {
// 		dump("connector\n");
		gSelectedDir = GetSelectedDirectory();
		goUpdateCommand('cmd_syncGroupdav');
		this.SCCommandUpdate_AddressBookOld();
	}
	catch (e) {
		//		exceptionHandler(window,"Error",e);
	}
}

function SCGoUpdateSelectEditMenuItems() {
	try {
		gSelectedDir = GetSelectedDirectory();
		goUpdateCommand('cmd_syncGroupdav');
		this.SCGoUpdateSelectEditMenuItemsOld();
	}
	catch (e) {
		//		exceptionHandler(window,"Error",e);
	}
}

// Additionnal Controller object for Dir Pane
function dirPaneControllerOverlay() {
}

dirPaneControllerOverlay.prototype = {
 supportsCommand: function(command) {
		return (command == "cmd_syncGroupdav"
						|| command == "cmd_newcard"
						|| command == "cmd_newlist");
	},

 isCommandEnabled: function(command) {
		var result = false;

		if (gSelectedDir && gSelectedDir != "") {
			try {
				switch (command) {
				case "cmd_syncGroupdav":
					if (gSelectedDir)
						result = (isGroupdavDirectory(gSelectedDir)
											&& !gSynchIsRunning);
					break;
				case "cmd_newlist":
				case "cmd_newcard":
					var directory = SCGetDirectoryFromURI(gSelectedDir);
					result = (!directory.isRemote);
					break;
				}
			}
			catch (e) {
				exceptionHandler(window,"Exception",e);
			}
		}

		return result;
	},

 doCommand: function(command){
// 		dump("doCommand: " + command + "\n");
		switch (command){
		case "cmd_syncGroupdav":
		SynchronizeGroupdavAddressbook(null);
		break;
		}

	},

 onEvent: function(event) {}
};

abDirTreeObserver.SCOnDrop = function(row, or) {
	var dragSession = dragService.getCurrentSession();
	if (dragSession) {
		var abView = GetAbView();
		var sourceDirectory = abView.directory;
		var sourceURI = sourceDirectory
			.QueryInterface(Components.interfaces.nsIRDFResource)
			.Value;

		var aDirTree = document.getElementById("dirTree");
		var targetResource = aDirTree.builderView.getResourceAtIndex(row);
		var targetURI = targetResource.Value;

		var cardKeys;
		if (targetURI.indexOf(sourceURI) != 0
				&& isGroupdavDirectory(sourceURI)
				&& (dragSession.dragAction
						== Components.interfaces.nsIDragService.DRAGDROP_ACTION_MOVE))
			cardKeys = this._getDroppedCardsKeysFromSession(dragSession, abView);
		else
			cardKeys = null;

		var proceed = true;
		try {
			this.SCOnDropOld(row, or);
		}
		catch(e) {
			proceed = false;
			dump("an exception occured: " + e + "\n");
		}

		if (isGroupdavDirectory(targetURI))
			SynchronizeGroupdavAddressbookDrop(targetURI);

		if (cardKeys)
			dump("cardKeys: " + cardKeys.length + " to delete\n");
		else
			dump("cardKeys: nothing to delete\n");
		if (proceed && cardKeys) {
			var prefService = new GroupdavPreferenceService(sourceDirectory.dirPrefId);
			for (var i = 0; i < cardKeys.length; i++) {
				dump("deleting " + cardKeys[i] + "\n");
				_deleteGroupDAVComponentWithKey(prefService, cardKeys[i]);
			}
		}
		dump("done drop delete\n");
	}
};

abDirTreeObserver._getDroppedCardsKeysFromSession = function(dragSession, abView) {
	var cards = [];

	var trans = Components.classes["@mozilla.org/widget/transferable;1"]
	.createInstance(Components.interfaces.nsITransferable);
	trans.addDataFlavor("moz/abcard");

	for (var i = 0; i < dragSession.numDropItems; i++) {
		dragSession.getData(trans, i);
		var dataObj = new Object();
		var bestFlavor = new Object();
		var len = new Object();
		try	{
			trans.getAnyTransferData(bestFlavor, dataObj, len);
			dataObj = dataObj.value
				.QueryInterface(Components.interfaces.nsISupportsString);
// 			dump("drop data = /" + dataObj.data + "/\n");
			var transData = dataObj.data.split("\n");
			var rows = transData[0].split(",");

			for (var j = 0; j < rows.length; j++) {
				var card = abView.getCardFromRow(rows[j]);
				if (card)
					this._pushCardKey(card, cards);
			}

// 			dump("cards: " + cards.length + "\n");
		}
		catch (ex) {
			dump("ex: " + ex + "\n");
		}
	}

	return cards;
};

abDirTreeObserver._pushCardKey = function(card, cards) {
	var key = null;

	if (card.isMailList) {
		var list = SCGetDirectoryFromURI(card.mailListURI);
		var attributes = new GroupDAVListAttributes(list);
		key = attributes.key;
	}
	else {
		var mdbCard = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
		key = mdbCard.getStringAttribute("groupDavKey");
	}

	if (key && key.length)
		cards.push(key);
};

// Override AbDeleteDirectory() to delete DAV preferences
//Overidde AbEditSelectedDirectory function in chrome://messenger/content/addressbook/abCommon.js
function SCAbEditSelectedDirectory() {
	var abUri = GetSelectedDirectory();
// 	dump("editselected\n");
// 	dump("abUri: " + abUri + "\n");
// 	dump("gSelectedDir: " + gSelectedDir + "\n");

	var resource = Components.classes["@mozilla.org/rdf/rdf-service;1"]
	.getService(Components.interfaces.nsIRDFService).GetResource(abUri)
	.QueryInterface(Components.interfaces.nsIAbDirectory);

	if (isGroupdavDirectory(abUri)
			|| isCardDavDirectory(abUri))
		openGroupdavPreferences(abUri);
	else
		this.SCAbEditSelectedDirectoryOriginal();
}

var deleteManager = {
 mCount: 0,
 mErrors: 0,
 mDirectory: null,
 begin: function(directory, count) {
		this.mDirectory = directory;
		this.mCount = count;
		this.mErrors = 0;
	},
 decrement: function(code) {
		this.mCount--;
		if (!((code > 199 && code < 400)
					|| code == 404
					|| code > 599))
			this.mErrors++;

		return (this.mCount == 0);
	},
 finish: function() {
		if (this.mErrors != 0)
			SCOpenDeleteFailureDialog(this.mDirectory);
		this.mDirectory = null;
	},
 onDAVQueryComplete: function(code, result, headers, data) {
		if (data.deleteLocally
				&& ((code > 199 && code < 400)
						|| code == 404
						|| code == 604)) {
			if (data.component instanceof Components.interfaces.nsIAbCard) {
				GetAbView().deleteSelectedCards();
			}
			else if (data.component instanceof Components.interfaces.nsIAbDirectory) {
				var attributes = new GroupDAVListAttributes(data.component);
				attributes.deleteRecord();
				GetAbView().deleteSelectedCards();
			}
			else
				dump("component is of unknown type: " + data.component + "\n");
		}
		if (this.decrement(code))
			this.finish();
	}
};

function DeleteGroupDAVCards(directory, cards, deleteLocally) {
	var rdfAB = directory.QueryInterface(Components.interfaces.nsIRDFResource);
	var realABURI = rdfAB.Value.split("?")[0];
// 	dump("delete: " + cards.length + " cards\n");
	var origDirectory = SCGetDirectoryFromURI(realABURI);
	var prefService = new GroupdavPreferenceService(origDirectory.dirPrefId);

	deleteManager.begin(directory, cards.length);
	for (var i = 0; i < cards.length; i++) {
		var card = cards[i].QueryInterface(Components.interfaces.nsIAbCard);
		var key;
		var component;
		if (card.isMailList) {
			var list = SCGetDirectoryFromURI(card.mailListURI);
			var attributes = new GroupDAVListAttributes(list);
			key = attributes.key;
			component = list;
		}
		else {
// 			dump("card: " + card.displayName + "\n");
			try {
				var mdbCard = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
				key = mdbCard.getStringAttribute("groupDavKey");
// 			dump("key: " + key + "\n");
				component = card;
			}
			catch(e) {
				key = null;
			}
		}

		if (key && key.length)
			_deleteGroupDAVComponentWithKey(prefService, key, directory, component, deleteLocally);
	}
}

function _deleteGroupDAVComponentWithKey(prefService, key,
																				 directory, component,
																				 deleteLocally) {
 	//dump("\n\nwe delete: " + key + "\n\n\n");
	if (key && key.length) {
		var href = prefService.getURL() + key;
		var deleteOp = new sogoWebDAV(href, deleteManager,
																	{directory: directory,
																	 component: component,
																	 deleteLocally: deleteLocally});
		deleteOp.delete();
		//dump("webdav_delete on '" + href + "'\n");
	}
	else /* 604 = "not found locally" */
		deleteManager.onDAVQueryComplete(604, null, null,
																		 {directory: directory,
																				 component: component});
}

function SCAbConfirmDelete(types) {
	var confirm = false;

	if (types != kNothingSelected) {
		var promptService
			= Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService);

		confirm = true;
		if (types != kCardsOnly) {
			var confirmDeleteMessage;
			if (types == kListsAndCards)
				confirmDeleteMessage
					= gAddressBookBundle.getString("confirmDeleteListsAndCards");
			else if (types == kMultipleListsOnly)
				confirmDeleteMessage
					= gAddressBookBundle.getString("confirmDeleteMailingLists");
			else
				confirmDeleteMessage
					= gAddressBookBundle.getString("confirmDeleteMailingList");
			confirm = (promptService.confirm(window, null, confirmDeleteMessage));
		}
	}

	return confirm;
}

function SCAbDelete() {
	if (isGroupdavDirectory(gSelectedDir)) {
		var types = GetSelectedCardTypes();
		if (types != kNothingSelected && SCAbConfirmDelete(types)) {
			var cards = GetSelectedAbCards();
			var abView = GetAbView();
			DeleteGroupDAVCards(abView.directory, cards, true);
		}
	}
	else
		this.SCAbDeleteOriginal();
}

/* AbDeleteDirectory done cleanly... */
function SCAbDeleteDirectory() {
	var result = false;

	var selectedDir = GetSelectedDirectory();
	if (selectedDir) {
		if (isGroupdavDirectory(selectedDir)
				|| isCardDavDirectory(selectedDir))
			result = (SCAbConfirmDeleteDirectory(selectedDir)
								&& SCDeleteDAVDirectory(selectedDir));
		else {
			var directory = SCGetDirectoryFromURI(selectedDir);
			if (!(directory.isMailList
						&& _SCDeleteListAsDirectory(directory, selectedDir)))
				this.SCAbDeleteDirectoryOriginal();
		}
	}

	return result;
}

function _SCDeleteListAsDirectory(directory, selectedDir) {
	var result = false;

	var uriParts = selectedDir.split("/");
	var parentDirURI = uriParts[0] + "//" + uriParts[2];
	if (isGroupdavDirectory(parentDirURI)) {
		var attributes = new GroupDAVListAttributes(directory);
		if (attributes.key) {
			result = true;
			if (SCAbConfirmDelete(kSingleListOnly)) {
				var parentDir = SCGetDirectoryFromURI(parentDirURI);
				var prefService = new GroupdavPreferenceService(parentDir.dirPrefId);
				deleteManager.begin(parentDirURI, 1);
				_deleteGroupDAVComponentWithKey(prefService, attributes.key,
																				parentDir, directory, true);
			}
		}
	}

	return result;
}

function SCAbConfirmDeleteDirectory(selectedDir) {
  var confirmDeleteMessage;

	// Check if this address book is being used for collection
	if (gPrefs.getCharPref("mail.collect_addressbook") == selectedDir
			&& (gPrefs.getBoolPref("mail.collect_email_address_outgoing")
					|| gPrefs.getBoolPref("mail.collect_email_address_incoming")
					|| gPrefs.getBoolPref("mail.collect_email_address_newsgroup"))) {
		var brandShortName = document.getElementById("bundle_brand").getString("brandShortName");
		confirmDeleteMessage = gAddressBookBundle.getFormattedString("confirmDeleteCollectionAddressbook",
																																 [brandShortName]);
	}
	else
		confirmDeleteMessage = gAddressBookBundle.getString("confirmDeleteAddressbook");

  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
		.getService(Components.interfaces.nsIPromptService);

  return (promptService.confirm(window,
																gAddressBookBundle.getString("confirmDeleteAddressbookTitle"),
																confirmDeleteMessage));
}

function SCSynchronizeFromChildWindow(uri) {
	this.setTimeout(SynchronizeGroupdavAddressbook, 1, uri, null);
}

var groupdavSynchronizationObserver = {
 oldPC: -1,
 syncManager: null,

 _createProgressBar: function() {
		var progressBar = document.createElement("progressmeter");
		progressBar.setAttribute("id", "groupdavProgressMeter");
		progressBar.setAttribute("mode", "determined");
		progressBar.setAttribute("value", "0%");

		return progressBar;
	},
 ensureProgressBar: function() {
// 		dump("document: " + document + "\n");
// 		dump("window: " + window + "\n");
// 		dump("window.title: " + window.title + "\n");
// 		dump("window.document: " + window.document + "\n");
		var progressBar = this._createProgressBar();
		var panel = document.getElementById("groupdavProgressPanel");
		panel.appendChild(progressBar);
		panel.setAttribute("collapsed", false);
		
		return progressBar;
	},
 handleNotification: function(notification, data) {
		var progressBar = document.getElementById("groupdavProgressMeter");
		if (notification == "groupdav.synchronization.start") {
			if (!progressBar)
				this.ensureProgressBar();
		}
		else if (notification == "groupdav.synchronization.stop") {
			if (progressBar) {
				var panel = document.getElementById("groupdavProgressPanel");
				panel.removeChild(progressBar);
				panel.setAttribute("collapsed", true);
			}
		}
		else if (notification == "groupdav.synchronization.addressbook.updated") {
			if (!progressBar)
				progressBar = this.ensureProgressBar();
			var pc = Math.floor(this.syncManager.globalProgress() * 100);
			if (this.oldPC != pc) {
				window.setTimeout(_updateProgressBar, 200, pc);
				this.oldPC = pc;
			}
		}
	}
};

function _updateProgressBar(pc) {
	var progressBar = document.getElementById("groupdavProgressMeter");
	if (progressBar)
		progressBar.setAttribute("value", pc + "%");
}

function onLoadDAV() {
	this.SCAbEditSelectedDirectoryOriginal = this.AbEditSelectedDirectory;
	this.AbEditSelectedDirectory = this.SCAbEditSelectedDirectory;
	this.SCAbDeleteOriginal = this.AbDelete;
	this.AbDelete = this.SCAbDelete;
	this.SCAbDeleteDirectoryOriginal = this.AbDeleteDirectory;
	this.AbDeleteDirectory = this.SCAbDeleteDirectory;

	/* drag and drop */
	abDirTreeObserver.SCOnDropOld = abDirTreeObserver.onDrop;
	abDirTreeObserver.onDrop = abDirTreeObserver.SCOnDrop;

	/* command updaters */
	this.SCCommandUpdate_AddressBookOld = this.CommandUpdate_AddressBook;
	this.CommandUpdate_AddressBook = this.SCCommandUpdate_AddressBook;
	this.SCGoUpdateGlobalEditMenuItemsOld = this.goUpdateGlobalEditMenuItems;
	this.goUpdateGlobalEditMenuItems = 	this.SCGoUpdateGlobalEditMenuItems;
	this.SCGoUpdateSelectEditMenuItemsOld = this.goUpdateSelectEditMenuItems;
	this.goUpdateSelectEditMenuItems = this.SCGoUpdateSelectEditMenuItems;

	var ctlOvl = new dirPaneControllerOverlay();
	// dir pane
	var aDirTree = document.getElementById("dirTree");
	if (aDirTree) {
		aDirTree.controllers.appendController(ctlOvl);
// 		aDirTree.controllers.appendController(DirPaneController);
	}
	// results pane
	if (gAbResultsTree) {
// 		gAbResultsTree.controllers.appendController(ResultsPaneController);
		gAbResultsTree.controllers.appendController(ctlOvl);
	}

	var nmgr = Components.classes["@inverse.ca/notification-manager;1"]
		.getService(Components.interfaces.inverseIJSNotificationManager)
		.wrappedJSObject;
	var smgr = Components.classes["@inverse.ca/sync-progress-manager;1"]
		.getService(Components.interfaces.inverseIJSSyncProgressManager)
		.wrappedJSObject;
	groupdavSynchronizationObserver.syncManager = smgr;
	nmgr.registerObserver("groupdav.synchronization.start",
												groupdavSynchronizationObserver);
	nmgr.registerObserver("groupdav.synchronization.stop",
												groupdavSynchronizationObserver);
	nmgr.registerObserver("groupdav.synchronization.addressbook.updated",
												groupdavSynchronizationObserver);
}

function onUnloadDAV() {
	var nmgr = Components.classes["@inverse.ca/notification-manager;1"]
		.getService(Components.interfaces.inverseIJSNotificationManager)
		.wrappedJSObject;
	nmgr.unregisterObserver("groupdav.synchronization.start",
													groupdavSynchronizationObserver);
	nmgr.unregisterObserver("groupdav.synchronization.stop",
													groupdavSynchronizationObserver);
	nmgr.unregisterObserver("groupdav.synchronization.addressbook.updated",
													groupdavSynchronizationObserver);
}

window.addEventListener("load", onLoadDAV, false);
window.addEventListener("unload", onUnloadDAV, false);
