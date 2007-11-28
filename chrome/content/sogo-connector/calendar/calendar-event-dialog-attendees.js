/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 4 -*- */
/*************************************************************************************************************   
 Copyright:	Inverse groupe conseil, 2007
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

Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader).loadSubScript("chrome://sogo-connector/content/common/common-dav.js");

const CI = Components.interfaces;

var gCachedCriteria;
var gCachedResults;

function GetCalDAVFBInCardDAVAddressBook(criteria){
	var results = new Array();

	// Patch to prevent 2 searches since autocompletion modifies the criteria when it matches the email!!!
	if ( criteria.search("@") == -1)
		return results;
		
	if ( gCachedCriteria ==  criteria)
		return gCachedResults;
	else
		gCachedCriteria = criteria;
		
	// moz-abdavdirectory://http://sogo.inverse.ca/SOGo/dav/rbolduc/Contacts/public/?(or(PrimaryEmail,c,klm)(DisplayName,c,kkk)(FirstName,c,klm)(LastName,c,k)))
	var uri = getAutoCompleteCardDAVUri();
	if ( criteria && criteria.length > 0 && uri ){
		uri += "?(or(PrimaryEmail,c," + criteria + ")(DisplayName,c," + criteria + ")(FirstName,c," + criteria + ")(LastName,c," + criteria + "))";
				
		var resource = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService).GetResource(uri);
		var directory = resource.QueryInterface(Components.interfaces.nsIAbDirectory);	
		
		var cards;
		if (directory)
			try{
				cards = directory.childCards;
			}catch (e){
				dump("=====================================> Problem with cards = directory.childCards, uri =  " + uri + "\n");
			}
		if (cards){
			try {
				var done = false;
				cards.first(); 	
				do {
					var protoCard = cards.currentItem();
					if (protoCard instanceof Components.interfaces.nsIAbCard) {
						var card = protoCard.QueryInterface(Components.interfaces.nsIAbCard);
						var matchMail = "";
				
						if (card.defaultEmail.toLowerCase() == criteria)
							matchMail = card.defaultEmail;
						else if (card.primaryEmail.toLowerCase() == criteria)
							matchMail = card.primaryEmail;
						else if (card.secondEmail.toLowerCase() == criteria)
							matchMail = card.secondEmail;
	
						if (matchMail.length > 0) {
							var mdbCard = protoCard.QueryInterface(Components.interfaces.nsIAbMDBCard);
							var fbUrl = mdbCard.getStringAttribute("calFBURL");
							if (fbUrl && fbUrl.length > 0)
								results.push( { cn: card.displayName, mail: matchMail, calFBURL: fbUrl } );
							dump("var fbUrl = mdbCard.getStringAttribute('calFBURL'): " + fbUrl + "\n");
						}
					}
					cards.next();
				}
				while (Components.lastResult == 0);
			}
			catch(e) {}
		}
	}
	dump("Results'size: " + results.length + "\n");
	gCachedResults = results;
	return results;
}

function parseCardDAVResults(results){
	var resultArray = results.split("\n");
	var parsedResults = new Array();

	for (var i = 0; i < resultArray.length; i++){
		var line = resultArray[i];
		if (line.length > 0) {
			var lineArray = line.split("=");
			resultArray[lineArray[0]] = lineArray[1];
		}
	}	
	return resultArray;
}

function setupAutocompleteOverride(pntr){
	if (isAutoCompleteDirectoryServerCardDAV()){
		setupAutocompleteCardDAV(pntr);
	}else{
		setupAutocompleteOriginal(pntr);
	}
}

function setupAutocompleteCardDAV(pntr){
	var autocompleteLdap = false;
	var autocompleteDirectory = null;	
	var prevAutocompleteDirectory = pntr.mCurrentAutocompleteDirectory;
	var i;

	autocompleteLdap = pntr.mPrefs.getBoolPref("ldap_2.autoComplete.useDirectory");
	if (autocompleteLdap)
		autocompleteDirectory = pntr.mPrefs.getCharPref("ldap_2.autoComplete.directoryServer");
		
	// use a temporary to do the setup so that we don't overwrite the
	// global, then have some problem and throw an exception, and leave the
	// global with a partially setup session.	we'll assign the temp
	// into the global after we're done setting up the session
	//
	var cardDAVSession;
	if (pntr.mLDAPSession) {
		cardDAVSession = pntr.mLDAPSession;
	} else {
		cardDAVSession = Components.classes["@mozilla.org/autocompleteSession;1?type=cardav"].createInstance(CI.nsICardDAVAutoCompleteSession);
	}
						
	if (autocompleteDirectory && ! pntr.mIsOffline) { 
		// Add observer on the directory server we are autocompleting against
		// only if current server is different from previous.
		// Remove observer if current server is different from previous			 
		pntr.mCurrentAutocompleteDirectory = autocompleteDirectory;
		if (prevAutocompleteDirectory) {
			if (prevAutocompleteDirectory != pntr.mCurrentAutocompleteDirectory) { 
				pntr.removeDirectorySettingsObserver(prevAutocompleteDirectory);
				pntr.addDirectorySettingsObserver();
			}
		}else{
			pntr.addDirectorySettingsObserver();
		}
		// fill in the session params if there is a session
		if (cardDAVSession) {
			if (!pntr.mSessionAdded) {
				// if we make it here, we know that session initialization has
				// succeeded; add the session for all recipients, and 
				// remember that we've done so
				var autoCompleteWidget;
				for (i=1; i <= pntr.mMaxAttendees; i++)
					{
						autoCompleteWidget = pntr.getInputElement(i);
						if (autoCompleteWidget)
							{
								autoCompleteWidget.addSession(cardDAVSession);
								// ldap searches don't insert a default entry with the default domain appended to it
								// so reduce the minimum results for a popup to 2 in this case. 
								autoCompleteWidget.minResultsForPopup = 2;

							}
					}
				pntr.mSessionAdded = true;
			}
		}
	}else {
		if (pntr.mCurrentAutocompleteDirectory) {
			// Remove observer on the directory server since we are not doing Ldap autocompletion.
			pntr.removeDirectorySettingsObserver(pntr.mCurrentAutocompleteDirectory);
			pntr.mCurrentAutocompleteDirectory = null;
		}
		if (pntr.mLDAPSession && pntr.mSessionAdded) {
			for (i=1; i <= awGetMaxRecipients(); i++) {
				document.getElementById("addressCol2#" + i).removeSession(pntr.mLDAPSession);
			}
			pntr.mSessionAdded = false;
		}
	}
	var serverURL = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(CI.nsIURL);
	try {
		serverURL.spec = pntr.mPrefs.getComplexValue(autocompleteDirectory +".uri",CI.nsISupportsString).data;
	} catch (ex){
		dump("ERROR: " + ex + "\n");
	}
	cardDAVSession.serverURL = serverURL;

	pntr.mLDAPSession = cardDAVSession;
	pntr.mSetupLdapAutocomplete = true;
}

//TODO: There must be a better way to override setupAutocomplete() than to paste the parent code here!!!
function setupAutocompleteOriginal(pntr){
	var autocompleteLdap = false;
	var autocompleteDirectory = null;
	var prevAutocompleteDirectory = pntr.mCurrentAutocompleteDirectory;
	var i;
	
	autocompleteLdap = pntr.mPrefs.getBoolPref("ldap_2.autoComplete.useDirectory");
	if (autocompleteLdap)
	    autocompleteDirectory = pntr.mPrefs.getCharPref(
														"ldap_2.autoComplete.directoryServer");
	
	// use a temporary to do the setup so that we don't overwrite the
	// global, then have some problem and throw an exception, and leave the
	// global with a partially setup session.  we'll assign the temp
	// into the global after we're done setting up the session
	var LDAPSession;
	if (pntr.mLDAPSession) {
	    LDAPSession = pntr.mLDAPSession;
	} else {
	    LDAPSession = Components.classes[
										 "@mozilla.org/autocompleteSession;1?type=ldap"].createInstance()
	        .QueryInterface(Components.interfaces.nsILDAPAutoCompleteSession);
	}
	        
	if (autocompleteDirectory && !pntr.mIsOffline) { 
	    // Add observer on the directory server we are autocompleting against
	    // only if current server is different from previous.
	    // Remove observer if current server is different from previous       
	    pntr.mCurrentAutocompleteDirectory = autocompleteDirectory;
	    if (prevAutocompleteDirectory) {
			if (prevAutocompleteDirectory != pntr.mCurrentAutocompleteDirectory) { 
				pntr.removeDirectorySettingsObserver(prevAutocompleteDirectory);
				pntr.addDirectorySettingsObserver();
			}
	    }
	    else
			pntr.addDirectorySettingsObserver();
	    
	    // fill in the session params if there is a session
	    //
	    if (LDAPSession) {
	        var serverURL = Components.classes[
											   "@mozilla.org/network/ldap-url;1"].
	            createInstance().QueryInterface(
												Components.interfaces.nsILDAPURL);
	
	        try {
	            serverURL.spec = pntr.mPrefs.getComplexValue(autocompleteDirectory +".uri",
															 Components.interfaces.nsISupportsString).data;
	        } catch (ex) {
	            dump("ERROR: " + ex + "\n");
	        }
	        LDAPSession.serverURL = serverURL;
	
	        // get the login to authenticate as, if there is one
	        //
	        var login = "";
	        try {
	            login = pntr.mPrefs.getComplexValue(
													autocompleteDirectory + ".auth.dn",
													Components.interfaces.nsISupportsString).data;
	        } catch (ex) {
	            // if we don't have pntr pref, no big deal
	        }
	
	        // set the LDAP protocol version correctly
	        var protocolVersion;
	        try { 
	            protocolVersion = pntr.mPrefs.getCharPref(autocompleteDirectory + 
														  ".protocolVersion");
	        } catch (ex) {
	            // if we don't have this pref, no big deal
	        }
	        if (protocolVersion == "2") {
	            LDAPSession.version = 
	                Components.interfaces.nsILDAPConnection.VERSION2;
	        }
	
	        // find out if we need to authenticate, and if so, tell the LDAP
	        // autocomplete session how to prompt for a password.  This window
	        // is being used to parent the authprompter.
	        //
	        LDAPSession.login = login;
	        if (login != "") {
	            var windowWatcherSvc = Components.classes[
														  "@mozilla.org/embedcomp/window-watcher;1"]
	                .getService(Components.interfaces.nsIWindowWatcher);
	            var domWin = 
	                window.QueryInterface(Components.interfaces.nsIDOMWindow);
	            var authPrompter = 
	                windowWatcherSvc.getNewAuthPrompter(domWin);
	
	            LDAPSession.authPrompter = authPrompter;
	        }
	
	        // don't search on non-CJK strings shorter than this
	        //
	        try { 
	            LDAPSession.minStringLength = pntr.mPrefs.getIntPref(
																	 autocompleteDirectory + ".autoComplete.minStringLength");
	        } catch (ex) {
	            // if this pref isn't there, no big deal.  just let
	            // nsLDAPAutoCompleteSession use its default.
	        }
	
	        // don't search on CJK strings shorter than this
	        //
	        try { 
	            LDAPSession.cjkMinStringLength = pntr.mPrefs.getIntPref(
																		autocompleteDirectory + ".autoComplete.cjkMinStringLength");
	        } catch (ex) {
	            // if this pref isn't there, no big deal.  just let
	            // nsLDAPAutoCompleteSession use its default.
	        }
	
	        // we don't try/catch here, because if pntr fails, we're outta luck
	        //
	        var ldapFormatter = Components.classes[
												   "@mozilla.org/ldap-autocomplete-formatter;1?type=addrbook"]
	            .createInstance().QueryInterface(
												 Components.interfaces.nsIAbLDAPAutoCompFormatter);
	
	        // override autocomplete name format?
	        //
	        try {
	            ldapFormatter.nameFormat = 
	                pntr.mPrefs.getComplexValue(autocompleteDirectory + 
												".autoComplete.nameFormat",
												Components.interfaces.nsISupportsString).data;
	        } catch (ex) {
	            // if pntr pref isn't there, no big deal.  just let
	            // nsAbLDAPAutoCompFormatter use its default.
	        }
	
	        // override autocomplete mail address format?
	        //
	        try {
	            ldapFormatter.addressFormat = 
	                pntr.mPrefs.getComplexValue(autocompleteDirectory + 
												".autoComplete.addressFormat",
												Components.interfaces.nsISupportsString).data;
	        } catch (ex) {
	            // if this pref isn't there, no big deal.  just let
	            // nsAbLDAPAutoCompFormatter use its default.
	        }
	
	        try {
	            // figure out what goes in the comment column, if anything
	            //
	            // 0 = none
	            // 1 = name of addressbook this card came from
	            // 2 = other per-addressbook format
	            //
	            var showComments = 0;
	            showComments = pntr.mPrefs.getIntPref(
													  "mail.autoComplete.commentColumn");
	
	            switch (showComments) {
	
	            case 1:
	                // use the name of this directory
	                //
	                ldapFormatter.commentFormat = pntr.mPrefs.getComplexValue(
																			  autocompleteDirectory + ".description",
																			  Components.interfaces.nsISupportsString).data;
	                break;
	
	            case 2:
	                // override ldap-specific autocomplete entry?
	                //
	                try {
	                    ldapFormatter.commentFormat = 
	                        pntr.mPrefs.getComplexValue(autocompleteDirectory + 
														".autoComplete.commentFormat",
														Components.interfaces.nsISupportsString).data;
	                } catch (innerException) {
	                    // if nothing has been specified, use the ldap
	                    // organization field
	                    ldapFormatter.commentFormat = "[o]";
	                }
	                break;
	
	            case 0:
	            default:
	                // do nothing
	            }
	        } catch (ex) {
	            // if something went wrong while setting up comments, try and
	            // proceed anyway
	        }
	
	        // set the session's formatter, which also happens to
	        // force a call to the formatter's getAttributes() method
	        // -- which is why this needs to happen after we've set the
	        // various formats
	        //
	        LDAPSession.formatter = ldapFormatter;
	
	        // override autocomplete entry formatting?
	        //
	        try {
	            LDAPSession.outputFormat = 
	                pntr.mPrefs.getComplexValue(autocompleteDirectory + 
												".autoComplete.outputFormat",
												Components.interfaces.nsISupportsString).data;
	
	        } catch (ex) {
	            // if this pref isn't there, no big deal.  just let
	            // nsLDAPAutoCompleteSession use its default.
	        }
	
	        // override default search filter template?
	        //
	        try { 
	            LDAPSession.filterTemplate = pntr.mPrefs.getComplexValue(
																		 autocompleteDirectory + ".autoComplete.filterTemplate",
																		 Components.interfaces.nsISupportsString).data;
	
	        } catch (ex) {
	            // if this pref isn't there, no big deal.  just let
	            // nsLDAPAutoCompleteSession use its default
	        }
	
	        // override default maxHits (currently 100)
	        //
	        try { 
	            // XXXdmose should really use .autocomplete.maxHits,
	            // but there's no UI for that yet
	            // 
	            LDAPSession.maxHits = 
	                pntr.mPrefs.getIntPref(autocompleteDirectory + ".maxHits");
	        } catch (ex) {
	            // if this pref isn't there, or is out of range, no big deal. 
	            // just let nsLDAPAutoCompleteSession use its default.
	        }
	
	        if (!pntr.mSessionAdded) {
	            // if we make it here, we know that session initialization has
	            // succeeded; add the session for all recipients, and 
	            // remember that we've done so
	            var autoCompleteWidget;
	            for (i=1; i <= pntr.mMaxAttendees; i++)
					{
						autoCompleteWidget = pntr.getInputElement(i);
						if (autoCompleteWidget)
							{
								autoCompleteWidget.addSession(LDAPSession);
								// ldap searches don't insert a default entry with the default domain appended to it
								// so reduce the minimum results for a popup to 2 in this case. 
								autoCompleteWidget.minResultsForPopup = 2;
	
							}
					}
	            pntr.mSessionAdded = true;
	        }
	    }
	} else {
		if (pntr.mCurrentAutocompleteDirectory) {
			// Remove observer on the directory server since we are not doing Ldap
			// autocompletion.
			pntr.removeDirectorySettingsObserver(pntr.mCurrentAutocompleteDirectory);
			pntr.mCurrentAutocompleteDirectory = null;
		}
		if (pntr.mLDAPSession && pntr.mSessionAdded) {
			for (i=1; i <= pntr.mMaxAttendees; i++) 
				pntr.getInputElement(i).removeSession(pntr.mLDAPSession);
			pntr.mSessionAdded = false;
		}
	}
	pntr.mLDAPSession = LDAPSession;
}
