/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
/*************************************************************************************************************   
 Copyright:	Inverse groupe conseil, 2006-2007 
 Author: 	Robert Bolduc
 Email:		support@inverse.ca 
 URL:			http://inverse.ca
  
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

var LOCAL_UPDATE_FLAG = ".local"; // append to version number when the update is done offline
var LOCAL_DELETE_FLAG = ".deleted";

var groupdavTypes ={
	GroupDAV_Generic : 0
};

function getModifiedLocalVersion(versionString){
	if (!versionString){
		return null;
	}
	var localUpdatePos = versionString.indexOf(LOCAL_UPDATE_FLAG);
	if (localUpdatePos != -1)
	// There is a local update
		return versionString.substr(0, localUpdatePos);
	else
		return null; 
}

function getDeletedLocalVersion(versionString){
	var localUpdatePos = versionString.indexOf(LOCAL_DELETE_FLAG);
	if (localUpdatePos != -1)
	// There is a local update
		return versionString.substr(0, localUpdatePos);
	else
	return null; 
}

function GroupdavServerFactory(){}

GroupdavServerFactory.get = function(type){  
	switch(type){
		case groupdavTypes.GroupDAV_Generic:
			return new SogoImpl();
		default:
			throw "Server type " + type + " is not supported";
	}
}

/******************************************
 * Class SogoImpl
 ******************************************/	
function SogoImpl(){}
	
/******************************************
 * Static public properties
 ******************************************/


SogoImpl.pseudoGUID = function(){
	var guid = "";
	for (var i = 1; i <= 18; i++){
		var n = Math.floor(Math.random() * 16.0).toString(16);
		guid += n;
		if ((i == 8) || (i == 12) || (i == 16) || (i == 20)){
			guid += "-";
		}
	}
	return guid;
}

/*********************************************
 * function getServerVcardHrefList(doc)
 * 
 * response: hash
 * returns an Array
 * *******************************************/
SogoImpl.prototype.getServerVcardHrefList = function(response) {
	var cardHrefs = new Array();

	for (var href in response) {
		var davObject = response[href];
		var cNameArray = href.split("/");
		var cName = cNameArray[cNameArray.length - 1];
		var contentType = davObject["DAV: getcontenttype"];
		if (contentType == "text/x-vcard"
				|| contentType == "text/vcard")
			cardHrefs.push(href);
	}

	return cardHrefs;
	var nodeList = doc.getElementsByTagName("getcontenttype");
	logDebug("\tgetServerVcardHrefList size :" + nodeList.length);
	var cleanedNodes = new Array();
	var k = 0;

	for (var i=0; i<nodeList.length; i++){
//		if (nodeList[i].firstChild.nodeValue.search("text/x-vcard") != -1){
		if (nodeList[i].firstChild.nodeValue.search("text/vcard") != -1 ||  nodeList[i].firstChild.nodeValue.search("text/x-vcard")!= -1){
//			cleanedNodes[k]=nodeList[i].parentNode.getElementsByTagName("href")[0];
//			k++;
			//Modified to support the the href location of USA.NET
			var currNode = nodeList[i].parentNode;
			var node = null;
			do{
				node =currNode.getElementsByTagName("href")[0];
				currNode = currNode.parentNode;
				if (node){
					cleanedNodes[k]=node;
					k++;
         	}
			}while (!node)
		}
	}
	logDebug("\tgetServerVcardHrefList return size :" + cleanedNodes.length);
	return cleanedNodes;
}

SogoImpl.prototype.getKey = function(href){
	var elems = href.split("/");
	return elems[elems.length - 1];
}

SogoImpl.prototype.getVersion = function(hrefNode){
	return hrefNode.parentNode.getElementsByTagName("getetag")[0].firstChild.nodeValue;		
}

SogoImpl.prototype.getNewCardKey = function(){
	return "AA-" + SogoImpl.pseudoGUID();
}
