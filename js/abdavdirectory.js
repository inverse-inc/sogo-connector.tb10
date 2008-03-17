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
		try {
			loader.loadSubScript(files[i], target);
		}
		catch(e) {
			dump("abdavdirectory.js: failed to include '" + files[i] +
					 "'\n" + e
					 + "\nFile: " + e.fileName
					 + "\nLine: " + e.lineNumber + "\n\n Stack:\n\n" + e.stack);
		}
	}
}

jsInclude(["chrome://sogo-connector/content/general/vcards.utils.js",
					 "chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js",
					 "chrome://sogo-connector/content/general/webdav.inverse.ca.js"]);

const opRead = 1;
const opWrite = 2;
const opSearch = 4;

function AbDAVDirectory() {
// 	dump("\n\nabdavdirectory.js: AbDAVDirectory constructed\n");

	this.mValue = "";
	this.mQuery = "";
// 	this.mDirectoryProperties = new AbDAVDirectoryProperties(this);
	this.mDirectoryProperties = Components.classes["@mozilla.org/addressbook/properties;1"]
		.createInstance(Components.interfaces.nsIAbDirectoryProperties);

  this.wrappedJSObject = this;
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
 wrappedJSObject: null,
 directoryProperties: null,
 mAddressLists: null,

 /* nsIRDFResource */
 // Components.interfaces.nsIRDFResource;
 get Value() {
// 		dump("abdavdirectory.js: Value (" + this.mValue + ")\n");
	 return this.mValue;
 },
 set Value(val) {
// 	 dump("abdavdirectory.js: Value = " + val + "\n");
	 this.mValue = val;
 },

 // readonly AUTF8String ValueUTF8
 // The UTF-8 URI of the resource.
 get ValueUTF8() {
// 	 dump("abdavdirectory.js: ValueUTF8: " + value + "\n");
	 var conv = Components.classes["@mozilla.org/intl/utf8converterservice;1"]
	 .createInstance(Components.interfaces.nsIUTF8ConverterService);
	 return conv.convertStringToUTF8(this.Value, "iso-8859-1", false);
 },

 set ValueUTF8(val) {
	 dump("abdavdirectory.js: ValueUTF8 = " + val + "\n");
	 this.Value = val;
 },

 //void Init ( char* uri )   
 Init: function(uri) {
	 var abPrefix = "moz-abdavdirectory://";
// 	 dump("\nabdavdirectory.js: Init: uri = " + uri + "\n");
// 	 dump("backtrace: " + backtrace() + "\n\n");
	 if (uri.indexOf(abPrefix) == 0) {
		 var prefName = uri.substr(abPrefix.length);
		 var quMark = prefName.indexOf("?");
		 if (quMark > 1) {
			 this.mQuery = prefName.substr(quMark);
			 prefName = prefName.substr(0, quMark);
		 }
		 this.mValue = uri;
		 this.mDirectoryProperties.prefName = prefName;
		 this._load();

// 		 dump("prefname: " + this.mDirectoryProperties.prefName + "\n");
	 }
	 else
		 throw "unknown uri: " + uri;
 },

 _load: function() {
	 var prefName = this.mDirectoryProperties.prefName;
	 if (!prefName || prefName == "")
		 dump("directory-properties: cannot load when prefName is empty\n");
	 else {
// 		 dump("directory-properties: loading properties (" + prefName + ")\n");
		 var service = Components.classes["@mozilla.org/preferences-service;1"]
			 .getService(Components.interfaces.nsIPrefService);
		 try {
			 var branch = service.getBranch(prefName + ".");
			 this.mDirectoryProperties.description
				 = branch.getCharPref("description");
			 this.mDirectoryProperties.URI = branch.getCharPref("uri");
			 this.mDirectoryProperties.dirType = 0;
			 this.mDirectoryProperties.position = 0;
		 }
		 catch(e) {
			 dump("directory-properties: exception (new directory '" + prefName
						+ "', URI '" + this.mValue + "' ?):" + e + "\n");
		 }
	 }
 },

 // PRBool EqualsString ( char* URI ) 
 EqualsString: function(uri) {
// 	 dump("abdavdirectory.js: EqualsString\n");
	 return (this.mValue == uri);
 },

 // void GetDelegate ( char* key , nsIIDRef IID , out nsQIResult* result )  
 GetDelegate: function(key, IID, result) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
// 	 this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).GetDelegate( key , IID ,  result );
// 	 dump("abdavdirectory.js: \t AbDAVDirectory.GetDelegate() completed\n");
 },
 // [noscript] void GetValueConst ( out char* constValue )   
 GetValueConst: function(constValue) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
