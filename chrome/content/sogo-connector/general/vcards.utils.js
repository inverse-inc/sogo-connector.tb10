/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */
/*    Orginal code from morescols extension vcardTools.js
 
  		<em:id>{3e17310d-82e8-4a43-bd2f-7c3055bfe589}</em:id>
		<em:name>MoreColsForAddressBook</em:name>
		<em:version>0.3.4.1</em:version>
		<em:description>Add some functions to the Addressbook</em:description>
		<em:creator>Paolo Kaosmos</em:creator>
		<em:homepageURL>https://nic-nac-project.de/~kaosmos/index-en.html</em:homepageURL>

	Contributors: Ralf Becker, RalfBecker@outdoor-training.de
 */

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

/**************************************************************************
 * Function to import directly the vcard.
 *
 * outParameters must be an array, to enable the fonction to pass back the value
 * of custom fields that are not part of a Thunderbird card.
 *  
 **************************************************************************/ 
function importFromVcard(vCardString, addressBook, customFields) {
	var vcard = new Array();
	var currentLine = {};
	var isEscaped = false;
	var type = 0; /* 0 = tag, 1 = parameters, 2 = value */
	var parameters = {};
	var values = new Array();

	var tag = "";
	var parameterName = "type";
	var parameter = "";
	var value = "";

	var currentChar = 0;
	while (currentChar < vCardString.length) {
		var character = vCardString[currentChar];
		if (isEscaped) {
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
							var nextChar = vCardString[currentChar+1];
							if (typeof nextChar != "undefined" && nextChar == " ")
								currentChar++;
							else {
								values.push(value);
								currentLine["values"] = values;
								vcard.push(currentLine);
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

// 	var cardDump = dumpObject(vcard);
// 	logInfo("vcard dump:\n" + cardDump);

	return CreateCardFromVCF(addressBook, vcard, customFields);
}

// outParameters must be an array, to enable the fonction to pass back the value
// of custom fields that are not part of a Thunderbird card.
function CreateCardFromVCF(uri, vcard, outParameters) {
	var version = "2.1";
	var defaultCharset = "iso-8859-1"; /* 0 = latin 1, 1 = utf-8 */
	var card = Components.classes["@mozilla.org/addressbook/moz-abmdbcard;1"]
		.createInstance(Components.interfaces.nsIAbCard);

	outParameters["fburl"] = "";
	outParameters["uid"] = "";
	outParameters["groupDavVcardCompatibility"] = "";

	for (var i = 0; i < vcard.length; i++) {
		if (vcard[i]["tag"] == "version") {
			version = vcard[i]["values"][0];
		}
	}
	if (version[0] == "3")
		defaultCharset = "utf-8";

	for (var i = 0; i < vcard.length; i++) {
		var tag = vcard[i]["tag"];
		var charset = defaultCharset;
		var encoding = null;

		var parameters = vcard[i]["parameters"];
		if (parameters) {
			for (var parameter in parameters) {
				if (parameter == "encoding")
					encoding = parameters[parameter][0].toLowerCase();
				if (parameter == "charset")
					charset = parameters[parameter][0].toLowerCase();
			}
		}
		else
			parameters = {};

		var values = decodedValues(vcard[i]["values"], charset, encoding);
 		InsertCardData(card, tag, parameters, values, outParameters);
	}

	return card;
}

function InsertCardData(card, tag, parameters, values, outParameters) {
// 	logInfo("InsertCardData: " + tag + "\n");

	// Variables needed to fill the email fields
	var myfirstemail = "";
	var myemail = "";
	var myemail2 = "";
	var myHtmlFormat = 0;

//	   // Cancel the newlines, the Notes field is the only one that supports them
//	   mylineinit[0] = mylineinit[0].replace(/\r\n/g,"");
	 
	 

//    if ( mylineinit[0] == "N" ) { // changed RalfBecker@outdoor-training.de to recognize N;CHARSET=...
	if (tag == "n") {
		if (values[0])
			card.lastName = values[0];
		if (values[1])
			card.firstName = values[1];
	} else if (tag == "fn") {
		card.displayName = values[0];
	} else if (tag == "nickname") {
		card.nickName = values[0];
	} else if (tag == "org") {
		if (values[0])
			card.company = values[0];
		if (values[1])
			card.department = values[1];
	} else if (tag == "tel") {
		var types = new Array();
		var preTypes = parameters["type"];
		if (preTypes)
			for (var i = 0; i < preTypes.length; i++)
				types[i] = preTypes[i].toUpperCase();
		if (types.indexOf("HOME") > -1)
			card.homePhone = values[0];
		else if (types.indexOf("CELL") > -1)
			card.cellularNumber = values[0];
		else if (types.indexOf("FAX") > -1)
			card.faxNumber = values[0];
		else if (types.indexOf("WORK") > -1)
			card.workPhone = values[0];
		else if (types.indexOf("PAGER") > -1)
			card.pagerNumber = values[0];
		else {
			if (card.workPhone.length == 0)
				card.workPhone = values[0];
			else if (card.homePhone.length == 0)
				card.homePhone = values[0];
		}
	} else if (tag == "adr") {
		var types = new Array();
		var preTypes = parameters["type"];
		if (preTypes)
			for (var i = 0; i < preTypes.length; i++)
				types[i] = preTypes[i].toUpperCase();
		if (types.indexOf("HOME") > -1) {
			if (values[0])
				card.homeAddress2 = values[0];
			if (values[2]) 
				card.homeAddress = values[2];
			if (values[3])
				card.homeCity = values[3];
			if (values[4])
				card.homeState = values[4];
			if (values[5])
				card.homeZipCode = values[5];
			if (values[6])
				card.homeCountry = values[6];
	   }
		else {
			if (values[0])
				card.workAddress2 = values[0];
			if (values[2]) 
				card.workAddress = values[2];
			if (values[3])
				card.workCity = values[3];
			if (values[4])
				card.workState = values[4];
			if (values[5])
				card.workZipCode = values[5];
			if (values[6])
				card.workCountry = values[6];
	   }
	} else if (tag == "email") {
		var types = new Array();
		var preTypes = parameters["type"];
		if (preTypes)
			for (var i = 0; i < preTypes.length; i++)
				types[i] = preTypes[i].toUpperCase();
		if (types.indexOf("PREF") > -1) {
			if (card.primaryEmail.length)
				card.secondEmail = card.primaryEmail;
			card.primaryEmail = values[0];
		}
		else {
			if (card.primaryEmail.length)
				card.secondEmail = values[0];
			else
				card.primaryEmail = values[0];
		}
	} else if (tag == "url") {
		var types = new Array();
		var preTypes = parameters["type"];
		if (preTypes)
			for (var i = 0; i < preTypes.length; i++)
				types[i] = preTypes[i].toUpperCase();
		if (types.indexOf("WORK") > -1) {
			card.webPage1 = values[0];
		} else {
			card.webPage2 = values[0];
		}
	} else if (tag == "title") {
		card.jobTitle = values[0];
	} else if (tag == "bday") {
		card.birthYear = values[0];
		card.birthMonth = values[1];
		card.birthDay = values[2];
	} else if (tag == "x-aim") {
		card.aimScreenName = values[0];
	} else if (tag == "x-mozilla-html") {
		if (values[0].toLowerCase() == "true")
			card.preferMailFormat = true;
		else
			card.preferMailFormat = false;
	} else if (tag == "note") {
		card.notes = values.join(";");
	} else if (tag == "begin"
						 || tag == "end") {
	} else {
		outParameters[tag] = values.join(";");
	}
}

function decodedValues(values, charset, encoding) {
	var newValues = [];

	for (var i = 0; i < values.length; i++) {
		var decodedValue = null;
		if (encoding) {
			if (encoding == "quoted-printable")
				decodedValue = decodeQP(values[i]);
			else
				throw "Unsupported encoding for vcard value: " + encoding;
		}
		else
			decodedValue = values[i];
		if (charset == "utf-8")
			newValues.push(decodedValue);
		else {
			var converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"]
				.getService(Components.interfaces.nsIUTF8ConverterService);
			newValues.push(converter.convertStringToUTF8(decodedValue, charset, false));
		}
	}

// 	logInfo("newValues: " + dumpObject(newValues));

	return newValues;
}

function decodeQP(value) {
	var decoded = "";

	var i = 0;
	var j = 0;
	while (i < value.length) {
		var currentChar = value[i];
		var decodedChar = currentChar;
		if (currentChar == "=") {
			var hexValue = (value[i+1] + value[i+2]).toLowerCase();
			decodedChar = String.fromCharCode(decodeHEX(hexValue));
			i += 2;
		}
		decoded[j] = decodedChar;
		j++;
	}

	return decoded;
}

function decodeHEX(string) {
	var t = 0;
	var currentInt = 0;
	var charCode0 = "0".charCodeAt(0);
	var charCodea = "a".charCodeAt(0);
	var charCodez = "z".charCodeAt(0);

  for (var i = 0; i < string.length; i++) {
		var code = string.charCodeAt(i);
		var currentInt = code - charCode0;
		if (currentInt > 9)
			currentInt += charCode0 - charCodea;
		t = t * 16 + currentInt;
	}

	return t;
}

function card2vcardV21(oldCard) {
   var card = oldCard.QueryInterface(Components.interfaces.nsIAbMDBCard);
   var quoted = "ENCODING=QUOTED-PRINTABLE:";
   var data = "";
   var vCard = "";
   var encoder = new QuotedPrintableEncoder();
   data = "BEGIN:VCARD\r\nVERSION:2.1\r\n";
   vCard = vCard + data;
   data = "N;"+ quoted + encoder.Encode(card.lastName) + ";" + encoder.Encode(card.firstName) + "\r\n";
   if (card.lastName != "" || card.firstName != "")
      vCard = vCard + data;
   data = "FN;ENCODING=QUOTED-PRINTABLE:"+encoder.Encode(card.displayName)+"\r\n";
   if (card.displayName != "")   
      vCard = vCard + data;
   data = "ORG:"+card.company+";"+card.department+"\r\n";
   if (! (card.company == "" && card.department == "")) 
      vCard = vCard + data;
   data = "NICKNAME:"+card.nickName+"\r\n";
   if (card.nickName != "") 
      vCard = vCard + data;
   data = "ADR;WORK;POSTAL:" + card.workAddress2 + ";;"+card.workAddress+";"+card.workCity+";"+card.workState+";"+card.workZipCode+";"+card.workCountry+"\r\n";
   if (data != "ADR;WORK;POSTAL:;;;;;;\r\n") 
      vCard = vCard + data;
   data = "LABEL;WORK;ENCODING=QUOTED-PRINTABLE:"+card.workAddress+"=0D=0A"+card.workCity+", "+card.workZipCode+" "+card.workCountry+"\r\n";
   if (data != "LABEL;WORK;ENCODING=QUOTED-PRINTABLE:=0D=0A,  \r\n") 
      vCard = vCard + data;
   data = "ADR;HOME;POSTAL:" + card.homeAddress2 + ";;"+card.homeAddress+";"+card.homeCity+";"+card.homeState+";"+card.homeZipCode+";"+card.homeCountry+"\r\n";
   if (data != "ADR;HOME;POSTAL:;;;;;;\r\n") 
      vCard = vCard + data;
   data = "LABEL;HOME;ENCODING=QUOTED-PRINTABLE:"+encoder.Encode(card.homeAddress)+"=0D=0A"+encoder.Encode(card.homeCity)+", "+encoder.Encode(card.homeZipCode)+" "+encoder.Encode(card.homeCountry)+"\r\n";
   if (data != "LABEL;HOME;ENCODING=QUOTED-PRINTABLE:=0D=0A,  \r\n" ) 
      vCard = vCard + data;
   data = "TEL;WORK;VOICE:"+ card.workPhone+"\r\n";
   if (card.workPhone != "") 
      vCard = vCard + data;
   data = "TEL;HOME;VOICE:"+ card.homePhone+"\r\n";
   if (card.homePhone != "") 
      vCard = vCard + data;
   data = "TEL;CELL;VOICE:"+ card.cellularNumber+"\r\n";
   if (card.cellularNumber != "") 
      vCard = vCard + data;
   data = "TEL;FAX:"+ card.faxNumber+"\r\n";
   if (card.faxNumber != "") 
      vCard = vCard + data;
   if (card.pagerNumber)
   	vCard += "TEL;PAGER:"+ card.pagerNumber + "\r\n";

   if (card.preferMailFormat != ""){
   	var value = "";
   	switch (card.preferMailFormat){
   		case 0:
   			break;
   		case 2:
   			value = "TRUE";
   			break;
   		case 1:
   			value = "FALSE";
   			break;
   	}
   	vCard += "X-MOZILLA-HTML:" + value + "\r\n";
   }
   data = "EMAIL;PREF;INTERNET:"+ card.primaryEmail+"\r\n";
   if (card.primaryEmail != "") 
      vCard = vCard + data;
   data = "EMAIL;INTERNET:"+ card.secondEmail+"\r\n";
   if (card.secondEmail != "") 
      vCard = vCard + data;
   data = "URL;HOME:"+ card.webPage2+"\r\n";
   if (card.webPage2 != "") 
      vCard = vCard + data;
   data = "TITLE:"+ card.jobTitle+"\r\n";
   if (card.jobTitle != "") 
      vCard = vCard + data;
   data = "URL;WORK:"+ card.webPage1+"\r\n";
   if (card.webPage1 != "") 
      vCard = vCard + data;
   data = "BDAY:"+card.birthYear+"-"+card.birthMonth+"-"+card.birthDay+"\r\n";
   if (card.birthYear != "" && card.birthMonth != "" && card.birthDay !="") 
      vCard = vCard + data;
   if (card.notes != "") {
      data = "NOTE;ENCODING=QUOTED-PRINTABLE:"+encoder.Encode(card.notes);
      vCard = vCard + data + "\r\n";
   }
   if ( card.aimScreenName != ""){
   	vCard += "X-AIM:" + card.aimScreenName + "\r\n";
   }
   var fbUrl = card.getStringAttribute("calFBURL");
   if (fbUrl && fbUrl.length > 0) {
      data = "FBURL:"+fbUrl;
      vCard = vCard + data + "\r\n";
   }
   var groupDavVcardCompatibilityField = card.getStringAttribute("groupDavVcardCompatibility");
   if (groupDavVcardCompatibilityField) {
      vCard += groupDavVcardCompatibilityField + "\r\n";
   }
   data = "END:VCARD\r\n\r\n";

   return vCard + data;
}

// This is needed just for the displayed name: Thunderbird wants it in QUOTE-PRINTABLE
// format in 7bit, otherwise it won't display correctly the special chars.
// It's a strange beahviour because there seems to be just for this field.
// This function is not perfect, but works quite well, I hope... '
function quoteprint(str) {
  var UC  = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  UC.charset="UTF-8";
  str = str.replace(/\=/g, "%");
  str = unescape(str);
  try { str = UC.ConvertToUnicode(str); }
  catch(e) {}

  return str;
}

/* qp encoder */
function QuotedPrintableEncoder() {
   this.MaxLineSize = 76;
   // Exclamation point through less than, and greater than through tilde
   // Tab is not listed here as UnAltered but could be
   this.UnAltered = String.fromCharCode(32) + String.fromCharCode(60) + String.fromCharCode(62) + String.fromCharCode(126);
   this.UnAlteredEnd = String.fromCharCode(33) + String.fromCharCode(60) + String.fromCharCode(62) + String.fromCharCode(126);

   return this;
}

QuotedPrintableEncoder.prototype.Encode = function(InputText) {
   var re = new RegExp("\r\n","g");
   var SplitText, i, s="";
   SplitText = InputText.split(re);
   for (i=0; i<SplitText.length; ++i)
      s += this.EncodeLine(SplitText[i]) + "\r\n";

   return s.substring(0, s.length - 2);
}

QuotedPrintableEncoder.prototype.EncodeLine = function(Text) {
   var SplitText, i, s="", c=256;
   if (Text.length == 0)
      return "";
   for (i=0; i<Text.length-1; ++i)
      s += this.EncodeCharacter(Text.charCodeAt(i), this.UnAltered);
   // Encode last character; if space, encode it
   s += this.EncodeCharacter(Text.charCodeAt(Text.length-1), this.UnAlteredEnd);
   if (s.length <= this.MaxLineSize)
      return s;
   // Split into lines of MaxLineSize characters or less
   SplitText = s.slice(0, this.MaxLineSize);
   i = this.MaxLineSize;
   while (i<s.length) {
      SplitText += "=\r\n"+ s.slice(i, i+this.MaxLineSize);
      i += this.MaxLineSize;
   }

   return SplitText;
}

QuotedPrintableEncoder.prototype.EncodeCharacter = function(Character, UnAltered) {
   var i, x, Alter=true;
   for (i=0; i<UnAltered.length; i+=2)
      if (Character >= UnAltered.charCodeAt(i) && Character <= UnAltered.charCodeAt(i+1))
         Alter=false;
   if (!Alter)
      return String.fromCharCode(Character);
   x = Character.toString(16).toUpperCase();

   return (x.length == 1) ? "=0" + x : "=" + x;
}

function card2vcard(oldCard) {
	var card = oldCard.QueryInterface(Components.interfaces.nsIAbMDBCard);

	var data ="";
	var vCard = "BEGIN:VCARD\r\nVERSION:3.0\r\n";
	
	vCard += "UID:"+ card.getStringAttribute("groupDavKey") + "\r\n";

	if (card.lastName != "" || card.firstName != "")
		vCard += "N:"+ card.lastName+ ";" + card.firstName + "\r\n";

	if (card.displayName != "")   
		vCard += "FN:" + card.displayName +"\r\n";

	if (! (card.company == "" && card.department == ""))
		vCard += "ORG:"+card.company+";"+card.department+"\r\n";

	if (card.nickName != "") 
		vCard += "NICKNAME:"+card.nickName+"\r\n";

	data = "ADR;TYPE=work:" + card.workAddress2 + ";;"+card.workAddress+";"+card.workCity+";"+card.workState+";"+card.workZipCode+";"+card.workCountry+"\r\n";
	if (data != "DR;TYPE=WORK,POSTAL:;;;;;;\r\n") 
		vCard += data;   

	data = "ADR;TYPE=home:" + card.homeAddress2 + ";;"+card.homeAddress+";"+card.homeCity+";"+card.homeState+";"+card.homeZipCode+";"+card.homeCountry+"\r\n";
	if (data != "ADR;TYPE=HOME,POSTAL::;;;;;;\r\n") 
		vCard += data;

	if (card.workPhone != "") 
		vCard += "TEL;TYPE=work:"+ card.workPhone+"\r\n";

	if (card.homePhone != "") 
		vCard += "TEL;TYPE=home:"+ card.homePhone+"\r\n";

	if (card.cellularNumber != "") 
		vCard += "TEL;TYPE=cell:"+ card.cellularNumber+"\r\n";
		
	if (card.faxNumber != "") 
		vCard += "TEL;TYPE=fax:"+ card.faxNumber+"\r\n";

	if (card.pagerNumber)
		vCard += "TEL;TYPE=pager:"+ card.pagerNumber + "\r\n";

	if (card.preferMailFormat != ""){
		var value = "";
		switch (card.preferMailFormat){
			case 0:
				break;
			case 2:
				value = "TRUE";
				break;
			case 1:
				value = "FALSE";
				break;
		}
		vCard += "X-MOZILLA-HTML:" + value + "\r\n";
	}
	if (card.primaryEmail != "") 
		vCard += "EMAIL;TYPE=work:"+ card.primaryEmail+"\r\n";

	if (card.secondEmail != "") 
		vCard += "EMAIL;TYPE=home:"+ card.secondEmail+"\r\n";

	if (card.webPage2 != "") 
		vCard += "URL;TYPE=home:"+ card.webPage2+"\r\n";

	if (card.jobTitle != "") 
		vCard += "TITLE:"+ card.jobTitle+"\r\n";
      
	if (card.webPage1 != "") 
		vCard += "URL;TYPE=work:"+ card.webPage1+"\r\n";

	if (card.birthYear != "" && card.birthMonth != "" && card.birthDay !="") 
		vCard += "BDAY:"+card.birthYear+"-"+card.birthMonth+"-"+card.birthDay+"\r\n";

	if (card.custom1 != "")
		vCard += "CUSTOM1:"+ card.custom1 + "\r\n";

	if (card.custom2 != "")
		vCard += "CUSTOM2:"+ card.custom2 + "\r\n";

	if (card.custom3 != "")
		vCard += "CUSTOM3:"+ card.custom3 + "\r\n";

	if (card.custom4 != "")
		vCard += "CUSTOM4:"+ card.custom4 + "\r\n";

	if (card.notes != ""){
		var cleanedNote = "NOTE:"+card.notes.replace(/\n/g, "\\" + "r\\" + "n");

		if (cleanedNote.size <= lineMaxSize){
			vcard += cleaneNote;
		}else{
			var lineMaxSize = 79;
			var size = lineMaxSize;
			var pos = 0;
			while (pos < cleanedNote.length){
				size =(pos + lineMaxSize < cleanedNote.length) ? lineMaxSize : (cleanedNote.length - pos);
				vCard += cleanedNote.substr(pos, size) + "\r\n ";
				pos += lineMaxSize;
			}
			vCard = vCard.substr(0, vCard.length-1);//removing the unecessary white space
		}
	}
	
	if ( card.aimScreenName != "")
		vCard += "X-AIM:" + card.aimScreenName + "\r\n";

	var fbUrl = card.getStringAttribute("calFBURL");
	if (fbUrl && fbUrl.length > 0) {
		data = "FBURL:"+fbUrl;
		vCard = vCard + data + "\r\n";
	}
	
	var groupDavVcardCompatibilityField = card.getStringAttribute("groupDavVcardCompatibility");
	if (groupDavVcardCompatibilityField) {
		vCard += groupDavVcardCompatibilityField + "\r\n";
   }
   vCard += "END:VCARD\r\n\r\n";

   return vCard;
}
