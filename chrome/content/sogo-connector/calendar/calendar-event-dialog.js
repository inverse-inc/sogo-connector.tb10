var initInterval = -1;
var componentEntry = null;
var component = null;

var thunderbirdOrganizers = null;

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
                componentURL = cache[component.id].locationPath;
                dump("componentURL: " + componentURL + "\n");
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
    var organizers = document.getElementById("event-grid-item-organizer");
    organizers.addEventListener("command",
                                SCUpdateExistingOrganizer,
                                false);
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

function userIsOrganizer(delegated) {
    var isOrganizer = false;

    var i = 0;
    var userAddresses = (delegated
                         ? componentEntry.parentCalendarEntry.ownerAddresses
                         : componentEntry.parentCalendarEntry.userAddresses);
    var organizerID = component.organizer.id.toLowerCase();
    while (!isOrganizer && i < userAddresses.length)
        if (userAddresses[i].toLowerCase() == organizerID)
            isOrganizer = true;
        else
            i++;

    return isOrganizer;
}

function SCMakeWidgetsReadOnly() {
    var menuBar = document.getElementById("event-menubar");
    menuBar.setAttribute("collapsed", "true");
    var eventGrid = document.getElementById("event-grid");
    _makeChildNodesReadOnly(eventGrid);

    this.SCOldShowAttendeePopup = this.showAttendeePopup;
    this.showAttendeePopup = SCShowAttendeePopup;
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
    var attendees = document.getElementById("event-grid-attendee-row");
    var row = document.getElementById("event-grid-inverse-organizer-row");
    if (row.parentNode == attendees) {
        attendees.removeChild(row);
        attendees.parentNode.insertBefore(row, attendees);
    }

    var organizers = document.getElementById("event-grid-item-organizer");
    SCUpdateOrganizers(organizers);

    var fixedLabel = document.getElementById("event-grid-fixedConfidentialLabel");
    var nodes = document
        .getElementById("button-privacy")
        .getElementsByTagName("menuitem");
    nodes[1].label = fixedLabel.value;
}

function SCLoadOrganizers() {
    if (!thunderbirdOrganizers) {
        thunderbirdOrganizers = [];

        var composeService = Components.classes["@mozilla.org/messengercompose;1"]
            .getService(Components.interfaces.nsIMsgComposeService);

        var manager = Components
            .classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);
        for (var i = 0; i < manager.allIdentities.Count(); i++) {
            var currentIdentity = manager.allIdentities.GetElementAt(i)
                .QueryInterface(Components.interfaces.nsIMsgIdentity);
            var server = manager
                .GetServersForIdentity(currentIdentity).GetElementAt(0)
                .QueryInterface(Components.interfaces.nsIMsgIncomingServer);
            if (server.realUsername) {
                var email = server.realUsername;
                var name = currentIdentity.fullName;
                if (server.realUsername.indexOf("@") < 0) {
                    var domain = currentIdentity.email.split("@")[1];
                    if (domain)
                        email += "@" + domain;
                }
                if (email && email.indexOf("@") > -1) {
                    if (!name)
                        name = email.split("@")[0];
                    var currentOrganizer = { name: name, email: email };
                    if (composeService.defaultIdentity == currentIdentity)
                        currentOrganizer["default"] = true;
                    thunderbirdOrganizers.push(currentOrganizer);
                    //                                         dump("tbird organizer: " + currentOrganizer.name
                    //                                                          + " <" + currentOrganizer.email + "\n");
                }
            }
        }
    }

    //         dump("tbird org: " + thunderbirdOrganizers.length + "\n");

    return thunderbirdOrganizers;
}

function SCLoadAclOrganizers() {
    var organizers = [];

    var identities = componentEntry.parentCalendarEntry.ownerIdentities;
    for (var i = 0; i < identities.length; i++) {
        var email = identities[i].email;
        var name = identities[i].fullName;
        if (email && email.indexOf("@") > -1) {
            if (!(name && name.length))
                name = email.split("@")[0];
            var currentOrganizer = { name: name, email: email };
            if (i == 0)
                currentOrganizer["default"] = true;
            organizers.push(currentOrganizer);
        }
    }

    return organizers;
}

