/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

var loader = Components .classes["@mozilla.org/moz/jssubscript-loader;1"]
  .getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js");

function fixURL(url) {
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
}

CalDAVAclManager.prototype = {
 calendars: null,
 wrappedJSObject: null,
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
				this._queryComponent(entry, calendarURI.spec + componentURL);
      }
      else
				entry.userPrivileges = [];
    }

    return entry;
  },
 onDAVQueryComplete: function onDAVQueryComplete(status, url, headers,
																								 response, data) {
// 		dump("callback for method: " + data.method + "\n");
    if (data.method == "acl-options")
      this._optionsCallback(status, url, headers, response, data);
    else if (data.method == "collection-set")
      this._collectionSetCallback(status, url, headers, response, data);
    else if (data.method == "principal-match")
      this._principalMatchCallback(status, url, headers, response, data);
    else if (data.method == "user-address-set")
      this._userAddressSetCallback(status, url, headers, response, data);
    else if (data.method == "component-privilege-set")
      this._componentPrivilegeSetCallback(status, url, headers, response, data);
  },
 _markWithNoAccessControl: function _markWithNoAccessControl(url) {
// 		dump(url + " marked without access control\n");
    var calendar = this.calendars[url];
    calendar.hasAccessControl = false;
    calendar.userPrincipals = null;
    calendar.userPrivileges = null;
    calendar.userAddresses = null;
    calendar.identities = null;
    calendar.ownerPrincipal = null;
  },
 _queryCalendar: function _queryCalendar(url) {
    this.xmlRequest(url, "OPTIONS", null, null, {method: "acl-options"});
  },
 _optionsCallback: function _optionsCallback(status, url, headers,
																						 response, data) {
    var dav = headers["dav"];
// 		dump("options callback: " + url +  " HTTP/1.1 " + status + "\n");
// 		dump("headers:\n");
// 		for (var k in headers)
// 			dump("  " + k + ": " + headers[k] + "\n");
    var calURL = fixURL(url);
// 		dump("dav: " + dav + "\n");
    if (dav && dav.indexOf("access-control") > -1) {
      this.calendars[calURL].hasAccessControl = true;
      var propfind = ("<?xml version='1.0' encoding='UTF-8'?>\n"
											+ "<D:propfind xmlns:D='DAV:'><D:prop><D:principal-collection-set/><D:owner/><D:current-user-privilege-set/></D:prop></D:propfind>");
      this.xmlRequest(url, "PROPFIND", propfind,
											{'content-type': "application/xml; charset=utf-8",
													'depth': "0"},
											{method: "collection-set"});
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

							var fixedURL = fixURL(owner);
							this.calendars[calURL].ownerPrincipal = fixedURL;
							var propfind = ("<?xml version='1.0' encoding='UTF-8'?>\n"
															+ "<D:propfind xmlns:D='DAV:' xmlns:C='urn:ietf:params:xml:ns:caldav'><D:prop><C:calendar-user-address-set/></D:prop></D:propfind>");
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
													{'content-type': "application/xml; charset=utf-8" },
													{ method: "principal-match", calendar: url});

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
    if (status == 207) {
      var xParser = Components.classes['@mozilla.org/xmlextras/domparser;1']
      .getService(Components.interfaces.nsIDOMParser);
      var queryDoc = xParser.parseFromString(response, "application/xml");
      var hrefs = queryDoc.getElementsByTagName("href");

      var calendar = this.calendars[data.calendar];

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
												{method: "user-address-set", who: "user", calendar:
													data.calendar});
				principals.push(fixedURL);
      }
      calendar.userPrincipals = principals;
    }
  },
 _userAddressSetCallback: function _collectionSetCallback(status, url, headers,
																													response, data) {
    if (status == 207) {
      var xParser = Components.classes['@mozilla.org/xmlextras/domparser;1']
      .getService(Components.interfaces.nsIDOMParser);
      var queryDoc = xParser.parseFromString(response, "application/xml");

      var values = this._parseCalendarUserAddressSet(queryDoc, data.calendar);

      var addresses;
      if (data.who == "user") {
				addresses = this.calendars[data.calendar].userAddresses;
				if (!addresses) {
					addresses = [];
					this.calendars[data.calendar].userAddresses = addresses;
				}

				var displayName = this._parsePrincipalDisplayName(queryDoc);
				if (displayName)
					this._addUserIdentity(displayName, values, data.calendar);
      }
      else if (data.who == "owner") {
				addresses = this.calendars[data.calendar].ownerAddresses;
				if (!addresses) {
					addresses = [];
					this.calendars[data.calendar].ownerAddresses = addresses;
				}
      }

      for (var address in values)
				if (addresses.indexOf(address) == -1)
					addresses.push(address);
    }
  },
 _addUserIdentity: function _addUserIdentity(displayName, values, calendar) {
    var identities = this.calendars[calendar].identities;
    if (!identities) {
      identities = [];
      this.calendars[calendar].identities = identities;
    }
    for (var address in values)
      if (address.search("mailto:", "i") == 0)
				identities.push({ cn: displayName, email: address.substr(7) });
  },
 _parseCalendarUserAddressSet: function
 _parseCalendarUserAddressSet(queryDoc, calendarURL) {
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
// 			dump ( "childNodes: " + childNodes.length + "\n");
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
 _queryComponent: function _queryComponent(entry, url) {
// 		dump("queryCompoennt\n");
    var propfind = ("<?xml version='1.0' encoding='UTF-8'?>\n"
										+ "<D:propfind xmlns:D='DAV:'><D:prop><D:current-user-privilege-set/></D:prop></D:propfind>");
    this.xmlRequest(url, "PROPFIND", propfind,
  {'content-type': "application/xml; charset=utf-8",
      'depth': "0"},
  {method: "component-privilege-set", entry: entry});
  },
 _componentPrivilegeSetCallback: function
 _componentPrivilegeSetCallback(status, url, headers, response, data) {
    var xParser = Components.classes['@mozilla.org/xmlextras/domparser;1']
    .getService(Components.interfaces.nsIDOMParser);
    var queryDoc = xParser.parseFromString(response, "application/xml");
// 		dump("\n\n\ncomponent-privilege-set:\n" + response + "\n\n\n");
    
    data.entry.userPrivileges = this._parsePrivileges(queryDoc);
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
// 					dump(arguments.callee.caller.name + " privilege: " + privilege + "\n");
					privileges.push(privilege);
				}
    }

    return privileges;
  },
 xmlRequest: function xmlRequest(url, method, parameters, headers, data) {
    var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
    .createInstance(Components.interfaces.nsIJSXMLHttpRequest);
// 		dump("method: " + method + "\n");
// 		dump("url: " + url + "\n");
    request.open(method, url, true);
    if (headers)
      for (var header in headers)
				request.setRequestHeader(header, headers[header]);
    request.url = fixURL(url);
    request.client = this;
    request.method = method;
    request.callbackData = data;

// 		dump("method: " + request.method + "\nurl: " + url + "\n");
    request.onreadystatechange = function() {
      if (request.readyState == 4) {
				try {
					if (request.client && request.status) {
						var responseText = request.responseText;
// 						dump("response: "  + responseText + "\n");
	
						var headers = {};
						var textHeaders = request.getAllResponseHeaders().split("\n");
						for (var i = 0; i < textHeaders.length; i++) {
							var line = textHeaders[i].replace(/\r$/, "", "g");
							if (line.length) {
								var elems = line.split(":");
								var key = elems[0].toLowerCase();
								var value = elems[1].replace(/(^[ 	]+|[ 	]+$)/, "", "g");
								headers[key] = value;
							}
						}

						request.client.onDAVQueryComplete(request.status,
																							request.url,
																							headers,
																							responseText,
																							request.callbackData);
					}
				}
				catch(e) {
					dump("CAlDAVAclManager.js: an exception occured\n" + e + "\n"
							 + e.fileName + ":" + e.lineNumber + "\n"
							 + "url: " + request.url + "\n");
				}
				request.client = null;
				request.url = null;
				request.callbackData = null;
				request.onreadystatechange = null;
				request = null;
      }
    };
  
    request.send(parameters);
// 		dump("xmlrequest sent: '" + method + "\n");
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
}

