/* lightning-calendar-properties-overlay.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

onLoad = function ltn_onLoad() {
    gCalendar = window.arguments[0].calendar;

    if (gCalendar.type == "caldav") {
        var aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"].getService().wrappedJSObject;
        var calAclEntry = aclMgr.calendarEntry(gCalendar.uri);
        var i = 0;

        var menuPopup = document.getElementById("email-identity-menupopup");

        while (calAclEntry.ownerIdentities != null && i < calAclEntry.ownerIdentities.length) {
            addMenuItem(menuPopup, calAclEntry.ownerIdentities[i].identityName, calAclEntry.ownerIdentities[i].key);
            i++;
        }

        // This should never happend as the CalDAV server should always return us the proper
        // owner's identity - but, we never know.
        if (i == 0) {
            addMenuItem(menuPopup, ltnGetString("lightning", "imipNoIdentity"), "none");
        }

        var menuList = document.getElementById("email-identity-menulist");
        menuList.selectedIndex = 0;

    } else {
        ltnInitMailIdentitiesRow();
    }
    common_onLoad();
};
