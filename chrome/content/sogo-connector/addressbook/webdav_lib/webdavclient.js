//*****************************************************************************
//******** define a js object to implement nsITreeView
function webdavTreeView(columnids, copycol)
{
  this.columnids = columnids;
  this.colcount = columnids.length
  this.copycol = copycol;
  this.rows = 0;
  this.tree = null;
  this.data = new Array();
  this.selection = null;
  this.sortcol = null;
  this.sortdir = 0;
}

webdavTreeView.prototype = {
  set rowCount(c) { throw "rowCount is a readonly property"; },
  get rowCount() { return this.rows; },

  setTree: function(tree) {
    this.tree = tree;
  },

  getCellText: function(row, column) {
    var colidx = 0;
    while(colidx < this.colcount && column != this.columnids[colidx])
      colidx++;
    return this.data[row][colidx] || "";
  },

  setCellText: function(row, column, value) {
    var colidx = 0;
    while(colidx < this.colcount && column != this.columnids[colidx])
      colidx++;
    this.data[row][colidx] = value;
  },

  addRow: function(row) {
    this.rows = this.data.push(row);
    this.rowCountChanged(this.rows - 1, 1);
  },

  addRows: function(rows) {
    var length = rows.length;
    for(var i = 0; i < length; i++)
      this.rows = this.data.push(rows[i]);
    this.rowCountChanged(this.rows - length, length);
  },

  rowCountChanged: function(index, count) {
    this.tree.rowCountChanged(index, count);
  },

  invalidate: function() {
    this.tree.currentIndex=-1;
    this.tree.invalidate();
  },

  clear: function() {
    this.data = new Array();
    this.rows = 0;
  },

  handleCopy: function(row) {
    return (row < 0 || this.copycol < 0) ? "" : (this.data[row][this.copycol] || "");
  },

  performActionOnRow: function(action, row) {
    if (action == "copy") {
      var data = this.handleCopy(row)
      this.tree.treeBody.parentNode.setAttribute("copybuffer", data);
    }
  },

  getRowProperties: function(row, column, prop) { },
  getCellProperties: function(row, prop) { },
  getColumnProperties: function(column, elem, prop) { },
  isContainer: function(index) { return false; },
  isContainerOpen: function(index) { return false; },
  isSeparator: function(index) { return false; },
  isSorted: function() { },
  canDropOn: function(index) { return false; },
  canDropBeforeAfter: function(index, before) { return false; },
  drop: function(row, orientation) { return false; },
  getParentIndex: function(index) { return 0; },
  hasNextSibling: function(index, after) { return false; },
  getLevel: function(index) { return 0; },
  getImageSrc: function(row, column) { },
  getProgressMode: function(row, column) { },
  getCellValue: function(row, column) { },
  toggleOpenState: function(index) { },
  cycleHeader: function(col, elem) { },
  selectionChanged: function() { },
  cycleCell: function(row, column) { },
  isEditable: function(row, column) { return false; },
  performAction: function(action) { },
  performActionOnCell: function(action, row, column) { }
};

// global variables
var gDialog = {}; // object for the main window (dialog), it stores pointers to window elements
var fileView = new webdavTreeView(["lock","filename","size","type","lastmodified"], 1); // this is the view object for the file view tree (grid)
const kXULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// startup function for the GUI
function Startup() {
  // get the pointer to the window elements
  gDialog.TabBox = document.getElementById("TabBox");
  gDialog.TabBoxTabs=document.getElementById("TabBoxTabs");
  gDialog.ServerTab= document.getElementById("ServerTab");
  gDialog.BrowseTab = document.getElementById("BrowseTab");
  gDialog.PropertiesTab = document.getElementById("PropertiesTab");
//  gDialog.VersioningTab = document.getElementById("VersioningTab");
  gDialog.HelpTab = document.getElementById("HelpTab");
  gDialog.DirectoryTree = document.getElementById("DirectoryTree");
  gDialog.DirRoot = document.getElementById("DirRoot");
  gDialog.FileTree = document.getElementById("FileTree");
  gDialog.serverName = document.getElementById("ServerNameInput");
  gDialog.userName = document.getElementById("UserNameInput");
  gDialog.userPassword = document.getElementById("UserPasswordInput");
  gDialog.LockOwner = document.getElementById("LockOwnerInfoInput");
  gDialog.PropertiesTree = document.getElementById("PropertiesTree");
  gDialog.PropertiesRoot = document.getElementById("propertiesroot-firstchildren");
  gDialog.PropertiesrootItem = document.getElementById("propertiesroot-item");
  gDialog.PropertiesrootValue = document.getElementById("propertiesroot-value");
  gDialog.FileTree.treeBoxObject.view = fileView; // assign the view to the tree (grid)

  //buttons
  gDialog.getfile_btn = document.getElementById("getfile_btn");
  gDialog.sendfile_btn = document.getElementById("sendfile_btn");
  gDialog.lock_btn = document.getElementById("lock_btn");
  gDialog.unlock_btn = document.getElementById("unlock_btn");
  gDialog.createcollection_btn = document.getElementById("createcollection_btn");
  gDialog.copyfile_btn = document.getElementById("copyfile_btn");
  gDialog.move_btn = document.getElementById("move_btn");
  gDialog.delete_btn = document.getElementById("delete_btn");
  gDialog.editproperties_btn = document.getElementById("editproperties_btn");

  //hide the tabs by default, before the user connects
  gDialog.BrowseTab.setAttribute("hidden","true");
  gDialog.PropertiesTab.setAttribute("hidden","true"); 
  //
  document.getElementById("helpContent").loadURI("chrome://webdavclient/content/help/webdavclient.html");
}

