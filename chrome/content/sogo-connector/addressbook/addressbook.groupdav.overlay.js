/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
/*********************************************************************************
Copyright:	Inverse groupe conseil, 2006-2008
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
		dump("doCommand: " + command + "\n");
		switch (command){
		case "cmd_syncGroupdav":
		SynchronizeGroupdavAddressbook(null);
		break;
		}

	},

 onEvent: function(event) {}
};

//Override of AbDelete in chrome://messenger/content/addressbook/abCommon.js
// Addition to delete the card on the groupdav server 
// Definitions are done in onloadDAV since on Windows it was loaded before the abCommon.js version
// DirTreeObserver that synchronized with the GroupDAV server on card delete
function abGroupDavDirTreeObserver() {
}

abGroupDavDirTreeObserver.prototype = { 
 canDrop: function(index, orientation) {
		return abDirTreeObserver.canDrop(index, orientation);
	},

 onDrop: function(row, orientation) {
		var dragSession = dragService.getCurrentSession();
		if (dragSession) {
			var trans = Components.classes["@mozilla.org/widget/transferable;1"]
				.createInstance(Components.interfaces.nsITransferable);
			trans.addDataFlavor("moz/abcard");
			var targetResource = dirTree.builderView.getResourceAtIndex(row);
			var targetURI = targetResource.Value;

			if (isGroupdavDirectory(targetURI)) {
			//		var date = new Date();
			//		var curDate = null;

			//		do { curDate = new Date(); }while(curDate-date < 2000);
				SynchronizeGroupdavAddressbookDrop(targetURI);
			}

			var sourceDirectory = gAbView.directory;
			var sourceURI = sourceDirectory
				.QueryInterface(Components.interfaces.nsIRDFResource)
				.Value;
			if (targetURI.indexOf(sourceURI) != 0
					&& isGroupdavDirectory(sourceURI)
					&& dragSession.dragAction
					== Components.interfaces.nsIDragService.DRAGDROP_ACTION_MOVE) {
				for (var i = 0; i < dragSession.numDropItems; ++i) {
					dragSession.getData(trans, i);
					var dataObj = new Object();
					var bestFlavor = new Object();
					var len = new Object();
					try	{
						trans.getAnyTransferData(bestFlavor, dataObj, len);
						dataObj = dataObj.value
							.QueryInterface(Components.interfaces.nsISupportsString);
						var transData = dataObj.data.split("\n");
						var rows = transData[0].split(",");
						var cards = this._getDroppedCardsOriginalsWithRows(rows);
						DeleteGroupDAVCards(sourceDirectory, cards, false);
					}
					catch (ex) {}
				}
			}
		}
	},

 _getDroppedCardsOriginalsWithRows: function(rows) {
    var abView = GetAbView();
		var cards = [];
		for (var j = 0; j < rows.length; j++) {
			var card = abView.getCardFromRow(rows[j]); 
			if (card)
				cards.push(card);
		}

		return cards;
	},

 onToggleOpenState: function() {
	},

 onCycleHeader: function(colID, elt) {
	},

 onCycleCell: function(row, colID) {
	},

 onSelectionChanged: function() {
		dump("selection changed\n");
	},

 onPerformAction: function(action) {
	},

 onPerformActionOnRow: function(action, row) {
	},

 onPerformActionOnCell: function(action, row, colID) {
	}
};

//Override of OnLoadDirTree in chrome://messenger/content/addressbook/addresbook..js
// Addition to upload the card on the groupdav server
//
// Based on the code in nsXULTreeBuilder.cpp:  Observers will be called in the order that they were added,
// which makes it posssible to call synchronize after abDirTreeObserver.onDrop is called
var SCTreeObserver = new abGroupDavDirTreeObserver();

function SCOnLoadDirTree() {
	var treeBuilder = dirTree.builder
	.QueryInterface(Components.interfaces.nsIXULTreeBuilder);
	treeBuilder.addObserver(SCTreeObserver);
	this.SCOnLoadDirTreeOriginal();
}

function abGroupdavUnload() {
	var treeBuilder = dirTree.builder
		.QueryInterface(Components.interfaces.nsIXULTreeBuilder);
	treeBuilder.removeObserver(SCTreeObserver);
}

// Override AbDeleteDirectory() to delete DAV preferences
//Overidde AbEditSelectedDirectory function in chrome://messenger/content/addressbook/abCommon.js
function SCAbEditSelectedDirectory() {
	var abUri = GetSelectedDirectory();
	dump("editselected\n");
	dump("abUri: " + abUri + "\n");
	dump("gSelectedDir: " + gSelectedDir + "\n");

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
		if (!(code > 199 && code < 400
					|| code > 599))
			this.mErrors++;
				
		return (this.mCount == 0);
	},
 finish: function() {
		if (this.mErrors)
			SCOpenDeleteFailureDialog(this.mDirectory);
		this.mDirectory = null;
	}
}

var cardDeleteListener = {
 onDAVQueryComplete: function(code, result, data) {
		if ((code > 199 && code < 400)
				|| code == 404
				|| code == 604) {
			var cards = Components.classes["@mozilla.org/supports-array;1"]
			.createInstance(Components.interfaces.nsISupportsArray);
			cards.AppendElement(data.component);
			data.directory.deleteCards(cards);
		}
		if (deleteManager.decrement())
			deleteManager.finish();
	}
};

var listDeleteListener = {
 onDAVQueryComplete: function(code, result, data) {
		if ((code > 199 && code < 400)
				|| code == 404
				|| code == 604) {
			data.directory.deleteDirectory(data.component);
			var attributes = new GroupDAVListAttributes(data.component);
			attributes.deleteRecord();
		}
		if (deleteManager.decrement())
			deleteManager.finish();
	}
};

function DeleteGroupDAVCards(directory, cards, deleteLocally) {
	var rdfAB = directory.QueryInterface(Components.interfaces.nsIRDFResource);
	var realABURI = rdfAB.Value.split("?")[0];

	var origDirectory = SCGetDirectoryFromURI(realABURI);
	var dirPrefID = origDirectory.dirPrefId;
	var prefService = new GroupdavPreferenceService(dirPrefID);

	deleteManager.begin(directory, cards.length);
	for (var i = 0; i < cards.length; i++) {
		var card = cards[i].QueryInterface(Components.interfaces.nsIAbCard);
		var key;
		var listener;
		var component;
		if (card.isMailList) {
			var list = SCGetDirectoryFromURI(card.mailListURI);
			var attributes = new GroupDAVListAttributes(list);
			key = attributes.key;
			listener = listDeleteListener;
			component = list;
		}
		else {
			var mdbCard = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
			key = mdbCard.getStringAttribute("groupDavKey");
			listener = cardDeleteListener;
			component = card;
		}

		_deleteGroupDAVComponentWithKey(prefService, key, listener, directory,
																		component);
	}
}

function _deleteGroupDAVComponentWithKey(prefService, key, listener,
																				 directory, component) {
	if (key && key.length) {
		var href = prefService.getURL() + key;
		var deleteOp;
		if (listener)
			deleteOp = new sogoWebDAV(href, listener,
																{directory: directory,
																 component: component});
		else
			deleteOp = new sogoWebDAV(href);
		deleteOp.delete();
		// 				dump("webdav_delete on '" + href + "'\n");
	}
	else /* 604 = "not found locally" */
		listener.onDAVQueryComplete(604, null,
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
			DeleteGroupDAVCards(gAbView.directory, cards, true);
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
				_deleteGroupDAVComponentWithKey(prefService, attributes.key,
																				listDeleteListener, parentDir,
																				directory);
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
	this.setTimeout(SynchronizeGroupdavAddressbook, 100, uri, null);
}

