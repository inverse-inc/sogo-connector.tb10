/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
/*************************************************************************************************************   
 Copyright:	Inverse groupe conseil, 2007
 Author: 	Robert Bolduc
 Email:		support@inverse.ca 
 URL:			http://inverse.ca
  
 This file is part of "SOGo Connector" a Thunderbird extension.

    "SOGo Connector" is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License version 2 as published by
    the Free Software Foundation;

    "SOGo Connector" is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with "SOGo Connector"; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 ********************************************************************************/

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

jsInclude(["chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js",
					 "chrome://sogo-connector/content/general/sync.addressbook.groupdav.js",
					 "chrome://sogo-connector/content/general/sync.progress-meter.js",
					 "chrome://sogo-connector/content/general/implementors.addressbook.groupdav.js",
					 "chrome://sogo-connector/content/common/common-dav.js",
					 "chrome://sogo-connector/content/general/vcards.utils.js",
					 "chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js"]);

/*
 * This overlay adds GroupDAV functionalities to Addressbooks
 * it contains the observers needed by the addressBook and the cards dialog
 */
 
var gGroupDAVProgressMeter;

function OnLoadMessengerOverlay() {
	_cleanupAddressBooks();

	window.gAbWinObserverService = Components.classes["@mozilla.org/observer-service;1"]
		.getService(Components.interfaces.nsIObserverService);
	gGroupDAVProgressMeter = new SyncProgressMeter();
	addObservers();

 	setTimeout(_startupFolderSync, 2000);
}

function _cleanupAddressBooks() {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	var path = "ldap_2.servers";
	var count = {};
	var children = prefs.getChildList(path, count);
	var uniqueChildren = {};
	for (var i = 0; i < children.length; i++) {
		var leaves = children[i].split(".");
		uniqueChildren[leaves[2]] = true;
	}

	_cleanupBogusAB(prefs, uniqueChildren);

	path = "extensions.ca.inverse.addressbook.groupdav.ldap_2.servers";
	count = {};
	children = prefs.getChildList(path, count);
	uniqueChildren = {};
	for (var i = 0; i < children.length; i++) {
		var leaves = children[i].split(".");
		uniqueChildren[leaves[7]] = true;
	}

	_cleanupOrphanDAVAB(prefs, uniqueChildren);
}

function _cleanupBogusAB(prefs, uniqueChildren) {
	var path = "ldap_2.servers";

	for (var key in uniqueChildren) {
		if (key != "default") {
			var uriRef = path + "." + key + ".uri";
			var uri = null;
// 			dump("trying: " + uriRef + "\n");
			try {
				//  			uri = "moz-abdavdirectory://" + prefs.getCharPref(uriRef);
				uri = prefs.getCharPref(uriRef);
				if (uri.indexOf("moz-abldapdirectory:") == 0) {
					dump("deleting: " + path + "." + key + "\n");
					prefs.deleteBranch(path + "." + key);
					// 			dump("uri: " + uri + "\n");
				}
				else if (uri.indexOf("moz-abdavdirectory:") == 0) {
					try {
						prefs.getCharPref("extensions.ca.inverse.addressbook.groupdav"
															+ ".ldap_2.servers." + key + ".name");
					}
					catch(e) {
						dump("deleting: " + path + "." + key + "\n");
						prefs.deleteBranch(path + "." + key);
					};
				}
			}
			catch(e) {};
		}
	}
}

function _cleanupOrphanDAVAB(prefs, uniqueChildren) {
	var	path = "extensions.ca.inverse.addressbook.groupdav.ldap_2.servers";
	for (var key in uniqueChildren) {
		var otherRef = "ldap_2.servers." + key + ".description";
		try {
			prefs.getCharPref(otherRef);
		}
		catch(e) {
			dump("deleting orphan: " + path + "." + key + "\n");
			prefs.deleteBranch(path + "." + key);
		}
	}
}

function _startupFolderSync() {
	var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
    .getService(Components.interfaces.nsIRDFService);
	var parentDir = rdfService.GetResource("moz-abdirectory://")
    .QueryInterface(Components.interfaces.nsIAbDirectory);
	var children = parentDir.childNodes;
	while (children.hasMoreElements()) {
		var ab = children.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
		var realAB = ab.QueryInterface(Components.interfaces.nsIAbDirectory);
		if (isGroupdavDirectory(ab.Value)
				&& !isCardDavDirectory(ab.Value)) {
			var synchronizer = new GroupDavSynchronizer(ab.Value, false);
 			SynchronizeGroupdavAddressbook(ab.Value);
		}
	}
}

function OnUnloadMessengerOverlay() {
	try {
		removeObservers();
		OnUnloadMessenger();
	}
	catch(e) {
		exceptionHandler(this,"OnLoadMessengerOverlay",e);
	}
}

function addObservers() {
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.API_DISABLED_EVENT, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.INITIALIZATION_EVENT, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.NOTHING_TO_DO, true);

	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.SERVER_DOWNLOAD_BEGINS, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.CARD_DOWNLOADED, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.CARD_DOWNLOAD_FAILED, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.SERVER_DOWNLOAD_COMPLETED, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.SERVER_DOWNLOAD_FAILURE, true);

	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.SERVER_UPLOAD_BEGINS, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.UPLOAD_STOP_REQUEST_EVENT, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.CARD_UPLOADED, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.UPLOAD_ERROR_EVENT, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.UPLOAD_COMPLETED, true);

	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.SERVER_SYNC_COMPLETED, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SyncProgressMeter.SERVER_SYNC_ERROR, true);   
}

function removeObservers() {
	if (window.gAbWinObserverService) {
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.API_DISABLED_EVENT);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.INITIALIZATION_EVENT);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.NOTHING_TO_DO);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.CARD_DOWNLOADED);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.CARD_DOWNLOAD_FAILED);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.SERVER_DOWNLOAD_BEGINS);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.SERVER_DOWNLOAD_COMPLETED);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.SERVER_DOWNLOAD_FAILURE);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.SERVER_UPLOAD_BEGINS);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.UPLOAD_ERROR_EVENT);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.UPLOAD_STOP_REQUEST_EVENT);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.CARD_UPLOADED);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.UPLOAD_COMPLETED);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SyncProgressMeter.SERVER_SYNC_COMPLETED);
		gAbWinObserverService.removeObserver(gGroupDAVProgressMeter,
																				 SyncProgressMeter.SERVER_SYNC_ERROR);
	}
}

window.addEventListener("load", OnLoadMessengerOverlay, false);
