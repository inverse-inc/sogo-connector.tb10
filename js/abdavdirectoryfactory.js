/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

/********************************************************************************
 Copyright:	Inverse inc., 2007-2008
 Author: 		Robert Bolduc
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


//class constructor
function AbDAVDirFactory() {
// 	dump("AbDAVDirFactory constructed\n");
};

//class definition
AbDAVDirFactory.prototype = {
 createDirectory: function(properties) {
		var directoryEnum = null;

		try {
			//TODO: validate properties
// 			dump("\nAbDAVDirFactory values \n");
// 			dump("\t properties.description: " + properties.description + "\n");
// 			dump("\t properties.uri: " + properties.URI + "\n");
// 			dump("\t properties.dirType: " + properties.dirType + "\n");
// 			dump("\t properties.fileName: " + properties.fileName + "\n");
// 			dump("\t properties.prefName: " + properties.prefName + "\n");

			var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
				.getService(Components.interfaces.nsIRDFService);
			directory = rdf.GetResource("moz-abdavdirectory://" + properties.prefName)
				.QueryInterface(Components.interfaces.nsIAbDirectory);

			var baseArray = Components.classes["@mozilla.org/array;1"]
				.createInstance(Components.interfaces.nsIMutableArray);
			baseArray.appendElement(directory, false);
			directoryEnum = baseArray.QueryInterface(Components.interfaces.nsIArray).enumerate();
		}
		catch(ex) {
			dump (ex + "\n File: "+  ex.fileName + "\n Line: " + ex.lineNumber
						+ "\n\n Stack:\n\t" + ex.stack + "\n\n");
			throw ex;
		}

		return directoryEnum;
	},

 //void deleteDirectory ( nsIAbDirectory directory )
 deleteDirectory: function(directory) {
		dump("CALLED deleteDirectory: function(directory)\n");
		throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
	},

 QueryInterface: function(aIID) {
		if (!aIID.equals(Components.interfaces.nsIAbDirFactory)
				&& !aIID.equals(Components.interfaces.nsISupports))
			throw Components.results.NS_ERROR_NO_INTERFACE;

		return this;
	}
};
