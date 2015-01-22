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
 * @fileOverview Module containing a bunch of utility functions (for content processes)
 */

var EXPORTED_SYMBOLS = ["ContentUtils"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

let ContentUtils = {
  /**
   * Translates a string URI into its nsIURI representation, will return null for
   * invalid URIs.
   */
  makeURI: function( /**String*/ url, /**Boolean*/ silent) /**nsIURI*/
  {
    try
    {
      url = url.trim();
      if (!/^[\w\-]+:/.test(url))
      {
        url = "http://" + url;
      }
      return Services.io.newURI(url, null, null);
    }
    catch (e)
    {
      if (!silent)
        ContentUtils.ERROR(e + ": " + url);
      return null;
    }
  },

  /**
   * If a protocol using nested URIs like jar: is used - retrieves innermost
   * nested URI.
   */
  unwrapURL: function( /**nsIURI or String*/ url) /**nsIURI*/
  {
    if (!(url instanceof Ci.nsIURI)) url = ContentUtils.makeURI(url);

    if (url instanceof Ci.nsINestedURI) return url.innermostURI;
    else return url;
  },
  
  isRootWindow: function(win)
  {
    return !win.parent || win == win.parent || !(win.parent instanceof Ci.nsIDOMWindow);
  },
};

/**
 * Set the value of preference "extensions.logging.enabled" to false to hide
 * Utils.LOG message
 */
["LOG", "WARN", "ERROR"].forEach(function(aName)
{
  XPCOMUtils.defineLazyGetter(ContentUtils, aName, function()
  {
    let jsm = {};
    try
    {
      Components.utils.import("resource://gre/modules/AddonLogging.jsm", jsm);
      if (!jsm.LogManager)
        throw "LogManager not found in resource://gre/modules/AddonLogging.jsm";
    }
    catch (e)
    {
      // Nightly 20140225
      Components.utils.import("resource://gre/modules/addons/AddonLogging.jsm", jsm);
      if (!jsm.LogManager)
        throw "LogManager not found in resource://gre/modules/(addons/)AddonLogging.jsm";
    }
    let logger = {};
    jsm.LogManager.getLogger("[fireie-content]", logger);
    return logger[aName];
  });
});

XPCOMUtils.defineLazyServiceGetter(ContentUtils, "categoryManager", "@mozilla.org/categorymanager;1", "nsICategoryManager");
XPCOMUtils.defineLazyServiceGetter(ContentUtils, "chromeRegistry", "@mozilla.org/chrome/chrome-registry;1", "nsIXULChromeRegistry");
