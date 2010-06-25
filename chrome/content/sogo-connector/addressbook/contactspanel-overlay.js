/* contactspanel-overlay.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

CURRENTLY DISABLED

function SCAbPanelLoad(event) {
    dump("SCAbPanelLoad pre\n");
    this.SCAbPanelLoadOld();
    // dump("SCAbPanelLoad 1\n");
    // let addrbookSession = Components.classes["@mozilla.org/addressbook/services/session;1"]
    //                                 .getService(Components.interfaces.nsIAddrBookSession);

    // dump("SCAbPanelLoad 2\n");
    // addrbookSession.removeAddressBookListener(gAddressBookPanelAbListener);

    // gAddressBookPanelAbListener.onItemAdded = SCListenerOnItemAdded;
    // gAddressBookPanelAbListener.onItemRemoved = SCListenerOnItemRemoved;
    // dump("SCAbPanelLoad 3\n");

    // addrbookSession
    //     .addAddressBookListener(gAddressBookPanelAbListener,
    //                             Components.interfaces.nsIAddrBookSession.added
    //                             | Components.interfaces.nsIAddrBookSession.directoryRemoved
    //                             | Components.interfaces.nsIAddrBookSession.changed);

    // dump("SCAbPanelLoad 4\n");
    // let menupopup = document.getElementById("addressbookList-menupopup");
    // menupopup.removeAttribute("datasources");
    // menupopup.removeAttribute("menugenerated");
    // dump("SCAbPanelLoad 5\n");

    // let menu = document.getElementById("addressbookList");
    // dump("SCAbPanelLoad 6\n");
    // let selectedURL = null;
    // dump("SCAbPanelLoad 7\n");
    // if (menu.selectedItem)
    //     selectedURL = menu.selectedItem.id;
    // dump("SCAbPanelLoad 8\n");

    // _SCUpdateMenuPopup(menupopup, selectedURL);
    // dump("SCAbPanelLoad end\n");
}

function _SCUpdateMenuPopup(menupopup, selectedURL, refreshResults) {
    dump("UpdateMenuPopup\n");
    // let menu = document.getElementById("addressbookList");
    // let abManager = Components.classes["@mozilla.org/abmanager;1"]
    //                           .getService(Components.interfaces.nsIAbManager);
    // let nodes = abManager.directories;
    // while (nodes.hasMoreElements()) {
    //     let ab = nodes.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
    //     let value = ab.URI;
    //     let label = ab.dirName;
    //     if (!selectedURL)
    //         selectedURL = value;

    //     let entry = document.createElement("menuitem");
    //     entry.id = value;
    //     entry.setAttribute("value", value);
    //     entry.setAttribute("label", label);
    //     menupopup.appendChild(entry);

    //     if (selectedURL == value) {
    //         menu.selectedItem = entry;
    //         menu.value = value;
    //     }
    // }

    // if (refreshResults)
    //     AddressBookMenuListChange();
}

function _SCClearMenuPopup(menupopup) {
    // for (let i = menupopup.childNodes.length - 1; i > -1; i--)
    //     menupopup.removeChild(menupopup.childNodes[i]);
}

function SCListenerOnItemAdded(parentDir, item) {
    // let menupopup = document.getElementById("addressbookList-menupopup");
    // let menu = document.getElementById("addressbookList");
    // let selectedURL = null;
    // if (menu.selectedItem)
    //     selectedURL = menu.selectedItem.id;
    // _SCClearMenuPopup(menupopup);
    // window.setTimeout(_SCUpdateMenuPopup, 100, menupopup, selectedURL);
}

function SOGoGetPersonalAddressBookURL() {
    return kPersonalAddressbookURI;
}

function SCListenerOnItemRemoved(parentDir, item) {
    // let directory = item.QueryInterface(Components.interfaces.nsIRDFResource);
    // let menu = document.getElementById("addressbookList");
    // let selectedURL = null;
    // if (directory.Value == menu.selectedItem.id) {
    //     selectedURL = SOGoGetPersonalAddressBookURL();
    // }
    // else {
    //     if (menu.selectedItem)
    //         selectedURL = menu.selectedItem.id;
    // }
    // let shouldRefreshResults = (menu.selectedItem.id != selectedURL);
    // let menupopup = document.getElementById("addressbookList-menupopup");
    // _SCClearMenuPopup(menupopup);
    // window.setTimeout(_SCUpdateMenuPopup, 100, menupopup, selectedURL, true);
}

this.SCAbPanelLoadOld = this.AbPanelLoad;
this.AbPanelLoad = this.SCAbPanelLoad;
