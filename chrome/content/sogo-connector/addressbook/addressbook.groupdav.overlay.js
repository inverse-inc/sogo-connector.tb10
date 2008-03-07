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
	window.openDialog("chrome://sogo-connector/content/addressbook/preferences.addressbook.groupdav.xul",  "",
										"chrome,modal=yes,resizable=no,centerscreen", null);
}

function openGroupdavPreferences(abUri) {
	window.openDialog("chrome://sogo-connector/content/addressbook/preferences.addressbook.groupdav.xul",  "",
										"chrome,modal=yes,resizable=no,centerscreen", abUri);
}

/********************************************************************************************
 *
 *  Override of the  UI functionalities
 *
 ********************************************************************************************/
function disableNewList(){
	try {
		var node = document.getElementById("button-newlist");
		if (isCardDavDirectory(gSelectedDir))
			node.setAttribute('disabled', 'true');
		else
			node.removeAttribute('disabled');
	}
	catch (e) {}//Do nothing, exceptions happen before the addressbook is actully loaded
}

function goUpdateGlobalEditMenuItemsOverlay() {
	try {
// 		dump("connector\n");
		gSelectedDir = GetSelectedDirectory();
		goUpdateCommand("cmd_synchGroupdav");
		goUpdateGlobalEditMenuItems();
		disableNewList();
	}
	catch (e) {
		//		exceptionHandler(window,"Error",e);
	}
}

function CommandUpdate_AddressBookGroupdavOverlay(){
	try {
// 		dump("connector\n");
		gSelectedDir = GetSelectedDirectory();
		goUpdateCommand('cmd_synchGroupdav');
		CommandUpdate_AddressBook();
 		disableNewList();
	}
	catch (e) {
		//		exceptionHandler(window,"Error",e);
	}
}

function goUpdateSelectEditMenuItemsGroupdavOverlay(){
	try {
		gSelectedDir = GetSelectedDirectory();
		goUpdateCommand('cmd_synchGroupdav');
		goUpdateSelectEditMenuItems();
 		disableNewList();
	}
	catch (e) {
		//		exceptionHandler(window,"Error",e);
	}
}

//Overidde DirPaneDoubleClick function in chrome://messenger/content/addressbook/abCommon.js
//I am not happy to rewrite DirPaneDoubleClick but enough is enough!
// var DirPaneDoubleClick = function(event) {
// 	dump("dblclick\n");
// 	// we only care about left button events
// 	if (event.button != 0)
// 		return;

// 	var row = dirTree.treeBoxObject.getRowAt(event.clientX, event.clientY);
// 	if (row == -1 || row > dirTree.view.rowCount-1) {
// 		// double clicking on a non valid row should not open the dir properties dialog
// 		return;
// 	}
// 	if (dirTree
// 			&& dirTree.view.selection
// 			&& dirTree.view.selection.count == 1)
// 		AbEditSelectedDirectory();
// };

// Additionnal Controller object for Dir Pane
function dirPaneControllerOverlay() {
}

dirPaneControllerOverlay.prototype = {
 supportsCommand: function(command) {
		switch (command) {
		case "cmd_synchGroupdav":
		return true;
		default:
		return false;
		}
	},

 isCommandEnabled: function(command) {
		var result = false;

		try {
			result = (command == "cmd_synchGroupdav"
								&& gSelectedDir
								&& gSelectedDir != ""
								&& isGroupdavDirectory(gSelectedDir)
								&& !gSynchIsRunning);
		}
		catch (e) {
			exceptionHandler(window,"Exception",e);
		}

// 		dump("command is enabled: " + command + ": " + result + "\n");
		return result;
	},

 doCommand: function(command){
		switch (command){
		case "cmd_synchGroupdav":
		SynchronizeGroupdavAddressbook(null);
		break;
		}

	},

 onEvent: function(event) {}
};

//Overidde SetupAbCommandUpdateHandlers function in chrome://messenger/content/addressbook/abCommon.js
//I am not happy to rewrite SetupAbCommandUpdateHandlers but enough is enough!
// function SetupAbCommandUpdateHandlers() {
// 	var ctlOvl = new dirPaneControllerOverlay();

