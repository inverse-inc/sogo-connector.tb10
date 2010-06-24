/* SyncProgressManager.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

function SyncProgressManager() {
    this.addressbooks = {};
    this.nservice = Components.classes["@inverse.ca/notification-manager;1"]
                              .getService(Components.interfaces.inverseIJSNotificationManager)
                              .wrappedJSObject;
    this.nrAddressBooks = 0;
    this.wrappedJSObject = this;
}

SyncProgressManager.prototype = {
    wrappedJSObject: null,
    addressbooks: null,
    nservice: null,
    nrAddressBooks: 0,

    registerAddressBook: function(url, total) {
        //     dump("register: " + url + " (" + total + ")\n");
        if (!this.nrAddressBooks)
            this.nservice.postNotification("groupdav.synchronization.start");
        var newAddressBook = {count: 0, total: total};
        this.addressbooks[url] = newAddressBook;
        this.nrAddressBooks++;
        this.nservice.postNotification("groupdav.synchronization.addressbook.registered", url);
    },
    unregisterAddressBook: function(url) {
        //     dump("unregister: " + url + "\n");
        var addressbook = this.addressbooks[url];

        if (addressbook) {
            delete this.addressbooks[url];
            this.nrAddressBooks--;
            this.nservice.postNotification("groupdav.synchronization.addressbook.unregistered", url);
        }
        else
            throw Components.results.NS_ERROR_FAILURE;

        if (!this.nrAddressBooks)
            this.nservice.postNotification("groupdav.synchronization.stop");
    },
    updateAddressBook: function(url) {
        //     dump("update: " + url + "\n");
        var addressbook = this.addressbooks[url];

        if (addressbook) {
            this.addressbooks[url].count++;
            //       dump("count: " + this.addressbooks[url].count + "\n");
            this.nservice.postNotification("groupdav.synchronization.addressbook.updated",
                                           url);
        }
        else
            throw Components.results.NS_ERROR_FAILURE;
    },

    hasAddressBook: function(url) {
        var addressbook = this.addressbooks[url];

        return (addressbook != null);
    },
    progressForAddressBook: function(url) {
        var progress = -1;

        var addressbook = this.addressbooks[url];
        if (addressbook)
            progress = (addressbook.count / addressbook.total);
        else
            throw Components.results.NS_ERROR_FAILURE;

        return progress;
    },
    globalProgress: function() {
        var progress = -1;

        var globalCount = 0;
        var globalTotal = 0;

        for (var url in this.addressbooks) {
            var addressbook = this.addressbooks[url];
            globalCount += addressbook.count;
            globalTotal += addressbook.total;
        }

        if (globalTotal > 0)
            progress = (globalCount / globalTotal);

        return progress;
    },

    QueryInterface: function(aIID) {
        if (!aIID.equals(Components.interfaces.inverseIJSSyncProgressManager)
            && !aIID.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
};
