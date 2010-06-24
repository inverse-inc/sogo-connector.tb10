/* webdavclientupload-persist.js - This file is part of "SOGo Connector", a Thunderbird extension.
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
var uploadPersistObj=null;

var uploadObserverObj = {
  observerService : null,
  onUploadDoneEventName : "uploadDoneEvent",
  onProgressChangeEventName : "progressChangeEvent",
  onErrorEventName : "errorEvent",
}

var webdavclientUploadObserver = {
  observe: function(subject, topic, state) {
//XXX Mozilla throws a JavaScript error in the next line about not finding the uploadObserverObj ???
    if(topic==uploadObserverObj.onUploadDoneEventName) {
      // done with upload, the dialog closes automatically
      endOfUpload();
      return;
    }
    if(topic==uploadObserverObj.onProgressChangeEventName) {
      // update the progress bar
      document.getElementById("uploadProgress").setAttribute("value",state);
      return;
    }
    if(topic==uploadObserverObj.onErrorEventName) {
      messageBox(window,"webdavclientupload - errorEvent",state);    
      return;
    }
  }
}

// startup function
function Startup() {
  try {
    var kObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    uploadObserverObj.observerService = kObserverService;
    kObserverService.addObserver(webdavclientUploadObserver,uploadObserverObj.onUploadDoneEventName,false);
    kObserverService.addObserver(webdavclientUploadObserver,uploadObserverObj.onProgressChangeEventName,false);
    kObserverService.addObserver(webdavclientUploadObserver,uploadObserverObj.onErrorEventName,false);
    uploadPersistObj=webdav_put_webbrowserpersist(initArg.webPath,initArg.relativeWebPath,initArg.XMLdoc,initArg.contentType,initArg.persistFlags,initArg.encFlags,initArg.wrapCol,initArg.username,initArg.password,uploadObserverObj);
  } catch (e) {
    messageBox(window,"webdavclientupload - Startup()",e);    
  }
}

// cancelling the save process
function uploadCancel() {
//  uploadPersistObj.cancelSave();
  endOfUpload();
}

function endOfUpload() {
//XXX here we need to cleanup the local file !
  window.close();
}