function SCFillOrganizers() {
    //         dump("fill organizers\n");
    // add organizers to the organizer menulist
    var organizerList = document.getElementById("event-grid-item-organizer");
    for (var i = organizerList.childNodes.length - 1; i > -1; i--)
        organizerList.removeChild(organizerList.childNodes[i]);
    var organizers = ((componentEntry
                       && componentEntry.parentCalendarEntry.hasAccessControl)
                      ? SCLoadAclOrganizers()
                      : SCLoadOrganizers());
    var selectIndex = 0;
    for (var i = 0; i < organizers.length; i++) {
        var organizer = organizers[i];
        var name = organizer["name"] + " <" + organizer["email"] + ">";
        var menuitem = organizerList.appendItem(name, i);
        menuitem.organizer = organizer;
        if (organizer["default"])
            selectIndex = i;
    }
    organizerList.selectedIndex = selectIndex;
}

function SCUpdateOrganizers(organizers) {
    var existingOrganizer = document
        .getElementById("event-grid-item-existing-organizer");
    var organizer = component.organizer;

    var organizerMenu = false;
    if (organizer) {
        if (componentEntry.parentCalendarEntry.hasAccessControl
            && componentEntry.userIsOwner()
            && !eventHasAttendees())
            organizerMenu = true;
        else {
            var email = organizer.id.split(":")[1];
            var fullname = organizer.commonName;
            if (!fullname)
                fullname = email.split("@")[0];
            var organizerName = fullname + " <" + email + ">";
            existingOrganizer.setAttribute('value', organizerName);
            existingOrganizer.setAttribute("collapsed", "false");
            window.organizer = organizer;
        }
    }
    else
        organizerMenu = (!componentEntry
                         || !componentEntry.parentCalendarEntry.hasAccessControl
                         || componentEntry.userIsOwner());

    //         dump("menu: " + organizerMenu + "\n");
    var organizerRow
        = document.getElementById("event-grid-inverse-organizer-row");
    if (organizerMenu) {
        organizerRow.setAttribute("collapsed", "false");
        existingOrganizer.setAttribute("collapsed", "true");
        SCFillOrganizers();
        SCUpdateExistingOrganizer();
    }
    else
        organizerRow.setAttribute("collapsed", "true");
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
    else {
        var organizers = document.getElementById("event-grid-item-organizer");
        SCUpdateOrganizers(organizers);
    }
}

function SCUpdateExistingOrganizer(event) {
    var organizerItem = document.getElementById("event-grid-item-organizer");
    var menuItem = organizerItem.selectedItem;
    var organizer = Components.classes["@mozilla.org/calendar/attendee;1"]
        .createInstance(Components.interfaces.calIAttendee);
    organizer.commonName = menuItem.organizer["name"];
    organizer.id = "MAILTO:" + menuItem.organizer["email"];
    organizer.isOrganizer = true;
    organizer.role = "REQ-PARTICIPANT";
    organizer.participationStatus = "ACCEPTED";

    if (window.organizer && window.attendees) {
        for (var i = 0; i < window.attendees.length; i++) {
            var attendee = window.attendees[i];
            if (attendee.id.toLowerCase() == window.organizer.id.toLowerCase()) {
                var newAttendee = window.organizer.clone();
                newAttendee.isOrganizer = false;
                window.attendees.splice(i, 1, newAttendee);
            }
        }
    }

    window.organizer = organizer;
}

function SCShowAttendeePopup(event) {
    SCOldShowAttendeePopup(event);
    var popup = document.getElementById("attendee-popup");
    _makeChildNodesReadOnly(popup);
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

        var result = [];
        for (var i = 0; i < calendars.length; i++) {
            var isIncluded = true;
            if (calendars[i].type == "caldav") {
                //                                 dump("{ ");
                var entry = aclMgr.calendarEntry(calendars[i].uri);
                isIncluded = (entry.userCanAddComponents()
                              || (!isNew && window.arguments[0].calendar
                                  == calendars[i]));
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
