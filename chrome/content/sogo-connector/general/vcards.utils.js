/* vcards.utils.js - This file is part of "SOGo Connector", a Thunderbird extension.
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

function jsInclude(files, target) {
    let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                           .getService(Components.interfaces.mozIJSSubScriptLoader);
    for (let i = 0; i < files.length; i++) {
        try {
            loader.loadSubScript(files[i], target);
        }
        catch(e) {
            dump("vcards.utils.js: failed to include '" + files[i] +
                 "'\n" + e
                 + "\nFile: " + e.fileName
                 + "\nLine: " + e.lineNumber + "\n\n Stack:\n\n" + e.stack);
        }
    }
}

jsInclude(["chrome://inverse-library/content/uuid.js",
           "chrome://inverse-library/content/quoted-printable.js"]);

function escapedForCards(theString) {
    theString = theString.replace(/\\/g, "\\\\");
    theString = theString.replace(/,/g, "\\,");
    theString = theString.replace(/;/g, "\\;");
    theString = theString.replace(/,/g, "\\,");
    //  theString.replace(/\n/g, "\\n,");
    //  theString.replace(/\r/g, "\\r,");

    return theString;
}

function unescapedFromCard(theString) {
    theString = theString.replace(/\\/g, "\\");
    theString = theString.replace(/\,/g, ",");
    theString = theString.replace(/\;/g, ";");
    theString = theString.replace(/\,/g, ",");
    //  theString.replace(/\\n/g, "\n,");
    //  theString.replace(/\\r/g, "\r,");

    return theString;
}

/* this method parses a versit directory:
 - normalizing the charset and encodings;
 - returning the lines as hashes filled with the tag, parameters and values
 accurately separated;
 No support yet for embedded directories (VCALENDAR) */
function versitParse(versitString) {
    let parseResult = new Array();
    let currentLine = {};
    let isEscaped = false;
    let type = 0; /* 0 = tag, 1 = parameters, 2 = value */
    let parameters = {};
    let values = new Array();

    let tag = "";
    let parameterName = "type";
    let parameter = "";
    let value = "";

    let currentChar = 0;
    while (currentChar < versitString.length) {
        let character = versitString[currentChar];
        if (isEscaped) {
            let lowerChar = character.toLowerCase();
            if (lowerChar == "n")
                character = "\n";
            else if (lowerChar == "r")
            character = "\r";
            else if (lowerChar == "t")
            character = "\t";
            else if (lowerChar == "b")
            character = "\b";

            if (type == 0)
                tag += character;
            else if (type == 1)
            parameter += character;
            else
                value += character;
            isEscaped = false;
        }
        else {
            if (character == "\\")
                isEscaped = true;
            else {
                if (type == 0) {
                    if (character == ";") {
                        currentLine["tag"] = tag.toLowerCase();
                        parameters = {};
                        parameterName = "type";
                        parameter = "";
                        type = 1;
                    }
                    else if (character == ":") {
                        currentLine["tag"] = tag.toLowerCase();
                        values = new Array();
                        value = "";
                        type = 2;
                    }
                    else if (character == "\r" && versitString[currentChar+1] == "\n") {
                        /* some implementations do not comply and fold their lines
                         qp-style but without escaping their crlf... */
                        let lastLine = parseResult[parseResult.length-1];
                        let values = lastLine["values"];
                        let lastValue = values[values.length-1];
                        if (lastValue[lastValue.length-1] == "=") {
                            values[values.length-1]
                                = lastValue.substr(0, lastValue.length-1) + tag;
                            tag = "";
                            currentChar++;
                        }
                        else
                            tag+=character;
                    }
                    else
                        tag += character;
                }
                else if (type == 1) {
                    if (character == "=") {
                        parameterName = parameter.toLowerCase();
                        parameter = "";
                    }
                    else if (character == ";") {
                        if (typeof parameters[parameterName] == "undefined")
                            parameters[parameterName] = new Array();
                        parameters[parameterName].push(parameter);
                        parameterName = "type";
                        parameter = "";
                    }
                    else if (character == ":") {
                        if (typeof parameters[parameterName] == "undefined")
                            parameters[parameterName] = new Array();
                        parameters[parameterName].push(parameter);
                        currentLine["parameters"] = parameters;
                        values = new Array();
                        value = "";
                        type = 2;
                    }
                    else
                        parameter += character;
                }
                else {
                    if (character != "\r") {
                        if (character == ";") {
                            values.push(value);
                            value = "";
                        }
                        else if (character == "\n") {
                            let nextChar = versitString[currentChar+1];
                            if (typeof nextChar != "undefined" && nextChar == " ")
                                currentChar++;
                            else {
                                // 								dump("tag: ^" + currentLine["tag"] + "$\n");
                                // 								dump("value: ^" + value + "$\n");
                                values.push(value);
                                currentLine["values"] = values;
                                parseResult.push(currentLine);
                                currentLine = {};
                                tag = "";
                                type = 0;
                            }
                        }
                        else
                            value += character;
                    }
                }
            }
        }
        currentChar++;
    }

    return parseResult;
}

