// const CIcalDAVFBRequest = Components.interfaces.calDAVFBRequest;
// const nsISupports = Components.interfaces.nsISupports;
// const CLASS_ID = Components.ID("{9c2b2f47-efcb-48e3-8f09-1f559f335c6e}");
// const CLASS_NAME = "CalDAV FB Request wrapper";
// const CONTRACT_ID = "@inverse.ca/calendar/caldavfb-request;1";

const componentData =
  [{cid: Components.ID("{03db270b-262d-4fa4-802e-829d8b6bc708}"),
    contractid: "@inverse.ca/jsenumerator;1",
    script: "Enumerator.js",
    constructor: "JSEnumerator",
    category: "inverse-extensions",
    categoryEntry: "javascript-enumerator",
    service: false},
    {cid: Components.ID("{df1c5034-24fe-4bed-8639-e8bdfe6c31e9}"),
     contractid: "@inverse.ca/jssingletonenumerator;1",
     script: "SingletonEnumerator.js",
     constructor: "JSSingletonEnumerator",
     category: "inverse-extensions",
     categoryEntry: "javascript-enumerator",
     service: false},
    {cid: Components.ID("{882c2ce0-f7a2-4894-bce7-a119fb6f3c5c}"),
     contractid: "@mozilla.org/autocompleteSession;1?type=cardav",
     script: "CardDavAutoCompleteSession.js",
     constructor: "CardDavAutoCompleteSession",
     category: "inverse-extensions",
     categoryEntry: "carddav-autocomplete-session",
     service: false},
    {cid: Components.ID("{2e3aa298-a1f9-4aef-9f80-ca430ce6e55b}"),
     contractid: "@mozilla.org/rdf/resource-factory;1?name=moz-abdavdirectory",
     script: "abdavdirectory.js",
     constructor: "AbDAVDirectory",
     category: "inverse-extensions",
     categoryEntry: "carddav-directory",
     service: false},
    {cid: Components.ID("{868e510b-d758-4f6f-8cba-c223347ab644}"),
     contractid: "@mozilla.org/addressbook/directory-factory;1?name=moz-abdavdirectory",
     script: "abdavdirectoryfactory.js",
     constructor: "AbDAVDirFactory",
     category: "inverse-extensions",
     categoryEntry: "carddav-directory-factory",
     service: false}];

var componentRegistry = {
 mScriptsLoaded: false,
 loadScripts: function () {
    if (this.mScriptsLoaded)
      return;

    const jssslContractID = "@mozilla.org/moz/jssubscript-loader;1";
    const jssslIID = Components.interfaces.mozIJSSubScriptLoader;

    const dirsvcContractID = "@mozilla.org/file/directory_service;1";
    const propsIID = Components.interfaces.nsIProperties;

    const iosvcContractID = "@mozilla.org/network/io-service;1";
    const iosvcIID = Components.interfaces.nsIIOService;

    var loader = Components.classes[jssslContractID].getService(jssslIID);
    var dirsvc = Components.classes[dirsvcContractID].getService(propsIID);
    var iosvc = Components.classes[iosvcContractID].getService(iosvcIID);

    // Note that unintuitively, __LOCATION__.parent == .
    // We expect to find the subscripts in ./../js
    var appdir = __LOCATION__.parent.parent;
    appdir.append("js");

    for (var i = 0; i < componentData.length; i++) {
      var scriptName = componentData[i].script;
      if (!scriptName)
	continue;

      var f = appdir.clone();
      f.append(scriptName);

      try {
	var fileurl = iosvc.newFileURI(f);
	loader.loadSubScript(fileurl.spec, null);
      } catch (e) {
	dump("Error while loading " + fileurl.spec + "\n");
	throw e;
      }
    }

    this.mScriptsLoaded = true;
  },

 registerSelf: function (compMgr, fileSpec, location, type) {
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);

    var catman = Components.classes["@mozilla.org/categorymanager;1"]
    .getService(Components.interfaces.nsICategoryManager);
    for (var i = 0; i < componentData.length; i++) {
      var comp = componentData[i];
      if (!comp.cid)
	continue;
      compMgr.registerFactoryLocation(comp.cid,
				      "",
				      comp.contractid,
				      fileSpec,
				      location,
				      type);

      if (comp.category) {
	var contractid;
	if (comp.service)
	  contractid = "service," + comp.contractid;
	else
	  contractid = comp.contractid;
	catman.addCategoryEntry(comp.category, comp.categoryEntry,
				contractid, true, true);
      }
    }
  },

 makeFactoryFor: function(constructor) {
    var factory = {
    QueryInterface: function (aIID) {
	if (!aIID.equals(Components.interfaces.nsISupports) &&
	    !aIID.equals(Components.interfaces.nsIFactory))
	  throw Components.results.NS_ERROR_NO_INTERFACE;
	return this;
      },

    createInstance: function (outer, iid) {
	if (outer != null)
	  throw Components.results.NS_ERROR_NO_AGGREGATION;
	return (new constructor()).QueryInterface(iid);
      }
    };

    return factory;
  },

 getClassObject: function (compMgr, cid, iid) {
    if (!iid.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    if (!this.mScriptsLoaded)
      this.loadScripts();

    for (var i = 0; i < componentData.length; i++) {
      if (cid.equals(componentData[i].cid)) {
	if (componentData[i].onComponentLoad) {
	  eval(componentData[i].onComponentLoad);
	}
	// eval to get usual scope-walking
	return this.makeFactoryFor(eval(componentData[i].constructor));
      }
    }

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

 canUnload: function(compMgr) {
    return true;
  }
};

function NSGetModule(compMgr, fileSpec) {
  return componentRegistry;
}
