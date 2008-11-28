/* -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */

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