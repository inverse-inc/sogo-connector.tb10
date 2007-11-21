Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader)
	.loadSubScript("chrome://sogo-connector/content/addressbook/webdav.inverse.ca.js");

Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader)
	.loadSubScript("chrome://sogo-connector/content/addressbook/vcards.utils.js");
	
/***********************************************************
constants
***********************************************************/

// reference to the interface defined in inverseJSEnumerator.idl
//const inverseIJSEnumerator = CI.inverseIJSEnumerator;

// reference to the required base interface that all components must support
const CI = Components.interfaces;
const nsISupports = CI.nsISupports;
const nsICardDAVAutoCompleteSession = CI.nsICardDAVAutoCompleteSession;

const CONTRACT_ID = "@mozilla.org/autocompleteSession;1?type=cardav";
const CLASS_ID = Components.ID("{882c2ce0-f7a2-4894-bce7-a119fb6f3c5c}");
const CLASS_NAME = "Implementation of nsICardDAVAutoCompleteSession";

/***********************************************************
class definition
***********************************************************/

//class constructor
function CardDavAutoCompleteSession() {
	dump("CardDavAutoCompleteSession constructor!\n");	
};

CardDavAutoCompleteSession.prototype.url = null;

CardDavAutoCompleteSession.prototype.__defineGetter__("serverURL", function() { 
	return this.url; 	
});

CardDavAutoCompleteSession.prototype.__defineSetter__("serverURL", function(value) { 
	this.url = value; 	
});

// void onAutoComplete ( PRUnichar* searchString , nsIAutoCompleteResults previousSearchResult , nsIAutoCompleteListener listener )
CardDavAutoCompleteSession.prototype.onAutoComplete = function(searchString, previousSearchResult, listener ){
	dump("**************************************************************\n");
	dump("CardDavAutoCompleteSession.prototype.onAutoComplete\n");	
	dump("**************************************************************\n");	
}
// void onStartLookup ( PRUnichar* searchString , nsIAutoCompleteResults previousSearchResult , nsIAutoCompleteListener listener )
CardDavAutoCompleteSession.prototype.onStartLookup = function( searchString, previousSearchResult, listener ){

	if ( ! listener ){
		dump("NULL listener in CardDavAutoCompleteSession.prototype.onStartLookup\n");
		listener.onAutoComplete( null, -1);//nsIAutoCompleteStatus::failed
		
	}else{
		var url = getABDavURL( this.url.spec );
		if ( url ){			
			var doc = cardDavReport(url, searchString);
			var nodeList = doc.getElementsByTagName("addressbook-data");
			
			// To support customs fields introduced in importFromVcard for FreeBuzy
			var customFieldsArray;// // TODO: when the overhaul of the vcard parsing is done, this will have to be handle differently!!!	
			var resultArray = Components.classes["@mozilla.org/supports-array;1"].createInstance(CI.nsISupportsArray);
			
			//Adding cards to array
			var card;
			for (var i = 0; i < nodeList.length; i++){
				customFieldsArray = new Array();
				dump("\n===================================================\n");					
				dump(nodeList.item(i).textContent.toString());
				dump("\n===================================================\n");				
				
				card = importFromVcard(nodeList.item(i).textContent.toString(), null, customFieldsArray);
				
				resultArray.AppendElement(formatAutoCompleteItem(card));
			}	
			dump("=======> resultArray.Count: " + resultArray.Count() + "\n");

			if (nodeList.length > 0){
				var matchFound = 1; //nsIAutoCompleteStatus::matchFound
				
				var results = Components.classes["@mozilla.org/autocomplete/results;1"].createInstance(CI.nsIAutoCompleteResults);
				//results.items = resultArray.QueryInterface(CI.nsICollection);
				results.items = resultArray;

				results.defaultItemIndex = 0;
				results.searchString = searchString;
				
				listener.onAutoComplete( results,  matchFound);
			}else{
				var noMatch = 0; //nsIAutoCompleteStatus::noMatch
				listener.onAutoComplete( null, noMatch);
			}			
		}else{
			dump("no url in CardDavAutoCompleteSession.prototype.onStartLookup\n");
			listener.onAutoComplete( null, -1);//nsIAutoCompleteStatus::failed
		}
	}
}

function formatAutoCompleteItem( card, searchString ){
	var item = Components.classes["@mozilla.org/autocomplete/item;1"].createInstance(CI.nsIAutoCompleteItem);
	item.className = "remote-abook";
	item.comment = card.displayName;
	dump("***********************************\n");
	dump(card.displayName + "\n");
	dump(card.defaultEmail + "\n");
	dump(card.primaryEmail + "\n");
	dump(card.secondEmail + "\n");
	item.param = searchString;
	item.value = card.primaryEmail;
	dump("***********************************\n");	
	return item;
}
// void onStopLookup ( ) 
CardDavAutoCompleteSession.prototype.onStopLookup = function(){
	dump("CardDavAutoCompleteSession.prototype.onStopLookup\n");
}

CardDavAutoCompleteSession.prototype.QueryInterface = function(aIID){
	if (	!aIID.equals(nsICardDAVAutoCompleteSession) && 
			!aIID.equals(nsISupports))
		throw Components.results.NS_ERROR_NO_INTERFACE;
	return this;
}


/***********************************************************
class factory
***********************************************************/
var CardDavAutoCompleteSessionFactory = {
  createInstance: function (aOuter, aIID)
  {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    return (new CardDavAutoCompleteSession()).QueryInterface(aIID);
  }
};

/***********************************************************
module definition (xpcom registration)
***********************************************************/
var CardDavAutoCompleteSessionModule = {
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType)
  {
    aCompMgr = aCompMgr.
        QueryInterface(CI.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, 
        CONTRACT_ID, aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType)
  {
    aCompMgr = aCompMgr.
        QueryInterface(CI.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID)
  {
    if (!aIID.equals(CI.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    if (aCID.equals(CLASS_ID))
      return CardDavAutoCompleteSessionFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

/***********************************************************
module initialization

When the application registers the component, this function
is called.
***********************************************************/
function NSGetModule(aCompMgr, aFileSpec) { 
	return CardDavAutoCompleteSessionModule; }
