/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

function jsInclude(files, target) {
	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		.getService(Components.interfaces.mozIJSSubScriptLoader);
	for (var i = 0; i < files.length; i++) {
		try {
			loader.loadSubScript(files[i], target);
		}
		catch(e) {
			dump("SOGoConnectorACSessionWrapper.js: failed to include '" + files[i] + "'\n" + e + "\n");
		}
	}
}

jsInclude(["chrome://sogo-connector/content/common/common-dav.js"]);

function WrapperListener(wrapper, number) {
	this.wrapper = wrapper;
	this.number = number;
}

WrapperListener.prototype = {
 QueryInterface: function(aIID) {
		if (!aIID.equals(Components.interfaces.nsIAutoCompleteListener)
				&& !aIID.equals(Components.interfaces.nsISupports))
			throw Components.results.NS_ERROR_NO_INTERFACE;
		return this;
	},

 /* nsIAutoCompleteListener */
 onAutoComplete: function(result, status) {
		this.wrapper.onAutoComplete(result, status, this.number);
	},
 onStatus: function(statusText) {
		this.wrapper.onStatus(statusText, this.number);
	}
};

//class constructor
function SOGoConnectorACSessionWrapper() {
//  	dump("SOGoConnectorACSessionWrapper constructor!\n");
	this.initSessions();
};

