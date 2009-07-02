/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
/*************************************************************************************************************   
 Copyright:	Inverse inc., 2006-2007
 Author: 	Robert Bolduc
 Email:		support@inverse.ca 
 URL:			http://inverse.ca
  
 This file is part of "SOGo Connector" a Thunderbird extension.

    "SOGo Connector" is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License version 2 as published by
    the Free Software Foundation;

    "SOGo Connector" is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with "SOGo Connector"; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 ********************************************************************************/

function jsInclude(files, target) {
	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		.getService(Components.interfaces.mozIJSSubScriptLoader);
	for (var i = 0; i < files.length; i++) {
		try {
			loader.loadSubScript(files[i], target);
		}
		catch(e) {
			dump("webdav.inverse.ca.js: failed to include '" + files[i] + "'\n" + e + "\n");
		}
	}
}

jsInclude(["chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js"]);

function isGroupdavDirectory(abURI) {
	var value = false;

	if (abURI
			&& abURI.search("mab/MailList") == -1
			&& abURI.search("moz-abmdbdirectory://") == 0) {
		var ab = Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService)
			.GetResource(abURI)
			.QueryInterface(Components.interfaces.nsIAbDirectory);

 		var prefId = ab.directoryProperties.prefName;
		try {
			var groupdavPrefService = new GroupdavPreferenceService(prefId);
			value = (groupdavPrefService.getURL() != "");
		}
		catch(e) {
			//var xpcConnect =Components.classes["DEB1D48E-7469-4B01-B186-D9854C7D3F2D"].getService(Components.interfaces.nsIXPConnect);	
// 			dump("ab prefid: " + prefId + "\n");
// 			dump("abURI '" + abURI
// 					 + " is invalid in call isGroupdavDirectory(abURI) \n\n STACK:\n"
// 					 + backtrace(10));
			// TODO this needs to be handle better
			// Currently if for any reason someone messed up prefs.js this could create havoc
		}
	}

//   	dump("abURI: " + abURI + " isGroupDav? " + value + "\n");

	return value;
}

function isCardDavDirectory(abURI){
	var value = false;

	var abdavPrefix = "moz-abdavdirectory://";
	if (abURI
			&& abURI.search("mab/MailList") == -1
			&& (abURI.search("carddav://") == 0
					|| abURI.search(abdavPrefix) == 0)) {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);
		var prefName = abURI.substr(abdavPrefix.length);
		try {
			var uri = prefs.getCharPref(prefName + ".uri");
			value = (uri.search("carddav://") == 0);
		}
		catch(e) {
			dump("uri for " + prefName + " not found\n");
		}
	}

	// 	dump("isCardDAV: " + abURI + " = " + value + "\n");

	return value;
}

function GroupdavPreferenceService(uniqueId) {
	if (uniqueId == null || uniqueId == "") {
// 		dump("GroupdavPreferenceService exception: Missing uniqueId"+
// 				 backtrace());
		throw new Components.Exception("GroupdavPreferenceService exception: Missing uniqueId");
	}

	this.mPreferencesService = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	this.prefPath = "extensions.ca.inverse.addressbook.groupdav." + uniqueId + ".";
}

