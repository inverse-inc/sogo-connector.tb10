/* utils.js - This file is part of "SOGo Connector", a Thunderbird extension.
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
