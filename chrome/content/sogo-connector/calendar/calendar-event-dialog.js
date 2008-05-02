/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
	.getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sogo-connector/content/calendar/CalDAVAclManager.js");

var mgr = new CalDAVAclManager();
var initInterval = -1;
var componentEntry = null;
var component = null;

function SCReadyCallback() {
	var ready = componentEntry.isComponentReady();
	if (ready) {
		clearInterval(initInterval);
		SCUpdateToolbars();
		SCUpdateCustomFields();
	}
}

function SCOnLoadHandler(event) {
	var calendar = window.arguments[0].calendar;
	if (calendar.type == "caldav") {
		calendar = calendar.wrappedJSObject;
		component = window.arguments[0].calendarEvent;
		componentEntry = mgr.componentEntry(calendar.uri, component.id);
		initInterval = setInterval(SCReadyCallback, 100);
	}
}

function eventHasAttendees() {
	var attendees = component.getAttendees({});

	return (attendees.length > 0);
}

function getUserAsAttendee(delegated) {
	var attendee = null;

	var i = 0;
	var userAddresses = (delegated
											 ? componentEntry.parentCalendarEntry.ownerAddresses
											 : componentEntry.parentCalendarEntry.userAddresses);
	while (!attendee && i < userAddresses.length) {
		dump("test address: " + userAddresses[i] + "\n");
		var curAttendee = component.getAttendeeById(userAddresses[i]);
		if (curAttendee)
			attendee = curAttendee;
		else
			i++;
	}

	if (attendee) {
		dump("delegated: " + delegated + "\n");
		dump("attendee.id: " + attendee.id + "\n");
	}

	return attendee;
}

function userIsAttendee(delegated) {
	return (getUserAsAttendee(delegated) != null);
}

function userIsOrganizer(delegated) {
	var isOrganizer = false;

	var i = 0;
	var userAddresses = (delegated
											 ? componentEntry.parentCalendarEntry.ownerAddresses
											 : componentEntry.parentCalendarEntry.userAddresses);
	var organizerID = component.organizer.id.toLowerCase();
	while (!isOrganizer && i < userAddresses.length)
		if (userAddresses[i].toLowerCase() == organizerID)
			isOrganizer = true;
		else
			i++;

	return isOrganizer;
}

function SCUpdateToolbars() {
	var activeToolbar;
	if (componentEntry) {
		if (componentEntry.userIsOwner()) {
			if (eventHasAttendees()
					&& userIsAttendee()
					&& !userIsOrganizer()) {
				var attendee = getUserAsAttendee(false);
				if (attendee.rsvp) {
					activeToolbar = "event-attendee-toolbar";
					var status = attendee.icalProperty.getParameter("PARTSTAT");
					if (status == "ACCEPTED")
						document.getElementById("button-accept")
							.setAttribute("collapsed", "true");
					else if (status == "DECLINED")
						document.getElementById("button-decline")
							.setAttribute("collapsed", "true");
				}
				else
					activeToolbar = "event-close-toolbar";
			}
			else
				activeToolbar = "event-toolbar";
		}
		else {
			if (eventHasAttendees()) {
				if (userIsOrganizer)
					activeToolbar = "event-close-toolbar";
				else {
					if (userIsOrganizer(true)
							&& componentEntry.userCanModify())
						activeToolbar = "event-toolbar";
					else if (userIsAttendee(true)
									 && (componentEntry.userCanModify()
											 || componentEntry.userCanRespond())) {
						var attendee = getUserAsAttendee(true);
						if (attendee.rsvp) {
							activeToolbar = "event-attendee-toolbar";
							var status = attendee.icalProperty.getParameter("PARTSTAT");
							if (status == "ACCEPTED")
								document.getElementById("button-accept")
									.setAttribute("collapsed", "true");
							else if (status == "DECLINED")
								document.getElementById("button-decline")
									.setAttribute("collapsed", "true");
						}
						else
							activeToolbar = "event-close-toolbar";
					}
					else
						activeToolbar = "event-close-toolbar";
				}
			}
			else {
				if (componentEntry.userCanModify())
					activeToolbar = "event-toolbar";
				else
					activeToolbar = "event-close-toolbar";
			}
		}
	}
	else
		activeToolbar = "event-toolbar";

	if (activeToolbar != "event-close-toolbar") {
		var closeToolbar = document.getElementById("event-close-toolbar");
		closeToolbar.setAttribute("collapsed", "true");
		var newToolbar = document.getElementById(activeToolbar);
		newToolbar.setAttribute("collapsed", "false");
	}
}

