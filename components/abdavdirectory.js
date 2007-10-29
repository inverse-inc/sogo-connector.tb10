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

Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader).loadSubScript("chrome://sogo-connector/content/addressbook/vcards.utils.js");
Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader).loadSubScript("chrome://sogo-connector/content/addressbook/webdav.inverse.ca.js");

//DAV Directory Preferences settings

//user_pref("ldap_2.servers.dav.description", "DAV");
//user_pref("ldap_2.servers.dav.dirType", 2);
//user_pref("ldap_2.servers.dav.uri", "moz-abdavdirectory:///");

const CLASS_ID = Components.ID("{2e3aa298-a1f9-4aef-9f80-ca430ce6e55b}");
const CLASS_NAME = "DAV Addressbook Directory";
const CONTRACT_ID = "@mozilla.org/rdf/resource-factory;1?name=moz-abdavdirectory";


// constants
const nsISupports = Components.interfaces.nsISupports;
const nsIClassInfo = Components.interfaces.nsIClassInfo;
const nsIRDFResource = Components.interfaces.nsIRDFResource;
const nsIAbDirectory = Components.interfaces.nsIAbDirectory;
const nsIAbDirectorySearch = Components.interfaces.nsIAbDirectorySearch;
const nsIAutoCompleteSession = Components.interfaces.nsIAutoCompleteSession;
//    nsIAbDAVDirectory ???


/**********************************************************************************************
 *
 *  DAV Addressbook
 *
 **********************************************************************************************/

// class constructor
// AbDAVDirectory  inherits from @mozilla.org/rdf/resource-factory;1?name=moz-abmdbdirectory
//AbDAVDirectory.prototype = Components.classes["@mozilla.org/rdf/resource-factory;1?name=moz-abldapdirectory"].createInstance(nsIRDFResource);
//AbDAVDirectory.prototype.constructor = AbDAVDirectory;
function AbDAVDirectory(){

	this.parentDirectory = Components.classes["@mozilla.org/rdf/resource-factory;1?name=moz-abldapdirectory"].createInstance(nsIRDFResource);
//	this.parentDirectory = Components.classes["@mozilla.org/rdf/resource-factory;1?name=moz-abmdbdirectory"].createInstance(nsIAbDirectory);
	
	// Inherits from nsIAbDirectory, the other methods and properties will have to be stubbed
	// DOES NOT WORK
	//AbDAVDirectory.prototype = this.parentDirectory;
//	this.prototype.parent = this.parentDirectory;
	
	// 
	var childEnumerator = null;
	this.getChildEnumerator = function() { return childEnumerator;}
   this.setChildEnumerator = function(val) { childEnumerator = val; }
   
   this.cardDavReportResponse = null;
//   dump("================== AbDAVDirectory constructed ==================");
	
//	return true;
}

//AbDAVDirectory.inheritsFrom( Components.classes["@mozilla.org/rdf/resource-factory;1?name=moz-abldapdirectory"].createInstance(nsIRDFResource) );



//========================================================================================================================
//	nsIAutoCompleteSession
//========================================================================================================================

// void onAutoComplete ( PRUnichar* searchString , nsIAutoCompleteResults previousSearchResult , nsIAutoCompleteListener listener )
AbDAVDirectory.prototype.onAutoComplete = function(searchString , previousSearchResult , listener ){
	dump("onAutoComplete");
}
// void onStartLookup ( PRUnichar* searchString , nsIAutoCompleteResults previousSearchResult , nsIAutoCompleteListener listener )
AbDAVDirectory.prototype.onStartLookup = function(searchString , previousSearchResult , listener){
	dump("onStartLookup");
}

// void onStopLookup ( )
AbDAVDirectory.prototype.onStopLookup = function(){
	dump('onStopLookup');
}

//========================================================================================================================
//	nsIAbDirectorySearch
//========================================================================================================================

function xulReadFile(path, charset){
	try{
		var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(path);
		
		var data     = new String();
		var fiStream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
		var siStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
		fiStream.init(file, 1, 0, false);
		siStream.init(fiStream);
		data += siStream.read(-1);
		siStream.close();
		fiStream.close();
		return data;
	}catch(e){
		throw e;
		return false;
	}	
}
//	void startSearch ( )   
AbDAVDirectory.prototype.startSearch = function(){
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
}
// void stopSearch ()
AbDAVDirectory.prototype.stopSearch = function(){
	dump("stopSearch called\n");
	this.parentDirectory.QueryInterface(nsIAbDirectorySearch).stopSearch();	
}

