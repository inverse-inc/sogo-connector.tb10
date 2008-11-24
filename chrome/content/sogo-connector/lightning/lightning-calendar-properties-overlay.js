onLoad = function ltn_onLoad() {
    gCalendar = window.arguments[0].calendar;

    if (gCalendar.type == "caldav") {
      var aclMgr = Components.classes["@inverse.ca/calendar/caldav-acl-manager;1"].getService().wrappedJSObject;
      var calAclEntry = aclMgr.calendarEntry(gCalendar.uri);
      var i = 0;

      var menuPopup = document.getElementById("email-identity-menupopup");

      while (calAclEntry.ownerIdentities != null && i < calAclEntry.ownerIdentities.length) {
	addMenuItem(menuPopup, calAclEntry.ownerIdentities[i].identityName, calAclEntry.ownerIdentities[i].key);
	i++;
      }

      // This should never happend as the CalDAV server should always return us the proper
      // owner's identity - but, we never know.
      if (i == 0) {
	addMenuItem(menuPopup, ltnGetString("lightning", "imipNoIdentity"), "none");
      }
      
      var menuList = document.getElementById("email-identity-menulist");
      menuList.selectedIndex = 0;
    
    } else {
      ltnInitMailIdentitiesRow();
    }
    common_onLoad();
};
