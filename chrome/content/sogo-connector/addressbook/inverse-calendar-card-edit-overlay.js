Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader).loadSubScript("chrome://sogo-connector/content/addressbook/preference.service.addressbook.groupdav.js");

this.InverseGetCardAb = function() {
  var uri;
  if (gEditCard.abURI)
    uri = gEditCard.abURI;
  else {
    var popup = document.getElementById('abPopup');
    uri = popup.getAttribute('value');
  }

  return GetDirectoryFromURI(uri);
}

this.InverseUpdateFBUrl = function() {
  var addressBook = this.InverseGetCardAb();
  if (!addressBook.isRemote && !isCardDavDirectory(gEditCard.abURI)) {
  // LDAP Directories
    try {
      var card = gEditCard.card.QueryInterface(Components.interfaces.nsIAbMDBCard);
      var fbUrlInput = document.getElementById("FbUrl");
      card.setStringAttribute("calFBURL", fbUrlInput.value);
    }
    catch (e) {
//       cardproperty.setCardValue("calFBURL", fbUrlInput.value);
    }
  }
}

this.InverseReadLdapFbUrl = function(input) {
  var prefs = Components.classes["@mozilla.org/preferences;1"]
                .getService(Components.interfaces.nsIPref);
  var branch = gEditCard.abURI.split("://")[1];
  var uriSpec = prefs.GetCharPref(branch + ".uri");
  var uri = Components.classes["@mozilla.org/network/ldap-url;1"].createInstance(Components.interfaces.nsILDAPURL);
  uri.spec = uriSpec;
  uri.filter = "(cn=" + gEditCard.card.displayName + ")";
  uri.setAttributes(1, ["calFBURL"]);
  var ldapQuery = Components.classes["@mozilla.org/ldapsyncquery;1"]
                    .createInstance(Components.interfaces.nsILDAPSyncQuery);
  var result = ldapQuery.getQueryResults(uri, 3);
  if (result)
    input.value = result.split("=")[1];
}

this.InverseLoadFBUrl = function() {
    var fbUrlInput = document.getElementById("FbUrl");
    
    var addressBook = this.InverseGetCardAb();
    if (addressBook.isRemote && !isCardDavDirectory(gEditCard.abURI)) {
    // LDAP Directories
		fbUrlInput.disabled = true;
		fbUrlInput.disabledforreadonly = true;
		fbUrlInput.value = "";
		this.InverseReadLdapFbUrl(fbUrlInput);
    }
    else {
	try {
	    var card = gEditCard.card.QueryInterface(Components.interfaces.nsIAbMDBCard);
	    fbUrlInput.value = card.getStringAttribute("calFBURL");
	}
	catch (e) {};
    }
}

/* event handlers */
this.InverseOnLoadHandler = function() {
    this.InverseLoadFBUrl();
    this.addEventListener("dialogaccept", this.InverseOnDialogAcceptHandler, false);
}

this.InverseOnDialogAcceptHandler = function() {
    this.InverseUpdateFBUrl();    
}

/* starting... */

window.addEventListener("load", this.InverseOnLoadHandler, false);
