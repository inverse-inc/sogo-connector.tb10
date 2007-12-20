/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
/*******************************************************************************
 sync.addressbook.groupdav.js
 
 Copyright:	Inverse groupe conseil, 2006-2007
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
 
		* 
		********************************************************************************/

function jsInclude(files, target) {
	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		.getService(Components.interfaces.mozIJSSubScriptLoader);
	for (var i = 0; i < files.length; i++) {
		try {
			loader.loadSubScript(files[i], target);
		}
		catch(e) {
			dump("sync.addressbook.groupdav.js: failed to include '" + files[i] + "'\n" + e + "\n");
		}
	}
}

jsInclude(["chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js",
					 "chrome://sogo-connector/content/general/sync.progress-meter.js",
					 "chrome://sogo-connector/content/general/implementors.addressbook.groupdav.js",
					 "chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js",
					 "chrome://sogo-connector/content/general/webdav.inverse.ca.js",
					 "chrome://sogo-connector/content/general/webdav_lib/webdavAPI.js"]);

function GroupDavSynchronizer(uri, isDrop) {
	if (uri) {
		this.gSelectedDirectoryURI = uri;
	}
	else {
		// Store the gAddressBook that was selected when Synchronize was clicked
		this.gSelectedDirectoryURI = GetSelectedDirectory();
	}
	this.mIsDrop = isDrop;
	this.messengerWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
		.getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:3pane");
}

