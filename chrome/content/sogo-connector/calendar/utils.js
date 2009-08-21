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

function SCModifyEventWithDialogObserver(aItem, job, aPromptOccurrence) {
    this.arguments = { itemArg: aItem,
                       jobArg: job,
                       promptArg: aPromptOccurrence };
}

SCModifyEventWithDialogObserver.prototype = {
    onLoad: function(aCalendar) {
        aCalendar.removeObserver(this);
        var thisObserver = this;
        var getItemListener = {
            onGetResult: function (aCalendar, aStatus, aItemType,
                                   aDetail, aCount, aItems) {
                var parentItem = aItems[0];
                var rID = thisObserver.arguments.itemArg.recurrenceId;
                var item;
                if (rID) {
                    item = parentItem.recurrenceInfo.getOccurrenceFor(rID);
                } else {
                    item = parentItem;
                }
                SCOldModifyEventWithDialog(item,
                                           thisObserver.arguments.jobArg,
                                           thisObserver.arguments.prompArg);
            },
            onOperationComplete: function (aCalendar, aStatus,
                                           aOperationType, aId, aDetail) {
            }
        };
        aCalendar.getItem(thisObserver.arguments.itemArg.id, getItemListener);
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

function SCModifyEventWithDialog(aItem, job, aPrompt) {
    var calendar = aItem.calendar;
    if (calendar.type == "caldav") {
        var refreshObserver = new SCModifyEventWithDialogObserver(aItem,
                                                                  job,
                                                                  aPrompt);
        calendar.addObserver(refreshObserver);
        calendar.refresh();
    } else {
        window.SCOldModifyEventWithDialog.apply(window, arguments);
    }
}

window.SCOldModifyEventWithDialog = window.modifyEventWithDialog;
window.modifyEventWithDialog = window.SCModifyEventWithDialog;
