function SCAbPanelLoad(event) {
  this.SCAbPanelLoadOld();

  var menu = document.getElementById("addressbookList");
  var selectedURL = null;
  if (menu.selectedItem)
    selectedURL = menu.selectedItem.id;

  var menupopup = document.getElementById("addressbookList-menupopup");
  menupopup.removeAttribute("datasources");
  menupopup.removeAttribute("menugenerated");

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
}

this.SCAbPanelLoadOld = this.AbPanelLoad;
this.AbPanelLoad = this.SCAbPanelLoad;
