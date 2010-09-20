function SIACLoad() {
    let prefService = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
    try {
        let attribute = prefService.getCharPref("sogo-connector.autoComplete.commentAttribute");
        if (attribute && attribute.length > 0) {
            let done = false;
            let i = 1;
            while (!done) {
                var textbox = document.getElementById(autocompleteWidgetPrefix
                                                      + "#" + i);
                if (textbox) {
                    let acValue = textbox.getAttribute("autocompletesearch");
                    if (acValue && acValue.length > 0) {
                        acValue = acValue.replace(/(^| )addrbook($| )/, "$1addrbook-sogo-connector$2");
                        textbox.setAttribute("autocompletesearch", acValue);
                        textbox.setAttribute("showCommentColumn", "true");
                        textbox.showCommentColumn = true;
                        dump("CONFIGURED\n ");
                    }
                    i++;
                } else {
                    done = true;
                }
            }
        }
    }
    catch(e) {
    }
}

window.addEventListener("load", SIACLoad, false);