/* VCARD */
/**************************************************************************
 * Function to import directly the vcard.
 *
 * outParameters must be an array, to enable the fonction to pass back the value
 * of custom fields that are not part of a Thunderbird card.
 *
 **************************************************************************/
function importFromVcard(vCardString// , customFields
                        ) {
    let card = null;
    if (!vCardString || vCardString == "")
        dump("'vCardString' is empty\n" + backtrace() + "\n");
    else {
        let vcard = versitParse(vCardString);
        // 	let cardDump = dumpObject(vcard);
        // 	logInfo("vcard dump:\n" + cardDump);
        card = CreateCardFromVCF(vcard// , customFields
                                );

        // dump("card content:\n" + vCardString + "\n");
    }

    return card;
}

// outParameters must be an array, to enable the fonction to pass back the value
// of custom fields that are not part of a Thunderbird card.
function CreateCardFromVCF(vcard// , outParameters
                          ) {
    let version = "2.1";
    let defaultCharset = "iso-8859-1"; /* 0 = latin 1, 1 = utf-8 */
    // let card = Components.classes["@inverse.ca/addressbook/volatile-abcard;1"]
    // 	.createInstance(Components.interfaces.nsIAbCard).wrappedJSObject;

    let card = Components.classes["@mozilla.org/addressbook/moz-abmdbcard;1"]
                         .createInstance(Components.interfaces.nsIAbCard);

    // outParameters["fburl"] = "";
    // outParameters["uid"] = "";
    // outParameters["groupDavVcardCompatibility"] = "";

    for (let i = 0; i < vcard.length; i++) {
        if (vcard[i]["tag"] == "version") {
            version = vcard[i]["values"][0];
        }
    }
    if (version[0] == "3")
        defaultCharset = "utf-8";

    for (let i = 0; i < vcard.length; i++) {
        let tag = vcard[i]["tag"];
        let charset = defaultCharset;
        let encoding = null;

        let parameters = vcard[i]["parameters"];
        if (parameters) {
            for (let parameter in parameters) {
                if (parameter == "encoding")
                    encoding = parameters[parameter][0].toLowerCase();
                if (parameter == "charset")
                    charset = parameters[parameter][0].toLowerCase();
            }
        }
        else
            parameters = {};

        let values = decodedValues(vcard[i]["values"], charset, encoding);
        InsertCardData(card, tag, parameters, values// , outParameters
                      );
    }

    return card;
}

