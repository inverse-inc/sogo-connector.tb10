var initArg=window.arguments[0];
var downloadPersistObj=null;

var downloadObserverObj = {
  observerService : null,
  onDownloadDoneEventName : "downloadDoneEvent",
  onProgressChangeEventName : "progressChangeEvent",
  onErrorEventName : "errorEvent",
}

var webdavclientDownloadObserver = {
  observe: function(subject, topic, state) {
//XXX Mozilla throws a JavaScript error in the next line about not finding the downloadObserverObj ???
    if(topic==downloadObserverObj.onDownloadDoneEventName) {
      // done with download, the dialog closes automatically
      endOfDownload();
      return;
    }
    if(topic==downloadObserverObj.onProgressChangeEventName) {
      // update the progress bar
      document.getElementById("downloadProgress").setAttribute("value",state);
      return;
    }
    if(topic==downloadObserverObj.onErrorEventName) {
      // error event
      return;
    }
  }
}

// startup function
function Startup() {
  document.getElementById("fileName").value="Saving resource: "+initArg.filename;
  var kObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  downloadObserverObj.observerService = kObserverService;
  kObserverService.addObserver(webdavclientDownloadObserver,downloadObserverObj.onDownloadDoneEventName,false);
  kObserverService.addObserver(webdavclientDownloadObserver,downloadObserverObj.onProgressChangeEventName,false);
  kObserverService.addObserver(webdavclientDownloadObserver,downloadObserverObj.onErrorEventName,false);

  downloadPersistObj=webdav_get_webbrowserpersist(initArg.webPath,initArg.localFile,initArg.username,initArg.password,downloadObserverObj);
}

// cancelling the save process
function downloadCancel() {
  downloadPersistObj.cancelSave();
  endOfDownload();
}

function endOfDownload() {
//XXX here we need to cleanup the local file !
  window.close();
}