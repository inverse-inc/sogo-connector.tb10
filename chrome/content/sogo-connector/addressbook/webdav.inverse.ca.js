/********************************************************************************
Copyright:	Inverse groupe conseil, 2006-2007 
   Author: 		Robert Bolduc
   Email:		support@inverse.ca 
   URL:			http://inverse.ca
   
   Contributor: Ralf Becker
   
   This file is part of "SOGo Connector" a Thunderbird extension.

   "SOGo Connector" is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License version 2 as published by
   the Free Software Foundation;

"SOGo Connector" is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with "SOGo Connector"; if not, write to the Free Software
      Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 ********************************************************************************/
Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader).loadSubScript("chrome://sogo-connector/content/addressbook/webdav_lib/webdavAPI.js");

function getMessengerWindow(){
	return Components.classes["@mozilla.org/appshell/window-mediator;1"]
		.getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:3pane");
}

function noConnectionToWebDAVMsg(win,boxTitle){
	messageBox(win,boxTitle,"Cannot connect to Server to synchronize the data!\n\n Verify that Thunderbird is not in offline mode.\n"  +
			"Verify your network connection.\n Verify that you GroupDAV Server is available.");
}

function webDavTestFolderConnection(url){
	var propsList = new Array("<D:getcontentlength/>");
	try{
		var responseObj=webdav_propfind(url, propsList, null, null); //Let Thunderbird Password Manager handle user and password
		return true;
	}catch (e){
		return false;
	}
}

function webdavAddVcard(webdavURL ,dataString, key,  observerObj, observerService){
	webdavPutString(webdavURL ,dataString, key, "text/x-vcard; charset=UTF-8", observerObj, observerService, true);
}

function webdavUpdateVcard(webdavURL ,dataString, key, observerObj, observerService){
	webdavPutString(webdavURL ,dataString, key, "text/x-vcard; charset=UTF-8", observerObj, observerService, false);
}

function webdavPutString(webdavURL ,dataString, key, contentType, observerObj, observerService, isNew) {

	var uploadListener = {		   
		onDataAvailable: function (channel, ctxt, inStr, sourceOffset, count){
			return;
		},
		onStartRequest: function (channel, ctxt){
			return; 
		},
		onStopRequest: function (channel, ctxt, status){
			var state = "";	
			try{			
				var httpChannel = channel.QueryInterface(this.components.interfaces.nsIHttpChannel);
				if (this.components.results.NS_ERROR_NOT_AVAILABLE == status){
					logWarn("Upload failure:\n\n" +NS_ERROR_NOT_AVAILABLE + "("+  status +")");
					state = "<state><status>" + "No Connection to server!  " +  status +"</status><url>" + webdavURL + "</url><context>" + ctxt + "</context></state>";    	 
					observerService.notifyObservers(window, SynchProgressMeter.UPLOAD_ERROR_EVENT, state);
					return;
				}else if(httpChannel.responseStatus < 200 || httpChannel.responseStatus > 205){
					logWarn("Upload failure, the server could not process the card (google the HTTP status code for more information).\n\n\n"  + "Server HTTP Status Code:"+ httpChannel.responseStatus );
					if(observerService!=null){
						state = "<state><status>" + httpChannel.responseStatus + "</status><url>" + webdavURL + "</url></state>";
//							+ httpChannel.getResponseHeader("etag") + "</etag><key>" + key + "</key></state>";
							+ httpChannel.getResponseHeader("etag") + "</etag><key>" + key + "</key>";

						if (isNew) {	// for new cards check if we got a location header
							var location = httpChannel.getResponseHeader("location");
							if (location && location.lastIndexOf('/') >= 0) {	// new url/key via location header
								state += "<location>" + location.substr(location.lastIndexOf('/')+1) + "</location>";
							}
						}
						state += "</state>";						
						observerService.notifyObservers(window, SynchProgressMeter.UPLOAD_ERROR_EVENT, state);
						return;
					}
				}else{
					if(observerService!=null){
						state = "<state><newCard>" + isNew + "</newCard><etag>" 
							+ httpChannel.getResponseHeader("etag") + "</etag><key>" + key + "</key></state>";
						
						observerService.notifyObservers(window, SynchProgressMeter.UPLOAD_STOP_REQUEST_EVENT, state);
						return; 
					}	     
				}
			}catch(e){
				state = "<state><status>" + e + "\n File: "+  e.fileName + "\n Line: " + e.lineNumber + "\n\n Stack:\n\n" + e.stack+ "</status>" 
					+ "<url>" + webdavURL + "</url></state>";

				observerService.notifyObservers(window, SynchProgressMeter.UPLOAD_ERROR_EVENT, state);		   	
			}
		}
	};
	uploadListener.components = Components; // To get a handle on Components inside the listener!!!

	try{
		var stream = Components.classes['@mozilla.org/io/string-input-stream;1'].createInstance(Components.interfaces.nsIStringInputStream);
		
		var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		converter.charset = "UTF-8";
		var stringUTF8 = converter.ConvertFromUnicode(dataString);
		
		stream.setData (stringUTF8, stringUTF8.length);		

		var webURL = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURL);
		webURL.spec = webdavURL;

		var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		var channel = ios.newChannelFromURI(webURL).QueryInterface(Components.interfaces.nsIHttpChannel);
		channel.referrer=webURL;
		channel.requestMethod="PUT";

		var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
		uploadChannel.setUploadStream(stream, contentType, stringUTF8.length );
		//uploadChannel.setUploadStream(streamUTF8, contentType, -1 );

		logDebug("Sending card: " + key + "\n" +  stringUTF8);
		uploadChannel.asyncOpen(uploadListener, null);
	}catch (e){
	//error handling
		if(observerObj!=null){ 
			observerService.notifyObservers(window,observerObj.onErrorEventName,e);
		}
		getMessengerWindow().exceptionHandler(null,"webdavPutString.uploadListener.onStopRequest",e);	
	}
}

