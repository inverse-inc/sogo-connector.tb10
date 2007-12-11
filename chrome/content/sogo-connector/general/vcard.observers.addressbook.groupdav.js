/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
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