SOGoConnectorACSessionWrapper.prototype = {
 sessions: null,
 listeners: null,

 waiting: 0,
 running: false,
 results: null,

 initSessions: function() {
		var names = new Array();
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);

		var autocompleteLocal = false;
		try {
			autocompleteLocal = prefs.getBoolPref("mail.enable_autocomplete");
		}
		catch(e) {
			autocompleteLocal = false;
		}
		if (autocompleteLocal)
			names.push("addrbook");

		var autocompleteLdap = false;
		try {
			autocompleteLdap = prefs.getBoolPref("ldap_2.autoComplete.useDirectory");
		}
		catch(e) {
			autocompleteLdap = false;
		}

		var serverURL;
		if (autocompleteLdap) {
			var autocompleteDirectory = prefs.getCharPref("ldap_2.autoComplete.directoryServer");
			if (isAutoCompleteDirectoryServerCardDAV()) {
// 				dump("carddav\n");
				serverURL = Components.classes["@mozilla.org/network/standard-url;1"]
					.createInstance(Components.interfaces.nsIURI);
				try {
					var cardDavURL = prefs.getCharPref(autocompleteDirectory +".uri");
					var cardDavPrefix = "carddav://";
					serverURL.spec = cardDavURL.substr(cardDavPrefix.length);
// 																								 Components.interfaces.nsISupportsString)
// 						.data;
					names.push("carddav");
				}
				catch (ex) {
					dump("ERROR: " + ex + "\n");
				}
			}
			else {
// 				dump("ldap\n");
				serverURL = Components.classes["@mozilla.org/network/ldap-url;1"]
					.createInstance(Components.interfaces.nsIURI);
				try {
// 					dump("autocomplete: " + autocompleteDirectory + "\n");
					serverURL.spec = prefs.getCharPref(autocompleteDirectory +".uri");
// 					serverURL.spec = prefs.getComplexValue(autocompleteDirectory +".uri",
// 																								 Components.interfaces.nsISupportsString)
// 						.data;
					names.push("ldap");
				}
				catch (ex) {
					dump("ERROR: " + ex + "\n");
				}
			}
		}

		var sessions = new Array();
		var listeners = new Array();
		for (var i = 0; i < names.length; i++) {
			try {
//  				dump("session name: " + names[i] + "\n");
				var session;
				if (names[i] == "carddav") {
					session = Components.classes["@mozilla.org/autocompleteSession;1?type=" + names[i]]
						.createInstance(Components.interfaces.nsICardDAVAutoCompleteSession);
					session.serverURL = serverURL;
				}
				else if (names[i] == "ldap") {
					session = Components.classes["@mozilla.org/autocompleteSession;1?type=" + names[i]]
						.createInstance(Components.interfaces.nsILDAPAutoCompleteSession);
					session.serverURL = serverURL;
				}
				else
					session = Components.classes["@mozilla.org/autocompleteSession;1?type=" + names[i]]
						.createInstance(Components.interfaces.nsIAutoCompleteSession);
				sessions.push(session.QueryInterface(Components.interfaces.nsIAutoCompleteSession));
			}
			catch(e) {
				dump("cannot instantiate '" + names[i]
						 + "' auto-complete session\n" + e);
			}
			listeners.push(new WrapperListener(this, i));
		}
		this.sessions = sessions;
		this.listeners = listeners;
	},

 /* nsIAutoCompleteSession */
 onAutoComplete: function(searchString, previousSearchResult, listener) {
//  		dump("SOGoConnectorACSessionWrapper.prototype.onAutoComplete\n");

		for (var i = 0; i < this.sessions.length; i++) {
			var session = this.sessions[i];
			session.onAutoComplete(searchString, previousSearchResult,
														 this.listeners[i]);
		}
	},
 onStartLookup: function (searchString, previousSearchResult, listener) {
//  		dump("SOGoConnectorACSessionWrapper.prototype.onStartLookup\n");

		this.waiting = this.sessions.length;
		this.running = true;
		this.listener = listener;
		this.searchString = searchString;

// 		dump("searching '" + searchString + "'\n");
		for (var i = 0; i < this.sessions.length; i++) {
			var session = this.sessions[i];
			session.onStartLookup(searchString, previousSearchResult,
														this.listeners[i]);
		}
	},
 onStopLookup: function() {
//  		dump("SOGoConnectorACSessionWrapper.prototype.onStopLookup\n");

		this._reset();
		for (var i = 0; i < this.sessions.length; i++) {
			var session = this.sessions[i];
			session.onStopLookup();
		}
	},

 _reset: function() {
		this.running = false;
		this.results = null;
		this.waiting = 0;
		this.searchString = null;
		this.listener = null;
	},

 onAutoComplete: function(result, status, number) {
		dump("wrapper autocompete\n");
		if (this.running) {
			this.waiting--;

			if (status && result)
				this._fillResults(result.items);

			if (!this.waiting) {
				var returnStatus = 0;
				var returnResults = null;
				if (this.results) {
					returnStatus = 1;
					returnResults = this._buildResults();
				}
				this.listener.onAutoComplete(returnResults, returnStatus);
				this._reset();
			}
		}
	},
 _fillResults: function(results) {
		if (results) {
			for (var i = 0; i < results.Count(); i++) {
				try {
					var item = results.GetElementAt(i)
						.QueryInterface(Components.interfaces.nsIAutoCompleteItem);
					if (!this.results)
						this.results = {};
					var key = item.value;
					if (key) {
						var index = key.indexOf("<");
						var hasFN = false;
						if (index > -1) {
							hasFN = true;
							var lastIndex = key.indexOf(">");
							key = key.substr(index + 1, lastIndex - index - 1);
						}
						var data = this.results[key];
						if (!data
								|| (!data.hasFN && hasFN))
							this.results[key] = {value: item.value,
																	 comment: item.comment,
																	 hasFN: hasFN};
					}
					else {
						dump("faulty key: " + item.value + ", " + item.comment + ", " +
								 item.className + "\n");
						dump(item + "\n");
					}
				}
				catch(e) {}
			}
		}
	},
 _buildResults: function() {
		var resultsArray = Components.classes["@mozilla.org/supports-array;1"]
		.createInstance(Components.interfaces.nsISupportsArray);
		for (var key in this.results) {
			var value = this.results[key].value;
			var item = Components.classes["@mozilla.org/autocomplete/item;1"]
				.createInstance(Components.interfaces.nsIAutoCompleteItem);
			item.className = "remote-abook";
			item.comment = this.results[key].comment;
			item.value = value;
			resultsArray.AppendElement(item);
		}
		var results = Components.classes["@mozilla.org/autocomplete/results;1"]
		.createInstance(Components.interfaces.nsIAutoCompleteResults);
		results.defaultItemIndex = 0;
		results.items = resultsArray;
		results.searchString = this.searchString;

		return results;
	},
 onStatus: function(statusText, number) {
		dump(number + ": onStatus: " + statusText + "\n");
	},

 /* nsISupports */
 QueryInterface: function(aIID) {
		if (!aIID.equals(Components.interfaces.nsIAutoCompleteSession)
				&& !aIID.equals(Components.interfaces.nsISOGoConnectorACSessionWrapper)
				&& !aIID.equals(Components.interfaces.nsISupports))
			throw Components.results.NS_ERROR_NO_INTERFACE;
		return this;
	}
};
