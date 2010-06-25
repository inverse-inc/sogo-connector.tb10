/* preferences.addressbook.groupdav.js - This file is part of "SOGo Connector", a Thunderbird extension.
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
            dump("preferences.addressbook.groupdav.js: failed to include '" + files[i] + "'\n" + e + "\n");
        }
    }
}

jsInclude(["chrome://sogo-connector/content/addressbook/folder-handling.js",
           "chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js",
           "chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js"]);

// let fromPreferences = false;

function onAccept() {
    let prefMsgBundle = document.getElementById("preferencesMsgId");

    //There has to be at least a description to create a SOGO addressbook
    let description = document.getElementById("description").value;
    if (!description || description == "") {
        alert(prefMsgBundle.getString("missingDescriptionMsg"));
        return false;
    }

    let url = document.getElementById("groupdavURL").value;
    if (!url || url == "") {
        alert(prefMsgBundle.getString("missingDescriptionURL"));
        return false;
    }

    let readOnly = document.getElementById("readOnly").checked;
    if (readOnly)
        onAcceptCardDAV();
    else
        onAcceptWebDAV();

    return true;
}

function onAcceptCardDAV() {
    let url = document.getElementById("groupdavURL").value;
    let description = document.getElementById("description").value;

    let directoryURI = SCGetCurrentDirectoryURI();
    if (directoryURI) {
        let directory = SCGetDirectoryFromURI(directoryURI);
        if (directory && directory.dirPrefId.length > 0) {
            directory.dirName = description;


            // let rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
            //                     .getService(Components.interfaces.nsIRDFService);
            // let parentDir = rdf.GetResource("moz-abdirectory://")
            //                    .QueryInterface(Components.interfaces.nsIAbDirectory);
            // parentDir.modifyDirectory(directory, properties);
        }
        else
            throw("invalid CardDAV directory: " + uri + "\n");
    }
    else
        SCCreateCardDAVDirectory(description, url);
}

function onAcceptWebDAV() {
    let prefId;

    let description = document.getElementById("description").value;
    let uri = SCGetCurrentDirectoryURI();
    if (uri) {
        let directory = SCGetDirectoryFromURI(uri);
        if (directory && directory.dirPrefId.length > 0) {
            directory.dirName = description;
            prefId = directory.dirPrefId;
        }
        else
            throw("invalid WebDAV directory: " + uri + "\n");
    }
    else {
        // adding a new Addressbook
        let abMgr = Components.classes["@mozilla.org/abmanager;1"]
                              .getService(Components.interfaces.nsIAbManager);
        prefId = abMgr.newAddressBook(description, null,
                                      2 /* don't know which values should go in
                                         there but 2 seems to get the job
                                         done */);
    }

    let groupdavPrefService = new GroupdavPreferenceService(prefId);
    groupdavPrefService.setURL(document.getElementById("groupdavURL").value);
}

function SCGetCurrentDirectoryURI() {
    let uri;

    if (window.arguments && window.arguments[0])
        uri = window.arguments[0];
    else
        uri = null;

    return uri;
}

function onLoad() {
    // TODO	add download now for cardDAV, the tab is currently hidden

    let uri = SCGetCurrentDirectoryURI();
    if (uri) {
        let directory = SCGetDirectoryFromURI(uri);
        if (directory) {
            let readOnly = (uri.indexOf("moz-abdavdirectory://") == 0);
            let roElem = document.getElementById("readOnly");
            roElem.setAttribute("checked", readOnly);
            roElem.disabled = true;

            let description = "";
            let url = "";

            if (readOnly) {
                description = directory.dirName;
                let cardDavPrefix = "carddav://";
                let dUrl = directory.URI;
                if (dUrl.indexOf(cardDavPrefix) == 0)
                    url = dUrl.substr(cardDavPrefix.length);
            }
            else {
                let groupdavPrefService = new GroupdavPreferenceService(directory.dirPrefId);
                description = directory.dirName;
                url = groupdavPrefService.getURL();
            }
            document.getElementById("description").value = description;
            document.getElementById("groupdavURL").value = url;
        }
        else
            throw("invalid WebDAV directory: " + uri + "\n");
    }
}

//TODO:catch the directory delete and delete preferences

function onCancel() {
    window.close();
}
