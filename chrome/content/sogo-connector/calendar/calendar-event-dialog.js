/* calendar-event-dialog.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

let initInterval = -1;
let componentEntry = null;
let component = null;

function SCReadyCallback() {
    let ready = componentEntry.isComponentReady();
    //         dump("ready: " + ready + "\n");
    if (ready) {
        clearInterval(initInterval);
        SCUpdateCustomFields();
    }
}

function SCOnLoadHandler(event) {
    // let fbhandler = Components.classes["@inverse.ca/calendar/fburl-freebusy-provider;1"]
    //     .getService().wrappedJSObject;
    // fbhandler.register();

    let calendar = window.arguments[0].calendar.wrappedJSObject;
    component = window.arguments[0].calendarEvent;

    if (calendar.type == "caldav") {
        let mgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
                            .getService(Components.interfaces.nsISupports)
                            .wrappedJSObject;

        let componentURL = null;
        if (component.id) {
            let cache = calendar.mItemInfoCache;
            if (!cache)
                cache = calendar.mUncachedCalendar.wrappedJSObject.mItemInfoCache;
            if (cache) {
                if (cache[component.id]) {
                    componentURL = cache[component.id].locationPath;
                    //                     dump("componentURL: " + componentURL + "\n");
                }
            }
            else
                dump("no cache found\n");
        }

        componentEntry = mgr.componentEntry(calendar.uri, componentURL);
        initInterval = setInterval(SCReadyCallback, 200);
    }
    else {
        SCUpdateCustomFields();
    }

    if (!window.arguments[0].calendarEvent.id) {
        let calendarList = document.getElementById("item-calendar");
        calendarList.addEventListener("command",
                                      SCOnChangeCalendar,
                                      false);
    }
}

function eventHasAttendees() {
    let attendees = component.getAttendees({});

    return (attendees.length > 0);
}

function getWindowAttendeeById(attendeeID) {
    let attendee = null;

    let i = 0;
    while (!attendee && i < window.attendees.length)
        if (window.attendees[i].id.toLowerCase() == attendeeID)
            attendee = window.attendees[i];
    else
        i++;

    return attendee;
}

function getUserAsAttendee(delegated) {
    let attendee = null;

    let i = 0;
    let userAddresses = (delegated
                         ? componentEntry.parentCalendarEntry.ownerAddresses
                         : componentEntry.parentCalendarEntry.userAddresses);
    while (!attendee && i < userAddresses.length) {
        //                 dump("test address: " + userAddresses[i] + "\n");
        let curAttendee = getWindowAttendeeById(userAddresses[i].toLowerCase());
        if (curAttendee)
            attendee = curAttendee;
        else
            i++;
    }

    if (attendee) {
        //                 dump("delegated: " + delegated + "\n");
        //                 dump("attendee.id: " + attendee.id + "\n");
    }

    return attendee;
}

function userIsAttendee(delegated) {
    return (getUserAsAttendee(delegated) != null);
}

function _makeChildNodesReadOnly(node) {
    if (node.nodeType
        == Components.interfaces.nsIDOMNode.ELEMENT_NODE) {
        if (node.localName == "textbox"
            || node.localName == "menulist"
            || node.localName == "menuitem"
            || node.localName == "datetimepicker"
            || node.localName == "checkbox")
            node.setAttribute("disabled", "true");
        else {
            //                         dump("node: " + node.localName + "\n");
            for (let i = 0; i < node.childNodes.length; i++)
                _makeChildNodesReadOnly(node.childNodes[i]);
        }
    }
}

function SCUpdateCustomFields() {
    let fixedLabel = document.getElementById("event-grid-fixedConfidentialLabel");
    let nodes = document.getElementById("button-privacy")
                        .getElementsByTagName("menuitem");
    nodes[1].label = fixedLabel.value;
}

function SCOnChangeCalendar(event) {
    let calendarList = document.getElementById("item-calendar");
    let calendar = calendarList.selectedItem.calendar;

    componentEntry = null;
    //         dump("calendar: " + calendar + "\n");
    //         dump("calendar.name: " + calendar.name + "\n");
    if (calendar.type == "caldav") {
        let mgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
                            .getService(Components.interfaces.nsISupports)
                            .wrappedJSObject;
        componentEntry = mgr.componentEntry(calendar.uri, null);
        initInterval = setInterval(SCReadyCallback, 200);
    }
}

function SCGetCalendarManager() {
    let mgr = new SCCalendarManager();

    return mgr;
}

this.SCOldGetCalendarManager = getCalendarManager;
this.getCalendarManager = this.SCGetCalendarManager;

function SCCalendarManager() {
    this.realMgr = window.SCOldGetCalendarManager();
}

SCCalendarManager.prototype = {
    realMgr: null,
    getCalendars: function SCGetCalendars(arg) {
        let calendars = this.realMgr.getCalendars(arg);
        let aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
                               .getService(Components.interfaces.nsISupports)
                               .wrappedJSObject;

        let isNew = !(window.arguments[0].calendarEvent.id);

        //         dump("this url: " + window.arguments[0].calendar.uri.spec + "\n");

        let result = [];
        for (let i = 0; i < calendars.length; i++) {
            let isIncluded = true;
            if (calendars[i].type == "caldav") {
                //                                 dump("{ ");
                //                 dump("current url: " + calendars[i].uri.spec + "\n");
                let entry = aclMgr.calendarEntry(calendars[i].uri);
                isIncluded = (entry.isCalendarReady() && (entry.userCanAddComponents()
                                                          || (!isNew && window.arguments[0].calendar
                                                              == calendars[i])));
                //                                 dump(calendars[i].name + ": " + isIncluded);
                //                                 if (entry.userPrivileges)
                //                                         dump("\n  privileges: " + entry.userPrivileges.join(", "));
                //                                 dump(" }\n");
            }

            //                         dump(calendars[i].name + ": " + isIncluded + "\n");
            if (isIncluded)
                result.push(calendars[i]);
        }

        return result;
    }
};

window.addEventListener("load", SCOnLoadHandler, false);
