/* webdavclientdownload.js - This file is part of "SOGo Connector", a Thunderbird extension.
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
  try {
    document.getElementById("fileName").value="Saving resource: "+initArg.filename;
    var kObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    downloadObserverObj.observerService = kObserverService;
    kObserverService.addObserver(webdavclientDownloadObserver,downloadObserverObj.onDataAvailableEventName,false);
    kObserverService.addObserver(webdavclientDownloadObserver,downloadObserverObj.onStartRequestEventName,false);
    kObserverService.addObserver(webdavclientDownloadObserver,downloadObserverObj.onStopRequestEventName,false);
    kObserverService.addObserver(webdavclientDownloadObserver,downloadObserverObj.onErrorEventName,false);

    downloadChannel=webdav_get(initArg.webPath,initArg.localFile,initArg.username,initArg.password,downloadObserverObj);
  } catch(e) {
    messageBox(window,"webdavclientdownload - Startup()",e);
  }
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