function SCUpdateCustomFields() {
	var attendees = document.getElementById("attendee-row");
	var row = document.getElementById("inverse-organizer-row");
	var fixedLabel = document.getElementById("fixedConfidentialLabel");
	var organizers = document.getElementById("item-organizer");

	if (!attendees) {
		/* Lightning 0.8 */
		attendees = document.getElementById("event-grid-attendee-row");
		row = document.getElementById("event-grid-inverse-organizer-row");
		fixedLabel = document.getElementById("event-grid-fixedConfidentialLabel");
		organizers = document.getElementById("event-grid-item-organizer");
	}
	attendees.removeChild(row);
	attendees.parentNode.insertBefore(row, attendees);

	SCUpdateOrganizers(organizers);
	organizers.addEventListener("command",
															SCUpdateExistingOrganizer,
															false);

	var buttonPrivacy = document.getElementById("button-privacy");
	var nodes = buttonPrivacy.getElementsByTagName("menuitem");
	nodes[1].label = fixedLabel.value;
}

function SCLoadOrganizers() {
	var organizers = new Array();

	var composeService = Components.classes["@mozilla.org/messengercompose;1"]
		.getService(Components.interfaces.nsIMsgComposeService);

	var manager = Components
		.classes["@mozilla.org/messenger/account-manager;1"]
		.getService(Components.interfaces.nsIMsgAccountManager);
	for (var i = 0; i < manager.allIdentities.Count(); i++) {
		var currentIdentity = manager.allIdentities.GetElementAt(i)
			.QueryInterface(Components.interfaces.nsIMsgIdentity);
		var server = manager
			.GetServersForIdentity(currentIdentity).GetElementAt(0)
			.QueryInterface(Components.interfaces.nsIMsgIncomingServer);
		if (server.realUsername) {
			var email = server.realUsername;
			var name = currentIdentity.fullName;
			if (server.realUsername.indexOf("@") < 0) {
				var domain = currentIdentity.email.split("@")[1];
				if (domain)
					email += "@" + domain;
			}
			if (email && email.indexOf("@") > -1) {
				if (!name)
					name = email.split("@")[0];
				var currentOrganizer = { name: name, email: email };
				if (composeService.defaultIdentity == currentIdentity)
					currentOrganizer["default"] = true;
				organizers.push(currentOrganizer);
			}
		}
	}

	return organizers;
}

function SCFillOrganizers() {
	// add organizers to the organizer menulist
	var organizerList = document.getElementById("item-organizer");
	if (!organizerList) /* Lightning 0.8 */
		organizerList = document.getElementById("event-grid-item-organizer");
	var organizers = SCLoadOrganizers();
	var selectIndex = 0;
	for (var i = 0; i < organizers.length; i++) {
		var organizer = organizers[i];
		var name = organizer["name"] + " <" + organizer["email"] + ">";
		var menuitem = organizerList.appendItem(name, i);
		menuitem.organizer = organizer;
		if (organizer["default"])
			selectIndex = i;
	}
	organizerList.selectedIndex = selectIndex;
}

