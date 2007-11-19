/*************************************************************************************************************   
 Copyright:	Inverse groupe conseil, 2006-2007
 Author: 	Robert Bolduc
 Email:		support@inverse.ca
 URL:			http://inverse.ca
  
 This file is part of "SOGo Connector" a Thunderbird extension.

    "SOGo Connector" is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License version 2 as published by
    the Free Software Foundation;

    "SOGo Connector" is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with "SOGo Connector"; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 ********************************************************************************/

var logLevelVal = {
	debug : 3,
	info  : 2,
	warn  : 1,
	error : 0
}

var gLogLevel = logLevelVal.debug; //TODO: This value should change to WARN around version 0.8
var logFile;
var logFileName;
var logPath;

const maxLogFileSize = 1024 * 1024;
const LOG_LEVEL_PREF	= "extensions.ca.inverse.logLevel";
const LOG_FILE 		= "extensions.ca.inverse.sogo.connector.log";

initLogFile(LOG_FILE);

function initLogFile(fileName){
	var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	if (prefService.prefHasUserValue(LOG_LEVEL_PREF)){
		gLogLevel = prefService.getIntPref(LOG_LEVEL_PREF);
	}else{
		prefService.setIntPref(LOG_LEVEL_PREF, gLogLevel);
	}
	try{
		netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
	}catch (e){
		messageBox(window,"Message","Permissions do not allow to log events in a file");
		throw e;
	}
	// get the path to the user's home (profile) directory
	var dirService = new Components.Constructor("@mozilla.org/file/directory_service;1","nsIProperties");
	var userProfileDir;
	try{ 
		userProfileDir = (new dirService()).get("ProfD", Components.interfaces.nsIFile); //nsIFile
		logPath=userProfileDir.path; 
	}catch (e){
		messageBox(window,"Message","error");
		throw e;
	}
	// determine the file-separator
	if (logPath.search(/\\/) != -1) {
		logPath = logPath + "\\";
	}else{
		logPath = logPath + "/";
	}

	logFileName = logPath + fileName;
	var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	file.initWithPath(logFileName);
   if (!file.exists()){
		file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0664);
	}else	if (file.fileSize > maxLogFileSize ){
		file.moveTo(null, fileName + ".bak");
		file.initWithPath(logFileName);
		file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0664);
   }
	logDebug("Logging service started successfully");
}

function logDebug(message){
	if (gLogLevel >= logLevelVal.debug){
		xulFileWrite(logFileName, new Date().toString() + " [DEBUG] " + message + "\n");
	}
}

function logInfo(message){
	if (gLogLevel >= logLevelVal.info){
		xulFileWrite(logFileName, new Date().toString() + " [INFO]  " + message + "\n");
	}
}

function logWarn(message){
	if (gLogLevel >= logLevelVal.warn){
		xulFileWrite(logFileName, new Date().toString() + " [WARN]  " + message + "\n");
	}
}

function logError(message){
	if (gLogLevel >= logLevelVal.error){
		xulFileWrite(logFileName, new Date().toString() + " [ERROR] " + message + "\n");
	}
}

function messageBox(win,boxtitle,boxmessage){
	const promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	promptService.alert(win, boxtitle, boxmessage );
}

function exceptionBox(win,boxtitle,exception){
	const promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	promptService.alert(win, boxtitle, exception + "\n File: "+  exception.fileName + 
		"\n Line: " + exception.lineNumber + "\n\n Stack:\n\n" + exception.stack);
}


function exceptionHandler(win,boxtitle,exception){
	exceptionBox(null,boxtitle,exception);
	logError(exception + "\n File: "+  exception.fileName + "\n Line: " + exception.lineNumber + "\n\n Stack:\n\n" + exception.stack);
	throw exception;
}

function xulReadFile(path, charset){
	try{
		dump("you are a B***");
		var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(path);
		
		var data     = new String();
		var fiStream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
		var siStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
		fiStream.init(file, 1, 0, false);
		siStream.init(fiStream);
		data += siStream.read(-1);
		siStream.close();
		fiStream.close();
		return data;
	}catch(e){
		throw e;
		return false;
	}	
}

function xulFileWrite(filePath, content){
	try{
		netscape.security.PrivilegeManager.enablePrivilege ("UniversalXPConnect");
		var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(filePath);
		if (!file.exists()) {
			messageBox(window,"Message",'Creating new file ' + filePath);
			file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);
		}
		var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
		outputStream.init(file, 0x04 | 0x10, 00004, null);
		outputStream.write(content, content.length);
		outputStream.flush();
		outputStream.close();
		return true;
	}catch (e){
		exceptionBox(window, "xulFileWrite", e);
		return false;
	}
}

//Using Mozilla password manager to retrieve the password
function getPassword(host, user){
	var dhost= new Object();
	var duser= new Object();
	var pass= new Object();
	try{
		var pmInternal = Components.classes["@mozilla.org/passwordmanager;1"].createInstance(Components.interfaces.nsIPasswordManagerInternal);
		var ret=pmInternal.findPasswordEntry(host,user,"",dhost,duser,pass);
		return pass.value;
	}catch(e){}
	return "";
}

//Using Mozilla password manager to save the password
function setPassword(host, user, pwd){
	var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].createInstance(Components.interfaces.nsIPasswordManager);
	try{
		passwordManager.removeUser(host,user);
		passwordManager.addUser(host, user, pwd);
	}catch(e){}
	passwordManager.addUser(host,user,pwd);
}

function backtrace(aDepth) {
	var depth = aDepth || 10000;
	var stack = "";
	var frame = arguments.callee.caller;
	
	for (var i = 1; i <= depth; i++) {
		stack += i+": "+ frame.name+ "\n";
		frame = frame.arguments.callee.caller;
		if (!frame){
			break;
		}
	}
	return stack;
}

// Returns a decimal number with a 1 digit decimal portion
function getThunderbirdMajorVersionNumber(){

 var fullThunderbirdVersion = Components.classes["@mozilla.org/xre/app-info;1"].createInstance(Components.interfaces.nsIXULAppInfo).version;
 
 return fullThunderbirdVersion.substr(0,3);
}