function buildCardDavReportXML(filter){

	var xml = '<?xml version="1.0" encoding="UTF-8"?>' +
				'<addressbook-query xmlns:D="DAV:" xmlns="urn:ietf:params:xml:ns:carddav">' +
					'<D:prop><D:getetag/><addressbook-data/></D:prop>' +
					'<filter>' +
						'<prop-filter name="mail">' +
							'<text-match collation="i;unicasemap" match-type="substring">' + filter + '</text-match>' +
						'</prop-filter>' +
					'</filter>' +
       			'<prop-filter name="FN">' +
         			'<text-match collation="i;unicasemap" match-type="substring">' + filter + '</text-match>' +
       			'</prop-filter>' +
				'</addressbook-query>';
	return xml;
}

// send WebDAV XML request
function sendXMLRequestXPCOM(webdavURL,HTTPmethod,HTTPheaders,XMLreq) {
 	var retObj = { status : 0, response : "", responseHeaders: new Array() };
	try {
		var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
		
		// QI the object to nsIDOMEventTarget to set event handlers on it:
		request.QueryInterface(Components.interfaces.nsIDOMEventTarget);
//		request.addEventListener("progress", function(evt) {dump("sendXMLRequestXPCOM.progress()"); }, false);
//		request.addEventListener("load", function(evt) {dump("sendXMLRequestXPCOM.load()");}, false);
//		request.addEventListener("error", function(evt) { throw "sendXMLRequestXPCOM(): Problem connecting to the server" }, false);

		// QI it to nsIXMLHttpRequest to open and send the request:
		request.QueryInterface(Components.interfaces.nsIXMLHttpRequest);

		request.open(HTTPmethod,webdavURL,false,null,null);
		for(var i=0; i<HTTPheaders.length; i++){
			request.setRequestHeader(HTTPheaders[i][0],HTTPheaders[i][1]);
		}
		request.setRequestHeader("Accept-Encoding", "");
		request.send(XMLreq);
    
		retObj.status=request.status;
		retObj.response=request.responseXML;
		retObj.responseHeaders=processHTTPHeaders(request.getAllResponseHeaders());
  } catch(e) {
    throw e;
  }
  return retObj;
}

function cardDavReport(webdavURL, filter) {

  var xmlReq = buildCardDavReportXML(filter);

  //var HTTPheaders=[["Connection","TE"],["TE","trailers, deflate, gzip, compress"],["Depth","1"],["Translate","f"],["Content-type","text/xml"]];
  var HTTPheaders=[["Connection","TE"],["TE","trailers"],["Content-type","text/xml"]];
  try {
    // send out the XML request
    var responseObj = sendXMLRequestXPCOM(webdavURL, "REPORT", HTTPheaders, xmlReq, null, null);
  } catch(e) {
    throw e;
  }
	switch(responseObj.status){      
		case 207:
		case 200: // Added to support Open-Xchange   
			var doc = responseObj.response;
			if (doc == null){
				throw "The Server response to REPORT is malformed!";
			}
			break;
		default:
			throw "cardDavReport(): Error connecting to the Server; response status: " + responseObj.status;      			
	}  
  return doc;
}

// Returns a string
function getABDavURL( abUri ){
	// Matching the URL
	var reg = new RegExp(/moz-abdavdirectory:\/\/(.*)/);

	if ( !reg.test(abUri)){
		//return null;
		return "http://sogo.inverse.ca/SOGo/dav/rbolduc/Contacts/personal/";
	}else{
		return RegExp.$1;	
	}
}