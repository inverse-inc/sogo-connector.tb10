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
