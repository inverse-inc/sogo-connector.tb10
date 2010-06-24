/* webdavclientupload-stream.js - This file is part of "SOGo Connector", a Thunderbird extension.
 *
 * Copyright: Inverse inc., 2006-2010
 *    Author: Robert Bolduc, Wolfgang Sourdeau
 *     Email: support@inverse.ca
 *       URL: http://inverse.ca
 *
 * "SOGo Connector" is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 as published by
 * the Free Software Foundation;
 *
 * "SOGo Connector" is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * "SOGo Connector"; if not, write to the Free Software Foundation, Inc., 51
 * Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 */

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
