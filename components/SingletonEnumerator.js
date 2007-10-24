/***********************************************************
constants
***********************************************************/

// reference to the interface defined in inverseJSSingletonEnumerator.idl
const inverseIJSSingletonEnumerator = Components.interfaces.inverseIJSSingletonEnumerator;

// reference to the required base interface that all components must support
const nsISupports = Components.interfaces.nsISupports;
const nsISimpleEnumerator = Components.interfaces.nsISimpleEnumerator;

const CONTRACT_ID = "@inverse.ca/jssingletonenumerator;1";
const CLASS_ID = Components.ID("{df1c5034-24fe-4bed-8639-e8bdfe6c31e9}");
const CLASS_NAME = "Implementation of nsISimpleEnumerator in Javascript";


/***********************************************************
class definition
***********************************************************/

//class constructor
function JSSingletonEnumerator() {
	this.more = false;
	this.pointer = null;
};

// class definition
JSSingletonEnumerator.prototype = {
//================================================================
//	inverseIJSSingletonEnumerator method
//================================================================
  init: function(obj) {
  		this.more = true;
      this.pointer = obj;
  },
//================================================================  
//	nsISimpleEnumerator methods
//================================================================
// nsISupports getNext ( )
	getNext: function( ){
		this.more = false;
		return this.pointer;
	},

//PRBool hasMoreElements ( )
	hasMoreElements: function(){	
	return this.more;
},

  QueryInterface: function(aIID)
  {
    if (	!aIID.equals(inverseIJSSingletonEnumerator) && 
    		!aIID.equals(nsISimpleEnumerator) &&   
        	!aIID.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
};

/***********************************************************
class factory
***********************************************************/
var JSSingletonEnumeratorFactory = {
  createInstance: function (aOuter, aIID)
  {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    return (new JSSingletonEnumerator()).QueryInterface(aIID);
  }
};

/***********************************************************
module definition (xpcom registration)
***********************************************************/
var JSSingletonEnumeratorModule = {
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
      return JSSingletonEnumeratorFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

/***********************************************************
module initialization

When the application registers the component, this function
is called.
***********************************************************/
function NSGetModule(aCompMgr, aFileSpec) { return JSSingletonEnumeratorModule; }
