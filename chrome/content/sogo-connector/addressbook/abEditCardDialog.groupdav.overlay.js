/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 4 -*- */
/*********************************************************************************
   Copyright:	Inverse groupe conseil, 2006-2007
   Author: 		Wolfgang Sourdeau
   Email:		support@inverse.ca
   URL:			http://inverse.ca
   
   This file is part of "SOGo Connector" a Thunderbird extension.
   
   "SOGo Connector" is free software; you can redistribute it
   and/or modify it under the terms of the GNU General Public License version 2
   as published by the Free Software Foundation;

   "SOGo Connector" is distributed in the hope that it will be
   useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
   Public License for more details.

   You should have received a copy of the GNU General Public License along
   with "SOGo Connector"; if not, write to the
   Free Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
   02110-1301  USA
********************************************************************************/

function jsInclude(files, target) {
	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		.getService(Components.interfaces.mozIJSSubScriptLoader);
	for (var i = 0; i < files.length; i++)
		loader.loadSubScript(files[i], target);
}

jsInclude(["chrome://sogo-connector/content/common/common-dav.js",
		   "chrome://inverse-library/content/simpleLdapQuery.js"]);

function UpdateFBUrl() {
	if (!isLDAPDirectory(getUri())) {
		// LDAP Directories
		try {
			var card = gEditCard.card.QueryInterface(Components.interfaces.nsIAbMDBCard);
			var fbUrlInput = document.getElementById("FbUrl");
			card.setStringAttribute("calFBURL", fbUrlInput.value);
		}
		catch (e) {
			//	   cardproperty.setCardValue("calFBURL", fbUrlInput.value);
		}
	}
};

function ReadLdapFbUrl() {
	var url = "";

	var prefs = Components.classes["@mozilla.org/preferences;1"]
	.getService(Components.interfaces.nsIPref);
	var branch = gEditCard.abURI.split("://")[1];
	var uriSpec = prefs.GetCharPref(branch + ".uri");
	var uri = Components.classes["@mozilla.org/network/ldap-url;1"].createInstance(Components.interfaces.nsILDAPURL);
	uri.spec = uriSpec;
	uri.filter = "(cn=" + gEditCard.card.displayName + ")";
	uri.setAttributes(1, ["calFBURL"]);
	try {
		var ldapQuery = new simpleLdapQuery();
		var result = ldapQuery.getQueryResults(uri, 3);
		if (result)
			url = result.split("=")[1];
	}
	catch(e) {
		dump("exception:" + e + "\n");
		throw(e);
	}

	return url;
};

function LoadFBUrl() {
	var fbUrlInput = document.getElementById("FbUrl");

	if (isLDAPDirectory(getUri())) {
		// LDAP Directories
		fbUrlInput.disabled = true;
		fbUrlInput.disabledforreadonly = true;
		fbUrlInput.value = ReadLdapFbUrl();
	}
	else {
		try {
			var card = gEditCard.card.QueryInterface(Components.interfaces.nsIAbMDBCard);
			fbUrlInput.value = card.getStringAttribute("calFBURL");
		}
		catch (e) {};
	}
};

/* event handlers */
function OnLoadHandler() {
	LoadFBUrl();
	this.addEventListener("dialogaccept", OnDialogAcceptHandler, false);
};

function OnDialogAcceptHandler() {
	UpdateFBUrl();
	EditCardOKButtonOverlay();
};

/* starting... */

window.addEventListener("load", OnLoadHandler, false);
