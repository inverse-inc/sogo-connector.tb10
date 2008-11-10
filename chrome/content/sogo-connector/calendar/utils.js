/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

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
