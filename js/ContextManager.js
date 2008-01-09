function ContextManager() {
  dump("new ContextManager\n");
  this.contexts = {};
}

ContextManager.prototype = {
 contexts: null,

 getContext: function(name, ctxWrapper) {
    var context = this.contexts[name];
    if (!context) {
      context = Components.classes["@mozilla.org/hash-property-bag;1"]
	.createInstance(Components.interfaces.nsIWritablePropertyBag);
//       context = {};
      this.contexts[name] = context;
    }

//     dump("wrapper: " + ctxWrapper + "\n");
//     for (var k in ctxWrapper) {
//       dump("k: " + k + "; v: " + ctxWrapper[k] + "\n");
//     }
//     var newWrapper = Components.classes["@mozilla.org/supports-array;1"]
//     .createInstance(Components.interfaces.nsISupportsArray);
//     newWrapper.AppendElement(context);
    ctxWrapper.value = context;
//     dump("expected: " + ctxWrapper[0] + "\n");

//     ctxWrapper.value = 5;
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
