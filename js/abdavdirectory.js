/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

/********************************************************************************
 Copyright:	Inverse groupe conseil, 2006-2007
 Author: 		Robert Bolduc
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
		dump("jsInclude: " + files[i] + "\n");
		loader.loadSubScript(files[i], target);
	}
}

jsInclude(["chrome://sogo-connector/content/general/vcards.utils.js",
					 "chrome://sogo-connector/content/general/webdav.inverse.ca.js"]);

function xulReadFile(path, charset) {
	try {
		var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(path);

		var data = new String();
		var fiStream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
		var siStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
		fiStream.init(file, 1, 0, false);
		siStream.init(fiStream);
		data += siStream.read(-1);
		siStream.close();
		fiStream.close();
		return data;
	}
	catch(e) {
		throw e;
		return false;
	}
}

//DAV Directory Preferences settings

//user_pref("ldap_2.servers.dav.description", "DAV");
//user_pref("ldap_2.servers.dav.dirType", 2);
//user_pref("ldap_2.servers.dav.uri", "moz-abdavdirectory:///");

// const CLASS_ID = Components.ID("{2e3aa298-a1f9-4aef-9f80-ca430ce6e55b}");
// const CLASS_NAME = "DAV Addressbook Directory";
// const CONTRACT_ID = "@mozilla.org/rdf/resource-factory;1?name=moz-abdavdirectory";


// // constants
// const nsISupports = Components.interfaces.nsISupports;
// const nsIClassInfo = Components.interfaces.nsIClassInfo;
// const nsIRDFResource = Components.interfaces.nsIRDFResource;
// const nsIAbDirectory = Components.interfaces.nsIAbDirectory;
// const nsIAbDirectorySearch = Components.interfaces.nsIAbDirectorySearch;
// const nsIAutoCompleteSession = Components.interfaces.nsIAutoCompleteSession;
//    nsIAbDAVDirectory ???


/**********************************************************************************************
 *
 *  DAV Addressbook
 *
 **********************************************************************************************/

// Constants
//		PRInt32 	opRead = 1
//		PRInt32 	opWrite	= 2
//		PRInt32 	opSearch = 4

const opRead = 1;
const opWrite = 2;
const opSearch = 4;

// class constructor
// AbDAVDirectory  inherits from @mozilla.org/rdf/resource-factory;1?name=moz-abmdbdirectory
//AbDAVDirectory.prototype = Components.classes["@mozilla.org/rdf/resource-factory;1?name=moz-abldapdirectory"].createInstance(Components.interfaces.nsIRDFResource);
//AbDAVDirectory.prototype.constructor = AbDAVDirectory;
function AbDAVDirectory() {
	this.parentDirectory =
		Components.classes["@mozilla.org/rdf/resource-factory;1?name=moz-abldapdirectory"]
		.createInstance(Components.interfaces.nsIRDFResource);
	this.mPrefId = null;
	this.mURINoQuery = null;
	//	this.parentDirectory = Components.classes["@mozilla.org/rdf/resource-factory;1?name=moz-abmdbdirectory"].createInstance(Components.interfaces.nsIAbDirectory);
	
	// Inherits from nsIAbDirectory, the other methods and properties will have to be stubbed
	// DOES NOT WORK
	//AbDAVDirectory.prototype = this.parentDirectory;
	//	this.prototype.parent = this.parentDirectory;
	
	// 
// 	var childEnumerator = null;
// 	this.getChildEnumerator: function() { return childEnumerator;}
// 	this.setChildEnumerator: function(val) { childEnumerator = val; }
   
	this.cardDavReportResponse = null;
	//   dump("================== AbDAVDirectory constructed ==================");
	
	//	return true;
}

//AbDAVDirectory.inheritsFrom( Components.classes["@mozilla.org/rdf/resource-factory;1?name=moz-abldapdirectory"].createInstance(Components.interfaces.nsIRDFResource) );


//========================================================================================================================
//	nsIAbDirectorySearch
//========================================================================================================================

//========================================================================================================================
//	nsIAutoCompleteSession
//========================================================================================================================

