/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/*******************************************************************************
 sync.addressbook.groupdav.js
 
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
					 "chrome://inverse-library/content/uuid.js",
					 "chrome://sogo-connector/content/addressbook/folder-handling.js",
					 "chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js",
					 "chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js",
					 "chrome://sogo-connector/content/general/vcards.utils.js",
					 "chrome://sogo-connector/content/general/webdav.inverse.ca.js",
					 "chrome://sogo-connector/content/general/webdav_lib/webdavAPI.js"]);

/* pseudo-constants for ctag management:
   server side: fetch ctag + download operations + local ctag update
   client side: fetch ctag + download/upload operations + fetch ctag + local ctag update */
var SOGOC_UPDATES_NONE = 0;
var SOGOC_UPDATES_SERVERSIDE = 1;
var SOGOC_UPDATES_CLIENTSIDE = 2;

var SOGOC_PROCESS_CARDS = 0;
var SOGOC_PROCESS_LISTS = 1;
var SOGOC_PROCESS_FINALIZE = 2;

var sCounter = 0;
function GroupDavSynchronizer(uri) {
    if (typeof uri == "undefined" || !uri)
        throw "Missing 'uri' parameter";
    if (!isGroupdavDirectory(uri))
        throw "Specified addressbook cannot be synchronized";

    sCounter++;
    this.mCounter = sCounter;
    dump("new sync: " + this.mCounter + "\n");
    this.gSelectedDirectoryURI = uri;
    this.messengerWindow
        = Components.classes["@mozilla.org/appshell/window-mediator;1"]
        .getService(Components.interfaces.nsIWindowMediator)
        .getMostRecentWindow("mail:3pane");
    this.callbackCode = 0;
    this.callbackFailures = {};
    this.callback = null;
    this.callbackData = null;
    this.context = this.initGroupDAVContext();

    this.progressMgr = Components.classes["@inverse.ca/sync-progress-manager;1"]
        .getService(Components.interfaces.inverseIJSSyncProgressManager)
        .wrappedJSObject;
}