let _insertCardMethods = {
    _upperTypes: function(types) {
        let upperTypes = [];
        if (types && types.length > 0) {
            let preTypes = types.join(",").split(",");
            for (let i = 0; i < preTypes.length; i++)
                upperTypes.push(preTypes[i].toUpperCase());
        }

        return upperTypes;
    },

    n: function(props, parameters, values) {
        props.extend({ "LastName": values[0],
                       "FirstName": values[1] });
    },
    fn: function(props, parameters, values) {
        props.extend({ "DisplayName": values[0] });
    },
    nickname: function(props, parameters, values) {
        props.extend({ "NickName": values[0] });
    },
    org: function(props, parameters, values) {
        props.extend({ "Company": values[0],
                       "Department": values[1] });
    },
    tel: function(props, parameters, values) {
        let abTypes = { "FAX": "FaxNumber",
                        "CELL": "CellularNumber",
                        "PAGER": "PagerNumber",
                        "HOME": "HomePhone",
                        "WORK": "WorkPhone" };
        /* This array guarantees the order in which the keys will be checked */
        let knownType = false;
        let cardCheckTypes = [ "FAX", "CELL", "PAGER", "HOME", "WORK" ];
        if (parameters["type"] && parameters["type"].length > 0) {
            let types = this._upperTypes(parameters["type"]);

            for (let i = 0; !knownType && i < cardCheckTypes.length; i++) {
                let type = cardCheckTypes[i];
                if (types.indexOf(type) > -1) {
                    let abType = abTypes[type];
                    if ((type != "WORK" && types.indexOf("WORK") > -1)
                        || (!props[abType] || props[abType].length == 0)) {
                        props[abType] = values[0];
                    }
                    knownType = true;
                }
            }
        }

        if (!knownType) {
            let addTypes = [ "WorkPhone", "HomePhone" ];
            for (let i = 0; !knownType && i < addTypes.length; i++) {
                let type = addTypes[i];
                if (!props[type] || props[type].length == 0) {
                    props[type] = values[0];
                    knownType = true;
                }
            }
        }
    },
    adr: function(props, parameters, values) {
        let types = this._upperTypes(parameters["type"]);
        if (types.indexOf("WORK") > -1) {
            props.extend({ "WorkAddress2": values[1],
                           "WorkAddress": values[2],
                           "WorkCity": values[3],
                           "WorkState": values[4],
                           "WorkZipCode": values[5],
                           "WorkCountry": values[6] });
        }
        else {
            props.extend({ "HomeAddress2": values[1],
                           "HomeAddress": values[2],
                           "HomeCity": values[3],
                           "HomeState": values[4],
                           "HomeZipCode": values[5],
                           "HomeCountry": values[6] });
        }

        return props;
    },
    email: function(props, parameters, values) {
        let types = this._upperTypes(parameters["type"]);
        if (types.indexOf("PREF") > -1 || types.indexOf("WORK") > -1) {
            props["PrimaryEmail"] = values[0];
        }
        else if (types.indexOf("HOME") > -1) {
            props["SecondEmail"] = values[0];
        }
        else {
            if (props["PrimaryEmail"] && props["PrimaryEmail"].length > 0) {
                props["SecondEmail"] = values[0];
            }
            else {
                props["PrimaryEmail"] = values[0];
            }
        }
    },
    url: function(props, parameters, values) {
        let types = this._upperTypes(parameters["type"]);
        let propName = ((types.indexOf("WORK") > -1)
                        ? "WebPage1"
                        : "WebPage2" );
        props[propName] = values[0];
    },
    title: function(props, parameters, values) {
        props["JobTitle"] = values[0];
    },
    bday: function(props, parameters, values) {
        if (values[0].length > 0) {
            let subValues = values[0].split("-");
            props.extend({ "BirthYear": subValues[0],
                           "BirthMonth": subValues[1],
                           "BirthDay": subValues[2] });
        }
    },
    "x-aim": function(props, parameters, values) {
        props["_AimScreenName"] = values[0];
    },
    "x-mozilla-html": function(props, parameters, values) {
        let value = ((values[0].toLowerCase() == "true")
                     ? 2
                     : 1);
        props["PreferMailFormat"] = value;
    },
    note: function(props, parameters, values) {
        props["Notes"] = values.join(";");
    },
    custom1: function(props, parameters, values) {
        props["Custom1"] = values[0];
    },
    custom2: function(props, parameters, values) {
        props["Custom2"] = values[0];
    },
    custom3: function(props, parameters, values) {
        props["Custom3"] = values[0];
    },
    custom4: function(props, parameters, values) {
        props["Custom4"] = values[0];
    },

    /* external properties */
    uid: function(props, parameters, values) {
        props["CardUID"] = values[0];
    },

    fburl: function(props, parameters, values) {
        props["CalFBURL"] = values[0];
    },

    /* ignored properties */
    begin: function(props, parameters, values) {
    },
    end: function(props, parameters, values) {
    }
};

