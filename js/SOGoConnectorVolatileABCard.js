/* -*- Mode: java; tab-width: 2; c-tab-always-indent: t; indent-tabs-mode: t; c-basic-offset: 2 -*- */

function jsInclude(files, target) {
	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		.getService(Components.interfaces.mozIJSSubScriptLoader);
	for (var i = 0; i < files.length; i++) {
		try {
			loader.loadSubScript(files[i], target);
		}
		catch(e) {
			dump("SOGoConnectorVolatileABCard.js: failed to include '" + files[i] +
					 "'\n" + e
					 + "\nFile: " + e.fileName
					 + "\nLine: " + e.lineNumber + "\n\n Stack:\n\n" + e.stack);
		}
	}
}

jsInclude(["chrome://sogo-connector/content/general/mozilla.utils.inverse.ca.js",
					 "chrome://sogo-connector/content/addressbook/folder-handling.js"]);

function SOGoConnectorVolatileABCard() {
	this.values = {};
	this.wrappedJSObject = this;
}

SOGoConnectorVolatileABCard.prototype = {
 values: null,
 wrappedJSObject: null,

 /* nsIAbCard */
 mAimScreenName: "",
 mAllowRemoteContent: false,
 mAnniversaryDay: "",
 mAnniversaryMonth: "",
 mAnniversaryYear: "",
 mBirthDay: "",
 mBirthMonth: "",
 mBirthYear: "",
 mCategory: "",
 mCellularNumber: "",
 mCellularNumberType: "",
 mCompany: "",
 mCustom1: "",
 mCustom2: "",
 mCustom3: "",
 mCustom4: "",
 mDefaultAddress: "",
 mDepartment: "",
 mDisplayName: "",
 mFamilyName: "",
 mFaxNumber: "",
 mFaxNumberType: "",
 mFirstName: "",
 mHomeAddress: "",
 mHomeAddress2: "",
 mHomeCity: "",
 mHomeCountry: "",
 mHomePhone: "",
 mHomePhoneType: "",
 mHomeState: "",
 mHomeZipCode: "",
 mJobTitle: "",
 mLastModifiedDate: 0,
 mLastName: "",
 mNickName: "",
 mNotes: "",
 mPagerNumber: "",
 mPagerNumberType: "",
 mPhoneticFirstName: "",
 mPhoneticLastName: "",
 mPopularityIndex: 0,
 mPreferMailFormat: 0,
 mPrimaryEmail: "",
 mSecondEmail: "",
 mSpouseName: "",
 mWebPage1: "",
 mWebPage2: "",
 mWorkAddress: "",
 mWorkAddress2: "",
 mWorkCity: "",
 mWorkCountry: "",
 mWorkPhone: "",
 mWorkPhoneType: "",
 mWorkState: "",
 mWorkZipCode: "",

 set aimScreenName(val) { this.mAimScreenName = val; },
 get aimScreenName() { return this.mAimScreenName; },

 set allowRemoteContent(val) { this.mAllowRemoteContent = val; },
 get allowRemoteContent() { return this.mAllowRemoteContent; },

 set anniversaryDay(val) { this.mAnniversaryDay = val; },
 get anniversaryDay() { return this.mAnniversaryDay; },

 set anniversaryMonth(val) { this.mAnniversaryMonth = val; },
 get anniversaryMonth() { return this.mAnniversaryMonth; },

 set anniversaryYear(val) { this.mAnniversaryYear = val; },
 get anniversaryYear() { return this.mAnniversaryYear; },

 set birthDay(val) { this.mBirthDay = val; },
 get birthDay() { return this.mBirthDay; },

 set birthMonth(val) { this.mBirthMonth = val; },
 get birthMonth() { return this.mBirthMonth; },

 set birthYear(val) { this.mBirthYear = val; },
 get birthYear() { return this.mBirthYear; },

 set category(val) { this.mCategory = val; },
 get category() { return this.mCategory; },

 set cellularNumber(val) { this.mCellularNumber = val; },
 get cellularNumber() { return this.mCellularNumber; },

 set cellularNumberType(val) { this.mCellularNumberType = val; },
 get cellularNumberType() { return this.mCellularNumberType; },

 set company(val) { this.mCompany = val; },
 get company() { return this.mCompany; },

 set custom1(val) { this.mCustom1 = val; },
 get custom1() { return this.mCustom1; },

 set custom2(val) { this.mCustom2 = val; },
 get custom2() { return this.mCustom2; },

 set custom3(val) { this.mCustom3 = val; },
 get custom3() { return this.mCustom3; },

 set custom4(val) { this.mCustom4 = val; },
 get custom4() { return this.mCustom4; },

 set defaultAddress(val) { this.mDefaultAddress = val; },
 get defaultAddress() { return this.mDefaultAddress; },

 set department(val) { this.mDepartment = val; },
 get department() { return this.mDepartment; },

 set displayName(val) { this.mDisplayName = val; },
 get displayName() { return this.mDisplayName; },

 set familyName(val) { this.mFamilyName = val; },
 get familyName() { return this.mFamilyName; },

 set faxNumber(val) { this.mFaxNumber = val; },
 get faxNumber() { return this.mFaxNumber; },

 set faxNumberType(val) { this.mFaxNumberType = val; },
 get faxNumberType() { return this.mFaxNumberType; },

 set firstName(val) { this.mFirstName = val; },
 get firstName() { return this.mFirstName; },

 set homeAddress(val) { this.mHomeAddress = val; },
 get homeAddress() { return this.mHomeAddress; },

 set homeAddress2(val) { this.mHomeAddress2 = val; },
 get homeAddress2() { return this.mHomeAddress2; },

 set homeCity(val) { this.mHomeCity = val; },
 get homeCity() { return this.mHomeCity; },

 set homeCountry(val) { this.mHomeCountry = val; },
 get homeCountry() { return this.mHomeCountry; },

 set homePhone(val) { this.mHomePhone = val; },
 get homePhone() { return this.mHomePhone; },

 set homePhoneType(val) { this.mHomePhoneType = val; },
 get homePhoneType() { return this.mHomePhoneType; },

 set homeState(val) { this.mHomeState = val; },
 get homeState() { return this.mHomeState; },

 set homeZipCode(val) { this.mHomeZipCode = val; },
 get homeZipCode() { return this.mHomeZipCode; },

 set isMailList(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },
 get isMailList() { return false; },

 set isANormalCard(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },
 get isANormalCard() { return true; },
 set isASpecialGroup(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },
 get isASpecialGroup() { return false; },
 set isAEmailAddress(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },
 get isAEmailAddress() { return false; },

 set jobTitle(val) { this.mJobTitle = val; },
 get jobTitle() { return this.mJobTitle; },

 set lastModifiedDate(val) { this.mLastModifiedDate = val; },
 get lastModifiedDate() { return this.mLastModifiedDate; },

 set lastName(val) { this.mLastName = val; },
 get lastName() { return this.mLastName; },

 set mailListURI(val) { throw Components.results.NS_ERROR_NOT_IMPLEMENTED; },
 get mailListURI() { throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
										 return null; },

 set nickName(val) { this.mNickName = val; },
 get nickName() { return this.mNickName; },

 set notes(val) { this.mNotes = val; },
 get notes() { return this.mNotes; },

 set pagerNumber(val) { this.mPagerNumber = val; },
 get pagerNumber() { return this.mPagerNumber; },

 set pagerNumberType(val) { this.mPagerNumberType = val; },
 get pagerNumberType() { return this.mPagerNumberType; },

 set phoneticFirstName(val) { this.mPhoneticFirstName = val; },
 get phoneticFirstName() { return this.mPhoneticFirstName; },

 set phoneticLastName(val) { this.mPhoneticLastName = val; },
 get phoneticLastName() { return this.mPhoneticLastName; },

 set popularityIndex(val) { this.mPopularityIndex = val; },
 get popularityIndex() { return this.mPopularityIndex; },

 set preferMailFormat(val) { this.mPreferMailFormat = val; },
 get preferMailFormat() { return this.mPreferMailFormat; },

 set primaryEmail(val) { this.mPrimaryEmail = val; },
 get primaryEmail() { return this.mPrimaryEmail; },

 set secondEmail(val) { this.mSecondEmail = val; },
 get secondEmail() { return this.mSecondEmail; },

 set spouseName(val) { this.mSpouseName = val; },
 get spouseName() { return this.mSpouseName; },

 set webPage1(val) { this.mWebPage1 = val; },
 get webPage1() { return this.mWebPage1; },

 set webPage2(val) { this.mWebPage2 = val; },
 get webPage2() { return this.mWebPage2; },

 set workAddress(val) { this.mWorkAddress = val; },
 get workAddress() { return this.mWorkAddress; },

 set workAddress2(val) { this.mWorkAddress2 = val; },
 get workAddress2() { return this.mWorkAddress2; },

 set workCity(val) { this.mWorkCity = val; },
 get workCity() { return this.mWorkCity; },

 set workCountry(val) { this.mWorkCountry = val; },
 get workCountry() { return this.mWorkCountry; },

 set workPhone(val) { this.mWorkPhone = val; },
 get workPhone() { return this.mWorkPhone; },

 set workPhoneType(val) { this.mWorkPhoneType = val; },
 get workPhoneType() { return this.mWorkPhoneType; },

 set workState(val) { this.mWorkState = val; },
 get workState() { return this.mWorkState; },

 set workZipCode(val) { this.mWorkZipCode = val; },
 get workZipCode() { return this.mWorkZipCode; },

 _attributeName: function(name) {
	 var realName;
	 if (name[0] == '_')
		 realName = "m" + name.substr(1);
	 else
		 realName = "m" + name;

	 if (typeof this[realName] == "undefined")
		 throw "attribute '" + name + "' is not defined";

	 return realName;
 },

 getCardValue: function(name) {
	 var realName = this._attributeName(name);

	 return this[realName];
 },
 setCardValue: function(name, value) {
	 var realName = this._attributeName(name);

	 this[realName] = value;
 },

// char* convertToBase64EncodedXML ( )
// char* convertToEscapedVCard ( )
// AString convertToXMLPrintData ( )
// void copy ( nsIAbCard srcCard )
 editCardToDatabase: function(uri) {
	 throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
// throw 
// 	 var directory = SCGetDirectoryFromURI(uri);
// 	 directory.addCard(this);
// 	 directory.dropCard(this, false);
 },

 equals: function(otherCard) {
// 	 dump("equals\n");
// 	 for (var x in this) {
// 		 dump(x + ": " + typeof(this[x]) + "\n");
// 	 }
	 return false;
 },
// PRBool  equals ( nsIAbCard card )
// AString generateName ( PRInt32 generateFormat , nsIStringBundle bundle )
// AString generatePhoneticName ( PRBool lastNameFirst )

 /* nsIAbMDBCard */
 mDbRowID: 0,
 mKey: 0,
 mDbTableID: 0,

 set dbRowID(val) { this.mDbRowID = val; },
 get dbRowID() { return this.mDbRowID; },

 set dbTableID(val) { this.mDbTableID = val; },
 get dbTableID() { return this.mDbTableID; },

 set key(val) { this.mKey = val; },
 get key() { return this.mKey; },

 setStringAttribute: function(name, value) {
	 this.values[name] = value;
 },
 getStringAttribute: function(name) {
// 	 dump("getString: " + name + "\n");
	 var value = this.values[name];
	 if (!value)
		 value = "";

	 return value;
 },
 setAbDatabase: function(database) {},

 /* nsISupports */
 QueryInterface: function(aIID) {
	 if (!aIID.equals(Components.interfaces.nsIAbCard)
			 && !aIID.equals(Components.interfaces.nsIAbMDBCard)
			 && !aIID.equals(Components.interfaces.nsISupports))
		 throw Components.results.NS_ERROR_NO_INTERFACE;

	 return this;
 }
};
