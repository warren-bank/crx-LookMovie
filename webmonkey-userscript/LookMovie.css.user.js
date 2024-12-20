// ==UserScript==
// @name         LookMovie.css
// @description  Apply CSS updates: hide upsell popup for "Premium Membership" subscription.
// @version      1.0.1
// @match        *://*.lookmovie2.la/*
// @match        *://*.lookmovie2.to/*
// @icon         https://lookmovie2.la/favicon-96x96.png
// @run-at       document-end
// @unwrap
// @homepage     https://github.com/warren-bank/crx-LookMovie/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-LookMovie/issues
// @downloadURL  https://github.com/warren-bank/crx-LookMovie/raw/webmonkey-userscript/es5/webmonkey-userscript/LookMovie.css.user.js
// @updateURL    https://github.com/warren-bank/crx-LookMovie/raw/webmonkey-userscript/es5/webmonkey-userscript/LookMovie.css.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

(function() {
  var $head  = document.head || document.getElementsByTagName('head')[0]
  var $style = document.createElement('style')

  $style.textContent = [
    'body > div.notifyjs-corner {display: none !important;}'
  ].join("\n")

  $head.appendChild($style)
})()
