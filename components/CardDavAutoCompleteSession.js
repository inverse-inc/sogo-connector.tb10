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
	dump("CardDavAutoCompleteSession constructor!");	
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
	dump("CardDavAutoCompleteSession.prototype.onStartLookup\n");	
	dump("searchString: " + searchString + "\n");
	dump("url: " + this.url.spec + "\n");
	// Matching the URL
	var reg = new RegExp(/moz-abdavdirectory:\/\/(.*)\?/);
	if ( !reg.test(this.Value)){
		dump("Problem with URL in CardDavAutoCompleteSession.prototype.onStartLookup()")
	}	
	var url = RegExp.$1;	
	var doc = cardDavReport(url, searchString);
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
