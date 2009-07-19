/* -*- Mode: java; indent-tabs-mode: nil; c-basic-offset: 4 -*- */

function isCalendarWritable(aCalendar) {	
    // INVERSE - BEGIN
    if (aCalendar.type == "caldav") {
        var aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
                     .getService(Components.interfaces.nsISupports)
                     .wrappedJSObject;
        var entry = aclMgr.calendarEntry(aCalendar.uri);
        if (entry.isCalendarReady()) {
            return (!aCalendar.getProperty("disabled") &&
                    !aCalendar.readOnly &&
                    (entry.userIsOwner() || entry.userCanAddComponents()) &&
                    (!getIOService().offline ||
                     aCalendar.getProperty("requiresNetwork") === false));
        }
    }
    // INVERSE- END

    return (!aCalendar.getProperty("disabled") &&
            !aCalendar.readOnly &&
            (!getIOService().offline ||
             aCalendar.getProperty("requiresNetwork") === false));
}

function SCOpenDialogRefreshObserver(dialogArguments) {
    this.dialogArguments = dialogArguments;
}

SCOpenDialogRefreshObserver.prototype = {
    onLoad: function(aCalendar) {
        aCalendar.removeObserver(this);
        window.SCOldOpenDialog.apply(window, this.dialogArguments);        
    },

    onStartBatch: function() {},
    onEndBatch: function() {},
    onAddItem: function(aItem) {},
    onModifyItem: function(aNewItem, aOldItem) {},
    onDeleteItem: function(aDeletedItem) {},
    onError: function(aCalendar, aErrNo, aMessage) {},
    onPropertyChanged: function(aCalendar, aName, aValue, aOldValue) {},
    onPropertyDeleting: function(aCalendar, aName) {}
};

function SCOpenDialog(url, name, parameters, args) {
    var proceed = true;
    
    if (url == "chrome://calendar/content/calendar-summary-dialog.xul") {
        var calendar = args.calendar;
        if (calendar
            && isCalendarWritable(calendar)
            && calendar.type == "caldav") {
            var refreshObserver = new SCOpenDialogRefreshObserver(arguments);
            calendar.addObserver(refreshObserver);
            calendar.refresh();
            proceed = false;
        }
    }

    if (proceed) {
        window.SCOldOpenDialog.apply(window, arguments);
    }
}

window.SCOldOpenDialog = window.openDialog;
window.openDialog = window.SCOpenDialog;
