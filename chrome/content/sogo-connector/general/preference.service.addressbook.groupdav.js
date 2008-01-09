/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
/*************************************************************************************************************   
 Copyright:	Inverse groupe conseil, 2006-2007
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

function isGroupdavDirectory(abURI) {
	var value = false;

	if (abURI
			&& abURI.search("mab/MailList") == -1) {
		var ab = Components.classes["@mozilla.org/rdf/rdf-service;1"]
			.getService(Components.interfaces.nsIRDFService)
			.GetResource(abURI)
			.QueryInterface(Components.interfaces.nsIAbDirectory);

 		var prefId = ab.directoryProperties.prefName;	
		try {
			var groupdavPrefService = new GroupdavPreferenceService(prefId);
		}
		catch(e) {
			//var xpcConnect =Components.classes["DEB1D48E-7469-4B01-B186-D9854C7D3F2D"].getService(Components.interfaces.nsIXPConnect);	
			dump("abURI '" + abURI
					 + " is invalid in call isGroupdavDirectory(abURI) \n\n STACK:\n"
					 + backtrace(10));
			dump("ab prefid: " + prefId + "\n");
			// TODO this needs to be handle better
			// Currently if for any reason someone messed up prefs.js this could create havoc
		}

		try {
// 			dump("the real test\n");
			value = (groupdavPrefService.getDirectoryName() !="");
		}
		catch(e) {}
	}

// 	dump("abURI: " + abURI + " isGroupDav? " + value + "\n");

	return value;
}

function GroupdavPreferenceService(uniqueId) {
	if (uniqueId == null || uniqueId == "") {
		logError("GroupdavPreferenceService exception: Missing uniqueId"+
						 backtrace());
		throw new Components.Exception("GroupdavPreferenceService exception: Missing uniqueId");
	}

	this.mPreferencesService = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefBranch);
	this.prefPath = "extensions.ca.inverse.addressbook.groupdav." + uniqueId + ".";
}

GroupdavPreferenceService.prototype = {
	mPreferencesService: null,
	prefPath: null,

	_getPref: function(prefName) {
		var value = null;

// 		dump("getPref: " + this.prefPath + prefName + "\n");

		try {
			value = this.mPreferencesService.getCharPref(this.prefPath + prefName);
		}
		catch(e) {
			dump("exception getting pref '" + this.prefPath + prefName
					 + "': \n" + e + " (" + e.lineNumber + ")\n");
			dump("stack: " + backtrace() + "\n");
			throw("unacceptable condition: " + e);
		}

		return value;
	},
	_setPref: function(prefName, value) {
// 		dump("setPref: " + this.prefPath + prefName + " to: " + value + "\n");
		try {
			this.mPreferencesService.setCharPref(this.prefPath + prefName, value);
		}
		catch(e) {
			dump("exception setting pref '" + this.prefPath + prefName + "' to value '"
					 + value + "': \n" + e + " (" + e.lineNumber + ")\n");
			dump("stack: " + backtrace() + "\n");
			throw("unacceptable condition: " + e);
		}
// 		dump("setPref - done\n");
	},
	_getBoolPref: function(prefName) {
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
	_setBoolPref: function(prefName, value) {
		var strValue;

		if (value)
			strValue = "true";
		else
			strValue = "false";

		this._setPref(prefName, strValue);
	},

	getReadOnly: function() {
		return this._getBoolPref("readOnly");
	},
	setReadOnly: function(value) {
// 		dump("value: " + value + "\n");
		this._setBoolPref("readOnly", value);
	},

	getAutoDeleteFromServer: function() {
		return this._getBoolPref("autoDeleteFromServer");
	},
	setAutoDeleteFromServer: function(value) {
		this._setBoolPref("autoDeleteFromServer", value);
	},

	getURL: function() {
		var url = this._getPref("url");
		if (url) {
			if (url[url.length - 1] != '/')
				url += '/';
		}

		return url;
	},
	getHostName: function(){
		var hostname = null;
		var url = this.getURL();

		if (url && url.length > 0) {
			var uri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
			uri.spec = url;
			hostname = uri.host;
		}

		return hostname;
	},
	setURL: function(url) {
		this._setPref("url", url);
	},
	
	getDirectoryName: function() {
		return this._getPref("name");
	},
	setDirectoryName: function(name) {
		this._setPref("name", name);
	},
	
	getServerType: function() {
		return parseInt(this._getPref("serverType"));
	},
	setServerType: function(value) {
		this._setPref("serverType", value);
	},
	
	getDisplayDialog: function() {
		return this._getBoolPref("displaySyncCompletedDialog");
	},
	setDisplayDialog: function(value) {
// 		dump("value: " + value + "\n");
		this._setBoolPref("displaySyncCompletedDialog", value);
	},
	
	getMigrationDone: function() {
		return this._getBoolPref("migrationDone");
	},
	setMigrationDone: function(value) {
		this._setBoolPref("migrationDone", value);
	}
};
