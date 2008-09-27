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
			dump("common-dav.js: failed to include '" + files[i] +
					 "'\n" + e
					 + "\nFile: " + e.fileName
					 + "\nLine: " + e.lineNumber + "\n\n Stack:\n\n" + e.stack);
		}
	}
}

jsInclude(["chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js"]);

var autoCompleteDirectoryPreferencesPrefix = "ldap_2.autoComplete.";

function getAutoCompleteCardDAVUri(){
	var result = null;
	var prefsService = Components.classes["@mozilla.org/preferences;1"]
		.getService(Components.interfaces.nsIPref);

// 	dump("prefix: " + autoCompleteDirectoryPreferencesPrefix + "\n");
	var directoryServerPrefix = prefsService.GetCharPref(autoCompleteDirectoryPreferencesPrefix + "directoryServer");
	if (directoryServerPrefix
			&& directoryServerPrefix.length > 0)
		result = "moz-abdavdirectory://" + directoryServerPrefix;

	return result;
}

function isAutoCompleteDirectoryServerCardDAV() {
	var result = false;

	var uri = getAutoCompleteCardDAVUri(autoCompleteDirectoryPreferencesPrefix);
	dump("uri: " + uri + "\n");
	if (uri)
		result = isCardDavDirectory(uri);

	return result;
}
