/* CardDAVDirectoryFactory.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

//class constructor
function CardDAVDirectoryFactory() {
    // 	dump("CardDAVDirectoryFactory constructed\n");
};

//class definition
CardDAVDirectoryFactory.prototype = {
    getDirectories: function(aDirName, aURI, aPrefId) {
        // dump("CALLED getDirectories"
        //      + "\n  aDirName: " + aDirName
        //      + "\n  aURI: " + aURI
        //      + "\n  aPrefId: " + aPrefId + "\n");

        let baseArray = Components.classes["@mozilla.org/array;1"]
                                  .createInstance(Components.interfaces.nsIMutableArray);
        let rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                            .getService(Components.interfaces.nsIRDFService);
        let directory = rdf.GetResource("moz-abdavdirectory://" + aPrefId)
                           .QueryInterface(Components.interfaces.nsIAbDirectory);
        baseArray.appendElement(directory, false);
        let directoryEnum = baseArray.enumerate();

        return directoryEnum;
    },

    //void deleteDirectory ( nsIAbDirectory directory )
    deleteDirectory: function(directory) {
        dump("CALLED deleteDirectory: function(directory)\n");
        // throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    },

    QueryInterface: function(aIID) {
        if (!aIID.equals(Components.interfaces.nsIAbDirFactory)
            && !aIID.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
};
