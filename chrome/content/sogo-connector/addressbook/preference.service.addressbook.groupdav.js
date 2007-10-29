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

function isGroupdavDirectory(abURI){
	if (abURI){
		var uri = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService)
			.GetResource(abURI).QueryInterface(Components.interfaces.nsIAbDirectory);
      
		if (abURI.search("mab/MailList") != -1){
			return false;
		}      	
		var groupdavPrefService = new GroupdavPreferenceService(uri.dirPrefId);
		if ( groupdavPrefService.getDirectoryName() !=""){
			return true;	
		}else{ 
			return false;
		}
	}else{
		throw "abURI is undefined";
   }
}
function isCardDavDirectory(abURI){
	if (abURI){
		if (abURI.search("moz-abdavdirectory") != -1){
			return true;
		}else{
			return false;
		}
	}else{
		throw "abURI is undefined for in fonction isCardDavDirectory()";
   }
}


function GroupdavPreferenceService(uniqueId){
	if (uniqueId == null || uniqueId == ""){
		debugger;
		throw "GroupdavPreferenceService exception: Missing uniqueId";
	}
	this.mPreferencesService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

	this.prefPath = this.prefPathPref + uniqueId + ".";
}

GroupdavPreferenceService.prototype ={
	prefPathPref : "extensions.ca.inverse.addressbook.groupdav.",
	prefPath : "",
	mPreferencesService : null,

	mURL : "",
	mDirectoryName : "",
	mServerType : "",
	mDisplayDialog : "",
	mMigrationDone:false,
	mAutoDeleteFromServer:false,
	mAutoReadOnly:false,

	getReadOnly : function(){
		try {
			this.mAutoReadOnly = this.mPreferencesService.getCharPref(this.prefPath + "readOnly" );
		} catch(e) {}
		return this.mAutoReadOnly;		
	},
	setReadOnly : function(val){
		this.mAutoReadOnly = val;
		try{
			this.mPreferencesService.setCharPref( this.prefPath + "readOnly", this.mAutoReadOnly);
		}catch(e){}
	},

	getAutoDeleteFromServer : function(){
		try {
			this.mAutoDeleteFromServer = this.mPreferencesService.getCharPref(this.prefPath + "autoDeleteFromServer" );
		} catch(e) {}
		return this.mAutoDeleteFromServer;		
	},
	
	setAutoDeleteFromServer : function(val){
		this.mAutoDeleteFromServer = val;
		try{
			this.mPreferencesService.setCharPref( this.prefPath + "autoDeleteFromServer", this.mAutoDeleteFromServer);
		}catch(e){}
	},

	getURL : function(){
		if (this.mURL == ""){
			try {
				this.mURL = this.mPreferencesService.getCharPref(this.prefPath + "url" );
				if (this.mURL[this.mURL.length - 1] != '/')
					this.mURL += '/';
			} catch(e) {}
		}
		return this.mURL;
	},
	
	getDirectoryName : function(){
		if ( this.mDirectoryName == "")
			try{ 
				this.mDirectoryName = this.mPreferencesService.getCharPref( this.prefPath + "name" );
			}catch(e){}
			
		return this.mDirectoryName;
	},
	
	getHostName : function(){
		var hostname = "";
		var url = this.getURL();
		
		if (url.length > 0) {
			var uri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
			uri.spec = url;
			hostname = uri.host;
		}
		return hostname;
	},
	
	getServerType : function(){
		if ( this.mServerType == "")
			try{ 
				this.mServerType = this.mPreferencesService.getCharPref( this.prefPath + "serverType" );
			}catch(e){}

		return parseInt(this.mServerType);
	},
	
	getDisplayDialog : function(){
		try{ 
			this.mDisplayDialog = this.mPreferencesService.getCharPref( this.prefPath + "displaySyncCompletedDialog");
		}catch(e){}
		
		return this.mDisplayDialog;
	},
	
	getMigrationDone : function(){
		if (this.mMigrationDone)
			try{ 
				this.mMigrationDone = this.mPreferencesService.getCharPref( this.prefPath + "migrationDone" );
			}catch(e){}
		
		return this.mMigrationDone;
	},

	setURL : function(url){
		this.mURL = url;
		try{
			this.mPreferencesService.setCharPref( this.prefPath + "url", this.mURL);
		}catch(e){}
	},
	
	setDirectoryName : function(dName){
		this.mDirectoryName = dName;
		try{
			this.mPreferencesService.setCharPref( this.prefPath + "name", this.mDirectoryName);
		}catch(e){}
	},
	
	setServerType : function(type){
		this.mServerType = type;
		try{
			this.mPreferencesService.setCharPref( this.prefPath + "serverType", this.mServerType);
		}catch(e){}
	},	
	
	setDisplayDialog : function(value){
		this.mDisplayDialog = value;
		try{
			this.mPreferencesService.setCharPref( this.prefPath + "displaySyncCompletedDialog", this.mDisplayDialog);
		}catch(e){}
	},
	
	setMigrationDone: function(done){
		this.mMigrationDone = done;
		try{
			this.mPreferencesService.setCharPref( this.prefPath + "u", this.mUser);
		}catch(e){}
	}
};