Components.utils.import("resource://gre/modules/NetUtil.jsm");

/**
 * @namespace
 */
if (typeof(FireIE) == "undefined") {
	var FireIE = {};
}

function getWindowForWebProgress(webProgress) {
  try {
    if (webProgress){
      return webProgress.DOMWindow;
    }
  } catch (err) {
  }  
  return null;
}

function getWebProgressForRequest(request) {
  try {
    if (request && request.notificationCallbacks)
      return request.notificationCallbacks.getInterface(Ci.nsIWebProgress);
  } catch (err ) {
  }

  try {
    if (request && request.loadGroup && request.loadGroup.groupObserver)
      return request.loadGroup.groupObserver.QueryInterface(Ci.nsIWebProgress);
  } catch (err) {
  }
  
  return null;
};
  
function getWindowForRequest(request){
  return getWindowForWebProgress(getWebProgressForRequest(request));
}


function getRootWindow(win) {
  for (; win; win = win.parent) {
    if (!win.parent || win == win.parent || !(win.parent instanceof Window))
      return win;
  }

  return null;
}

function getTabForWindow(win) {
  aWindow = getRootWindow(win);
  
  if (!aWindow || !gBrowser.getBrowserIndexForDocument)
    return null;
    
  try {
    var targetDoc = aWindow.document;
    
    var tab = null;
    var targetBrowserIndex = gBrowser.getBrowserIndexForDocument(targetDoc);
    
    if (targetBrowserIndex != -1) {
      tab = gBrowser.tabContainer.childNodes[targetBrowserIndex];
      return tab;
    }
  } catch (err) {
    LOG(err);
  }
  return null;
}
    
FireIE.HttpObserver = {
	// nsISupports
	QueryInterface: function(iid) {
		if (iid.equals(Components.interfaces.nsISupports) ||
			iid.equals(Components.interfaces.nsIObserver)) {
			return this;
		}
		throw Components.results.NS_ERROR_NO_INTERFACE;
	},
	
	// nsIObserver
	observe: function(subject, topic, data) {		
		try {
			if (!(subject instanceof Components.interfaces.nsIHttpChannel))
				return;
			switch (topic) {
				case 'http-on-modify-request':
					this.onModifyRequest(subject);
					break;
			}
		} catch (err) {
			LOG(err);
		}
	},
	
	onModifyRequest: function(subject) {
		var httpChannel = subject.QueryInterface(Components.interfaces.nsIHttpChannel);
    var win = getWindowForRequest(httpChannel);
    var tab = getTabForWindow(win);
    var isWindowURI = httpChannel.loadFlags & Components.interfaces.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
		if (isWindowURI) {
      var url = httpChannel.URI.spec;
      if (this.shouldFilter(url)) {
        if (!tab.linkedBrowser) return;
				
        subject.cancel(Components.results.NS_BINDING_SUCCEEDED);
				
        // http headers
        var headers = this._getAllRequestHeaders(httpChannel);
        
        // post data
        var post = "";
        var uploadChannel = subject.QueryInterface(Components.interfaces.nsIUploadChannel);
        if (uploadChannel && uploadChannel.uploadStream) {
          var len = uploadChannel.uploadStream.available();
          post = NetUtil.readInputStreamToString(uploadChannel.uploadStream, len);
        }
        
        var param = {url: url, headers: headers, post: post};
        tab.setAttribute(FireIE.navigateParamsAttr, JSON.stringify(param));
        tab.linkedBrowser.loadURI(FireIE.getfireieURL("about:blank"));
      }
		}
	},
  
  _getAllRequestHeaders: function(httpChannel) {
    	var visitor = function() {
        this.headers = "";
		  };
      visitor.prototype.visitHeader = function(aHeader, aValue) {
        this.headers += aHeader + ":" + aValue + "\r\n";
		  };
      var v = new visitor();
      httpChannel.visitRequestHeaders(v);
      return v.headers;
  },
  
  shouldFilter: function(url) {
	  if (FireIE.manualSwitchUrl != null) {
			return false;
		}
    return !FireIEWatcher.isFireIEURL(url)
         && !FireIE.isFirefoxOnly(url)
         && FireIEWatcher.isFilterEnabled()
         && FireIEWatcher.isMatchFilterList(url);
	}
}

var FireIEWatcher = {
   
   isFireIEURL: function(url) {
      if (!url) return false;
      return (url.indexOf(FireIE.containerUrl) == 0);
   },

   isFilterEnabled: function() {
      return (FireIE.getBoolPref("extensions.fireie.filter", true));
   },

   getPrefFilterList: function() {
      var s = FireIE.getStrPref("extensions.fireie.filterlist", null);
      return (s ? s.split(" ") : "");
   },

   setPrefFilterList: function(list) {
      FireIE.setStrPref("extensions.fireie.filterlist", list.join(" "));
   },

   isMatchURL: function(url, pattern) {
      if ((!pattern) || (pattern.length==0)) return false;
      var retest = /^\/(.*)\/$/.exec(pattern);
      if (retest) {
         pattern = retest[1];
      } else {
         pattern = pattern.replace(/\\/g, "/");
         var m = pattern.match(/^(.+:\/\/+[^\/]+\/)?(.*)/);
         m[1] = (m[1] ? m[1].replace(/\./g, "\\.").replace(/\?/g, "[^\\/]?").replace(/\*/g, "[^\\/]*") : "");
         m[2] = (m[2] ? m[2].replace(/\./g, "\\.").replace(/\+/g, "\\+").replace(/\?/g, "\\?").replace(/\*/g, ".*") : "");
         pattern = m[1] + m[2];
         pattern = "^" + pattern.replace(/\/$/, "\/.*") + "$";
      }
      var reg = new RegExp(pattern.toLowerCase());
      return (reg.test(url.toLowerCase()));
   },

   isMatchFilterList: function(url) {
      var aList = this.getPrefFilterList();
      for (var i=0; i<aList.length; i++) {
         var item = aList[i].split("\b");
         var rule = item[0];
         var enabled = (item.length == 1);
         if (enabled && this.isMatchURL(url, rule)) return(true);
      }
      return(false);
   },
}