//*****************************************************************************

function getFilename(webdavURL) {
  var nsIURL = Components.classes["@mozilla.org/network/standard-url;1"].getService(Components.interfaces.nsIURL);
  nsIURL.spec=webdavURL;
  return nsIURL.fileName;
}

function getDirPath(webdavURL,webdavPath) {
  var nsIURL = Components.classes["@mozilla.org/network/standard-url;1"].getService(Components.interfaces.nsIURL);
  nsIURL.spec=webdavURL;
  var tmp=nsIURL.directory;
  tmp=tmp.substr(webdavPath.length);
  return tmp;
}

function getDirName(webdavURL,webdavPath) {
  var nsIURL = Components.classes["@mozilla.org/network/standard-url;1"].getService(Components.interfaces.nsIURL);
  nsIURL.spec=webdavURL;
  var tmp=nsIURL.directory;
  tmp=tmp.substr(webdavPath.length);
  if(tmp.charAt(tmp.length-1)=="/") tmp=tmp.substr(0,tmp.length-1);
  tmp=tmp.substr(tmp.lastIndexOf("/")+1)
  return tmp;
}

//*****************************************************************************

function SwitchPanel(tab) {
  if (gDialog.TabBox.selectedTab != tab)
    gDialog.TabBox.selectedTab = tab;
}

function PanelSwitchEvent(invoker) {
  // hide the properties tab
  if(invoker!="PropertiesTab" && gDialog.PropertiesTab.getAttribute("hidden")) {
    //warn the user that the changes will be lost once the properties tab is left
    if(gDialog.PropertiesTree.getAttribute("dirty")=="true") {
      //XXX send warning with a OK/Cancel option...
    }
    gDialog.PropertiesTab.setAttribute("hidden","true"); //hide the properties tab
    gDialog.PropertiesTree.setAttribute("dirty","false"); //make the tree clean
  }
}

// sets up the connection parameters and tries the connection
//XXX WebDAV options are not returned !
function ConnectServer() {
  // test the connection
  try {
    var webdavPath=gDialog.serverName.value; // path for the HTTP request is simply the server URL
    if(webdavPath.charAt(webdavPath.length-1)!="/") {
      messageBox(window,"ConnectServer()","URL has to end with /");
      return;
    }
    var responseObj=webdav_options(webdavPath,gDialog.userName.value,gDialog.userPassword.value);
    if(responseObj.status!=200) {
      messageBox(window,"ConnectServer()","Error connecting to the server!");
      return;
    }
    var WebDAVAllow=responseObj.responseHeaders["Allow"];
//    if(WebDAVAllow.indexOf("")==-1) gDialog.getfile_btn.setAttribute("disabled","true");
    if(WebDAVAllow.indexOf("LOCK")==-1) {
      gDialog.lock_btn.setAttribute("disabled","true");
      gDialog.unlock_btn.setAttribute("disabled","true");
    }
//XXX PUT and MKCOL are not listed in the allow, but they are supported in Apache
//    if(WebDAVAllow.indexOf("PUT")==-1) gDialog.sendfile_btn.setAttribute("disabled","true");
//    if(WebDAVAllow.indexOf("MKCOL")==-1) gDialog.createcollection_btn.setAttribute("disabled","true");
//XXX check the options for these functions in the specification
//    if(WebDAVAllow.indexOf("")==-1) gDialog.copyfile_btn.setAttribute("disabled","true");
//    if(WebDAVAllow.indexOf("")==-1) gDialog.move_btn.setAttribute("disabled","true");
//    if(WebDAVAllow.indexOf("")==-1) gDialog.delete_btn.setAttribute("disabled","true");
//    if(WebDAVAllow.indexOf("")==-1) gDialog.editproperties_btn.setAttribute("disabled","true");
  } catch (e) {
    messageBox(window,"ConnectServer()","Error connecting to the server."+e);
    return;
  }
  // let the user know that the connection is successful
  document.getElementById("dir:").setAttribute("label",gDialog.serverName.value); // set the name of the root element of the tree
  gDialog.BrowseTab.setAttribute("hidden","false");
  SwitchPanel(gDialog.BrowseTab); // switch to the browser tab
}

function DisconnectServer() {
  gDialog.BrowseTab.setAttribute("hidden","true");
  gDialog.PropertiesTab.setAttribute("hidden","true");
  //remove the directory tree and build a new one (empty)
  gDialog.DirectoryTree.view.selection.clearSelection();
  var treeitem=document.createElement("treeitem");
  treeitem.setAttribute("id","DirRoot");
  treeitem.setAttribute("container","true");
  treeitem.setAttribute("open","false");
  var treerow=document.createElement("treerow");
  treeitem.appendChild(treerow);
  var treecell=document.createElement("treecell");
  treerow.appendChild(treecell);
  treecell.setAttribute("id","dir:");
  treecell.setAttribute("label","(root)/");
  var treechildren=document.createElement("treechildren");
  treeitem.appendChild(treechildren);
  var DirRootParent=gDialog.DirRoot.parentNode;
  DirRootParent.replaceChild(treeitem,gDialog.DirRoot); // replace the whole tree with a new tree root
  gDialog.DirRoot = document.getElementById("DirRoot"); // have to reset this object pointer
  gDialog.FileTree.treeBoxObject.view=null;
  fileView.clear();
  gDialog.FileTree.treeBoxObject.view=fileView;
}

