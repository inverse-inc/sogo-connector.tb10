/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

function jsInclude(files, target) {
        var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                .getService(Components.interfaces.mozIJSSubScriptLoader);
        for (var i = 0; i < files.length; i++) {
                try {   
                        loader.loadSubScript(files[i], target);
                }
                catch(e) {
                        dump("folder-handling.js: failed to include '" + files[i] +
                                         "'\n" + e);
                        if (e.fileName)
                                dump ("\nFile: " + e.fileName
                                                        + "\nLine: " + e.lineNumber
                                                        + "\n\n Stack:\n\n" + e.stack);
                }
        }
}

jsInclude(["chrome://sogo-connector/content/calendar/utils.js"]);

function onLoad() {
    var args = window.arguments[0];
    var item = args.calendarEvent;
    item = item.clone(); // use an own copy of the passed item
    var calendar = item.calendar;
    window.item = item;

    // the calling entity provides us with an object that is responsible
    // for recording details about the initiated modification. the 'finalize'-property
    // is our hook in order to receive a notification in case the operation needs
    // to be terminated prematurely. this function will be called if the calling
    // entity needs to immediately terminate the pending modification. in this
    // case we serialize the item and close the window.
    if (args.job) {

        // keep this context...
        var self = this;

        // store the 'finalize'-functor in the provided job-object.
        args.job.finalize = function finalize() {

            // store any pending modifications...
            self.onAccept();

            var item = window.item;

            // ...and close the window.
            window.close();

            return item;
        }
    }

    // INVERSE - BEGIN
    //window.readOnly = calendar.readOnly;
    window.readOnly = !isCalendarWritable(args.calendar);
    // INVERSE - END

    if (!window.readOnly && calInstanceOf(calendar, Components.interfaces.calISchedulingSupport)) {
        var attendee = calendar.getInvitedAttendee(item);
        if (attendee) {
            // if this is an unresponded invitation, preset our default alarm values:
            if (attendee.participationStatus == "NEEDS-ACTION") {
                setDefaultAlarmValues(item);
            }

            window.attendee = attendee.clone();
            // Since we don't have API to update an attendee in place, remove
            // and add again. Also, this is needed if the attendee doesn't exist
            // (i.e REPLY on a mailing list)
            item.removeAttendee(attendee);
            item.addAttendee(window.attendee);
        }
    }

    document.getElementById("item-title").value = item.title;

    document.getElementById("item-start-row").Item = item;
    document.getElementById("item-end-row").Item = item;

    updateInvitationStatus();

    // show reminder if this item is *not* readonly.
    // this case happens for example if this is an invitation.
    var calendar = window.arguments[0].calendarEvent.calendar;
    var supportsReminders =
        (calendar.getProperty("capabilities.alarms.oninvitations.supported") !== false);
    if (!window.readOnly && supportsReminders) {
        document.getElementById("reminder-row").removeAttribute("hidden");
        loadReminder(window.item);
        updateReminderDetails();
    }

    updateRepeatDetails();
    updateAttendees();
    updateLink();

    var location = item.getProperty("LOCATION");
    if (location && location.length) {
        document.getElementById("location-row").removeAttribute("hidden");
        document.getElementById("item-location").value = location;
    }

    var categories = item.getCategories({});
    if (categories.length > 0) {
        document.getElementById("category-row").removeAttribute("hidden");
        document.getElementById("item-category").value = categories.join(", "); // TODO l10n-unfriendly
    }

    var organizer = item.organizer;
    if (organizer && organizer.id) {
        document.getElementById("organizer-row").removeAttribute("hidden");

        if (organizer.commonName && organizer.commonName.length) {
            document.getElementById("item-organizer").value = organizer.commonName;
            document.getElementById("item-organizer").setAttribute("tooltiptext", organizer.toString());
        } else if (organizer.id && organizer.id.length) {
            document.getElementById("item-organizer").value = organizer.toString();
        }
    }

    var status = item.getProperty("STATUS");
    if (status && status.length) {
        var statusRow = document.getElementById("status-row");
        for (var i = 0; i < statusRow.childNodes.length; i++) {
            if (statusRow.childNodes[i].getAttribute("status") == status) {
                statusRow.removeAttribute("hidden");
                statusRow.childNodes[i].removeAttribute("hidden");
                break;
            }
        }
    }

    if (item.hasProperty("DESCRIPTION")) {
        var description = item.getProperty("DESCRIPTION");
        if (description && description.length) {
            document.getElementById("item-description-box")
                .removeAttribute("hidden");
            var textbox = document.getElementById("item-description");
            textbox.value = description;
            textbox.inputField.readOnly = true;
        }
    }

    document.title = item.title;

    // If this item is read only we remove the 'cancel' button as users
    // can't modify anything, thus we go ahead with an 'ok' button only.
    if (window.readOnly) {
        document.getElementById("calendar-summary-dialog")
            .getButton("cancel").setAttribute("collapsed", "true");
    }

    window.focus();
    opener.setCursor("auto");
}


// vieuw code, j'ai mis ////
////window.addEventListener("load", SCOnLoad, false);

//function SCOnLoad() {
//     document.getElementById("calendar-summary-dialog")
//         .getButton("cancel").setAttribute("collapsed", "true");
//     document.getElementById("reminder-row").setAttribute("hidden", "true");
//     window.readOnly = true;
////}