GroupdavPreferenceService.prototype = {
	mPreferencesService: null,
	prefPath: null,

	_getPref: function GdPSvc__getPref(prefName) {
		var value = null;

// 		dump("getPref: " + this.prefPath + prefName + "\n");

		try {
			value = this.mPreferencesService.getCharPref(this.prefPath + prefName);
		}
		catch(e) {
			dump("exception getting pref '" + this.prefPath + prefName
 					 + "': \n" + e + " (" + e.lineNumber + ")\n");
 			dump("  stack:\n" + backtrace() + "\n");
			throw("unacceptable condition: " + e);
		}

		return value;
	},
	_getPrefWithDefault:
	function GdPSvc__getPrefWithDefault(prefName, defaultValue) {
		var value = defaultValue;

// 		dump("getPref: " + this.prefPath + prefName + "\n");

		try {
			var newValue = this.mPreferencesService
										 .getCharPref(this.prefPath + prefName);
			if (newValue)
				value = newValue;
		}
		catch(e) {}

		return value;
	},

	_setPref: function GdPSvc__setPref(prefName, value) {
// 		dump("setPref: " + this.prefPath + prefName + " to: " + value + "\n");
		try {
			this.mPreferencesService.setCharPref(this.prefPath + prefName, value);
		}
		catch(e) {
// 			dump("exception setting pref '" + this.prefPath + prefName + "' to value '"
// 					 + value + "': \n" + e + " (" + e.lineNumber + ")\n");
// 			dump("stack: " + backtrace() + "\n");
			throw("unacceptable condition: " + e);
		}
// 		dump("setPref - done\n");
	},
	_getBoolPref: function GdPSvc__getBoolPref(prefName) {
		var boolValue = false;
		var value = this._getPref(prefName);
		if (value) {
			var strValue = value.toLowerCase();
			if (strValue == "true"
					|| strValue == "1"
					|| strValue == "on"
					|| strValue == "enabled")
				boolValue = true;
		}

		return boolValue;
	},
	_setBoolPref: function GdPSvc__setBoolPref(prefName, value) {
		var strValue;

		if (value)
			strValue = "true";
		else
			strValue = "false";

		this._setPref(prefName, strValue);
	},

	getURL: function GdPSvc_getURL() {
		var url = this._getPref("url");
		if (url) {
			if (url[url.length - 1] != '/')
				url += '/';
		}

		return url;
	},
	setURL: function GdPSvc_setURL(url) {
		this._setPref("url", url);
	},

	getHostName: function GdPSvc_getHostName(){
		var hostname = null;
		var url = this.getURL();

		if (url && url.length > 0) {
			var uri = Components.classes["@mozilla.org/network/standard-url;1"]
								.createInstance(Components.interfaces.nsIURI);
			uri.spec = url;
			hostname = uri.host;
		}

		return hostname;
	},

	getCTag: function GdPSvc_getCTag() {
		return this._getPrefWithDefault("ctag", "");
	},
	setCTag: function GdPSvc_setCTag(value) {
		this._setPref("ctag", value);
	},

	getWebdavSyncToken: function GdPSvc_getWebdavSyncToken() {
		return this._getPrefWithDefault("sync-token", "");
	},
	setWebdavSyncToken: function GdPSvc_setWebdavSyncToken(value) {
		this._setPref("sync-token", value);
	}
};

function GroupDAVListAttributes(list) {
	var listRsrc = list.QueryInterface(Components.interfaces.nsIRDFResource);
	var uri = listRsrc.Value;
	var uriParts = uri.split("/");
	var parentURI = uriParts[0] + "//" + uriParts[2];

	var ab = Components.classes["@mozilla.org/rdf/rdf-service;1"]
		.getService(Components.interfaces.nsIRDFService)
		.GetResource(parentURI)
		.QueryInterface(Components.interfaces.nsIAbDirectory);
	var prefPrefix = "ldap_2.servers.";
	var uniqueID = (ab.directoryProperties.prefName.substr(prefPrefix.length)
									.replace("_", "", "g")
									+ "_" + uriParts[3].replace("_", "", "g"));
	this.mPrefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	this.prefPath = "extensions.ca.inverse.addressbook.groupdav." + uniqueID;
	dump("*** list: " + this.prefPath + "\n");
}

GroupDAVListAttributes.prototype = {
 _getCharPref: function(key) {
		var value;
		try {
			value = this.mPrefs.getCharPref(this.prefPath + "." + key);
		}
		catch(e) {
			value = null;
		}

		dump(key + ": " + value + "\n");
		return value;
	},
 _setCharPref: function(key, value) {
		dump("new " + key + ": " + value + "\n");
		this.mPrefs.setCharPref(this.prefPath + "." + key, value);
	},

	get key() {
		return this._getCharPref("key");
	},
	set key(newKey) {
		this._setCharPref("key", newKey);
	},

	get version() {
		return this._getCharPref("version");
	},
	set version(newVersion) {
		this._setCharPref("version", newVersion);
	},

 deleteRecord: function() {
		try {
			this.mPrefs.deleteBranch(this.prefPath);
		}
		catch(e) {};
	}
};
