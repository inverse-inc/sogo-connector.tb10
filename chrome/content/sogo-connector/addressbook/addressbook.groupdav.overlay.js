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

Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader).loadSubScript("chrome://sogo-connector/content/common/common-dav.js");

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

function EditGroupDavDirectory(){
	window.openDialog("chrome://sogo-connector/content/addressbook/preferences.addressbook.groupdav.xul",  "",
										"chrome,modal=yes,resizable=no,centerscreen", GetSelectedDirectory());
}

function openGroupdavPreferences(abUri){
	window.openDialog("chrome://sogo-connector/content/addressbook/preferences.addressbook.groupdav.xul",  "",
										"chrome,modal=yes,resizable=no,centerscreen", abUri);
}

/********************************************************************************************
 *
 *  Override of the  UI functionalities
 *
 ********************************************************************************************/
function disableNewList(){
	try{
		var node = document.getElementById("button-newlist");
		if ( node && isGroupdavDirectory(gSelectedDir)){
			node.setAttribute('disabled', 'true');
		}else{
			node.removeAttribute('disabled');
		}
	}catch (e) {}//Do nothing, exceptions happen before the addressbook is actully loaded
}

function goUpdateGlobalEditMenuItemsOverlay(){
	try{
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
	try{
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

//Overidde AbEditSelectedDirectory function in chrome://messenger/content/addressbook/abCommon.js
var AbEditSelectedDirectoryOriginal = AbEditSelectedDirectory;
var AbEditSelectedDirectory = function(){
	var abUri = GetSelectedDirectory();
	if(isGroupdavDirectory(abUri))
		openGroupdavPreferences(abUri);
	else
		AbEditSelectedDirectoryOriginal.apply();
};

//Overidde DirPaneDoubleClick function in chrome://messenger/content/addressbook/abCommon.js
//I am not happy to rewrite DirPaneDoubleClick but enough is enough!
var DirPaneDoubleClick = function(event){
	// we only care about left button events
	if (event.button != 0)
		return;

	var row = dirTree.treeBoxObject.getRowAt(event.clientX, event.clientY);
	if (row == -1 || row > dirTree.view.rowCount-1) {
		// double clicking on a non valid row should not open the dir properties dialog
		return;
	}
	if (dirTree && dirTree.view.selection && dirTree.view.selection.count == 1) {
		var abUri = GetSelectedDirectory();
		if(isGroupdavDirectory(abUri))
			openGroupdavPreferences(abUri);
		else
			AbEditSelectedDirectoryOriginal.apply();
	}
}

// Additionnal Controller object for Dir Pane
	var dirPaneControllerOverlay = {

	supportsCommand: function(command) {
			switch (command) {
			case "cmd_synchGroupdav":
			return true;
			default:
			return false;
			}
		},

	isCommandEnabled: function(command) {
			try{
				switch (command) {
				case "cmd_synchGroupdav":
				if (gSelectedDir && gSelectedDir != ""
						&& isGroupdavDirectory(gSelectedDir)
						&& !isCardDavDirectory(gSelectedDir)
						&& !gSynchIsRunning)
					return true;
				else
					return false;
				default:
				return false;
				}
			}
			catch (e) {
				exceptionHandler(window,"Exception",e);
			}
			return false;
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
	// dir pane
	if (dirTree) {
		dirTree.controllers.appendController(dirPaneControllerOverlay);
		dirTree.controllers.appendController(DirPaneController);
	}
	// results pane
	if (gAbResultsTree) {
		gAbResultsTree.controllers.appendController(ResultsPaneController);
		gAbResultsTree.controllers.appendController(dirPaneControllerOverlay);
	}
}

//Override of AbDelete in chrome://messenger/content/addressbook/abCommon.js
// Addition to delete the card on the groupdav server 
// Definitions are done in onloadDAV since on Windows it was loaded before the abCommon.js version
var  AbDeleteOriginal;
var  AbDelete;

var AbDeleteDirectory;
var AbDeleteDirectoryOriginal;

// DirTreeObserver that synchronized with the GroupDAV server on card delete
var abGoupDavDirTreeObserver = { 


 canDrop: function(index, orientation){

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

		if (isGroupdavDirectory(targetURI)){

			//		var date = new Date();
			//		var curDate = null;

			//		do { curDate = new Date(); }while(curDate-date < 2000);
			SynchronizeGroupdavAddressbookDrop(targetURI);

		}
	},

 onToggleOpenState: function()
 {
 },

 onCycleHeader: function(colID, elt)
 {
 },

 onCycleCell: function(row, colID)
 {
 },

 onSelectionChanged: function()
 {
 },

 onPerformAction: function(action)
 {
 },

 onPerformActionOnRow: function(action, row)
 {
 },

 onPerformActionOnCell: function(action, row, colID)
 {
 }	
};

//Override of OnLoadDirTree in chrome://messenger/content/addressbook/addresbook..js
// Addition to upload the card on the groupdav server
//
// Based on the code in nsXULTreeBuilder.cpp:  Observers will be called in the order that they were added,
// which makes it posssible to call synchronize after abDirTreeObserver.onDrop is called
var OnLoadDirTreeOriginal = OnLoadDirTree;

var OnLoadDirTree = function() {
	var treeBuilder = dirTree.builder.QueryInterface(Components.interfaces.nsIXULTreeBuilder);
	OnLoadDirTreeOriginal.apply();
	treeBuilder.addObserver(abGoupDavDirTreeObserver);	
}

	function abGroupdavUnload(){
		var treeBuilder = dirTree.builder.QueryInterface(Components.interfaces.nsIXULTreeBuilder);
		treeBuilder.removeObserver(abGoupDavDirTreeObserver);
	}

// Override AbDeleteDirectory() to delete DAV preferences

function onloadDAV(){
	this.addEventListener("unload", abGroupdavUnload, true);

	AbDeleteOriginal = AbDelete;
	AbDelete = function(){
		var cards = GetSelectedAbCards();
		if (cards && cards.length > 0){
			for (var i = 0; i < cards.length; i++){ 	
				if ( (cards[i] instanceof Components.interfaces.nsIAbMDBCard) && isGroupdavDirectory(gSelectedDir)){				
					var card = cards[i].QueryInterface(Components.interfaces.nsIAbMDBCard);
					if (card){
						var key = card.getStringAttribute("groupDavKey");
						if (key){
							var groupdavPrefService = new GroupdavPreferenceService(GetDirectoryFromURI(gSelectedDir).dirPrefId);
							var url = groupdavPrefService.getURL();
							var href =  url + key;
							var webdavOb = webdav_delete(href,null,null);
							logDebug("webdav_delete sent for vcard: " + href);  
						}
					}
				}
			}
		}
		AbDeleteOriginal.apply();
	};

	AbDeleteDirectoryOriginal = AbDeleteDirectory;
	AbDeleteDirectory = function() {
		var prefBranchPath = GetDirectoryFromURI(gSelectedDir).dirPrefId;
		var prefService;
		try{
			if (isGroupdavDirectory(gSelectedDir)){
				var groupdavPrefService = new GroupdavPreferenceService(prefBranchPath);
				prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
				prefService.deleteBranch(groupdavPrefService.prefPath);
			}
		}catch(e){
			exceptionHandler(window,"Error Deleting AddressBook",e);
		}
		AbDeleteDirectoryOriginal.apply();
		if (prefService){
			// Little patch since AbDeleteDirectoryOriginal does not delete position (ldap_2.servers.AA.position)
			prefService.deleteBranch(prefBranchPath);
			prefService.deleteBranch(prefBranchPath + ".position");// strange position is not deleted
		}
	};
}

onloadDAV();