// create collection UI command
function BrowseCreateCollection() {
  // get a directory name using a dialog
  var retObj= { returnValue : "" , cancel : "false"};
  window.openDialog("chrome://webdavclient/content/webdavclientdialog.xul","", "chrome,resizable=no,dependent=yes,modal", "TextInput", { label : "New collection name:", defaultValue : "new_dir" }, retObj );
  if(retObj.cancel=="true") return; // cancel the operation
  // check if the user wanted to create multi level directories
  // checking here saves us a roundtrip to the server
  if(retObj.returnValue.indexOf("/")!=-1) {
    messageBox(window,"BrowseCreateCollection()","Creating multiple level of directories is not allowed");
  }
  try {
    var selitem=getSelectedDirectory();
    selitem.setAttribute("open","true");
    var path=getPathString(selitem);
  } catch(e) {
    messageBox(window,"BrowseCreateCollection()","BrowseCreateCollection error:"+e);
  }
  // HTTP request URL
  var collectionName=gDialog.serverName.value+path+retObj.returnValue;
  // create the collection, call the API
  var responseObj=webdav_mkcol(collectionName,gDialog.userName.value,gDialog.userPassword.value);
  switch(responseObj.status) {
    case 201: // OK status, do nothing
      break;
    default:
      messageBox(window,"BrowseCreateCollection()","("+responseObj.status+") Error: Could not create the collection: "+collectionName);
  }
  DirSelected(); // refresh the directory content
}

function BrowseDelete() {
  // ask for confirmation
  var retObj= { returnValue : "" , cancel : "false"};
  try {
    // check the current index if there is anything selected
    if(gDialog.FileTree.currentIndex<0) {
      messageBox(window,"BrowseDelete()","Select an item from the file list.");
      return;
    }
    window.openDialog("chrome://webdavclient/content/webdavclientdialog.xul","", "chrome,resizable=no,dependent=yes,modal", "Decision", { label : "Delete the file ?" }, retObj );
    var confirmDelete=retObj.returnValue;
    if(!confirmDelete) return;
    var selectedFilename=getSelectedFilename();
    var selitem=getSelectedDirectory();
    var path=getPathString(selitem);
  } catch (e) {
    messageBox(window,"BrowseDelete()","BrowseDelete error:"+e);
  }
  var deleteName=gDialog.serverName.value+path+selectedFilename;
  var responseObj=webdav_delete(deleteName,gDialog.userName.value,gDialog.userPassword.value);
  // remove the directory entry from the tree if the deleted item is a collection
  if(selectedFilename.charAt(selectedFilename.length-1)=="/") {
    removeDir(path+selectedFilename);
  }
  switch(responseObj.status) {
    case 204: // OK status, do nothing
      break;
    default:
      messageBox(window,"BrowseDelete()","("+responseObj.status+") Could not delete item:"+selectedFilename);
  }
  // refresh the file list
  DirSelected();
}

// Send file
function BrowsePut() {
  var writeFilename="";
  const nsIFilePicker = Components.interfaces.nsIFilePicker;
  try {
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, "Upload file from...", nsIFilePicker.modeOpen);
    if (fp.show() == nsIFilePicker.returnOK && fp.fileURL.spec && fp.fileURL.spec.length > 0) fileURL= fp.fileURL;
      else return;
  } catch (ex) {
    return;
  }
  selitem=getSelectedDirectory();
  var path=gDialog.serverName.value+getPathString(selitem)+fileURL.fileName;
  //figure out the mime type here
  try {
    var ext = fileURL.fileExtension;
    var contentType = "text/html";  // the default mime type is text/html HMMMM... very optimistic, but probably the most common
    if (ext) {
      var mimeSvc = Components.classes["@mozilla.org/mime;1"].getService(Components.interfaces.nsIMIMEService);
      contentType=mimeSvc.GetTypeFromExtension(ext);
    }
  } catch(e) {
    // we are in trouble here
  }
  // open the upload progress dialog box

  var uploadObj={ webPath:path,filePath:fileURL.spec,fileName:fileURL.fileName,contentType:contentType,username:gDialog.userName.value,password:gDialog.userPassword.value };
  window.openDialog("chrome://webdavclient/content/webdavclientupload.xul","", "chrome,resizable=no,dependent=yes,modal", uploadObj );

  DirSelected();
}

//this is simply a test function for the webdav_put_webbrowserpersist API function
/*
function BrowsePutDocument() {

  const webPersist=Components.interfaces.nsIWebBrowserPersist; // WebBrowserPersist interface
  var encFlags=
      webPersist.ENCODE_FLAGS_ENCODE_LATIN1_ENTITIES
    | webPersist.ENCODE_FLAGS_RAW
    | webPersist.ENCODE_FLAGS_WRAP
    | webPersist.ENCODE_FLAGS_CR_LINEBREAKS
    | webPersist.ENCODE_FLAGS_LF_LINEBREAKS;
		
  var persistFlags=
      webPersist.PERSIST_FLAGS_NO_BASE_TAG_MODIFICATIONS
    | webPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES
    | webPersist.PERSIST_FLAGS_DONT_FIXUP_LINKS
    | webPersist.PERSIST_FLAGS_DONT_CHANGE_FILENAMES
    | webPersist.PERSIST_FLAGS_FIXUP_ORIGINAL_DOM;

  var path=gDialog.serverName.value+"test.html";
// the relative path is "" now, so the resources just go to the same location as the document
  var uploadObj={ webPath:path, relativeWebPath:"reldir", XMLdoc:document, contentType:"text/html", persistFlags:persistFlags, encFlags:encFlags, wrapCol:128, username:gDialog.userName.value, password:gDialog.userPassword.value};
  window.openDialog("chrome://webdavclient/content/webdavclientupload.xul","", "chrome,resizable=no,dependent=yes,modal", uploadObj );
  DirSelected();
}
*/

