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

var jsm = {};
Components.utils.import("resource://fireie/fireieUtils.jsm", jsm);
Components.utils.import("resource://gre/modules/Services.jsm", jsm);
var {fireieUtils, Services} = jsm;

var FireIEContainer = {
	init: function() {
		window.removeEventListener('DOMContentLoaded', FireIEContainer.init, false);
		var container = document.getElementById('container');
		if (!container) {
			fireieUtils.ERROR('Cannot find container to insert fireie-object.');
			return;
		}
		if (FireIEContainer._isInPrivateBrowsingMode()) {
			container.innerHTML = '<iframe src="PrivateBrowsingWarning.xhtml" width="100%" height="100%" frameborder="no" border="0" marginwidth="0" marginheight="0" scrolling="no" allowtransparency="yes"></iframe>';
		} else {
			FireIEContainer._registerEventHandler();
		}
		window.setTimeout(function() {
			var pluginObject = document.getElementById(FireIE.objectID);;
			document.title = pluginObject.Title;
		}, 200);
	},
	
	destroy: function(event) {
		window.removeEventListener('unload', FireIEContainer.destroy, false);
		
	},
	
	_getNavigateParam: function(name) {
		var headers = "";
		var tab = fireieUtils.getTabFromDocument(document);
		var navigateParams = fireieUtils.getTabAttributeJSON(tab, FireIE.navigateParamsAttr);
		if (navigateParams && typeof navigateParams[name] != "undefined") {
			headers = navigateParams[name];
		}
		return headers;	
	},
	
	getNavigateHeaders: function() {
		return this._getNavigateParam("headers");
	},
	
	getNavigatePostData: function() {
		return this._getNavigateParam("post");
	},
	
	getNavigateWindowId: function() {
		return this._getNavigateParam("id") + "";		
	},
	
	removeNavigateParams: function() {
		var tab = fireieUtils.getTabFromDocument(document);
		var navigateParams = fireieUtils.getTabAttributeJSON(tab, FireIE.navigateParamsAttr);
		if (navigateParams) {
			tab.removeAttribute(FireIE.navigateParamsAttr);
		}	
	},

	_isInPrivateBrowsingMode: function() {
		var pbs;
		try { pbs = Components.classes["@mozilla.org/privatebrowsing;1"].getService(Components.interfaces.nsIPrivateBrowsingService); } catch (e) {}
		var privatebrowsingwarning = pbs && pbs.privateBrowsingEnabled && Services.prefs.getBoolPref("extensions.fireie.privatebrowsingwarning", true);
		
		if (privatebrowsingwarning) {
			var cookieService = Components.classes["@mozilla.org/cookieService;1"].getService(Components.interfaces.nsICookieService);
			var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
			var cookieManager = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager);
			try {
				var pbwFlag = cookieService.getCookieString(ioService.newURI("http://fireie/", null, null), null);
				if (pbwFlag) {
					privatebrowsingwarning = pbwFlag.indexOf("privatebrowsingwarning=no") < 0;
					cookieManager.remove("fireie", "privatebrowsingwarning", "/", false);
				}
			}
			catch (e) {ERROR(e)}
		}
		
		return privatebrowsingwarning;
	},

	_registerEventHandler: function() {
		window.addEventListener("PluginNotFound", FireIEContainer._pluginNotFoundListener, false);
		window.addEventListener("IeTitleChanged", FireIEContainer._onTitleChanged, false);
		window.addEventListener("CloseIETab", FireIEContainer._onCloseIETab, false);
		var pluginObject = document.getElementById(FireIE.objectID);
		if (pluginObject) {
			pluginObject.addEventListener("focus", FireIEContainer._onPluginFocus, false);
		}
	},
	

	_pluginNotFoundListener: function(event) {
		alert("Loading Fire IE plugin failed. Please try restarting Firefox.");
	},

	/** 响应Plugin标题变化事件 */
	_onTitleChanged: function(event) {
		var title = event.detail;
		document.title = title;
	},
	
	/** 响应关闭IE标签窗口事件 */
	_onCloseIETab: function(event) {
		window.setTimeout(function() {
			window.close();
		}, 100);
	},
	
	/**
	 * 当焦点在plugin对象上时，在plugin中按Alt+XXX组合键时，
	 * 菜单栏无法正常弹出，因此当plugin对象得到焦点时，需要
	 * 调用其blus方法去除焦点。
	 */
	_onPluginFocus: function(event) {
		var pluginObject = event.originalTarget;
		pluginObject.blur();
		pluginObject.Focus();
	}
}

window.addEventListener('DOMContentLoaded', FireIEContainer.init, false);
window.addEventListener('unload', FireIEContainer.destroy, false);
