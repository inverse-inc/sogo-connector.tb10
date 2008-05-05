/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

var initInterval = -1;
var componentEntry = null;
var component = null;

function SCReadyCallback() {
	var ready = componentEntry.isComponentReady();
	dump("ready: " + ready + "\n");
	if (ready) {
		clearInterval(initInterval);
		SCUpdateToolbars();
		SCUpdateCustomFields();
	}
}

function fixCloseButton() {
	var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
		.getService(Components.interfaces.nsIXULRuntime);
	if (appInfo.OS == "Darwin") {
		var closeBtn = document.getElementById("button-close");
		var closeCls = closeBtn.getAttribute("class");
		closeBtn.setAttribute("class", closeCls + " pinstripe");
	}
}

function SCOnLoadHandler(event) {
	fixCloseButton();

	var calendar = window.arguments[0].calendar;
	if (calendar.type == "caldav") {
		var mgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
			.getService(Components.interfaces.nsISupports)
			.wrappedJSObject;

		calendar = calendar.wrappedJSObject;
		component = window.arguments[0].calendarEvent;
		var componentURL = ((component.id)
												? calendar.mItemInfoCache[component.id].locationPath
												: null);
		componentEntry = mgr.componentEntry(calendar.uri, componentURL);
		initInterval = setInterval(SCReadyCallback, 200);
	}
}

function eventHasAttendees() {
	var attendees = component.getAttendees({});

	return (attendees.length > 0);
}

function getWindowAttendeeById(attendeeID) {
	var attendee = null;

	var i = 0;
	while (!attendee && i < window.attendees.length)
		if (window.attendees[i].id.toLowerCase() == attendeeID)
			attendee = window.attendees[i];
		else
			i++;

	return attendee;
}

function getUserAsAttendee(delegated) {
	var attendee = null;

	var i = 0;
	var userAddresses = (delegated
											 ? componentEntry.parentCalendarEntry.ownerAddresses
											 : componentEntry.parentCalendarEntry.userAddresses);
	while (!attendee && i < userAddresses.length) {
		dump("test address: " + userAddresses[i] + "\n");
		var curAttendee = getWindowAttendeeById(userAddresses[i].toLowerCase());
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
	if (activeToolbar != "event-toolbar") {
		dump("toolbar: " + activeToolbar + "\n");
		SCMakeWidgetsReadOnly();
	}
}

function SCMakeWidgetsReadOnly() {
	var menuBar = document.getElementById("event-menubar");
	menuBar.setAttribute("collapsed", "true");
	var eventGrid = document.getElementById("event-grid");
	_makeChildNodesReadOnly(eventGrid);
	var attendeeList = document.getElementById("attendee-list");
	attendeeList.removeAttribute("onclick");
	attendeeList.setAttribute("class", "");
}

function _makeChildNodesReadOnly(node) {
	if (node.nodeType
			== Components.interfaces.nsIDOMNode.ELEMENT_NODE) {
		if (node.localName == "textbox"
				|| node.localName == "menulist"
				|| node.localName == "datetimepicker"
				|| node.localName == "checkbox")
			node.setAttribute("disabled", "true");
		else {
			dump("node: " + node.localName + "\n");
			for (var i = 0; i < node.childNodes.length; i++)
				_makeChildNodesReadOnly(node.childNodes[i]);
		}
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
	var organizers = [];

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

function SCLoadAclOrganizers() {
	var organizers = [];

	var identities = componentEntry.parentCalendarEntry.identities;
	for (var i = 0; i < identities.length; i++) {
		var email = identities[i].email;
		var name = identities[i].cn;
		if (email && email.indexOf("@") > -1) {
			if (!(name && name.length))
				name = email.split("@")[0];
			var currentOrganizer = { name: name, email: email };
			if (i == 0)
				currentOrganizer["default"] = true;
			organizers.push(currentOrganizer);
		}
	}

	return organizers;
}

function SCFillOrganizers() {
	// add organizers to the organizer menulist
	var organizerList = document.getElementById("item-organizer");
	if (!organizerList) /* Lightning 0.8 */
		organizerList = document.getElementById("event-grid-item-organizer");
	var organizers;
	if (componentEntry.parentCalendarEntry.hasAccessControl)
		organizers = SCLoadAclOrganizers();
	else
		organizer = SCLoadOrganizers();
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
	var organizer = component.organizer;

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
		if (componentEntry.parentCalendarEntry.hasAccessControl) {
			if (componentEntry.userIsOwner()) {
				existingOrganizer.parentNode.removeChild(existingOrganizer);
				SCFillOrganizers();
				SCUpdateExistingOrganizer();
			}
		}
		else {
			existingOrganizer.parentNode.removeChild(existingOrganizer);
			SCFillOrganizers();
			SCUpdateExistingOrganizer();
		}
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
	component = component.clone();
	var attendee = getUserAsAttendee(!componentEntry.userIsOwner());
 	attendee.setProperty("PARTSTAT", type);
	window.calendarItem = component;

	var calendar = window.arguments[0].calendar;
	var imipItem = Components.classes["@mozilla.org/calendar/itip-item;1"]
		.createInstance(Components.interfaces.calIItipItem);
	imipItem.init(component.icalString);
	imipItem.setAttendeeStatus(attendee.id, type);
	imipItem.receivedMethod = "REQUEST";
	imipItem.responseMethod = "REPLY";
	imipItem.isSend = true;
	if (type == "ACCEPTED")
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

	var dialog = document.getElementById("sun-calendar-event-dialog");
	if (type == "DECLINED")
		dialog.acceptDialog();
	else {
		window.onCommandCancel = function() { return true; };
		dialog.cancelDialog();
	}
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
