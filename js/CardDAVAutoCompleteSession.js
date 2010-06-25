/* CardDAVAutoCompleteSession.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

function jsInclude(files, target) {
    let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                           .getService(Components.interfaces.mozIJSSubScriptLoader);
    for (let i = 0; i < files.length; i++) {
        try {
            loader.loadSubScript(files[i], target);
        }
        catch(e) {
            dump("CardDavAutoCompleteSession.js: failed to include '" + files[i] + "'\n" + e + "\n");
        }
    }
}

jsInclude(["chrome://inverse-library/content/sogoWebDAV.js",
           "chrome://sogo-connector/content/general/vcards.utils.js"]);

/***********************************************************
 constants
 ***********************************************************/

// reference to the interface defined in inverseJSEnumerator.idl
//const inverseIJSEnumerator = CI.inverseIJSEnumerator;

// reference to the required base interface that all components must support
// const CI = Components.interfaces;
// const nsISupports = CI.nsISupports;
// const nsICardDAVAutoCompleteSession = CI.nsICardDAVAutoCompleteSession;

// const CONTRACT_ID = "@mozilla.org/autocompleteSession;1?type=carddav";
// const CLASS_ID = Components.ID("{882c2ce0-f7a2-4894-bce7-a119fb6f3c5c}");
// const CLASS_NAME = "Implementation of nsICardDAVAutoCompleteSession";

/***********************************************************
 class definition
 ***********************************************************/

//class constructor
function CardDAVAutoCompleteSession() {
    // dump("CardDavAutoCompleteSession constructor!\n");

    let prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefBranch);
    try {
        let attribute = prefService
            .getCharPref("sogo-connector.autoComplete.commentAttribute");
        if (attribute && attribute.length > 0) {
            this.commentAttribute = attribute;
            // dump("comment attribute: " + attribute + "\n");
        }
    }
    catch(e) {
    }
};

CardDAVAutoCompleteSession.prototype = {
    active: false,
    listener: null,
    searchString: null,
    lastRequest: 0,
    commentAttribute: null,

    mUrl: null,
    get serverURL() { return this.mUrl; },
    set serverURL(value) { this.mUrl = value; },

    /* nsIAutoCompleteSession */
    onStartLookup: function (searchString, previousSearchResult, listener) {
        // dump("CardDavAutoCompleteSession.onStartLookup\n");
        if (listener) {
            if (this.mUrl) {
                let url = this.mUrl.spec;
                if (url) {
                    this.active = true;
                    this.listener = listener;
                    this.searchString = searchString;

                    this.lastRequest = Date.now();
                    let report = new sogoWebDAV(url, this, this.lastRequest);
                    report.requestXMLResponse = true;
                    report.report('<?xml version="1.0" encoding="UTF-8"?>'
                                  + '<C:addressbook-query xmlns:D="DAV:"'
                                  + ' xmlns:C="urn:ietf:params:xml:ns:carddav">'
                                  + '<D:prop><D:getetag/><C:addressbook-data/></D:prop>'
                                  + '<C:filter><C:prop-filter name="mail">'
                                  + '<C:text-match collation="i;unicasemap" match-type="starts-with">'
                                  + xmlEscape(searchString)
                                  + '</C:text-match></C:prop-filter></C:filter>'
                                  + '</C:addressbook-query>');
                }
                else {
                    dump("no url in CardDavAutoCompleteSession.prototype.onStartLookup\n");
                    listener.onAutoComplete(null, -1);//nsIAutoCompleteStatus::failed
                }
            }
            else {
                dump("no mUrl in CardDavAutoCompleteSession.prototype.onStartLookup\n");
                listener.onAutoComplete(null, -1);//nsIAutoCompleteStatus::failed
            }
        }
        else {
            dump("NULL listener in CardDavAutoCompleteSession.prototype.onStartLookup\n");
            // 		 listener.onAutoComplete( null, -1);//nsIAutoCompleteStatus::failed
        }
    },
    onStopLookup: function() {
        this.active = false;
        // 	 dump("CardDavAutoCompleteSession.prototype.onStopLookup\n");
    },
    onAutoComplete: function(searchString, previousSearchResult, listener) {
        // dump("CardDavAutoCompleteSession.prototype.onAutoComplete: " + searchString
        //      + "\n");
    },

    onDAVQueryComplete: function(status, result, headers, data) {
        if (this.active && data == this.lastRequest && result) {
            let resultArray = Components.classes["@mozilla.org/supports-array;1"]
                                        .createInstance(Components.interfaces.nsISupportsArray);
            let nodeList = result.getElementsByTagNameNS("urn:ietf:params:xml:ns:carddav",
                                                         "addressbook-data");
            for (let i = 0; i < nodeList.length; i++) {
                let customFields = {};
                let card = importFromVcard(nodeList[i].textContent, customFields);
                let fn = card.displayName;
                let email = card.primaryEmail;
                let comment = null;
                if (this.commentAttribute)
                    comment = card[this.commentAttribute];
                if (email.length)
                    resultArray.AppendElement(formatAutoCompleteItem(fn, email,
                                                                     comment),
                                              null);
                email = card.getProperty("SecondEmail", "");
                if (email.length)
                    resultArray.AppendElement(formatAutoCompleteItem(fn, email,
                                                                     comment),
                                              null);
            }
            // dump("  resultArray.length: " + resultArray.Count() + "\n");

            if (nodeList.length > 0) {
                let matchFound = 1; //nsIAutoCompleteStatus::matchFound

                let results = Components.classes["@mozilla.org/autocomplete/results;1"]
                                        .createInstance(Components.interfaces.nsIAutoCompleteResults);
                results.items = resultArray;
                results.defaultItemIndex = 0;
                results.searchString = this.searchString;

                // dump("sending result: " + new Date () + "\n");
                this.listener.onAutoComplete(results, matchFound);
            }
            else {
                // dump("sending NO result: " + new Date () + "\n");
                let noMatch = 0; //nsIAutoCompleteStatus::noMatch
                this.listener.onAutoComplete(null, noMatch);
            }
        }
    },
    QueryInterface: function(aIID) {
        if (!aIID.equals(Components.interfaces.nsICardDAVAutoCompleteSession)
            && !aIID.equals(Components.interfaces.nsIAutoCompleteSession)
            && !aIID.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
        return this;
    }
};

function formatAutoCompleteItem (fn, email, comment) {
    let item = Components.classes["@mozilla.org/autocomplete/item;1"]
                         .createInstance(Components.interfaces.nsIAutoCompleteItem);
    item.className = "remote-abook";
    if (!comment)
        comment = "";
    item.comment = comment;
    // dump("comment: " + comment + "\n");
    // 	item.param = searchString;
    if (fn.length)
        item.value = fn + " <" + email + ">";
    else
        item.value = email;

    return item;
}
