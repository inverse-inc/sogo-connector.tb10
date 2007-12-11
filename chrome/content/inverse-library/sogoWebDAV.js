/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
var sogoWebDAVPendingRequests = new Array();
var sogoWebDAVPending = false;

function _processPending() {
	sogoWebDAVPending = false;
	if (sogoWebDAVPendingRequests.length) {
		dump("processing next query...\n");
		var request = sogoWebDAVPendingRequests.shift();
		var newWebDAV = new sogoWebDAV(request.url, request.target,
																	 request.data, request.asynchronous);
		newWebDAV.load(request.operation, request.parameters);
	}
	else
		dump("dav queue empty\n");
}

function onXmlRequestReadyStateChange(request) {
	dump("xmlreadystatechange: " + request.readyState + "\n");
	if (request.readyState == 4) {
		request.target.onDAVQueryComplete(request.status,
																			request.responseText,
																			request.cbData);
		_processPending();
	};
}

function sogoWebDAV(url, target, data, asynchronous) {
  this.url = url;
  this.target = target;
  this.cbData = data;
  this.asynchronous = true; /* FIXME */
}

sogoWebDAV.prototype = {
 realLoad: function(operation, parameters) {
		dump("dav operation: " + operation + "\n");
    sogoWebDAVPending = true;
    var webdavSvc = Components.classes['@mozilla.org/webdav/service;1']
    .getService(Components.interfaces.nsIWebDAVService);
    var requestor = new InterfaceRequestor();
    
    var url = Components.classes['@mozilla.org/network/standard-url;1']
    .getService(Components.interfaces.nsIURI);
    url.spec = this.url;

    var listener = new WebDAVListener(this.target);
		listener.cbData = this.cbData;

    var resource = new WebDAVResource(url.QueryInterface(Components.interfaces.nsIURL));
    if (operation == "GET")
      webdavSvc.getToString(resource, listener, requestor, null);
    else if (operation == "PROPFIND")
      webdavSvc.getResourceProperties(resource, parameters.length, parameters,
																			true, listener, requestor, null);
    else if (operation == "REPORT")
      webdavSvc.report(resource, parameters, false,
											 listener, requestor, null);
		else if (operation == "POST") {
			var xmlRequest = new XMLHttpRequest();
			xmlRequest.open("POST", this.url, this.asynchronous);
			xmlRequest.url = this.url;
			xmlRequest.onreadystatechange = function() {
				onXmlRequestReadyStateChange(xmlRequest);
			};
			xmlRequest.target = this.target;
			xmlRequest.cbData = this.cbData;
			xmlRequest.send(parameters);
		}
    else
      throw ("operation '" + operation + "' is not currently supported");
  },
 load: function(operation, parameters) {
    if (sogoWebDAVPending)
      sogoWebDAVPendingRequests.push({url: this.url,
																			target: this.target,
																			data: this.cbData,
																			asynchronous: this.asynchronous,
																			operation: operation,
																			parameters: parameters});
    else
      this.realLoad(operation, parameters);
  },
 propfind: function(props) {
    this.load("PROPFIND", props);
  },
 get: function() {
    this.load("GET");
  },
 report: function(query) {
		var fullQuery = ('<?xml version="1.0" encoding="UTF-8"?>\n'
										 + query.toXMLString());
		var xParser = Components.classes['@mozilla.org/xmlextras/domparser;1']
		.getService(Components.interfaces.nsIDOMParser);
		var queryDoc = xParser.parseFromString(fullQuery, "application/xml");

		this.load("REPORT", queryDoc);
  },
 post: function(query) {
		var fullQuery = ('<?xml version="1.0" encoding="UTF-8"?>\n'
										 + query.toXMLString());
		var xParser = Components.classes['@mozilla.org/xmlextras/domparser;1']
		.getService(Components.interfaces.nsIDOMParser);
		var queryDoc = xParser.parseFromString(fullQuery, "application/xml");

		this.load("POST", queryDoc);
  }
};

