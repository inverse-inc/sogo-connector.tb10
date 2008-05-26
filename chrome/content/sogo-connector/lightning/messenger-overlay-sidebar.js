/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

function SIOnMessengerOverlaySidebarLoad() {
  var aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;
  var calMgr = getCalendarManager();
  var calendars = calMgr.getCalendars({});
  for (var i = 0; i < calendars.length; i++)
    if (calendars[i].type == "caldav")
      aclMgr.calendarEntry(calendars[i].uri);
}

window.addEventListener("load", SIOnMessengerOverlaySidebarLoad, false);
