/* componentRegistry.js - This file is part of "SOGo Connector", a Thunderbird extension.
 *
 * Copyright: Inverse inc., 2006-2010
 *    Author: Robert Bolduc, Wolfgang Sourdeau
 *     Email: support@inverse.ca
 *       URL: http://inverse.ca
 *
 * "SOGo Connector" is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 as published by
 * the Free Software Foundation;
 *
 * "SOGo Connector" is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * "SOGo Connector"; if not, write to the Free Software Foundation, Inc., 51
 * Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 */

const componentData =
    [{classID: Components.ID("{dc93fc98-bec6-11dc-b37a-00163e47dbb4}"),
      contractID: "@inverse.ca/context-manager;1",
      script: "ContextManager.js",
      constructor: "ContextManager",
      category: "inverse-extensions",
      categoryEntry: "context-manager",
      service: true},
     {classID: Components.ID("{c9a28da6-f9cd-11dc-9c23-00163e47dbb4}"),
      contractID: "@inverse.ca/notification-manager;1",
      script: "NotificationManager.js",
      constructor: "NotificationManager",
      category: "inverse-extensions",
      categoryEntry: "notification-manager",
      service: true},
     {classID: Components.ID("{72d92fb6-f9e1-11dc-9794-00163e47dbb4}"),
      contractID: "@inverse.ca/sync-progress-manager;1",
      script: "SyncProgressManager.js",
      constructor: "SyncProgressManager",
      category: "inverse-extensions",
      categoryEntry: "sync-progress-manager",
      service: true},
     {classID: Components.ID("{c8945ee4-1700-11dd-8e2e-001f5be86cea}"),
      contractID: "@inverse.ca/calendar/caldav-acl-manager;1",
      script: "CalDAVAclManager.js",
      constructor: "CalDAVAclManager",
      category: "inverse-extensions",
      categoryEntry: "caldav-acl-manager",
      service: true},
     // {classID: Components.ID("{e88f7e4a-5756-11dd-8954-001f5be86cea}"),
     //  contractID: "@inverse.ca/calendar/fburl-freebusy-provider;1",
     //  script: "SOGoFBURLFreeBusyProvider.js",
     //  constructor: "SOGoFBURLFreeBusyProvider",
     //  category: "inverse-extensions",
     //  categoryEntry: "fburl-freebusy-provider",
     //  service: true},
     {classID: Components.ID("{882c2ce0-f7a2-4894-bce7-a119fb6f3c5c}"),
      contractID: "@mozilla.org/autocompleteSession;1?type=carddav",
      script: "CardDAVAutoCompleteSession.js",
      constructor: "CardDAVAutoCompleteSession",
      category: "inverse-extensions",
      categoryEntry: "carddav-autocomplete-session",
      service: false},
     {classID: Components.ID("{688f57fc-1ac6-41df-88b1-0df9f4bafed4}"),
      contractID: "@mozilla.org/autocompleteSession;1?type=sogo-connector",
      script: "SOGoConnectorACSessionWrapper.js",
      constructor: "SOGoConnectorACSessionWrapper",
      category: "inverse-extensions",
      categoryEntry: "sogo-connector-autocomplete-session",
      service: false},

     {classID: Components.ID("{2e3aa298-a1f9-4aef-9f80-ca430ce6e55b}"),
      contractID: "@mozilla.org/rdf/resource-factory;1?name=moz-abdavdirectory",
      script: "CardDAVDirectory.js",
      constructor: "CardDAVDirectory",
      category: "inverse-extensions",
      categoryEntry: "carddav-directory",
      service: false},

     {classID: Components.ID("{868e510b-d758-4f6f-8cba-c223347ab644}"),
      contractID: "@mozilla.org/addressbook/directory-factory;1?name=carddav",
      script: "CardDAVDirectoryFactory.js",
      constructor: "CardDAVDirectoryFactory",
      category: "inverse-extensions",
      categoryEntry: "carddav-directory-factory",
      service: true},
     {classID: Components.ID("{868e510b-d758-4f6f-8cba-c223347ab644}"),
      contractID: "@mozilla.org/addressbook/directory-factory;1?name=moz-abdavdirectory",
      script: "CardDAVDirectoryFactory.js",
      constructor: "CardDAVDirectoryFactory",
      category: "inverse-extensions",
      categoryEntry: "carddav-directory-factory",
      service: true}];

let componentRegistry = {
    mScriptsLoaded: false,
    loadScripts: function () {
        if (this.mScriptsLoaded)
            return;

        dump("register load scripts....\n");

        const jssslContractID = "@mozilla.org/moz/jssubscript-loader;1";
        const jssslIID = Components.interfaces.mozIJSSubScriptLoader;

        const dirsvcContractID = "@mozilla.org/file/directory_service;1";
        const propsIID = Components.interfaces.nsIProperties;

        const iosvcContractID = "@mozilla.org/network/io-service;1";
        const iosvcIID = Components.interfaces.nsIIOService;

        let loader = Components.classes[jssslContractID].getService(jssslIID);
        let dirsvc = Components.classes[dirsvcContractID].getService(propsIID);
        let iosvc = Components.classes[iosvcContractID].getService(iosvcIID);

        // Note that unintuitively, __LOCATION__.parent == .
        // We expect to find the subscripts in ./../js
        let appdir = __LOCATION__.parent.parent;
        appdir.append("js");

        for (let i = 0; i < componentData.length; i++) {
            let scriptName = componentData[i].script;
            if (!scriptName)
                continue;

            let f = appdir.clone();
            f.append(scriptName);

            try {
                let fileurl = iosvc.newFileURI(f);
                loader.loadSubScript(fileurl.spec, null);
            }
            catch (e) {
                dump("Error while loading " + fileurl.spec + "\n");
                throw e;
            }
        }

        this.mScriptsLoaded = true;
    },

    registerSelf: function (compMgr, fileSpec, location, type) {
        compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);

        let catman = Components.classes["@mozilla.org/categorymanager;1"]
                               .getService(Components.interfaces.nsICategoryManager);
        for (let i = 0; i < componentData.length; i++) {
            let comp = componentData[i];
            if (!comp.classID)
                continue;
            compMgr.registerFactoryLocation(comp.classID,
                                            "",
                                            comp.contractID,
                                            fileSpec,
                                            location,
                                            type);

            if (comp.category) {
                let contractID;
                if (comp.service)
                    contractID = "service," + comp.contractID;
                else
                    contractID = comp.contractID;
                catman.addCategoryEntry(comp.category, comp.categoryEntry,
                                        contractID, true, true);
            }
        }
    },

    makeFactoryFor: function(constructor) {
        let factory = {
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

    getClassObject: function (compMgr, classID, iid) {
        if (!iid.equals(Components.interfaces.nsIFactory))
            throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

        if (!this.mScriptsLoaded)
            this.loadScripts();

        for (let i = 0; i < componentData.length; i++) {
            if (classID.equals(componentData[i].classID)) {
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