GroupDavSynchronizer.prototype = {
 processMode: SOGOC_PROCESS_CARDS,
 updatesStatus: SOGOC_UPDATES_NONE,
 context: null,
 progressMgr: null,
 callback: null,
 callbackCode: 0,
 callbackFailures: null,
 callbackData: null,
 remainingUploads: -1,
 remainingDownloads: -1,
 pendingOperations: -1,
 messengerWindow: null,

 localCardPointerHash: null,
 localCardVersionHash: null,    // stores the version no of the local cards
 localListPointerHash: null,
 localListVersionHash: null,

 serverDownloadsCount: 0,
 serverDownloads: null,
 serverDeletes: null,

 gURL: null,
 gDisplaySyncDialog: null,
 gSelectedDirectoryURI: null, // gAddressBook to synchronize
 gAddressBook: null,
 validCollection: false,     /* is addressbook a vcard-collection? */

 hasWebdavSync: false,
 webdavSyncToken: null,

 initGroupDAVContext: function() {
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
 prefService: function() {
        var prefId;
        if (this.gSelectedDirectoryURI == "moz-abmdbdirectory://abook.mab")
            prefId = "pab";
        else
            prefId = this.gAddressBook.directoryProperties.prefName;

        return new GroupdavPreferenceService(prefId);
    },
 initSyncVariables: function() {
        this.processMode = SOGOC_PROCESS_CARDS;
        this.updatesStatus = SOGOC_UPDATES_NONE;
        this.gAddressBook = SCGetDirectoryFromURI(this.gSelectedDirectoryURI);

        var groupdavPrefService = this.prefService();
        this.gURL = groupdavPrefService.getURL();
        this.gCTag = groupdavPrefService.getCTag();
        this.webdavSyncToken = groupdavPrefService.getWebdavSyncToken();

        this.localCardVersionHash = {};
        this.localListVersionHash = {};

        this.serverDownloadsCount = 0;
        this.serverDownloads = {};
        this.serverDeletes = [],

        this.localUploads = 0;
        this.localCardUploads = {};
        this.localListUploads = {};

        this.localCardPointerHash = {};
        this.localListPointerHash = {};

        this.callbackFailures = {};
    },
 // Fill the Local Directory data structures for the syncronization
 fillLocalCardHashes: function() {
        // 		dump("fillLocalCardHashes\n");
        var uploads = 0;
        var cards = SCGetChildCards(this.gAddressBook);
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i].QueryInterface(Components.interfaces.nsIAbCard);
            var mdbCard = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
            var key = mdbCard.getStringAttribute("groupDavKey");
            if (key && key != "") {
                // 				dump("card '" + card.displayName + "' will be updated\n");
                this.localCardPointerHash[key] = card;
                var version = mdbCard.getStringAttribute("groupDavVersion");
                this.localCardVersionHash[key] = version;
                if (version == "-1") {
                    this.localCardUploads[key] = card;
                    uploads++;
                }
                // dump("xxxx localcard: " + key + "; version: " + version + "\n");
            }
            else {
                // 				dump("card '" + card.displayName + "' will be added\n");
                //   				dump("xxxx local addition....\n");
                var key = new UUID() + ".vcf";
                this.localCardUploads[key] = card;
                uploads++;
            }
        }

        if (uploads > 0) {
            this.localUploads += uploads;
            this.updatesStatus |= SOGOC_UPDATES_CLIENTSIDE;
        }
    },
 fillLocalListHashes: function() {
        //  		dump("fillLocalListHashes\n");
        var lists = this.gAddressBook.childNodes;
        var uploads = 0;
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
                    dump("found old list: " + key
                         + "; version: " + attributes.version
                         + "\n");
                    if (attributes.version == "-1") {
                        dump("list '" + list.dirName + "' will be updated (" + key + ")\n");
                        this.localListUploads[key] = list;
                        uploads++;
                    }
                }
                else {
                    dump("list '" + list.dirName + "' will be added\n");
                    var key = new UUID() + ".vlf"
                        this.localListUploads[key] = list;
                    uploads++;
                }
            }
            else
                dump("strange: " + list + " is not a list!?\n");
        }
        dump("found " + count + " list\n");
    
        if (uploads > 0) {
            this.localUploads += uploads;
            this.updatesStatus |= SOGOC_UPDATES_CLIENTSIDE;
        }
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
        request.propfind(["DAV: resourcetype", "DAV: supported-report-set",
                          "http://calendarserver.org/ns/ getctag"], false);
    },
 downloadVcards: function() {
        dump("downloadVcards\n");
        this.remainingDownloads = 0;
        var hasDownloads = false;

        for (var key in this.serverDownloads) {
            var itemDict = this.serverDownloads[key];
            if (itemDict.type == "text/x-vcard"
                || itemDict.type == "text/vcard") {
                hasDownloads = true;
                var fileUrl = this.gURL + key;
                var data = {query: "vcard-download", data: key};
                this.remainingDownloads++;
                var request = new sogoWebDAV(fileUrl, this, data);
                request.get();
            }
        }

        if (!hasDownloads) {
            this.pendingOperations--;
            //  			dump("decreasing 1 pendingOperations...\n");
            this.checkCallback();
        }
    },
 downloadLists: function() {
        dump("downloadLists\n");
        this.remainingDownloads = 0;
        var hasDownloads = false;

        for (var key in this.serverDownloads) {
            var itemDict = this.serverDownloads[key];
            if (itemDict.type == "text/x-vlist") {
                //         dump(key + " is a list to download\n");
                hasDownloads = true;
                var fileUrl = this.gURL + key;
                var data = {query: "list-download", data: key};
                this.remainingDownloads++;
                var request = new sogoWebDAV(fileUrl, this, data);
                request.get();
            }
        }

        if (!hasDownloads) {
            this.pendingOperations--;
            //  			dump("decreasing 1 pendingOperations...\n");
            this.checkCallback();
        }
    },
 onDAVQueryComplete: function(status, response, headers, data) {
        this.callbackCode = status;
        //     dump("request status: " + status + "\n");
        if (data.query == "vcard-download")
            this.onCardDownloadComplete(status, response, data.data);
        else if (data.query == "list-download")
            this.onListDownloadComplete(status, response, data.data);
        else if (data.query == "server-check-propfind")
            this.onServerCheckComplete(status, response);
        else if (data.query == "server-propfind")
            this.onServerHashQueryComplete(status, response);
        else if (data.query == "server-sync-query")
            this.onServerSyncQueryComplete(status, response);
        else if (data.query == "card-upload")
            this.onCardUploadComplete(status, response, data.key, data.data, headers);
        else if (data.query == "list-upload")
            this.onListUploadComplete(status, response, data.key, data.data, headers);
        else if (data.query == "server-finalize-propfind")
            this.onServerFinalizeComplete(status, response);
        else
            throw("unknown query: " + data.query);
    },
 abort: function() {
        dump("Unacceptable status code: " + this.callbackCode + ". We abort.\n");
        this.pendingOperations = 0;
        this.checkCallback();
    },

 appendFailure: function(status, data) {
        var failures = this.callbackFailures[status];
        if (!failures) {
            failures = [];
            this.callbackFailures[status] = failures;
        }
        failures.push(data);
    },

 onCardDownloadComplete: function(status, data, key) {
        this.remainingDownloads--;
        this.progressMgr.updateAddressBook(this.gURL);
        if (Components.isSuccessCode(status)
            && data
            && (data.toLowerCase().indexOf("begin:vcard") == 0))
            this.importCard(key, data);
        else
            this.appendFailure(status, key);

        if (this.remainingDownloads == 0) {
            this.pendingOperations--;
            //  			dump("decreasing 3 pendingOperations...\n");
            this.checkCallback();
        }
    },
 onListDownloadComplete: function(status, data, key) {
        this.remainingDownloads--;
        this.progressMgr.updateAddressBook(this.gURL);
        if (Components.isSuccessCode(status)
            && data
            && (data.toLowerCase().indexOf("begin:vlist") == 0))
            this.importList(key, data);
        else
            this.appendFailure(status, key);
        if (this.remainingDownloads == 0) {
            this.pendingOperations--;
            //  			dump("decreasing 4 pendingOperations...\n");
            this.checkCallback();
        }
    },
 onCardUploadComplete: function(status, data, key, card, headers) {
        var cardURL = this.gURL + key;

        if (status > 199 && status < 400) {
            var etag = headers["etag"];
            if (etag && etag.length) {
                var mdbCard = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
                var oldKey = mdbCard.getStringAttribute("groupDavKey");
                var isNew = (!oldKey || oldKey == "");
                if (isNew) {
                    var location = headers["location"];
                    if (location && location.length) {
                        var parts = location[0].split("/");
                        key = parts[parts.length-1];
                    }
                    mdbCard.setStringAttribute("groupDavKey", key);
                }
                mdbCard.setStringAttribute("groupDavVersion", etag);
                mdbCard.editCardToDatabase(this.gSelectedDirectoryURI);
            }
            else
                dump("No etag returned for vcard uploaded at " + cardURL + ", ignored\n");
        }
        else {
            this.appendFailure(status, card);
            dump("Upload failure uploading card: " + cardURL
                 + ".\nHTTP Status Code:" + status + "\n");
        }

        this.progressMgr.updateAddressBook(this.gURL);
        this.remainingUploads--;
        if (this.remainingUploads == 0) {
            this.pendingOperations--;
            this.checkCallback();
        }
    },
 commitAddrDB: function() {
        var prefId;
        if (this.gSelectedDirectoryURI == "moz-abmdbdirectory://abook.mab")
            prefId = "pab";
        else
            prefId = this.gAddressBook.directoryProperties.prefName;

        // 		dump("PrefId: " + prefId + "\n");
        var prefService = (Components.classes["@mozilla.org/preferences-service;1"]
                           .getService(Components.interfaces.nsIPrefBranch));
        var fileName = prefService.getCharPref(prefId + ".filename");
        // 		dump("commit: " + fileName + "\n");
        var ab = Components.classes["@mozilla.org/addressbook;1"]
        .createInstance(Components.interfaces.nsIAddressBook);
        var abDb = ab.getAbDatabaseFromURI("moz-abmdbdirectory://" + fileName);
        abDb.close(true);
    },
 commitPreferences: function() {
        var prefService = (Components.classes["@mozilla.org/preferences-service;1"]
                           .getService(Components.interfaces.nsIPrefBranch));
        prefService.savePrefFile(null);
    },
 importCard: function(key, data) {
        var vcardFieldsArray = {};  //To handle fbURL from SOGo(freebusy) and vcards fields that have no equivalent in Thunderbird.
        vcardFieldsArray["groupDavVcardCompatibility"] = "";

        if (!this.serverDownloads[key]) {
            var string = ("Missing card key '" + key + "' from hash"
                          + " 'this.serverDownloads'.\n"
                          + "Valid keys are:\n");
            for (var validKey in this.serverDownloads)
                string += "  " + validKey;
            throw string;
        }

        var card = importFromVcard(data, vcardFieldsArray);
        var savedCard;
        card.setStringAttribute("groupDavKey", key);
        card.setStringAttribute("groupDavVersion",
                                this.serverDownloads[key].etag);
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
        /* TODO: remove this? */
        savedCard.setStringAttribute("groupDavKey", key);
        savedCard.setStringAttribute("groupDavVersion",
                                     this.serverDownloads[key].etag);
        savedCard.setStringAttribute("calFBURL", vcardFieldsArray["fburl"]);
        savedCard.setStringAttribute("groupDavVcardCompatibility",
                                     vcardFieldsArray["groupDavVcardCompatibility"]);

        savedCard.editCardToDatabase(this.gSelectedDirectoryURI);
        // 			dump("new test: "
        // 					 + savedCard.getStringAttribute("groupDavKey")
        // 					 + "; server key: " + key + "\n");
        // 			dump("version: " + savedCard.getStringAttribute("groupDavVersion") + "\n");
        // 		}
    },
 getLastMailingList: function() {
        var last = null;
		
        var nodes = this.gAddressBook.childNodes;
        while (nodes.hasMoreElements())
            last = nodes.getNext();
		
        return last;
    },
 importList: function(key, data) {
        if (!this.serverDownloads[key]) {
            var string = ("Missing list key '" + key + "' from hash"
                          + " 'this.serverDownloads'.\n"
                          + "Valid keys are:\n");
            for (var validKey in this.serverDownloads)
                string += "  " + validKey;
            throw string;
        }

        var listCards;

        var list = this.localListPointerHash[key];
        var isNew;
        if (list) {
            isNew = false;
            listCards = SCGetChildCards(list);
            // 			dump("updating local list '" + key + "'\n");
        }
        else {
            isNew = true;
            // 			dump("creating local list '" + key + "'\n");
            list = Components.classes["@mozilla.org/addressbook/directoryproperty;1"]
            .createInstance(Components.interfaces.nsIAbDirectory);
            this.gAddressBook.addMailList(list);
            list = this.getLastMailingList();
            listCards = [];
        }
        var listUpdated = updateListFromVList(list, data,
                                              this.localCardPointerHash);

        var attributes = new GroupDAVListAttributes(list);
        if (isNew)
            attributes.key = key;
        attributes.version = (listUpdated ? "-1" : this.serverDownloads[key].etag);
    },
 onListUploadComplete: function(status, data, key, list, headers) {
        var listURL = this.gURL + key;

        if (status > 199 && status < 400) {
            var etag = headers["etag"];
            if (etag && etag.length) {
                var attributes = new GroupDAVListAttributes(list);
                var oldKey = attributes.key;
                var isNew = (!oldKey || oldKey == "");
                if (isNew)
                    attributes.key = key;
                attributes.version = etag;
            }
            else
                dump("No etag returned for vlist uploaded at " + listURL + ", ignored\n");
        }
        else {
            this.appendFailure(status, list);
            dump("Upload failure uploading list: " + listURL
                 + ".\nHTTP Status Code:" + status + "\n");
        }

        this.progressMgr.updateAddressBook(this.gURL);
        this.remainingUploads--;
        if (this.remainingUploads == 0) {
            this.pendingOperations--;
            this.checkCallback();
        }
    },
 cleanedUpHref: function(origHref) {
        // href might be something like: http://foo:80/bar while this.gURL might
        // be something like: http://foo/bar so we strip the port value if the URLs
        // don't match. eGroupWare sends back such data.

        var hrefArray = origHref.split("/");
        var noprefix = false;
        // 		dump("hrefArray: " + hrefArray + "\n");

        if (hrefArray[0].substr(0,5) == "https"
            && hrefArray[2].indexOf(":443") > 0) {
            hrefArray[2] = hrefArray[2].substring(0, hrefArray[2].length-4);
        }
        else if (hrefArray[0].substr(0,4) == "http"
                 && hrefArray[2].indexOf(":80") > 0) {
            hrefArray[2] = hrefArray[2].substring(0, hrefArray[2].length-3);
        } else {
            noprefix = true;
        }
        href = hrefArray.join("/");

        // We also check if this.gURL begins with http{s}:// but NOT href. If
        // that's the case, with servers such as OpenGroupware.org (OGo), we
        // prepend the relevant part.
        //
        // For example, this.gURL could be:
        // http://foo.bar/zidestore/dav/fred/public/Contacts/
        // while href is:
        // /dav/fred/public/Contacts/
        //
        if (noprefix && this.gURL.substr(0,4) == "http") {
            var gURLArray = this.gURL.split("/");
            href = gURLArray[0] + "//" + gURLArray[2] + href;
        }

        // 		dump("Cleaned up href: " + href + "\n");

        return href;
    },
 onServerCheckComplete: function(status, jsonResponse) {
        this.pendingOperations = 0;
        // 		dump("pendingOperations: " + this.pendingOperations + "\n");
        //  		dump("status: " + status + "\n");
        //  		dump("response: " + response + "\n");

        if (status > 199 && status < 400) {
            var responses = jsonResponse["multistatus"][0]["response"];
            for each (var response in responses) {
                var href = response["href"][0];
                var propstats = response["propstat"];
                for each (var propstat in propstats) {
                    if (propstat["status"][0].indexOf("HTTP/1.1 200") == 0) {
                        if (href[href.length-1] != '/')
                            href += '/';
                        if (href != this.gURL)
                            href = this.cleanedUpHref(href);
                        
                        var prop = propstat["prop"][0];
                        if (href == this.gURL) {
                            var rsrcType = prop["resourcetype"][0];
                            if (rsrcType["vcard-collection"]
                                || rsrcType.indexOf["addressbook"]) {
                                this.validCollection = true;
                                
                                var reports = prop["supported-report-set"][0]["report"];
                                var i = 0;
                                while (!this.hasWebdavSync && i < reports.length) {
                                    if (reports[i]["sync-collection"])
                                        this.hasWebdavSync = true;
                                    else
                                        i++;
                                }
                                
                                /* we "load" the local card keys and etags here */
                                this.fillLocalCardHashes();
                                this.fillLocalListHashes();
                                
                                var newCTag = prop["getctag"][0];
                                if (newCTag && newCTag == this.gCTag) {
                                    //                   dump("ctag matches or drop operation\n");
                                    this.processCards();
                                }
                                else {
                                    //                   dump("ctag does not match\n");
                                    this.updatesStatus = SOGOC_UPDATES_SERVERSIDE;
                                    this.newCTag = newCTag;
                                    this.checkServerUpdates();
                                }
                            }
                            else {
                                this.validCollection = false;
                                this.context.requests[this.gURL] = null;
                                this.checkCallback();
                                dump("server '" + this.gURL
                                     + "' is not a valid groupdav collection");
                            }
                        } else {
                            dump("URLs don't match: " + href + " vs. " + this.gURL  + "\n");
                        }
                    }
                }
            }
        }
        else {
            this.abort();
        }
    },
 checkServerUpdates: function() {
        if (this.hasWebdavSync) {
            var syncQuery = ('<?xml version="1.0"?>'
                             + '<sync-collection xmlns="DAV:">'
                             + ((this.webdavSyncToken.length)
                                ? ('<sync-token>'
                                   + this.webdavSyncToken
                                   + '</sync-token>')
                                : '<sync-token/>')
                             + '<prop><getetag/><getcontenttype/></prop>'
                             + '</sync-collection>');
            var data = {query: "server-sync-query"};
            var request = new sogoWebDAV(this.gURL, this, data);
            request.requestJSONResponse = true;
            request.report(syncQuery, true);
        }
        else {
            var data = {query: "server-propfind"};
            var request = new sogoWebDAV(this.gURL, this, data);
            request.propfind(["DAV: getcontenttype", "DAV: getetag"]);
        }
    },
 onServerHashQueryComplete: function(status, jsonResponse) {
        //     dump("onServerHashQueryComplete\n");
        this.pendingOperations = 0;

        var reportedKeys = {};

        if (jsonResponse) {
            if (status > 199 && status < 400) {
                var responses = jsonResponse["multistatus"][0]["response"];
                for each (var response in responses) {
                    var href = response["href"][0];
                    var propstats = response["propstat"];
                    for each (var propstat in propstats) {
                        if (propstat["status"][0].indexOf("HTTP/1.1 200") == 0) {
                            var prop = propstat["prop"][0];
                            if (href != this.gURL) {
                                var contType = prop["getcontenttype"][0];
                                if (contType == "text/x-vcard"
                                    || contType == "text/vcard"
                                    || contType == "text/x-vlist") {
                                    // 						dump(key + " is vcard\n");
                                    var version = prop["getetag"][0];
                                    var keyArray = href.split("/");
                                    var key = keyArray[keyArray.length - 1];
                                    
                                    reportedKeys[key] = true;

                                    var itemDict = { etag: version, type: contType };
                                    if (this.localCardPointerHash[key]
                                        || this.localListPointerHash[key]) {
                                        var localVersion = this.localCardVersionHash[key];
                                        if (!localVersion)
                                            localVersion = this.localListVersionHash[key];
                                        /* the local version has precedence over server */
                                        dump("[sogo-connector] local version: " + localVersion
                                             + "\n");
                                        if (localVersion != "-1" && localVersion != version) {
                                            dump("  added to downloads\n");
                                            this.serverDownloads[key] = itemDict;
                                            this.serverDownloadsCount++;
                                        }
                                    }
                                    else {
                                        dump("[sogo-connector] new card added to downloads: " +
                                             key + "\n");
                                        this.serverDownloads[key] = itemDict;
                                        this.serverDownloadsCount++;
                                    }
                                }
                                else {
                                    dump("unknown content-type: " + contType + "(ignored)\n");
                                }
                            }
                        }
                    }
                }

                if (this.validCollection) {
                    /* all keys that were not reported and that were not "modified",
                       must be deleted. */
                    for (var key in this.localCardVersionHash) {
                        var localVersion = this.localCardVersionHash[key];
                        if (localVersion != "-1" && !reportedKeys[key])
                            this.serverDeletes.push(key);
                    }
                    for (var key in this.localListVersionHash) {
                        var localVersion = this.localListVersionHash[key];
                        if (localVersion != "-1" && !reportedKeys[key])
                            this.serverDeletes.push(key);
                    }
                    this.processCards();
                }
            }
            else
                this.abort();
        }
        else
            dump("onServerHashQueryComlete: the server returned an empty response\n");
    },

 onServerSyncQueryComplete: function(status, jsonResponse) {
        //     dump("onServerSyncQueryComplete\n");
        this.pendingOperations = 0;

        if (jsonResponse) {
            if (status > 199 && status < 400) {
                this.newWebdavSyncToken
                    = jsonResponse["multistatus"][0]["sync-token"][0];
                var responses = jsonResponse["multistatus"][0]["sync-response"];
                for each (var response in responses) {
                    var href = response["href"][0];
                    var keyArray = href.split("/");
                    var key = keyArray[keyArray.length - 1];

                    var itemStatus = response["status"][0].substr(9, 3);
                    if (itemStatus == "200" || itemStatus == "201") {
                        var propstats = response["propstat"];
                        for each (var propstat in propstats) {
                            var propStatus = propstat["status"][0].substr(9, 3);
                            if (propStatus == "200") {
                                var prop = propstat["prop"][0];
                                if (href != this.gURL) {
                                    var contType = prop["getcontenttype"][0];
                                    if (contType == "text/x-vcard"
                                        || contType == "text/vcard"
                                        || contType == "text/x-vlist") {
                                        var version = prop["getetag"][0];
                                        var itemDict = { etag: version, type: contType };
                                        dump("item: " + key + "; etag: " + version + "; type: "
                                             + contType + "\n");
                                        if (itemStatus == "201") {
                                            /* we won't download "new" cards if we already have them,
                                               otherwise we will end up with duplicated instances. */
                                            if (!(this.localCardPointerHash[key]
                                                  || this.localListPointerHash[key])) {
                                                //                         dump("adopting: " + key + "\n");
                                                this.serverDownloads[key] = itemDict;
                                                this.serverDownloadsCount++;
                                            }
                                            else {
                                                var localVersion = this.localCardVersionHash[key];
                                                if (!localVersion)
                                                    localVersion = this.localListVersionHash[key];
                                                if (!localVersion || localVersion != version) {
                                                    dump("new card/list " + key + " declared as new"
                                                         + " from server, with a local copy but"
                                                         + " with a different version.");
                                                    this.serverDownloads[key] = itemDict;
                                                    this.serverDownloadsCount++;
                                                }
                                                else
                                                    dump("skipped " + key + "\n");
                                            }
                                        }
                                        else {
                                            var localVersion = this.localCardVersionHash[key];
                                            if (!localVersion)
                                                localVersion = this.localListVersionHash[key];
                                            if (localVersion) {
                                                /* If the local version already matches the server
                                                   version, we skip its update. */
                                                dump("[sogo-connector] local version: " + localVersion
                                                     + "\n");
                                                if (localVersion != "-1" && localVersion != version) {
                                                    dump("  added to downloads\n");
                                                    this.serverDownloads[key] = itemDict;
                                                    this.serverDownloadsCount++;
                                                }
                                                else
                                                    dump("  skipped\n");
                                            }
                                            else {
                                                /* If the local version of the card doesn't even
                                                   exist, which should never happen, we download the card
                                                   anew. */
                                                this.serverDownloads[key] = itemDict;
                                                this.serverDownloadsCount++;
                                                dump("[sogo-connector] a card considered updated"
                                                     + " was not found locally.\n");
                                            }
                                        }
                                    }
                                    else
                                        dump("unknown content-type: " + contType + "(ignored)\n");
                                }
                            }
                        }
                    }
                    else if (itemStatus == "404") {
                        if (this.localCardPointerHash[key]
                            || this.localListPointerHash[key])
                            this.serverDeletes.push(key);
                    }
                }

                if (this.validCollection)
                    this.processCards();
            }
            else
                this.abort();
        }
        else
            dump("onServerHashQueryComlete: the server returned an empty response\n");
    },

 processCards: function() {
        // 		dump("processCards...\n");
        var total = (this.localUploads
                     + this.serverDownloadsCount
                     + this.serverDeletes.length);
        if (total > 0)
            this.progressMgr.registerAddressBook(this.gURL, total);

        // 		dump("  total: " + total + "\n");
        // 		dump("  this.updatesStatus: " + this.updatesStatus + "\n");
        if (this.updatesStatus == SOGOC_UPDATES_CLIENTSIDE) {
            this.pendingOperations = 1;
            // 			dump("pendingOperations: " + this.pendingOperations + "\n");
            this.uploadCards();
        }
        else if ((this.updatesStatus & SOGOC_UPDATES_SERVERSIDE)) {
            this.pendingOperations = 3;
            // 			dump("pendingOperations: " + this.pendingOperations + "\n");
            this.downloadVcards(); //asyncronuous
            this.uploadCards(); //asyncronous
            this.processCardDeletes();
        }
        else
            this.checkCallback();
    },
 uploadCards: function() {
        // 		dump("uploadCards\n");
        this.remainingUploads = 0;

        for (var key in this.localCardUploads) {
            var card = this.localCardUploads[key]
                .QueryInterface(Components.interfaces.nsIAbCard);
            var mdbCard = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
            var vcard = card2vcard(card);
            if (vcard) {
                var cardURL = this.gURL + key;
                var data = {query: "card-upload", data: card, key: key};
                //         dump("upload new/updated card: " + cardURL + "\n");
                this.remainingUploads++;
                var request = new sogoWebDAV(cardURL, this, data);
                request.put(vcard, "text/x-vcard; charset=utf-8");
            }
            else {
                dump("new vcard could not be generated for update\n");
                this.progressMgr.updateAddressBook(this.gURL);
            }
        }

        if (this.remainingUploads == 0) {
            this.pendingOperations--;
            //  			dump("decreasing 11 pendingOperations...\n");
            this.checkCallback();
        }
    },

 processLists: function() {
        //     dump("processLists\n");
        if (this.updatesStatus == SOGOC_UPDATES_CLIENTSIDE) {
            this.pendingOperations = 1;
            // 			dump("pendingOperations: " + this.pendingOperations + "\n");
            this.uploadLists();
        }
        else if ((this.updatesStatus & SOGOC_UPDATES_SERVERSIDE)) {
            this.pendingOperations = 3;
            // 			dump("pendingOperations: " + this.pendingOperations + "\n");
            this.downloadLists(); //asyncronuous
            this.uploadLists(); //asyncronous
            this.processListDeletes();
        }
        else
            this.checkCallback();
    },
 uploadLists: function() {
        // 		dump("uploadLists\n");
        this.remainingUploads = 0;

        for (var key in this.localListUploads) {
            var vlist = list2vlist(key, this.localListUploads[key]);
            if (vlist) {
                var listURL = this.gURL + key;
                // 				dump("upload updated list: " + listURL + "\n");
                var data = {query: "list-upload",
                            data: this.localListUploads[key],
                            key: key};
                this.remainingUploads++;
                var request = new sogoWebDAV(listURL, this, data);
                request.put(vlist, "text/x-vlist; charset=utf-8");
            }
            else {
                dump("new vlist could not be generated for update\n");
                this.progressMgr.updateAddressBook(this.gURL);
            }
        }

        if (this.remainingUploads == 0) {
            this.pendingOperations--;
            //  			dump("decreasing 13 pendingOperations...\n");
            this.checkCallback();
        }
    },

 processCardDeletes: function() {
        // 		dump("processCardDeletes\n");
        var deletes = [];
        for each (var key in this.serverDeletes) {
            if (this.localCardPointerHash[key])
                deletes.push(key);
        }
        this.deleteCards(deletes);
        this.pendingOperations--;
        //  		dump("decreasing 14 pendingOperations...\n");
        this.checkCallback();
    },
 deleteCards: function(deletes) {
        if (deletes.length) {
            var cards = Components.classes["@mozilla.org/supports-array;1"]
            .createInstance(Components.interfaces.nsISupportsArray);
            for (var i = 0; i < deletes.length; i++) {
                var card = this.localCardPointerHash[deletes[i]]
                    .QueryInterface(Components.interfaces.nsIAbMDBCard);
                cards.AppendElement(card);
            }

            // 			dump("delete from : " + this.gSelectedDirectoryURI + "\n");
            this.gAddressBook.deleteCards(cards);
        }
    },
 processListDeletes: function() {
        // 		var deleteListStringForTestPurposes = "";
        //Filling the Server deleted cards Hash

        for each (var key in this.serverDeletes) {
            var list = this.localListPointerHash[key];
            if (list) {
                var attributes = new GroupDAVListAttributes(list);
                attributes.deleteRecord();
                /* we commit the preferences here because sometimes Thunderbird will
                   crash when deleting the real instance of the list. */
                this.commitPreferences();
                dump("deleting list: " + key
                     + "; " + this.localListVersionHash[key] + "\n");
                this.gAddressBook.deleteDirectory(list);
            }
        }
        this.pendingOperations--;
        this.checkCallback();
    },
 finalize: function() {
        //     dump("finalize\n");
        if ((this.updatesStatus & SOGOC_UPDATES_CLIENTSIDE)) {
            var data = {query: "server-finalize-propfind"};
            var request = new sogoWebDAV(this.gURL, this, data);
            request.propfind(["http://calendarserver.org/ns/ getctag"], false);
        }
        else {
            if (this.updatesStatus == SOGOC_UPDATES_SERVERSIDE) {
                var groupdavPrefService = this.prefService();
                if (this.newCTag)
                    groupdavPrefService.setCTag(this.newCTag);
                if (this.newWebdavSyncToken)
                    groupdavPrefService.setWebdavSyncToken(this.newWebdavSyncToken);
            }
            this.checkCallback();
        }
    },
 onServerFinalizeComplete: function(status, jsonResponse) {
        if (status > 199 && status < 400) {
            var responses = jsonResponse["multistatus"][0]["response"];
            for each (var response in responses) {
                var href = response["href"][0];
                //  				dump("href: " + href + "\n");
                var propstats = response["propstat"];
                for each (var propstat in propstats) {
                    if (propstat["status"][0].indexOf("HTTP/1.1 200") == 0) {
                        if (href[href.length-1] != '/')
                            href += '/';
                        if (href != this.gURL)
                            href = this.cleanedUpHref(href);

                        var prop = propstat["prop"][0];
                        if (href == this.gURL) {
                            var newCTag = prop["getctag"][0];
                            if (newCTag) {
                                var groupdavPrefService = this.prefService();
                                groupdavPrefService.setCTag(newCTag);
                            }
                        } else {
                            dump("URLs don't match: " + href + " vs. " + this.gURL + "\n");
                        }
                    }
                }
            }

            this.checkCallback();
        }
        else {
            this.abort();
        }
    },
 checkCallback: function() {
        // 		dump("checkCallback:\n");
        // 		dump("\n\nthis = " + this.mCounter + "\n");
        // 		dump("  this.processMode: " + this.processMode + "\n");
        // 		dump("  this.pendingOperations: " + this.pendingOperations + "\n");
        // 		dump("  this.updatesStatus: " + this.updatesStatus + "\n");
        // 		dump("_checkCallback: processMode: " + this.processMode + "\n");
        // 		dump("_checkCallback: pendingOperations: " + this.pendingOperations + "\n");
        if (this.pendingOperations < 0) {
            this.context.requests[this.gURL] = null;
            throw "Buggy situation! (pendingOperations < 0)";
        }

        if (this.pendingOperations == 0) {
            // 			dump("switching processMode!\n");
            if (this.processMode == SOGOC_PROCESS_CARDS) {
                this.commitAddrDB();
                this.processMode = SOGOC_PROCESS_LISTS;
                this.processLists();
            }
            else if (this.processMode == SOGOC_PROCESS_LISTS) {
                this.commitPreferences();
                this.processMode = SOGOC_PROCESS_FINALIZE;
                this.finalize();
            }
            else if (this.processMode == SOGOC_PROCESS_FINALIZE) {
                this.commitPreferences();
                if (this.callback)
                    this.callback(this.gURL, this.callbackCode, this.callbackFailures,
                                  this.callbackData);

                var total = (this.localUploads
                             + this.serverDownloadsCount
                             + this.serverDeletes.length);
                if (total > 0)
                    this.progressMgr.unregisterAddressBook(this.gURL);
                dump(this.mCounter +"/sync with " + this.gURL + " has ended.\n");
                this.context.requests[this.gURL] = null;
            }
            else
                throw "Buggy situation (processMode )!";
        }
    }
};

function SynchronizeGroupdavAddressbook(uri, callback, callbackData) {
    // 	dump("sync uri: " + uri + "\n");
    var synchronizer = new GroupDavSynchronizer(uri, false);
    // 	dump("callback:" + callback + "\n");
    synchronizer.callback = callback;
    synchronizer.callbackData = callbackData;
    synchronizer.start();
}
