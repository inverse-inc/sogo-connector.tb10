const Cc = Components.classes;
const Ci = Components.interfaces;

var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Ci.nsIXULAppInfo);
var isOnBranch = appInfo.platformVersion.indexOf("1.8") == 0;

function calDAVFBRequest() {
}

calDAVFBRequest.prototype = {
   QueryInterface: function (aIID) {
      if (!aIID.equals(Components.interfaces.nsISupports)
          && !aIID.equals(CIcalDAVFBRequest)) {
         throw Components.results.NS_ERROR_NO_INTERFACE;
      }

      return this;
   },
   mURL: null,
   get url() {
      return this.mURL;
   },
   set url(newURL) {
      this.mURL = newURL;
   },
   mTarget: null,
   get target() {
      return this.mTarget;
   },
   set target(newTarget) {
      this.mTarget = newTarget;
   },
   load: function() {
      var webdavSvc = Cc['@mozilla.org/webdav/service;1']
                      .getService(Ci.nsIWebDAVService);
      var listener = new WebDavListener();
      var requestor = new InterfaceRequestor();
      var url = Cc['@mozilla.org/network/standard-url;1']
                      .getService(Ci.nsIURI);
      url.spec = this.mURL;
      webdavSvc.getToString(new WebDavResource(url.QueryInterface(Ci.nsIURL)), listener,
                            requestor, this.mTarget);
   }
}

function WebDavResource(url) {
    this.mResourceURL = url;
}

WebDavResource.prototype = {
    mResourceURL: {},
    get resourceURL() {
       return this.mResourceURL;
    },
    QueryInterface: function(iid) {
       if (iid.equals(Ci.nsIWebDAVResource) ||
           iid.equals(Ci.nsISupports)) {
          return this;
       }
       throw Components.interfaces.NS_ERROR_NO_INTERFACE;
    }
};

function WebDavListener() {
}

WebDavListener.prototype = {
    QueryInterface: function (aIID) {
        if (!aIID.equals(Ci.nsISupports)
            && !aIID.equals(Ci.nsIWebDavOperationListener)) {
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }
        return this;
    },
    onOperationComplete: function(aStatusCode, aResource, aOperation,
                                  aClosure) {
    },
    onOperationDetail: function(aStatusCode, aResource, aOperation, aDetail,
                                aClosure) {
      if (aStatusCode > 199 && aStatusCode < 300) {
         var fbText = aDetail.QueryInterface(Ci.nsISupportsCString).data;
         var ics = Cc["@mozilla.org/calendar/ics-service;1"]
                     .getService(Ci.calIICSService);
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
         aClosure.onFreeBusy(entries);
      }
/*      dump("onOperationDetail\n"); */
      return;
    }
}

function InterfaceRequestor () {
}

InterfaceRequestor.prototype = { 
    QueryInterface: function (aIID) {
        if (!aIID.equals(Ci.nsISupports) &&
            !aIID.equals(Ci.nsIInterfaceRequestor)) {
           throw Components.results.NS_ERROR_NO_INTERFACE;
        }

        return this;
    },
    getInterface: function(iid) {
        if (iid.equals(Components.interfaces.nsISupports)
            || iid.equals(Components.interfaces.nsIAuthPrompt)
            || (iid.equals(Components.interfaces.nsIAuthPrompt2) && !isOnBranch)) {
           return Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
            .getService(Components.interfaces.nsIWindowWatcher)
            .getNewAuthPrompter(null);
        }
        else if (iid.equals(Components.interfaces.nsIProgressEventSink)
                 || iid.equals(Components.interfaces.nsIDocShellTreeItem)) {
           return this;
        }
        else if (iid.equals(Components.interfaces.nsIPrompt)
                 || iid.equals(Components.interfaces.nsIAuthPromptProvider)) {
            // use the window watcher service to get a nsIPrompt impl
           return Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
            .getService(Components.interfaces.nsIWindowWatcher)
            .getNewPrompter(null);
        }
        dump ("no interface in requestor: " + iid + "\n");
        throw Components.results.NS_ERROR_NO_INTERFACE;
    },

    /* stubs */
    // nsIProgressEventSink
    onProgress: function onProgress(aRequest, aContext, aProgress, aProgressMax) {},
    onStatus: function onStatus(aRequest, aContext, aStatus, aStatusArg) {},
    // nsIDocShellTreeItem
    findItemWithName: function findItemWithName(name, aRequestor,
                                                aOriginalRequestor) {}
}
