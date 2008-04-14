/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
	.getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://inverse-library/content/sogoWebDAV.js");

function sogoFBRequest(url, target, data) {
	this.url = url;
	this.target = target;
	this.data = data;
}

sogoFBRequest.prototype = {
 load: function() {
		var rq = new sogoWebDAV(this.url, this);
		rq.get();
	},
 _joinLines: function(originalText) {
		var originalLines = originalText.split("\n");
		var lines = new Array();
		for (var i = 0; i < originalLines.length; i++) {
			var line = originalLines[i];
			if (line.length > 0 && line[0] != "\r") {
				if (line[0] == ' ') {
					var oldLine = lines[lines.length-1];
					if (oldLine[oldLine.length-1] == "\r")
						oldLine = oldLine.substr(0, oldLine.length - 1);
					oldLine += line.substr(1, line.length - 2);
					lines[lines.length-1] = oldLine;
				}
				else
					lines.push(line);
			}
		}

		return lines;
	},
 _preparse: function(lines) {
		var newLines = new Array();

		for (var i = 0; i < lines.length; i++) {
			if (lines[i].indexOf("FREEBUSY") == 0) {
				var separator = lines[i].indexOf(":");
				var lineStart = lines[i].substr(0, separator);
				var data = lines[i].substr(separator+1).split(",");
				for (var j = 0; j < data.length; j++)
					newLines.push(lineStart + ":" + data[j]);
			}
			else
				newLines.push(lines[i]);
		}

		return newLines.join("\n");
	},
 _getEntryType: function(fb) {
		var fbType = Components.interfaces.calIFreeBusyInterval.BUSY;

		var fbTypeString = fb.getParameter("FBTYPE");
		if (fbTypeString) {
			if (fbTypeString == "FREE")
				fbType = Components.interfaces.calIFreeBusyInterval.FREE;
			else if (fbTypeString == "BUSY-UNAVAILABLE")
				fbType = Components.interfaces.calIFreeBusyInterval.BUSY_UNAVAILABLE;
			else if (fbTypeString == "BUSY-TENTATIVE")
				fbType = Components.interfaces.calIFreeBusyInterval.BUSY_TENTATIVE;
		}

		return fbType;
	},
 _getEntry: function(fb) {
		var clazz = Components.classes["@mozilla.org/calendar/datetime;1"];
		var iface = Components.interfaces.calIDateTime;

		var fbEntry = { isBusyEntry: true,
										interval: { start: clazz.createInstance(iface),
																end: null } };
		fbEntry.freeBusyType = this._getEntryType(fb);
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

		return fbEntry;
	},
 onDAVQueryComplete: function(aStatusCode, fbText) {
		if (aStatusCode > 199 && aStatusCode < 300) {
			fbText = this._preparse(this._joinLines(fbText));
			var ics = Components.classes["@mozilla.org/calendar/ics-service;1"]
			.getService(Components.interfaces.calIICSService);
			var cal = ics.parseICS(fbText, null);
			var vfb = cal.getFirstSubcomponent("VFREEBUSY");

			var entries = new Array();
			var fb = vfb.getFirstProperty("FREEBUSY");
			while (fb) {
				entries.push(this._getEntry(fb));
				fb = vfb.getNextProperty("FREEBUSY");
			}
			this.target.onFreeBusyComplete(entries, this.data);
		}
	}
};
