/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
/*************************************************************************************************************	 
 Copyright:	Inverse groupe conseil, 2007
 Author: 	Robert Bolduc
 Email:		support@inverse.ca 
 URL:			http://inverse.ca
	
 This file is part of "SOGo Connector" a Thunderbird extension.

	The Original Code is Mozilla Communicator client code, released
	March 31, 1998.
 
	The Initial Developer of the Original Code is
	Netscape Communications Corporation.
	Portions created by the Initial Developer are Copyright (C) 1998-1999
	the Initial Developer. All Rights Reserved.
 
	Contributor(s):
		Ian Neal <bugzilla@arlen.demon.co.uk>
 
		"SOGo Connector" is free software; you can redistribute it and/or modify
		it under the terms of the GNU General Public License version 2 as published by
		the Free Software Foundation;

		"SOGo Connector" is distributed in the hope that it will be useful,
		but WITHOUT ANY WARRANTY; without even the implied warranty of
		MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.	See the
		GNU General Public License for more details.

		You should have received a copy of the GNU General Public License
		along with "SOGo Connector"; if not, write to the Free Software
		Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA	02110-1301	USA
 ********************************************************************************/

/*
 * This overlay adds cardDAV functionalities to autoCompletion
 */

const CI = Components.interfaces;

/*var cardDAVDirectoryServerObserver = {
	observe: function(subject, topic, value) {
			try {
					setupCardDavAutoCompleteSession();
			} catch (ex) {
					// catch the exception and ignore it, so that if LDAP setup 
					// fails, the entire compose window doesn't get horked
			}
	}
}
*/

function autoCompleteDirectoryIsCardDav(){
	var autocompleteDirectory = sPrefs.getCharPref("ldap_2.autoComplete.directoryServer");
	var uri = sPrefs.getComplexValue(autocompleteDirectory +".uri", CI.nsISupportsString);
	if ( uri && uri.data && uri.data.toString() && uri.data.toString().search("moz-abdavdirectory://") == 0)
		return true;
	else
		return false;	 
}

// Override directoryServerObserver to test for CardDAV
var directoryServerObserver = {
	observe: function(subject, topic, value) {
		try {
			if (autoCompleteDirectoryIsCardDav()){
				setupCardDavAutoCompleteSession();
			}else{
				setupLdapAutocompleteSession();
			}					
		} catch (ex) {
		// catch the exception and ignore it, so that if LDAP setup 
		// fails, the entire compose window doesn't get horked
		}
	}
};