function WebDAVResource(url) {
	this.mResourceURL = url;
}

WebDAVResource.prototype = {
 mResourceURL: {},
 get resourceURL() {
   return this.mResourceURL;
 },
 QueryInterface: function(iid) {
   if (iid.equals(Components.interfaces.nsIWebDAVResource) ||
       iid.equals(Components.interfaces.nsISupports)) {
     return this;
   }
   throw Components.interfaces.NS_ERROR_NO_INTERFACE;
 }
};

function WebDAVListener(target) {
  this.target = target;
  this.result = null;
}

WebDAVListener.prototype = {
 QueryInterface: function (aIID) {
    if (!aIID.equals(Components.interfaces.nsISupports)
				&& !aIID.equals(Components.interfaces.nsIWebDAVOperationListener)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  },
 onOperationComplete: function(aStatusCode, aResource, aOperation,
															 aClosure) {
// 		dump("complete status: " + aStatusCode + "; operation: " + aOperation + "\n");
    this.target.onDAVQueryComplete(aStatusCode, this.result, this.cbData);
    this.result = null;
		_processPending();
  },
 onOperationDetail: function(aStatusCode, aResource, aOperation, aDetail,
														 aClosure) {
    var url = aResource.spec;
// 		dump("status: " + aStatusCode + "; operation: " + aOperation + "\n");
    if (aStatusCode > 199 && aStatusCode < 300) {
      switch (aOperation) {
      case Components.interfaces.nsIWebDAVOperationListener.GET_TO_STRING:
				if (!this.result)
					this.result = "";
        this.result += aDetail.QueryInterface(Components.interfaces.nsISupportsCString).data;
				break;
      case Components.interfaces.nsIWebDAVOperationListener.GET_PROPERTIES:
// 				dump("GET_PROPERTIES\n");
				if (!this.result)
					this.result = {};
        if (!this.result[url])
					this.result[url] = {};
				this.getProperties(this.result[url], aDetail);
				break;
      case Components.interfaces.nsIWebDAVOperationListener.REPORT:
				if (!this.result)
					this.result = new Array();
				this.result.push(aDetail);
				break;
      }
    }
  },
 getProperties: function(hash, aDetail) {
    var text = "";

    var properties
    = aDetail.QueryInterface(Components.interfaces.nsIProperties);
    var count = {};
    var keys = properties.getKeys(count);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value
				= properties.get(key, Components.interfaces.nsISupportsString);
      hash[key] = value;
    }
  }
};

function InterfaceRequestor() {
}

InterfaceRequestor.prototype = { 
 QueryInterface: function (aIID) {
    if (!aIID.equals(Components.interfaces.nsISupports) &&
				!aIID.equals(Components.interfaces.nsIInterfaceRequestor)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  },
 getInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsISupports)
				|| iid.equals(Components.interfaces.nsIAuthPrompt)
				|| (iid.equals(Components.interfaces.nsIAuthPrompt2) && !isOnBranch)) {
      return Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
      .getService(Components.interfaces.nsIWindowWatcher)
      .getNewAuthPrompter(null);
    }
    else if (iid.equals(Components.interfaces.nsIProgressEventSink)
						 || iid.equals(Components.interfaces.nsIDocShellTreeItem)) {
      return this;
    }
    else if (iid.equals(Components.interfaces.nsIPrompt)
						 || iid.equals(Components.interfaces.nsIAuthPromptProvider)) {
      // use the window watcher service to get a nsIPrompt impl
      return Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
      .getService(Components.interfaces.nsIWindowWatcher)
      .getNewPrompter(null);
    }
    dump ("no interface in requestor: " + iid + "\n");
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

 /* stubs */
 // nsIProgressEventSink
 onProgress: function onProgress(aRequest, aContext, aProgress, aProgressMax) {},
 onStatus: function onStatus(aRequest, aContext, aStatus, aStatusArg) {},
 // nsIDocShellTreeItem
 findItemWithName: function findItemWithName(name, aRequestor,
																						 aOriginalRequestor) {}
};
