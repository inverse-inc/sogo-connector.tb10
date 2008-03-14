/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

var inverseEventDialog = {
 onLoadHandler: function(event) {
		var attendees = document.getElementById("attendee-row");
		var row = document.getElementById("inverse-organizer-row");
		attendees.removeChild(row);
		attendees.parentNode.insertBefore(row, attendees);

		var organizers = document.getElementById("item-organizer");

		inverseEventDialog.updateOrganizers(organizers);
		organizers.addEventListener("command",
																inverseEventDialog.updateExistingOrganizer,
																false);

		var fixedLabel = document.getElementById("fixedConfidentialLabel");
		var buttonPrivacy = document.getElementById("button-privacy");
		var nodes = buttonPrivacy.getElementsByTagName("menuitem");
		nodes[1].label = fixedLabel.value;
	},
 loadOrganizers: function() {
		var organizers = new Array();

		var composeService = Components.classes["@mozilla.org/messengercompose;1"]
		.getService(Components.interfaces.nsIMsgComposeService);

		var manager = 
		Components.classes["@mozilla.org/messenger/account-manager;1"]
		.getService(Components.interfaces.nsIMsgAccountManager);
		for (var i = 0; i < manager.allIdentities.Count(); i++) {
			var currentIdentity
				= manager.allIdentities.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgIdentity);
			var server = manager
				.GetServersForIdentity(currentIdentity)
				.GetElementAt(0)
				.QueryInterface(Components.interfaces.nsIMsgIncomingServer);
			var currentOrganizer;
			if (server.realUsername && server.realUsername.indexOf("@") > -1)
				currentOrganizer
					= { "name": currentIdentity.fullName,
							"email": server.realUsername };
			else {
				var domain = currentIdentity.email.split("@")[1];
				if (domain) {
					currentOrganizer
						= { "name": currentIdentity.fullName,
								"email": ( server.realUsername + "@" + domain) };
				}
				else
					currentOrganizer = null;
			}
			if (currentOrganizer) {
				if (composeService.defaultIdentity == currentIdentity)
					currentOrganizer["default"] = true;
				organizers.push(currentOrganizer);
			}
		}

		return organizers;
	},
 fillOrganizers: function() {
		// add organizers to the organizer menulist
		var organizerList = document.getElementById("item-organizer");
		var organizers = this.loadOrganizers();
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
	},
 updateOrganizers: function(organizers) {
		var existingOrganizer
		= document.getElementById("item-existing-organizer");
		var organizer = window.calendarItem.organizer;
		if (organizer) {
			organizers.parentNode.removeChild(organizers);
			var organizerName = (organizer.commonName
													 + " <" + organizer.id.split(":")[1] + ">");
			existingOrganizer.setAttribute('value', organizerName);
			window.organizer = organizer;
		}
		else {
			existingOrganizer.parentNode.removeChild(existingOrganizer);
			this.fillOrganizers();
			this.updateExistingOrganizer();
		}
	},
 updateExistingOrganizer: function(event) {
		var menuItem = document.getElementById("item-organizer").selectedItem;
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
};

this.addEventListener("load", inverseEventDialog.onLoadHandler, false);
