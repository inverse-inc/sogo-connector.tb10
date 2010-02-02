/* -*- Mode: java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 4 -*- */

// var loader = Components .classes["@mozilla.org/moz/jssubscript-loader;1"]
//     .getService(Components.interfaces.mozIJSSubScriptLoader);
// loader.loadSubScript("chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js");

/* STACK method from lightning */
function backtrace(aDepth) {
    var depth = aDepth || 50;
    var stack = "";
    var frame = Components.stack.caller;
    for (var i = 1; i <= depth && frame; i++) {
        stack += i + ": [" + frame.filename + ":" +
                 frame.lineNumber + "] " + frame.name + "\n";
        frame = frame.caller;
    }
    return stack;
}

function fixURL(url) {
    if (!url) {
        dump("fixURL: no URL! - backtrace\n" + backtrace());
        throw("fixURL: no URL!\n");
    }
    var fixedURL = url;
    if (fixedURL[fixedURL.length-1] != '/')
        fixedURL += '/';

    return fixedURL;
}

function xmlEscape(text) {
    return text.replace("&", "&amp;", "g").replace("<", "&lt;", "g");
}

function xmlUnescape(text) {
    var s = (""+text).replace(/&lt;/g, "<", "g");
    s = s.replace(/&gt;/g, ">", "g");
    s = s.replace(/&amp;/g, "&",  "g");
  
    return s;
}

function statusCode(status) {
    var code = -1;

    if (status.indexOf("HTTP/1.1") == 0) {
        var words = status.split(" ");
        code = parseInt(words[1]);
    }

    return code;
}

function CalDAVAclManager() {
    this.calendars = {};
    this.wrappedJSObject = this;
    this.identityCount = 0;
    this.accountMgr = null;
}