function InsertCardData(card, tag, parameters, values) {
    // 	logInfo("InsertCardData: " + tag + "\n");

    let properties = {};
    properties.extend = function Object_extend(otherObj) {
        for (let k in otherObj) {
            this[k] = otherObj[k];
        }
    };

    if (typeof _insertCardMethods[tag] != "undefined")
        _insertCardMethods[tag](properties, parameters, values);
    else
        properties[tag] = values.join(";");

    delete (properties["extend"]);

    for (let k in properties) {
        if (properties[k] && properties[k].length > 0) {
            card.setProperty(k, properties[k]);
        }
    }
}

function sanitizeBase64(value) {
    // dump("oldValue:\n" + value + "\n");
    value = value.replace("\r", "", "g");
    value = value.replace("\n", "", "g");
    value = value.replace("\t", "", "g");
    value = value.replace(" ", "", "g");

    // dump("newValue:\n" + value + "\n");

    return value;
}

function decodedValues(values, charset, encoding) {
    let newValues = [];

    let decoder = new QuotedPrintableDecoder();
    decoder.charset = charset;

    for (let i = 0; i < values.length; i++) {
        let decodedValue = null;
        if (encoding) {
            //  			dump("encoding: " + encoding + "\n");
            //  			dump("initial value: ^" + values[i] + "$\n");
            var saneb64Value = sanitizeBase64(values[i]);
            if (encoding == "quoted-printable") {
                decodedValue = decoder.decode(saneb64Value);
            }
            else if (encoding == "base64") {
                try {
                    decodedValue = window.atob(values[i]);
                }
                catch(e) {
                    dump("vcards.utils.js: failed to decode '" + values[i] +
                         "'\n" + e + "\n\n Stack:\n" + e.stack + "\n\n");
                }
            }
            else {
                dump("Unsupported encoding for vcard value: " + encoding);
                decodedValue = values[i];
            }
            //  			dump("decoded: " + decodedValue + "\n");
        }
        else
            decodedValue = values[i];
        if (charset == "utf-8"
            || (encoding && (encoding == "base64" || encoding == "b"))) {
            newValues.push(decodedValue);
        }
        else {
            let converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"]
                                      .getService(Components.interfaces.nsIUTF8ConverterService);
            newValues.push(converter.convertStringToUTF8(decodedValue, charset, false));
        }
    }

    // 	logInfo("newValues: " + dumpObject(newValues));

    return newValues;
}

