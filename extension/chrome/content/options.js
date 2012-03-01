/*
This file is part of Fire-IE.

Fire-IE is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Fire-IE is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Fire-IE.  If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * @namespace
 */

let jsm = {};
Components.utils.import("resource://gre/modules/AddonManager.jsm", jsm);
Components.utils.import("resource://gre/modules/Services.jsm", jsm);
Components.utils.import("resource://fireie/fireieUtils.jsm", jsm);
let {
  AddonManager, Services, fireieUtils
} = jsm;
let Strings = fireieUtils.Strings;

if (typeof(FireIE) == "undefined") {
  var FireIE = {};
}

FireIE.exportSettings = function() {
  var aOld = FireIE._getAllSettings(false);
  FireIE.setOptions(true);
  var aCurrent = FireIE._getAllSettings(false);
  if (aCurrent) FireIE._saveToFile(aCurrent);
  FireIE._setAllSettings(aOld);
}

FireIE.importSettings = function() {
  var aOld = FireIE._getAllSettings(false);
  var [result, aList] = FireIE._loadFromFile();
  if (result) {
    if (aList) {
      FireIE._setAllSettings(aList);
      FireIE.initDialog();
      FireIE._setAllSettings(aOld);
      FireIE.updateApplyButton(true);
    } else {
      alert(Strings.global.GetStringFromName("fireie.options.import.error"));
    }
  }
}

FireIE.restoreDefaultSettings = function() {
  var aOld = FireIE._getAllSettings(false);
  var aDefault = FireIE._getAllSettings(true);
  FireIE._setAllSettings(aDefault);
  FireIE.initDialog();
  FireIE._setAllSettings(aOld);
  FireIE.updateApplyButton(true);
}

// 应用设置
FireIE.setOptions = function(quiet) {
  let requiresRestart = false;

  //filter
  let filter = document.getElementById("filtercbx").checked;
  Services.prefs.setBoolPref("extensions.fireie.filter", filter);
  Services.prefs.setCharPref("extensions.fireie.filterlist", FireIE.getFilterListString());

  //general
  Services.prefs.setBoolPref("extensions.fireie.handleUrlBar", document.getElementById("handleurl").checked);
	let newKey = document.getElementById('shortcut-key').value;
	if (Services.prefs.getCharPref("extensions.fireie.shortcut.key") != newKey) {
		requiresRestart = true;
		Services.prefs.setCharPref("extensions.fireie.shortcut.key", newKey);
	}
	let newModifiers = document.getElementById('shortcut-modifiers').value;
	if (Services.prefs.getCharPref("extensions.fireie.shortcut.modifiers") != newModifiers) {
		requiresRestart = true;
		Services.prefs.setCharPref("extensions.fireie.shortcut.modifiers", newModifiers);
	}
	Services.prefs.setBoolPref("extensions.fireie.showUrlBarLabel", document.getElementById("showUrlBarLabel").checked);

  // IE compatibility mode
  let newMode = "ie7mode";
  let iemode = document.getElementById("iemode");
  if (iemode) {
    newMode = iemode.value;
  }
  if (Services.prefs.getCharPref("extensions.fireie.compatMode") != newMode) {
    requiresRestart = true;
    Services.prefs.setCharPref("extensions.fireie.compatMode", newMode);
    FireIE.applyIECompatMode();
  }

  //update UI
  FireIE.updateApplyButton(false);

  //notify of restart requirement
  if (requiresRestart && !quiet) {
    alert(Strings.global.GetStringFromName("fireie.options.alert.restart"));
  }
}

FireIE.applyIECompatMode = function() {
  let mode = Services.prefs.getCharPref("extensions.fireie.compatMode");
  let wrk = Components.classes["@mozilla.org/windows-registry-key;1"].createInstance(Components.interfaces.nsIWindowsRegKey);
  wrk.create(wrk.ROOT_KEY_CURRENT_USER, "SOFTWARE\\Microsoft\\Internet Explorer\\Main\\FeatureControl\\FEATURE_BROWSER_EMULATION", wrk.ACCESS_ALL);

  let value = 7000;
  switch (mode) {
  case 'ie7mode':
    value = 7000;
    break;
  case 'ie8mode':
    value = 8000;
    break;
  case 'ie9mode':
    value = 9000;
    break;
  default:
    value = 7000;
    break;
  }

  wrk.writeIntValue("firefox.exe", value);
  wrk.writeIntValue("plugin-container.exe", value);
}

