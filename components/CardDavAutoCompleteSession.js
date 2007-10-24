/***********************************************************
constants
***********************************************************/

// reference to the interface defined in inverseJSEnumerator.idl
//const inverseIJSEnumerator = Components.interfaces.inverseIJSEnumerator;

// reference to the required base interface that all components must support
const nsISupports = Components.interfaces.nsISupports;
const nsIAutoCompleteSession = Components.interfaces.nsIAutoCompleteSession;

const CONTRACT_ID = "@mozilla.org/autocompleteSession;1?type=cardav";
const CLASS_ID = Components.ID("{26edaa3d-a543-498b-924e-9690a6fe7036}");
const CLASS_NAME = "Implementation of nsIAutoCompleteSession for cardDAV";


/***********************************************************
class definition
***********************************************************/

//class constructor
function CardDavAutoCompleteSession() {
	dump("CardDavAutoCompleteSession constructor!");	
};


// void onAutoComplete ( PRUnichar* searchString , nsIAutoCompleteResults previousSearchResult , nsIAutoCompleteListener listener )
CardDavAutoCompleteSession.prototype.onAutoComplete = function(searchString, previousSearchResult, listener ){
	dump("CardDavAutoCompleteSession.prototype.onAutoComplete");	
}
// void onStartLookup ( PRUnichar* searchString , nsIAutoCompleteResults previousSearchResult , nsIAutoCompleteListener listener )
CardDavAutoCompleteSession.prototype.onStartLookup = function( searchString, previousSearchResult, listener ){
	dump("CardDavAutoCompleteSession.prototype.onStartLookup");	
}
// void onStopLookup ( ) 
CardDavAutoCompleteSession.prototype.onStopLookup = function(){
	dump("CardDavAutoCompleteSession.prototype.onStopLookup");
}

CardDavAutoCompleteSession.prototype.QueryInterface = function(aIID){
	if (	!aIID.equals(nsIAutoCompleteSession) && 
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
        QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, 
        CONTRACT_ID, aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType)
  {
    aCompMgr = aCompMgr.
        QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID)
  {
    if (!aIID.equals(Components.interfaces.nsIFactory))
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
