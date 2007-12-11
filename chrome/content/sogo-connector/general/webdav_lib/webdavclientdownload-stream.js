var initArg=window.arguments[0];
var downloadChannel=null;

var downloadObserverObj = {
  observerService : null,
  onDataAvailableEventName : "downloadDataAvailable",
  onStartRequestEventName : "downloadStartReqest",
  onStopRequestEventName : "downloadStopRequest",
  onErrorEventName : "downloadError"
}

var webdavclientDownloadObserver = {
  observe: function(subject, topic, state) {
    if(topic==downloadObserverObj.onDataAvailableEventName) {
      // update the progress bar
//XXX where to get the size of the downloading file ???
      document.getElementById("downloadProgress").setAttribute("value",state);
      return;
    }
    if(topic==downloadObserverObj.onStartRequestEventName) {
      // here comes the start event
      return;
    }
    if(topic==downloadObserverObj.onStopRequestEventName) {
      // here comes the stop event
      endOfDownload();
      return;
    }
    if(topic==downloadObserverObj.onErrorEventName) {
      // here comes the error event
      return;
    }
  }
}

// startup function
function Startup() {
  document.getElementById("fileName").value="Saving resource: "+initArg.filename;
  var kObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  downloadObserverObj.observerService = kObserverService;
  kObserverService.addObserver(webdavclientDownloadObserver,downloadObserverObj.onDataAvailableEventName,false);
  kObserverService.addObserver(webdavclientDownloadObserver,downloadObserverObj.onStartRequestEventName,false);
  kObserverService.addObserver(webdavclientDownloadObserver,downloadObserverObj.onStopRequestEventName,false);
  kObserverService.addObserver(webdavclientDownloadObserver,downloadObserverObj.onErrorEventName,false);

  downloadChannel=webdav_get(initArg.webPath,initArg.localFile,initArg.username,initArg.password,downloadObserverObj);
}

// cancelling the save process
function downloadCancel() {
  downloadChannel.cancelSave();
  endOfDownload();
}

function endOfDownload() {
//XXX here we need to cleanup the local file !
  window.close();
}