// 获取IE主版本号
FireIE.getIEMainVersion = function() {
  let wrk = Components.classes["@mozilla.org/windows-registry-key;1"].createInstance(Components.interfaces.nsIWindowsRegKey);
  wrk.create(wrk.ROOT_KEY_LOCAL_MACHINE, "SOFTWARE\\Microsoft\\Internet Explorer", wrk.ACCESS_READ);

  let versionString = "";
  try {
    versionString = wrk.readStringValue("version");
  } catch (e) {
    fireieUtils.ERROR(e);
    return '0';
  }
  return parseInt(versionString);
}

FireIE.updateIEModeTab = function() {
  let mainIEVersion = FireIE.getIEMainVersion();
  // IE 8之前不显示这个设置页面
  if (mainIEVersion < 8) {
    return;
  }
  switch (mainIEVersion) {
  case 9:
    document.getElementById("ie9mode-radio").hidden = false;
  case 8:
    document.getElementById("ie8mode-radio").hidden = false;
    document.getElementById("ie7mode-radio").hidden = false;
    break;
  }
  document.getElementById("iemode-tab").hidden = false;
  let mode = Services.prefs.getCharPref("extensions.fireie.compatMode");
  document.getElementById("iemode").value = mode;
}

FireIE.getPrefFilterList = function() {
  var s = Services.prefs.getCharPref("extensions.fireie.filterlist", null);
  return (s ? s.split(" ") : "");
}

FireIE.addFilterRule = function(rule, enabled) {
  var rules = document.getElementById('filterChilds');
  var item = document.createElement('treeitem');
  var row = document.createElement('treerow');
  var c1 = document.createElement('treecell');
  var c2 = document.createElement('treecell');
  c1.setAttribute('label', rule);
  c2.setAttribute('value', enabled);
  row.appendChild(c1);
  row.appendChild(c2);
  item.appendChild(row);
  rules.appendChild(item);
  return (rules.childNodes.length - 1);
}

FireIE.initDialog = function() {
  //filter tab 网址过滤
  document.getElementById('filtercbx').checked = Services.prefs.getBoolPref("extensions.fireie.filter", true);
  var list = FireIE.getPrefFilterList();
  var rules = document.getElementById('filterChilds');
  while (rules.hasChildNodes()) rules.removeChild(rules.firstChild);
  for (var i = 0; i < list.length; i++) {
    if (list[i] != "") {
      var item = list[i].split("\b");
      var rule = item[0];
      if (!/^\/(.*)\/$/.exec(rule)) rule = rule.replace(/\/$/, "/*");
      var enabled = (item.length == 1);
      FireIE.addFilterRule(rule, enabled);
    }
  }
  // add current tab's url 
  var newurl = (window.arguments ? window.arguments[0] : ""); //get CurrentTab's URL
  document.getElementById('urlbox').value = (FireIE.startsWith(newurl, "about:") ? "" : newurl);
  document.getElementById('urlbox').select();

  // general 功能设置
  document.getElementById('handleurl').checked = Services.prefs.getBoolPref("extensions.fireie.handleUrlBar", false);
	document.getElementById('shortcut-modifiers').value = Services.prefs.getCharPref("extensions.fireie.shortcut.modifiers", "alt");
	document.getElementById('shortcut-key').value = Services.prefs.getCharPref("extensions.fireie.shortcut.key", "C");
	document.getElementById("showUrlBarLabel").checked = Services.prefs.getBoolPref("extensions.fireie.showUrlBarLabel", true);

	
  // updateStatus
  FireIE.updateDialogAllStatus();
  FireIE.updateApplyButton(false);

  // IE Compatibility Mode
  FireIE.updateIEModeTab();
}

FireIE.updateApplyButton = function(e) {
  document.getElementById("myApply").disabled = !e;
}

