/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
/*************************************************************************************************************   
 Copyright:	Inverse inc., 2006-2007
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
			dump("preferences.addressbook.groupdav.js: failed to include '" + files[i] + "'\n" + e + "\n");
		}
	}
}

jsInclude(["chrome://sogo-connector/content/addressbook/folder-handling.js",
					 "chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js",
					 "chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js"]);

// var fromPreferences = false;

function onAccept() {
	var prefMsgBundle = document.getElementById("preferencesMsgId");
														   
	//There has to be at least a description to create a SOGO addressbook
	var description = document.getElementById("description").value;
	if (!description || description == "") {
		alert(prefMsgBundle.getString("missingDescriptionMsg"));
		return false;
	}

	var url = document.getElementById("groupdavURL").value;
	if (!url || url == "") {
		alert(prefMsgBundle.getString("missingDescriptionURL"));
		return false;
	}

	var readOnly = document.getElementById("readOnly").checked;
	if (readOnly)
		onAcceptCardDAV();
	else
		onAcceptWebDAV();

	return true;
}

function onAcceptCardDAV() {
	var url = document.getElementById("groupdavURL").value;
	var description = document.getElementById("description").value;

	var directoryURI = SCGetCurrentDirectoryURI();
	if (directoryURI) {
		var directory = SCGetDirectoryFromURI(directoryURI);
		if (directory && directory.dirPrefId.length > 0) {
			var properties = directory.directoryProperties;
			properties.description = description;
			properties.URI = "carddav://" + url;

			var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
				.getService(Components.interfaces.nsIRDFService);
			var parentDir = rdf.GetResource("moz-abdirectory://")
				.QueryInterface(Components.interfaces.nsIAbDirectory);
			parentDir.modifyDirectory(directory, properties);
			window.opener.gNewServerString = directory.dirPrefId;
		}
		else
			throw("invalid CardDAV directory: " + uri + "\n");
	}
	else
		window.opener.gNewServerString = SCCreateCardDAVDirectory(description, url);

	window.opener.gNewServer = description;
	window.opener.gUpdate = true;
}

function onAcceptWebDAV(){
	var properties;
	var description = document.getElementById("description").value;

	var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);	
		// var addressbookDS = rdf.GetDataSource("rdf:addressdirectory");
	var parentDir = rdf.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
	var uri = SCGetCurrentDirectoryURI();
	if (uri) {
		var directory = SCGetDirectoryFromURI(uri);
		if (directory && directory.dirPrefId.length > 0) {
			// Modifying existing Addressbook

			properties = directory.directoryProperties;
			properties.description = description;

			dump(parentDir.hasDirectory(directory) + "\n");
			parentDir.modifyDirectory(directory, properties);
		}
		else
			throw("invalid WebDAV directory: " + uri + "\n");
	}
	else {
		// adding a new Addressbook		
		properties = Components.classes["@mozilla.org/addressbook/properties;1"]
			.createInstance(Components.interfaces.nsIAbDirectoryProperties);
		properties.dirType = 2;// ???don't know which values should go in there but 2 seems to get the job done
		properties.description = document.getElementById("description").value;

		parentDir.createNewDirectory(properties);
		window.opener.gNewServerString = properties.prefName;
	}

	var groupdavPrefService = new GroupdavPreferenceService(properties.prefName);
	groupdavPrefService.setURL(document.getElementById("groupdavURL").value);
	groupdavPrefService.setDirectoryName(description);
	groupdavPrefService.setDisplayDialog(document.getElementById("displaySyncCompleted").checked);
	//groupdavPrefService.setAutoDeleteFromServer(document.getElementById("autoDeleteFromServer").getAttribute("checked"));
}

function SCGetCurrentDirectoryURI() {
	var uri;

	if (window.arguments && window.arguments[0])
		uri = window.arguments[0];
	else
		uri = null;
	
	return uri;
}

function onLoad() {
	// TODO	add download now for cardDAV, the tab is currently hidden
// 	document.getElementById("offlineTabId").hidden = true;	
	
// 	dump("dirstring: " + window.arguments[0].selectedDirectoryString + "\n");

	//Read only checkbox event listener
	document.getElementById("readOnly").addEventListener("CheckboxStateChange",
																											 onReadOnlyUpdate, true);

	var uri = SCGetCurrentDirectoryURI();
	if (uri) {
		var directory = SCGetDirectoryFromURI(uri);
		if (directory) {
			var readOnly = (uri.indexOf("moz-abdavdirectory://") == 0);
			var roElem = document.getElementById("readOnly");
			roElem.setAttribute("checked", readOnly);
			roElem.disabled = true;

			var description = "";
			var url = "";
			var displaySync = false;

			if (readOnly) {
				description = directory.dirName;
				var cardDavPrefix = "carddav://";
				var dUrl = directory.directoryProperties.URI;
				if (dUrl.indexOf(cardDavPrefix) == 0)
					url = dUrl.substr(cardDavPrefix.length);
				document.getElementById("displaySyncCompleted").disabled = true;			 
				//			document.getElementById("autoDeleteFromServer").disabled = true;
			}
			else {
				var groupdavPrefService = new GroupdavPreferenceService(directory.directoryProperties.prefName);
				description = directory.dirName;
				url = groupdavPrefService.getURL();
				displaySync = groupdavPrefService.getDisplayDialog();
				//document.getElementById("offlineTabId").disabled = true;
				//			document.getElementById("downloadButton").disabled = true;
				//			document.getElementById("autoDeleteFromServer").setAttribute("checked", groupdavPrefService.getAutoDeleteFromServer());									
			}
			document.getElementById("description").value = description;
			document.getElementById("groupdavURL").value = url;
			document.getElementById("displaySyncCompleted").checked = displaySync;
			// 	else {
			//			document.getElementById("offlineTabId").disabled = true;
			//			document.getElementById("downloadPanel").disabled = true;
			//			document.getElementById("downloadButton").disabled = true;
			// 	}
		}
		else
			throw("invalid WebDAV directory: " + uri + "\n");
	}
}

//TODO:catch the directory delete and delete preferences

function onCancel() {
	window.close();
}

// Handle readOnly checkbox updates


function onReadOnlyUpdate() {
	document.getElementById("displaySyncCompleted").disabled
		= document.getElementById("readOnly").checked;
}

function DownloadNow(){
	
	// TODO	add download now for cardDAV
	/*	
			if (!gDownloadInProgress) {
			gProgressText = document.getElementById("replicationProgressText");
			gProgressMeter = document.getElementById("replicationProgressMeter");

			gProgressText.hidden = false;
			gProgressMeter.hidden = false;
			gReplicationCancelled = false;

			try {
      gReplicationService.startReplication(gCurrentDirectoryString,
			progressListener);
			}
			catch (ex) {
      EndDownload(false);
			}
			} else {
			gReplicationCancelled = true;
			try {
      gReplicationService.cancelReplication(gCurrentDirectoryString);
			}
			catch (ex) {
      // XXX todo
      // perhaps replication hasn't started yet?  This can happen if you hit cancel after attempting to replication when offline 
      dump("unexpected failure while cancelling.  ex=" + ex + "\n");
			}
			}
  */
}
