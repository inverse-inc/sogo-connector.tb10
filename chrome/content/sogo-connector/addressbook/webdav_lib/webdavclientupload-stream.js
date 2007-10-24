var initArg=window.arguments[0];
var uploadChannel=null;

var uploadObserverObj = {
  observerService : null,
  onDataAvailableEventName : "uploadDataAvailable",
  onStartRequestEventName : "uploadStartReqest",
  onStopRequestEventName : "uploadStopRequest",
  onErrorEventName : "uploadError"
}

var webdavclientUploadObserver = {
  observe: function(subject, topic, state) {
    if(topic==uploadObserverObj.onDataAvailableEventName) {
      // update the progress bar
      document.getElementById("uploadProgress").setAttribute("value",state);
      return;
    }
    if(topic==uploadObserverObj.onStartRequestEventName) {
      // here comes the start event
      return;
    }
    if(topic==uploadObserverObj.onStopRequestEventName) {
      // here comes the stop event
      endOfUpload();
      return;
    }
    if(topic==uploadObserverObj.onErrorEventName) {
      // here comes the error event
      return;
    }
  }
}

// startup function
function Startup() {
  document.getElementById("fileName").value="Uploading resource: "+initArg.fileName;
  var kObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  uploadObserverObj.observerService = kObserverService;
  kObserverService.addObserver(webdavclientUploadObserver,uploadObserverObj.onDataAvailableEventName,false);
  kObserverService.addObserver(webdavclientUploadObserver,uploadObserverObj.onStartRequestEventName,false);
  kObserverService.addObserver(webdavclientUploadObserver,uploadObserverObj.onStopRequestEventName,false);
  kObserverService.addObserver(webdavclientUploadObserver,uploadObserverObj.onErrorEventName,false);

  uploadChannel=webdav_put(initArg.webPath,initArg.filePath,initArg.contentType,initArg.username,initArg.password,uploadObserverObj);
}

function uploadCancel() {
// cancel upload
  uploadChannel.cancel();
  endOfUpload();
}

function endOfUpload() {
  window.close();
}