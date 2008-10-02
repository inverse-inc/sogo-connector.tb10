/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

function jsInclude(files, target) {
 	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		.getService(Components.interfaces.mozIJSSubScriptLoader);
	for (var i = 0; i < files.length; i++) {
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
	var depth = aDepth || 10;
	var stack = "";
	var frame = arguments.callee.caller;

	for (var i = 1; i <= depth && frame; i++) {
		stack += i+": "+ frame.name + "\n";
		frame = frame.caller;
	}

	return stack;
}

function multiStatusParser(doc) {
	this.document = doc;
}

multiStatusParser.prototype = {
 document: null,
 responses: function() {
		var responses = null;
		if (this.document) {
			responses = {};
			var nodes = this._getNodes(this.document, "multistatus");
			if (nodes && nodes.length > 0) {
				nodes = this._getNodes(nodes[0], "response");
				for (var i = 0; i < nodes.length; i++) {
					var hrefNodes = this._getNodes(nodes[i], "href");
					var href = this._parseNode(hrefNodes[0]);
					var propstats = this._getPropstats(nodes[i]);

					responses[href] = propstats;
				}
			}
		}

		return responses;
	},
 _getNodes: function(topNode, tag) {
		var nodes = new Array();

		for (var i = 0; i < topNode.childNodes.length; i++) {
			var currentNode = topNode.childNodes[i];
			if (currentNode.nodeType
					== Components.interfaces.nsIDOMNode.ELEMENT_NODE
					&& currentNode.localName == tag)
				nodes.push(currentNode);
		}

		// 		dump("returning " + nodes.length + " nodes for tag '" + tag + "'\n");

		return nodes;
	},
 _getPropstats: function(topNode) {
		var propstats = {};
		var nodes = this._getNodes(topNode, "propstat");
		for (var i = 0; i < nodes.length; i++) {
			var rawStatus = this._getNodes(nodes[i], "status")[0]
				.childNodes[0].nodeValue;
			var status = this._parseStatus("" + rawStatus);
			var props = this._getProps(nodes[i]);
			if (propstats[status])
				for (var prop in props)
					propstats[status][prop] = props[prop];
			else
				propstats[status] = props;
		}

		return propstats;
	},
 _parseStatus: function(status) {
		var code = -1;

		if (status.indexOf("HTTP/1.1") == 0) {
			var words = status.split(" ");
			code = parseInt(words[1]);
		}

		return code;
	},
 _getProps: function(topNode) {
		var props = {};

		var nodes = this._getNodes(topNode, "prop")[0].childNodes;
		for (var i = 0; i < nodes.length; i++) {
			if (nodes[i].nodeType == 1
					== Components.interfaces.nsIDOMNode.ELEMENT_NODE)
				props[nodes[i].localName] = this._parseNode(nodes[i]);
		}

		return props;
	},
 _parseNode: function(node) {
		var data;
		if (node) {
			data = true;
			var nodes = node.childNodes;
// 			dump("node: " + node.tagName + "; length: " + nodes.length + "\n");
			if (nodes.length > 0) {
				if (nodes[0].nodeType
						== Components.interfaces.nsIDOMNode.ELEMENT_NODE) {
					data = {};
					for (var i = 0; i < nodes.length; i++)
						data[nodes[i].localName] = this._parseNode(nodes[i]);
				}
				else
					if (nodes[0].nodeType
							== Components.interfaces.nsIDOMNode.TEXT_NODE)
						data = nodes[0].nodeValue;
			}
		}
		else
			data = false;

		return data;
	}
};

function xmlEscape(text) {
	return text.replace("&", "&amp;", "g").replace("<", "&lt;", "g");
}

function xmlUnescape(text) {
	var s = (""+text).replace(/&lt;/g, "<", "g");
	s = s.replace(/&gt;/g, ">", "g");
	s = s.replace(/&amp;/g, "&",  "g");

	return s;
}

function _parseHeaders(rawHeaders) {
	var headers = {};

	if (rawHeaders) {
		var lines = rawHeaders.split("\n");
		var currentKey = null;

		for each (var line in lines) {
				if (line.length) {
					var firstChar = line.charCodeAt(0);
					if (firstChar != 32 && firstChar != 9) {
						var keyEnd = line.indexOf(":");
						currentKey = line.substr(0, keyEnd).toLowerCase();
						var values = headers[currentKey];
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

function onXMLRequestReadyStateChange(request) {
	// 	dump("xmlreadystatechange: " + request.readyState + "\n");
	if (request.readyState == 4) {
		if (request.client.target) {
			var status = 499;
			try {
				status = request.status;
			}
			catch(e) { dump("trapped exception: " + e + "\n"); }

			try {
// 				dump("method: " + request.method + "\n");
// 				dump("status code: " + request.readyState + "\n");
				var headers;
				var response;
				if (status == 499) {
					headers = {};
					response = "";
					dump("received status 499 for url: " + request.client.url + "\n");
				}
				else {
					headers = _parseHeaders(request.getAllResponseHeaders());
					if (request.method == "PROPPATCH"
							|| request.method == "PROPFIND") {
						var parser = new multiStatusParser(request.responseXML);
						response = parser.responses();
					}
					else
						response = request.responseText;
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

function sogoWebDAV(url, target, data, asynchronous) {
  this.url = url;
  this.target = target;
  this.cbData = data;
  this.asynchronous = true; /* FIXME */
}

sogoWebDAV.prototype = {
 _sendHTTPRequest: function(method, parameters, headers) {
		var xmlRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
		.createInstance(Components.interfaces.nsIXMLHttpRequest);

		xmlRequest.open(method, this.url, this.asynchronous);
		if (headers) {
			for (var header in headers)
				xmlRequest.setRequestHeader(header, headers[header]);
		}
		xmlRequest.url = this.url;
		xmlRequest.client = this;
		xmlRequest.method = method;

		var thisRequest = xmlRequest;
		xmlRequest.onreadystatechange = function() {
			onXMLRequestReadyStateChange(thisRequest);
		};

		xmlRequest.send(parameters);
	},

 load: function(operation, parameters) {
    if (operation == "GET") {
			this._sendHTTPRequest(operation);
		}
		else if (operation == "PUT") {
			this._sendHTTPRequest(operation, parameters.data,
	{ "content-type": parameters.contentType });
		}
    else if (operation == "PROPFIND") {
			var headers = { "depth": (parameters.deep
																? "1": "0"),
											"content-type": "application/xml; charset=utf8" };
			var query = this._propfindQuery(parameters.props);
			this._sendHTTPRequest(operation, query, headers);
		}
    else if (operation == "REPORT") {
// 			dump("REPORT: " + parameters.deep);
			var headers = { "depth": (parameters.deep
																? "1": "0"),
											"Connection": "TE",
											"TE": "trailers",
											"content-type": "application/xml; charset=utf8" };
			this._sendHTTPRequest(operation, parameters.query, headers);
		}
		else if (operation == "POST") {
			this._sendHTTPRequest(operation, parameters);
		}
		else if (operation == "MKCOL") {
			this._sendHTTPRequest(operation, parameters);
		}
		else if (operation == "DELETE") {
			this._sendHTTPRequest(operation, parameters);
		}
		else if (operation == "PROPPATCH") {
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
 _propfindQuery: function(props) {
		var nsDict = { "DAV:": "D" };
		var propPart = "";
		var nsCount = 0;
		for each (var prop in props) {
				var propParts = prop.split(" ");
				var ns = propParts[0];
				var nsS = nsDict[ns];
				if (!nsS) {
					nsS = "x" + nsCount;
					nsDict[ns] = nsS;
					nsCount++;
				}
				propPart += "<" + nsS + ":" + propParts[1] + "/>";
			}
		var query = ("<?xml version=\"1.0\"?>\n"
								 + "<D:propfind");
		for (var ns in nsDict)
			query += " xmlns:" + nsDict[ns] + "=\"" + ns + "\"";
		query += ("><D:prop>" + propPart + "</D:prop></D:propfind>");

		return query;
	},
 propfind: function(props, deep) {
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
 post: function(query) {
		this.load("POST", query);
  },
 proppatch: function(query) {
		this.load("PROPPATCH", query);
	}
};
