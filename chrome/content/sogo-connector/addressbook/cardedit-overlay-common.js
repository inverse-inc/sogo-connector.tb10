/* cardedit-overlay-common.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

function jsInclude(files, target) {
    let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                           .getService(Components.interfaces.mozIJSSubScriptLoader);
    for (let i = 0; i < files.length; i++) {
        try {
            loader.loadSubScript(files[i], target);
        }
        catch(e) {
            dump("abCommonCardDialog.groupdav.overlay.js: failed to include '" + files[i] + "'\n" + e + "\n");
        }
    }
}

jsInclude(["chrome://sogo-connector/content/general/sync.addressbook.groupdav.js",
           "chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js"]);

/**********************************************************************************************
 *
 * This overlay marks the card as edited and tries to update the GroupDAV server if connected
 *
 **********************************************************************************************/

let documentDirty = false;

// This is necessary to allow the listener of webdavPutString  and the upload Observer to remain in scope
// since the dialog is closed before the listener can do its job.
let messengerWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                .getService(Components.interfaces.nsIWindowMediator)
                                .getMostRecentWindow("mail:3pane");

let abWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                         .getService(Components.interfaces.nsIWindowMediator)
                         .getMostRecentWindow("mail:addressbook");

function getUri() {
    let uri;

    if (document.getElementById("abPopup")) {
        uri = document.getElementById("abPopup").value;
    }
    else if (window.arguments[0].abURI) {
        uri = window.arguments[0].abURI;
    }
    else
        uri = window.arguments[0].selectedAB;

    return uri;
}

function setDocumentDirty(boolValue) {
    documentDirty = boolValue;
}

function saveCard(isNewCard) {
    try {
        let parentURI = getUri();
        let uriParts = parentURI.split("/");
        parentURI = uriParts[0] + "//" + uriParts[2];

        if (documentDirty
            && isGroupdavDirectory(parentURI)) {
            gEditCard.card.setProperty("groupDavVersion", "-1");

            let abManager = Components.classes["@mozilla.org/abmanager;1"]
                                      .getService(Components.interfaces.nsIAbManager);
            let ab = abManager.getDirectory(parentURI);
            ab.modifyCard(gEditCard.card);

            // We make sure we try the messenger window and if it's closed, the address book
            // window. It might fail if both of them are closed and we still have a composition
            // window open and we try to modify the card from there (from the contacts sidebar)
            if (messengerWindow)
                messengerWindow.SCSynchronizeFromChildWindow(parentURI);
            else
                abWindow.SCSynchronizeFromChildWindow(parentURI);

            setDocumentDirty(false);
        }
    }
    catch(e) {
        messengerWindow.exceptionHandler(null, "saveCard", e);
    }
}

function inverseSetupFieldsEventHandlers() {
    let tabPanelElement = document.getElementById("abTabPanels");
    let menulists = tabPanelElement.getElementsByTagName("menulist");
    let i;
    for (i = 0; i < menulists.length; i++)
        menulists[i].addEventListener("mouseup", setDocumentDirty, true);

    let textboxes = tabPanelElement.getElementsByTagName("textbox");

    for (i = 0; i < textboxes.length; i++)
        textboxes[i].addEventListener("change", setDocumentDirty, true);
}

// function inverseInitEventHandlers() {
// // 	if (isGroupdavDirectory(getUri()))
// // 		RegisterSaveListener(setGroupDavFields);
// 	inverseSetupFieldsEventHandlers();
// }

function isLDAPDirectory(uri) {
    let ab = GetDirectoryFromURI(uri);

    return (ab.isRemote && !isCardDavDirectory(uri));
}

window.addEventListener("load", inverseSetupFieldsEventHandlers, false);

