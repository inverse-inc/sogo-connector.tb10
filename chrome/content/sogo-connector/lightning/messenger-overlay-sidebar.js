window.addEventListener("load", SIOnMessengerOverlaySidebarLoad, false);

var SCMessengerOverlayData = {
    initInterval: -1,
    identitiesInterval: -1,
    openArguments: null,
    componentEntry: null,
    thunderbirdOrganizers: null,
    writabilityControlled: false,
    calendarIsWritable: false
};

function SCIdentitiesCallback(identityData) {
    var ready = true;

    for (var i = 0; i < identityData.length; i++) {
        if (!identityData[i].done) {
            var entry = identityData[i].entry;
            if (entry.isCalendarReady()) {
                if (entry.ownerIdentities.length)
                    identityData[i].calendar
                        .setProperty("imip.identity",
                                     entry.ownerIdentities[0]);
                identityData[i].done = true;
            }
            else
                ready = false;
        }
    }

    if (ready) {
        clearInterval(SCMessengerOverlayData.identitiesInterval);
//         dump("interval cleared");
    }
}

function SIOnMessengerOverlaySidebarLoad() {
    var aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
        .getService(Components.interfaces.nsISupports)
        .wrappedJSObject;
    var calMgr = getCalendarManager();
    var calendars = calMgr.getCalendars({});

    var identityData = [];
    for (var i = 0; i < calendars.length; i++) {
        if (calendars[i].type == "caldav") {
            var entry = aclMgr.calendarEntry(calendars[i].uri);
            identityData.push({ calendar: calendars[i],
                                entry: entry });
        }
        // Components.interfaces.nsIMsgIdentity
    }
    if (identityData.length)
        SCMessengerOverlayData.identitiesInterval
            = setInterval(SCIdentitiesCallback, 200, identityData);

    window.SCOldIsCalendarWritable = window.isCalendarWritable;
    window.isCalendarWritable = window.SCIsCalendarWritable;

    window.SCOldOpenEventDialog = window.openEventDialog;
    window.openEventDialog = window.SCOpenEventDialog;

//     window.SCOldCheckAndSendItipMessage = window.checkAndSendItipMessage;
//     window.checkAndSendItipMessage = window.SCCheckAndSendItipMessage;
}

function SCItipSentByManager() {
}

SCItipSentByManager.prototype = {
    itemEntry: null,

    _prepareItemEntry: function _prepareItemEntry(oldCalendar, item) {
        var mgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
            .getService(Components.interfaces.nsISupports)
            .wrappedJSObject;
        var calendar = oldCalendar.wrappedJSObject;
        var itemURL = null;
        if (item.id) {
            var cache = calendar.mItemInfoCache;
            if (!cache)
                cache = calendar.mUncachedCalendar.wrappedJSObject.mItemInfoCache;
            if (cache) {
                itemURL = cache[item.id].locationPath;
//                 dump("itemURL: " + itemURL + "\n");
            }
            else
                dump("no cache found\n");
        }
        this.itemEntry = mgr.componentEntry(calendar.uri, itemURL);
    },

    _userIsOwner: function userIsOwner(calendar) {
        var mgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
            .getService(Components.interfaces.nsISupports)
            .wrappedJSObject;
        var entry = mgr.calendarEntry(calendar.uri);
        return entry.userIsOwner();
    },

    _userIsOrganizer: function userIsOrganizer(item) {
        var isOrganizer = false;

        var i = 0;
        var userAddresses = this.itemEntry.parentCalendarEntry.ownerAddresses;
        var organizerID = item.organizer.id.toLowerCase();
        while (!isOrganizer && i < userAddresses.length)
            if (userAddresses[i].toLowerCase() == organizerID)
                isOrganizer = true;
            else
                i++;

        return isOrganizer;
    },

    _userIdentity: function _userIdentity(calendar) {
        var mgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
            .getService(Components.interfaces.nsISupports)
            .wrappedJSObject;
        var entry = mgr.calendarEntry(calendar.uri);

        return entry.userAddresses[0];
    },

    _proxyUserEntry: function _proxyUserEntry(calendar, userEntry) {
        var realIdentity = this._userIdentity(calendar);
        var newEntry = userEntry;
        if (!newEntry) {
            newEntry = Components.classes["@mozilla.org/calendar/attendee;1"]
                .createInstance(Components.interfaces.calIAttendee);
            newEntry.id = calendar.getProperty("organizerId");
            newEntry.commonName = calendar.getProperty("organizerCN");
        }
        newEntry.setProperty("SENT-BY", realIdentity);

        return newEntry;
    },

    preparedItipItem: function _preparedItipItem(item) {
        var calendar = item.calendar;
        var newItem = item;
        if (calendar.type == "caldav") {
            this._prepareItemEntry(calendar, item);
            if (!this._userIsOwner(calendar)) {
                var attendees = item.getAttendees({});
                if (attendees.length) {
                    newItem = item.clone();
                    newItem.setProperty("X-MOZ-SEND-INVITATIONS", "TRUE");
                    var schedulingCal = calendar.QueryInterface(Components.interfaces.calISchedulingSupport);
                    var attendee = schedulingCal.getInvitedAttendee(newItem);
                    var proxyEntry = this._proxyUserEntry(calendar, attendee);
                    if (attendee) {
//                         dump("is attendee\n");
                        newItem.removeAllAttendees();
                        newItem.addAttendee(proxyEntry);
                    }
                    else if (this._userIsOrganizer(newItem)) {
//                         dump("is organizer\n");
                        proxyEntry.isOrganizer = true;
                        newItem.organizer = proxyEntry;
                    }
                }
            }
        }

        return newItem;
    },
};