function card2vcard(card) {
    let vCard = ("BEGIN:VCARD\r\n"
                 + "VERSION:3.0\r\n"
                 + "PRODID:-//Inverse inc.//SOGo Connector 1.0//EN\r\n");
    let uid = card.getProperty("CardUID", "");
    if (!uid.length) {
        uid = card.getProperty("groupDavKey", "");
        card.setProperty("CardUID", uid);
    }
    if (!uid.length) {
        uid = new UUID();
        card.setProperty("CardUID", uid);
    }
    vCard += "UID:" + uid + "\r\n";

    let lastName = card.getProperty("LastName", "");
    let firstName = card.getProperty("FirstName", "");
    if (lastName.length || firstName.length)
        vCard += "N:" + lastName + ";" + firstName + "\r\n";

    let displayName = card.getProperty("DisplayName", "");
    if (displayName.length)
        vCard += "FN:" + displayName + "\r\n";

    let company = card.getProperty("Company", "");
    let department = card.getProperty("Department", "");
    if (company.length || department.length)
        vCard += "ORG:" +company+ ";" +department+ "\r\n";

    let nickName = card.getProperty("NickName", "");
    if (nickName.length)
        vCard += "NICKNAME:" +nickName+ "\r\n";

    let workAddress = card.getProperty("WorkAddress", "");
    let workAddress2 = card.getProperty("WorkAddress2", "");
    let workCity = card.getProperty("WorkCity", "");
    let workState = card.getProperty("WorkState", "");
    let workZipCode = card.getProperty("WorkZipCode", "");
    let workCountry = card.getProperty("WorkCountry", "");
    if ((workAddress + workAddress2 + workCity + workState + workZipCode
         + workCountry).length)
        vCard += "ADR;TYPE=work:;" + workAddress2 + ";" +workAddress+ ";" +workCity+ ";" +workState+ ";" +workZipCode+ ";" +workCountry+ "\r\n";

    let homeAddress = card.getProperty("HomeAddress", "");
    let homeAddress2 = card.getProperty("HomeAddress2", "");
    let homeCity = card.getProperty("HomeCity", "");
    let homeState = card.getProperty("HomeState", "");
    let homeZipCode = card.getProperty("HomeZipCode", "");
    let homeCountry = card.getProperty("HomeCountry", "");
    if ((homeAddress + homeAddress2 + homeCity + homeState + homeZipCode
         + homeCountry).length)
        vCard += "ADR;TYPE=home:;" + homeAddress2 + ";" +homeAddress+ ";" +homeCity+ ";" +homeState+ ";" +homeZipCode+ ";" +homeCountry+ "\r\n";

    let workPhone = card.getProperty("WorkPhone", "");
    if (workPhone.length)
        vCard += "TEL;TYPE=work:" + workPhone+ "\r\n";

    let homePhone = card.getProperty("HomePhone", "");
    if (homePhone.length)
        vCard += "TEL;TYPE=home:" + homePhone+ "\r\n";

    let cellularNumber = card.getProperty("CellularNumber", "");
    if (cellularNumber.length)
        vCard += "TEL;TYPE=cell:" + cellularNumber + "\r\n";

    let faxNumber = card.getProperty("FaxNumber", "");
    if (faxNumber.length)
        vCard += "TEL;TYPE=fax:" + faxNumber+ "\r\n";

    let pagerNumber = card.getProperty("PagerNumber", "");
    if (pagerNumber.length)
        vCard += "TEL;TYPE=pager:" + pagerNumber + "\r\n";

    let preferMailFormat = card.getProperty("PreferMailFormat", 0);
    if (preferMailFormat) {
        let value = ((preferMailFormat == 2)
                     ? "TRUE"
                     : "FALSE");
        vCard += "X-MOZILLA-HTML:" + value + "\r\n";
    }

    let primaryEmail = card.getProperty("PrimaryEmail", "");
    let secondEmail = card.getProperty("SecondEmail", "");

    if (primaryEmail.length) {
        vCard += "EMAIL;TYPE=work:" + primaryEmail + "\r\n";
        if (secondEmail.length)
            vCard += "EMAIL;TYPE=home:" + secondEmail+ "\r\n";
    }
    else if (secondEmail.length)
    vCard += "EMAIL;TYPE=work:" + secondEmail + "\r\n";

    let webPage1 = card.getProperty("WebPage1", "");
    if (webPage1.length)
        vCard += "URL;TYPE=work:" + webPage1 + "\r\n";

    let webPage2 = card.getProperty("WebPage2", "");
    if (webPage2.length)
        vCard += "URL;TYPE=home:" + webPage2 + "\r\n";

    let jobTitle = card.getProperty("JobTitle", "");
    if (jobTitle.length)
        vCard += "TITLE:" + jobTitle + "\r\n";

    let birthYear = card.getProperty("BirthYear", 0);
    let birthMonth = card.getProperty("BirthMonth", 0);
    let birthDay = card.getProperty("BirthDay", 0);
    if (birthYear && birthMonth && birthDay)
        vCard += "BDAY:" + birthYear + "-" + birthMonth + "-" + birthDay + "\r\n";

    for (let i = 1; i < 5; i++) {
        let custom = card.getProperty("Custom" + i, "");
        if (custom.length)
            vCard += "CUSTOM" + i + ":" + custom + "\r\n";
    }

    let notes = card.getProperty("Notes", "");
    if (notes.length) {
        let data = "NOTE:" + notes.replace(/\n/g, "\\r\\n");
        vCard += data.substr(0, 77) + "\r\n";
        let i = 77;
        data = data.substr(77);
        while (data.length) {
            vCard += " " + rest.substr(0, 77) + "\r\n";
            data = data.substr(77);
        }
    }

    let aimScreenName = card.getProperty("_AimScreenName", "");
    if (aimScreenName.length)
        vCard += "X-AIM:" + aimScreenName + "\r\n";

    let fbUrl = card.getProperty("CalFBURL", "");
    if (fbUrl.length) {
        vCard += "FBURL:" + fbUrl + "\r\n";
    }

    vCard += "END:VCARD\r\n\r\n";

    return vCard;
}

