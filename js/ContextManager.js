function ContextManager() {
  this.contexts = {};
  this.wrappedJSObject = this;
}

ContextManager.prototype = {
 contexts: null,
 wrappedJSObject: null,

 getContext: function(name) {
    var context = this.contexts[name];
    if (!context) {
      context = {};
      this.contexts[name] = context;
    }

    return context;
  },
 resetContext: function(name) {
    var context = this.contexts[name];
    if (context)
      this.contexts[name] = null;
  },
 QueryInterface: function(aIID) {
    if (!aIID.equals(Components.interfaces.inverseIJSContextManager)
	&& !aIID.equals(Components.interfaces.nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    
    return this;
 }
}