CalDAVAclCalendarEntry.prototype = {
 uri: null,
 entries: null,
 isCalendarReady: function isCalendarReady() {
    var testnull = null;
// 		dump (typeof(this.hasAccessControl)+ "\n"
// 					+ typeof(this.userPrincipals)+ "\n"
// 					+ typeof(this.userPrivileges)+ "\n"
// 					+ typeof(this.userAddresses)+ "\n"
// 					+ typeof(this.identities)+ "\n"
// 					+ typeof(this.ownerPrincipal)+ "\n");
    return (typeof(this.hasAccessControl) != "undefined"
						&& typeof(this.userPrincipals) != "undefined"
						&& typeof(this.userPrivileges) != "undefined"
						&& typeof(this.userAddresses) != "undefined"
						&& typeof(this.identities) != "undefined"
						&& typeof(this.ownerPrincipal) != "undefined");
  },
 userIsOwner: function userIsOwner() {
    var result = false;

    var i = 0;

    if (this.hasAccessControl) {
// 			dump("owner: " + this.ownerPrincipal + "\n");
      while (!result && i < this.userPrincipals.length) {
// 				dump("user: " + this.userPrincipals[i] + "\n");
				if (this.userPrincipals[i] == this.ownerPrincipal)
					result = true;
				else
					i++;
      }
    }
    else
      result = true;

    return result;
  },
 userCanAddComponents: function userCanAddComponents() {
// 		dump("has access control: " + this.hasAccessControl + "\n");
    return (!this.hasAccessControl
						|| (this.userPrivileges.indexOf("{DAV:}bind")
								> -1));
  },
 userCanDeleteComponents: function userCanAddComponents() {
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
// 		dump("parent ready: " + this.parentCalendarEntry.isCalendarReady() + "\n"
// 				 + "this.userPrivileges: " + this.userPrivileges + "\n"
// 				 + "ac: " + this.parentCalendarEntry.hasAccessControl + "\n");
    return (this.parentCalendarEntry.isCalendarReady()
						&& (this.userPrivileges != null
								|| !this.parentCalendarEntry.hasAccessControl));
  },
 userIsOwner: function userIsOwner() {
    return this.parentCalendarEntry.userIsOwner();
  },
 userCanModify: function userCanModify() {
// 		dump("this.url: " + this.url + "\n");
// 		dump("this.userPrivileges: " + this.userPrivileges + "\n");
// 		dump("this.parentCalendarEntry.userPrivileges: "
// 				 + this.parentCalendarEntry.userPrivileges + "\n");

    var result;
    if (this.parentCalendarEntry.hasAccessControl) {
      var privileges = (this.url
												? this.userPrivileges
												: this.parentCalendarEntry.userPrivileges);
      result = (privileges.indexOf("{DAV:}write") > -1);
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
