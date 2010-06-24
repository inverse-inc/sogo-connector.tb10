/* webdavclientdownload-persist.js - This file is part of "SOGo Connector", a Thunderbird extension.
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