CalDAVAclManager.prototype = {
 calendars: null,
 wrappedJSObject: null,
 identityCount: 0,
 accountMgr: null,
 calendarEntry: function calendarEntry(calendarURI) {
    var url = fixURL(calendarURI.spec);
    var entry = this.calendars[url];
    if (!entry) {
        entry = new CalDAVAclCalendarEntry(calendarURI);
        this.calendars[url] = entry;
        this._queryCalendar(url);
    }

    return entry;
   },
 componentEntry: function componentEntry(calendarURI, componentURL) {
        var calendarURL = fixURL(calendarURI.spec);
        var calendar = this.calendarEntry(calendarURI);

        var entry = null;
        if (componentURL)
            entry = calendar.entries[componentURL];
        if (!entry) {
            entry = new CalDAVAclComponentEntry(componentURL);
            entry.parentCalendarEntry = calendar;
            if (componentURL) {
                calendar.entries[componentURL] = entry;
                this._queryComponent(entry, calendarURI.spec + componentURL, calendarURL);
            }
            else
                entry.userPrivileges = [];
        }

        return entry;
    },
 refresh: function refresh(calendarURI) {
        var url = fixURL(calendarURI.spec);
        var calendar = this.calendars[url];
        if (calendar) {
            calendar.userPrincipals = [];
            calendar.userPrivileges = [];
            calendar.userAddresses = [];
            calendar.userIdentities = [];
            calendar.ownerIdentities = [];
            calendar.ownerPrincipal = null;
            calendar.entries = {};
            this._queryCalendar(url);
        }
    },
 onDAVQueryComplete: function onDAVQueryComplete(status, url, headers,
                                                 response, data) {
        // dump("callback for method: " + data.method + "\n");
        /* Warning, the url returned as parameter is not always the
           calendar URL since we also query user principals and items. */
        var fixedURL = fixURL(data.calendar);
        if (status > 498) {
            dump("an anomally occured during request '" + data.method + "'.\n"
                 + "  Code: " + status + "\n"
                 + "We remove the calendar entry to give it a chance of"
                 + " succeeding later.\n");
            var observerService = Components.classes["@mozilla.org/observer-service;1"]
                                  .getService(Components.interfaces.nsIObserverService);
            if (data.component) {
                observerService.notifyObservers(null,
                                                "caldav-compenent-acl-reset",
                                                data.component);
                if (this.calendars[fixedURL]
                    && this.calendars[fixedURL].entries)
                    delete this.calendars[fixedURL].entries[data.component];
            } else {
                dump("   query url: " + url + "\n");
                dump("   calendar url: " + fixedURL + "\n");
                observerService.notifyObservers(null, "caldav-acl-reset",
                                                this.calendars[fixedURL].uri.spec);
                if (this.calendars[fixedURL])
                    delete this.calendars[fixedURL];
            }
        }
        else if (status > 399) {
            dump("An error occurred with one of the ACL queries, which"
                 + " indicates the server don't support ACL.\n"
                 + "  Code: " + status + "\n"
                 + "We keep the ACL entry but mark it as having no support.\n");
            if (data.component) {
                var observerService = Components.classes["@mozilla.org/observer-service;1"]
                                      .getService(Components.interfaces.nsIObserverService);
                var compEntry = this.calendars[fixedURL].entries[data.component];
                var compData = {
                  component: data.component,
                  entry: compEntry
                };
                compData.wrappedJSObject = compData;
                observerService.notifyObservers(null,
                                                "caldav-component-acl-reset",
                                                compData);
                delete this.calendars[fixedURL].entries[data.component];
            } else {
                dump("   query url: " + url + "\n");
                dump("   calendar url: " + fixedURL + "\n");
                var entry = this.calendars[fixedURL];
                var wasReady = entry.isCalendarReady();
                this._markWithNoAccessControl(fixedURL);
                if (!wasReady) {
                    var observerService = Components.classes["@mozilla.org/observer-service;1"]
                                          .getService(Components.interfaces.nsIObserverService);
                    observerService.notifyObservers(null, "caldav-acl-loaded",
                                                    this.calendars[fixedURL].uri.spec);
                }
            }
        }
        else {
            if (data.method == "acl-options")
                this._optionsCallback(status, url, headers, response, data);
            else if (data.method == "collection-set")
                this._collectionSetCallback(status, url, headers, response, data);
            else if (data.method == "principal-match")
                this._principalMatchCallback(status, url, headers, response, data);
            else if (data.method == "user-address-set")
                this._userAddressSetCallback(status, url, headers, response, data);
            else if (data.method == "component-privilege-set")
                this._componentPrivilegeSetCallback(status, url, headers,
                                                    response, data);
        }
    },
 _markWithNoAccessControl: function _markWithNoAccessControl(url) {
        // dump(url + " marked without access control\n");
        var calendar = this.calendars[url];
        calendar.hasAccessControl = false;
        calendar.userPrincipals = null;
        calendar.userPrivileges = null;
        calendar.userAddresses = null;
        calendar.userIdentities = null;
        calendar.ownerIdentities = null;
        calendar.ownerPrincipal = null;
    },
 _queryCalendar: function _queryCalendar(url) {
        this.xmlRequest(url, "OPTIONS", null, null,
                        {method: "acl-options", calendar: url});
    },
 _optionsCallback: function _optionsCallback(status, url, headers,
                                             response, data) {
        var dav = headers["dav"];
        // dump("options callback: " + url +  " HTTP/1.1 " + status + "\n");
        // dump("headers:\n");
        // for (var k in headers)
        // dump("  " + k + ": " + headers[k] + "\n");
        var calURL = fixURL(url);
        // dump("dav: " + dav + "\n");
        if (dav && dav.indexOf("access-control") > -1) {
            this.calendars[calURL].hasAccessControl = true;
            var propfind = ("<?xml version='1.0' encoding='UTF-8'?>\n"
                            + "<D:propfind xmlns:D='DAV:'><D:prop><D:principal-collection-set/><D:owner/><D:current-user-privilege-set/></D:prop></D:propfind>");
            this.xmlRequest(url, "PROPFIND", propfind,
                            {'content-type': "application/xml; charset=utf-8",
                                    'depth': "0"},
                            {method: "collection-set", calendar: calURL});
        }
        else
            this._markWithNoAccessControl(calURL);
    },
 _collectionSetCallback: function _collectionSetCallback(status, url, headers,
                                                         response, data) {
        if (status == 207) {
            var calURL = fixURL(url);
            var xParser = Components.classes['@mozilla.org/xmlextras/domparser;1']
            .getService(Components.interfaces.nsIDOMParser);
            var queryDoc = xParser.parseFromString(response, "application/xml");
            var nodes = queryDoc.getElementsByTagName("principal-collection-set");
            var address = "";
            if (nodes.length) {
                var node = nodes[0];
                var subnodes = node.childNodes;
                for (var i = 0; i < subnodes.length; i++) {
                    if (subnodes[i].nodeType
                        == Components.interfaces.nsIDOMNode.ELEMENT_NODE) {
                        var value = subnodes[i].childNodes[0].nodeValue;
                        if (value.indexOf("/") == 0) {
                            var clone = this.calendars[url].uri.clone();
                            clone.path = value;
                            address = clone.spec;
                        }
                        else
                            address = value;
                    }
                }
                
                nodes = queryDoc.getElementsByTagName("owner");
                if (nodes.length) {
//                     dump("owner nodes: " + nodes.length + "\n");
                    var subnodes = nodes[0].childNodes;
                    for (var i = 0; i < subnodes.length; i++) {
                        if (subnodes[i].nodeType
                            == Components.interfaces.nsIDOMNode.ELEMENT_NODE) {
                            var value = subnodes[i].childNodes[0].nodeValue;
                            if (value.indexOf("/") == 0) {
                                var clone = this.calendars[url].uri.clone();
                                clone.path = value;
                                owner = clone.spec;
                            }
                            else
                                owner = value;
//                             dump("acl owner: " + owner + "\n");
                            var fixedURL = fixURL(owner);
                            this.calendars[calURL].ownerPrincipal = fixedURL;
                            var propfind = ("<?xml version='1.0' encoding='UTF-8'?>\n"
                                            + "<D:propfind xmlns:D='DAV:' xmlns:C='urn:ietf:params:xml:ns:caldav'><D:prop><C:calendar-user-address-set/><D:displayname/></D:prop></D:propfind>");
                            this.xmlRequest(fixedURL, "PROPFIND", propfind,
                                            {'content-type': "application/xml; charset=utf-8",
                                                    'depth': "0"},
                                            {method: "user-address-set", who: "owner",
                                                    calendar: calURL});
                        }
                    }
                }
                if (address && address.length) {
                    var report = ("<?xml version='1.0' encoding='UTF-8'?>\n"
                                  + "<D:principal-match xmlns:D='DAV:'><D:self/></D:principal-match>");
                    this.xmlRequest(address, "REPORT", report,
                                    {'depth': "0",
                                            'content-type': "application/xml; charset=utf-8" },
                                    { method: "principal-match", calendar: calURL});

                    this.calendars[url].userPrivileges
                        = this._parsePrivileges(queryDoc);
                }
                else
                    this._markWithNoAccessControl(calURL);
            }
            else
                this._markWithNoAccessControl(calURL);
        }
    },
 _principalMatchCallback: function _principalMatchCallback(status, url, headers,
                                                           response, data) {

        var calendar = this.calendars[data.calendar];

        if (status == 207) {
            var xParser = Components.classes['@mozilla.org/xmlextras/domparser;1']
                .getService(Components.interfaces.nsIDOMParser);
            var queryDoc = xParser.parseFromString(response, "application/xml");
            var hrefs = queryDoc.getElementsByTagName("href");
            var principals = [];

            for (var i = 0; i < hrefs.length; i++) {
                var href = "" + hrefs[i].childNodes[0].nodeValue;
                if (href.indexOf("/") == 0) {
                    var clone = calendar.uri.clone();
                    clone.path = href;
                    href = clone.spec;
                }

                var fixedURL = fixURL(href);
                var propfind = ("<?xml version='1.0' encoding='UTF-8'?>\n"
                                + "<D:propfind xmlns:D='DAV:' xmlns:C='urn:ietf:params:xml:ns:caldav'><D:prop><C:calendar-user-address-set/><D:displayname/></D:prop></D:propfind>");
                this.xmlRequest(fixedURL, "PROPFIND", propfind,
                                {'content-type': "application/xml; charset=utf-8",
                                        'depth': "0"},
                                {method: "user-address-set", who: "user",
                                        calendar: data.calendar});
                principals.push(fixedURL);
            }
            calendar.userPrincipals = principals;
        }
        else if (status == 501) {
            dump("CalDAV: Server does not support ACLs\n");
            calendar.hasAccessControl = false;
        }
	},
 _userAddressSetCallback: function _collectionSetCallback(status, url, headers,
                                                          response, data) {
        if (status == 207) {
            var xParser = Components.classes['@mozilla.org/xmlextras/domparser;1']
            .getService(Components.interfaces.nsIDOMParser);
            var queryDoc = xParser.parseFromString(response, "application/xml");

            var addressValues = this._parseCalendarUserAddressSet(queryDoc, data.calendar);

            var addressesKey = data.who + "Addresses";
            var identitiesKey = data.who + "Identities";

            //dump("url: " + url + " addressesKey: " + addressesKey + " identitiesKey: " + identitiesKey + "\n");

            var addresses = this.calendars[data.calendar][addressesKey];
            if (!addresses) {
                addresses = [];
                this.calendars[data.calendar][addressesKey] = addresses;
            }
            for (var address in addressValues)
                if (addresses.indexOf(address) == -1) {
                    addresses.push(address);
                }

            dump("identities for calendar: " + data.calendar + "\n");
            dump("  type: " + data.who + "\n");
            var identities = this.calendars[data.calendar][identitiesKey];
            if (!identities) {
                identities = [];
                this.calendars[data.calendar][identitiesKey] = identities;
            }
            var displayName = this._parsePrincipalDisplayName(queryDoc);
            if (displayName) {
                for (var address in addressValues) {
                    dump("  address: " + address + "\n");
                    if (address.search("mailto:", "i") == 0) {
                        this._appendIdentity(identities, displayName,
                                             address.substr(7), this.calendars[data.calendar]);
                    }
                }
            }

            if (this.calendars[data.calendar].nbrAddressSets) {
//                 dump("acl complete for " + data.calendar
//                      + "; nbrAddressSets: " +
//                      this.calendars[data.calendar].nbrAddressSets + "\n");
                var observerService = Components.classes["@mozilla.org/observer-service;1"]
                                      .getService(Components.interfaces.nsIObserverService);
                observerService.notifyObservers(null, "caldav-acl-loaded", this.calendars[data.calendar].uri.spec);
            } else {
                this.calendars[data.calendar].nbrAddressSets = 1;
            }
        }
    },
 _initAccountMgr: function _initAccountMgr() {
        this.accountMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);
       
        var identities = this.accountMgr.allIdentities.QueryInterface(Components.interfaces.nsICollection);
        var values = [];
        var current = 0;
        var max = 0;
        
        // We get the identities we use for mail accounts. We also
        // get the highest key which will be used as the basis when
        // adding new identities (so we don't overwrite keys...)
        for (var i = identities.Count()-1; i >= 0; i--) {
            var identity = identities.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgIdentity);
            if (identity.key.indexOf("caldav_") == 0) {
                values.push(identity.key);
                current = parseInt(identity.key.substring(7));
                if (current > max)
                    max = current;
            }
        }

        // We now remove every other caldav_ pref other than the ones we 
        // use in our mail accounts.
        var prefService = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService);
        var prefBranch = prefService.getBranch("mail.identity.");
        var prefs = prefBranch.getChildList("", {});
        for each (var pref in prefs) {
            if (pref.indexOf("caldav_") == 0) {
                var key = pref.substring(0, pref.indexOf("."));
                if (values.indexOf(key) < 0) {
                    prefBranch.deleteBranch(key);
                }
            }
        }
        this.identityCount = max + 1;
    },
 _findIdentity: function _findIdentity(email, displayName) {
        var identity = null;
        var lowEmail = email.toLowerCase();

        var identities = this.accountMgr.allIdentities.QueryInterface(Components.interfaces.nsICollection);
        var i = 0;
        while (!identity && i < identities.Count()) {
            var currentIdentity = identities.GetElementAt(i)
                .QueryInterface(Components.interfaces.nsIMsgIdentity);
            if (currentIdentity.email.toLowerCase() == lowEmail &&
                currentIdentity.fullName == displayName)
                identity = currentIdentity;
            else
                i++;
        }

        return identity;
    },
 _identitiesHaveEmail: function _identitiesHaveEmail(identities, email) {
        var haveEmail = false;
        var lowEmail = email.toLowerCase();

        var i = 0;
        while (!haveEmail && i < identities.length) {
            if (identities[i].email.toLowerCase() == lowEmail)
                haveEmail = true;
            else
                i++;
        }

        return haveEmail;
    },
		
 _appendIdentity: function _appendIdentity(identities, displayName, email, calendar) {
        if (!this.accountMgr)
            this._initAccountMgr();

        var newIdentity = this._findIdentity(email, displayName);
        if (!newIdentity) {
            var newIdentity = Components
                .classes["@mozilla.org/messenger/identity;1"]
                .createInstance(Components
                                .interfaces.nsIMsgIdentity);
            newIdentity.key = "caldav_" + this.identityCount;
            newIdentity.identityName = String(displayName + " <" + email + ">");
            newIdentity.fullName = String(displayName);
            newIdentity.email = String(email);
			
            // We add identities associated to this calendar to Thunderbird's
            // list of identities only if we are actually the owner of the calendar.
            if (calendar.userIsOwner()) {
                this.accountMgr.defaultAccount.addIdentity(newIdentity);
            }
            this.identityCount++;
        }
		
        if (!this._identitiesHaveEmail(identities, email))
            identities.push(newIdentity);
    },
 _parseCalendarUserAddressSet: function
 _parseCalendarUserAddressSet(queryDoc,
                              calendarURL) {
        var values = {};
        var nodes = queryDoc.getElementsByTagName("calendar-user-address-set");
        for (var i = 0; i < nodes.length; i++) {
            var childNodes = nodes[i].childNodes;
            for (var j = 0; j < childNodes.length; j++) {
                if (childNodes[j].nodeType
                    == Components.interfaces.nsIDOMNode.ELEMENT_NODE) {
                    var value = "" + childNodes[j].childNodes[0].nodeValue;
                    if (value.indexOf("/") == 0) {
                        var clone = this.calendars[calendarURL].uri.clone();
                        clone.path = value;
                        address = "" + clone.spec;
                    }
                    else
                        address = value;
                    values[address] = true;
                }
            }
        }

        return values;
    },
 _parsePrincipalDisplayName: function _parsePrincipalDisplayName(queryDoc) {
        var displayName;

        var nodes = queryDoc.getElementsByTagName("displayname");
        if (nodes.length) {
            displayName = "";
            var childNodes = nodes[0].childNodes;
            // dump ( "childNodes: " + childNodes.length + "\n");
            for (var i = 0; i < childNodes.length; i++) {
                if (childNodes[i].nodeType
                    == Components.interfaces.nsIDOMNode.TEXT_NODE)
                    displayName += xmlUnescape(childNodes[i].nodeValue);
            }
        }
        else
            displayName = null;

        return displayName;
    },

 /* component controller */
 _queryComponent: function _queryComponent(entry, url, calendarURL) {
        // dump("queryCompoennt\n");
        var propfind = ("<?xml version='1.0' encoding='UTF-8'?>\n"
                        + "<D:propfind xmlns:D='DAV:'><D:prop><D:current-user-privilege-set/></D:prop></D:propfind>");
        this.xmlRequest(url, "PROPFIND", propfind,
    {'content-type': "application/xml; charset=utf-8",
            'depth': "0"},
    {method: "component-privilege-set",
            entry: entry, calendar: calendarURL, component: url});
    },
 _componentPrivilegeSetCallback: function
 _componentPrivilegeSetCallback(status, url, headers, response, data) {
        var xParser = Components.classes['@mozilla.org/xmlextras/domparser;1']
        .getService(Components.interfaces.nsIDOMParser);
        var queryDoc = xParser.parseFromString(response, "application/xml");
        // dump("\n\n\ncomponent-privilege-set:\n" + response + "\n\n\n");
    
        data.entry.userPrivileges = this._parsePrivileges(queryDoc);
        var observerService = Components.classes["@mozilla.org/observer-service;1"]
                              .getService(Components.interfaces.nsIObserverService);
        observerService.notifyObservers(null, "caldav-component-acl-loaded",
                                        data.component);
    },
 _parsePrivileges: function _parsePrivileges(queryDoc) {
        var privileges = [];
        nodes = queryDoc.getElementsByTagName("privilege");
        for (var i = 0; i < nodes.length; i++) {
            var subnodes = nodes[i].childNodes;
            for (var j = 0; j < subnodes.length; j++)
                if (subnodes[j].nodeType
                    == Components.interfaces.nsIDOMNode.ELEMENT_NODE) {
                    var ns = subnodes[j].namespaceURI;
                    var tag = subnodes[j].localName;
                    var privilege = "{" + ns + "}" + tag;
                    // dump(arguments.callee.caller.name + " privilege: " + privilege + "\n");
                    privileges.push(privilege);
                }
        }

        return privileges;
    },
 xmlRequest: function xmlRequest(url, method, parameters, headers, data) {
        var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
        .createInstance(Components.interfaces.nsIJSXMLHttpRequest);
        //         dump("method: " + method + "\n");
        //         dump("url: " + url + "\n");
        request.open(method, url, true);
        if (headers)
            for (var header in headers)
                request.setRequestHeader(header, headers[header]);
        request.url = fixURL(url);
        request.client = this;
        request.method = method;
        request.callbackData = data;

        // dump("method: " + request.method + "\nurl: " + url + "\n");
        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                if (request.client) {
                    var status = 499;
                    try {
                        status = request.status;
                    }
                    catch(e) { dump("CalDAVAclManager: trapped exception: "
                                    + e + "\n"); }

                    var responseText;
                    var headers = {};
                    try {
                        if (status == 499) {
                            responseText = "";
                            dump("xmlRequest: received status 499 for url: "
                                 + request.url + "; method: " + method + "\n");
                        }
                        else {
                            responseText = request.responseText;
                            var textHeaders = request.getAllResponseHeaders().split("\n");
                            for (var i = 0; i < textHeaders.length; i++) {
                                var line = textHeaders[i].replace(/\r$/, "", "g");
                                if (line.length) {
                                    var elems = line.split(":");
                                    var key = elems[0].toLowerCase();
                                    var value = elems[1].replace(/(^[         ]+|[         ]+$)/, "", "g");
                                    headers[key] = value;
                                }
                            }
                        }
                    }
                    catch(e) {
                        dump("CAlDAVAclManager.js: an exception occured\n" + e + "\n"
                             + e.fileName + ":" + e.lineNumber + "\n"
                             + "url: " + request.url + "\n");
                    }
                    request.client.onDAVQueryComplete(status,
                                                      request.url,
                                                      headers,
                                                      responseText,
                                                      request.callbackData);
                }
                request.client = null;
                request.url = null;
                request.callbackData = null;
                request.onreadystatechange = null;
                request = null;
            }
        };
  
        request.send(parameters);
        // dump("xmlrequest sent: '" + method + "\n");
    },

 QueryInterface: function(aIID) {
        if (!aIID.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
};

function CalDAVAclCalendarEntry(uri) {
    this.uri = uri;
    this.entries = {};
    this.hasAccessControl = true;
}

CalDAVAclCalendarEntry.prototype = {
 uri: null,
 entries: null,

 isCalendarReady: function isCalendarReady() {
        // dump (typeof(this.hasAccessControl)+ "\n"
        // + typeof(this.userPrincipals)+ "\n"
        // + typeof(this.userPrivileges)+ "\n"
        // + typeof(this.userAddresses)+ "\n"
        // + typeof(this.identities)+ "\n"
        // + typeof(this.ownerPrincipal)+ "\n");

        return (typeof(this.hasAccessControl) != "undefined"
                && typeof(this.userPrincipals) != "undefined"
                && typeof(this.userPrivileges) != "undefined"
                && typeof(this.userAddresses) != "undefined"
                && typeof(this.userIdentities) != "undefined"
                && typeof(this.ownerIdentities) != "undefined"
                && typeof(this.ownerPrincipal) != "undefined");
    },
 userIsOwner: function userIsOwner() {
        var result = false;

        var i = 0;

        if (this.hasAccessControl) {
            while (!result && typeof(this.userPrincipals) != "undefined" && i < this.userPrincipals.length) {
//                 dump("user: " + this.userPrincipals[i] + "\n");
                if (this.userPrincipals[i] == this.ownerPrincipal) 
                    result = true;
                else
                    i++;
            }
        }
        else
            result = true;

//         dump("user is owner: " + result + "\n");

        return result;
    },
 userCanAddComponents: function userCanAddComponents() {
        // dump("has access control: " + this.hasAccessControl + "\n");
        return (!this.hasAccessControl
                || (this.userPrivileges.indexOf("{DAV:}bind")
                    > -1));
    },
 userCanDeleteComponents: function userCanAddComponents() {
        // dump("has access control: " + this.hasAccessControl + "\n");
        // if (this.userPrivileges)
        // dump("indexof unbind: "
        // + this.userPrivileges.indexOf("{DAV:}unbind") + "\n");
        return (!this.hasAccessControl
                || (this.userPrivileges.indexOf("{DAV:}unbind")
                    > -1));
    }
};

function CalDAVAclComponentEntry(url) {
    this.url = url;
}

CalDAVAclComponentEntry.prototype = {
 parentCalendarEntry: null,
 url: null,
 userPrivileges: null,
 isComponentReady: function isComponentReady() {
        // dump("parent ready: " + this.parentCalendarEntry.isCalendarReady() + "\n"
        // + "this.userPrivileges: " + this.userPrivileges + "\n"
        // + "ac: " + this.parentCalendarEntry.hasAccessControl + "\n");
        return (this.parentCalendarEntry.isCalendarReady()
                && (this.userPrivileges != null
                    || !this.parentCalendarEntry.hasAccessControl));
    },
 userIsOwner: function userIsOwner() {
        return this.parentCalendarEntry.userIsOwner();
    },
 userCanModify: function userCanModify() {
        // dump("this.url: " + this.url + "\n");
        // dump("this.userPrivileges: " + this.userPrivileges + "\n");
        // dump("this.parentCalendarEntry.userPrivileges: "
        // + this.parentCalendarEntry.userPrivileges + "\n");

        var result;
        if (this.parentCalendarEntry.hasAccessControl) {
            var index = (this.url
                         ? this.userPrivileges.indexOf("{DAV:}write")
                         : this.parentCalendarEntry.userPrivileges.indexOf("{DAV:}bind"));
            result = (index > -1);
        }
        else
            result = true;

        return result;
    },
 userCanRespond: function userCanRespond() {
        return (!this.parentCalendarEntry.hasAccessControl
                || (this.userPrivileges
                    .indexOf("{urn:inverse:params:xml:ns:inverse-dav}respond-to-component")
                    > -1));
    },
 userCanViewAll: function userCanViewAll() {
        return (!this.parentCalendarEntry.hasAccessControl
                ||  (this.userPrivileges
                     .indexOf("{urn:inverse:params:xml:ns:inverse-dav}view-whole-component")
                     > -1));
    },
 userCanViewDAndT: function userCanViewDAndT() {
        return (!this.parentCalendarEntry.hasAccessControl
                || (this.userPrivileges
                    .indexOf("{urn:inverse:params:xml:ns:inverse-dav}view-date-and-time")
                    > -1));
    }
};