/* VLIST */
function updateListFromVList(listCard, vListString, cards) {
    let abManager = Components.classes["@mozilla.org/abmanager;1"]
                              .getService(Components.interfaces.nsIAbManager);
    let listURI = listCard.mailListURI;
    let list = abManager.getDirectory(listURI);
    let listUpdated = false;

    list.addressLists.clear();
    let parsedString = versitParse(vListString);
    for (let i = 0; i < parsedString.length; i++) {
        let line = parsedString[i];
        if (line.tag == "fn") {
            listCard.displayName = line.values[0];
            listCard.lastName = line.values[0];
            list.dirName = line.values[0];
        }
        else if (line.tag == "nickname") {
            listCard.setProperty("NickName", line.values[0]);
            list.listNickName = line.values[0];
        }
        else if (line.tag == "description") {
            listCard.setProperty("Notes", line.values[0]);
            list.description = line.values[0];
        }
        else if (line.tag == "card") {
            let card = cards[line.values[0]];
            // 			dump("card '" + line.values[0] + "': ");
            if (!card) {
                let email = line.parameters["email"][0];
                if (email) {
                    listUpdated = true;
                    card = _findCardWithEmail(cards, email);
                }
            }
            if (card)
                list.addressLists.appendElement(card, false);
            else {
                listUpdated = true;
                dump("card with uid '" + line.values[0]
                     + "' was not found in directory");
            }
        }
    }

    // list.editMailListToDatabase(list.QueryInterface(Components.interfaces.nsIAbCard));

    return listUpdated;
}

function _findCardWithEmail(cards, email) {
    let card = null;

    let cmpEmail = email.toLowerCase();

    for (let k in cards) {
        if (cards[k].primaryEmail.toLowerCase() == cmpEmail)
            card = cards[k];
    }

    return card;
}

function list2vlist(uid, listCard) {
    let vList = ("BEGIN:VLIST\r\n"
                 + "PRODID:-//Inverse inc.//SOGo Connector 1.0//EN\r\n"
                 + "VERSION:1.0\r\n"
                 + "UID:" + uid + "\r\n");
    vList += "FN:" + listCard.getProperty("DisplayName", "") + "\r\n";
    let data = listCard.getProperty("NickName", "");
    if (data.length)
        vList += "NICKNAME:" + data + "\r\n";
    data = "" + listCard.getProperty("Notes", "");
    if (data.length)
        vList += "DESCRIPTION:" + data + "\r\n";

    let abManager = Components.classes["@mozilla.org/abmanager;1"]
                              .getService(Components.interfaces.nsIAbManager);
    let listDir = abManager.getDirectory(listCard.mailListURI);
    let cards = listDir.childCards;
    while (cards.hasMoreElements()) {
        let card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
        let key = card.getProperty("groupDavKey", "");
        if (key.length) {
            let entry = "CARD";
            if (card.primaryEmail.length) {
                entry += ";EMAIL=" + card.primaryEmail;
            }
            if (card.displayName.length) {
                entry += ";FN=" + card.displayName;
            }
            entry += ":" + key + "\r\n";
            vList += entry;
        }
        else {
            dump("*** card has no GroupDAV identifier key\n"
                 + "  primaryEmail: " + card.primaryEmail + "\n"
                 + "  displayName: " + card.displayName + "\n");
        }
    }

    vList += "END:VLIST";

    // 	dump("vList:\n" + vList + "\n");

    return vList;
}
