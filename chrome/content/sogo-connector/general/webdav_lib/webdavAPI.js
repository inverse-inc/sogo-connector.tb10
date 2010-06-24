/* webdavAPI.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

// no error handling here in the API, any error occures throw it back to the caller

var webdavAPIConst = {
  WEBDAV_EXCLUSIVE_LOCK : "<D:exclusive/>",
  WEBDAV_WRITE_LOCK : "<D:write/>",
  WEBDAV_INFINIT_LOCK : "Infinite, Second-4100000000",
  WEBDAV_READONLY_NAMESPACES : ["DAV:","http://apache.org/dav/props/"]
}

function isXML(xmltext) {
  if(xmltext==null) return false;
  if(xmltext.substr(0,5)=="<?xml") return true;
  return false;
}

function processHTTPHeaders(headers) {
  if(headers==null) return null;
  var retArray=new Array();
  var t_headers=headers;
  var t_line=""; var t_key=""; var t_value="";
  while((t_line=t_headers.substr(0,t_headers.indexOf("\n")))!="") {
   t_headers=t_headers.substr(t_line.length+1);
   t_key=t_line.substr(0,t_line.indexOf(":")); t_value=t_line.substr(t_line.indexOf(":")+2);
//   retArray.push([[t_key],[t_value]]);
   retArray[t_key]=t_value;
  }
  return retArray;
}

// send WebDAV XML request
function sendXMLRequest(webdavURL,HTTPmethod,HTTPheaders,XMLreq,username,password) {
  var retObj = { status : 0, response : "", responseHeaders: new Array() };
  try {
    var httpRequest=new XMLHttpRequest();
    //httpRequest.open(HTTPmethod,webdavURL,false,username,password);
    httpRequest.open(HTTPmethod,webdavURL,false,null,null);
    for(var i=0; i<HTTPheaders.length; i++){
       httpRequest.setRequestHeader(HTTPheaders[i][0],HTTPheaders[i][1]);
    }
    httpRequest.setRequestHeader("Accept-Encoding", "");
    httpRequest.send(XMLreq);
    
    retObj.status=httpRequest.status;
 
//    if(!isXML(httpRequest.responseText)) retObj.response=null;
//      else retObj.response=httpRequest.responseText;
//    logDebug("sendXMLRequest response:\n\n" + httpRequest.responseText);
    retObj.response=httpRequest.responseXML;
    retObj.responseHeaders=processHTTPHeaders(httpRequest.getAllResponseHeaders());
  } catch(e) {
    throw e;
  }
  return retObj;
}

//*****************************************************************************

function webdav_options(webdavURL,username,password) {
//  var HTTPheaders=[["Connection","TE"],["TE","trailers, deflate, gzip, compress"],["Translate","f"]];
  var HTTPheaders=[["Connection","TE"],["TE","trailers"],["Translate","f"]];   
  try {
    var responseObj=sendXMLRequest(webdavURL,"OPTIONS",HTTPheaders,"",username,password);
  } catch(e) {
    throw e;
  }
  return responseObj;
}

//*****************************************************************************

function webdav_mkcol(webdavURL,username,password) {
//  var HTTPheaders=[["Connection","TE"],["TE","trailers, deflate, gzip, compress"],["Translate","f"]];
   var HTTPheaders=[["Connection","TE"],["TE","trailers"],["Translate","f"]];   
  try {
    var responseObj=sendXMLRequest(webdavURL,"MKCOL",HTTPheaders,null,username,password);
  } catch(e) {
    throw e;
  }
  return responseObj;
}

//*****************************************************************************

function webdav_propfind(webdavURL,propList,username,password) {
  //putting together the request XML
  var xmlReq="<?xml version=\"1.0\"?>"
    +"<D:propfind xmlns:D=\"DAV:\">";
  if(propList==null) {
    xmlReq+="<D:allprop/>";
  } else {
    xmlReq+=propList;
  }
  xmlReq+="</D:propfind>";
  //var HTTPheaders=[["Connection","TE"],["TE","trailers, deflate, gzip, compress"],["Depth","1"],["Translate","f"],["Content-type","text/xml"]];
  var HTTPheaders=[["Connection","TE"],["TE","trailers"],["Content-type","text/xml"]];
  try {
    // send out the XML request
    var responseObj=sendXMLRequest(webdavURL,"PROPFIND",HTTPheaders,xmlReq,username,password);
  } catch(e) {
    throw e;
  }
  return responseObj;
}

//*****************************************************************************
function webdav_delete(webdavURL,username,password) {
//  var HTTPheaders=[["Connection","TE"],["TE","trailers, deflate, gzip, compress"],["Translate","f"]];
   var HTTPheaders=[["Connection","TE"],["TE","trailers"],["Translate","f"]];      
  try {
    var responseObj=sendXMLRequest(webdavURL,"DELETE",HTTPheaders,null,username,password);
  } catch(e) {
    throw e;
  }
  return responseObj;
}

//*****************************************************************************
// implement the HTTP PUT function using nsIWebBrowserPersist
function webdav_put_webbrowserpersist(webdavURL,relateddir,XMLdoc,contenttype,persistFlags,encFlags,wrapCol,username,password,observerObj) {
  try {
    var uploaduri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
    uploaduri.spec = webdavURL;
    if(username!=null && username!="" && password!=null && password!="") {
      uploaduri.username=username;
      uploaduri.password=password;
    }
//XXX the resources sub-directory is currently the same as the document directory. This needs a fix later!
//XXX the method signature has the relateddir parameter for this...
    var uploadRelatedURI=uploaduri;
    var persistObj = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);

    var webdavclientUploadProgressListener = {
      onStateChange : function(aWebProgress,aRequest,aStateFlags,aStatus) {
        // check for the upload done status
        if(persistObj.currentState==3 && aStateFlags & 0x00040000) {
          if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onUploadDoneEventName,null);
        }
      },
      onProgressChange : function(aWebProgress,aRequest,aCurSelfProgress,aMaxSelfProgress,aCurTotalProgress,aMaxTotalProgress) {
        // when the progress changes
        if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onProgressChangeEventName,aCurTotalProgress*100/aMaxTotalProgress);
      }
    };
    persistObj.progressListener = webdavclientUploadProgressListener;
    persistObj.persistFlags=persistFlags;
    persistObj.saveDocument(XMLdoc,uploaduri,uploadRelatedURI,contenttype,encFlags,wrapCol);
  } catch (e) {
    if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onErrorEventName,e);
      else throw e;
  }
  return persistObj;
}

//*****************************************************************************
//HTTP PUT with streams
//XXX There is a problem with the progress indicator. The listener only listens to the response, not the request !
//Here we need to listen on the request part
function webdav_put(webdavURL,filepath,contenttype,username,password,observerObj) {
  try {
    var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    var fileHandler = ioService.getProtocolHandler('file').QueryInterface(Components.interfaces.nsIFileProtocolHandler);
    var localFile = fileHandler.getFileFromURLSpec(filepath);
    var fileStream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
    fileStream.init(localFile,1,null,null);
    var buffStream=Components.classes['@mozilla.org/network/buffered-input-stream;1'].createInstance(Components.interfaces.nsIBufferedInputStream);
    buffStream.init(fileStream,2048); // buffer size is 2K

    var webURL = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURL);
    webURL.spec = webdavURL;
    if(username!=null && username!="" && password!=null && password!="") {
      webURL.username=username;
      webURL.password=password;
    }

    var tmpChannel = ioService.newChannelFromURI(webURL).QueryInterface(Components.interfaces.nsIHttpChannel);
    tmpChannel.referrer=webURL;
    tmpChannel.requestMethod="PUT";
    var uploadChannel = tmpChannel.QueryInterface(Components.interfaces.nsIUploadChannel);

    var contentSize=localFile.fileSize;
    uploadChannel.setUploadStream(buffStream, contenttype, contentSize);
     
    var uploadListener  = {
      _response : "",
      onDataAvailable: function (channel, ctxt, inStr, sourceOffset, count) {
        // reading the response data from the HTTP response
        var scrStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
        scrStream.init(inStr);
        this._response+=scrStream.read(count);
        if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onDataAvailableEventName,null);
        return; },
      onStartRequest: function (channel, ctxt) {
        if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onStartRequestEventName,null);
        return; },
      onStopRequest: function (channel, ctxt, status) {
        if(channel.responseStatus!=201)
          if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onErrorEventName,null);
        if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onStopRequestEventName,null);
        return; }
 
    };
    uploadChannel.asyncOpen(uploadListener, null);
  } catch (e) {
    //error handling
    if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onErrorEventName,e);
      else throw e;
  }
  return uploadChannel;
}

//*****************************************************************************
// HTTP GET implementation using nsIWebBrowserPersist
function webdav_get_webbrowserpersist(webdavURL,filepath,username,password,observerObj) {
  try {
    var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    var fileHandler = ioService.getProtocolHandler('file').QueryInterface(Components.interfaces.nsIFileProtocolHandler);
    var localFile = fileHandler.getFileFromURLSpec(filepath);

    var saveuri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
    saveuri.spec = webdavURL;
    if(username!=null && username!="" && password!=null && password!="") {
      saveuri.username=username;
      saveuri.password=password;
    }

    var persistObj = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Components.interfaces.nsIWebBrowserPersist);

    var webdavclientDownloadProgressListener = {
      onStateChange : function(aWebProgress,aRequest,aStateFlags,aStatus) {
        // when the download is done
        if(persistObj.currentState==3 && aStateFlags & 0x00040000) {
          if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onDownloadDoneEventName,null);
        }
      },
      onProgressChange : function(aWebProgress,aRequest,aCurSelfProgress,aMaxSelfProgress,aCurTotalProgress,aMaxTotalProgress) {
        // when the progress changes
        if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onProgressChangeEventName,aCurTotalProgress*100/aMaxTotalProgress);
      }
    };

    persistObj.progressListener = webdavclientDownloadProgressListener;
    persistObj.saveURI(saveuri,null,null,null,null,localFile);
  } catch (e) {
    if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onErrorEventName,e);
      else throw e;
  }
  return persistObj;
}

//*****************************************************************************
// HTTP GET implementation using streams
function webdav_get(webdavURL,filepath,username,password,observerObj) {
  try {
    // local file and stream
    var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    var fileHandler = ioService.getProtocolHandler('file').QueryInterface(Components.interfaces.nsIFileProtocolHandler);
    var localFile = fileHandler.getFileFromURLSpec(filepath);
    var fileStream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
    fileStream.init(localFile,0x04 | 0x08,640,false);
    var binOutputStream = Components.classes['@mozilla.org/binaryoutputstream;1'].createInstance(Components.interfaces.nsIBinaryOutputStream);
    binOutputStream.setOutputStream(fileStream);
    // Web URL and channel
    var webURL = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURL);
    webURL.spec = webdavURL;
    if(username!=null && username!="" && password!=null && password!="") {
      webURL.username=username;
      webURL.password=password;
    }

    var dlChannel = ioService.newChannelFromURI(webURL).QueryInterface(Components.interfaces.nsIHttpChannel);
    dlChannel.referrer=webURL;
    dlChannel.requestMethod="GET";

    var downloadListener={
      _contentlength : 0,
      onDataAvailable: function (channel, ctxt, inStr, sourceOffset, count) {
        // reading the response data from the HTTP response
        var binStream = Components.classes['@mozilla.org/binaryinputstream;1'].createInstance(Components.interfaces.nsIBinaryInputStream);
        binStream.setInputStream(inStr);
        var retArray=binStream.readByteArray(count);
        ctxt.writeByteArray(retArray,count);
        this._contentlength+=count;
        if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onDataAvailableEventName,this._contentlength);
        return; },
      onStartRequest: function (channel, ctxt) {
        if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onStartRequestEventName,null);
        return; },
      onStopRequest: function (channel, ctxt, status) {
        fileStream.close();
        if(channel.responseStatus!=201)
          if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onErrorEventName,null);
        if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onStopRequestEventName,null);
        return; }
    };

    dlChannel.asyncOpen(downloadListener,binOutputStream);

  } catch (e) {
    //error handling
    if(observerObj!=null) observerObj.observerService.notifyObservers(null,observerObj.onErrorEventName,e);
      else throw e;
  }
  return dlChannel;
}

//*****************************************************************************
function webdav_move(originalpath,movetowebpath,overwrite,username,password) {
  var HTTPheaders=[["Connection","TE"],["TE","trailers, deflate, gzip, compress"],["Overwrite",( overwrite ? "T" : "F")],["Translate","f"],["Content-type","text/xml"],["Destination",movetowebpath]];
  var xmlReq="<?xml version=\"1.0\"?>"
    +"<A:propertybehavior xmlns:A=\"DAV:\">"
    +"<A:keepalive>*</A:keepalive>"
    +"</A:propertybehavior>";
  try {
    var responseObj=sendXMLRequest(originalpath,"MOVE",HTTPheaders,xmlReq,username,password);
  } catch(e) {
    throw e;
  }
  return responseObj;
}

//*****************************************************************************
function webdav_copy(originalpath,copytowebpath,overwrite,username,password) {
  var HTTPheaders=[["Connection","TE"],["TE","trailers, deflate, gzip, compress"],["Overwrite",( overwrite ? "T" : "F")],["Translate","f"],["Content-type","text/xml"],["Destination",copytowebpath]];
  var xmlReq="<?xml version=\"1.0\"?>"
    +"<A:propertybehavior xmlns:A=\"DAV:\">"
    +"<A:keepalive>*</A:keepalive>"
    +"</A:propertybehavior>";
  try {
    var responseObj=sendXMLRequest(originalpath,"COPY",HTTPheaders,xmlReq,username,password);
  } catch(e) {
    throw e;
  }
  return responseObj;
}

//*****************************************************************************
function webdav_lock(webdavURL,lockscope,locktype,owner,timeout,username,password) {
  var retObj = { status : 0, response : "", responseHeaders: new Array() };
  var HTTPheaders=[["Connection","TE"],["Timeout",timeout],["Translate","f"]];
  var xmlReq="<?xml version=\"1.0\"?>"
    +"<D:lockinfo xmlns:D=\"DAV:\">"
    +"<D:lockscope>"+lockscope+"</D:lockscope>"
    +"<D:locktype>"+locktype+"</D:locktype>"
    +"<D:owner>"+owner+"</D:owner>"
    +"</D:lockinfo>";
  try {
    var responseObj=sendXMLRequest(webdavURL,"LOCK",HTTPheaders,xmlReq,username,password);
  } catch(e) {
    throw e;
  }
  return responseObj;
}

//*****************************************************************************
function webdav_unlock(webdavURL,locktoken,username,password) {
  var HTTPheaders=[["Connection","close"],["Lock-Token","<"+locktoken+">"],["Translate","f"]];
  try {
    var responseObj=sendXMLRequest(webdavURL,"UNLOCK",HTTPheaders,null,username,password);
  } catch(e) {
    throw e;
  }
  return responseObj;
}

//*****************************************************************************
//the expected XML format of propertyUpdate is:
//XXX the problem is the rigid format, it would be better just to pass the ...properties part
//namespaces would be added to the propertyupdate node !
//<D:propertyupdate xmlns:D="DAV:">
//  <D:remove>
//    ...properties
//  </D:remove>
//  <D:set>
//    ...properties
//  </D:set>
//</D:propertyupdate>
function webdav_proppatch(webdavURL,propertyUpdate,username,password) {
  var HTTPheaders=[["Connection","TE"],["TE","trailers, deflate, gzip, compress"],["Translate","f"]];
  var xmlReq="<?xml version=\"1.0\"?>\r\n"+propertyUpdate;
//    +"<D:propertyupdate xmlns:D=\"DAV:\" xmlns:Z=\"http://www.w3.com/standards/z39.50/\">";
//  if(propRemove) xmlReq+="<D:remove>"+propRemove+"</D:remove>\r\n";
//  if(propSet) xmlReq+="<D:set>"+propSet+"</D:set>\r\n";
//  xmlReq+="</D:propertyupdate>";
  try {
    var responseObj=sendXMLRequest(webdavURL,"PROPPATCH",HTTPheaders,xmlReq,username,password);
  } catch(e) {
    throw e;
  }
  return responseObj;
}

//*****************************************************************************
// XML structure
// multistatus
//   response(*)
//     href(1)
//     propstat(*)
//       prop(*)
//         ...
//       status(1)
//
// example:
// multistat[0].href = hello.txt
// multistat[0].props[$propname].value = text/html
// multistat[0].props[$propname].status = HTTP 1.1 404 ...
// multistat[0].props[$propname].type = [ 1: normal string(text), 3: XML content ]

function processMultiResponse(XMLdata) {
  var respDOMParser=new DOMParser();
  var serializer=new XMLSerializer();
  var xmlDoc=respDOMParser.parseFromString(XMLdata,"text/xml");
  var nsIDOMXPathEvaluator = Components.classes["@mozilla.org/dom/xpath-evaluator;1"].getService(Components.interfaces.nsIDOMXPathEvaluator);
  var NSresolver=nsIDOMXPathEvaluator.createNSResolver(xmlDoc.getElementsByTagName("multistatus")[0]);
  var c_response=XPathNumber(nsIDOMXPathEvaluator,"count(/D:multistatus/D:response)",xmlDoc,NSresolver);
  var multiStat=new Array(c_response);
  for(var i=0; i<c_response; i++) {
    var n_response=XPathNode(nsIDOMXPathEvaluator,"/D:multistatus/D:response["+(i+1)+"]",xmlDoc,NSresolver);
    NSresolver=nsIDOMXPathEvaluator.createNSResolver(n_response);
    var r_href=XPathString(nsIDOMXPathEvaluator,"string(/D:multistatus/D:response["+(i+1)+"]/D:href)",xmlDoc,NSresolver);
    var c_propstat=XPathNumber(nsIDOMXPathEvaluator,"count(/D:multistatus/D:response["+(i+1)+"]/D:propstat)",xmlDoc,NSresolver);
    multiStat[i]= { href : "", props: new Array() };
    multiStat[i].href=r_href;
    for(var j=0; j<c_propstat; j++) {
      var r_status=XPathString(nsIDOMXPathEvaluator,"string(/D:multistatus/D:response["+(i+1)+"]/D:propstat["+(j+1)+"]/D:status)",xmlDoc,NSresolver);
// Some property may have children nodes, for example: <D:getcontenttype>
// Support for the children tags need to be implemented
      var n_props=XPathNode(nsIDOMXPathEvaluator,"/D:multistatus/D:response["+(i+1)+"]/D:propstat["+(j+1)+"]/D:prop",xmlDoc,NSresolver);
      var allprops=n_props.childNodes;
      for(var k=0; k<allprops.length; k++) {
        if(allprops[k].nodeType==1) {
          var propName=nodeNameWithoutNS(allprops[k].nodeName);
          var propValue=null;
          var propType=0;
          if(allprops[k].hasChildNodes()) {
            propType=allprops[k].firstChild.nodeType;
            // if there are child nodes, we want to store the XML as a value for further processing
            if(propType==1) propValue=serializer.serializeToString(allprops[k].firstChild);
            // are there any non XML values ?
            if(propType==3) propValue=allprops[k].firstChild.nodeValue;
          }
          multiStat[i].props[propName]= { value: propValue, status: r_status, type: propType };
        }
      }
    }
  }
  return multiStat;
}

//*****************************************************************************
// process the resourcetype property and return the type 
function processResourcetype(propValue) {
  if(propValue==null) return "";
  // is it good ? should it be more complicated ?
  if(propValue.indexOf("collection")!=-1) return ":collection"; // :collection is a special type
    else if(propValue.indexOf("<")==-1) return propValue; // if there is no node XML content, then it is simply a mime type
  return "";
}

//*****************************************************************************
// process the lockdiscovery property and return an object with the lock details
// return object has the following attributes:
// depth , timeout , locktype , lockscope , locktoken , owner
// all attributes are plain text, all child nodes are processed or converted
function processLockdiscovery(propValue) {
  if(propValue==null) return null;
  var retObj=new Object;
  try {
    var respDOMParser=new DOMParser();
    var xmlDoc=respDOMParser.parseFromString("<?xml version=\"1.0\"?>"+propValue,"text/xml");
    var nsIDOMXPathEvaluator = Components.classes["@mozilla.org/dom/xpath-evaluator;1"].getService(Components.interfaces.nsIDOMXPathEvaluator);
    var NSresolver=nsIDOMXPathEvaluator.createNSResolver(xmlDoc.getElementsByTagName("activelock")[0]);
    retObj.depth=XPathString(nsIDOMXPathEvaluator,"string(/D:activelock/D:depth)",xmlDoc,NSresolver);
    retObj.timeout=XPathString(nsIDOMXPathEvaluator,"string(/D:activelock/D:timeout)",xmlDoc,NSresolver);
    var n_locktype=XPathNode(nsIDOMXPathEvaluator,"/D:activelock/D:locktype",xmlDoc,NSresolver);
    retObj.locktype=nodeNameWithoutNS(n_locktype.firstChild.nodeName);
    var n_lockscope=XPathNode(nsIDOMXPathEvaluator,"/D:activelock/D:lockscope",xmlDoc,NSresolver);
    retObj.lockscope=nodeNameWithoutNS(n_lockscope.firstChild.nodeName);
    retObj.locktoken=XPathString(nsIDOMXPathEvaluator,"string(/D:activelock/D:locktoken/D:href)",xmlDoc,NSresolver);
    NSresolver=nsIDOMXPathEvaluator.createNSResolver(xmlDoc.getElementsByTagName("owner")[0]);
    retObj.owner=XPathString(nsIDOMXPathEvaluator,"string(/D:activelock/ns0:owner)",xmlDoc,NSresolver);
  } catch (e) {
    return null;
  }
  return retObj;
}

//*****************************************************************************
function XPathNode(xpatheval,query,dom,nsresolver) {
  try {
    var result=XPathResult(xpatheval,query,dom,nsresolver,4);
    return result.iterateNext();
  } catch(e) {
    throw e;
  }
}

function XPathNumber(xpatheval,query,dom,nsresolver) {
  try {
    var result=XPathResult(xpatheval,query,dom,nsresolver,1);
    return result.numberValue;
  } catch(e) {
    throw e;
  }
}

function XPathString(xpatheval,query,dom,nsresolver) {
  try {
    var result=XPathResult(xpatheval,query,dom,nsresolver,2);
    return result.stringValue;
  } catch(e) {
    throw e;
  }
}

function XPathResult(xpatheval,query,dom,nsresolver,rtype) {
  var result=xpatheval.evaluate(query,dom,nsresolver,rtype,null);
  return result;
}

function nodeNameWithoutNS(nodeName) {
  return nodeName.substr(nodeName.indexOf(':')+1);
}