function onLoadDAV() {
	this.addEventListener("unload", abGroupdavUnload, true);

	this.SCAbEditSelectedDirectoryOriginal = this.AbEditSelectedDirectory;
	this.AbEditSelectedDirectory = this.SCAbEditSelectedDirectory;
	this.SCAbDeleteOriginal = this.AbDelete;
	this.AbDelete = this.SCAbDelete;
	this.SCAbDeleteDirectoryOriginal = this.AbDeleteDirectory;
	this.AbDeleteDirectory = this.SCAbDeleteDirectory;

	this.SCOnLoadDirTreeOriginal = this.OnLoadDirTree;
	this.OnLoadDirTree = this.SCOnLoadDirTree;

	/* command updaters */
	this.SCCommandUpdate_AddressBookOld = this.CommandUpdate_AddressBook;
	this.CommandUpdate_AddressBook = this.SCCommandUpdate_AddressBook;
	this.SCGoUpdateGlobalEditMenuItemsOld = this.goUpdateGlobalEditMenuItems;
	this.goUpdateGlobalEditMenuItems = 	this.SCGoUpdateGlobalEditMenuItems;
	this.SCGoUpdateSelectEditMenuItemsOld = this.goUpdateSelectEditMenuItems;
	this.goUpdateSelectEditMenuItems = this.SCGoUpdateSelectEditMenuItems;

	var ctlOvl = new dirPaneControllerOverlay();
	// dir pane
	var dirTree = document.getElementById("dirTree");
	if (dirTree) {
		dirTree.controllers.appendController(ctlOvl);
// 		dirTree.controllers.appendController(DirPaneController);
	}
	// results pane
	if (gAbResultsTree) {
// 		gAbResultsTree.controllers.appendController(ResultsPaneController);
		gAbResultsTree.controllers.appendController(ctlOvl);
	}
}

window.addEventListener("load", onLoadDAV, false);
