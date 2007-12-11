/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

/***********************************************************
constants
***********************************************************/

// reference to the interface defined in inverseJSEnumerator.idl
// const inverseIJSEnumerator = Components.interfaces.inverseIJSEnumerator;

// reference to the required base interface that all components must support
// const nsISupports = Components.interfaces.nsISupports;
// const nsIEnumerator = Components.interfaces.nsIEnumerator;

// const CONTRACT_ID = "@inverse.ca/jsenumerator;1";
// const CLASS_ID = Components.ID("{03db270b-262d-4fa4-802e-829d8b6bc708}");
// const CLASS_NAME = "Implementation of nsIEnumerator in Javascript";

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

  // void init(in nsICollection array, in PRInt32 size);	
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
    if (this.pointer < this.size - 1){
      this.pointer++;	
    }else{
      throw Components.results.NS_ERROR_FAILURE; 
    }
  },

 // nsISupports first ( )
 first : function( ){
    if (this.size > 0){
      return this.array.GetElementAt(0);
    }else{
      throw Components.results.NS_ERROR_FAILURE;
    }
  },

 // void isDone ( )
 //Return if the collection is at the end. that is the beginning following a call to Prev and it is the end of the list following a call to next 
 isDone: function(){			
    return (this.pointer < this.size);
  },

 QueryInterface: function(aIID)
 {
   if (!aIID.equals(Components.interfaces.inverseIJSEnumerator)
       && !aIID.equals(Components.interfaces.nsIEnumerator)
       && !aIID.equals(Components.interfaces.nsISupports))
     throw Components.results.NS_ERROR_NO_INTERFACE;
   return this;
 }
};
