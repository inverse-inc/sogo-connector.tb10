/* NotificationManager.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

function NotificationManager() {
    this.notifications = {};
    this.wrappedJSObject = this;
}

NotificationManager.prototype = {
    notifications: null,
    wrappedJSObject: null,

    registerObserver: function(notification, observer) {
        var observers = this.notifications[notification];
        if (!observers) {
            observers = [];
            this.notifications[notification] = observers;
        }

        if (observers.indexOf(observer) < 0
            && observer.handleNotification)
            observers.push(observer);
        else
            throw Components.results.NS_ERROR_FAILURE;
    },
    unregisterObserver: function(notification, observer) {
        var unregistered = false;
        var observers = this.notifications[notification];
        if (observers) {
            var idx = observers.indexOf(observer);
            if (idx > -1) {
                observers.splice(idx, 1);
                unregistered = true;
            }
        }

        if (!unregistered)
            throw Components.results.NS_ERROR_FAILURE;
    },

    postNotification: function(notification, data) {
        //     dump("posting '" + notification + "'\n");
        var observers = this.notifications[notification];
        if (observers)
            for (var i = 0; i < observers.length; i++)
                observers[i].handleNotification(notification, data);
    },

    QueryInterface: function(aIID) {
        if (!aIID.equals(Components.interfaces.inverseIJSNotificationManager)
            && !aIID.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
};
