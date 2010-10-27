/* sogoWebDAV.js - This file is part of "SOGo Connector", a Thunderbird extension.
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
    let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                           .getService(Components.interfaces.mozIJSSubScriptLoader);
    for (let i = 0; i < files.length; i++) {
        try {
            loader.loadSubScript(files[i], target);
        }
        catch(e) {
            dump("sogoWebDAV.js: failed to include '" + files[i] +
                 "'\n" + e
                 + "\nFile: " + e.fileName
                 + "\nLine: " + e.lineNumber + "\n\n Stack:\n\n" + e.stack);
        }
    }
}

jsInclude(["chrome://inverse-library/content/uuid.js"]);

function backtrace(aDepth) {
    let depth = aDepth || 10;
    let stack = "";
    let frame = arguments.callee.caller;

    for (let i = 1; i <= depth && frame; i++) {
        stack += i+": "+ frame.name + "\n";
        frame = frame.caller;
    }

    return stack;
}

function XMLToJSONParser(doc) {
    this._buildTree(doc);
}

XMLToJSONParser.prototype = {
    _buildTree: function XMLToJSONParser_buildTree(doc) {
        let nodeName = doc.documentElement.localName;
        this[nodeName] = [this._translateNode(doc.documentElement)];

        // 		dump("Parsed XMLToJSON object: " + dumpObject(this) + "\n");
    },
    _translateNode: function XMLToJSONParser_translateNode(node) {
        let value = null;

        if (node.childNodes.length) {
            let textValue = "";
            let dictValue = {};
            let hasElements = false;
            for (let i = 0; i < node.childNodes.length; i++) {
                let currentNode = node.childNodes[i];
                let nodeName = currentNode.localName;
                if (currentNode.nodeType
                    == Components.interfaces.nsIDOMNode.TEXT_NODE)
                    textValue += currentNode.nodeValue;
                else if (currentNode.nodeType
                         == Components.interfaces.nsIDOMNode.ELEMENT_NODE) {
                    hasElements = true;
                    let nodeValue = this._translateNode(currentNode);
                    if (!dictValue[nodeName])
                        dictValue[nodeName] = [];
                    dictValue[nodeName].push(nodeValue);
                }
            }

            if (hasElements)
                value = dictValue;
            else
                value = textValue;
        }

        return value;
    }
};

function xmlEscape(text) {
    return text.replace("&", "&amp;", "g").replace("<", "&lt;", "g");
}

function xmlUnescape(text) {
    let s = (""+text).replace(/&lt;/g, "<", "g");
    s = s.replace(/&gt;/g, ">", "g");
    s = s.replace(/&amp;/g, "&",  "g");

    return s;
}

function _parseHeaders(rawHeaders) {
    let headers = {};

    if (rawHeaders) {
        let lines = rawHeaders.split("\n");
        let currentKey = null;

        for each (let line in lines) {
            if (line.length) {
                let firstChar = line.charCodeAt(0);
                if (firstChar != 32 && firstChar != 9) {
                    let keyEnd = line.indexOf(":");
                    currentKey = line.substr(0, keyEnd).toLowerCase();
                    let values = headers[currentKey];
                    if (!values) {
                        values = [];
                        headers[currentKey] = values;
                    }
                    values.push(line.substr(keyEnd + 2));
                }
            }
        }
    }

    return headers;
}

function onXMLRequestReadyStateChange(request, synchronous) {
    // 	dump("xmlreadystatechange: " + request.readyState + "\n");
    if (synchronous || request.readyState == 4) {
        if (request.client.target) {
            let status;
            let responseHeaders;
            try {
                status = request.status;
                responseHeaders = request.getAllResponseHeaders();
            }
            catch(e) {
                dump("trapped exception: " + e + "\n");
                status = 499;
                responseHeaders = "";
            }

            try {
                // 				dump("method: " + request.method + "\n");
                // 				dump("status code: " + request.readyState + "\n");
                let headers;
                let response;
                if (status == 499) {
                    headers = {};
                    response = "";
                    dump("received status 499 for url: " + request.client.url + "\n");
                }
                else {
                    headers = _parseHeaders(responseHeaders);
                    if (request.client.requestJSONResponse
                        || request.client.requestXMLResponse) {
                        let flatCType;
                        if (headers["content-type"]) {
                            flatCType = headers["content-type"][0];
                        } else {
                            flatCType = "";
                        }

                        /* The length must be > 0 to avoid attempts of passing empty
                         responses to the XML parser, which would trigger an
                         exception. */
                        let flatCLength;
                        if (headers["content-length"]) {
                            flatCLength = parseInt(headers["content-length"][0]);
                        } else {
                            if (request.responseText) {
                                /* The "Content-Length" header may not be present, for example
                                 with a chunked transfer encoding. In that case we deduce
                                 the length from the response string. */
                                flatCLength = request.responseText.length;
                            }
                            else {
                                dump("sogoWebDAV.js: response has no content-length"
                                     + " and no response text\n");
                                flatCLength = 0;
                            }
                        }
                        if ((flatCType.indexOf("text/xml") == 0
                             || flatCType.indexOf("application/xml") == 0)
                            && flatCLength > 0 && request.responseXML) {
                            if (request.client.requestJSONResponse) {
                                let parser = new XMLToJSONParser(request.responseXML);
                                response = parser;
                            }
                            else {
                                response = request.responseXML;
                            }
                        }
                        else {
                            response = null;
                        }
                    }
                    else {
                        response = request.responseText;
                    }
                }

                request.client.target.onDAVQueryComplete(status,
                                                         response,
                                                         headers,
                                                         request.client.cbData);
            }
            catch(e) {
                dump("sogoWebDAV.js 1: an exception occured\n" + e + "\n"
                     + e.fileName + ":" + e.lineNumber + "\n");
            }
        }
        request.client = null;
        request.onreadystatechange = null;
    }
}

