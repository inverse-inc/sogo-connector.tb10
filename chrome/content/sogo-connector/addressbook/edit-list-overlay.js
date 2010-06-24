/* edit-list-overlay.js - This file is part of "SOGo Connector", a Thunderbird extension.
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
    var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                           .getService(Components.interfaces.mozIJSSubScriptLoader);
    for (var i = 0; i < files.length; i++) {
        try {
            loader.loadSubScript(files[i], target);
        }
        catch(e) {
            dump("abNewCardDialog.groupdav.overlay.js: failed to include '" + files[i] + "'\n" + e + "\n");
        }
    }
}

jsInclude(["chrome://sogo-connector/content/addressbook/folder-handling.js",
           "chrome://sogo-connector/content/general/sync.addressbook.groupdav.js",
           "chrome://sogo-connector/content/general/preference.service.addressbook.groupdav.js"]);

var autocompleteWidgetPrefix = "addressCol1";

function OnLoadEditListOverlay() {
    this.SCOldMailListOKButton = this.MailListOKButton;
    this.MailListOKButton = this.SCMailListOKButton;
    this.SCOldEditListOKButton = this.EditListOKButton;
    this.EditListOKButton = this.SCEditListOKButton;

    // 	if (window.arguments && window.arguments[0]) {
    // 		var card = window.arguments[0].abCard;
    // 		dump("card: " + card + "\n");
    // 		var list = card.QueryInterface(Components.interfaces.nsIAbDirectory);
    // 		dump("list: " + list + "\n");
    // 	}
}

function _getLastMailingList(uri) {
    var last = null;

    var directory = SCGetDirectoryFromURI(uri);
    var nodes = directory.childNodes;
    while (nodes.hasMoreElements())
        last = nodes.getNext();

    return last;
}

function SCMailListOKButton() {
    var rc = this.SCOldMailListOKButton();
    if (rc) {
        var popup = document.getElementById('abPopup');
        var uri = popup.getAttribute('value');
        if (isGroupdavDirectory(uri))
            window.opener.SCSynchronizeFromChildWindow(uri);
    }

    return rc;
}

function SCEditListOKButton() {
    var rc = this.SCOldEditListOKButton();

    if (rc) {
        var listURI = window.arguments[0].listURI;
        var parentURI = GetParentDirectoryFromMailingListURI(listURI);

        if (isGroupdavDirectory(parentURI)) {
            var w = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                              .getService(Components.interfaces.nsIWindowMediator)
                              .getMostRecentWindow("mail:addressbook");

            if (!w)
                var w = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                  .getService(Components.interfaces.nsIWindowMediator)
                                  .getMostRecentWindow("mail:3pane");

            var list = SCGetDirectoryFromURI(listURI);
            var attributes = new GroupDAVListAttributes(list);
            attributes.version = "-1";
            w.SCSynchronizeFromChildWindow(parentURI);
        }
    }

    return rc;
}

window.addEventListener("load", OnLoadEditListOverlay, false);