// Get file
function BrowseGet() {
  // pick the file to save to
  try {
    // check the current index if there is anything selected
    if(gDialog.FileTree.currentIndex<0) {
      messageBox(window,"BrowseGet()","Select an item from the file list.");
      return;
    }

    var selectedFilename=getSelectedFilename();
    var selitem=getSelectedDirectory();
    var path=getPathString(selitem);

    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, "Download file to...", nsIFilePicker.modeSave);
    fp.defaultString=selectedFilename;
    if (fp.show() == nsIFilePicker.returnOK && fp.fileURL.spec && fp.fileURL.spec.length > 0) fileURL= fp.fileURL;
      else return;
  } catch (ex) {
    return;
  }
  var selitem=getSelectedDirectory();
  var path=gDialog.serverName.value+path+selectedFilename;
//  var path=gDialog.serverName.value+getPathString(selitem)+fileURL.fileName;
  // open the download progress dialog box
  var downloadObj={ webPath:path,localFile:fileURL.spec,filename:selectedFilename,username:gDialog.userName.value,password:gDialog.userPassword.value };
  window.openDialog("chrome://webdavclient/content/webdavclientdownload.xul","", "chrome,resizable=no,dependent=yes,modal", downloadObj );
}

function BrowseMove() {
  var retObj= { returnValue : "" , cancel : "false"};
  try {
    // check the current index if there is anything selected
    if(gDialog.FileTree.currentIndex<0) {
      messageBox(window,"BrowseMove()","Select an item from the file list.");
      return;
    }
    var selectedFilename=getSelectedFilename();
    var selitem=getSelectedDirectory();
    var path=getPathString(selitem);
  } catch (e) {
    messageBox(window,"BrowseMove()","BrowseMove error:"+e);
  }
  // ask for a new path and filename
  window.openDialog("chrome://webdavclient/content/webdavclientdialog.xul","", "chrome,resizable=no,dependent=yes,modal", "TextInput", { label : "Move to file name:", defaultValue : path+selectedFilename }, retObj );
  if(retObj.cancel=="true") return;
  var movetofilename=retObj.returnValue;
  var responseObj=webdav_move(gDialog.serverName.value+path+selectedFilename,gDialog.serverName.value+movetofilename,false,gDialog.userName.value,gDialog.userPassword.value);
  switch(responseObj.status) {
    case 201: // OK status, do nothing
      break;
    default:
      messageBox(window,"BrowseMove()","("+responseObj.status+") Could not move item:"+selectedFilename);
  }
  DirSelected();
}

function BrowseCopy() {
  var retObj= { returnValue : "" , cancel : "false"};
  try {
    // check the current index if there is anything selected
    if(gDialog.FileTree.currentIndex<0) {
      messageBox(window,"BrowseCopy()","Select an item from the file list.");
      return;
    }
    var selectedFilename=getSelectedFilename();
    var selitem=getSelectedDirectory();
    var path=getPathString(selitem);
  } catch (e) {
    messageBox(window,"BrowseCopy()","BrowseCopy error:"+e);
  }
  window.openDialog("chrome://webdavclient/content/webdavclientdialog.xul","", "chrome,resizable=no,dependent=yes,modal", "TextInput", { label : "Copy to file name:", defaultValue : path+selectedFilename+"_copy" }, retObj );
  if(retObj.cancel=="true") return;
  var copytofilename=retObj.returnValue;	
  var responseObj=webdav_copy(gDialog.serverName.value+path+selectedFilename,gDialog.serverName.value+copytofilename,true,gDialog.userName.value,gDialog.userPassword.value);
  switch(responseObj.status) {
    case 201: // OK status, do nothing
      break;
    default:
      messageBox(window,"BrowseCopy()","("+responseObj.status+") Could not copy item:"+selectedFilename);
  }
  DirSelected();
}

function BrowseLock() {
  try {
    // check the current index if there is anything selected
    if(gDialog.FileTree.currentIndex<0) {
      messageBox(window,"BrowseLock()","Select an item from the file list.");
      return;
    }
    var selectedFilename=getSelectedFilename();
    var selitem=getSelectedDirectory();
    var path=getPathString(selitem);
  } catch (e) {
    messageBox(window,"BrowseLock()","BrowseLock() error:"+e);
  }
  var webdavURL=gDialog.serverName.value+path+selectedFilename;
  //first get the lock info for the resource
  var propList="<D:prop><D:lockdiscovery/></D:prop>";
  var responseObj=webdav_propfind(webdavURL,propList,gDialog.userName.value,gDialog.userPassword.value);
  switch(responseObj.status) {
    case 207: // OK status, do nothing
      break;
    default:
      messageBox(window,"BrowseLock()","("+responseObj.status+") Could not process the request.");
      return;
  }
  var multiStat=processMultiResponse(responseObj.response);
  // process the lock information
  var lockDiscovery=processLockdiscovery(multiStat[0].props["lockdiscovery"].value);
  if(lockDiscovery!=null) {
    messageBox(window,"BrowseLock()","Resource is already locked by: "+lockDiscovery.owner);
    return;
  }
  // lock the resource
  responseObj=webdav_lock(webdavURL,webdavAPIConst.WEBDAV_EXCLUSIVE_LOCK,webdavAPIConst.WEBDAV_WRITE_LOCK,gDialog.LockOwner.value,webdavAPIConst.WEBDAV_INFINIT_LOCK,gDialog.userName.value,gDialog.userPassword.value);
  switch(responseObj.status) {
    case 200: // OK status, do nothing
      break;
    default:
      messageBox(window,"BrowseLock()","("+responseObj.status+") Could not lock item:"+selectedFilename);
  }
  //exclusive lock is hardcoded here for now, because we only use exclusive lock
  fileView.setCellText(gDialog.FileTree.currentIndex,"lock","E");
  fileView.invalidate();
}

