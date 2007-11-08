
/*******************************************************************************
 synch.addressbook.groupdav.js
 
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

// Making the asumption that the keys provided by the server are always unique
// so using simple  pseudo hash tables to store the information.
var serverVersionHash;	
var serverDataHash;      // stores vcards
var localVersionHash;    // stores the version no of the local cards
var localUpdateHash;     // stores keys (the value is set to true)
var localAdditionHash;  	// stores vcards 
var serverDeleteArray;		// store keys
var conflictHash;			// store keys of conflicts
var localCardPointerHash; //stores mozilla cards

var gURL;
var gDisplaySyncDialog;

var gSelectedDirectoryURI; // gAddressBook to synchronize
var gAddressBook;
var gGroupDavServerInterface;

var gDownloadChannel= null;
var groupdavPrefService = null;

var messengerWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
							.getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:3pane");

//var gObserverService is defined in addressbook.groupdav.vcard.observers.js

/*******************************************************************************
 * Download Observer
 * 
 * 
 ******************************************************************************/
var vCardsDownloadObserver = {
	// Components.interfaces.nsIObserver
	observe: function(object, topic, data){  
		try{ 
			switch (topic){
			//==================================================================================================================================              	
				case SynchProgressMeter.CARD_DOWNLOADED:
			//==================================================================================================================================           	
					var key = data;
					var vcardFieldsArray = {};  //To handle fbURL from SOGo(freebusy) and vcards fields that have no equivalent in Thunderbird.
					vcardFieldsArray["groupDavVcardCompatibility"] = "";

					var cardExt;
					logDebug("Vcard downloaded:\n\n" + serverDataHash[key]);										
					var card =  importFromVcard(serverDataHash[key], gSelectedDirectoryURI, vcardFieldsArray);
					logDebug("groupDavVcardCompatibility value:\n" + vcardFieldsArray["groupDavVcardCompatibility"]);
					if (localCardPointerHash[key]){
					// Replace local card with server card
						localCardPointerHash[key].copy(card);
						cardExt = localCardPointerHash[key].QueryInterface(Components.interfaces.nsIAbMDBCard);

						cardExt.setStringAttribute("groupDavKey", key);
						cardExt.setStringAttribute("groupDavVersion", serverVersionHash[key]);
						cardExt.setStringAttribute("calFBURL", vcardFieldsArray["fbURL"]);										            	         										
						cardExt.setStringAttribute("groupDavVcardCompatibility", vcardFieldsArray["groupDavVcardCompatibility"]);

	  					localCardPointerHash[key].editCardToDatabase(gSelectedDirectoryURI); 		            	         	
					}else{
					// add the server card
						var savedCard= GetDirectoryFromURI(gSelectedDirectoryURI).addCard(card);
						cardExt = savedCard.QueryInterface(Components.interfaces.nsIAbMDBCard);

						cardExt.setStringAttribute("groupDavKey", key);
						cardExt.setStringAttribute("groupDavVersion", serverVersionHash[key]);
						cardExt.setStringAttribute("calFBURL", vcardFieldsArray["fbURL"]);										            	         										
						cardExt.setStringAttribute("groupDavVcardCompatibility", vcardFieldsArray["groupDavVcardCompatibility"]);

						savedCard.editCardToDatabase(gSelectedDirectoryURI); 	
					}            	
					logDebug("importFromVcard() completed for card: " + key);
					logDebug("//TODO: do a propfind to make sure the version no. (etag) has not changed.");
				break;     								
			}
		}catch (e){
			exceptionHandler(window,"vCardsDownloadObserver.observe()",e);
		}
	},

	// Components.interfaces.nsISupports
	QueryInterface : function(iid){
		if ( iid.equals(Components.interfaces.nsIObserver) || iid.equals(Components.interfaces.nsISupportsWeakReference)
			|| iid.equals(Components.interfaces.nsISupports))
			return this;
		else
			alert(iid);
		throw Components.results.NS_NOINTERFACE;
	}
 };