//========================================================================================================================
//	nsIAbDirectory
//========================================================================================================================

// Constants
//		PRInt32 	opRead 	= 1
//		PRInt32 	opWrite 	= 2
//		PRInt32 	opSearch = 4

const opRead 	= 1;
const opWrite 	= 2;
const opSearch = 4;

//Properties

//		nsISupportsArray addressLists
AbDAVDirectory.prototype.__defineGetter__("addressLists", function() { return this.parentDirectory.QueryInterface(nsIAbDirectory).addressLists;});
AbDAVDirectory.prototype.__defineSetter__("addressLists", function(val) { this.parentDirectory.QueryInterface(nsIAbDirectory).addressLists = val; });

//	readonly nsIEnumerator childCards
AbDAVDirectory.prototype.__defineGetter__("childCards", function() { 
	var result = this.getChildCards(); 	
//	dump("this.getChildEnumerator() = result = " + result + "\n"); 
	return result;  
	});

// AbDAVDirectory.prototype.__defineSetter__("childCards", function(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; });

AbDAVDirectory.prototype.getChildCards = function(){
//	dump("getChildCards() called\n");
	
//	this.Value contains the following pattern
// moz-abdavdirectory://http://sogo.inverse.ca/SOGo/dav/rbolduc/Contacts/public/?(or(PrimaryEmail,c,kkk)(DisplayName,c,kkk)(FirstName,c,kkk)(LastName,c,kkk)))
	
	// Matching the URL
	var reg = new RegExp(/moz-abdavdirectory:\/\/(.*)\?/);
	if ( !reg.test(this.Value)){
		return null;
	}	
	var url = RegExp.$1;
	
	// Matching the criteria
	reg = new RegExp(/\?\(.*\(.*,.*,(.*)\).*\)\)/);
	if ( !reg.test(this.Value)){
		return null;
	}
	var criteria = RegExp.$1;

//	dump("url: " + url +"\n");
//	dump("crit: " + criteria + "\n");
	
	var doc = cardDavReport(url, criteria);
	var nodeList = doc.getElementsByTagName("addressbook-data");
	
// TODO: To support customs fields introduced in importFromVcard for FreeBuzy
// an overhaul of the vcard parsing is in order, this will have to be handle differently!!!	
	var customFieldsArray;
	var array = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsICollection);
	
	//Adding cards to array
	for (var i = 0; i < nodeList.length; i++){
		customFieldsArray = new Array();
		array.AppendElement(importFromVcard(nodeList.item(i).textContent.toString(), null, customFieldsArray));
	}	
	var result = Components.classes["@inverse.ca/jsenumerator;1"].createInstance(Components.interfaces.inverseIJSEnumerator);
	result.init(array, nodeList.length);
	dump("getChildCards: " + result + "  " +  nodeList.length + "\n");

	return result;
}

//readonly nsISimpleEnumerator childNodes
AbDAVDirectory.prototype.__defineGetter__("childNodes", function() { dump("this.childNodes called. \n"); return this.parentDirectory.QueryInterface(nsIAbDirectory).childNodes; });
AbDAVDirectory.prototype.__defineSetter__("childNodes", function(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; });

//PRUnichar* description
AbDAVDirectory.prototype.__defineGetter__("description", function() { return this.parentDirectory.QueryInterface(nsIAbDirectory).description; });
AbDAVDirectory.prototype.__defineSetter__("description", function(val) { this.parentDirectory.QueryInterface(nsIAbDirectory).description = val; });

//readonly nsIAbDirectoryProperties directoryProperties
AbDAVDirectory.prototype.__defineGetter__("directoryProperties", function() { return this.parentDirectory.QueryInterface(nsIAbDirectory).directoryProperties; });
AbDAVDirectory.prototype.__defineSetter__("directoryProperties", function(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; });