function BrowseUnlock() {
  try {
    // check the current index if there is anything selected
    if(gDialog.FileTree.currentIndex<0) {
      messageBox(window,"BrowseUnlock()","Select an item from the file list.");
      return;
    }
    var selectedFilename=getSelectedFilename();
    var selitem=getSelectedDirectory();
    var path=getPathString(selitem);
  } catch (e) {
    messageBox(window,"BrowseUnlock()","BrowseUnlock() error:"+e);
  }
  var webdavURL=gDialog.serverName.value+path+selectedFilename;
  //first get the lock info for the resource
  var propList="<D:prop><D:locktoken/><D:lockdiscovery/></D:prop>";
  var responseObj=webdav_propfind(webdavURL,propList,gDialog.userName.value,gDialog.userPassword.value);
  switch(responseObj.status) {
    case 207: // OK status, do nothing
      break;
    default:
      messageBox(window,"BrowseUnlock()","("+responseObj.status+") Could not process the request.");
      return;
  }
  var multiStat=processMultiResponse(responseObj.response);
  // process the lock information
  var lockDiscovery=processLockdiscovery(multiStat[0].props["lockdiscovery"].value);
  if(lockDiscovery==null) {
    messageBox(window,"BrowseUnlock()","The resource is not locked");
    return;
  }
  //unlock the file
  responseObj=webdav_unlock(webdavURL,lockDiscovery.locktoken,gDialog.userName.value,gDialog.userPassword.value);
  switch(responseObj.status) {
    case 204: // OK status, do nothing
      break;
    default:
      messageBox(window,"BrowseUnlock()","("+responseObj.status+") Could not unlock item:"+selectedFilename);
  }
  fileView.setCellText(gDialog.FileTree.currentIndex,"lock","");
  fileView.invalidate();
}

function DirSelected() {
  try {
    var selitem=getSelectedDirectory();
    selitem.setAttribute("open","true");
    path=getPathString(selitem);
  } catch(e) {
  // normally we should not get here
    messageBox(window,"DirSelected()","Error with reading the directory information:"+e);
  }
  // read the path info
  var propList=
    "<D:prop>"
    +"<D:displayname/>"
    +"<D:resourcetype/>"
    +"<D:getcontenttype/>"
    +"<D:getcontentlength/>"
    +"<D:getlastmodified/>"
    +"<D:lockdiscovery/>"
    +"</D:prop>";
  var responseObj=webdav_propfind(gDialog.serverName.value+path,propList,gDialog.userName.value,gDialog.userPassword.value);
  // update the UI based on the response
  switch(responseObj.status) {
    case 207: // OK status, do nothing
      break;
    default:
      messageBox(window,"DirSelected()","Error returning the directory content.");
      return;
  }
  updateBrowserUI(responseObj.response,selitem);
}

function removeDir(dirName) {
  try {
    var dirCell=document.getElementById("dir:"+dirName);
    var dirItem=dirCell.parentNode.parentNode; // this should be a <treeitem>
    var dirChildren=dirItem.parentNode; // this should be a <treechildren>
    dirChildren.removeChild(dirItem);
  } catch (e) {
    // normally we should not get here
    throw e;
  }
}

function getMultistatProperty(multiStat,idx,propName) {
  var propObj=multiStat[idx].props[propName];
  if(propObj==null) return "";
  return propObj.value;
}

function updateBrowserUI(webdavXML,selitem) {
  try {
    var webdavPath=getDirPath(gDialog.serverName.value,"");
    // we need this trick, without detaching the fileView the screen refresh fails
    gDialog.FileTree.treeBoxObject.view=null;
    fileView.clear();
    gDialog.FileTree.treeBoxObject.view=fileView;
    var multiStat=processMultiResponse(webdavXML);
    for(var i=0; i<multiStat.length; i++) {
      var r_resourcetype=processResourcetype(getMultistatProperty(multiStat,i,"resourcetype"));
      var r_href=multiStat[i].href;
      var r_getcontenttype=getMultistatProperty(multiStat,i,"getcontenttype");
      var r_getlastmodified=getMultistatProperty(multiStat,i,"getlastmodified");
      var r_lockdiscovery=getMultistatProperty(multiStat,i,"lockdiscovery");
      var r_getcontentlength=getMultistatProperty(multiStat,i,"getcontentlength");
      // it is a directory (collection)
      if(r_resourcetype==":collection") {
        addDirElement(selitem,"dir:"+getDirPath(r_href,webdavPath),getDirName(r_href,webdavPath));
        if(selitem.firstChild.firstChild.getAttribute("id").substr(4)!=getDirPath(r_href,webdavPath)) {
          addFileElement(r_lockdiscovery,getDirName(r_href,webdavPath)+"/","",r_getcontenttype,r_getlastmodified);
        }
      // it is a file (resource)
      } else {
        addFileElement(r_lockdiscovery,getFilename(r_href),r_getcontentlength,r_getcontenttype,r_getlastmodified);
      }
    }
    // select nothing on the fileView, without this there is a problem with the selection, it messes up the pointer
    fileView.selection.currentIndex=0; 
  } catch (e) {
    // normally we should not get here
    messageBox(window,"updateBrowserUI()","Error with updating the directory and file listing:"+e);
  }
}