/*******************************************************************************
 * Upload Observer
 * 
 ******************************************************************************/
function VcardDownloadListener(uri,  channel, vCardKey){
	this.mURI = uri;
	this.mCountRead = 0;
	this.mChannel = channel;
	this.mKey = vCardKey;
}

VcardDownloadListener.prototype = {
	mURI : null,
	mVcard : "",
	mCountRead : null,
	mChannel : null,
	mBytes : Array(),
	mKey : 0,

	onStopRequest : function (aRequest, aContext, aStatusCode){
		try{
			var httpChannel = this.mChannel.QueryInterface(Components.interfaces.nsIHttpChannel);
			if ((  httpChannel && httpChannel.requestSucceeded) && 
				Components.isSuccessCode(aStatusCode) && this.mCountRead > 0){
			// vcard download completed, put the card in serverDataHash and notify the ObserverService
				serverDataHash[this.mKey] = this.mVcard;
				messengerWindow.gAbWinObserverService.notifyObservers(null, SynchProgressMeter.CARD_DOWNLOADED, this.mKey);
			}else{
				messengerWindow.gAbWinObserverService.notifyObservers(null, SynchProgressMeter.CARD_DOWNLOAD_FAILED, this.mKey);   
			}
		}catch(e){
			throw e;
		}
   },

	onDataAvailable : function (aRequest, aContext, aInputStream, aOffset, aCount){
	//Accumulate the data from the server in mVcard
		try{
			var scrStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
			scrStream.init(aInputStream);
			this.mVcard+=scrStream.read(aCount);    
			this.mCountRead += aCount;
			logDebug("Request:" + aRequest);
			logDebug("Context:" + aContext);
		}catch(e){
			throw e;
		}
	},

	QueryInterface: function (iid){
		if (!iid.equals(Components.interfaces.nsISupports) &&
			!iid.equals(Components.interfaces.nsIInterfaceRequestor) &&
			!iid.equals(Components.interfaces.nsIRequestObserver) &&
			!iid.equals(Components.interfaces.nsIDocShellTreeItem) &&
			!iid.equals(Components.interfaces.nsIChannelEventSink) &&
			!iid.equals(Components.interfaces.nsIProgressEventSink) && 
			!iid.equals(Components.interfaces.nsIStreamListener)) {
			
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
		return this;
	},

	getInterface: function (iid){
		try{
			return this.QueryInterface(iid);
		}catch (e){
			throw Components.results.NS_NOINTERFACE;
		}
	},

	onStartRequest : function (aRequest, aContext) {},

	onChannelRedirect : function (aOldChannel, aNewChannel, aFlags) {},

	// nsIProgressEventSink: the only reason we support
	// nsIProgressEventSink is to shut up a whole slew of xpconnect
	// warnings in debug builds. (see bug #253127)
	onProgress : function (aRequest, aContext, aProgress, aProgressMax) {},
	onStatus : function (aRequest, aContext, aStatus, aStatusArg) {}
}

/***********************************************************
 * 
 * Fills the Server, 
 * LocalUpdate 
 * and Conflict data structures 
 * 
 * for the synchronization
 * 
 ***********************************************************/ 
function fillServerHashes(){   
	// Get the list of all the vcards and their version from the GroupDAV server
	// TODO replace this call with a new propfind that will be put inside of ca.inverse.webdav.js 
	// instead of using webdavAPI.js
	var propsList = new Array("<D:getetag/>");
	try{
		var responseObj=webdav_propfind(gURL, propsList, null, null); //Let Thunderbird Password Manager handle user and password
	}catch (e){
		throw new Components.Exception("Cannot connect to the server " + gURL + "\nMethod:fillServerHashes()\n\n", Components.results.NS_ERROR_FAILURE);
	}

	switch(responseObj.status){      
		case 207:
		case 200: // Added to support Open-Xchange   
			var serializer = new XMLSerializer();      
			logDebug("PROPFIND response:\n\n" + serializer.serializeToString(responseObj.response));
			var doc = responseObj.response;
			
			if (doc == null){
				throw "The Server response to propfind is malformed.";
			}
			logDebug("=========Begin Server Cards List, url is: " + gURL);			
			var hrefList = gGroupDavServerInterface.getServerVcardHrefList(doc); 
			if (hrefList){
				for (var i=0; i<hrefList.length; i++){			
				// Fill the Server Versions Hash, 
					var key = gGroupDavServerInterface.getKey(hrefList[i], gURL);    
					var version = gGroupDavServerInterface.getVersion(hrefList[i]);
					logDebug("\tServer Card key = " + key + "\tversion = " + version);
					serverVersionHash[key] = version;        	
				}
			}
			logDebug("=========End Server Cards List"); 
			return 207;
		
		case 401:
			return 401;
		
		case 403:
			return 403;
		
		default:
			throw "Error connecting to GroupDAV Server; response status: " + responseObj.status;      
	}
}

// Fill the Local Directory data structures for the synchronization
function fillLocalHashes(){
	var cards = gAddressBook.childCards;
	var hasCards = false;
	
	try{
		cards.first();
		hasCards = true;
	}catch (ex){}// nsIEnumerator doesn't seem to provide any clean way to test for existence of elements
   

	while(hasCards){   
		var card = cards.currentItem().QueryInterface(Components.interfaces.nsIAbCard);
		var cardExt = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
		var key = cardExt.getStringAttribute("groupDavKey");
		if (key && key != ""){
		// Cards that exist locally and on the server
		// Later, the function compareVersions() will use this information to determine 
		// if the cards needs to be uploaded or if there is a conflict
			localCardPointerHash[key] = card;
			localVersionHash[key] = cardExt.getStringAttribute("groupDavVersion");
		}else{
		// Generate the key and save the modified card locally.
			var cardKey = gGroupDavServerInterface.getNewCardKey();
			cardExt.setStringAttribute("groupDavKey",cardKey);
			card.editCardToDatabase(gSelectedDirectoryURI);
			localCardPointerHash[cardKey] = card;
	     		
			// New card to export to the server      		
			localAdditionHash[cardKey] = card2vcard(card);
			localAdditionHash.size++;
		}
		try{ 
			cards.next(); 
		}catch(ex2){ 
			hasCards = false; 
		}                   
	}
//	logDebug("=========End Local Cards List");
}

function upLoadLocalAdditions(){
	if (localAdditionHash.size > 0){		
		for( var key in localAdditionHash){
			if (key != "size"){
				webdavAddVcard(gURL + key , localAdditionHash[key] ,key, 
									messengerWindow.gGroupDAVProgressMeter, messengerWindow.gAbWinObserverService);				
			}
		}
	}
}

function initProgressMeter(){
	//Initialize SynchProgressMeter (see addressbook.groupdav.overlay.js for definition)
	messengerWindow.gGroupDAVProgressMeter.displayMsg = gDisplaySyncDialog;	
	messengerWindow.gGroupDAVProgressMeter.abWindow2	= Components.classes["@mozilla.org/appshell/window-mediator;1"].
					getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:addressbook");

	if (serverDataHash.size + localUpdateHash.size + localAdditionHash.size == 0){
		messengerWindow.gAbWinObserverService.notifyObservers(null, SynchProgressMeter.NOTHING_TO_DO, null);	
	}else{
		messengerWindow.gGroupDAVProgressMeter.initDownload(serverDataHash.size);
		messengerWindow.gGroupDAVProgressMeter.initUpload( localCardPointerHash, gSelectedDirectoryURI, localUpdateHash.size, localAdditionHash.size);
		messengerWindow.gGroupDAVProgressMeter.setVCardsUpDateSize(localUpdateHash.size);	
		messengerWindow.gGroupDAVProgressMeter.setVCardsAddSize(localAdditionHash.size);
		messengerWindow.gGroupDAVProgressMeter.setVCardsUploadTotalSize(localUpdateHash.size + localAdditionHash.size);	
	}
}

function uploadCards(){
	if(localUpdateHash.size + localAdditionHash.size > 0){
		messengerWindow.gAbWinObserverService.notifyObservers(null, SynchProgressMeter.SERVER_UPLOAD_BEGINS, null);
		upLoadLocalAdditions();//asynchronuous
		uploadLocalUpdates(); // asynchronuous			
	}
}

function uploadLocalUpdates(){
	if (localUpdateHash.size > 0){		
		for( var key in localUpdateHash){
			if (key != "size"){
				webdavUpdateVcard(gURL + key , card2vcard(localCardPointerHash[key]), key,
					messengerWindow.gGroupDAVProgressMeter, messengerWindow.gAbWinObserverService);   		
			}   		
		}
	}
}

function downloadVcards(){
	if (serverDataHash.size > 0){		
		messengerWindow.gAbWinObserverService.notifyObservers(null,SynchProgressMeter.SERVER_DOWNLOAD_BEGINS , null);
		for( var key in serverDataHash){
			if (key != "size"){
				downloadVcardAsynch(key);
			}
		}	
	}
}

function compareVersions(){
	for (var key in serverVersionHash){
		var serverVersion = serverVersionHash[key];
		var localVersion = 0;
		if (typeof(localVersionHash[key]) != "undefined"){
			localVersion = localVersionHash[key];
		}
		if (localVersion == 0){
		// No Local version, the vcard has to be downloaded
			serverDataHash[key] = "";
			serverDataHash.size++;         
		}else{
			var localVersionPrefix = getModifiedLocalVersion(localVersion);
			if (localVersionPrefix !=null){
			//There was a local update
				if (localVersionPrefix != serverVersion){
				// There is a conflict if the version numbers are different.
				// Otherwise, the local version will be uploaded later
					conflictHash[key] = true;
					serverDataHash[key] = "";
					serverDataHash.size++;
				}else{
					localUpdateHash[key] = true;
					localUpdateHash.size++;
				}
			}else if (localVersion < serverVersion){
			// Server version is more recent           	
				serverDataHash[key] = "";
				serverDataHash.size++;	                  
			}
		}
	}
}

function addObservers_Synch(){
	messengerWindow.gAbWinObserverService.addObserver(vCardsDownloadObserver, 	SynchProgressMeter.CARD_DOWNLOADED, true);	
}

function removeObservers_Synch(){
	messengerWindow.gAbWinObserverService.removeObserver(vCardsDownloadObserver, SynchProgressMeter.CARD_DOWNLOADED);	
}

function processDeletes(){
	var deleteListStringForTestPurposes = "";
	//Filling the Server deleted cards Hash
	var i = 0;
	for( var key in localCardPointerHash){
		if( key != "size" && serverVersionHash[key] == null){
//			serverDeleteHash[key] = localCardPointerHash[key];
			serverDeleteArray[i] = key;
			i++
//			serverDeleteHashsize++;	
		}
	}
//	if (groupdavPrefService.getAutoDeleteFromServer()){
	if (true){
	// Automatic delete
		deleteServerDeleteArrayCards();
	}else{
		window.openDialog("chrome://sogo-connector/content/addressbook/test.xul",  "", "chrome,resizable=yes,centerscreen");
	}		
}

function deleteServerDeleteArrayCards(){
	var card;
	var db = Components.classes["@mozilla.org/addressbook;1"].createInstance(Components.interfaces.nsIAddressBook).getAbDatabaseFromURI(gSelectedDirectoryURI);
	for (var i=0; i<serverDeleteArray.length; i++){
		card =localCardPointerHash[serverDeleteArray[i]].QueryInterface(Components.interfaces.nsIAbMDBCard);
		db.deleteCard(card, true);
	}
	db.closeMDB(true);	
}

function processConflicts(){
	for( var key in conflictHash){
		importFromVcard(serverDataHash[key], key, serverVersionHash[key], gSelectedDirectoryURI);
		//gAddressBook.dropCard(localCardPointerHash[key],false);
		
	}	
	processDeletes()
	logWarn("TODO:\tCurrently, conflicts are simply overwritten by the server version.\n\t\t\t\t\t\t\tDeletes on the server are simply ignored at this point.");
}

// Downloads asynchronously a vcard from the GroupDAV server and stores it in serverDataHash
function downloadVcardAsynch(key){
	var fileUrl = gURL + key;
	var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	var chan = ios.newChannel(fileUrl, null, null);

	logDebug("downloadVcardAsynch() url = " + fileUrl);
	var listener = new VcardDownloadListener (fileUrl, chan, key);
	chan.notificationCallbacks = listener;
	chan.asyncOpen(listener, null);
}

function initSynchVariables(uri){
	if (uri){
		gSelectedDirectoryURI = uri
	}else{
	// Store the gAddressBook that was selected when Synchronize was clicked
		gSelectedDirectoryURI = GetSelectedDirectory();
	}
	gAddressBook = GetDirectoryFromURI(gSelectedDirectoryURI);	
	gSynchIsRunning = true;
		
	try {
	//TODO: There has to be a cleaner way than that!!!
		removeObservers_Synch();
	}catch(ex){}
					
	groupdavPrefService = new GroupdavPreferenceService(gAddressBook.dirPrefId);
	gURL = groupdavPrefService.getURL();
	
	gDisplaySyncDialog = groupdavPrefService.getDisplayDialog() == "true";
	
	gGroupDavServerInterface = GroupdavServerFactory.get(groupdavTypes.GroupDAV_Generic);
	logDebug("function initSynchVariables()\n\t\t\turl:[" + gURL + "] \n\t\t\thost:[" + groupdavPrefService.getHostName() +"]");
	addObservers_Synch();

	serverVersionHash = {};
	serverDataHash = {};
	serverDataHash.size = 0;
	localVersionHash = {};
	localCardPointerHash = {};
	localUpdateHash = {};
	localUpdateHash.size = 0;
	localAdditionHash = {};
	localAdditionHash.size = 0;
	conflictHash = {};
//	localDeleteHash = {};
//	localDeleteHash.size = 0;
	serverDeleteArray = new Array();
//	serverDeleteHash.size = 0;

	//Initialization is completed
	messengerWindow.gAbWinObserverService.notifyObservers(null, SynchProgressMeter.INITIALIZATION_EVENT, null);	
}

/******************************************************************
 *  MENU functions
 ******************************************************************/
function SynchronizeDAVAb(uri, isDrop){
	try{        
		initSynchVariables(uri);
		var statusCode = fillServerHashes();
		
		switch (statusCode){
			case 401:
				logWarn("Warning!\n\n You either pressed Cancel instead of providing user and password or the server responded 401 for another reason.");
				gSynchIsRunning = false; 
				//return;      
				break;
			case 403:
				var msg = "Authentification failed or the user does not have permission to access the specified Address Book.\n\n  You will have to restart Thunderbird to authenticate again!"
				alert(msg);
				logWarn(msg);
				gSynchIsRunning = false; 
				//return;
				break;
			default:
				if (!isDrop){
					fillLocalHashes();
					compareVersions();//Has to be done first it modifies Local Hashes		
					initProgressMeter();
					downloadVcards(); //asynchronuous
					uploadCards(); //asynchronous
					processConflicts();
				}else{
					fillLocalHashes();
					compareVersions()		
					initProgressMeter();
					uploadCards();											
				}										
		}
    
	}catch (e){
		gSynchIsRunning = false; 
		exceptionHandler(window,"Synchronization Error!",e);
	}	
}

function SynchronizeGroupdavAddressbookDrop(uri){	
	SynchronizeDAVAb(uri, true);
}

function SynchronizeGroupdavAddressbook(uri){	
	SynchronizeDAVAb(uri, false);
}