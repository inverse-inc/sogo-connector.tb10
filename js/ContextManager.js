/* ContextManager.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

function ContextManager() {
    this.contexts = {};
    this.wrappedJSObject = this;
}

ContextManager.prototype = {
    contexts: null,
    wrappedJSObject: null,

    getContext: function(name) {
        var context = this.contexts[name];
        if (!context) {
            context = {};
            this.contexts[name] = context;
        }

        return context;
    },
    resetContext: function(name) {
        var context = this.contexts[name];
        if (context)
            this.contexts[name] = null;
    },
    QueryInterface: function(aIID) {
        if (!aIID.equals(Components.interfaces.inverseIJSContextManager)
            && !aIID.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
};