// void onAutoComplete ( PRUnichar* searchString , nsIAutoCompleteResults previousSearchResult , nsIAutoCompleteListener listener )
AbDAVDirectory.prototype = {
 onAutoComplete: function(searchString , previousSearchResult , listener ){
		dump("onAutoComplete\n");
	},
 // void onStartLookup ( PRUnichar* searchString , nsIAutoCompleteResults previousSearchResult , nsIAutoCompleteListener listener )
 onStartLookup: function(searchString , previousSearchResult , listener){
		dump("onStartLookup\n");
	},
 
 // void onStopLookup ( )
 onStopLookup: function(){
		dump("onStopLookup\n");
	},

 //	void startSearch ( )   
 startSearch: function() {
		dump("=====================startSearch  called doing nothing here====================\n");
		/*	
				dump(this.Value + "\n");
				var doc = cardDavReport("http://sogo.inverse.ca/SOGo/dav/rbolduc/Contacts/public/", "ludo");

				var nodeList = doc.getElementsByTagName("addressbook-data");
	
				var customFieldsArray;
				var array = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsICollection);
	
				//Adding cards to array
				for (var i = 0; i < nodeList.length; i++){
				customFieldsArray = new Array();
				array.AppendElement(importFromVcard(nodeList.item(i).textContent.toString(), null, customFieldsArray));
				}
	
				var enumerator = Components.classes["@inverse.ca/jsenumerator;1"].createInstance(Components.interfaces.inverseIJSEnumerator);
				enumerator.init(array,array.Count());
				this.setChildEnumerator(enumerator);
		*/
	},
 // void stopSearch ()
 stopSearch: function() {
		dump("stopSearch called\n");
		this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectorySearch).stopSearch();	
	},

 //========================================================================================================================
 //	nsIAbDirectory
 //========================================================================================================================

 //Properties

 //		nsISupportsArray addressLists
 get addressLists() {
	 return
	 this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectory).addressLists;
 },
 set addressLists(val) {
	 this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectory).addressLists
	 = val;
 },

//	readonly nsIEnumerator childCards
 get childCards() {
	 var result = this.getChildCards(); 	
	 //	dump("this.getChildEnumerator() = result = " + result + "\n"); 
	 return result;
 },

//  set childCards (val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

 getChildCards: function() {
	// TODO: Offline mode
	/*
		PRBool offline;
    nsCOMPtr <nsIIOService> ioService = do_GetService(NS_IOSERVICE_CONTRACTID, &rv);
    NS_ENSURE_SUCCESS(rv,rv);
    rv = ioService->GetOffline(&offline);
    NS_ENSURE_SUCCESS(rv,rv);
 
	*/
	var result = null;
	try {
		//	this.Value contains the following pattern
		// moz-abdavdirectory://http://sogo.inverse.ca/SOGo/dav/rbolduc/Contacts/public/?(or(PrimaryEmail,c,klm)(DisplayName,c,kkk)(FirstName,c,klm)(LastName,c,k)))
		// Matching the URL

		var reg = new RegExp(/moz-abdavdirectory:\/\/(.*)\?/);
		if (!reg.test(this.Value)) {
			return null;
		}
		var url = RegExp.$1;

		// Matching the criteria
		// Return the 3rd member of the first parenthesis after the "or", i.e, 
		//?(or(PrimaryEmail,c,kkk)(DisplayName,c,klm)(FirstName,c,klm)(LastName,c,klm)))
		reg = new RegExp(/\?\(.*\(.*,.*,(.*)\).*\)\)/);
		if ( !reg.test(this.Value)){
			return null;
		}
		var criteria = RegExp.$1;	
	
		var doc = cardDavReport(url, criteria);
		var nodeList = doc.getElementsByTagName("addressbook-data");
	
		// To support customs fields introduced in importFromVcard for FreeBuzy
		var customFieldsArray;// // TODO: when the overhaul of the vcard parsing is done, this will have to be handle differently!!!	
		var uri = "moz-abdavdirectory://" + url;
		var resultArray = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
				
		for (var i = 0; i < nodeList.length; i++){
			customFieldsArray = new Array();
			// 		dump("\n===================================================\n");
			// 		dump(nodeList.item(i).textContent.toString());
			// 		dump("\n===================================================\n");
			var card = importFromVcard(nodeList.item(i).textContent.toString(), null, customFieldsArray);
		
			var savedCard = this.addCard(card);
// 			dump (savedCard.displayName +"\n");
			var cardExt = savedCard.QueryInterface(Components.interfaces.nsIAbMDBCard);

			cardExt.setStringAttribute("calFBURL", customFieldsArray["fburl"]);
			cardExt.setStringAttribute("uid", customFieldsArray["uid"]);
			// 		dump("fburl: " + cardExt.getStringAttribute("calFBURL") + "\n") ;
			savedCard.editCardToDatabase(uri); 	
			resultArray.AppendElement(cardExt);
		}
		result = Components.classes["@inverse.ca/jsenumerator;1"].createInstance(Components.interfaces.inverseIJSEnumerator);
		if (nodeList.length > 0) {
			result.init(resultArray, nodeList.length);		
		}
		else {
			result = null;
		}
// 		dump("getChildCards: " + result + "  " +  nodeList.length + "\n");
	}
	catch(e) {
		dump("Exception in getChildCards:\n" + e + "/n");
		throw e;
	}
	return result;
 },

