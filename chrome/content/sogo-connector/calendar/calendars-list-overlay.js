/* calendars-list-overlay.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

// window.gCalendarBundle = {
//     getString: function(a) {
//         return a;
//     }
// };

let SCEnableDelete = false;
let SCEnableNewItems = true;

function SCCalendarsListOverlayOnLoad() {
    // gCalendarBundle = document.getElementById("SCCalendarStringBundle");

    calendarController.SCOldCalendarControllerIsCommandEnabled
        = calendarController.isCommandEnabled;
    calendarController.isCommandEnabled
        = window.SCCalendarControllerIsCommandEnabled;

    window.SCOldOnSelectionChanged = calendarController.onSelectionChanged;
    calendarController.onSelectionChanged = window.SCOnSelectionChanged;

    let tree = document.getElementById("calendar-list-tree-widget");
    window.SCOldOnCalendarSelect = tree.onSelect;
    tree.onSelect = window.SCOnCalendarSelect;

    unifinderTreeView.SCOldSetSelectedItems
        = unifinderTreeView.setSelectedItems;
    unifinderTreeView.setSelectedItems = window.SCuTVSetSelectedItems;

    let taskTreeView = document.getElementById("calendar-task-tree");
    taskTreeView.SCOldOnTaskTreeViewSelect = taskTreeView.onselect;
    taskTreeView.onselect = window.SCOnTaskTreeViewSelect;

    let aclObserver = new SCCalDAVACLObserver(this);
    let observerService = Components.classes["@mozilla.org/observer-service;1"]
                                    .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(aclObserver, "caldav-acl-loaded", false);

    SCComputeEnableNewItems();
}

function SCCalendarControllerIsCommandEnabled(command) {
    let result;
    if (command == "calendar_delete_event_command"
        || command == "calendar_delete_todo_command"
        || command == "button_delete"
        || command == "cmd_delete") {
        result = (SCEnableDelete
                  && this.SCOldCalendarControllerIsCommandEnabled(command));
    }
    else if (command == "calendar_new_event_command"
             || command == "calendar_new_todo_command") {
        result = (SCEnableNewItems
                  && this.SCOldCalendarControllerIsCommandEnabled(command));
    }
    else
        result = this.SCOldCalendarControllerIsCommandEnabled(command);

    return result;
};

function SCComputeEnableDelete(selectedItems) {
    let firstState = SCEnableDelete;
    SCEnableDelete = (selectedItems.length > 0);

    let aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
                           .getService(Components.interfaces.nsISupports)
                           .wrappedJSObject;

    for (let i = 0; i < selectedItems.length; i++) {
        let calendar = selectedItems[i].calendar;
        if (calendar.type == "caldav") {
            let calEntry = aclMgr.calendarEntry(calendar.uri);
            SCEnableDelete = (calEntry.isCalendarReady()
                              && calEntry.userCanDeleteComponents());
        }
    }

    if (SCEnableDelete != firstState) {
        goUpdateCommand("calendar_delete_event_command");
        goUpdateCommand("calendar_delete_todo_command");
        goUpdateCommand("button_delete");
        goUpdateCommand("cmd_delete");
    }
}

function SCComputeEnableNewItems() {
    let oldValue = SCEnableNewItems;

    SCEnableNewItems = false;
    let cal = getSelectedCalendar();
    if (cal) {
        if (cal.type == "caldav") {
            //         dump("cal: " + cal.name + "\n");
            if (cal.readOnly)
                SCEnableNewItems = false;
            else {
                let aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
                                       .getService(Components.interfaces.nsISupports)
                                       .wrappedJSObject;
                let calEntry = aclMgr.calendarEntry(cal.uri);
                SCEnableNewItems = (calEntry.isCalendarReady()
                                    && calEntry.userCanAddComponents());
            }
        } else {
            SCEnableNewItems = !cal.readOnly;
        }
    }

    //     dump("enable new items: " + SCEnableNewItems + "\n");
    //     dump("  url: " + cal.uri.spec + "\n");
    if (SCEnableNewItems != oldValue) {
        //         dump("updating new commands\n");
        goUpdateCommand("calendar_new_event_command");
        goUpdateCommand("calendar_new_todo_command");
    }
}

function SCOnSelectionChanged(event) {
    SCComputeEnableDelete(event.detail);
    window.SCOldOnSelectionChanged(event);
}

function SCOnCalendarSelect(event) {
    //     dump("onselectionchanged\n");
    SCComputeEnableNewItems();
    window.SCOldOnCalendarSelect(event);
}

function SCuTVSetSelectedItems(items) {
    items = items || currentView().getSelectedItems({});
    SCComputeEnableDelete(items);
    this.SCOldSetSelectedItems(items);
    document.commandDispatcher.updateCommands("calendar_commands");
}

function SCOnTaskTreeViewSelect(event) {
    SCComputeEnableDelete(this.selectedTasks);
    return (this.SCOldOnTaskTreeViewSelect
            ? this.SCOldOnTaskTreeViewSelect(event)
            : false);
}

function SCCalDAVACLObserver(parent) {
    this.parent = parent;
}

SCCalDAVACLObserver.prototype = {
    parent: null,

    observe: function(aSubject, aTopic, aData) {
        if (aTopic == "caldav-acl-loaded") {
            let tree = document.getElementById("calendar-list-tree-widget");
            if (tree) {
                let calendar = getSelectedCalendar();

                if (calendar.uri.spec == aData) {
                    parent.SCOnCalendarSelect({detail:[]});
                }
            }
        }
    },
    QueryInterface: function(aIID) {
        if (!aIID.equals(Components.interfaces.nsIObserver)
            && !aIID.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
};

window.addEventListener("load", SCCalendarsListOverlayOnLoad, false);
