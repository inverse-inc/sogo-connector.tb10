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
			dump("sync.addressbook.groupdav.js: failed to include '" + files[i] +
					 "'\n" + e
					 + "\nFile: " + e.fileName
					 + "\nLine: " + e.lineNumber + "\n\n Stack:\n\n" + e.stack);
		}
	}
}

jsInclude(["chrome://inverse-library/content/sogoWebDAV.js",	
					 "chrome://sogo-connector/content/addressbook/folder-handling.js",
					 "chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js",
					 "chrome://sogo-connector/content/general/implementors.addressbook.groupdav.js",
					 "chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js",
					 "chrome://sogo-connector/content/general/vcards.utils.js",
					 "chrome://sogo-connector/content/general/webdav.inverse.ca.js",
					 "chrome://sogo-connector/content/general/webdav_lib/webdavAPI.js"]);

var sCounter = 0;
function GroupDavSynchronizer(uri, isDrop) {
	if (typeof uri == "undefined" || !uri)
		throw "Missing 'uri' parameter";
	if (!isGroupdavDirectory(uri))
		throw "Specified addressbook cannot be synchronized";

	sCounter++;
  this.mCounter = sCounter;
	dump("new sync: " + this.mCounter + "\n");
	this.gSelectedDirectoryURI = uri;
	this.mIsDrop = isDrop;
	this.messengerWindow
		= Components.classes["@mozilla.org/appshell/window-mediator;1"]
		.getService(Components.interfaces.nsIWindowMediator)
		.getMostRecentWindow("mail:3pane");
	this.callbackCode = 0;
	this.callbackFailures = [];
	this.callback = null;
	this.callbackData = null;
	this.context = this._initGroupDAVContext();

	this.progressMgr = Components.classes["@inverse.ca/sync-progress-manager;1"]
		.getService(Components.interfaces.inverseIJSSyncProgressManager)
		.wrappedJSObject;
}

