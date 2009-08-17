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

function SCOpenDialogRefreshObserver(url, name, parameters, args) {
    this.arguments = { url: url,
                       name: name,
                       parameters: parameters,
                       args: args };
}

SCOpenDialogRefreshObserver.prototype = {
    onLoad: function(aCalendar) {
        aCalendar.removeObserver(this);
        var thisObserver = this;
        var event = this.arguments.args.calendarEvent;
        if (event) {
            var getItemListener = {
                onGetResult: function (aCalendar, aStatus, aItemType,
                                       aDetail, aCount, aItems) {
                    thisObserver.arguments.args.calendarEvent = aItems[0];
                    SCOldOpenDialog(thisObserver.arguments.url,
                                    thisObserver.arguments.name,
                                    thisObserver.arguments.parameters,
                                    thisObserver.arguments.args);
                },
                onOperationComplete: function (aCalendar, aStatus,
                                               aOperationType, aId, aDetail) {
                }
            };
            aCalendar.getItem(event.id, getItemListener);
        } else {
            SCOldOpenDialog(this.arguments.url,
                            this.arguments.name,
                            this.arguments.parameters,
                            this.arguments.args);
        }
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
    if (args
        && (args.mode && args.mode != "new")
        && isCalendarWritable(args.calendar)
        && args.calendar.type == "caldav") {
        var refreshObserver = new SCOpenDialogRefreshObserver(url, name,
                                                              parameters,
                                                              args);
        var calendar = args.calendar;
        calendar.addObserver(refreshObserver);
        calendar.refresh();
    } else {
        window.SCOldOpenDialog.apply(window, arguments);
    }
}

window.SCOldOpenDialog = window.openDialog;
window.openDialog = window.SCOpenDialog;
