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
