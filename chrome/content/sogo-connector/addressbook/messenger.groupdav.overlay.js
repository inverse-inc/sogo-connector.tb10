/*************************************************************************************************************   
 Copyright:	Inverse groupe conseil, 2007
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

/*
 * This overlay adds GroupDAV functionalities to Addressbooks
 * it contains the observers needed by the addressBook and the cards dialog
 */
 
var gGroupDAVProgressMeter;
var gAbWinObserverService =Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
 
OnLoadAddressBookOverlay();

function OnLoadAddressBookOverlay(){
	try{
		gGroupDAVProgressMeter = new SynchProgressMeter();
		addObservers();
	}catch(e){
		exceptionHandler(window,"Error",e);
	}
}

function OnUnloadMessengerOverlay(){
	try{
		removeObservers();
		OnUnloadMessenger();
	}catch(e){
		exceptionHandler(this,"OnLoadAddressBookOverlay",e);
	}
}

function addObservers(){

	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.INITIALIZATION_EVENT, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.NOTHING_TO_DO, true);

	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_DOWNLOAD_BEGINS, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.CARD_DOWNLOADED, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.CARD_DOWNLOAD_FAILED, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_DOWNLOAD_COMPLETED, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_DOWNLOAD_FAILURE, true);

	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_UPLOAD_BEGINS, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.UPLOAD_STOP_REQUEST_EVENT, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.CARD_UPLOADED, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.UPLOAD_ERROR_EVENT, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.UPLOAD_COMPLETED, true);

	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_SYNCH_COMPLETED, true);
	gAbWinObserverService.addObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_SYNCH_ERROR, true);   
}

function removeObservers(){
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.INITIALIZATION_EVENT);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.NOTHING_TO_DO);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.CARD_DOWNLOADED);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.CARD_DOWNLOAD_FAILED);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_DOWNLOAD_BEGINS);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_DOWNLOAD_COMPLETED);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_DOWNLOAD_FAILURE);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_UPLOAD_BEGINS);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.UPLOAD_ERROR_EVENT);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.UPLOAD_STOP_REQUEST_EVENT);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.CARD_UPLOADED);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.UPLOAD_COMPLETED);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_SYNCH_COMPLETED);
	gAbWinObserverService.removeObserver(gGroupDAVProgressMeter, SynchProgressMeter.SERVER_SYNCH_ERROR);
}