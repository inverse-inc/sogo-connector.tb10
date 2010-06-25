/* CardDAVDirectory.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

const gCardDavPrefix = "carddav://";
const gABPrefix = "moz-abdavdirectory://";

function jsInclude(files, target) {
    let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                           .getService(Components.interfaces.mozIJSSubScriptLoader);
    for (let i = 0; i < files.length; i++) {
        try {
            loader.loadSubScript(files[i], target);
        }
        catch(e) {
            dump("CardDAVDirectory.js: failed to include '" + files[i] +
                 "'\n" + e
                 + "\nFile: " + e.fileName
                 + "\nLine: " + e.lineNumber + "\n\n Stack:\n\n" + e.stack);
        }
    }
}

jsInclude(["chrome://inverse-library/content/sogoWebDAV.js",
           "chrome://sogo-connector/content/general/vcards.utils.js",
           "chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js"]);

function CardDAVDirectory() {
    // 	dump("\n\nCardDAVDirectory.js: CardDAVDirectory constructed\n");

    this.mValue = "";
    this.mQuery = "";
    this.mDirPrefId = "";
    this.mDescription = "";
    this.mURI = "";

    this.wrappedJSObject = this;
}

CardDAVDirectory.prototype = {
    wrappedJSObject: null,
    directoryProperties: null,
    mAddressLists: null,

    mDirPrefId: null,
    mDescription: null,
    mURI: null,

    /* nsIRDFNode */
    EqualsNode: function(uri) {
        dump("CardDAVDirectory.js: EqualsNode\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        return false;
    },

    /* nsIRDFResource */
    get Value() {
        // 		dump("CardDAVDirectory.js: Value (" + this.mValue + ")\n");
        return this.mValue;
    },

    get ValueUTF8() {
        // 	 dump("CardDAVDirectory.js: ValueUTF8: " + value + "\n");
        let conv = Components.classes["@mozilla.org/intl/utf8converterservice;1"]
                             .createInstance(Components.interfaces.nsIUTF8ConverterService);
        return conv.convertStringToUTF8(this.Value, "iso-8859-1", false);
    },

    Init: function(uri) {
        // dump("CardDAVDirectory.js: Init: uri = " + uri + "\n");
        // 	 dump("backtrace: " + backtrace() + "\n\n");
        if (uri.indexOf(gABPrefix) == 0) {
            let prefName = uri.substr(gABPrefix.length);
            let quMark = prefName.indexOf("?");
            if (quMark > 1) {
                this.mQuery = prefName.substr(quMark);
                prefName = prefName.substr(0, quMark);
            }
            this.mValue = uri;
            this.mDirPrefId = prefName;
            this._load();
        }
        else
            throw "unknown uri: " + uri;
    },

    _load: function() {
        let prefName = this.mDirPrefId;
        let service = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);
        try {
            let branch = service.getBranch(prefName + ".");
            this.mDescription = branch.getCharPref("description");
            this.mURI = branch.getCharPref("uri");
        }
        catch(e) {
            dump("directory-properties: exception (new directory '" + prefName
                 + "', URI '" + this.mValue + "' ?):" + e + "\n");
        }
    },

    EqualsString: function(uri) {
        dump("CardDAVDirectory.js: EqualsString\n");
        return (this.mValue == uri);
    },

    GetDelegate: function(key, IID, result) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    ReleaseDelegate: function(key) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    /* nsIAbCollection (parent of nsIAbDirectory) */
    get readOnly() {
        return true;
    },

    get isRemote() {
        return true;
    },

    get isSecure() {
        let url = this.serverURL;

        return (url && (url.indexOf("https") == 0));
    },

    cardForEmailAddress: function(emailAddress) {
        dump("unimp\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    getCardFromProperty: function(aProperty, aValue, aCaseSensitive) {
        dump("unimp\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    getCardsFromProperty: function(aProperty, aValue, aCaseSensitive) {
        dump("unimp\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    /* nsIAbDirectory */
    get propertiesChromeURI() {
        dump("unimp\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    get dirName() {
        let conv = Components.classes["@mozilla.org/intl/utf8converterservice;1"]
                             .createInstance(Components.interfaces.nsIUTF8ConverterService);
        return conv.convertStringToUTF8(this.mDescription, "iso-8859-1", false);
    },
    set dirName(val) {
        if (this.mDescription != val) {
            let oldValue = this.mDescription;
            this.mDescription = String(val);
            let prefName = this.mDirPrefId;
            let service = Components.classes["@mozilla.org/preferences-service;1"]
                                    .getService(Components.interfaces.nsIPrefService);
            try {
                let branch = service.getBranch(prefName + ".");
                branch.setCharPref("description", this.mDescription);
            }
            catch(e) {
                dump("directory-properties: exception (new directory '" + prefName
                     + "', URI '" + this.mValue + "' ?):" + e + "\n");
            }

            let abManager = Components.classes["@mozilla.org/abmanager;1"]
                                      .getService(Components.interfaces.nsIAbManager);
            abManager.notifyItemPropertyChanged(this, "DirName", oldValue, val);
            dump("notified...\n");
        }
    },

    get dirType() {
        return 0;
    },

    get fileName() {
        dump("unimp\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    get URI() {
        return this.mURI;
    },

    get position() {
        dump("unimp\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    get lastModifiedDate() {
        return 0;
    },
    set lastModifiedDate(val) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    get isMailList() {
        return false;
    },

    /* retrieve the sub-directories */
    get childNodes() {
        dump("childNodes\n");
        let resultArray = Components.classes["@mozilla.org/array;1"]
                                    .createInstance(Components.interfaces.nsIArray);
        return resultArray.enumerate();
    },

    get childCards() {
        let result = null;

        let reg = new RegExp(/\?\(.*\(.*,.*,(.*)\).*\)\)/);
        if (reg.test(this.mQuery)) {
            let criteria = unescape(RegExp.$1);

            let httpURL = this.serverURL;
            if (httpURL) {
                let resultArray = this._serverQuery(httpURL, criteria);
                result = resultArray.enumerate();
            }
        }

        return result;
    },
    _serverQuery: function(url, criteria) {
        // dump("serverQuery: url: " + url + "; crite: " + criteria + "\n");
        let doc = null;
        var listener = {
            onDAVQueryComplete: function(status, response, headers, data) {
                doc = response;
            }
        };
        let report = new sogoWebDAV(url, listener, null, true);
        let req = ('<?xml version="1.0" encoding="UTF-8"?>'
                   + '<C:addressbook-query xmlns:D="DAV:"'
                   + ' xmlns:C="urn:ietf:params:xml:ns:carddav">'
                   + '<D:prop><D:getetag/><C:addressbook-data/></D:prop>'
                   + '<C:filter><C:prop-filter name="mail">'
                   + '<C:text-match collation="i;unicasemap" match-type="starts-with">'
                   + xmlEscape(criteria)
                   + '</C:text-match></C:prop-filter></C:filter>'
                   + '</C:addressbook-query>');
        report.requestXMLResponse = true;
        report.report(req);

        let resultArray = Components.classes["@mozilla.org/array;1"]
                                    .createInstance(Components.interfaces.nsIMutableArray);
        if (doc) {
            let nodeList = doc.getElementsByTagNameNS("urn:ietf:params:xml:ns:carddav",
                                                      "addressbook-data");
            for (let i = 0; i < nodeList.length; i++) {
                let card = importFromVcard(nodeList[i].textContent);
                resultArray.appendElement(card, null);
            }
        }

        // dump("query finished\n\n\n");

        return resultArray;
    },

    get isQuery() {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    hasCard: function(cards) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    hasDirectory: function(dir) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    deleteDirectory: function ( directory ) {
        // dump("CardDAVDirectory.js: ============>CALLED deleteDirectory!!!\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    addCard: function(card) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        return null;
    },

    modifyCard: function(modifiedCard) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    deleteCards: function(cards) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    dropCard: function(card, needToCopyCard) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    useForAutocomplete: function(aIdentityKey) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        return false;
    },

    get supportsMailingLists() {
        return false;
    },

    get addressLists() {
        return this.mAddressLists;
    },
    set addressLists(val) {
        this.mAddressLists = val;
    },

    addMailList: function(list) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    get listNickName() {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    get description() {
        return this.mDescription;
    },
    set description(val) {
        this.mDescription = val;
    },

    editMailListToDatabase: function(listCard) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },
    createNewDirectory: function(aDirName, aURI, aType, aPrefName) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        return null;
    },
    createDirectoryByURI: function(displayName, uri) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    get dirPrefId() {
        return this.mDirPrefId;
    },
    set dirPrefId(val) {
        if (this.mDirPrefId != val) {
            this.mDirPrefId = val;
            dump("new pref id: " + val + "\n");
        }
    },

    getIntValue: function(aName, aDefaultValue) {
        dump("GetLocalizedStringValue\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        return 0;
    },

    getBoolValue: function(aName, aDefaultValue) {
        dump("GetLocalizedStringValue\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        return false;
    },

    getStringValue: function(aName, aDefaultValue) {
        dump("GetLocalizedStringValue\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        return null;
    },
    getLocalizedStringValue: function(aName, aDefaultValue) {
        dump("GetLocalizedStringValue\n");
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
        return null;
    },

    setIntValue: function(aName, aValue) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },
    setBoolValue: function(aName, aValue) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },
    setStringValue: function(aName, aValue) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },
    setLocalizedStringValue: function(aName, aValue) {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    /* nsISupports */
    QueryInterface: function(aIID) {
        // dump("  QueryInterface: "  + aIID + "\n");
        if (!aIID.equals(Components.interfaces.nsIRDFResource)
            && !aIID.equals(Components.interfaces.nsIRDFNode)
            && !aIID.equals(Components.interfaces.nsIAbDirectory)
            && !aIID.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    },

    /* additional */
    get serverURL() {
        let httpURL = null;

        if (this.mURI && this.mURI.indexOf(gCardDavPrefix) == 0) {
            httpURL = this.mURI.substr(gCardDavPrefix.length);
        }

        return httpURL;
    }
};
