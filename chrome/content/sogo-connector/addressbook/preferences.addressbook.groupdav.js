/*************************************************************************************************************   
 Copyright:	Inverse groupe conseil, 2006-2007
 Author: 	Robert Bolduc
 Email:		support@inverse.ca 
 URL:			http://inverse.ca
  
 This file is part of "Addressbook GroupDAV Connector" a Thunderbird extension.

    "Addressbook GroupDAV Connector" is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License version 2 as published by
    the Free Software Foundation;

    "Addressbook GroupDAV Connector" is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with "Addressbook GroupDAV Connector"; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 ********************************************************************************/

var abWindow;
var gRdfService;
var gCurrentDirectory = null;
var gCurrentDirectoryURI;

var prefMsgBundle = document.getElementById("preferencesMsgId");
														   
// function hasOnlyWhitespaces(string)
// returns true if string contains only whitespaces and/or tabs
function hasOnlyWhitespaces(string)
{
  var str = string.match(/[ \s]/g);
  if (str && (str.length == string.length))
    return true;
  else
    return false;
}

function onAccept(){
	try{
		//There has to be at least a description to create a SOGO addressbook
		var description = document.getElementById("description").value;
		if(!description && description == ""){
			alert(prefMsgBundle.getString("missingDescriptionMsg"));
			return;
		}
		var url = document.getElementById("groupdavURL").value;
		if(!url && url == ""){
			alert(prefMsgBundle.getString("missingDescriptionURL"));
			return;
	}
	var readOnly =  document.getElementById("readOnly").getAttribute("checked");
	if (readOnly){
		onAcceptReadOnly();
	}else{
		onAcceptWebDAV();
	}
	var groupdavPrefService = new GroupdavPreferenceService(gCurrentDirectory.dirPrefId);
	groupdavPrefService.setURL(document.getElementById("groupdavURL").value);
	groupdavPrefService.setDirectoryName(description);
	groupdavPrefService.setDisplayDialog(document.getElementById("displaySynchCompleted").getAttribute("checked"));
	//groupdavPrefService.setAutoDeleteFromServer(document.getElementById("autoDeleteFromServer").getAttribute("checked"));
	groupdavPrefService.setReadOnly(readOnly);
	
	window.opener.gNewServerString = gCurrentDirectoryURI;
	window.opener.gNewServer = description;
	
	// set window.opener.gUpdate to true so that SOGO Directory Servers dialog gets updated
	window.opener.gUpdate = true;
		
	}catch (e){
		abWindow.exceptionHandler(window,"Preference onLoad()",e);
	}finally{
	//window.close();	
		return true;
	}
}
//function onAcceptReadOnly(){
function onAcceptReadOnly(){
	
//user_pref("ldap_2.servers.dav.description", "DAV");
//user_pref("ldap_2.servers.dav.dirType", 2);
//user_pref("ldap_2.servers.dav.uri", "moz-abdavdirectory:///");
/*
user_pref("ldap_2.servers.xxx.auth.savePassword", true);
user_pref("ldap_2.servers.xxx.description", "xxx");
user_pref("ldap_2.servers.xxx.filename", "abook-25.mab");
user_pref("ldap_2.servers.xxx.maxHits", 10);
user_pref("ldap_2.servers.xxx.uri", "moz-abdavdirectory://://inverse.ca/bobino/yo");

 */
	
	var properties = Components.classes["@mozilla.org/addressbook/properties;1"].createInstance(Components.interfaces.nsIAbDirectoryProperties);
	var addressbook = Components.classes["@mozilla.org/addressbook;1"].createInstance(Components.interfaces.nsIAddressBook);
	var url = document.getElementById("groupdavURL").value;

/*		var pos = url.search(/:\/\//);
		if( pos== -1)
			pos = 0;
		else
			pos += 3;
		
      properties.URI = "moz-abdavdirectory://" + url.substr(pos);
*/ 
	properties.dirType = 0; //DAV directory, it works with value = 2, go figure why!
	properties.URI = "moz-abdavdirectory://" + url;
	properties.maxHits = 10; // TODO
	properties.description = document.getElementById("description").value;

	if (gCurrentDirectory /*&& gCurrentDirectoryString*/){
	// we are modifying an existing directory

		// get the datasource for the addressdirectory
		var addressbookDS = gRdfService.GetDataSource("rdf:addressdirectory");
	
		// moz-abdirectory:// is the RDF root to get all types of addressbooks.
		var parentDir = gRdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
	
		// the RDF resource URI for LDAPDirectory will be moz-abldapdirectory://<prefName>
		//var selectedABURI = "moz-abdavdirectory://" + gCurrentDirectoryString;
		var selectedABURI = properties.URI;
		var selectedABDirectory = gRdfService.GetResource(selectedABURI).QueryInterface(Components.interfaces.nsIAbDirectory);
	 
		// Now do the modification.
		addressbook.modifyAddressBook(addressbookDS, parentDir, selectedABDirectory, properties);
		window.opener.gNewServerString = url;       
	}else { 
	// adding a new directory
		addNewDirectory(addressbook, properties);
	}
}