function setupCardDavAutoCompleteSession(){
	var autocompleteLdap = false;
	var autocompleteDirectory = null;
	var prevAutocompleteDirectory = gCurrentAutocompleteDirectory;
	var i;

	autocompleteLdap = sPrefs.getBoolPref("ldap_2.autoComplete.useDirectory");
	if (autocompleteLdap)
		autocompleteDirectory = sPrefs.getCharPref("ldap_2.autoComplete.directoryServer");
		
	if(gCurrentIdentity.overrideGlobalPref) {
		autocompleteDirectory = gCurrentIdentity.directoryServer;
	}

	dump("+++++++++++++++++++++  " + autocompleteDirectory + "\n")	;
	// use a temporary to do the setup so that we don't overwrite the
	// global, then have some problem and throw an exception, and leave the
	// global with a partially setup session.	we'll assign the temp
	// into the global after we're done setting up the session
	//
	var cardDAVSession;
	if (gLDAPSession) {
		cardDAVSession = gLDAPSession;
	} else {
		cardDAVSession = Components.classes["@mozilla.org/autocompleteSession;1?type=carddav"].createInstance(CI.nsICardDAVAutoCompleteSession);
	}
						
	if (autocompleteDirectory && !gIsOffline) { 
	// Add observer on the directory server we are autocompleting against
	// only if current server is different from previous.
	// Remove observer if current server is different from previous			 
		gCurrentAutocompleteDirectory = autocompleteDirectory;
		if (prevAutocompleteDirectory) {
			if (prevAutocompleteDirectory != gCurrentAutocompleteDirectory) { 
				RemoveDirectorySettingsObserver(prevAutocompleteDirectory);
				sPrefBranchInternal.addObserver(gCurrentAutocompleteDirectory, directoryServerObserver, false);
			}
		}else{
			AddDirectorySettingsObserver();
		}
		// fill in the session params if there is a session
			if (cardDAVSession) {
				if (!gSessionAdded) {
				// if we make it here, we know that session initialization has
				// succeeded; add the session for all recipients, and 
				// remember that we've done so
					var autoCompleteWidget;
					for (i=1; i <= awGetMaxRecipients(); i++){
						autoCompleteWidget = document.getElementById("addressCol2#" + i);
						if (autoCompleteWidget){
							autoCompleteWidget.addSession(cardDAVSession);
							
							// ldap searches don't insert a default entry with the default domain appended to it
							// so reduce the minimum results for a popup to 2 in this case. 
							autoCompleteWidget.minResultsForPopup = 2;
						}
					}
					gSessionAdded = true;
				}
			}
		}else {
			if (gCurrentAutocompleteDirectory) {
			// Remove observer on the directory server since we are not doing Ldap autocompletion.
				RemoveDirectorySettingsObserver(gCurrentAutocompleteDirectory);
				gCurrentAutocompleteDirectory = null;
			}
			if (gLDAPSession && gSessionAdded) {
				for (i=1; i <= awGetMaxRecipients(); i++) {
					document.getElementById("addressCol2#" + i).removeSession(gLDAPSession);
				}
				gSessionAdded = false;
			}
		}
		var serverURL = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(CI.nsIURL);
		try {

			dump("******** autocompleteDirectory: " + autocompleteDirectory + "\n");
			dump(gPrefs.getCharPref(autocompleteDirectory +".uri"));
			dump("\n")
			serverURL.spec = gPrefs.getCharPref(autocompleteDirectory +".uri");
			dump("serverURL.spec: " + serverURL.spec +"\n");
		} catch (ex){
			dump("ERROR: " + ex + "\n");
		}
		cardDAVSession.serverURL = serverURL;

		gLDAPSession = cardDAVSession;
		gSetupLdapAutocomplete = true;
}

// No other way to override the function than to copy it and just add the test for autoCompleteDirectoryIsCardDav()
function setupAutocomplete()
{
	//Setup autocomplete session if we haven't done so already
	if (!gAutocompleteSession) {
		gAutocompleteSession = Components.classes["@mozilla.org/autocompleteSession;1?type=addrbook"].getService(CI.nsIAbAutoCompleteSession);
		if (gAutocompleteSession) {
			setDomainName();

			var autoCompleteWidget = document.getElementById("addressCol2#1");
			// When autocompleteToMyDomain is off, there is no default entry with the domain
			// appended, so reduce the minimum results for a popup to 2 in this case.
			if (!gCurrentIdentity.autocompleteToMyDomain)
				autoCompleteWidget.minResultsForPopup = 2;

			// if the pref is set to turn on the comment column, honor it here.
			// this element then gets cloned for subsequent rows, so they should 
			// honor it as well
			//
			try {
					if (sPrefs.getBoolPref("mail.autoComplete.highlightNonMatches"))
						autoCompleteWidget.highlightNonMatches = true;

					if (sPrefs.getIntPref("mail.autoComplete.commentColumn"))
						autoCompleteWidget.showCommentColumn = true;
			} catch (ex) {
					// if we can't get this pref, then don't show the columns (which is
					// what the XUL defaults to)
			}
							
		} else {
			gAutocompleteSession = 1;
		}
	}
	if (!gSetupLdapAutocomplete) {
			try {
				if (autoCompleteDirectoryIsCardDav()){
					setupCardDavAutoCompleteSession();
				}else{
						setupLdapAutocompleteSession();
				}
			} catch (ex) {
					// catch the exception and ignore it, so that if LDAP setup 
					// fails, the entire compose window doesn't end up horked
			}
	}
}

dump("gcep\n");