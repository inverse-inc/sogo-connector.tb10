var initInterval = -1;
var componentEntry = null;
var component = null;

function SCReadyCallback() {
    var ready = componentEntry.isComponentReady();
    //         dump("ready: " + ready + "\n");
    if (ready) {
        clearInterval(initInterval);
        SCUpdateCustomFields();
    }
}

function SCOnLoadHandler(event) {
    var fbhandler = Components.classes["@inverse.ca/calendar/fburl-freebusy-provider;1"]
        .getService().wrappedJSObject;
    fbhandler.register();

    var calendar = window.arguments[0].calendar.wrappedJSObject;
    component = window.arguments[0].calendarEvent;

    if (calendar.type == "caldav") {
        var mgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
            .getService(Components.interfaces.nsISupports)
            .wrappedJSObject;

        var componentURL = null;
        if (component.id) {
            var cache = calendar.mItemInfoCache;
            if (!cache)
                cache = calendar.mUncachedCalendar.wrappedJSObject.mItemInfoCache;
            if (cache) {
                if (cache[component.id]) {
                    componentURL = cache[component.id].locationPath;
                    dump("componentURL: " + componentURL + "\n");
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
        var calendarList = document.getElementById("item-calendar");
        calendarList.addEventListener("command",
                                      SCOnChangeCalendar,
                                      false);
    }
}

function eventHasAttendees() {
    var attendees = component.getAttendees({});

    return (attendees.length > 0);
}

function getWindowAttendeeById(attendeeID) {
    var attendee = null;

    var i = 0;
    while (!attendee && i < window.attendees.length)
        if (window.attendees[i].id.toLowerCase() == attendeeID)
            attendee = window.attendees[i];
        else
            i++;

    return attendee;
}

function getUserAsAttendee(delegated) {
    var attendee = null;

    var i = 0;
    var userAddresses = (delegated
                         ? componentEntry.parentCalendarEntry.ownerAddresses
                         : componentEntry.parentCalendarEntry.userAddresses);
    while (!attendee && i < userAddresses.length) {
        //                 dump("test address: " + userAddresses[i] + "\n");
        var curAttendee = getWindowAttendeeById(userAddresses[i].toLowerCase());
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
            for (var i = 0; i < node.childNodes.length; i++)
                _makeChildNodesReadOnly(node.childNodes[i]);
        }
    }
}

function SCUpdateCustomFields() {
    var fixedLabel = document.getElementById("event-grid-fixedConfidentialLabel");
    var nodes = document
        .getElementById("button-privacy")
        .getElementsByTagName("menuitem");
    nodes[1].label = fixedLabel.value;
}

function SCOnChangeCalendar(event) {
    var calendarList = document.getElementById("item-calendar");
    var calendar = calendarList.selectedItem.calendar;

    componentEntry = null;
    //         dump("calendar: " + calendar + "\n");
    //         dump("calendar.name: " + calendar.name + "\n");
    if (calendar.type == "caldav") {
        var mgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
            .getService(Components.interfaces.nsISupports)
            .wrappedJSObject;
        componentEntry = mgr.componentEntry(calendar.uri, null);
        initInterval = setInterval(SCReadyCallback, 200);
    }
}

function SCGetCalendarManager() {
    var mgr = new SCCalendarManager();

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
        var calendars = this.realMgr.getCalendars(arg);
        var aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
        .getService(Components.interfaces.nsISupports)
        .wrappedJSObject;

        var isNew = !(window.arguments[0].calendarEvent.id);

//         dump("this url: " + window.arguments[0].calendar.uri.spec + "\n");

        var result = [];
        for (var i = 0; i < calendars.length; i++) {
            var isIncluded = true;
            if (calendars[i].type == "caldav") {
                //                                 dump("{ ");
//                 dump("current url: " + calendars[i].uri.spec + "\n");
                var entry = aclMgr.calendarEntry(calendars[i].uri);
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