// add a new file to the list
function addFileElement(lock,name,size,type,lastmodification) {
  var lockscope="";
  if(lock!=null) {
    var lockinfo=processLockdiscovery(lock);
    switch (lockinfo.lockscope) {
      case "exclusive" : lockscope="E"; break;
      case "shared" : lockscope="S"; break;
      default : lockscope="L";
    }
  }
  fileView.addRow([lockscope,name,size,type,lastmodification]);
}

// root element should be a treeitem node
function addDirElement(root, aId, aLabel) {
  //check if there is a treechildren already, if not, create it.
  try {
    var direlem=document.getElementById(aId);
    if(direlem!=null) return;
    // otherwise create a new directory element
    var itemParent;
    var a_treechildren=root.getElementsByTagName("treechildren");
    if(a_treechildren.length>0) itemParent=a_treechildren[0];
    var item = document.createElementNS(kXULNS, "treeitem");
    item.setAttribute("container","true");
    itemParent.appendChild(item);
    var row = document.createElementNS(kXULNS, "treerow");
    item.appendChild(row);
    var treechildren=document.createElementNS(kXULNS, "treechildren");
    item.appendChild(treechildren);
    var cell = document.createElementNS(kXULNS, "treecell");
    cell.setAttribute("id", aId);
    cell.setAttribute("label", aLabel);
    row.appendChild(cell);
  } catch(e) {
    throw e;
  }
  return item;
}

function getSelectedDirectory() {
  var selindex=gDialog.DirectoryTree.view.selection.currentIndex; // which item is selected in the tree(grid)
  return gDialog.DirectoryTree.boxObject.view.getItemAtIndex(selindex); // get the item node from the tree XML
}

function getSelectedFilename() {
  return selectedFilename=fileView.getCellText(gDialog.FileTree.currentIndex,"filename");
}

function getPathString(selDir) {
  return selDir.firstChild.firstChild.getAttribute("id").substr(4);
}

function messageBox(win,boxtitle,boxmessage) {
  const promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
  promptService.alert(win, boxtitle, boxmessage);
}

//*****************************************************************************
// Properties editor functions
//
// states, stored in properties of the first cell: existing, existing_removed, readonly , new, new_removed
// existing <-(remove)-> existing_removed
// new <-(remove)-> new_removed
// (add) -> new
// row properties may store: modified - means that the property was modified

function BrowseEditproperties() {
  if(gDialog.FileTree.currentIndex<0) {
    messageBox(window,"BrowseEditproperties()","Select an item from the file list.");
    return;
  }
  var selectedFilename=getSelectedFilename();
  var selitem=getSelectedDirectory();
  var resourceName=gDialog.serverName.value+getPathString(selitem)+selectedFilename;
  gDialog.PropertiesrootItem.setAttribute("label",resourceName);
  gDialog.PropertiesTab.setAttribute("hidden","false"); // make the properties tab visible
  SwitchPanel(gDialog.PropertiesTab); // switch to the properties tab
  UpdateProperty();
}

function AddProperty() {
  //check if the parent property is read-only
  var selProp=getSelectedProperty();
  if(selProp.firstChild.firstChild.getAttribute("properties")=="readonly") {
    messageBox(window,"AddProperty()","Cannot add a child to a read-only property.");
    return;
  }
  //initialize return values
  var retObj= { propName : "" , propNamespace : "" , propValue : "" , cancel : "false"};
  //open the properties dialog
  window.openDialog("chrome://webdavclient/content/webdavclient-properties.xul","", "chrome,resizable=no,dependent=yes,modal", "add", retObj );
  if(retObj.cancel=="true") return; // cancel the operation
  //do not let the user to create read-only properties
  for(i=0; i<webdavAPIConst.WEBDAV_READONLY_NAMESPACES.length; i++) {
    if(retObj.propNamespace==webdavAPIConst.WEBDAV_READONLY_NAMESPACES[i]) {
      messageBox(window,"AddProperty()","Do not use read-only property namespaces!");  
      return;
    }
  }
  //get the currently selected item
  var prop=getSelectedProperty();
  prop.setAttribute("container","true");
  prop.setAttribute("open","true");
  var propChilds=prop.childNodes;
  var propChildren=null;
  for(var i=0; i<propChilds.length; i++) {
    if(propChilds[i].nodeName=="treechildren") {
      propChildren=propChilds[i];
      break;
    }
  }
  // add another children to the item
  addPropertyItem(propChildren,true,retObj.propNamespace,retObj.propName,retObj.propValue,"new");
  //set the tree dirty, the properties have to be updated
  gDialog.PropertiesTree.setAttribute("dirty","true");
}

function ModifyProperty() {
  //get the currently selected item
  var prop=getSelectedProperty();
  if(prop.firstChild.firstChild.getAttribute("properties")=="readonly") {
    messageBox(window,"ModifyProperty()","Cannot modify the property.");  
    return;
  }
  //get the original cell values
  var retObj= { propName : prop.firstChild.childNodes[0].getAttribute("label") , propNamespace : prop.firstChild.childNodes[1].getAttribute("label") , propValue : prop.firstChild.childNodes[2].getAttribute("label") , cancel : "false"};
  //open the properties dialog
  window.openDialog("chrome://webdavclient/content/webdavclient-properties.xul","", "chrome,resizable=no,dependent=yes,modal", "modify", retObj );
  if(retObj.cancel=="true") return; // cancel the operation
  //do not let the user to modify to read-only namespaces
  for(i=0; i<webdavAPIConst.WEBDAV_READONLY_NAMESPACES.length; i++) {
    if(retObj.propNamespace==webdavAPIConst.WEBDAV_READONLY_NAMESPACES[i]) {
      messageBox(window,"AddProperty()","Do not use read-only property namespaces!");  
      return;
    }
  }
  //modify the treecell values
  prop.firstChild.childNodes[0].setAttribute("label",retObj.propName)
  prop.firstChild.childNodes[1].setAttribute("label",retObj.propNamespace)
  prop.firstChild.childNodes[2].setAttribute("label",retObj.propValue)
  //set the row to modified
  prop.firstChild.setAttribute("properties","modified")
  //set the tree dirty, the properties have to be updated
  gDialog.PropertiesTree.setAttribute("dirty","true");  
}