function addNewDirectory(addressbook, properties){
	addressbook.newAddressBook(properties);
	gCurrentDirectoryURI = properties.URI;
	gCurrentDirectory = gRdfService.GetResource(gCurrentDirectoryURI).QueryInterface(Components.interfaces.nsIAbDirectory);
	window.opener.gNewServerString = properties.prefName;	
}
//function onAccept(){
function onAcceptWebDAV(){
		var properties;
		var description = document.getElementById("description").value;
		var addressbook = Components.classes["@mozilla.org/addressbook;1"].createInstance(Components.interfaces.nsIAddressBook);		
		if (gCurrentDirectory == null || gCurrentDirectory.dirPrefId == ""){
		// adding a new Addressbook		
			properties = Components.classes["@mozilla.org/addressbook/properties;1"].createInstance(Components.interfaces.nsIAbDirectoryProperties);
			properties.dirType = 2;// ???don't know which values should go in there but 2 seems to get the job done
			properties.description = document.getElementById("description").value;
			
			addNewDirectory(addressbook, properties);
		}else{
		// Modifying existing Addressbook
			
			properties = gCurrentDirectory.directoryProperties; 
			properties.description = description;
			gCurrentDirectory.dirName = description;
			var addressbookDS = gRdfService.GetDataSource("rdf:addressdirectory");
			
			// moz-abdirectory:// is the RDF root to get all types of addressbooks.
			var parentDir = gRdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
			
			addressbook.modifyAddressBook(addressbookDS, parentDir, gCurrentDirectory, properties);   		
		}
}

function fillDialog(){						
	if ( "arguments" in window && window.arguments[0] ){
		gCurrentDirectoryURI = window.arguments[0];
		gCurrentDirectory = gRdfService.GetResource(gCurrentDirectoryURI).QueryInterface(Components.interfaces.nsIAbDirectory);

		var groupdavPrefService = new GroupdavPreferenceService(gCurrentDirectory.dirPrefId);  
		document.getElementById("description").value = gCurrentDirectory.dirName;
		document.getElementById("groupdavURL").value = groupdavPrefService.getURL();
		var readOnly = groupdavPrefService.getReadOnly();
		document.getElementById("readOnly").setAttribute("checked", readOnly);
		document.getElementById("readOnly").disabled = true;

		if (readOnly){
			document.getElementById("displaySynchCompleted").disabled = true;			 
//			document.getElementById("autoDeleteFromServer").disabled = true;
		}else{
			document.getElementById("displaySynchCompleted").setAttribute("checked", groupdavPrefService.getDisplayDialog());
			//document.getElementById("offlineTabId").disabled = true;
			document.getElementById("downloadButton").disabled = true;
//			document.getElementById("autoDeleteFromServer").setAttribute("checked", groupdavPrefService.getAutoDeleteFromServer());									
		}
	}else{
			document.getElementById("offlineTabId").disabled = true;
			document.getElementById("downloadPanel").disabled = true;
			document.getElementById("downloadButton").disabled = true;
	}	   	
}
function onLoad(){
	// TODO	add download now for cardDAV, the tab is currently hidden
	document.getElementById("offlineTabId").hidden = true;	
	
	prefMsgBundle = document.getElementById("preferencesMsgId");
	
	//Read only checkbox event listener
	document.getElementById("readOnly").addEventListener("CheckboxStateChange", onReadOnlyUpdate, true);

	gRdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);	
	abWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:addressbook");	

	fillDialog();
}

function onUnload(){
}

//TODO:catch the directory delete and delete preferences

function onCancel(){
	window.close();
}

// Handle readOnly checkbox updates


function onReadOnlyUpdate(){
	if (document.getElementById("readOnly").checked == true){			
		//document.getElementById("offlineTabId").disabled = null;
		document.getElementById("downloadButton").disabled = false;
		document.getElementById("displaySynchCompleted").disabled = true;
	}else{
		//document.getElementById("offlineTabId").disabled = true;
		document.getElementById("downloadButton").disabled = true;		
		document.getElementById("displaySynchCompleted").disabled = false;		
	}
}

function DownloadNow(){
	
// TODO	add download now for cardDAV
/*	
  if (!gDownloadInProgress) {
    gProgressText = document.getElementById("replicationProgressText");
    gProgressMeter = document.getElementById("replicationProgressMeter");

    gProgressText.hidden = false;
    gProgressMeter.hidden = false;
    gReplicationCancelled = false;

    try {
      gReplicationService.startReplication(gCurrentDirectoryString,
                                           progressListener);
    }
    catch (ex) {
      EndDownload(false);
    }
  } else {
    gReplicationCancelled = true;
    try {
      gReplicationService.cancelReplication(gCurrentDirectoryString);
    }
    catch (ex) {
      // XXX todo
      // perhaps replication hasn't started yet?  This can happen if you hit cancel after attempting to replication when offline 
      dump("unexpected failure while cancelling.  ex=" + ex + "\n");
    }
  }
  */
}
