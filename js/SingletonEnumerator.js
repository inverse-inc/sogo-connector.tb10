/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

/***********************************************************
constants
***********************************************************/

// reference to the interface defined in inverseJSSingletonEnumerator.idl
// const inverseIJSSingletonEnumerator = Components.interfaces.inverseIJSSingletonEnumerator;

// // reference to the required base interface that all components must support
// const nsISupports = Components.interfaces.nsISupports;
// const nsISimpleEnumerator = Components.interfaces.nsISimpleEnumerator;

// const CONTRACT_ID = "@inverse.ca/jssingletonenumerator;1";
// const CLASS_ID = Components.ID("{df1c5034-24fe-4bed-8639-e8bdfe6c31e9}");
// const CLASS_NAME = "Implementation of nsISimpleEnumerator in Javascript";


/***********************************************************
class definition
***********************************************************/

//class constructor
function JSSingletonEnumerator() {
	this.more = false;
	this.pointer = null;
}

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
	 if (!aIID.equals(Components.interfaces.inverseIJSSingletonEnumerator)
			 && !aIID.equals(Components.interfaces.nsISimpleEnumerator)
			 && !aIID.equals(Components.interfaces.nsISupports))
		 throw Components.results.NS_ERROR_NO_INTERFACE;
	 return this;
 }
};
