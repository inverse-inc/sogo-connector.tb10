/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
	.getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://inverse-library/content/sogoWebDAV.js");

function sogoFBRequest(url, target) {
	this.url = url;
	this.target = target;
}

sogoFBRequest.prototype = {
 load: function() {
		var rq = new sogoWebDAV(this.url, this, this.target);
		rq.get();
	},
 onDAVQueryComplete: function(aStatusCode, fbText, target) {
		if (aStatusCode > 199 && aStatusCode < 300) {
			var ics = Components.classes["@mozilla.org/calendar/ics-service;1"]
			.getService(Components.interfaces.calIICSService);
			dump("fbText:" + fbText + "\n");
			var cal = ics.parseICS(fbText);
			var vfb = cal.getFirstSubcomponent("VFREEBUSY");

			var done = false;
			var count = 0;
			entries = new Array();
			while (!done) {
				var fb;
				if (count < 1)
					fb = vfb.getFirstProperty("FREEBUSY");
				else
					fb = vfb.getNextProperty("FREEBUSY");
				if (fb) {
					var clazz = Components.classes["@mozilla.org/calendar/datetime;1"];
					var iface = Components.interfaces.calIDateTime;
					var fbEntry = { isBusyEntry: true,
													interval: { start: clazz.createInstance(iface),
																			end: null } };
					var fbTypeString = fb.getParameter("FBTYPE");
					var fbType = Components.interfaces.calIFreeBusyInterval.BUSY;
					if (fbTypeString) {
						if (fbTypeString == "FREE")
							fbType = Components.interfaces.calIFreeBusyInterval.FREE;
						else if (fbTypeString == "BUSY-UNAVAILABLE")
							fbType = Components.interfaces.calIFreeBusyInterval.BUSY_UNAVAILABLE;
						else if (fbTypeString == "BUSY-TENTATIVE")
							fbType = Components.interfaces.calIFreeBusyInterval.BUSY_TENTATIVE;
					}
					fbEntry.freeBusyType = fbType;

					var duration = fb.value.split("/");
					fbEntry.interval.start.icalString = duration[0];
					var end = null;
					if (duration[1].toUpperCase().charAt(0) == 'P') {
						end = fbEntry.interval.start.clone();
						var fbDuration = Components.classes["@mozilla.org/calendar/duration;1"]
							.createInstance(Components.interfaces.calIDuration);
						fbDuration.icalString = duration[1];
						end.addDuration(fbDuration);
					}
					else {
						end = clazz.createInstance(iface);
						end.icalString = duration[1];
					}
					fbEntry.interval.end = end;
					entries.push(fbEntry);
					count++;
				}
				else
					done = true;
			}
			this.target.onFreeBusy(entries);
		}
	}
};