function sogoWebDAV(url, target, data, synchronous) {
    this.url = url;
    this.target = target;
    this.cbData = data;
    this.requestJSONResponse = false;
    this.requestXMLResponse = false;
    if (typeof synchronous == "undefined") {
        this.synchronous = false;
    }
    else {
        this.synchronous = synchronous;
    }
}

sogoWebDAV.prototype = {
    _sendHTTPRequest: function(method, parameters, headers) {
        let xmlRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                                   .createInstance(Components.interfaces.nsIXMLHttpRequest);

        xmlRequest.open(method, this.url, !this.synchronous);
        if (headers) {
            for (let header in headers) {
                xmlRequest.setRequestHeader(header, String(headers[header]));
            }
        }
        xmlRequest.url = this.url;
        xmlRequest.client = this;
        xmlRequest.method = method;

        if (!this.synchronous) {
            let thisRequest = xmlRequest;
            xmlRequest.onreadystatechange = function() {
                onXMLRequestReadyStateChange(thisRequest, false);
            };
        }

        xmlRequest.send(parameters);
        if (this.synchronous) {
            onXMLRequestReadyStateChange(xmlRequest, true);
        }
    },

    load: function(operation, parameters) {
        if (operation == "GET") {
            this._sendHTTPRequest(operation);
        }
        else if (operation == "PUT" || operation == "POST") {
            this._sendHTTPRequest(operation,
                                  parameters.data,
                                  { "content-type": parameters.contentType });
        }
        else if (operation == "PROPFIND") {
            let headers = { "depth": (parameters.deep
                                      ? "1": "0"),
                            "content-type": "application/xml; charset=utf8" };
            let query = this._propfindQuery(parameters.props);
            this._sendHTTPRequest(operation, query, headers);
        }
        else if (operation == "REPORT") {
            let headers = { "depth": (parameters.deep
                                      ? "1": "0"),
                            "Connection": "TE",
                            "TE": "trailers",
                            "content-type": "application/xml; charset=utf8" };
            this._sendHTTPRequest(operation, parameters.query, headers);
        }
        else if (operation == "MKCOL") {
            this._sendHTTPRequest(operation, parameters);
        }
        else if (operation == "DELETE") {
            this._sendHTTPRequest(operation, parameters);
        }
        else if (operation == "PROPPATCH") {
            let headers = { "content-type": "application/xml; charset=utf8" };
            this._sendHTTPRequest(operation, parameters, headers);
        }
        else if (operation == "OPTIONS") {
            this._sendHTTPRequest(operation, parameters);
        }
        else
            throw ("operation '" + operation + "' is not currently supported");
    },
    get: function() {
        this.load("GET");
    },
    put: function(data, contentType) {
        this.load("PUT", {data: data, contentType: contentType});
    },
    post: function(data, contentType) {
        if (typeof(contentType) == "undefined") {
            contentType = "application/xml; charset=utf8";
        }
        this.load("POST", {data: data, contentType: contentType});
    },
    _propfindQuery: function(props) {
        let nsDict = { "DAV:": "D" };
        let propPart = "";
        let nsCount = 0;
        for each (let prop in props) {
            let propParts = prop.split(" ");
            let ns = propParts[0];
            let nsS = nsDict[ns];
            if (!nsS) {
                nsS = "x" + nsCount;
                nsDict[ns] = nsS;
                nsCount++;
            }
            propPart += "<" + nsS + ":" + propParts[1] + "/>";
        }
        let query = ("<?xml version=\"1.0\"?>\n"
                     + "<D:propfind");
        for (let ns in nsDict)
            query += " xmlns:" + nsDict[ns] + "=\"" + ns + "\"";
        query += ("><D:prop>" + propPart + "</D:prop></D:propfind>");

        return query;
    },
    options: function() {
        this.load("OPTIONS");
    },
    propfind: function(props, deep) {
        this.requestJSONResponse = true;
        if (typeof deep == "undefined")
            deep = true;
        this.load("PROPFIND", {props: props, deep: deep});
    },
    mkcol: function() {
        this.load("MKCOL");
    },
    delete: function() {
        this.load("DELETE");
    },
    report: function(query, deep) {
        if (typeof deep == "undefined")
            deep = true;
        this.load("REPORT", {query: query, deep: deep});
    },
    proppatch: function(query) {
        this.requestJSONResponse = true;
        this.load("PROPPATCH", query);
    }
};