function RemoveProperty() {
  //get the currently selected item
  var prop=getSelectedProperty();
  // original properties
  var stateOrig=prop.firstChild.firstChild.getAttribute("properties");
  switch(stateOrig) {
    case "existing":
      prop.firstChild.firstChild.setAttribute("properties","existing_removed");
      break;
    case "existing_removed":
      prop.firstChild.firstChild.setAttribute("properties","existing");
      break;
    case "new":
      prop.firstChild.firstChild.setAttribute("properties","new_removed");
      break;
    case "new_removed":
      prop.firstChild.firstChild.setAttribute("properties","new");
      break;
    case "readonly":
      messageBox(window,"RemoveProperty()","Cannot remove the property");
      return;
  }
  //set the tree dirty, the properties have to be updated
  gDialog.PropertiesTree.setAttribute("dirty","true");
}

//supporting variables for building the properties tree for PROPPATCH
//variables are initialized in the UpdateProperty() function
var propSetTree=null; // the new tree
var propSetTreePointer=null // buffering the positions in the new tree
var propRemoveXML=""; // text XML for property remove
var nsCounter=0; // a counter for the generated namespace format: k[0..x]:="aaaa"
var namespaceList=null; //list of the namespaces used in the tree

//this function builds the properties set tree, the tree has to be fixed later...
//the tree traversed using this function recurively
function traversePropertiesTree(node,level) { // node should be a treechildren node, level is the level in the tree, pointer is the latest node of the new tree
  try {
    var treechildrenChilds=node.childNodes;
    var pointer=propSetTreePointer[level];
    if(treechildrenChilds!=null && treechildrenChilds.length>0) {  // only if there is/are children(s)
      for(var i=0; i<treechildrenChilds.length; i++) {
        if(treechildrenChilds[i].nodeName=="treeitem") {
          var treeitemChilds=treechildrenChilds[i].childNodes;
          if(treeitemChilds!=null && treeitemChilds.length>0) {
            var newProp=null;
            for(var j=0; j<treeitemChilds.length; j++) {
              if(treeitemChilds[j].nodeName=="treerow") {
                if(level==0) { // on level 0 we do not want to create the http:// top level node
                  var tempNode=propSetTreePointer[0];
                  propSetTreePointer.push(tempNode);
                } else {
                  var treecellChilds=treeitemChilds[j].childNodes;
                  var propName=treecellChilds[0].getAttribute("label");
                  var propNamespace=treecellChilds[1].getAttribute("label");
                  var propNamespacePrefix=treecellChilds[1].getAttribute("namespace-prefix");
                  var propValue=treecellChilds[2].getAttribute("label");
                  var propType=treecellChilds[0].getAttribute("properties");
                  var propChanged=false;
                  if(treeitemChilds[j].getAttribute("properties")=="modified") propChanged=true;
                  var namespacePrefix="";
                  if(propType=="readonly") {
                    //skip the whole branch if the first node is "readonly"
                    //there are no readonly nodes down the tree anyway (if the first node was not readonly)
                    break; // do not worry about the rest of the props; finish the for(j) cycle now !
                  }
                  if(propType=="new_removed") {
                    break;
                  }
                  if(propNamespace!="") {
                    //first lookup the namespace if it exist
                    for(var k=0; k<nsCounter; k++) {
                      if(namespaceList["k"+k+":"]==propNamespace) {
                        namespacePrefix="k"+k+":";
                        break;
                      }
                    }
                    if(namespacePrefix=="") {
                      namespacePrefix="k"+nsCounter+":"; nsCounter++;
                      namespaceList[namespacePrefix]=propNamespace;
                    }
                  }
                  if(propType=="existing_removed") {
                    var removeNodeName=propName;
                    if(level>2) removeNodeName=propSetTreePointer[2].nodeName;
                    propRemoveXML+="<"+namespacePrefix+removeNodeName+"/>";
                    break;
                  }
                  //only store the namespace if there is one
                  newProp=propSetTree.createElement(namespacePrefix+propName);
                  var newTextNode=propSetTree.createTextNode(propValue);
                  pointer.appendChild(newProp);
                  newProp.appendChild(newTextNode);
                  propSetTreePointer.push(newProp);
                }
              }
              if(treeitemChilds[j].nodeName=="treechildren") { // if it is a children, then go into the new node
                traversePropertiesTree(treeitemChilds[j],level+1);
              }
            }
          }
        }
      }
    }
    propSetTreePointer.pop();
  } catch (e) {
    messageBox(window,"traversePropertiesTree()","Error traversing the properties tree:"+e);
  }
}

