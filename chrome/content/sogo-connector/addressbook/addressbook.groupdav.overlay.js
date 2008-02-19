/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
/*********************************************************************************
Copyright:	Inverse groupe conseil, 2006-2007
Author: 		Robert Bolduc
Email:		support@inverse.ca
URL:			http://inverse.ca

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
		if (node
				&& (isGroupdavDirectory(gSelectedDir)
						|| isCardDavDirectory(gSelectedDir)))
			node.setAttribute('disabled', 'true');
		else
			node.removeAttribute('disabled');
	}
	catch (e) {}//Do nothing, exceptions happen before the addressbook is actully loaded
}

function goUpdateGlobalEditMenuItemsOverlay(){
	try {
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
function SetupAbCommandUpdateHandlers(){
	var ctlOvl = new dirPaneControllerOverlay();

	// dir pane
	if (dirTree) {
		dirTree.controllers.appendController(ctlOvl);
		dirTree.controllers.appendController(DirPaneController);
	}
	// results pane
	if (gAbResultsTree) {
		gAbResultsTree.controllers.appendController(ResultsPaneController);
		gAbResultsTree.controllers.appendController(ctlOvl);
	}
}

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

 onDrop: function(row, orientation){
		var dragSession = dragService.getCurrentSession();
		if (!dragSession)
			return;

		var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
		trans.addDataFlavor("moz/abcard");
		var targetResource = dirTree.builderView.getResourceAtIndex(row);
		var targetURI = targetResource.Value;

		if (isGroupdavDirectory(targetURI)) {
			//		var date = new Date();
			//		var curDate = null;

			//		do { curDate = new Date(); }while(curDate-date < 2000);
			SynchronizeGroupdavAddressbookDrop(targetURI);
		}
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
var OnLoadDirTreeOriginal = OnLoadDirTree;

var gTreeObserver = new abGroupDavDirTreeObserver();
var OnLoadDirTree = function() {
	var treeBuilder = dirTree.builder.QueryInterface(Components.interfaces.nsIXULTreeBuilder);
	OnLoadDirTreeOriginal.apply();
	treeBuilder.addObserver(gTreeObserver);	
};

function abGroupdavUnload() {
	var treeBuilder = dirTree.builder.QueryInterface(Components.interfaces.nsIXULTreeBuilder);
	treeBuilder.removeObserver(gTreeObserver);
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
		this.AbEditSelectedDirectoryOriginal.apply();
}

var deleteListener = {
 onDAVQueryComplete: function(code, result, data) {
		if (code > 199 && code < 400) {
			var directory = SCGetDirectoryFromURI(data.dirURI);

			var cards = Components.classes["@mozilla.org/supports-array;1"]
			.createInstance(Components.interfaces.nsISupportsArray);
			cards.AppendElement(data.card);
			directory.deleteCards(cards);
		}
	}
};

function SCAbDelete() {
	var cards = GetSelectedAbCards();
	if (cards && cards.length > 0) {
		if (isGroupdavDirectory(gSelectedDir)) {
			for (var i = 0; i < cards.length; i++) {
				if (cards[i] instanceof Components.interfaces.nsIAbMDBCard) {
					var card = cards[i].QueryInterface(Components.interfaces.nsIAbMDBCard);
					if (card) {
						var key = card.getStringAttribute("groupDavKey");
						if (key) {
							var groupdavPrefService = new GroupdavPreferenceService(GetDirectoryFromURI(gSelectedDir)
														.dirPrefId);
							var url = groupdavPrefService.getURL();
							var href =  url + key;
							var deleteOp = new sogoWebDAV(href, deleteListener,
																						{ dirURI: gSelectedDir, card: card });
							deleteOp.delete();
							logDebug("webdav_delete sent for vcard: " + href);
						}
					}
				}
			}
		}
		this.AbDeleteOriginal.apply();
	}
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
		else
			this.AbDeleteDirectoryOriginal.apply();
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

function onLoadDAV() {
	this.addEventListener("unload", abGroupdavUnload, true);

	this.AbEditSelectedDirectoryOriginal = this.AbEditSelectedDirectory;
	this.AbEditSelectedDirectory = this.SCAbEditSelectedDirectory;

	this.AbDeleteOriginal = this.AbDelete;
	this.AbDelete = this.SCAbDelete;

	this.AbDeleteDirectoryOriginal = this.AbDeleteDirectory;
	this.AbDeleteDirectory = this.SCAbDeleteDirectory;
}

window.addEventListener("load", onLoadDAV, false);