// 	 this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).GetValueConst( constValue );
// 	 dump("abdavdirectory.js: \t AbDAVDirectory.GetValueConst() completed\n");
 },
 // void ReleaseDelegate ( char* key )
 ReleaseDelegate: function(key) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
// 	 this.parentDirectory.QueryInterface(Components.interfaces.nsIRDFResource).ReleaseDelegate( key );
// 	 dump("abdavdirectory.js: \t AbDAVDirectory.ReleaseDelegate() completed\n");	
 },

 /* nsIAbDirectory */

 get operations() {
// 	 dump("abdavdirectory.js: operations\n");
 return opSearch | opRead; },
 set operations(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

 get dirName() { 
	 var conv = Components.classes["@mozilla.org/intl/utf8converterservice;1"]
	 .createInstance(Components.interfaces.nsIUTF8ConverterService);
	 var dirNameRaw = this.mDirectoryProperties.description;
	 var dirNameUTF8
	 = conv.convertStringToUTF8(dirNameRaw, "iso-8859-1", false);
	 return dirNameUTF8;
 },
// 	 dump("abdavdirectory.js: dirName ("
// 				+ this.mDirectoryProperties.description + ")\n");
//  	 return this.mDirectoryProperties.description; },

 set dirName(val) {
// 	 dump("abdavdirectory.js: dirName = " + val + "\n");
 this.mDirectoryProperties.description = val; },

 get lastModifiedDate() {
// 	 dump("abdavdirectory.js: lastModifiedDate\n");
	 return 0; },
 set lastModifiedDate(val) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },

 get isMailList() {
// 	 dump("abdavdirectory.js: isMailList\n");
	 return false; },
 set isMailList(val) {
// 	 dump("abdavdirectory.js: isMailList = " + val + "\n");
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },

 get directoryProperties() {
// 	 dump("abdavdirectory.js: directoryProperties\n");
	 return this.mDirectoryProperties;
 },
 
 set directoryProperties(val) {
// 	 dump("abdavdirectory.js: new directoryProperties = " + val + "\n");
	 this.mDirectoryProperties = val;
 },

 /* retrieve the sub-directories */
 get childNodes() {
	 var resultArray = Components.classes["@mozilla.org/supports-array;1"]
	 .createInstance(Components.interfaces.nsISupportsArray);
	 return resultArray.Enumerate(); },
 set childNodes(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

 get childCards() {
// 		dump("abdavdirectory.js: childCards\n");
	 return this._getChildCards();
 },
 _getChildCards: function() {
	 var result = null;
	 
	 reg = new RegExp(/\?\(.*\(.*,.*,(.*)\).*\)\)/);
	 if (reg.test(this.mQuery)) {
		 var criteria = RegExp.$1;	
// 		 dump("abdavdirectory.js: criteria: " + criteria + "\n");
		 
		 var cardDavPrefix = "carddav://";
		 var uri = this.mDirectoryProperties.URI;
		 var httpURL = "";
		 if (uri && uri.indexOf(cardDavPrefix) == 0)
			 httpURL = uri.substr(cardDavPrefix.length);

		 var resultArray = this._serverQuery(httpURL, criteria);
		 result = resultArray.Enumerate();
	 }

	 return result;
 },
 _serverQuery: function(url, criteria) {
//  	 dump("abdavdirectory.js: serverQuery\n");
	 var resultArray = Components.classes["@mozilla.org/supports-array;1"]
	 .createInstance(Components.interfaces.nsISupportsArray);

	 var doc = cardDavReport(url, criteria);
	 var nodeList = doc.getElementsByTagName("addressbook-data");
	
	 for (var i = 0; i < nodeList.length; i++) {
// 		 dump("node: " + i + "\n");
		 var customFields = {};
// 		 dump("text: " + nodeList[i].textContent + "\n");
		 var card = importFromVcard(nodeList[i].textContent,
																customFields);
// 		 for (var k in customFields) {
// 			 dump(k + ": " + customFields[k] + "\n");
// 		 }
		 card.setStringAttribute("calFBURL", customFields["fburl"]);
		 card.setStringAttribute("uid", customFields["uid"]);
		 resultArray.AppendElement(card);
// 		 dump("node loaded\n");
	 }
// 	 dump("query finished\n\n\n");

	 return resultArray;
 },
 set childCards (val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

 modifyDirectory: function (directory, properties) {
// 	 dump("abdavdirectory.js: ============>CALLED modifyDirectory!!!\n");
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },

 deleteDirectory: function ( directory ) {
// 	 dump("abdavdirectory.js: ============>CALLED deleteDirectory!!!\n");
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },

 deleteCards: function(cards) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },

 hasCard: function(cards) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },
 hasDirectory: function(dir) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },

 dropCard: function(card, needToCopyCard) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },

 get isRemote() { return true; },
 set isRemote(val) {throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

 get isSecure() {
// 	 dump("abdavdirectory.js: isSecure\n");

	 var cardDavPrefix = "carddav://";
	 var uri = this.mDirectoryProperties.URI;
	 var httpURL = "";
	 if (uri && uri.indexOf(cardDavPrefix) == 0)
		 httpURL = uri.substr(cardDavPrefix.length);
	 return (httpURL.indexOf("https") == 0);
 },
 set isSecure(val) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },

 get searchDuringLocalAutocomplete() { 
// 	 dump("abdavdirectory.js: searchDuringLocalAutocomplete\n");
return false },
 set searchDuringLocalAutocomplete(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

 get supportsMailingLists() {
// 	 dump("abdavdirectory.js: supportsMailingLists\n");
 return false },
 set supportsMailingLists(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },

 get addressLists() {
// 		dump("abdavdirectory.js: addressLists\n");
	 return this.mAddressLists;
 },
 set addressLists(val) {
// 		dump("abdavdirectory.js: addressLists = " + val + "\n");
	 this.mAddressLists = val;
 },

 addMailList: function(list) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },
 addMailListWithKey: function(list, key) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },

 get listNickName() {
// 	 dump("abdavdirectory.js: listNickName\n");
	 return null; /*this.parentDirectory.listNickName*/ },
 set listNickName(val) { this.parentDirectory.listNickName = val; },

 get description() { 
// 	 dump("abdavdirectory.js: description\n");
	 return this.mDirectoryProperties.description; },

 set description(val) {
// 	 dump("abdavdirectory.js: description = " + val + "\n");
	 this.mDirectoryProperties.description = val;
 },

 editMailListToDatabase: function(uri, listCard) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },
 copyMailList: function(srcList) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },
 createNewDirectory: function(properties) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },
 createDirectoryByURI: function(displayName, uri, migrating) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },
 setValueForCard: function(card, name, value) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
 },
 get dirPrefId() {
// 	 dump("abdavdirectory.js: dirPrefId (" +
// 	 this.mDirectoryProperties.prefName + "\n");

	 return this.mDirectoryProperties.prefName;
 },
 set dirPrefId(val) {
// 	 dump("abdavdirectory.js: dirPrefId = " + val + "\n");
	 if (this.mDirectoryProperties.prefName)
		 dump("replacing '" + this.mDirectoryProperties.prefName + "'\n");
		 
	 this.mDirectoryProperties.prefName = val;
 },

 /* nsISupports */
 QueryInterface: function(aIID) {
	 if (!aIID.equals(Components.interfaces.nsIRDFResource)
			 && !aIID.equals(Components.interfaces.nsIAbDirectory)
			 && !aIID.equals(Components.interfaces.nsISupports))
		 throw Components.results.NS_ERROR_NO_INTERFACE;

	 return this;
 }
};