function UpdateProperty() {
  // if there is any change in the properties, run the webdav_proppatch
  if(gDialog.PropertiesTree.getAttribute("dirty")=="true") {
    try {

      // build a tree of properties for WebDAV
      propSetTree=document.implementation.createDocument("","", null);
      propRemoveXML="<D:prop>";
      var propSetTreeRoot=propSetTree.createElement("D:prop");
      propSetTree.appendChild(propSetTreeRoot);
      propSetTreePointer=new Array();
      propSetTreePointer.push(propSetTreeRoot);
      nsCounter=0;
      namespaceList=new Array();
      traversePropertiesTree(gDialog.PropertiesRoot.parentNode.parentNode,0);

//      traversePropSetTree(propSetTreeRoot,0);

      propRemoveXML+="</D:prop>";

      var serializer=new XMLSerializer();
      var propSetXML=serializer.serializeToString(propSetTree); // serialize the propSetTree
      // call webdav_proppatch
      webdavURL=gDialog.PropertiesrootItem.getAttribute("label");
      var propertyUpdate="<D:propertyupdate xmlns:D=\"DAV:\" ";
      //add all the namespaces
      for(var i=0; i<nsCounter; i++) {
        propertyUpdate+="xmlns:k"+i+"=\""+namespaceList["k"+i+":"]+"\" ";
      }
      propertyUpdate+=">\r\n";
      propertyUpdate+="<D:remove>"+propRemoveXML+"</D:remove>\r\n";
      propertyUpdate+="<D:set>"+propSetXML+"</D:set>\r\n";
      propertyUpdate+="</D:propertyupdate>";

      var responseObj=webdav_proppatch(webdavURL,propertyUpdate,gDialog.userName.value,gDialog.userPassword.value);
      // process multi-response response object
//XXX this part is missing
//...
      gDialog.PropertiesTree.setAttribute("dirty","false");
    } catch(e) {
      messageBox(window,"UpdateProperty()","Error with updating the properties on the server: "+e);
    }
  }

  // read the properties using webdav_propfind
  var webdavURL=gDialog.PropertiesrootItem.getAttribute("label");
  try {
    // wipe out the tree
    var propTreeItems=gDialog.PropertiesRoot.childNodes;
    for(var i=0; i<propTreeItems.length; i++)
      gDialog.PropertiesRoot.removeChild(propTreeItems[i]);
    // get the base node for the tree
    var responseObj=webdav_propfind(webdavURL,null,gDialog.userName.value,gDialog.userPassword.value);
    var respDOMParser=new DOMParser();
    var xmlDoc=respDOMParser.parseFromString(responseObj.response,"text/xml");
    var nsIDOMXPathEvaluator = Components.classes["@mozilla.org/dom/xpath-evaluator;1"].getService(Components.interfaces.nsIDOMXPathEvaluator);
    var NSresolver=nsIDOMXPathEvaluator.createNSResolver(xmlDoc.getElementsByTagName("multistatus")[0]);
    var result=XPathResult(nsIDOMXPathEvaluator,"/D:multistatus/D:response/D:propstat/D:prop",xmlDoc,NSresolver,4);
    var propNode=result.iterateNext();
    // build a new tree
    traverseAndBuildTree(gDialog.PropertiesRoot,propNode);
  } catch (e) {
    messageBox(window,"UpdateProperty()","Error with getting the properties: "+e);
  }
}

function traverseAndBuildTree(parentNode,node) {
  try {
    var childs=node.childNodes;
    var nextParent=null;
    if(childs.length!=0 && (childs.length>1 || childs[0].nodeType==1)) {
      var nodeValue="";
      if(node.firstChild!=null) nodeValue=node.firstChild.nodeValue;
      if(node.nodeName!="D:\prop") {
        var propType="existing";
        if(node.namespaceURI=="DAV:") propType="readonly";
        if(node.namespaceURI=="http://apache.org/dav/props/") propType="readonly"; // this is Apache's property
        nextParent=addPropertyItem(parentNode,false,node.namespaceURI,node.nodeName,nodeValue,propType);
      } else nextParent=parentNode;
      for(var i=0; i<childs.length; i++) {
        if(childs[i].nodeType==1)
          traverseAndBuildTree(nextParent,childs[i]);
      }
    } else {
      var nodeValue="";
      if(node.firstChild!=null) nodeValue=node.firstChild.nodeValue;
      var propType="existing";
      if(node.namespaceURI=="DAV:") propType="readonly";
      if(node.namespaceURI=="http://apache.org/dav/props/") propType="readonly"; // this is Apache's property
      addPropertyItem(parentNode,true,node.namespaceURI,node.nodeName,nodeValue,propType);
    }
  } catch (e) {
    throw e;
  }
}

function addPropertyItem(parentNode,isLeaf,propNS,propName,propValue,propStat) {
  var item = document.createElementNS(kXULNS, "treeitem");
  if(!isLeaf) {
    item.setAttribute("container","true");
    item.setAttribute("open","true");
  }
  var row = document.createElementNS(kXULNS, "treerow");
  item.appendChild(row);
  var cell1 = document.createElementNS(kXULNS, "treecell");
  cell1.setAttribute("label",nodeNameWithoutNS(propName));
  cell1.setAttribute("properties",propStat);
  row.appendChild(cell1);
  var cell2 = document.createElementNS(kXULNS, "treecell");
  cell2.setAttribute("label",propNS);
  cell2.setAttribute("namespace-prefix",propName.substr(0,propName.indexOf(':'))); // store the namespace prefix for the property
  row.appendChild(cell2);
  var cell3 = document.createElementNS(kXULNS, "treecell");
  cell3.setAttribute("label",propValue);
  row.appendChild(cell3);
  var treechildren=document.createElementNS(kXULNS, "treechildren");
  item.appendChild(treechildren);
  parentNode.appendChild(item);
  return treechildren;
}

function getSelectedProperty() {
  var selindex=gDialog.PropertiesTree.view.selection.currentIndex; // which item is selected in the tree(grid)
  return gDialog.PropertiesTree.boxObject.view.getItemAtIndex(selindex); // get the item node from the tree XML
}
