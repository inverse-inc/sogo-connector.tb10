/* messengercompose-overlay.js - This file is part of "SOGo Connector", a Thunderbird extension.
 *
 * Copyright: Inverse inc., 2006-2010
 *    Author: Robert Bolduc, Wolfgang Sourdeau
 *     Email: support@inverse.ca
 *       URL: http://inverse.ca
 *
 * "SOGo Connector" is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 as published by
 * the Free Software Foundation;
 *
 * "SOGo Connector" is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * "SOGo Connector"; if not, write to the Free Software Foundation, Inc., 51
 * Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 */

let SISetupLdapAutoCompleteSessionOld;

/*
 * This overlay adds cardDAV functionalities to autoCompletion
 */

function autoCompleteDirectoryIsCardDav() {
    let prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefBranch);
    let autocompleteDirectory = prefService.getCharPref("ldap_2.autoComplete.directoryServer");
    let uri = null;
    if (autocompleteDirectory && autocompleteDirectory.length) {
        try {
            dump("autocompleteDirectory: " + autocompleteDirectory + "\n");
            uri = prefService.getCharPref(autocompleteDirectory +".uri");
        }
        catch(e) {
        }
    }

    dump("autocomplete URI: " + uri + "\n");

    return (uri && uri.indexOf("carddav") == 0);
}

function setupCardDavAutoCompleteSession() {
    let autocompleteDirectory;
    // 	let prevAutocompleteDirectory = gCurrentAutocompleteDirectory;

    let prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefBranch);
    let autocompleteLdap = prefService.getBoolPref("ldap_2.autoComplete.useDirectory");
    if (autocompleteLdap) {
        autocompleteDirectory
            = prefService.getCharPref("ldap_2.autoComplete.directoryServer");
    }
    else
        autocompleteDirectory = null;

    // 	if (gCurrentIdentity.overrideGlobalPref)
    // 		autocompleteDirectory = gCurrentIdentity.directoryServer;

    // use a temporary to do the setup so that we don't overwrite the
    // global, then have some problem and throw an exception, and leave the
    // global with a partially setup session.	we'll assign the temp
    // into the global after we're done setting up the session
    //
    let cardDAVSession;
    if (gLDAPSession)
        cardDAVSession = gLDAPSession;
    else
        cardDAVSession = Components.classes["@mozilla.org/autocompleteSession;1?type=carddav"]
                                   .createInstance(Components.interfaces.nsIAutoCompleteSession);

    if (!autocompleteWidgetPrefix)
        throw("no autocomplete widget prefix defined");

    if (autocompleteDirectory && !gIsOffline) {
        gCurrentAutocompleteDirectory = autocompleteDirectory;

        // fill in the session params if there is a session
        if (cardDAVSession) {
            if (!gSessionAdded) {
                // if we make it here, we know that session initialization has
                // succeeded; add the session for all recipients, and
                // remember that we've done so
                let showComment = false;
                let prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                            .getService(Components.interfaces.nsIPrefBranch);
                try {
                    let attribute = prefService.getCharPref("sogo-connector.autoComplete.commentAttribute");
                    if (attribute && attribute.length > 0)
                        showComment = true;
                }
                catch(e) {
                }

                for (let i = 1; i <= awGetMaxRecipients(); i++) {
                    let autoCompleteWidget
                        = document.getElementById(autocompleteWidgetPrefix + "#" + i);
                    if (autoCompleteWidget) {
                        autoCompleteWidget.addSession(cardDAVSession);
                        autoCompleteWidget.showCommentColumn = showComment;

                        // ldap searches don't insert a default entry with the default domain appended to it
                        // so reduce the minimum results for a popup to 2 in this case.
                        // 						autoCompleteWidget.minResultsForPopup = 2;
                    }
                }
                gSessionAdded = true;
            }
        }
    }
    else {
        if (gCurrentAutocompleteDirectory) {
            // Remove observer on the directory server since we are not doing Ldap autocompletion
            //  .RemoveDirectorySettingsObserver(gCurrentAutocompleteDirectory);
            gCurrentAutocompleteDirectory = null;
        }
        if (gLDAPSession && gSessionAdded) {
            for (let i = 1; i <= awGetMaxRecipients(); i++) {
                let autoCompleteWidget
                    = document.getElementById(autocompleteWidgetPrefix + "#" + i);
                autoCompleteWidget.removeSession(gLDAPSession);
            }
            gSessionAdded = false;
        }
    }

    if (autocompleteDirectory) {
        // 			dump("******** autocompleteDirectory: " + autocompleteDirectory + "\n");
        // 			dump(gPrefs.getCharPref(autocompleteDirectory +".uri"));
        // 			dump("\n");
        let uri = "" + gPrefs.getCharPref(autocompleteDirectory +".uri");
        let serverURL = Components.classes["@mozilla.org/network/standard-url;1"]
                                  .createInstance(Components.interfaces.nsIURL);
        serverURL.spec = uri.replace(/^carddav/, "http");
        // 		dump("uri: " + uri + "\n");
        // 			dump("serverURL.spec: " + serverURL.spec +"\n");
        cardDAVSession.QueryInterface(Components.interfaces.nsICardDAVAutoCompleteSession)
                      .serverURL = serverURL;
    }
    else
        dump("no autocomplete directory\n");

    gLDAPSession = cardDAVSession;
    gSetupLdapAutocomplete = true;
}

function SCSetupLdapAutoCompleteSession() {
    dump("override called\n");
    if (autoCompleteDirectoryIsCardDav())
        setupCardDavAutoCompleteSession();
    else
        SISetupLdapAutoCompleteSessionOld();
}

// See the ComposeLoad() function in Thunderbird 2.0. It warns
// you about the showComment kungfu.
function SCComposeLoad() {
    try {
        let prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                    .getService(Components.interfaces.nsIPrefBranch);
        let attribute = prefService.getCharPref("sogo-connector.autoComplete.commentAttribute");
        if (attribute && attribute.length > 0)
            document.getElementById('addressCol2#1').showCommentColumn = true;
    }
    catch(e) {
    }

    ComposeLoad();
}

function SCOnAutoCompleteLoadListener() {
    dump("coucou autocomplete\n");
    SCComposeLoad();
    // SCSetupLdapAutoCompleteSessionOld = setupLdapAutocompleteSession;
    // setupLdapAutocompleteSession = SCSetupLdapAutoCompleteSession;
}

window.addEventListener("load", SCOnAutoCompleteLoadListener, false);
