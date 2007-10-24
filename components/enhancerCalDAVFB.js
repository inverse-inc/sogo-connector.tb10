const CIcalDAVFBRequest = Components.interfaces.calDAVFBRequest;
const nsISupports = Components.interfaces.nsISupports;
const CLASS_ID = Components.ID("{9c2b2f47-efcb-48e3-8f09-1f559f335c6e}");
const CLASS_NAME = "CalDAV FB Request wrapper";
const CONTRACT_ID = "@inverse.ca/calendar/caldavfb-request;1";

const componentData =
[{cid: CLASS_ID,
  contractid: CONTRACT_ID,
  script: "calDAVFBRequest.js",
  constructor: "calDAVFBRequest",
  category: "inverse-extensions",
  categoryEntry: "caldavfb-request",
  service: false}];

var enhancerCalDAVFB = {
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
   return enhancerCalDAVFB;
}
