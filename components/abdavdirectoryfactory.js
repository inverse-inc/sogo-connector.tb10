/********************************************************************************
 Copyright:	Inverse groupe conseil, 2007-2008
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


/**********************************************************************************************
 *
 * Factory to instanciate a DAV Addressbook
 *
 * I am following the method used in /mailnews/addrbook/src/nsAbLDAPDirFactory.cpp
 **********************************************************************************************/

// constants
const nsIAbDirFactory = Components.interfaces.nsIAbDirFactory;
const nsISupports = Components.interfaces.nsISupports;
const CLASS_ID = Components.ID("{868e510b-d758-4f6f-8cba-c223347ab644}");
const CLASS_NAME = "DAV Addressbook Factory";
const CONTRACT_ID = "@mozilla.org/addressbook/directory-factory;1?name=moz-abdavdirectory";

//class constructor
function AbDAVDirFactory() {
};

//class definition
AbDAVDirFactory.prototype = {

	// nsISimpleEnumerator createDirectory ( nsIAbDirectoryProperties properties )
	createDirectory: function(properties){
		try{
			//TODO: validate properties
			var description = properties.description;
			var uri = properties.URI;
    		var prefName = properties.prefName;
			
			var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
/*			dump("\nAbDAVDirFactory values \n");
			dump("\t properties.uri: " + properties.URI + "\n");
			dump("\t properties.dirType: " + properties.dirType + "\n");
			dump("\t properties.fileName: " + properties.fileName + "\n");
			dump("\t description: " + properties.description + "\n");
			dump("\t uri: " + uri + "\n");
			dump("\t properties.prefName: " + properties.prefName + "\n");
*/			
			var resource = rdf.GetResource(uri);
			var directory = resource.QueryInterface(Components.interfaces.nsIAbDirectory);
			directory.dirName = description;
			directory.dirPrefId = prefName;	
			var singletonEnum = Components.classes["@inverse.ca/jssingletonenumerator;1"].createInstance(Components.interfaces.inverseIJSSingletonEnumerator);
			singletonEnum.init(directory.QueryInterface(nsISupports));

			return singletonEnum;
		}catch(ex){
			dump (ex + "\n File: "+  ex.fileName + "\n Line: " + ex.lineNumber + "\n\n Stack:\n\t" + ex.stack + "\n\n");
			throw ex;
		}
	},

	//void deleteDirectory ( nsIAbDirectory directory )
	deleteDirectory: function(directory) {
		dump("CALLED deleteDirectory: function(directory)\n");
	},

  QueryInterface: function(aIID)
  {
    if (!aIID.equals(nsIAbDirFactory) &&    
        !aIID.equals(nsISupports)){
    	throw Components.results.NS_ERROR_NO_INTERFACE;
    }
      
    return this;
  }
};

//class factory
var AbDAVDirFactoryFactory = {
  createInstance: function (aOuter, aIID)
  {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    return (new AbDAVDirFactory()).QueryInterface(aIID);
  }
};

//module definition (xpcom registration)
var AbDAVDirFactoryModule = {
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
      return AbDAVDirFactoryFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

//module initialization
function NSGetModule(aCompMgr, aFileSpec) { return AbDAVDirFactoryModule; }