//		PRUnichar* dirName
AbDAVDirectory.prototype.__defineGetter__("dirName", function() { return this.parentDirectory.QueryInterface(nsIAbDirectory).dirName; });
AbDAVDirectory.prototype.__defineSetter__("dirName", function(val) { this.parentDirectory.QueryInterface(nsIAbDirectory).dirName = val; });

//		ACString dirPrefId
AbDAVDirectory.prototype.__defineGetter__("dirPrefId", function() { return this.parentDirectory.QueryInterface(nsIAbDirectory).dirPrefId; });
AbDAVDirectory.prototype.__defineSetter__("dirPrefId", function(val) { this.parentDirectory.QueryInterface(nsIAbDirectory).dirPrefId = val; });


//		PRBool isMailList
AbDAVDirectory.prototype.__defineGetter__("isMailList", function() { return false; });
AbDAVDirectory.prototype.__defineSetter__("isMailList", function(val) {throw Components.results.NS_ERROR_NOT_IMPLEMENTED;});

//		readonly PRBool isRemote
AbDAVDirectory.prototype.__defineGetter__("isRemote", function() { return true; });
AbDAVDirectory.prototype.__defineSetter__("isRemote", function(val) {throw Components.results.NS_ERROR_NOT_IMPLEMENTED;});

//		readonly PRBool isSecure
// TODO: probaly need to do something...
AbDAVDirectory.prototype.__defineGetter__("isSecure", function() { return false; });
AbDAVDirectory.prototype.__defineSetter__("isSecure", function(val) {throw Components.results.NS_ERROR_NOT_IMPLEMENTED;});

// PRUint32 lastModifiedDate
AbDAVDirectory.prototype.__defineGetter__("lastModifiedDate", function() { return this.parentDirectory.lastModifiedDate; });
AbDAVDirectory.prototype.__defineSetter__("lastModifiedDate", function(val) { this.parentDirectory.lastModifiedDate = val; });

//		PRUnichar* listNickName
AbDAVDirectory.prototype.__defineGetter__("listNickName", function() { return this.parentDirectory.listNickName; });
AbDAVDirectory.prototype.__defineSetter__("listNickName", function(val) { this.parentDirectory.listNickName = val; });

//		readonly PRInt32 operations
AbDAVDirectory.prototype.__defineGetter__("operations", function() { return  opSearch | opRead; });
AbDAVDirectory.prototype.__defineSetter__("operations", function(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; });

//		readonly PRBool searchDuringLocalAutocomplete
//		Directory should be searched when doing local autocomplete?
// TODO: ???
AbDAVDirectory.prototype.__defineGetter__("searchDuringLocalAutocomplete", function() { return false });
AbDAVDirectory.prototype.__defineSetter__("searchDuringLocalAutocomplete", function(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; });

//readonly PRBool supportsMailingLists
AbDAVDirectory.prototype.__defineGetter__("supportsMailingLists", function() { return false });
AbDAVDirectory.prototype.__defineSetter__("supportsMailingLists", function(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; });

// nsIAbCard addCard ( nsIAbCard card )   
// void addMailList ( nsIAbDirectory list )   
// void addMailListWithKey ( nsIAbDirectory list , out PRUint32 key )   
// void copyMailList ( nsIAbDirectory srcList )   
// void createDirectoryByURI ( PRUnichar* displayName , char* uri , PRBool migrating ) 
// void createNewDirectory ( nsIAbDirectoryProperties properties )  
 
// void deleteCards ( nsISupportsArray cards )   
// void deleteDirectory ( nsIAbDirectory dierctory )   
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

// readonly char* contractID
// A contract ID through which an instance of this class can be created (or accessed as a service, if flags & SINGLETON), or null.
AbDAVDirectory.prototype.contractID = CONTRACT_ID;
//readonly PRUint32 flags

// readonly PRUint32 implementationLanguage 
/*const*/ AbDAVDirectory.prototype.implementationLanguage = 2; //JAVASCRIPT