function SCCheckAndSendItipMessage(aItem, aOpType, aOriginalItem) {
    dump("SCCheckAndSentItipMessage\n");
    var mgr = new SCItipSentByManager();
    var newItem = mgr.preparedItipItem(aItem);
    window.SCOldCheckAndSendItipMessage(newItem, aOpType, aOriginalItem);
}

function SCOpenEventReadyCallback() {
    var ready = SCMessengerOverlayData.componentEntry.isComponentReady();
//     dump("ready: " + ready + "\n");
    if (ready) {
        clearInterval(SCMessengerOverlayData.initInterval);
//  if droit de lecture, réponse ou modification
//      si pas droit de modif, alors read-only
        var entry  = SCMessengerOverlayData.componentEntry;
        SCMessengerOverlayData.writabilityControlled = true;
//         dump("user is owner: " + entry.userIsOwner() + "; modif: "
//              + entry.userCanModify() + "\n");
        SCMessengerOverlayData.calendarIsWritable = (entry.userIsOwner()
                                                     || entry.userCanModify());
        SCOldOpenEventDialog.apply(window,
                                   SCMessengerOverlayData.openArguments);
        SCMessengerOverlayData.writabilityControlled = false;
//         else message d'erreur "denied"
    }
}

// FIXME: handle offline mode
function SCOpenEventDialog(calendarItem, calendar, mode, callback, job) {
//     dump("callback: " + callback + "\n");
    if (calendar && calendar.type == "caldav") {
        calendar = calendar.wrappedJSObject;
        var mgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
            .getService(Components.interfaces.nsISupports)
            .wrappedJSObject;

        var componentURL = null;
        if (calendarItem.id) {
            var cache = calendar.mItemInfoCache;
            if (!cache)
                cache = calendar.mUncachedCalendar.wrappedJSObject.mItemInfoCache;
            if (cache) {
                componentURL = cache[calendarItem.id].locationPath;
//                 dump("componentURL: " + componentURL + "\n");
            }
            else
                dump("no cache found\n");
        }

        SCMessengerOverlayData.openArguments = arguments;
        SCMessengerOverlayData.componentEntry = mgr.componentEntry(calendar.uri, componentURL);
        SCMessengerOverlayData.initInterval = setInterval(SCOpenEventReadyCallback, 200);
    }
    else
        SCOldOpenEventDialog(calendarItem, calendar, mode, callback, job);
}

function SCIsCalendarWritable(calendar) {
    var rc = ((SCMessengerOverlayData.writabilityControlled)
              ? SCMessengerOverlayData.calendarIsWritable
              : true);

//     dump("is writable: " + rc + "\n");
    return (rc && window.SCOldIsCalendarWritable(calendar));
}