GroupDavSynchronizer.prototype = {
 mIsDrop: false,
 messengerWindow: null,
 serverVersionHash: null,
//  serverDateHash: null,
 serverDataHash: null,
 localVersionHash: null,    // stores the version no of the local cards
 localDateHash: null,
 localUpdateHash: null,     // stores keys (the value is set to true)
 localAdditionHash: null,  	// stores vcards 
 serverDeleteArray: null,		// store keys
 conflictHash: null,			// store keys of conflicts
 localCardPointerHash: null, //stores mozilla cards
 gURL: null,
 gDisplaySyncDialog: null,
 gSelectedDirectoryURI: null, // gAddressBook to synchronize
 gAddressBook: null,
 gGroupDavServerInterface: null,

 start: function() {
		this.initSyncVariables();
		this.fillServerHashes();
	},
 initSyncVariables: function() {
		this.gAddressBook = GetDirectoryFromURI(this.gSelectedDirectoryURI);

		var prefId;
		if (this.gSelectedDirectoryURI == "moz-abmdbdirectory://abook.mab")
			prefId = "pab";
		else
			prefId = this.gAddressBook.dirPrefId;
		var groupdavPrefService = new GroupdavPreferenceService(prefId);
		this.gURL = groupdavPrefService.getURL();

		this.gDisplaySyncDialog = groupdavPrefService.getDisplayDialog() == "true";
	
		this.gGroupDavServerInterface = GroupdavServerFactory.get(groupdavTypes.GroupDAV_Generic);
		logDebug("function initSyncVariables()\n\t\t\turl:[" + this.gURL
						 + "] \n\t\t\thost:[" + groupdavPrefService.getHostName() +"]");

		this.serverVersionHash = {};
// 		this.serverDateHash = {};
		this.localVersionHash = {};
// 		this.localDateHash = {};

		this.serverDataHash = {};
		this.serverDataHash.size = 0;

		this.localUpdateHash = {};
		this.localUpdateHash.size = 0;

		this.localAdditionHash = {};
		this.localAdditionHash.size = 0;
		//	localDeleteHash = {};
		//	localDeleteHash.size = 0;
		this.serverDeleteArray = new Array();
		//	serverDeleteHash.size = 0;
		this.conflictHash = {};
		this.localCardPointerHash = {};

		//Initialization is completed
		this.messengerWindow.gAbWinObserverService.notifyObservers(null,
																															 SyncProgressMeter.INITIALIZATION_EVENT,
																															 null);
	},
 // Fill the Local Directory data structures for the syncronization
 fillLocalHashes: function() {
		var cards = this.gAddressBook.childCards;
		var hasCards = false;
	
		try{
			cards.first();
			hasCards = true;
		}catch (ex){}// nsIEnumerator doesn't seem to provide any clean way to test for existence of elements

		while (hasCards) {
			var card = cards.currentItem().QueryInterface(Components.interfaces.nsIAbCard);
			var cardExt = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
			var key = cardExt.getStringAttribute("groupDavKey");
			if (key && key != "") {
				// Cards that exist locally and on the server
				// Later, the function compareVersions() will use this information to determine 
				// if the cards needs to be uploaded or if there is a conflict
				this.localCardPointerHash[key] = card;
				this.localVersionHash[key] = cardExt.getStringAttribute("groupDavVersion");
// 				this.localDateHash[key] = cardExt.getStringAttribute("groupDavDate");
			}
			else {
				// Generate the key and save the modified card locally.
				var cardKey = this.gGroupDavServerInterface.getNewCardKey();
				cardExt.setStringAttribute("groupDavKey",cardKey);
				card.editCardToDatabase(this.gSelectedDirectoryURI);
				this.localCardPointerHash[cardKey] = card;

				// New card to export to the server      		
				this.localAdditionHash[cardKey] = card2vcard(card);
				this.localAdditionHash.size++;
			}
			try{ 
				cards.next(); 
			}catch(ex2){ 
				hasCards = false; 
			}                   
		}
		//	logDebug("=========End Local Cards List");
	},

 /***********************************************************
	* 
	* Fills the Server, 
	* LocalUpdate 
	* and Conflict data structures 
	* 
	* for the syncronization
	* 
	***********************************************************/
 fillServerHashes: function() {
		dump("fillServerHashes\n");
		// Get the list of all the vcards and their version from the GroupDAV server
		// TODO replace this call with a new propfind that will be put inside of ca.inverse.webdav.js 
		// instead of using webdavAPI.js

		var data = {query: "server-propfind"};
		var request = new sogoWebDAV(this.gURL, this, data);
		request.propfind(["DAV: getetag", "DAV: getcontenttype", "DAV: getlastmodified"]);
// 		try {
// 			var responseObj = webdav_propfind(this.gURL, propsList, null, null); //Let Thunderbird Password Manager handle user and password
// 		}
// 		catch (e) {
// 			throw new Components.Exception("Cannot connect to the server "
// 																		 + this.gURL + "\nMethod:fillServerHashes()\n\n",
// 																		 Components.results.NS_ERROR_FAILURE);
// 		}
	},
 compareVersions: function() {
		dump("compareVersion\n");
		for (var key in this.serverVersionHash) {
			dump("comparing key '" + key + "', local: " + this.localVersionHash[key]
					 + "; server: " + this.serverVersionHash[key] + "\n");
			var serverVersion = this.serverVersionHash[key];
// 			var serverDate = this.serverDateHash[key];
			var localVersion = 0;
// 			var localDate = null;
			if (typeof(this.localVersionHash[key]) != "undefined")
				localVersion = this.localVersionHash[key];
// 			if (typeof(this.localDateHash[key]) != "undefined")
// 				localDate = this.localDateHash[key];
			dump(key + ": localVersion: " + localVersion + "; serverVersion: " +
					 serverVersion + "\n");
			if (localVersion != serverVersion) {
				// No Local version, the vcard has to be downloaded
				this.serverDataHash[key] = "";
				this.serverDataHash.size++;
			}
			else {
				var localVersionPrefix = getModifiedLocalVersion(localVersion);
				if (localVersionPrefix != null) {
					//There was a local update
					if (localVersionPrefix != serverVersion) {
						// There is a conflict if the version numbers are different.
						// Otherwise, the local version will be uploaded later
						this.conflictHash[key] = true;
						this.serverDataHash[key] = "";
						this.serverDataHash.size++;
					}
					else {
						this.localUpdateHash[key] = true;
						this.localUpdateHash.size++;
					}
				}
				else if (localVersion < serverVersion) {
					// Server version is more recent           	
					this.serverDataHash[key] = "";
					this.serverDataHash.size++;	                  
				}
			}
		}
	},
 initProgressMeter: function() {
		dump("initProgressMeter\n");
		//Initialize SyncProgressMeter (see addressbook.groupdav.overlay.js for definition)
		this.messengerWindow.gGroupDAVProgressMeter.displayMsg = this.gDisplaySyncDialog;	
		this.messengerWindow.gGroupDAVProgressMeter.abWindow2	= Components.classes["@mozilla.org/appshell/window-mediator;1"].
		getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:addressbook");
		
		if (this.serverDataHash.size
				+ this.localUpdateHash.size
				+ this.localAdditionHash.size == 0) {
			this.messengerWindow
				.gAbWinObserverService.notifyObservers(null,
																							 SyncProgressMeter.NOTHING_TO_DO,
																							 null);	
		}else{
			this.messengerWindow.gGroupDAVProgressMeter.initDownload(this.serverDataHash.size);
			this.messengerWindow.gGroupDAVProgressMeter.initUpload(this.localCardPointerHash,
																														 this.gSelectedDirectoryURI,
																														 this.localUpdateHash.size,
																														 this.localAdditionHash.size);
			this.messengerWindow.gGroupDAVProgressMeter.setVCardsUpDateSize(this.localUpdateHash.size);	
			this.messengerWindow.gGroupDAVProgressMeter.setVCardsAddSize(this.localAdditionHash.size);
			this.messengerWindow.gGroupDAVProgressMeter.setVCardsUploadTotalSize(this.localUpdateHash.size
																																					 +
																																					 this.localAdditionHash.size);
		}
	},
 downloadVcards: function() {
		dump("downloadVcards\n");
		if (this.serverDataHash.size > 0) {
			this.messengerWindow.gAbWinObserverService.notifyObservers(null,
																																 SyncProgressMeter.SERVER_DOWNLOAD_BEGINS,
																																 null);
			for (var key in this.serverDataHash)
				if (key != "size")
					this.downloadVcardAsync(key);
		}
	},
 // Downloads asyncronously a vcard from the GroupDAV server and stores it in serverDataHash
 downloadVcardAsync: function(key) {
		var fileUrl = this.gURL + key;

		var data = {query: "vcard-download",
								data: key};
		var request = new sogoWebDAV(fileUrl, this, data);
		request.get();
	},
 onDAVQueryComplete: function(status, data, cbdata) {
		dump("onDavQueryComplete: " + cbdata.query + "\n");
		if (cbdata.query == "vcard-download")
			this.onVCardDownloadComplete(status, data, cbdata.data);
		else if (cbdata.query == "server-propfind")
			this.onServerHashQueryComplete(status, data, cbdata.data);
		else
			throw("unknown query: " + cbdata.query);
 },
 onVCardDownloadComplete: function(status, data, key) {
		if (Components.isSuccessCode(status)) {
			logInfo("download data: " + data);
			this.serverDataHash[key] = data;
			this._importCard(key, data);
			this.messengerWindow.gAbWinObserverService.notifyObservers(null,
																																 SyncProgressMeter.CARD_DOWNLOADED,
																																 key);
		}
		else
			this.messengerWindow.gAbWinObserverService.notifyObservers(null,
																																 SyncProgressMeter.CARD_DOWNLOAD_FAILED,
																																 key);
	},
 _importCard: function(key, data) {
		var vcardFieldsArray = {};  //To handle fbURL from SOGo(freebusy) and vcards fields that have no equivalent in Thunderbird.
		vcardFieldsArray["groupDavVcardCompatibility"] = "";

		var cardExt;
		if (!this.serverVersionHash[key]) {
			var string = ("Missing key '" + key + "' from hash"
										+ " 'this.serverVersionHash'.\n"
										+ "Valid keys are:\n");
			for (var validKey in this.serverVersionHash)
				string += "  " + validKey;
			throw string;
		}

		logDebug("Vcard downloaded:\n" + "key: " + key + "data: \n" +data);
		var card = importFromVcard(data, this.gSelectedDirectoryURI,
															 vcardFieldsArray);
		logDebug("groupDavVcardCompatibility value:\n" + vcardFieldsArray["groupDavVcardCompatibility"]);

		if (this.localCardPointerHash[key]) {
			// Replace local card with server card
			this.localCardPointerHash[key].copy(card);
			cardExt = this.localCardPointerHash[key].QueryInterface(Components.interfaces.nsIAbMDBCard);

			cardExt.setStringAttribute("groupDavKey", key);
			cardExt.setStringAttribute("groupDavVersion",
																 this.serverVersionHash[key]);
			logInfo("vcardFieldsArray: " + dumpObject(vcardFieldsArray));
			cardExt.setStringAttribute("calFBURL", vcardFieldsArray["fburl"]);
			cardExt.setStringAttribute("groupDavVcardCompatibility",
																 vcardFieldsArray["groupDavVcardCompatibility"]);
			
			this.localCardPointerHash[key].editCardToDatabase(this.gSelectedDirectoryURI);
		}
		else {
			// add the server card
			dump("!!!!!!!!!!!!!! :" + this.gSelectedDirectoryURI + "\n");
			var savedCard = GetDirectoryFromURI(this.gSelectedDirectoryURI).addCard(card);
			cardExt = savedCard.QueryInterface(Components.interfaces.nsIAbMDBCard);
			
			cardExt.setStringAttribute("groupDavKey", key);
			dump("key: " + key + "\n");
			dump("serverVersionHash[key]: " + this.serverVersionHash[key] + "\n");
			cardExt.setStringAttribute("groupDavVersion", this.serverVersionHash[key]);
			cardExt.setStringAttribute("calFBURL", vcardFieldsArray["fburl"]);
			cardExt.setStringAttribute("groupDavVcardCompatibility",
																 vcardFieldsArray["groupDavVcardCompatibility"]);

			savedCard.editCardToDatabase(this.gSelectedDirectoryURI);
		}
		logDebug("importFromVcard() completed");
		logDebug("//TODO: do a propfind to make sure the version no. (etag) has not changed.");
	},
 onServerHashQueryComplete: function(status, response, key) {
		// 		dump("onServerHashQueryComplete...: " + data + "\n");
		switch (status) {
		case 207:
		case 200: // Added to support Open-Xchange   
		logDebug("=========Begin Server Cards List, url is: " + this.gURL);

		for (var href in response) {
			var davObject = response[href];
			var contentType = davObject["DAV: getcontenttype"];
			if (contentType == "text/x-vcard"
					|| contentType == "text/vcard") {
				var version = davObject["DAV: getetag"];
				var cNameArray = href.split("/");
				var cName = cNameArray[cNameArray.length - 1];
				this.serverVersionHash[cName] = version;
// 				this.serverDateHash[cName] = new Date(davObject["DAV: getlastmodified"]);
				logDebug("\tServer Card key = " + cName + "\tversion = " + version);
			}
		}
		
		logDebug("=========End Server Cards List"); 
		this.processServerKeys();
		break;
		case 401:
		logWarn("Warning!\n\n You either pressed Cancel instead of providing user and password or the server responded 401 for another reason.");
		//return;      
		break;
			
		case 403:
		var msg = "Authentification failed or the user does not have permission to access the specified Address Book.\n\n  You will have to restart Thunderbird to authenticate again!";
		alert(msg);
		logWarn(msg);
		//return;
		break;
		
		default:
		throw "Error connecting to GroupDAV Server; response status: " + responseObj.status;      
		}
	},
 processServerKeys: function() {
		if (this.mIsDrop) {
			this.fillLocalHashes();
			this.compareVersions();
			this.initProgressMeter();
			this.uploadCards();
		}
		else {
			this.fillLocalHashes();
			this.compareVersions();//Has to be done first it modifies Local Hashes		
			this.initProgressMeter();
			this.downloadVcards(); //asyncronuous
			this.uploadCards(); //asyncronous
			this.processConflicts();
		}
	},
 uploadCards: function() {
		dump("uploadCards\n");
		if (this.localUpdateHash.size + this.localAdditionHash.size > 0){
			this.messengerWindow.gAbWinObserverService.notifyObservers(null,
																																 SyncProgressMeter.SERVER_UPLOAD_BEGINS,
																																 null);
			this.upLoadLocalAdditions(); //asyncronuous
			this.uploadLocalUpdates(); // asyncronuous
		}
	},
 upLoadLocalAdditions: function() {
		dump("uploadLocalAdditions\n");
		if (this.localAdditionHash.size > 0) {
			for (var key in this.localAdditionHash) {
				if (key != "size") {
					webdavAddVcard(this.gURL + key, this.localAdditionHash[key], key,
												 this.messengerWindow.gGroupDAVProgressMeter,
												 this.messengerWindow.gAbWinObserverService);
				}
			}
		}
	},
 uploadLocalUpdates: function() {
		dump("uploadLocalUpdates\n");
		if (this.localUpdateHash.size > 0) {
			for (var key in this.localUpdateHash) {
				if (key != "size") {
					webdavUpdateVcard(this.gURL + key,
														card2vcard(this.localCardPointerHash[key]), key,
														this.messengerWindow.gGroupDAVProgressMeter,
														this.messengerWindow.gAbWinObserverService);
				}
			}
		}
	},
 processConflicts: function() {
		dump("processConflicts\n");
		for (var key in this.conflictHash) {
			importFromVcard(this.serverDataHash[key], key, this.serverVersionHash[key],
											this.gSelectedDirectoryURI);
			//this.gAddressBook.dropCard(this.localCardPointerHash[key],false);
		}
		this.processDeletes();
		logWarn("TODO:\tCurrently, conflicts are simply overwritten by the server version.\n\t\t\t\t\t\t\tDeletes on the server are simply ignored at this point.");
	},
 processDeletes: function() {
		var deleteListStringForTestPurposes = "";
		//Filling the Server deleted cards Hash
		var i = 0;
		for (var key in this.localCardPointerHash) {
			if (key != "size" && this.serverVersionHash[key] == null) {
				//			serverDeleteHash[key] = this.localCardPointerHash[key];
				this.serverDeleteArray[i] = key;
				i++;
				//			serverDeleteHashsize++;	
			}
		}
		//	if (groupdavPrefService.getAutoDeleteFromServer()){
		if (true) {
			// Automatic delete
			this.deleteServerDeleteArrayCards();
		}
		else {
			window.openDialog("chrome://sogo-connector/content/addressbook/test.xul",  "", "chrome,resizable=yes,centerscreen");
		}
	},
 deleteServerDeleteArrayCards: function() {
		var card;
		var db = Components.classes["@mozilla.org/addressbook;1"].createInstance(Components.interfaces.nsIAddressBook).getAbDatabaseFromURI(this.gSelectedDirectoryURI);
		for (var i = 0; i < this.serverDeleteArray.length; i++) {
			card =this.localCardPointerHash[this.serverDeleteArray[i]].QueryInterface(Components.interfaces.nsIAbMDBCard);
			db.deleteCard(card, true);
		}
		db.closeMDB(true);	
	}
};

// This method was added to circumvent the card being deleted locally
// when doing a drag and drop from a Directory (read only)
// It does not process downloads from the server.
// This is not the optimal solution but it will do for now.
function SynchronizeGroupdavAddressbookDrop(uri){
	var synchronizer = new GroupDavSynchronizer(uri, true);
	synchronizer.start();
}

function SynchronizeGroupdavAddressbook(uri){	
	var synchronizer = new GroupDavSynchronizer(uri, false);
	synchronizer.start();
}
