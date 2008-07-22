/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

window.gCalendarBundle = {
 getString: function(a) {
		return a;
	}
};

var SCEnableDelete = false;

function SCCalendarsListOverlayOnLoad() {
	gCalendarBundle = document.getElementById("SCCalendarStringBundle");

	calendarController.SCOldCalendarControllerIsCommandEnabled
		= calendarController.isCommandEnabled;
	calendarController.isCommandEnabled
		= window.SCCalendarControllerIsCommandEnabled;

	window.SCOldOnSelectionChanged = calendarController.onSelectionChanged;
	calendarController.onSelectionChanged = window.SCOnSelectionChanged;

	unifinderTreeView.SCOldSetSelectedItems
		= unifinderTreeView.setSelectedItems;
	unifinderTreeView.setSelectedItems = window.SCuTVSetSelectedItems;

	var taskTreeView = document.getElementById("calendar-task-tree");
	taskTreeView.SCOldOnTaskTreeViewSelect = taskTreeView.onselect;
	taskTreeView.onselect = window.SCOnTaskTreeViewSelect;
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

function SCOnSelectionChanged(event) {
	SCComputeEnableDelete(event.detail);
	window.SCOldOnSelectionChanged(event);
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

window.addEventListener("load", SCCalendarsListOverlayOnLoad, false);