//readonly nsISimpleEnumerator childNodes
 get childNodes () { return this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectory).childNodes; },
 set childNodes (val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

	//PRUnichar* description
 get description () { return this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectory).description; },
 set description (val) { this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectory).description = val; },

	//readonly nsIAbDirectoryProperties directoryProperties
 get directoryProperties () { return this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectory).directoryProperties; },
 set directoryProperties (val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

	//		PRUnichar* dirName
 get dirName () { return this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectory).dirName; },
 set dirName (val) { this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectory).dirName = val; },

	//		ACString dirPrefId
 get dirPrefId () {
		//return this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectory).dirPrefId;
		//dump(">>>>>>>>>>>> " + this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectory).dirPrefId + "\n");
		return this.mPrefId;
 },
 set dirPrefId (val) { 
	 // 	dump("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\n");
	 // 	dump("===========__defineSetter__(dirPrefId, function(val: " + val + "\n");
	 // 	dump("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\n");
	 //this.parentDirectory.QueryInterface(Components.interfaces.nsIAbDirectory).dirPrefId = val;
	 this.mPrefId = val;
 },


//		PRBool isMailList
 get isMailList() { return false; },
 set isMailList(val) {throw Components.results.NS_ERROR_NOT_IMPLEMENTED;},

//		readonly PRBool isRemote
 get isRemote() { return true; },
 set isRemote(val) {throw Components.results.NS_ERROR_NOT_IMPLEMENTED;},

//		readonly PRBool isSecure
// TODO: probaly need to do something...
 get isSecure() { return false; },
 set isSecure(val) {throw Components.results.NS_ERROR_NOT_IMPLEMENTED;},