FireIE.init = function() {
  FireIE.initDialog();
  FireIE.addEventListenerByTagName("checkbox", "command", FireIE.updateApplyButton);
  FireIE.addEventListenerByTagName("radio", "command", FireIE.updateApplyButton);
  FireIE.addEventListener("filterChilds", "DOMAttrModified", FireIE.updateApplyButton);
  FireIE.addEventListener("filterChilds", "DOMNodeInserted", FireIE.updateApplyButton);
  FireIE.addEventListener("filterChilds", "DOMNodeRemoved", FireIE.updateApplyButton);
  FireIE.addEventListener("parambox", "input", FireIE.updateApplyButton);
}

FireIE.close = function() {
  let isModified = !document.getElementById("myApply").disabled;
  if (isModified) {
    // TODO Replace with localized string
    if (confirm("选项已修改，是否保存？")) {
      FireIE.setOptions(true);
    }
  }
}

FireIE.destory = function() {
  FireIE.removeEventListenerByTagName("checkbox", "command", FireIE.updateApplyButton);
  FireIE.removeEventListenerByTagName("radio", "command", FireIE.updateApplyButton);
  FireIE.removeEventListener("filterChilds", "DOMAttrModified", FireIE.updateApplyButton);
  FireIE.removeEventListener("filterChilds", "DOMNodeInserted", FireIE.updateApplyButton);
  FireIE.removeEventListener("filterChilds", "DOMNodeRemoved", FireIE.updateApplyButton);
  FireIE.removeEventListener("parambox", "input", FireIE.updateApplyButton);
}

FireIE.updateDialogAllStatus = function() {
  var en = document.getElementById('filtercbx').checked;
  document.getElementById('filterList').disabled = (!en);
  document.getElementById('filterList').editable = (en);
  document.getElementById('urllabel').disabled = (!en);
  document.getElementById('urlbox').disabled = (!en);
  FireIE.updateAddButtonStatus();
  FireIE.updateDelButtonStatus();
}

FireIE.getFilterListString = function() {
  var list = [];
  var filter = document.getElementById('filterList');
  var count = filter.view.rowCount;

  for (var i = 0; i < count; i++) {
    var rule = filter.view.getCellText(i, filter.columns['columnRule']);
    var enabled = filter.view.getCellValue(i, filter.columns['columnEnabled']);
    var item = rule + (enabled == "true" ? "" : "\b");
    list.push(item);
  }
  list.sort();
  return list.join(" ");
}

FireIE.updateDelButtonStatus = function() {
  var en = document.getElementById('filtercbx').checked;
  var delbtn = document.getElementById('delbtn');
  var filter = document.getElementById('filterList');
  delbtn.disabled = (!en) || (filter.view.selection.count < 1);
}

FireIE.updateAddButtonStatus = function() {
  var en = document.getElementById('filtercbx').checked;
  var addbtn = document.getElementById('addbtn');
  var urlbox = document.getElementById('urlbox');
  addbtn.disabled = (!en) || (urlbox.value.trim().length < 1);
}

FireIE.findRule = function(value) {
  var filter = document.getElementById('filterList');
  var count = filter.view.rowCount;
  for (var i = 0; i < count; i++) {
    var rule = filter.view.getCellText(i, filter.columns['columnRule']);
    if (rule == value) return i;
  }
  return -1;
}

FireIE.addNewURL = function() {
  var filter = document.getElementById('filterList');
  var urlbox = document.getElementById('urlbox');
  var rule = urlbox.value.trim();
  if (rule != "") {
    if ((rule != "about:blank") && (rule.indexOf("://") < 0)) {
      rule = (/^[A-Za-z]:/.test(rule) ? "file:///" + rule.replace(/\\/g, "/") : rule);
      if (/^file:\/\/.*/.test(rule)) rule = encodeURI(rule);
    }
    if (!/^\/(.*)\/$/.exec(rule)) rule = rule.replace(/\/$/, "/*");
    rule = rule.replace(/\s/g, "%20");
    var idx = FireIE.findRule(rule);
    if (idx == -1) {
      idx = FireIE.addFilterRule(rule, true);
      urlbox.value = "";
    }
    filter.view.selection.select(idx);
    filter.boxObject.ensureRowIsVisible(idx);
  }
  filter.focus();
  FireIE.updateAddButtonStatus();
}

FireIE.delSelected = function() {
  var filter = document.getElementById('filterList');
  var rules = document.getElementById('filterChilds');
  if (filter.view.selection.count > 0) {
    for (var i = rules.childNodes.length - 1; i >= 0; i--) {
      if (filter.view.selection.isSelected(i)) rules.removeChild(rules.childNodes[i]);
    }
  }
  FireIE.updateDelButtonStatus();
}