// 	// dir pane
// 	if (dirTree) {
// 		dirTree.controllers.appendController(ctlOvl);
// // 		dirTree.controllers.appendController(DirPaneController);
// 	}
// 	// results pane
// 	if (gAbResultsTree) {
// // 		gAbResultsTree.controllers.appendController(ResultsPaneController);
// 		gAbResultsTree.controllers.appendController(ctlOvl);
// 	}
// }

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

			var sourceURI = GetSelectedDirectory();
			if (isGroupdavDirectory(sourceURI)
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
						DeleteGroupDAVCards(sourceURI, cards, false);
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

var cardDeleteListener = {
 onDAVQueryComplete: function(code, result, data) {
		if (code > 199 && code < 400) {
			var directory = SCGetDirectoryFromURI(data.dirURI);

			var cards = Components.classes["@mozilla.org/supports-array;1"]
			.createInstance(Components.interfaces.nsISupportsArray);
			cards.AppendElement(data.component);
			directory.deleteCards(cards);
		}
	}
};

var listDeleteListener = {
 onDAVQueryComplete: function(code, result, data) {
		if (code > 199 && code < 400) {
			var directory = SCGetDirectoryFromURI(data.dirURI);
			directory.deleteDirectory(data.component);
		}
	}
};

function DeleteGroupDAVList(prefService, parentDirURI, list) {
	var attributes = new GroupDAVListAttributes(list);
	_deleteGroupDAVComponentWithKey(prefService, parentDirURI,
																	attributes.key, listDeleteListener, list);
}

function DeleteGroupDAVCard(prefService, parentDirURI, card) {
	var mdbCard = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
	_deleteGroupDAVComponentWithKey(prefService,
																	parentDirURI,
																	mdbCard.getStringAttribute("groupDavKey"),
																	cardDeleteListener, card);
}

function _deleteGroupDAVComponentWithKey(prefService, parentDirURI, key,
																				 listener, component) {
	dump("deleting key: " + key + "\n");
	if (key && key.length) {
		var href = prefService.getURL() + key;
		var deleteOp;
		if (listener)
			deleteOp = new sogoWebDAV(href, listener,
																{dirURI: parentDirURI,
																 component: component});
		else
			deleteOp = new sogoWebDAV(href);
		deleteOp.delete();
		// 				dump("webdav_delete on '" + href + "'\n");
	}
}

function DeleteGroupDAVCards(directoryURI, cards, deleteLocally) {
	dump("deleting " + cards.length + "\n");
	var dirPrefID = GetDirectoryFromURI(directoryURI).dirPrefId;
	var prefService = new GroupdavPreferenceService(dirPrefID);
	for (var i = 0; i < cards.length; i++) {
		var card = cards[i].QueryInterface(Components.interfaces.nsIAbCard);
		var key = "";
		if (card.isMailList) {
			var list = SCGetDirectoryFromURI(card.mailListURI);
			DeleteGroupDAVList(prefService, directoryURI, list);
		}
		else
			DeleteGroupDAVCard(prefService, directoryURI, card);
	}
	dump("done deleting\n");
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
			DeleteGroupDAVCards(gSelectedDir, cards, true);
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
		var prefService;
		if (isGroupdavDirectory(selectedDir)
				|| isCardDavDirectory(selectedDir))
			result = (SCAbConfirmDeleteDirectory(selectedDir)
								&& SCDeleteDAVDirectory(selectedDir));
		else {
			var directory = SCGetDirectoryFromURI(selectedDir);
			if (directory.isMailList) {
				var uriParts = selectedDir.split("/");
				var parentDirURI = uriParts[0] + "//" + uriParts[2];
				if (isGroupdavDirectory(parentDirURI)) {
					if (SCAbConfirmDelete(kSingleListOnly)) {
						var parentDir = SCGetDirectoryFromURI(parentDirURI);
						var prefService = new GroupdavPreferenceService(parentDir.dirPrefId);
						DeleteGroupDAVList(prefService, parentDirURI,
															 directory);
					}
				}
				else
					this.SCAbDeleteDirectoryOriginal();
			}
			else
				this.SCAbDeleteDirectoryOriginal();
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
