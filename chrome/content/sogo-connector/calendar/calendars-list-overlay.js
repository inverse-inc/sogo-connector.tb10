/* -*- Mode: javascript; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 4 -*- */

window.gCalendarBundle = {
    getString: function(a) {
        return a;
    }
};

var SCEnableDelete = false;
var SCEnableNewItems = true;

function SCCalendarsListOverlayOnLoad() {
    gCalendarBundle = document.getElementById("SCCalendarStringBundle");

    calendarController.SCOldCalendarControllerIsCommandEnabled
        = calendarController.isCommandEnabled;
    calendarController.isCommandEnabled
        = window.SCCalendarControllerIsCommandEnabled;

    window.SCOldOnSelectionChanged = calendarController.onSelectionChanged;
    calendarController.onSelectionChanged = window.SCOnSelectionChanged;

    window.SCOldOnCalendarSelect = calendarListTreeView.onSelect;
    calendarListTreeView.onSelect = window.SCOnCalendarSelect;

    unifinderTreeView.SCOldSetSelectedItems
        = unifinderTreeView.setSelectedItems;
    unifinderTreeView.setSelectedItems = window.SCuTVSetSelectedItems;

    var taskTreeView = document.getElementById("calendar-task-tree");
    taskTreeView.SCOldOnTaskTreeViewSelect = taskTreeView.onselect;
    taskTreeView.onselect = window.SCOnTaskTreeViewSelect;

    var aclObserver = new SCCalDAVACLObserver(this);
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(aclObserver, "caldav-acl-loaded", false);

    SCComputeEnableNewItems();
}

function SCCalendarControllerIsCommandEnabled(command) {
    var result;
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
    var firstState = SCEnableDelete;
    SCEnableDelete = (selectedItems.length > 0);

    var aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
        .getService(Components.interfaces.nsISupports)
        .wrappedJSObject;

    for (var i = 0; i < selectedItems.length; i++) {
        var calendar = selectedItems[i].calendar;
        if (calendar.type == "caldav") {
            var calEntry = aclMgr.calendarEntry(calendar.uri);
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
    var oldValue = SCEnableNewItems;

    var cal = getSelectedCalendar();
    if (cal && cal.type == "caldav") {
//         dump("cal: " + cal.name + "\n");
        if (cal.readOnly)
            SCEnableNewItems = false;
        else {
            var aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
                         .getService(Components.interfaces.nsISupports)
                         .wrappedJSObject;
            var calEntry = aclMgr.calendarEntry(cal.uri);
            SCEnableNewItems = (calEntry.isCalendarReady()
                                && calEntry.userCanAddComponents());
        }
    }
    else
        SCEnableNewItems = !cal.readOnly;

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
            var tree = parent.document.getElementById("calendar-list-tree-widget");
            if (tree) {
                var index = tree.currentIndex;
                var calendar = parent.calendarListTreeView.getCalendar(index);
	
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
}

    window.addEventListener("load", SCCalendarsListOverlayOnLoad, false);
