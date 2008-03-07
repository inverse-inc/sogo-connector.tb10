/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

function QuotedPrintableDecoder() {
	this.mCharset = "iso-8859-1";
}

QuotedPrintableDecoder.prototype = {
	get charset() {
		return this.mCharset;
	},
	set charset(newCharset) {
		this.mCharset = newCharset;
	},
	
	decode: function(value) {
		var decoded = [];

		var count = 0;
		var i = 0;
		while (i < value.length) {
			var currentChar = value[i];
			if (currentChar == "=") {
				var hexValue = (value[i+1] + value[i+2]).toLowerCase();
				var decodedChar = String.fromCharCode(this._decodeHEX(hexValue));
				decoded.push(decodedChar);
				i += 3;
			}
			else {
				decoded.push(currentChar);
				i++;
			}
			count++;
		}

		var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
		.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		converter.charset = this.charset;

		return converter.ConvertToUnicode(decoded.join(""));
	},
 _decodeHEX: function(string) {
		var t = 0;
		var currentInt = 0;
		var charCode0 = "0".charCodeAt(0);
		var charCodea = "a".charCodeAt(0);
		var charCodez = "z".charCodeAt(0);
		
		for (var i = 0; i < string.length; i++) {
			var code = string.charCodeAt(i);
			var currentInt = code - charCode0;
			if (currentInt > 9)
				currentInt = 10 + code - charCodea;
			t = t * 16 + currentInt;
		}
		
		return t;
	}
};

function QuotedPrintableEncoder() {
	this.MaxLineSize = 76;
	// Exclamation point through less than, and greater than through tilde
	// Tab is not listed here as UnAltered but could be
	this.UnAltered = String.fromCharCode(32) + String.fromCharCode(60) + String.fromCharCode(62) + String.fromCharCode(126);
	this.UnAlteredEnd = String.fromCharCode(33) + String.fromCharCode(60) + String.fromCharCode(62) + String.fromCharCode(126);
}

QuotedPrintableEncoder.prototype = {
 Encode: function(InputText) {
		var re = new RegExp("\r\n","g");
		var SplitText, i, s="";
		SplitText = InputText.split(re);
		for (i=0; i<SplitText.length; ++i)
			s += this.EncodeLine(SplitText[i]) + "\r\n";
		
		return s.substring(0, s.length - 2);
	},
 EncodeLine: function(Text) {
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
	},
 EncodeCharacter: function(Character, UnAltered) {
		var i, x, Alter=true;
		for (i=0; i<UnAltered.length; i+=2)
			if (Character >= UnAltered.charCodeAt(i) && Character <= UnAltered.charCodeAt(i+1))
				Alter=false;
		if (!Alter)
			return String.fromCharCode(Character);
		x = Character.toString(16).toUpperCase();
		
		return (x.length == 1) ? "=0" + x : "=" + x;
	}
};
