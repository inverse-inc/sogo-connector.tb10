/* mozilla.utils.inverse.ca.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

let logLevelVal = {
    debug : 3,
    info  : 2,
    warn  : 1,
    error : 0
};

let gLogLevel = logLevelVal.debug; //TODO: This value should change to WARN around version 0.8
let logFile;
let logFileName;
let logPath;

let maxLogFileSize = 1024 * 1024;
let LOG_LEVEL_PREF	= "extensions.ca.inverse.logLevel";
let LOG_FILE 		= "extensions.ca.inverse.sogo.connector.log";

initLogFile(LOG_FILE);

function initLogFile(fileName){
    let prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    if (prefService.prefHasUserValue(LOG_LEVEL_PREF)){
        gLogLevel = prefService.getIntPref(LOG_LEVEL_PREF);
    }else{
        prefService.setIntPref(LOG_LEVEL_PREF, gLogLevel);
    }
    try{
        if (typeof netscape != "undefined")
            netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
    }
    catch (e) {
        if (typeof window == "undefined")
            dump("Permissions do not allow to log events in a	file\n");
        else
            messageBox(window, "Message",
                       "Permissions do not allow to log events in a	file");
        throw e;
    }
    // get the path to the user's home (profile) directory
    let dirService = new Components.Constructor("@mozilla.org/file/directory_service;1","nsIProperties");
    let userProfileDir;
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
    let file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(logFileName);
    if (!file.exists()){
        file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0664);
    }else	if (file.fileSize > maxLogFileSize ){
        file.moveTo(null, fileName + ".bak");
        file.initWithPath(logFileName);
        file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0664);
    }
    // 	logDebug("Logging service started successfully");
}

function logDebug(message){
    if (message[message.length-1] != "\n")
        message += "\n";
    dump ("DEBUG: " + message)l
    return;
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
    let data = null;
    try {
        dump("you are a B***");
        let file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(path);

        data = new String();
        let fiStream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
        let siStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
        fiStream.init(file, 1, 0, false);
        siStream.init(fiStream);
        data += siStream.read(-1);
        siStream.close();
        fiStream.close();
    }
    catch(e) {
        throw e;
    }

    return data;
}

function xulFileWrite(filePath, content){
    let rc = false;

    try{
        if (typeof netscape != "undefined")
            netscape.security.PrivilegeManager.enablePrivilege ("UniversalXPConnect");
        let file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(filePath);
        if (!file.exists()) {
            messageBox(window,"Message",'Creating new file ' + filePath);
            file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);
        }
        let outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
        outputStream.init(file, 0x04 | 0x10, 00004, null);
        outputStream.write(content, content.length);
        outputStream.flush();
        outputStream.close();

        rc = true;
    }
    catch(e) {
        exceptionBox(window, "xulFileWrite", e);
    }

    return rc;
}

//Using Mozilla password manager to retrieve the password
function getPassword(host, user){
    let password = "";

    let dhost= new Object();
    let duser= new Object();
    let pass= new Object();
    try {
        let pmInternal = Components.classes["@mozilla.org/passwordmanager;1"].createInstance(Components.interfaces.nsIPasswordManagerInternal);
        let ret=pmInternal.findPasswordEntry(host,user,"",dhost,duser,pass);
        password = pass.value;
    }
    catch(e) {}

    return password;
}

//Using Mozilla password manager to save the password
function setPassword(host, user, pwd) {
    let passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                    .createInstance(Components.interfaces.nsIPasswordManager);
    try {
        passwordManager.removeUser(host,user);
        passwordManager.addUser(host, user, pwd);
    }
    catch(e){}

    passwordManager.addUser(host,user,pwd);
}

function backtrace(aDepth) {
    let depth = aDepth || 10;
    let stack = "";
    let frame = arguments.callee.caller;

    for (let i = 1; i <= depth; i++) {
        stack += i+": "+ frame.name + "\n";
        frame = frame.caller;
        if (!frame){
            break;
        }
    }

    return stack;
}

// Returns a decimal number with a 1 digit decimal portion
function getThunderbirdMajorVersionNumber() {
    let fullThunderbirdVersion = Components.classes["@mozilla.org/xre/app-info;1"].createInstance(Components.interfaces.nsIXULAppInfo).version;

    return fullThunderbirdVersion.substr(0,3);
}

String.repeat = function(pattern, times) {
    let newString = "";

    for (let i = 0; i < times; i++) {
        newString += pattern;
    }

    return newString;
};

/* object dumper */
function objectDumper() {
}

objectDumper.prototype = {
    indent: 0,
    dump: function(object) {
        let text = "";

        let oType = typeof object;
        if (oType == "function")
            text += this._dumpFunction(object);
        else if (oType == "string"
                 || oType == "number")
        text += this._dumpString(object);
        else if (oType == "object")
        text += this._dumpObject(object);
        else if (oType == "undefined")
        text += "<undefined>";

        return text;
    },
    _dumpFunction: function(object) {
        return "<function: " + object.name + ">";
    },
    _dumpString: function(object) {
        return "" + object;
    },
    _dumpObject: function(object) {
        let text = "";

        if (object instanceof Array)
            text += this._dumpArray(object);
        else if (object instanceof Object)
        text += this._dumpCustomObject(object);
        else
            text += "<object: " + object + ">";

        return text;
    },
    _dumpArray: function(object) {
        let text = "[";

        if (object.length > 0) {
            text += this.dump(object[0]);
            for (let i = 1; i < object.length; i++) {
                text += ", " + this.dump(object[i]);
            }
        }
        else {
            text += "<empty array>";
        }
        text += "]";

        return text;
    },
    _dumpCustomObject: function(object) {
        let braceIndentation = String.repeat(" ", this.indent);
        let text = "{";

        this.indent += 2;
        let indentation = String.repeat(" ", this.indent);
        for (let key in object) {
            try {
                text += indentation + key + ": " + this.dump(object[key]) + "\n";
            }
            catch(e) {
                text += indentation + key + ":" + " (an exception occured)\n";
            }
        }
        this.indent -= 2;
        text += braceIndentation + "}";

        return text;
    }
};

function dumpObject(object) {
    let dumper = new objectDumper();
    return dumper.dump(object);
}
