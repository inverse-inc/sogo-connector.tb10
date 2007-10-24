/*    Orginal code from morescols extension vcardTools.js
 
  		<em:id>{3e17310d-82e8-4a43-bd2f-7c3055bfe589}</em:id>
		<em:name>MoreColsForAddressBook</em:name>
		<em:version>0.3.4.1</em:version>
		<em:description>Add some functions to the Addressbook</em:description>
		<em:creator>Paolo Kaosmos</em:creator>
		<em:homepageURL>https://nic-nac-project.de/~kaosmos/index-en.html</em:homepageURL>

	Contributors: Ralf Becker, RalfBecker@outdoor-training.de
 */

function escapedForCards(theString){

  theString = theString.replace(/\\/g, "\\\\");
  theString = theString.replace(/,/g, "\\,");
  theString = theString.replace(/;/g, "\\;");  
  theString = theString.replace(/,/g, "\\,");
//  theString.replace(/\n/g, "\\n,");
//  theString.replace(/\r/g, "\\r,");

  return theString;
}
function unescapedFromCard(theString ){

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
function importFromVcard(vCardString, addressBook, customFieldsArray){
	var vcardLines = new Array;
	var end = new RegExp(/^END/);
	
	vCardString = unescapedFromCard(vCardString);
	
	//Preprocessing the multi-lines fields, so that the data is one line only
	//(Format is carriage return and following line starting with a space)
	vCardString = vCardString.replace(/\r\n\s/g, "");

	// The read lines are put into the vcardLines array until we find the ENDline
	var cardArray = vCardString.split(/[\r\n]+/);
	var j = 0;
	if(cardArray){
		for (var i=0; i < cardArray.length; i++){
			vcardLines[j] = cardArray[i];
			j++;
			if ( end.test(cardArray[i].toUpperCase())){
				return CreateCardsFromVcf(addressBook, vcardLines, customFieldsArray);
			}
		}
	}
	return false;
}

// outParameters must be an array, to enable the fonction to pass back the value
// of custom fields that are not part of a Thunderbird card.
function CreateCardsFromVcf(uri,lines, outParameters) {
	
	
	var card = Components.classes["@mozilla.org/addressbook/moz-abmdbcard;1"].createInstance(Components.interfaces.nsIAbCard);
	// Regexp to test the lines of the vcard
	var version = new RegExp(/^VERSION/);

//	var names = new RegExp(/^N/); // changed RalfBecker@outdoor-training.de to recognise
	var names = new RegExp(/^N(:|;)/);
	
	var fname = new RegExp(/^FN/);
	var nickname = new RegExp(/^NICKNAME/);
	var org = new RegExp(/^ORG/);
	var telhome = new RegExp(/^TEL.*HOME/);
	var telcell = new RegExp(/^TEL.*CELL/);
	var telfax = new RegExp(/^TEL.*FAX/);
	var telwork = new RegExp(/^TEL.*WORK/);
	var telpager = new RegExp(/^TEL.*PAGER/);
	var adrhome = new RegExp(/^ADR.*HOME/);
	var adrwork = new RegExp(/^ADR.*WORK/);
	var urlhome = new RegExp(/^URL.*HOME/i);
	var urlwork = new RegExp(/^URL.*WORK/i);
	var emailpref = new RegExp(/^EMAIL.*PREF/);
	var email = new RegExp(/^EMAIL/);
	var title = new RegExp(/^TITLE/);
	var bday = new RegExp(/^BDAY/);
	var notes = new RegExp(/^NOTE/);
	var fbURL = new RegExp(/^FBURL/);
	var begin = new RegExp(/^BEGIN/);
	var end = new RegExp(/^END/);
	var aim = new RegExp(/^X-AIM/);
	var htmlFormat = new RegExp(/^X-MOZILLA-HTML/);

	outParameters["fbURL"] = "";
	outParameters["groupDavVcardCompatibility"] = "";
	
	// Variables needed to fill the email fields
	var myfirstemail = "";
	var myemail = "";
	var myemail2 = "";
	var myHtmlFormat = 0;
	for (i=0;i<lines.length;i++) {
	   var mylinevalue="";
	   var myline = lines[i];

	   // Find the value of the line, we use substring+indexOf instead
	   // of split, because there could be value with : inside (es. urls)
	   mylinevalue = myline.substring(myline.indexOf(":")+1);

	   // Convert the hex 0D and 0A chars in \r and \n (vcard use hex notation)
	   mylinevalue = mylinevalue.replace(/(=0D|\\r)/g, "\r");
	   mylinevalue = mylinevalue.replace(/(=0A|\\n)/g, "\n");

	   // Split to find the label of the line
	   var mylineinit = myline.split(":");
	   mylineinit[0] = mylineinit[0].toUpperCase();

	   if (notes.test(mylineinit[0])){
	     //card.notes = mylinevalue;
	     card.notes = mylinevalue.replace(/\r/g, "");
	      
	   }

//	   // Cancel the newlines, the Notes field is the only one that supports them
//	   mylineinit[0] = mylineinit[0].replace(/\r\n/g,"");
	 
	 

//    if ( mylineinit[0] == "N" ) {        // changed RalfBecker@outdoor-training.de to recognise
      if ( names.test(mylineinit[0] ) ) {
	   	
	      // Split the value of N: to have the lastname and the firstname
	      var nameentries = mylinevalue.split(";");
	      var cognome = nameentries[0];
	      var nome = nameentries[1];
	      if (nome)
	         card.firstName = nome;
	      if (cognome)
	         card.lastName = cognome;
	   }
	   else if ( fname.test(mylineinit[0]) ) {
	      if (mylineinit[0].indexOf("QUOTE-PRINTABLE")) 
	         var fn = quoteprint(mylinevalue);
	      else
	         var fn = mylinevalue;
	       card.displayName = fn;
	   }
	   else if ( nickname.test(mylineinit[0]) ) 
	      card.nickName = mylinevalue;
	   else if ( org.test(mylineinit[0]) ) {
	      var orgentries = mylinevalue.split(";");
	      var orgcompany = orgentries[0];
	      var orgdepart = orgentries[1];
	      if (orgcompany) 
	         card.company = orgcompany;
	      if (orgdepart)
	         card.department = orgdepart;
	   }
	   else if ( telhome.test(mylineinit[0]) ) 
	      card.homePhone = mylinevalue;
	   else if ( telcell.test(mylineinit[0]) ) 
	      card.cellularNumber = mylinevalue;
	   else if ( telfax.test(mylineinit[0]) ) 
	      card.faxNumber = mylinevalue;
	   else if ( telwork.test(mylineinit[0]) ) 
	      card.workPhone = mylinevalue;
	   else if ( telpager.test(mylineinit[0]) ){ 
	      card.pagerNumber = mylinevalue;	
	   }else if ( adrhome.test(mylineinit[0]) ) {
	      var adrentries = mylinevalue.split(";");
	      var addressLine2 = adrentries[0];
	      var indirizzo = adrentries[2];
	      var citta = adrentries[3];
	      var stato = adrentries[4];
	      var zipcode = adrentries[5];
	      var country = adrentries[6];
	      if (indirizzo) 
	         card.homeAddress = indirizzo;
	      if (citta)
	         card.homeCity = citta;
	      if (stato)
	         card.homeState = stato;
	      if (zipcode)
	         card.homeZipCode = zipcode;
	      if (country)
	         card.homeCountry = country;
	      if (addressLine2)
	      	card.homeAddress2;
	   }
	   else if ( adrwork.test(mylineinit[0]) ) {
	      var adrentries2 = mylinevalue.split(";");
	      var addressLine2 = adrentries2[0];	      
	      var indirizzo2 = adrentries2[2];
	      var citta2 = adrentries2[3];
	      var stato2 = adrentries2[4];
	      var zipcode2 = adrentries2[5];
	      var country2 = adrentries2[6];
	      if (indirizzo2) 
	         card.workAddress = indirizzo2;
	      if (citta2)
	         card.workCity = citta2;
	      if (stato2)
	         card.workState = stato2;
	      if (zipcode2)
	         card.workZipCode = zipcode2;
	      if (country2)
	         card.workCountry = country2;
	      if (addressLine2)
	      	card.workAddress2;	         
	   }
	   // With the email address, we must check if exists a label with the PREF
	   // parameters
	   // we will write the values after
	   else if ( emailpref.test(mylineinit[0]) ) 
	      myfirstemail = mylinevalue;
	   else if ( ! emailpref.test(mylineinit[0]) && email.test(mylineinit[0]) && myemail == "") 
	      myemail = mylinevalue;
	   else if ( ! emailpref.test(mylineinit[0]) && email.test(mylineinit[0]) && myemail != "") 
	      myemail2 = mylinevalue;
	   else if ( urlhome.test(mylineinit[0]) ) 
	      card.webPage2 = mylinevalue;
	   else if ( urlwork.test(mylineinit[0]) ) 
	      card.webPage1 = mylinevalue;
	   else if ( mylineinit[0] == "URL" ) 
	      card.webPage2 = mylinevalue;
	   else if ( title.test(mylineinit[0]) ) 
	      card.jobTitle = mylinevalue;
	   else if( bday.test(mylineinit[0]) ) {
	      bdayparts = mylinevalue.split("-");
	      card.birthYear = bdayparts[0];
	      card.birthMonth = bdayparts[1];
	      card.birthDay = bdayparts[2];
	   }else if ( aim.test(mylineinit[0])){
	   	card.aimScreenName = mylinevalue;
	   }else if (htmlFormat.test(mylineinit[0])){
			myHtmlFormat = mylinevalue == "TRUE"  ? 2:1;
	   }else if ( fbURL.test(mylineinit[0])){
			outParameters["fbURL"] = mylinevalue;
	   }else if ( begin.test(mylineinit[0]) || end.test(mylineinit[0]) || notes.test(mylineinit[0]) || version.test(mylineinit[0]) || htmlFormat.test(mylineinit[0])) {
		//Nothing to do
		}else{
		//Every line that is not matched by the defined Regexps are put in a custom field for groupDav synchronization
			outParameters["groupDavVcardCompatibility"] += myline + "\n";
		} 
	}
	if (myfirstemail != "") {
	   // So there is an address with the PREF property
	   card.primaryEmail = myfirstemail;
	   card.secondEmail = myemail;
	}else if (myemail != "") {
	   // There isn't an address with the PREF property
	   card.primaryEmail = myemail;
	   card.secondEmail = myemail2;
	}	
	card.preferMailFormat = myHtmlFormat;

	return card;
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