GroupDavSynchronizer.prototype = {
 processMode: 0, /* 0 = cards, 1 = lists */
 context: null,
 progressMgr: null,
 callback: null,
 callbackCode: 0,
 callbackFailures: null,
 callbackData: null,
 remainingUploads: -1,
 remainingDownloads: -1,
 pendingOperations: -1,
 mIsDrop: false,
 messengerWindow: null,

 serverCardVersionHash: null,
 serverCardDataHash: null,
 localCardAdditions: null,
 localCardPointerHash: null,
 localCardVersionHash: null,    // stores the version no of the local cards

 serverListVersionHash: null,
 serverListDataHash: null,
 localListAdditions: null,
 localListPointerHash: null,
 localListVersionHash: null,

 conflictHash: null,			// store keys of conflicts

 gURL: null,
 gDisplaySyncDialog: null,
 gSelectedDirectoryURI: null, // gAddressBook to synchronize
 gAddressBook: null,
 validCollection: false,     /* is addressbook a vcard-collection? */

 _initGroupDAVContext: function() {
		var handler = Components.classes['@inverse.ca/context-manager;1']
		.getService(Components.interfaces.inverseIJSContextManager).wrappedJSObject;
		var newContext = handler.getContext("inverse.ca/groupdav/sync-context");

		if (!newContext.requests)
			newContext.requests = {};

		return newContext;
	},
 start: function() {
		if (!this.context.apiDisabled) {
			this.initSyncVariables();
			if (this.context.requests[this.gURL])
				dump("a request is already active for url: " + this.gURL + "\n");
			else {
				dump(this.mCounter + "/sync with " + this.gURL + "...\n");
				this.context.requests[this.gURL] = true;
				this.fillServerHashes();
			}
		}
	},
 initSyncVariables: function() {
		this.processMode = 0;
		this.gAddressBook = SCGetDirectoryFromURI(this.gSelectedDirectoryURI);

		var prefId;
		if (this.gSelectedDirectoryURI == "moz-abmdbdirectory://abook.mab")
			prefId = "pab";
		else
			prefId = this.gAddressBook.directoryProperties.prefName;

		var groupdavPrefService = new GroupdavPreferenceService(prefId);
		this.gURL = groupdavPrefService.getURL();

		// 		dump("prefId: " + prefId + "\n");
		// 		dump("url: " + this.gURL + "\n");

		this.gDisplaySyncDialog = groupdavPrefService.getDisplayDialog() == "true";
	
		// 		logDebug("function initSyncVariables()\n\t\t\turl:[" + this.gURL
		// 						 + "] \n\t\t\thost:[" + groupdavPrefService.getHostName() +"]");

		this.serverCardVersionHash = {};
		this.localCardVersionHash = {};
		this.serverListVersionHash = {};
		this.localListVersionHash = {};

		this.serverCardDataHash = {};
		this.serverCardDataHash.size = 0;
		this.serverListDataHash = {};
		this.serverListDataHash.size = 0;

		this.localCardAdditions = [];
		this.localCardUpdates = [];
		this.localListAdditions = [];
		this.localListUpdates = [];
		//	localDeleteHash = {};
		//	localDeleteHash.size = 0;
		//	serverDeleteHash.size = 0;
		this.conflictHash = {};
		this.localCardPointerHash = {};
		this.localListPointerHash = {};
	},
 // Fill the Local Directory data structures for the syncronization
 fillLocalHashes: function() {
		// 		dump("fillLocalhas\n");
		var cards = SCGetChildCards(this.gAddressBook);
		for (var i = 0; i < cards.length; i++) {
			var card = cards[i].QueryInterface(Components.interfaces.nsIAbCard);
			var mdbCard = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
			var key = mdbCard.getStringAttribute("groupDavKey");
			if (key && key != "") {
// 				dump("card '" + card.displayName + "' will be updated\n");
				// Cards that exist locally and on the server
				// Later, the function compareCardVersions() will use this information to determine 
				// if the cards needs to be uploaded or if there is a conflict
				this.localCardPointerHash[key] = card;
				var version = mdbCard.getStringAttribute("groupDavVersion");
				this.localCardVersionHash[key] = version;
				if (version == "-1") {
					this.serverCardVersionHash[key] = version;
					this.localCardUpdates.push(this.localCardPointerHash[key]);
				}
				// dump("xxxx localcard: " + key + "; version: " + version + "\n");
			}
			else {
// 				dump("card '" + card.displayName + "' will be added\n");
				//   				dump("xxxx local addition....\n");
				this.localCardAdditions.push(card);
			}
		}
		//	logDebug("=========End Local Cards List");
	},
 fillLocalListHashes: function() {
//  		dump("fillLocalListHashes\n");
		var lists = this.gAddressBook.childNodes;
		var count = 0;
		while (lists.hasMoreElements()) {
			count++;
			var list = lists.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
			if (list.isMailList) {
				var attributes = new GroupDAVListAttributes(list);
				var key = attributes.key;
				if (key) {
					this.localListPointerHash[key] = list;
					this.localListVersionHash[key] = attributes.version;
// 					dump("found old list: " + key
// 							 + "; version: " + attributes.version
// 							 + "\n");
					if (attributes.version == "-1") {
						dump("list '" + list.dirName + "' will be updated (" + key + ")\n");
						this.serverListVersionHash[key] = "-1";
						this.localListUpdates.push(this.localListPointerHash[key]);
					}
				}
				else {
 					dump("list '" + list.dirName + "' will be added\n");
					this.localListAdditions.push(list);
				}
			}
			else
				dump("strange: " + list + " is not a list!?\n");
		}
		dump("found " + count + " list\n");
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
		// 		dump("fillServerHashes\n");
		this.pendingOperations = 1;
		// 		dump("pendingOperations: " + this.pendingOperations + "\n");
		var data = {query: "server-check-propfind"};
		// 		dump("fillServerHashes (url): " + this.gURL + "\n");
		var request = new sogoWebDAV(this.gURL, this, data);
		request.propfind(["DAV: resourcetype"], false);
	},
 compareCardVersions: function() {
		// 		dump("compareCardVersions\n");
		for (var key in this.serverCardVersionHash) {
			// 			dump("comparing key '" + key + "', local: " + this.localCardVersionHash[key]
			// 					 + "; server: " + this.serverCardVersionHash[key] + "\n");
			var serverVersion = this.serverCardVersionHash[key];
			var localVersion = 0;
			if (typeof(this.localCardVersionHash[key]) != "undefined")
				localVersion = this.localCardVersionHash[key];

			if (localVersion != serverVersion
					&& localVersion != "-1") {
				this.serverCardDataHash[key] = "";
				this.serverCardDataHash.size++;
			}
		}
	},
 compareListVersions: function() {
		// 		dump("compareListVersions\n");
		for (var key in this.serverListVersionHash) {
			// 			dump("comparing key '" + key + "', local: " + this.localCardVersionHash[key]
			// 					 + "; server: " + this.serverCardVersionHash[key] + "\n");
			var serverVersion = this.serverListVersionHash[key];
			var localVersion = 0;
			if (typeof(this.localListVersionHash[key]) != "undefined")
				localVersion = this.localListVersionHash[key];

			if (localVersion != serverVersion
					&& localVersion != "-1") {
				this.serverListDataHash[key] = "";
				this.serverListDataHash.size++;
			}
		}
	},
 downloadVcards: function() {
		// 		dump("downloadVcards\n");
		this.remainingDownloads = 0;
		if (this.serverCardDataHash.size > 0) {
			for (var key in this.serverCardDataHash)
				if (key != "size")
					this.downloadVcardAsync(key);
		}
		else {
			this.pendingOperations--;
			//  			dump("decreasing 1 pendingOperations...\n");
			this._checkCallback();
		}
	},
 // Downloads asyncronously a vcard from the GroupDAV server and stores it in serverCardDataHash
 downloadVcardAsync: function(key) {
		var fileUrl = this.gURL + key;
		var data = {query: "vcard-download",
								data: key};
		this.remainingDownloads++;
		var request = new sogoWebDAV(fileUrl, this, data);
		request.get();
	},
 downloadLists: function() {
 		dump("downloadLists\n");
		this.remainingDownloads = 0;
		if (this.serverListDataHash.size > 0) {
			for (var key in this.serverListDataHash)
				if (key != "size")
					this.downloadListAsync(key);
		}
		else {
			this.pendingOperations--;
			//  			dump("decreasing 2 pendingOperations...\n");
			this._checkCallback();
		}
	},
 // Downloads asyncronously a vcard from the GroupDAV server and stores it in serverCardDataHash
 downloadListAsync: function(key) {
		dump("downloadListAsync: " + key + "\n");
		var fileUrl = this.gURL + key;
		var data = {query: "list-download",
								data: key};
		this.remainingDownloads++;
		var request = new sogoWebDAV(fileUrl, this, data);
		request.get();
	},
 onDAVQueryComplete: function(status, data, cbdata) {
		//  		dump("onDavQueryComplete: " + cbdata.query + "\n");
		if (cbdata.query == "vcard-download")
			this.onVCardDownloadComplete(status, data, cbdata.data);
		else if (cbdata.query == "list-download")
			this.onListDownloadComplete(status, data, cbdata.data);
		else if (cbdata.query == "server-check-propfind")
			this.onServerCheckComplete(status, data, cbdata.data);
		else if (cbdata.query == "server-propfind")
			this.onServerHashQueryComplete(status, data, cbdata.data);
		else if (cbdata.query == "card-upload")
			this.onCardUploadComplete(status, data, cbdata.key, cbdata.data);
		else if (cbdata.query == "card-propfind")
			this.onCardPropfindComplete(status, data, cbdata.key, cbdata.data);
		else if (cbdata.query == "list-upload")
			this.onListUploadComplete(status, data, cbdata.key, cbdata.data);
		else if (cbdata.query == "list-propfind")
			this.onListPropfindComplete(status, data, cbdata.key, cbdata.data);
		else
			throw("unknown query: " + cbdata.query);
	},
 onVCardDownloadComplete: function(status, data, key) {
		this.remainingDownloads--;
		this.progressMgr.updateAddressBook(this.gURL);
		if (Components.isSuccessCode(status)
				&& data
				&& (data.toLowerCase().indexOf("begin:vcard") == 0)) {
			// 			logInfo("download data: " + data);
			this.serverCardDataHash[key] = data;
			this._importCard(key, data);
		}
		else
			this.callbackFailures.push(key);

		if (this.remainingDownloads == 0) {
			this._commitAddrDB();
			this.pendingOperations--;
			//  			dump("decreasing 3 pendingOperations...\n");
			this._checkCallback();
		}
	},
 onListDownloadComplete: function(status, data, key) {
		this.remainingDownloads--;
		this.progressMgr.updateAddressBook(this.gURL);
		if (Components.isSuccessCode(status)
				&& data
				&& (data.toLowerCase().indexOf("begin:vlist") == 0)) {
			// 			logInfo("download data: " + data);
			this.serverListDataHash[key] = data;
			this._importList(key, data);
		}
		else
			this.callbackFailures.push(key);
		if (this.remainingDownloads == 0) {
			this.pendingOperations--;
			//  			dump("decreasing 4 pendingOperations...\n");
			this._checkCallback();
		}
	},
 onCardUploadComplete: function(status, data, key, card) {
		if (status > 199
				&& status < 400) {
			var cardURL = this.gURL + key;
			var rqData = {query: "card-propfind",
										data: card,
										key: key};
			var request = new sogoWebDAV(cardURL, this, rqData, false);
			request.propfind(["DAV: getetag"]);
		}
		else {
			this.progressMgr.updateAddressBook(this.gURL);
			this.remainingUploads--;
			dump("Upload failure, the server could not process the card (google the HTTP status code for more information).\n\n\n"  + "Server HTTP Status Code:"+ status );
			// 			if (isNew) {	// for new cards check if we got a location header
			// 				var location = httpChannel.getResponseHeader("location");
			// 				if (location && location.lastIndexOf('/') >= 0) {	// new url/key via location header
			// 					state += "<location>" + location.substr(location.lastIndexOf('/')+1) + "</location>";
			// 				}
			// 			}
		}
		if (this.remainingUploads == 0) {
			this._commitAddrDB();
			this.pendingOperations--;
			//  			dump("decreasing 5 pendingOperations...\n");
			this._checkCallback();
		}
	},
 onCardPropfindComplete: function(status, response, key, card) {
		// 		dump("oncardpropfindcomplete: " + key + "\n");
		if (status > 199 && status < 400) {
			var mdbCard = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
			var cardURL = this.gURL + key;
			if (response[cardURL]) {
				var etag = response[cardURL]["DAV: getetag"];
			// 			dump("etag: " + etag + "\n");
				var oldKey = mdbCard.getStringAttribute("groupDavKey");
				var isNew = (!oldKey || oldKey == "");
				if (isNew)
					mdbCard.setStringAttribute("groupDavKey", key);
			// 			dump("cardpfindcomplete: " + key + "; version: " + etag + "\n");
				mdbCard.setStringAttribute("groupDavVersion", etag);
			// 			card.copy(mdbCard);

			// 			dump("new etag: " + card.getStringAttribute("groupDavVersion") + "\n");
			// 			dump("new etag: " + card.getStringAttribute("groupDavKey") + "\n");
				mdbCard.editCardToDatabase(this.gSelectedDirectoryURI);
				this.serverCardVersionHash[key] = etag;
			// 		dump("key: " + key + "; status: " + status + "; data: " + data +
			// 		"\n");
			}
			else
				dump("No etag returned for vcard uploaded at " + cardURL + ", ignored\n");
		}
		this.progressMgr.updateAddressBook(this.gURL);
		this.remainingUploads--;
		if (this.remainingUploads == 0) {
			this._commitAddrDB();
			this.pendingOperations--;
			//  			dump("decreasing 6 pendingOperations...\n");
			this._checkCallback();
		}
	},
 _commitAddrDB: function() {
		var prefId;
		if (this.gSelectedDirectoryURI == "moz-abmdbdirectory://abook.mab")
			prefId = "pab";
		else
			prefId = this.gAddressBook.directoryProperties.prefName;

		var prefService = (Components.classes["@mozilla.org/preferences-service;1"]
											 .getService(Components.interfaces.nsIPrefBranch));
		var fileName = prefService.getCharPref(prefId + ".filename");
		// 		dump("commit: " + fileName + "\n");
		var ab = Components.classes["@mozilla.org/addressbook;1"]
		.createInstance(Components.interfaces.nsIAddressBook);
		var abDb = ab.getAbDatabaseFromURI("moz-abmdbdirectory://" + fileName);
		abDb.close(true);
	},
 _importCard: function(key, data) {
		var vcardFieldsArray = {};  //To handle fbURL from SOGo(freebusy) and vcards fields that have no equivalent in Thunderbird.
		vcardFieldsArray["groupDavVcardCompatibility"] = "";

		if (!this.serverCardVersionHash[key]) {
			var string = ("Missing card key '" + key + "' from hash"
										+ " 'this.serverCardVersionHash'.\n"
										+ "Valid keys are:\n");
			for (var validKey in this.serverCardVersionHash)
				string += "  " + validKey;
			throw string;
		}

		var card = importFromVcard(data, vcardFieldsArray);
		var savedCard;
		// 		logDebug("groupDavVcardCompatibility value:\n" + vcardFieldsArray["groupDavVcardCompatibility"]);
		card.setStringAttribute("groupDavKey", key);
		card.setStringAttribute("groupDavVersion",
														this.serverCardVersionHash[key]);
		// 			logInfo("vcardFieldsArray: " + dumpObject(vcardFieldsArray));
		card.setStringAttribute("calFBURL", vcardFieldsArray["fburl"]);
		card.setStringAttribute("groupDavVcardCompatibility",
														vcardFieldsArray["groupDavVcardCompatibility"]);
 
 		if (this.localCardPointerHash[key]) {
			this.localCardPointerHash[key].copy(card);
			savedCard = this.localCardPointerHash[key];
			// 			var savedCard = this.gAddressBook.addCard(card).QueryInterface(Components.interfaces.nsIAbMDBCard);
			// 			this.gAddressBook.dropCard(savedCard);
			// 			var directory
			// 			dump("replacing local card with server card\n");
			// 			// Replace local card with server card
			// 			this.localCardPointerHash[key].copy(card);
			// 			dump("replace test: "
			// 					 + this.localCardPointerHash[key].getStringAttribute("groupDavKey")
			// 					 + "; server key: " + key + "\n");
 		}
		else {
			// 			dump("adding new server card\n");
			// add the server card
			// 			dump("!!!!!!!!!!!!!! :" + this.gSelectedDirectoryURI + "\n");
			var newCard = Components.classes["@mozilla.org/addressbook/moz-abmdbcard;1"]
			.createInstance(Components.interfaces.nsIAbCard);
			newCard.copy(card);
			// 			var savedCard = 
			savedCard = this.gAddressBook.addCard(newCard)
			.QueryInterface(Components.interfaces.nsIAbMDBCard);
			this.localCardPointerHash[key] = savedCard;
		}
		savedCard.setStringAttribute("groupDavKey", key);
		savedCard.setStringAttribute("groupDavVersion",
																 this.serverCardVersionHash[key]);
		// 			logInfo("vcardFieldsArray: " + dumpObject(vcardFieldsArray));
		savedCard.setStringAttribute("calFBURL", vcardFieldsArray["fburl"]);
		savedCard.setStringAttribute("groupDavVcardCompatibility",
																 vcardFieldsArray["groupDavVcardCompatibility"]);
		savedCard.editCardToDatabase(this.gSelectedDirectoryURI);
		// 			savedCard.setStringAttribute("groupDavVersion",
		// 																	 this.serverCardVersionHash[key]);
		// 			savedCard.setStringAttribute("groupDavKey", key);
		// 			savedCard.editCardToDatabase(this.gSelectedDirectoryURI);
		// 			.QueryInterface(Components.interfaces.nsIAbMDBCard);
		// 			savedCard.editCardToDatabase(this.gSelectedDirectoryURI);
		// 			dump("new test: "
		// 					 + savedCard.getStringAttribute("groupDavKey")
		// 					 + "; server key: " + key + "\n");
		// 			dump("version: " + savedCard.getStringAttribute("groupDavVersion") + "\n");
		// 		}

		// 		logDebug("importFromVcard() completed");
		// 		logDebug("//TODO: do a propfind to make sure the version no. (etag) has not changed.");
	},
 _getLastMailingList: function() {
		var last = null;
		
		var nodes = this.gAddressBook.childNodes;
		while (nodes.hasMoreElements())
			last = nodes.getNext();
		
		return last;
	},
 _importList: function(key, data) {
		if (!this.serverListVersionHash[key]) {
			var string = ("Missing list key '" + key + "' from hash"
										+ " 'this.serverListVersionHash'.\n"
										+ "Valid keys are:\n");
			for (var validKey in this.serverListVersionHash)
				string += "  " + validKey;
			throw string;
		}

		var listCards;

		var list = this.localListPointerHash[key];
		var isNew;
		if (list) {
			isNew = false;
			listCards = SCGetChildCards(list);
			dump("updating list '" + key + "'\n");
		}
		else {
			isNew = true;
			dump("creating list '" + key + "'\n");
			list = Components.classes["@mozilla.org/addressbook/directoryproperty;1"]
			.createInstance(Components.interfaces.nsIAbDirectory);
			this.gAddressBook.addMailList(list);
			list = this._getLastMailingList();
			listCards = [];
		}
		var listUpdated = updateListFromVList(list, data, this.localCardPointerHash);

		var attributes = new GroupDAVListAttributes(list);
		if (isNew)
			attributes.key = key;
		attributes.version = (listUpdated ? "-1" : this.serverListVersionHash[key]);
	},
 onListUploadComplete: function(status, data, key, list) {
		if (status > 199 && status < 400) {
			var listURL = this.gURL + key;
			var rqData = {query: "list-propfind", data: list, key: key};
			var request = new sogoWebDAV(listURL, this, rqData, false);
			request.propfind(["DAV: getetag"]);
		}
		else {
			this.progressMgr.updateAddressBook(this.gURL);
			this.remainingUploads--;
			dump("Upload failure, the server could not process the list (google the HTTP status code for more information).\n\n\n"  + "Server HTTP Status Code:"+ status );
		}
		if (this.remainingUploads == 0) {
			this.pendingOperations--;
			//  			dump("decreasing 7 pendingOperations...\n");
			this._checkCallback();
		}
	},
 onListPropfindComplete: function(status, response, key, list) {
		// 		dump("onlistpropfindcomplete: " + key + "\n");
		if (status > 199 && status < 400) {
			var listURL = this.gURL + key;
 			dump("listURL: " + listURL + "\n");

			if (response[listURL]) {
				var etag = response[listURL]["DAV: getetag"];
				// 			dump("etag: " + etag + "\n");
				var attributes = new GroupDAVListAttributes(list);
				var oldKey = attributes.key;
				var isNew = (!oldKey || oldKey == "");
				if (isNew)
					attributes.key = key;
				attributes.version = etag;
				this.serverListVersionHash[key] = etag;
			}
			else
				dump("No etag returned for vlist uploaded at " + listURL + ", ignored\n");
		}
		this.progressMgr.updateAddressBook(this.gURL);
		this.remainingUploads--;
		if (this.remainingUploads == 0) {
			this.pendingOperations--;
			//  			dump("decreasing 8 pendingOperations...\n");
			this._checkCallback();
		}
	},
 onServerCheckComplete: function(status, response, key) {
		this.callbackCode = status;
		this.pendingOperations = 0;
		// 		dump("pendingOperations: " + this.pendingOperations + "\n");
// 		dump("status: " + status + "\n");
// 		dump("response: " + response + "\n");
// 		dump("dump:" + dumpObject(response) + "\n");
		if (status > 199 && status < 400) {
			for (var href in response) {
				var davObject = response[href];
				if (href[href.length-1] != '/')
					href += '/';
				if (href == this.gURL) {
					// 					dump("+++ href: " + href + "\n");
					var rsrcType = "" + davObject["DAV: resourcetype"];
					if (rsrcType.indexOf("vcard-collection") > 0
							|| rsrcType.indexOf("addressbook") > 0) {
						this.validCollection = true;
						var data = {query: "server-propfind"};
						var request = new sogoWebDAV(this.gURL, this, data);
						request.propfind(["DAV: getcontenttype", "DAV: getetag"]);
					}
					else {
						this.validCollection = false;
						this.context.requests[this.gURL] = null;
						this._checkCallback();
						throw ("server '" + this.gURL + "' is not a valid groupdav collection");
					}
				}
			}
		}
	},
 onServerHashQueryComplete: function(status, response, key) {
		this.callbackCode = status;
		this.pendingOperations = 0;

		if (response) {
			switch (status) {
			case 207:
			case 200: // Added to support Open-Xchange   
			// 		logDebug("=========Begin Server Cards List, url is: " + this.gURL);

				for (var href in response) {
					var davObject = response[href];
					if (href != this.gURL) {
						var contentType = "" + davObject["DAV: getcontenttype"];
						if (contentType.indexOf("text/x-vcard") == 0
								|| contentType.indexOf("text/vcard") == 0) {
							var version = davObject["DAV: getetag"];
							var cNameArray = href.split("/");
							var cName = cNameArray[cNameArray.length - 1];
							this.serverCardVersionHash[cName] = version;
							// 						dump(cName + " is vcard\n");
						//  				logDebug("\tServer Card key = " + cName + "\tversion = " + version);
						}
						else if (contentType.indexOf("text/x-vlist") == 0) {
							var version = davObject["DAV: getetag"];
							var cNameArray = href.split("/");
							var cName = cNameArray[cNameArray.length - 1];
							this.serverListVersionHash[cName] = version;
							//  				logDebug("\tServer Card key = " + cName + "\tversion = " + version);
							// 						dump(cName + " is vlist\n");
						}
						else {
							dump("unknown content-type: " + contentType + "(ignored)\n");
						}
					}
				}
				
			// 		logDebug("=========End Server Cards List");
				if (this.validCollection) {
					this.fillLocalHashes();
					this.fillLocalListHashes();
					this.compareCardVersions();//Has to be done first it modifies Local Hashes		
					this.compareListVersions();//Has to be done first it modifies Local Hashes		
					this.processCards();
				}
				break;
			case 401:
				this._checkCallback();
				logWarn("Warning!\n\n You either pressed Cancel instead of providing user and password or the server responded 401 for another reason.");
			//return;
				break;

			case 403:
				this._checkCallback();
				var msg = "Authentification failed or the user does not have permission to access the specified Address Book.\n\n  You will have to restart Thunderbird to authenticate again!";
				alert(msg);
				logWarn(msg);
				//return;
				break;

			default:
				this._checkCallback();
				throw "Error connecting to GroupDAV Server; response status: " + status;      
			}
		}
		else
			dump("onServerHashQueryComlete: the server returned an empty response\n");
	},
 processCards: function() {
		var total = (this.localCardAdditions.length
								 + this.localCardUpdates.length
								 + this.localListAdditions.length
								 + this.localListUpdates.length
								 + this.serverCardDataHash.size
								 + this.serverListDataHash.size);
		if (total > 0)
			this.progressMgr.registerAddressBook(this.gURL, total);

		if (this.mIsDrop) {
			this.pendingOperations = 1;
			// 			dump("pendingOperations: " + this.pendingOperations + "\n");
			this.uploadCards();
		}
		else {
			this.pendingOperations = 3;
			// 			dump("pendingOperations: " + this.pendingOperations + "\n");
			this.downloadVcards(); //asyncronuous
			this.uploadCards(); //asyncronous
			this.processCardDeletes();
		}
	},
 processLists: function() {
		if (this.mIsDrop) {
			this.pendingOperations = 1;
			// 			dump("pendingOperations: " + this.pendingOperations + "\n");
			this.uploadLists();
		}
		else {
			this.pendingOperations = 3;
			// 			dump("pendingOperations: " + this.pendingOperations + "\n");
			this.downloadLists(); //asyncronuous
			this.uploadLists(); //asyncronous
 			this.processListDeletes();
		}
	},
 uploadCards: function() {
		// 		dump("uploadCards\n");
		this.remainingUploads = 0;
		if (this.localCardUpdates.length
				+ this.localCardAdditions.length > 0) {
			this.uploadLocalCardAdditions(); //asyncronuous
			this.uploadLocalCardUpdates(); // asyncronuous
		}
		// 		else {
		// 			this.pendingOperations--;
		// 			dump("decreasing 10 pendingOperations...\n");
		// 			this._checkCallback();
		// 		}

		if (this.remainingUploads == 0) {
			this._commitAddrDB();
			this.pendingOperations--;
			//  			dump("decreasing 11 pendingOperations...\n");
			this._checkCallback();
		}
	},
 /* FIXME: the two next methods share some code that probably could be put in
		a common intermediary method */
 uploadLocalCardAdditions: function() {
		// 		dump("uploadLocalCardAdditions\n");
		this.remainingUploads += this.localCardAdditions.length;
		for (var i = 0; i < this.localCardAdditions.length; i++) {
			var vcard = card2vcard(this.localCardAdditions[i]);
			if (vcard) {
				var implementor = new SogoImpl();
				var key = implementor.getNewCardKey();
				var cardURL = this.gURL + key;
				var data = {query: "card-upload",
										data: this.localCardAdditions[i],
										key: key};
				dump("upload new card: " + cardURL + "\n");
				var request = new sogoWebDAV(cardURL, this, data);
				request.put(vcard, "text/x-vcard; charset=UTF-8");
			}
			else {
 				dump("new vcard could not be generated\n");
				this.progressMgr.updateAddressBook(this.gURL);
				this.remainingUploads--;
			}
		}
	},
 uploadLocalCardUpdates: function() {
		// 		dump("uploadLocalCardUpdates\n");
		this.remainingUploads += this.localCardUpdates.length;
		for (var i = 0; i < this.localCardUpdates.length; i++) {
			var card = this.localCardUpdates[i];
			var mdbCard = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
			var vcard = card2vcard(card);
			if (vcard) {
				var key = mdbCard.getStringAttribute("groupDavKey");
				var cardURL = this.gURL + key;
				var data = {query: "card-upload", data: card, key: key};
				dump("upload updated card: " + cardURL + "\n");
				var request = new sogoWebDAV(cardURL, this, data);
				request.put(vcard, "text/x-vcard; charset=UTF-8");
			}
			else {
 				dump("new vcard could not be generated for update\n");
				this.progressMgr.updateAddressBook(this.gURL);
				this.remainingUploads--;
			}
		}
	},
 uploadLists: function() {
		// 		dump("uploadLists\n");
		this.remainingUploads = 0;
		if (this.localListUpdates.length
				+ this.localListAdditions.length > 0) {
			this.uploadLocalListAdditions(); //asyncronuous
			this.uploadLocalListUpdates(); // asyncronuous
		}
		// 		else {
		// 			this.pendingOperations--;
		// 			dump("decreasing 12 pendingOperations...\n");
		// 			this._checkCallback();
		// 		}

		if (this.remainingUploads == 0) {
			this.pendingOperations--;
			//  			dump("decreasing 13 pendingOperations...\n");
			this._checkCallback();
		}
	},
 /* FIXME: the two next methods share some code that probably could be put in
		a common intermediary method */
 uploadLocalListAdditions: function() {
		// 		dump("uploadLocalCardAdditions\n");
		this.remainingUploads += this.localListAdditions.length;
		dump("uploading " + this.localListAdditions.length + " new lists\n");
		for (var i = 0; i < this.localListAdditions.length; i++) {
			var implementor = new SogoImpl();
			var key = implementor.getNewListKey();
			var vlist = list2vlist(key, this.localListAdditions[i]);
			if (vlist) {
				var listURL = this.gURL + key;
				var data = {query: "list-upload",
										data: this.localListAdditions[i],
										key: key};
				dump("upload new list: " + listURL + "\n");
				var request = new sogoWebDAV(listURL, this, data);
				request.put(vlist, "text/x-vlist; charset=UTF-8");
			}
			else {
 				dump("new vlist could not be generated\n");
				this.progressMgr.updateAddressBook(this.gURL);
				this.remainingUploads--;
			}
		}
		dump("\n\n\n");
	},
 uploadLocalListUpdates: function() {
		// 		dump("uploadLocalCardUpdates\n");
		this.remainingUploads += this.localListUpdates.length;
		dump("uploading " + this.localListUpdates.length + " updated lists\n");
		for (var i = 0; i < this.localListUpdates.length; i++) {
			var attributes = new GroupDAVListAttributes(this.localListUpdates[i]);
			var key = attributes.key;
			var vlist = list2vlist(key, this.localListUpdates[i]);
			if (vlist) {
				var listURL = this.gURL + key;
				var data = {query: "list-upload",
										data: this.localListUpdates[i],
										key: key};
				dump("upload updated list: " + listURL + "\n");
				var request = new sogoWebDAV(listURL, this, data);
				request.put(vlist, "text/x-vlist; charset=UTF-8");
			}
			else {
 				dump("new vcard could not be generated for update\n");
				this.progressMgr.updateAddressBook(this.gURL);
				this.remainingUploads--;
			}
		}
		dump("\n\n\n");
	},
 //  processConflicts: function() {
 // // 		dump("processConflicts\n");
 // // 		for (var key in this.conflictHash) {
 // // 			importFromVcard(this.serverCardDataHash[key], key, this.serverCardVersionHash[key],
 // // 											this.gSelectedDirectoryURI);
 // // 			//this.gAddressBook.dropCard(this.localCardPointerHash[key],false);
 // // 		}
 // 		this.processDeletes();
 // 		logWarn("TODO:\tCurrently, conflicts are simply overwritten by the server version.\n\t\t\t\t\t\t\tDeletes on the server are simply ignored at this point.");
 // 		this.pendingOperations--;
 // 		this._checkCallback();
 // 	},
 processCardDeletes: function() {
		var deletes = [];
		// 		var deleteListStringForTestPurposes = "";
		//Filling the Server deleted cards Hash
		for (var key in this.localCardPointerHash) {
			if (key != "size"
					&& this.serverCardVersionHash[key] == null)
				deletes.push(key);
		}
		//	if (groupdavPrefService.getAutoDeleteFromServer()){
		this._deleteCards(deletes);
		this.pendingOperations--;
		//  		dump("decreasing 14 pendingOperations...\n");
		this._checkCallback();
	},
 _deleteCards: function(deletes) {
		if (deletes.length) {
			var cards = Components.classes["@mozilla.org/supports-array;1"]
			.createInstance(Components.interfaces.nsISupportsArray);
			for (var i = 0; i < deletes.length; i++) {
				var card = this.localCardPointerHash[deletes[i]]
					.QueryInterface(Components.interfaces.nsIAbMDBCard);
				cards.AppendElement(card);
			}

			dump("delete from : " + this.gSelectedDirectoryURI + "\n");
			this.gAddressBook.deleteCards(cards);
		}
	},
 processListDeletes: function() {
		// 		var deleteListStringForTestPurposes = "";
		//Filling the Server deleted cards Hash
		for (var key in this.localListPointerHash) {
			if (key != "size"
					&& this.serverListVersionHash[key] == null) {
				var list = this.localListPointerHash[key];
				var attributes = new GroupDAVListAttributes(list);
				attributes.deleteRecord();
				dump("deleting list: " + key
						 + "; " + this.serverListVersionHash[key]
						 + "; " + this.localListVersionHash[key] + "\n");
				this.gAddressBook.deleteDirectory(list);
			}
		}
		//	if (groupdavPrefService.getAutoDeleteFromServer()){
		this.pendingOperations--;
		this._checkCallback();
	},
 _checkCallback: function() {
		// 		dump("\n\nthis = " + this.mCounter + "\n");
		// 		dump("this.processMode: " + this.processMode + "\n");
		// 		dump("_checkCallback: processMode: " + this.processMode + "\n");
		// 		dump("_checkCallback: pendingOperations: " + this.pendingOperations + "\n");
		if (this.pendingOperations < 0) {
			this.context.requests[this.gURL] = null;
			throw "Buggy situation! (pendingOperations)";
		}

		if (this.pendingOperations == 0) {
// 			dump("switching processMode!\n");
			if (this.processMode == 0) {
				this.processMode = 1;
				this.processLists();
			}
			else if (this.processMode == 1) {
				if (this.callback) {
// 					dump("this.callback: " + this.callback + "\n");
					this.callback(this.callbackCode, this.callbackFailures,
												this.callbackData);
				}

				var total = (this.localCardAdditions.length
										 + this.localCardUpdates.length
										 + this.localListAdditions.length
										 + this.localListUpdates.length
										 + this.serverCardDataHash.size
										 + this.serverListDataHash.size);
				if (total > 0)
					this.progressMgr.unregisterAddressBook(this.gURL);
				dump(this.mCounter +"/sync with " + this.gURL + " has ended.\n");
				this.context.requests[this.gURL] = null;
			}
			else
				throw "Buggy situation (processMode)!";
		}
	}
};

// This method was added to circumvent the card being deleted locally
// when doing a drag and drop from a Directory (read only)
// It does not process downloads from the server.
// This is not the optimal solution but it will do for now.
function SynchronizeGroupdavAddressbookDrop(uri) {
	var synchronizer = new GroupDavSynchronizer(uri, true);
	synchronizer.start();
}

function SynchronizeGroupdavAddressbook(uri, callback, callbackData) {
	dump("sync uri: " + uri + "\n");
	var synchronizer = new GroupDavSynchronizer(uri, false);
	dump("callback:" + callback + "\n");
	synchronizer.callback = callback;
	synchronizer.callbackData = callbackData;
	synchronizer.start();
}
