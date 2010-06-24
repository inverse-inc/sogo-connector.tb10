/* webdav.inverse.ca.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

function jsInclude(files, target) {
    var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                           .getService(Components.interfaces.mozIJSSubScriptLoader);
    for (var i = 0; i < files.length; i++) {
        try {
            loader.loadSubScript(files[i], target);
        }
        catch(e) {
            dump("webdav.inverse.ca.js: failed to include '" + files[i] + "'\n" + e + "\n");
        }
    }
}

jsInclude(["chrome://inverse-library/content/sogoWebDAV.js",
           "chrome://sogo-connector/content/general/webdav_lib/webdavAPI.js",
           "chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js"]);

function getMessengerWindow() {
    return Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:3pane");
}

function noConnectionToWebDAVMsg(win,boxTitle){
    messageBox(win,boxTitle,"Cannot connect to Server to synchronize the data!\n\n Verify that Thunderbird is not in offline mode.\n"  +
               "Verify your network connection.\n Verify that you GroupDAV Server is available.");
}

function webDavTestFolderConnection(url){
    var testResult = false;

    var propsList = new Array("<D:getcontentlength/>");
    try {
        //Let Thunderbird Password Manager handle user and password
        var responseObj = webdav_propfind(url, propsList, null, null);
        testResult = true;
    }
    catch (e) {}

    return testResult;
}

function buildCardDavReportXML(filter) {
    var xml = ('<?xml version="1.0" encoding="UTF-8"?>'
               + '<C:addressbook-query xmlns:D="DAV:"'
               + ' xmlns:C="urn:ietf:params:xml:ns:carddav">'
               + '<D:prop><D:getetag/><C:addressbook-data/></D:prop>'
               + '<C:filter><C:prop-filter name="mail">'
               + '<C:text-match collation="i;unicasemap" match-type="starts-with">'
               + xmlEscape(filter)
               + '</C:text-match></C:prop-filter></C:filter>'
               + '</C:addressbook-query>');
    //  +
    //        			'<prop-filter name="FN">' +
    //          			'<text-match collation="i;unicasemap" match-type="substring">' + filter + '</text-match>' +
    //        			'</prop-filter>' +
    // 		+ '</addressbook-query>';

    return xml;
}

function sendXMLRequestXPCOM(webdavURL,HTTPmethod,HTTPheaders,XMLreq) {
    var retObj = { status : 0, response : "", responseHeaders: new Array() };

    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);
    if (!ioService.offline) {
        var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                                .createInstance(Components.interfaces.nsIXMLHttpRequest);
        request.open(HTTPmethod, webdavURL, false);

        // 	var timeoutCallback = {
        // 	notify: function nsITimerNotify(timer) {
        // 			dump("die\n");
        // 			request.abort();
        // 			dump("request.channel: " + request.channel + "\n");
        // 		}
        // 	}

        // 	var timer = Components.classes["@mozilla.org/timer;1"]
        // 		.createInstance(Components.interfaces.nsITimer);
        // 	timer.initWithCallback(timeoutCallback, 5000,
        // 												 Components.interfaces.nsITimer.TYPE_ONE_SHOT);

        for (var i = 0; i< HTTPheaders.length; i++)
            request.setRequestHeader(HTTPheaders[i][0], HTTPheaders[i][1]);
        request.setRequestHeader("Accept-Encoding", "");
        request.send(XMLreq);

        // 	timer.cancel();

        retObj.status = request.status;
        retObj.response = request.responseXML;
        retObj.responseHeaders = processHTTPHeaders(request.getAllResponseHeaders());
    }

    return retObj;
}

function AsyncCardDavReport(webdavURL, filter, target) {
    var timestamp = Date.now();
    var report = new sogoWebDAV(webdavURL, target, timestamp, true);
    report.report(buildCardDavReportXML(filter));

    return timestamp;
}

function cardDavReport(webdavURL, filter) {
    //    dump("cardDavReport(webdavURL, filter): " + webdavURL
    // 				+ ", " + filter + "\n");
    var xmlReq = buildCardDavReportXML(filter);

    //var HTTPheaders=[["Connection","TE"],["TE","trailers, deflate, gzip, compress"],["Depth","1"],["Translate","f"],["Content-type","text/xml"]];
    var HTTPheaders=[["Connection","TE"],["TE","trailers"],
                     ["Content-type","text/xml; charset=utf8"],
                     ["Depth", "1"]];
    // send out the XML request
    var responseObj = sendXMLRequestXPCOM(webdavURL, "REPORT", HTTPheaders, xmlReq, null, null);
    switch(responseObj.status) {
    case 207:
    case 200: // Added to support Open-Xchange
        var doc = responseObj.response;
        if (doc == null) {
            throw "The Server response to REPORT is malformed!";
        }
        break;
    default:
        throw "cardDavReport(): Error connecting to the Server; response status: "
            + responseObj.status;
    }

    return doc;
}

// // Returns a string
// function getABDavURL( abUri ){
// 	// Matching the URL
// 	if (abUri.indexOf("https") > 0)
// 		abUri = abUri.replace(/https\/\//,"https://"); // I am fed up!
// 	else
// 		abUri = abUri.replace(/http\/\//,"http://"); // UGLY patch

// 	dump("getABDavURL: ");
// 	dump(abUri);
// 	dump("\n");
// 	var reg = new RegExp(/carddav:\/\/(.*)/);

// 	if ( !reg.test(abUri)){
// 		dump("WTFFFFFFFFFFFFFFFFFFFFFFFFFFff\n");
// 		return null;
// 	}else{
// 		dump("getABDavURL: ");
// 		dump(RegExp.$1);
// 		dump("\n");
// 		return RegExp.$1;
// 	}
// }