FireIE.onClickFilterList = function(e) {
  var filter = document.getElementById('filterList');
  if (!filter.disabled && e.button == 0 && e.detail >= 2) {
    if (filter.view.selection.count == 1) {
      var urlbox = document.getElementById('urlbox');
      urlbox.value = filter.view.getCellText(filter.currentIndex, filter.columns['columnRule']);
      urlbox.select();
      FireIE.updateAddButtonStatus();
    }
  }
}

FireIE._saveToFile = function(aList) {
  var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
  var stream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
  var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);

  fp.init(window, null, fp.modeSave);
  fp.defaultExtension = "txt";
  fp.defaultString = "FireIEPref";
  fp.appendFilters(fp.filterText);

  if (fp.show() != fp.returnCancel) {
    try {
      if (fp.file.exists()) fp.file.remove(true);
      fp.file.create(fp.file.NORMAL_FILE_TYPE, 0666);
      stream.init(fp.file, 0x02, 0x200, null);
      converter.init(stream, "UTF-8", 0, 0x0000);

      for (var i = 0; i < aList.length; i++) {
        aList[i] = aList[i] + "\n";
        converter.writeString(aList[i]);
      }
    } finally {
      converter.close();
      stream.close();
    }
  }
}

FireIE._loadFromFile = function() {
  var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
  var stream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
  var converter = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);

  fp.init(window, null, fp.modeOpen);
  fp.defaultExtension = "txt";
  fp.appendFilters(fp.filterText);

  if (fp.show() != fp.returnCancel) {
    try {
      var input = {};
      stream.init(fp.file, 0x01, 0444, null);
      converter.init(stream, "UTF-8", 0, 0x0000);
      converter.readString(stream.available(), input);
      var linebreak = input.value.match(/(((\n+)|(\r+))+)/m)[1];
      return [true, input.value.split(linebreak)];
    } finally {
      converter.close();
      stream.close();
    }
  }
  return [false, null];
}

FireIE._getAllSettings = function(isDefault) {
  var prefix = "extensions.fireie.";
  var prefs = (isDefault ? Services.prefs.getDefaultBranch("") : Services.prefs.getBranch(""));
  var preflist = prefs.getChildList(prefix, {});

  var aList = ["FireIEPref"];
  for (var i = 0; i < preflist.length; i++) {
    try {
      var value = null;
      switch (prefs.getPrefType(preflist[i])) {
      case prefs.PREF_BOOL:
        value = prefs.getBoolPref(preflist[i]);
        break;
      case prefs.PREF_INT:
        value = prefs.getIntPref(preflist[i]);
        break;
      case prefs.PREF_STRING:
        value = prefs.getComplexValue(preflist[i], Components.interfaces.nsISupportsString).data;
        break;
      }
      aList.push(preflist[i] + "=" + value);
    } catch (e) {}
  }
  return aList;
}

FireIE._setAllSettings = function(aList) {
  if (!aList) return;
  if (aList.length == 0) return;
  if (aList[0] != "FireIEPref") return;

  let prefs = Services.prefs.getBranch("");

  let aPrefs = [];
  for (let i = 1; i < aList.length; i++) {
    let index = aList[i].indexOf("=");
    if (index > 0) {
      var name = aList[i].substring(0, index);
      var value = aList[i].substring(index + 1, aList[i].length);
      aPrefs.push([name, value]);
    }
  }
  for (let i = 0; i < aPrefs.length; i++) {
    try {
      let name = aPrefs[i][0];
      let value = aPrefs[i][1];
      switch (prefs.getPrefType(name)) {
      case prefs.PREF_BOOL:
        prefs.setBoolPref(name, /true/i.test(value));
        break;
      case prefs.PREF_INT:
        prefs.setIntPref(name, value);
        break;
      case prefs.PREF_STRING:
        if (value.indexOf('"') == 0) value = value.substring(1, value.length - 1);
        let sString = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
        sString.data = value;
        prefs.setComplexValue(name, Components.interfaces.nsISupportsString, sString);
        break;
      }
    } catch (e) {}
  }
}