function SCUpdateOrganizers(organizers) {
	var existingOrganizer
		= document.getElementById("item-existing-organizer");
	if (!existingOrganizer) /* Lightning 0.8 */
		existingOrganizer = document
			.getElementById("event-grid-item-existing-organizer");
	var organizer = window.calendarItem.organizer;
	if (organizer) {
		organizers.parentNode.removeChild(organizers);
		var email = organizer.id.split(":")[1];
		var fullname = organizer.commonName;
		if (!fullname)
			fullname = email.split("@")[0];
		var organizerName = fullname + " <" + email + ">";
		existingOrganizer.setAttribute('value', organizerName);
		window.organizer = organizer;
	}
	else {
		existingOrganizer.parentNode.removeChild(existingOrganizer);
		SCFillOrganizers();
		SCUpdateExistingOrganizer();
	}
}

function SCUpdateExistingOrganizer(event) {
	var organizerItem = document.getElementById("item-organizer");
	if (!organizerItem) /* Lightning 0.8 */
		organizerItem = document.getElementById("event-grid-item-organizer")
			var menuItem = organizerItem.selectedItem;
	var organizer = Components.classes["@mozilla.org/calendar/attendee;1"]
		.createInstance(Components.interfaces.calIAttendee);
	organizer.commonName = menuItem.organizer["name"];
	organizer.id = "MAILTO:" + menuItem.organizer["email"];
	organizer.isOrganizer = true;
	organizer.role = "REQ-PARTICIPANT";
	organizer.participationStatus = "ACCEPTED";

	if (window.organizer && window.attendees) {
		for (var i = 0; i < window.attendees.length; i++) {
			var attendee = window.attendees[i];
			if (attendee.id.toLowerCase() == window.organizer.id.toLowerCase()) {
				var newAttendee = window.organizer.clone();
				newAttendee.isOrganizer = false;
				window.attendees.splice(i, 1, newAttendee);
			}
		}
	}

	window.organizer = organizer;
}

function _imipUpdateStatus(type) {
	var oldItem = component;
	component = oldItem.clone();
	var attendee = getUserAsAttendee(!componentEntry.userIsOwner());
	attendee.setProperty("PARTSTAT", type);

	var saveListener = {
	onOperationComplete: function(calendar, status, oType, id, detail) {
			window.onCommandCancel = function() { return true; };
			var dialog = document.getElementById("sun-calendar-event-dialog");
			dialog.cancelDialog();
		}
	};
	var calendar = window.arguments[0].calendar;
	calendar.modifyItem(component, oldItem, saveListener);

	var imipItemBase = component.clone();
	imipItemBase.removeAllAttendees();
	imipItemBase.addAttendee(attendee);
	imipItemBase.setProperty("METHOD", "REQUEST");
	var imipItem = Components.classes["@mozilla.org/calendar/itip-item;1"]
		.createInstance(Components.interfaces.calIItipItem);
	imipItem.init(imipItemBase.icalString);
	dump("string:\n" + imipItemBase.icalString + "\n\n\n");
	imipItem.receivedMethod = "REQUEST";
	imipItem.responseMethod = "REPLY";
	imipItem.isSend = true;
	imipItem.targetCalendar = calendar;
	imipItem.autoResponse = Components.interfaces.calIItipItem.USER;

	var emptyListener = {
	onOperationComplete: function(calendar, status, oType, id, detail) {
		},
	onGetResult: function(calendar, status, iType, detail, count, items) {
		}
	};

	var itipProc = Components.classes["@mozilla.org/calendar/itip-processor;1"]
		.createInstance(Components.interfaces.calIItipProcessor);
	itipProc.processItipItem(imipItem, emptyListener);

// 	window.saveItem = function() { return component; };
// 	var dialog = document.getElementById("sun-calendar-event-dialog");
// 	dialog.acceptDialog();
}

function SCAcceptEvent() {
	_imipUpdateStatus("ACCEPTED");
}

function SCDeclineEvent() {
	_imipUpdateStatus("DECLINED");
}

function SCCloseEvent() {
	window.onCommandCancel = function() { return true; };
	var dialog = document.getElementById("sun-calendar-event-dialog");
	dialog.cancelDialog();
}

window.addEventListener("load", SCOnLoadHandler, false);
