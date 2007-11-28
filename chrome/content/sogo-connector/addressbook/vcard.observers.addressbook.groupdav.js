/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 4 -*- */
/*************************************************************************************************************   
 Copyright:	Inverse groupe conseil, 2006 -2007
 Author: 	Robert Bolduc
 Email:		support@inverse.ca 
 URL:			http://inverse.ca

 Contributor: Ralf Becker 

 *  This file is part of "SOGo Connector" a Thunderbird extension.

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

function updateAddressBookStatusbar(text){
	var abWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].
		getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:addressbook");

	if(abWindow){			
		abWindow.document.getElementById('statusText').setAttribute("label", text);			
	}else{
		document.getElementById('statusText').setAttribute("label", text);	
	}
}

/*******************************************************************************
 * Progress Meter Class (Observer)
 * 
 * 
 ******************************************************************************/

function SynchProgressMeter(){}
SynchProgressMeter.INITIALIZATION_EVENT 		= "ca.inverse.groupdav.initialized";
SynchProgressMeter.NOTHING_TO_DO					= "ca.inverse.groupdav.insynch";
SynchProgressMeter.SERVER_DOWNLOAD_BEGINS		= "ca.inverse.groupdav.DownloadBegins";
SynchProgressMeter.CARD_DOWNLOADED		 		= "ca.inverse.groupdav.cardDownloaded";
SynchProgressMeter.CARD_DOWNLOAD_FAILED 		= "ca.inverse.groupdav.cardDownloadFailed";
SynchProgressMeter.SERVER_DOWNLOAD_COMPLETED = "ca.inverse.groupdav.DownloadCompleted";
SynchProgressMeter.SERVER_DOWNLOAD_FAILURE		= "ca.inverse.groupdav.DownloadFailure";

SynchProgressMeter.SERVER_UPLOAD_BEGINS		= "ca.inverse.groupdav.UploadBegins";
SynchProgressMeter.UPLOAD_STOP_REQUEST_EVENT	= "ca.inverse.webdav.put.onStopRequest";
SynchProgressMeter.CARD_UPLOADED        		= "ca.inverse.groupdav.cardUploaded";
SynchProgressMeter.UPLOAD_COMPLETED   			= "ca.inverse.groupdav.uploadCompleted";
SynchProgressMeter.SERVER_SYNCH_COMPLETED		= "ca.inverse.groupdav.SynchronizationCompleted";
SynchProgressMeter.SERVER_SYNCH_ERROR			= "ca.inverse.groupdav.SynchronizationError";
SynchProgressMeter.UPLOAD_ERROR_EVENT			= "ca.inverse.webdav.put.error";

