/***********************************************************
constants
***********************************************************/

// reference to the interface defined in inverseJSEnumerator.idl
const inverseIJSEnumerator = Components.interfaces.inverseIJSEnumerator;

// reference to the required base interface that all components must support
const nsISupports = Components.interfaces.nsISupports;
const nsIEnumerator = Components.interfaces.nsIEnumerator;

const CONTRACT_ID = "@inverse.ca/jsenumerator;1";
const CLASS_ID = Components.ID("{03db270b-262d-4fa4-802e-829d8b6bc708}");
const CLASS_NAME = "Implementation of nsIEnumerator in Javascript";


/***********************************************************
class definition
***********************************************************/

//class constructor
function JSEnumerator() {
	this.size = 0;
	this.pointer = 0;
};

// class definition
JSEnumerator.prototype = {
//================================================================
//	inverseIJSEnumerator method
//================================================================
	init: function( array, size) {
		if (size > 0){
	  		this.pointer = 0;
	      this.array = array;
	      this.size = size;
	  	}
	},
//================================================================  
//	nsIEnumerator methods
//================================================================

//nsISupports currentItem ( )
//CurrentItem will return the CurrentItem item it will fail if the list is empty 
	currentItem : function(){
		if (this.size > 0){
			return this.array.GetElementAt(this.pointer);
		}else{		
			throw Components.results.NS_ERROR_FAILURE;
		}
	},
// nsISupports next ( )
	next : function( ){
		dump("JSEnumerator.next()\n");
		if (this.pointer < this.size - 1){
			this.pointer++;	
		}else{
			throw Components.results.NS_ERROR_FAILURE;
		}
	},

// nsISupports first ( )
	first : function( ){
		dump("JSEnumerator.first()\n")
		if (this.size > 0){
			return this.array.GetElementAt(0);
		}else{
			throw Components.results.NS_ERROR_FAILURE;
		}
	},

// void isDone ( )
//Return if the collection is at the end. that is the beginning following a call to Prev and it is the end of the list following a call to next 
	isDone: function(){	
		dump("JSEnumerator.isDone()\n")		
		return (this.pointer < this.size);
},

  QueryInterface: function(aIID)
  {
    if (	!aIID.equals(inverseIJSEnumerator) && 
    		!aIID.equals(nsIEnumerator) &&   
        	!aIID.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
};

/***********************************************************
class factory
***********************************************************/
var JSEnumeratorFactory = {
  createInstance: function (aOuter, aIID)
  {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    return (new JSEnumerator()).QueryInterface(aIID);
  }
};

/***********************************************************
module definition (xpcom registration)
***********************************************************/
var JSEnumeratorModule = {
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
      return JSEnumeratorFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

/***********************************************************
module initialization

When the application registers the component, this function
is called.
***********************************************************/
function NSGetModule(aCompMgr, aFileSpec) { return JSEnumeratorModule; }