// PRUint32 lastModifiedDate
 get lastModifiedDate() { return this.parentDirectory.lastModifiedDate; },
 set lastModifiedDate(val) { this.parentDirectory.lastModifiedDate = val; },

	//		PRUnichar* listNickName
 get listNickName() { return "Petak" /*this.parentDirectory.listNickName*/; },
 set listNickName(val) { this.parentDirectory.listNickName = val; },

	//		readonly PRInt32 operations
 get operations() { return  opSearch | opRead; },
 set operations(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

	//		readonly PRBool searchDuringLocalAutocomplete
	//		Directory should be searched when doing local autocomplete?
	// TODO: ???
 get searchDuringLocalAutocomplete() { return false },
 set searchDuringLocalAutocomplete(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

	//readonly PRBool supportsMailingLists
 get supportsMailingLists() { return false },
 set supportsMailingLists(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

 //nsIAbCard addCard ( nsIAbCard card )
 addCard: function(card) {
	 if (!card) {
		 throw Components.Exception("addCard().  Parameter card is null");
	 } 
	 var newCard = null ;

	 // this.Value can contain the query so split at "?" to get the uri.
	 // Pattern is like:moz-abdavdirectory://http://sogo.inverse.ca/SOGo/dav/rbolduc/Contacts/public/?(or(PrimaryEmail,c,ws)(DisplayName,c,ws)(FirstName,c,ws)(LastName,c,ws))
	 var uri = this.Value.split(/\?/)[0];

	 var resource = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService).GetResource(uri)
	 .QueryInterface(Components.interfaces.nsIAbDirectory);
	
	 //moz-abmdbdirectory://abook-45.mab
	 var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);	
	 var fileName = prefService.getCharPref(resource.dirPrefId + ".filename");
	 var localUri = "moz-abmdbdirectory://" + fileName;
	
	 var db = Components.classes["@mozilla.org/addressbook;1"].createInstance(Components.interfaces.nsIAddressBook).getAbDatabaseFromURI(localUri);
	 /*
		 nsCOMPtr<nsIAbCard> newCard;
		 nsCOMPtr<nsIAbMDBCard> dbcard;

		 dbcard = do_QueryInterface(card, &rv);
		 if (NS_FAILED(rv) || !dbcard) {
		 dbcard = do_CreateInstance(NS_ABMDBCARD_CONTRACTID, &rv);
		 NS_ENSURE_SUCCESS(rv, rv);

		 newCard = do_QueryInterface(dbcard, &rv);
		 NS_ENSURE_SUCCESS(rv,rv);
  
		 rv = newCard->Copy(card);
		 NS_ENSURE_SUCCESS(rv, rv);
		 }
		 else {
		 newCard = card;
		 }

		 dbcard->SetAbDatabase (mDatabase);

		 mDatabase->CreateNewCardAndAddToDB(newCard, PR_TRUE);
		 mDatabase->Commit(nsAddrDBCommitType::kLargeCommit);

		 NS_IF_ADDREF(*addedCard = newCard);
		 return NS_OK;
	 */

	 var dbCard = Components.classes["@mozilla.org/addressbook/moz-abmdbcard;1"].createInstance(Components.interfaces.nsIAbMDBCard);
	 var newCard = Components.classes["@mozilla.org/addressbook/moz-abmdbcard;1"].createInstance(Components.interfaces.nsIAbCard);
	 newCard.copy(card);
	 newCard.QueryInterface(Components.interfaces.nsIAbMDBCard).setAbDatabase(db);

	 db.createNewCardAndAddToDB(newCard, false);
	 db.commit(0);//nsAddrDBCommitType::kLargeCommit

	 return newCard;
 },
 // void addMailList ( nsIAbDirectory list )   
 // void addMailListWithKey ( nsIAbDirectory list , out PRUint32 key )   
 // void copyMailList ( nsIAbDirectory srcList )   
 // void createDirectoryByURI ( PRUnichar* displayName , char* uri , PRBool migrating ) 
 // void createNewDirectory ( nsIAbDirectoryProperties properties )  
 
 // void deleteCards ( nsISupportsArray cards )   
 // void deleteDirectory ( nsIAbDirectory dierctory )   
 deleteDirectory: function ( directory ) {
	 dump("============>CALLED deleteDirectory!!!\n");
	 //this.parentDirectory.deleteDirectory(directory);
 },
 // void dropCard ( nsIAbCard card , PRBool needToCopyCard )   
 // void editMailListToDatabase ( char* uri , nsIAbCard listCard )   
 // PRUnichar* getValueForCard ( nsIAbCard card , char* name )   
 // PRBool hasCard ( nsIAbCard cards )   
 // PRBool hasDirectory ( nsIAbDirectory dir )   
 // void modifyDirectory ( nsIAbDirectory directory , nsIAbDirectoryProperties properties )   
 // void setValueForCard ( nsIAbCard card , char* name , PRUnichar* value )


 //========================================================================================================================
 //	Components.interfaces.nsIClassInfo;
 //========================================================================================================================

 contractID: "@mozilla.org/rdf/resource-factory;1?name=moz-abdavdirectory",
 implementationLanguage: 2, /* Javascript */

 //nsISupports getHelperForLanguage ( PRUint32 language )  
 getHelperForLanguage: function( language ){
	 try {
		 dump("AbDAVDirectory.getHelperForLanguage(" + language + ") called \n")
		 //return this.parentDirectory.QueryInterface(Components.interfaces.nsIClassInfo).getHelperForLanguage(language);
		 return null;
	 }
	 catch (ex) {
		 dump (ex + "\n File: "+  ex.fileName + "\n Line: " + ex.lineNumber + "\n\n Stack:\n\n" + ex.stack);
		 throw ex;		
	 }
 },

 //void getInterfaces ( out PRUint32 count , out nsIIDPtr array )
 getInterfaces: function( count ) {
	 var array;
	 try{
		 //		var ci = this.parentDirectory.QueryInterface(Components.interfaces.nsIClassInfo);
		 //		ci.getInterfaces(count, array);
		 count = 6;
		 array = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
		 array.appendElement(Components.interfaces.nsIClassInfo, false);
		 array.appendElement(Components.interfaces.nsIRDFResource, false);
		 array.appendElement(Components.interfaces.nsIAbDirectory, false);
		 array.appendElement(Components.interfaces.nsIAbDirectorySearch, false);
		 array.appendElement(Components.interfaces.nsISupports, false);
		 array.appendElement(Components.interfaces.nsIAutoCompleteSession, false);
		
		 //const nsISupports = Components.interfaces.nsISupports ???

		 dump("AbDAVDirectory.getInterfaces(count, array) completed \n")
			 }catch (ex){
		 dump (ex + "\n File: "+  ex.fileName + "\n Line: " + ex.lineNumber + "\n\n Stack:\n\n" + ex.stack);
		 throw ex;		
	 }

	 return array;
 },
 
 //========================================================================================================================
 // Components.interfaces.nsIRDFResource;
 //========================================================================================================================

 // readonly char* Value	
 // The single-byte string value of the resource.

 get Value () { return this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).Value; },
 set Value (val) { this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).Value = val; },

 // readonly AUTF8String ValueUTF8
 // The UTF-8 URI of the resource.
 get ValueUTF8 () { return this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).ValueUTF8; },
 set ValueUTF8 (val) { this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).ValueUTF8 = val; },

 //void Init ( char* uri )   
 Init: function( uri ) {
	 this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).Init( uri );

	 this.mURINoQuery = uri;
	 //dump("=============== this.mURINoQuery: " + this.mURINoQuery + "\n");
	 /*
		 nsresult rv;
		 rv = nsRDFResource::Init (aURI);
		 NS_ENSURE_SUCCESS(rv, rv);

		 mURINoQuery = aURI;

		 nsCOMPtr<nsIURI> uri = do_CreateInstance (NS_STANDARDURL_CONTRACTID, &rv);
		 NS_ENSURE_SUCCESS(rv, rv);

		 rv = uri->SetSpec(nsDependentCString(aURI));
		 NS_ENSURE_SUCCESS(rv, rv);

		 mIsValidURI = PR_TRUE;

		 nsCOMPtr<nsIURL> url = do_QueryInterface(uri);
		 NS_ENSURE_SUCCESS(rv, rv);

		 nsCAutoString queryString;
		 rv = url->GetQuery (queryString);

		 nsCAutoString path;
		 rv = url->GetPath (path);
		 mPath = path;

		 PRUint32 queryStringLength;
		 if (queryString.get () && (queryStringLength = queryString.Length ()))
		 {
		 int pathLength = path.Length () - queryStringLength - 1;
		 mPath.Truncate (pathLength);

		 mURINoQuery.Truncate (mURINoQuery.Length () - queryStringLength - 1);

		 mQueryString = queryString;

		 mIsQueryURI = PR_TRUE;
		 }
		 else 
		 mIsQueryURI = PR_FALSE;

		 return rv;

	 */	
	 //	dump("AbDAVDirectory.Init(" + uri +") completed\n\n");
 },
 	
 // PRBool EqualsString ( char* URI ) 
 EqualsString: function(uri) {
	 dump("\t AbDAVDirectory.EqualsString(" + uri +") called\n");
	 return this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).EqualsString( uri );
 },

 // void GetDelegate ( char* key , nsIIDRef IID , out nsQIResult* result )  
 GetDelegate: function( key , IID ,  result ) {
	 this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).GetDelegate( key , IID ,  result );
	 dump("\t AbDAVDirectory.GetDelegate() completed\n");
 },
 // [noscript] void GetValueConst ( out char* constValue )   
 GetValueConst: function( constValue ) {
	 this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).GetValueConst( constValue );
	 dump("\t AbDAVDirectory.GetValueConst() completed\n");
 },
 // void ReleaseDelegate ( char* key )
 ReleaseDelegate: function( key ) {
	 this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).ReleaseDelegate( key );
	 dump("\t AbDAVDirectory.ReleaseDelegate() completed\n");	
 },

 //========================================================================================================================
 // Components.interfaces.nsIRDFResource
 //========================================================================================================================

 QueryInterface: function(aIID) {
	 if (!aIID.equals(Components.interfaces.nsIRDFResource)
			 && !aIID.equals(Components.interfaces.nsIAbDirectory)
			 && !aIID.equals(Components.interfaces.nsIAbDirectorySearch)
			 && !aIID.equals(Components.interfaces.nsIClassInfo)
			 && !aIID.equals(Components.interfaces.nsIAutoCompleteSession)
			 && !aIID.equals(Components.interfaces.nsISupports))
		 {
			 throw Components.results.NS_ERROR_NO_INTERFACE;
		 }

	 return this;
 }
};