//nsISupports getHelperForLanguage ( PRUint32 language )  
AbDAVDirectory.prototype.getHelperForLanguage = function( language ){
	try{
		dump("AbDAVDirectory.getHelperForLanguage(" + language + ") called \n")
		//return this.parentDirectory.QueryInterface(Components.interfaces.nsIClassInfo).getHelperForLanguage(language);
		return null;
	}catch (ex){
			dump (ex + "\n File: "+  ex.fileName + "\n Line: " + ex.lineNumber + "\n\n Stack:\n\n" + ex.stack);
			throw ex;		
	}
}
//void getInterfaces ( out PRUint32 count , out nsIIDPtr array )
AbDAVDirectory.prototype.getInterfaces = function( count, array ){
	try{
//		var ci = this.parentDirectory.QueryInterface(Components.interfaces.nsIClassInfo);
//		ci.getInterfaces(count, array);
		count = 6;
		var array = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
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
}
 
//========================================================================================================================
// Components.interfaces.nsIRDFResource;
//========================================================================================================================

// readonly char* Value	
// The single-byte string value of the resource.

AbDAVDirectory.prototype.__defineGetter__("Value", function() { return this.parentDirectory.QueryInterface(nsIRDFResource).Value; });
AbDAVDirectory.prototype.__defineSetter__("Value", function(val) { this.parentDirectory.QueryInterface(nsIRDFResource).Value = val; });

// readonly AUTF8String ValueUTF8
// The UTF-8 URI of the resource.
AbDAVDirectory.prototype.__defineGetter__("ValueUTF8", function() { return this.parentDirectory.QueryInterface(nsIRDFResource).ValueUTF8; });
AbDAVDirectory.prototype.__defineSetter__("ValueUTF8", function(val) { this.parentDirectory.QueryInterface(nsIRDFResource).ValueUTF8 = val; });

//void Init ( char* uri )   
AbDAVDirectory.prototype.Init =function( uri ){
	dump("AbDAVDirectory.Init(" + uri +")\n");
	this.parentDirectory.QueryInterface(nsIRDFResource).Init( uri );
	
	dump( "\t this.Value: " + this.Value + "\n");	
	dump("AbDAVDirectory.Init(" + uri +") completed\n\n");
 }
 	
// PRBool EqualsString ( char* URI ) 
AbDAVDirectory.prototype.EqualsString = function(uri){
	dump("\t AbDAVDirectory.EqualsString(" + uri +") called\n");
	return this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).EqualsString( uri );
}

// void GetDelegate ( char* key , nsIIDRef IID , out nsQIResult* result )  
AbDAVDirectory.prototype.GetDelegate = function( key , IID ,  result ){
	this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).GetDelegate( key , IID ,  result );
	dump("\t AbDAVDirectory.GetDelegate() completed\n");
}
// [noscript] void GetValueConst ( out char* constValue )   
AbDAVDirectory.prototype.GetValueConst  = function( constValue ) {
	this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).GetValueConst( constValue );
	dump("\t AbDAVDirectory.GetValueConst() completed\n");
}	
// void ReleaseDelegate ( char* key )
AbDAVDirectory.prototype.ReleaseDelegate  = function( key ) {
	this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).ReleaseDelegate( key );
	dump("\t AbDAVDirectory.ReleaseDelegate() completed\n");	
}	

//========================================================================================================================
// Components.interfaces.nsIRDFResource
//========================================================================================================================

AbDAVDirectory.prototype.QueryInterface = function(aIID){
	if	( 	!aIID.equals(nsIRDFResource) &&
	    	!aIID.equals(nsIAbDirectory) &&
	    	!aIID.equals(nsIAbDirectorySearch) &&	
	    	!aIID.equals(nsIClassInfo) &&
	    	!aIID.equals(nsIAutoCompleteSession) &&
			!aIID.equals(nsISupports) 
		)
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
	return this;
}

//========================================================================================================================
//	Class factory
//========================================================================================================================
var AbDAVDirectoryFactory = {
  createInstance: function (aOuter, aIID)
  {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
      
    return (new AbDAVDirectory()).QueryInterface(aIID);
  }
};

//========================================================================================================================
//	Module definition (xpcom registration)
//========================================================================================================================
var AbDAVDirectoryModule = {
  _firstTime: true,
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType)
  {
    if (this._firstTime) {
      this._firstTime = false;
      throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
    };
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType)
  {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID)
  {
    if (!aIID.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    if (aCID.equals(CLASS_ID))
      return AbDAVDirectoryFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

//========================================================================================================================
//	Module initialization
//========================================================================================================================
function NSGetModule(aCompMgr, aFileSpec) { return AbDAVDirectoryModule; }
