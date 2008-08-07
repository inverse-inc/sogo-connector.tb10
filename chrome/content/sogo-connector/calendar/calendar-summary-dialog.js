window.addEventListener("load", SCOnCalendarSummaryDialogOverlay, false);

var SCCalendarSummaryData = {
    initialPartStat: null,
    calendarItem: null
};

function SCOnCalendarSummaryDialogOverlay() {
    var args = window.arguments[0];
    if (!window.readOnly && window.attendee
        && !args.calendar.canNotify("REPLY", args.calendarEvent)) {
        SCCalendarSummaryData.calendarItem = args.calendarEvent;
        SCCalendarSummaryData.initialPartStat
            = window.attendee.participationStatus;
        window.SCOldOnCalendarSummaryDialogAccept = window.onAccept;
        window.onAccept = window.SCOnCalendarSummaryDialogAccept;
    }
}

function SCOnCalendarSummaryDialogAccept() {
    var rc;

    if (window.attendee.participationStatus
        != SCCalendarSummaryData.initialPartStat)
        rc = _imipUpdateStatus(window.attendee.participationStatus);
    else
        rc = window.SCOldOnCalendarSummaryDialogAccept();

    return rc;
}

function _imipUpdateStatus(type) {
    var component = SCCalendarSummaryData.calendarItem.clone();
//     var attendee = getUserAsAttendee(!componentEntry.userIsOwner());
//     attendee.setProperty("PARTSTAT", type);
//     window.calendarItem = component;

    var calendar = window.arguments[0].calendar;
    var imipItem = Components.classes["@mozilla.org/calendar/itip-item;1"]
        .createInstance(Components.interfaces.calIItipItem);
    imipItem.init(component.icalString);
    imipItem.setAttendeeStatus(window.attendee.id, type);
    imipItem.receivedMethod = "REQUEST";
    imipItem.responseMethod = "REPLY";
    imipItem.isSend = true;
    imipItem.targetCalendar = calendar;
    imipItem.autoResponse = Components.interfaces.calIItipItem.USER;

    var thisWindow = window;
    var emptyListener = {
    onOperationComplete: function(calendar, status, oType, id, detail) {
        },
    onGetResult: function(calendar, status, iType, detail, count, items) {
        }
    };

    var itipProc = Components.classes["@mozilla.org/calendar/itip-processor;1"]
        .createInstance(Components.interfaces.calIItipProcessor);
    itipProc.processItipItem(imipItem, emptyListener);

    return true;
}
