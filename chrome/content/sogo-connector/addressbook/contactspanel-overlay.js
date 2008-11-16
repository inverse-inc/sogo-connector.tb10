function SCAbPanelLoad(event) {
  this.SCAbPanelLoadOld();

  var addrbookSession = Components
    .classes["@mozilla.org/addressbook/services/session;1"]
    .getService()
    .QueryInterface(Components.interfaces.nsIAddrBookSession);

  addrbookSession.removeAddressBookListener(gAddressBookPanelAbListener);

  gAddressBookPanelAbListener.onItemAdded = SCListenerOnItemAdded;
  gAddressBookPanelAbListener.onItemRemoved = SCListenerOnItemRemoved;

  addrbookSession
    .addAddressBookListener(gAddressBookPanelAbListener,
			    Components.interfaces.nsIAddrBookSession.added
			    | Components.interfaces.nsIAddrBookSession.directoryRemoved
			    | Components.interfaces.nsIAddrBookSession.changed);

  var menupopup = document.getElementById("addressbookList-menupopup");
  menupopup.removeAttribute("datasources");
  menupopup.removeAttribute("menugenerated");

  var menu = document.getElementById("addressbookList");
  var selectedURL = null;
  if (menu.selectedItem)
    selectedURL = menu.selectedItem.id;

  _SCUpdateMenuPopup(menupopup, selectedURL);
}

function _SCUpdateMenuPopup(menupopup, selectedURL, refreshResults) {
  var menu = document.getElementById("addressbookList");
  var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"]
    .getService(Components.interfaces.nsIRDFService);
  var parentDir = rdf.GetResource("moz-abdirectory://")
    .QueryInterface(Components.interfaces.nsIAbDirectory);
  var nodes = parentDir.childNodes;
  while (nodes.hasMoreElements()) {
    var node = nodes.getNext();
    var value = node
      .QueryInterface(Components.interfaces.nsIRDFResource).Value;
    var label = node
      .QueryInterface(Components.interfaces.nsIAbDirectory).dirName;
    if (!selectedURL)
      selectedURL = value;

    var entry = document.createElement("menuitem");
    entry.id = value;
    entry.setAttribute("value", value);
    entry.setAttribute("label", label);
    menupopup.appendChild(entry);

    if (selectedURL == value) {
      menu.selectedItem = entry;
      menu.value = value;
    }
  }

  if (refreshResults)
    AddressBookMenuListChange();
}

function _SCClearMenuPopup(menupopup) {
  for (var i = menupopup.childNodes.length - 1; i > -1; i--)
    menupopup.removeChild(menupopup.childNodes[i]);
}

function SCListenerOnItemAdded(parentDir, item) {
  var menupopup = document.getElementById("addressbookList-menupopup");
  var menu = document.getElementById("addressbookList");
  var selectedURL = null;
  if (menu.selectedItem)
    selectedURL = menu.selectedItem.id;
  _SCClearMenuPopup(menupopup);
  window.setTimeout(_SCUpdateMenuPopup, 100, menupopup, selectedURL);
}

function SOGoGetPersonalAddressBookURL() {
  return kPersonalAddressbookURI;
}

function SCListenerOnItemRemoved(parentDir, item) {
  var directory = item.QueryInterface(Components.interfaces.nsIRDFResource);
  var menu = document.getElementById("addressbookList");
  var selectedURL = null;
  if (directory.Value == menu.selectedItem.id) {
    selectedURL = SOGoGetPersonalAddressBookURL();
  }
  else {
    if (menu.selectedItem)
      selectedURL = menu.selectedItem.id;
  }
  var shouldRefreshResults = (menu.selectedItem.id != selectedURL);      
  var menupopup = document.getElementById("addressbookList-menupopup");
  _SCClearMenuPopup(menupopup);
  window.setTimeout(_SCUpdateMenuPopup, 100, menupopup, selectedURL, true);
}

this.SCAbPanelLoadOld = this.AbPanelLoad;
this.AbPanelLoad = this.SCAbPanelLoad;
