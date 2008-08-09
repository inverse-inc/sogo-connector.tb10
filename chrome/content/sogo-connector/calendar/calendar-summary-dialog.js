window.addEventListener("load", SCOnLoad, false);

function SCOnLoad() {
    document.getElementById("calendar-summary-dialog")
        .getButton("cancel").setAttribute("collapsed", "true");
    document.getElementById("reminder-row").setAttribute("hidden", "true");
    window.readOnly = true;
}