SynchProgressMeter.prototype ={
	displayMsg : false,
	//Download properties
	downloadLength : 0,
	downloadFailedLength : 0,
	downloadMeter : 0,
	uploadLength : 0,
	uploadMeter : 0,   
	downloadCompleted : false,
	//Upload properties	
	cardIndex : {}, //Pseudo-hash that stores mozilla cards
	updateCounter : 0,  
	vCardsUpDateSize : 0,  
	addCounter : 0,	
	vCardsAddSize : 0,
	vCardsUploadTotalSize : 0,
	uploadFailedLength : 0,
	uri : "",
	downloadMsg : "",
	downloadErrorMsg : "",
	uploadUpdateMsg : "",
	uploadAddMsg : "",	
	uploadErrorMsg	: "",	
	uploadCompleted : false,

	displaySyncDialog : false,

	observerService : Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService),
	abWindow :  "",

	initDownload: function(downloadSize){
		this.downloadMeter = 0;
		this.downloadLength = downloadSize;    
		this.downloadFailedLength = 0;
		this.downloadErrorMsg = ""; 
		this.downloadMsg = "";
		
		if(downloadSize == 0)
			this.downloadCompleted = true;
		else
			this.downloadCompleted = false;
    
		updateAddressBookStatusbar("");
	},
   
	initUpload : function(cardHash, abURI, updateSize, addSize){
		this.cardIndex = cardHash;
		this.uri = abURI;
		this.vCardsUpDateSize = updateSize;
		this.updateCounter = 0;
		this.vCardsAddSize = addSize;
		this.addCounter = 0;
		this.vCardsUploadTotalSize = updateSize + addSize;
		this.uploadFailedLength 	= 0;
		this.uploadErrorMsg = "";
		uploadCompleted = (this.vCardsUploadTotalSize == 0);
		updateAddressBookStatusbar("");
	},

	setVCardsUpDateSize: function(size){
		this.vCardsUpDateSize = size;
	},
  
	setVCardsAddSize: function(size){
		this.vCardsAddSize = size;
	},
	
	setVCardsUploadTotalSize: function(size){
		this.vCardsUploadTotalSize =size;
		if (size == 0)
			this.uploadCompleted = true;
		else
			this.uploadCompleted = false;		
		},

	progressBox: function(win, title, msg){
		if (this.displayMsg){
			if(this.abWindow){				
				win = this.abWindow;
			}
			messageBox(win,title,msg);	
		}
	},
   
	// Components.interfaces.nsIObserver
	observe: function(object, topic, data){  
		try{
			var parser;
			var stateDoc;   			
			
			switch (topic){
			//================================================================================
				case SynchProgressMeter.INITIALIZATION_EVENT:
			//================================================================================
					this.downloadMsg = "";
					this.uploadUpdateMsg	 = "";
					this.uploadAddMsg	= "";
					this.uploadFailedMsg = "";
					this.abWindow =  Components.classes["@mozilla.org/appshell/window-mediator;1"].
						getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:addressbook");
                  		
					updateAddressBookStatusbar("initialization completed");                       
					break;
			//================================================================================
				case SynchProgressMeter.NOTHING_TO_DO:
			//================================================================================
					this.downloadMsg = "The Address Book is already in sync."
					updateAddressBookStatusbar(this.downloadMsg);
					
					if (this.abWindow){
						this.abWindow.gSynchIsRunning = false;	
					}
					this.progressBox(window,"GroupDAV synchronization", this.downloadMsg);
					break;
			//================================================================================
				case SynchProgressMeter.SERVER_DOWNLOAD_BEGINS:
			//================================================================================
					this.downloadMsg = "Beginning download from server..."
					updateAddressBookStatusbar(this.downloadMsg);
					break;
			//================================================================================
				case SynchProgressMeter.CARD_DOWNLOADED:
			//================================================================================
					this.downloadMeter++;
					this.downloadMsg = "Card " + this.downloadMeter + " of "  + this.downloadLength + " downloaded.";
					updateAddressBookStatusbar(this.downloadMsg);
					
					if (this.downloadMeter == this.downloadLength){
						this.downloadCompleted = true;
						this.observerService.notifyObservers(window, SynchProgressMeter.SERVER_DOWNLOAD_COMPLETED, null);     
					}
					break;     					
			//================================================================================
				case SynchProgressMeter.SERVER_DOWNLOAD_COMPLETED:
			//================================================================================
					var s1 = this.downloadLength > 1 ? "s": "";	
					this.downloadMsg = "Download completed from server: " + this.downloadLength + " card" + s1 + " downloaded!";
					updateAddressBookStatusbar(this.downloadMsg);
		   
					if (this.uploadCompleted)
						this.observerService.notifyObservers(window, SynchProgressMeter.SERVER_SYNCH_COMPLETED, null);     
					
					break;              
			//================================================================================
				case SynchProgressMeter.CARD_DOWNLOAD_FAILED:
			//================================================================================
					this.downloadFailedLength++;
					var cardText = " vcards";
	
					if (this.downloadFailedLength == 1)
						cardText = " vcard";
					
					this.downloadMsg = this.downloadFailedLength + cardText + " have failed to download the synchronization will not be applied!";
					updateAddressBookStatusbar(this.downloadMsg);
				  	
					if(this.downloadMeter + this.downloadFailedLength == this.downloadLength)
						this.observerService.notifyObservers(window, SynchProgressMeter.SERVER_DOWNLOAD_FAILURE, null);
					
					break;
			//================================================================================
				case SynchProgressMeter.SERVER_DOWNLOAD_FAILURE:
			//================================================================================
					//TODO: handle better
					this.downloadMsg = this.downloadFailedLength + " vcards have failed to download. The synchronization will not be applied!";
					this.progressBox(window,"Synchronization Results",this.downloadMsg);
					updateAddressBookStatusbar(this.downloadMsg);
					
					if (this.abWindow){
						this.abWindow.gSynchIsRunning = false;
					}
					break;
			//================================================================================
				case SynchProgressMeter.SERVER_UPLOAD_BEGINS:
			//================================================================================
					this.uploadAddMsg  = this.downloadMsg + "  Beginning server uploads...";
					updateAddressBookStatusbar(this.uploadAddMsg);
					break;	
			//================================================================================
				case SynchProgressMeter.UPLOAD_STOP_REQUEST_EVENT:
			//================================================================================
				//TODO refetch the card as recommended by Helge
				//GET /mycard.vcf
				//if-none-match: ETAG-OF-THE-LAST-UPDATE
				//---2---
				//This will only refetch the content if it changed. 
	
					parser=new DOMParser();
					stateDoc=parser.parseFromString(data,"text/xml");
				
					var etag = stateDoc.getElementsByTagName("etag")[0].textContent;
					var key =  stateDoc.getElementsByTagName("key")[0].textContent;
					var isNewCard = stateDoc.getElementsByTagName("newCard")[0].textContent == "true";
					var location;
					try {
						location =  stateDoc.getElementsByTagName("location")[0].textContent;
					}
					catch(e){ }
					logDebug("case SynchProgressMeter.UPLOAD_STOP_REQUEST_EVENT:" +				
								"\n		key					= " + key + 
								"\n		new key (location)	= " + location + 
								"\n		etag				= " + etag + 
								"\n		isNewCard =  " + isNewCard);					
	
					var card = this.cardIndex[key];
					var cardExt = card.QueryInterface(Components.interfaces.nsIAbMDBCard);
	
					if (etag != ""){
						if (location) {
							cardExt.setStringAttribute("groupDavKey", location);
							this.cardIndex[location] = this.cardIndex[key];
							delete this.cardIndex[key];
						}
						cardExt.setStringAttribute("groupDavVersion", etag);
						card.editCardToDatabase(this.uri);
					}
					if(isNewCard){
						this.addCounter++;
						this.observerService.notifyObservers(window, SynchProgressMeter.CARD_UPLOADED, "add");
					}else{
						this.updateCounter++;
						this.observerService.notifyObservers(window, SynchProgressMeter.CARD_UPLOADED, "update");
					}	   		
					break;
			//================================================================================
				case  SynchProgressMeter.CARD_UPLOADED:
			//================================================================================
					var s1 = this.addCounter + " card" + this.addCounter > 1 ? "s": "";
					var s2= this.vCardsUpDateSize > 1 ? "s": "";
	
					this.uploadAddMsg  = this.downloadMsg + "  "  + s1 + " added of " + this.vCardsAddSize +  
												", " + this.updateCounter + " card" +  s2 + " updated of " + 
												this.vCardsUpDateSize + ".";
	              								
					updateAddressBookStatusbar(this.uploadAddMsg);
				   	
					uploadCompleted =	this.updateCounter + this.addCounter == this.vCardsUpDateSize + this.vCardsAddSize;
					if(uploadCompleted){
						this.observerService.notifyObservers(window, SynchProgressMeter.UPLOAD_COMPLETED, null);
					}
					break;
			//================================================================================
				case SynchProgressMeter.UPLOAD_COMPLETED:
			//================================================================================
					this.uploadCompleted = true;
					
					this.uploadAddMsg  = this.downloadMsg + "  "  + " Upload Completed: " + this.addCounter + " card" + 
												this.addCounter > 1 ? "(s)": "" + " added of " + this.vCardsAddSize + ", " + 
												this.updateCounter + " card" +  this.vCardsUpDateSize > 1 ? "(s)": "" + 
												" updated of " + this.vCardsUpDateSize;

					updateAddressBookStatusbar(this.uploadAddMsg);

					if (this.downloadCompleted);
						this.observerService.notifyObservers(window, SynchProgressMeter.SERVER_SYNCH_COMPLETED, null);
					
					break;
			//================================================================================
				case SynchProgressMeter.SERVER_SYNCH_COMPLETED:
			//================================================================================
					var s1 = this.addCounter > 1 ? "s": "";
					var s2 = this.updateCounter > 1 ? "s": "";
        
					this.uploadAddMsg  = this.downloadMsg + "  "  + "Upload Completed: " + this.addCounter + " card" +
												s1 + " added of " + this.vCardsAddSize + ", " + 
												this.updateCounter + " card" + s2 +  " updated of " + this.vCardsUpDateSize + ".";

					updateAddressBookStatusbar(this.uploadAddMsg);
					
					var msg = "Synchronization completed.\n\n" +
					this.downloadLength + " card(s) downloaded. \n\n" +
					this.updateCounter + " card(s) updated on the server. \n\n" +
					this.addCounter + " card(s) added on the server. \n\n";

					this.progressBox(window,"GroupDAV Synchronization",msg);	

					if (this.abWindow){
						this.abWindow.gSynchIsRunning = false;
					}
					break;	   
			//================================================================================
				case SynchProgressMeter.SERVER_SYNCH_ERROR:
			//================================================================================
					if (this.uploadFailedLength > 0){
						var cardText = this.uploadFailedLength > 1 ? " cards " : " card ";
						this.uploadErrorMsg = this.uploadFailedLength + cardText + "could not be uploaded. The server could not process the" + cardText +".\n" 
													+ "Google the HTTP Status Code for more information.\n\n"  + "Server HTTP Status Code:" + this.uploadErrorMsg
					}else{
						this.uploadErrorMsg = "";
					}
					if (this.downloadFailedLength > 0){
						var cardText = this.downloadFailedLength > 1 ? " cards " : " card ";
						this.downloadErrorMsg = this.downloadFailedLength + cardText + "could not be downloaded.\n\nThe server response Status Code was: " 
													+ this.downloadErrorMsg + ".\n\n" + "Google the HTTP Status Code for more information.";
					}else{
						this.downloadErrorMsg = "";
					}
					var msg = "Synchronization Incomplete.\n\n" +
					this.downloadLength + " card(s) downloaded. \n\n" +
					this.updateCounter + " card(s) updated on the server. \n\n" +
					this.addCounter + " card(s) added on the server. \n\n" +
					this.downloadErrorMsg +  this.uploadErrorMsg;			
					var displayMsgBak =  this.displayMsg;
					this.displayMsg = true;
					this.progressBox(window,"GroupDAV Synchronization",msg);	 
					this.displayMsg =  displayMsgBak;
					
					if ( this.abWindow){
						this.abWindow.gSynchIsRunning = false;
					}        
					break;	        		
			//================================================================================
				case SynchProgressMeter.UPLOAD_ERROR_EVENT:
			//================================================================================
					logWarn("SynchProgressMeter.UPLOAD_ERROR_EVENT Upload failure:\n\n" + data);
					
					parser=new DOMParser();
					stateDoc=parser.parseFromString(data,"text/xml");
					this.uploadErrorMsg = stateDoc.getElementsByTagName("status")[0].textContent;
	
					this.uploadFailedLength++;
					var cardText = " vcards";
					
					if (this.uploadFailedLength == 1)
						cardText = " vcard";
					
					updateAddressBookStatusbar( this.uploadFailedLength + cardText + " have failed to upload!");
					
					if(this.updateCounter + this.addCounter + this.uploadFailedLength == this.vCardsUpDateSize + this.vCardsAddSize){
						this.observerService.notifyObservers(window, SynchProgressMeter.SERVER_SYNCH_ERROR, null);	
					}
					break;
			//================================================================================
				default:
			//================================================================================
					throw("Error: forgot to process event " + topic + " in SynchProgressMeter.");
					break;
			}
		}catch (e){
			updateAddressBookStatusbar("");
			exceptionHandler(window,"SynchProgressMeter.observe()",e);
			if (this.abWindow){
				this.abWindow.gSynchIsRunning = false;
			}
		}
	}, 
      
	// Components.interfaces.nsISupports
	QueryInterface : function(iid){
		if ( iid.equals(Components.interfaces.nsIObserver) || iid.equals(Components.interfaces.nsISupportsWeakReference)
			|| iid.equals(Components.interfaces.nsISupports))
			return this;
		else
			throw Components.results.NS_NOINTERFACE;
	}
};