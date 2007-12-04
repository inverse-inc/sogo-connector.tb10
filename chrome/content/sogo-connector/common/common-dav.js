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

var autoCompleteDirectoryPreferencesPrefix = "ldap_2.autoComplete.";

var prefsService = Components.classes["@mozilla.org/preferences;1"].getService(Components.interfaces.nsIPref);

function isCardDavDirectory(abURI){
	var result = false;
	if (abURI){
		if (abURI.search("moz-abdavdirectory") != -1){
			result = true;
		}
	}else{
		dump( "abURI is undefined for in fonction isCardDavDirectory(abURI)");
   }
   return result;
}

function getAutoCompleteCardDAVUri(){
	var result = null;
	var directoryServerPrefix = prefsService.GetCharPref(autoCompleteDirectoryPreferencesPrefix + "directoryServer");
	if (directoryServerPrefix){
		result= prefsService.GetCharPref(directoryServerPrefix + ".uri");
	}
	return result
}
function isAutoCompleteDirectoryServerCardDAV(){
	var result = false;
	var prefsService = Components.classes["@mozilla.org/preferences;1"].getService(Components.interfaces.nsIPref);
	
	var uri = getAutoCompleteCardDAVUri(autoCompleteDirectoryPreferencesPrefix)
	if (uri){
		result = isCardDavDirectory(uri);
	}		
	return result;
}
