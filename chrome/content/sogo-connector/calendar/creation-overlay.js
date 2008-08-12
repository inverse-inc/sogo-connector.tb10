window.addEventListener("load", SCOnCreationOverlayLoad, false);

function SCOnCreationOverlayLoad() {
    window.SCOldDoCreateCalendar = window.doCreateCalendar;
    window.doCreateCalendar = SCDoCreateCalendar;
}

function SCDoCreateCalendar() {
  if (gCalendar.type == "caldav") {
      var aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"]
	.getService(Components.interfaces.nsISupports)
	.wrappedJSObject;
      aclMgr.calendarEntry(gCalendar.uri);
  }

  return window.SCOldDoCreateCalendar();
}

