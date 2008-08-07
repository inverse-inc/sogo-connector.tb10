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

// function SCIdentitiesCallback(identityData) {
//     var ready = true;

//     for (var i = 0; i < identityData.length; i++) {
//         if (!identityData[i].done) {
//             var entry = identityData[i].entry;
//             if (entry.isCalendarReady()) {
//                 SCProcessIdentityData(entry, identityData[i].calendar);
//                 identityData[i].done = true;
//             }
//             else
//                 ready = false;
//         }
//     }

//     if (ready)
//         clearInterval(SCMessengerOverlayData.identitiesInterval);
// }

// function SCProcessIdentityData(aclEntry, calendar) {
//     dump("new identity: " + aclEntry.ownerAddresses[0].email + "\n");
// }

function SIOnMessengerOverlaySidebarLoad() {
    var aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
        .getService(Components.interfaces.nsISupports)
        .wrappedJSObject;
    var calMgr = getCalendarManager();
    var calendars = calMgr.getCalendars({});

//     var identityData = [];
//     for (var i = 0; i < calendars.length; i++) {
//         if (calendars[i].type == "caldav") {
//             var entry = aclMgr.calendarEntry(calendars[i].uri);
//             identityData.push({ calendar: calendars[i],
//                                 entry: entry});
//         }
// // Components.interfaces.nsIMsgIdentity
//     }
//     SCMessengerOverlayData.identitiesInterval
//         = setInterval(SCIdentitiesCallback, 200, identityData);

    window.SCOldIsCalendarWritable = window.isCalendarWritable;
    window.isCalendarWritable = window.SCIsCalendarWritable;

    window.SCOldOpenEventDialog = window.openEventDialog;
    window.openEventDialog = window.SCOpenEventDialog;
}

function SCOpenEventReadyCallback() {
    var ready = SCMessengerOverlayData.componentEntry.isComponentReady();
    dump("ready: " + ready + "\n");
    if (ready) {
        clearInterval(SCMessengerOverlayData.initInterval);
//  if droit de lecture, réponse ou modification
//      si pas droit de modif, alors read-only
        var entry  = SCMessengerOverlayData.componentEntry;
        SCMessengerOverlayData.writabilityControlled = true;
        dump("user is owner: " + entry.userIsOwner() + "; modif: "
             + entry.userCanModify() + "\n");
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
    if (calendar.type == "caldav") {
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
                dump("componentURL: " + componentURL + "\n");
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

    dump("is writable: " + rc + "\n");
    return (rc && window.SCOldIsCalendarWritable(calendar));
}
