// ==UserScript==
// @name         LookMovie
// @description  Watch videos in external player.
// @version      1.0.8
// @include      /^https?:\/\/(?:[^\.\/]*\.)*(?:lookmovie2\.(?:to|la)|(?:lookmovie|lmplayer)\d*\.xyz)\/(?:shows|movies)\/(?:view|play)\/.*$/
// @include      /^https?:\/\/(?:[^\.\/]*\.)*lookmovie\d*\.xyz\/[sm]\/.*$/
// @icon         https://lookmovie2.la/favicon-96x96.png
// @run-at       document-end
// @grant        unsafeWindow
// @homepage     https://github.com/warren-bank/crx-LookMovie/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-LookMovie/issues
// @downloadURL  https://github.com/warren-bank/crx-LookMovie/raw/webmonkey-userscript/es5/webmonkey-userscript/LookMovie.user.js
// @updateURL    https://github.com/warren-bank/crx-LookMovie/raw/webmonkey-userscript/es5/webmonkey-userscript/LookMovie.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// ----------------------------------------------------------------------------- constants

var user_options = {
  "common": {
    "redirect_to_video_page":       true,
    "sort_newest_first":            true,
    "filters": {
      "streams": {
        "max_resolution":           "720p"
      },
      "subtitles": {
        "language":                 "English"
      }
    }
  },
  "webmonkey": {
    "post_intent_redirect_to_url":  "about:blank"
  },
  "greasemonkey": {
    "redirect_to_webcast_reloaded": true,
    "force_http":                   true,
    "force_https":                  false
  }
}

// ----------------------------------------------------------------------------- helpers (xhr)

var serialize_xhr_body_object = function(data) {
  if (typeof data === 'string')
    return data

  if (!(data instanceof Object))
    return null

  var body = []
  var keys = Object.keys(data)
  var key, val
  for (var i=0; i < keys.length; i++) {
    key = keys[i]
    val = data[key]
    val = unsafeWindow.encodeURIComponent(val)

    body.push(key + '=' + val)
  }
  body = body.join('&')
  return body
}

var download_text = function(url, headers, data, callback) {
  if (data) {
    if (!headers)
      headers = {}
    if (!headers['content-type'])
      headers['content-type'] = 'application/x-www-form-urlencoded'

    switch(headers['content-type'].toLowerCase()) {
      case 'application/json':
        data = JSON.stringify(data)
        break

      case 'application/x-www-form-urlencoded':
      default:
        data = serialize_xhr_body_object(data)
        break
    }
  }

  var xhr    = new unsafeWindow.XMLHttpRequest()
  var method = data ? 'POST' : 'GET'

  xhr.open(method, url, true, null, null)

  if (headers && (typeof headers === 'object')) {
    var keys = Object.keys(headers)
    var key, val
    for (var i=0; i < keys.length; i++) {
      key = keys[i]
      val = headers[key]
      xhr.setRequestHeader(key, val)
    }
  }

  xhr.onload = function(e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        callback(xhr.responseText)
      }
    }
  }

  if (data)
    xhr.send(data)
  else
    xhr.send()
}

var download_json = function(url, headers, data, callback) {
  if (!headers)
    headers = {}
  if (!headers.accept)
    headers.accept = 'application/json'

  download_text(url, headers, data, function(text){
    try {
      callback(JSON.parse(text))
    }
    catch(e) {}
  })
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, caption_url, referer_url, force_http, force_https) {
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.greasemonkey.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.greasemonkey.force_https

  var encoded_video_url, encoded_caption_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     = encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_caption_url   = caption_url ? encodeURIComponent(encodeURIComponent(btoa(caption_url))) : null
  referer_url           = referer_url ? referer_url : unsafeWindow.location.href
  encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))

  webcast_reloaded_base = {
    "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
    "http":  "http://webcast-reloaded.surge.sh/index.html"
  }

  webcast_reloaded_base = (force_http)
                            ? webcast_reloaded_base.http
                            : (force_https)
                               ? webcast_reloaded_base.https
                               : (video_url.toLowerCase().indexOf('http:') === 0)
                                  ? webcast_reloaded_base.http
                                  : webcast_reloaded_base.https

  webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_video_url + (encoded_caption_url ? ('/subtitle/' + encoded_caption_url) : '') + '/referer/' + encoded_referer_url
  return webcast_reloaded_url
}

// ----------------------------------------------------------------------------- URL redirect

var determine_video_type = function(video_url) {
  if (!video_url) return null

  var video_url_regex_pattern = /^.*\.(mp4|mp4v|mpv|m1v|m4v|mpg|mpg2|mpeg|xvid|webm|3gp|avi|mov|mkv|ogv|ogm|m3u8|mpd|ism(?:[vc]|\/manifest)?)(?:[\?#].*)?$/i
  var matches, file_ext, video_type

  matches = video_url_regex_pattern.exec(video_url)

  if (matches && matches.length)
    file_ext = matches[1]

  if (file_ext) {
    switch (file_ext) {
      case "mp4":
      case "mp4v":
      case "m4v":
        video_type = "video/mp4"
        break
      case "mpv":
        video_type = "video/MPV"
        break
      case "m1v":
      case "mpg":
      case "mpg2":
      case "mpeg":
        video_type = "video/mpeg"
        break
      case "xvid":
        video_type = "video/x-xvid"
        break
      case "webm":
        video_type = "video/webm"
        break
      case "3gp":
        video_type = "video/3gpp"
        break
      case "avi":
        video_type = "video/x-msvideo"
        break
      case "mov":
        video_type = "video/quicktime"
        break
      case "mkv":
        video_type = "video/x-mkv"
        break
      case "ogg":
      case "ogv":
      case "ogm":
        video_type = "video/ogg"
        break
      case "m3u8":
        video_type = "application/x-mpegURL"
        break
      case "mpd":
        video_type = "application/dash+xml"
        break
      case "ism":
      case "ism/manifest":
      case "ismv":
      case "ismc":
        video_type = "application/vnd.ms-sstr+xml"
        break
    }
  }

  return video_type ? video_type.toLowerCase() : ""
}

var redirect_to_url = function(url) {
  if (!url) return

  if (typeof GM_loadUrl === 'function') {
    if (typeof GM_resolveUrl === 'function')
      url = GM_resolveUrl(url, unsafeWindow.location.href) || url

    GM_loadUrl(url, 'Referer', unsafeWindow.location.href)
  }
  else {
    try {
      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.window.location = url
    }
  }
}

var process_webmonkey_post_intent_redirect_to_url = function() {
  var url = null

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'string')
    url = user_options.webmonkey.post_intent_redirect_to_url

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'function')
    url = user_options.webmonkey.post_intent_redirect_to_url()

  if (typeof url === 'string')
    redirect_to_url(url)
}

var process_video_data = function(data) {
  if (!data.video_url) return

  if (!data.referer_url)
    data.referer_url = unsafeWindow.location.href

  if (typeof GM_startIntent === 'function') {
    // running in Android-WebMonkey: open Intent chooser

    if (!data.video_type)
      data.video_type = determine_video_type(data.video_url)

    var args = [
      /* action = */ 'android.intent.action.VIEW',
      /* data   = */ data.video_url,
      /* type   = */ data.video_type
    ]

    // extras:
    if (data.caption_url) {
      args.push('textUrl')
      args.push(data.caption_url)
    }
    if (data.referer_url) {
      args.push('referUrl')
      args.push(data.referer_url)
    }
    if (data.drm.scheme) {
      args.push('drmScheme')
      args.push(data.drm.scheme)
    }
    if (data.drm.server) {
      args.push('drmUrl')
      args.push(data.drm.server)
    }
    if (data.drm.headers && (typeof data.drm.headers === 'object')) {
      var drm_header_keys, drm_header_key, drm_header_val

      drm_header_keys = Object.keys(data.drm.headers)
      for (var i=0; i < drm_header_keys.length; i++) {
        drm_header_key = drm_header_keys[i]
        drm_header_val = data.drm.headers[drm_header_key]

        args.push('drmHeader')
        args.push(drm_header_key + ': ' + drm_header_val)
      }
    }

    GM_startIntent.apply(this, args)
    process_webmonkey_post_intent_redirect_to_url()
    return true
  }
  else if (user_options.greasemonkey.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(data.video_url, data.caption_url, data.referer_url))
    return true
  }
  else {
    return false
  }
}

// -------------------------------------

var process_hls_data = function(data) {
  data.video_type = 'application/x-mpegurl'
  process_video_data(data)
}

var process_dash_data = function(data) {
  data.video_type = 'application/dash+xml'
  process_video_data(data)
}

// -------------------------------------

var process_video_url = function(video_url, video_type, caption_url, referer_url) {
  var data = {
    drm: {
      scheme:    null,
      server:    null,
      headers:   null
    },
    video_url:   video_url   || null,
    video_type:  video_type  || null,
    caption_url: caption_url || null,
    referer_url: referer_url || null
  }

  process_video_data(data)
}

var process_hls_url = function(video_url, caption_url, referer_url) {
  process_video_url(video_url, /* video_type= */ 'application/x-mpegurl', caption_url, referer_url)
}

var process_dash_url = function(video_url, caption_url, referer_url) {
  process_video_url(video_url, /* video_type= */ 'application/dash+xml', caption_url, referer_url)
}

// ----------------------------------------------------------------------------- download video URL

var resolve_url = function(url) {
  if (!url || (typeof url !== 'string'))
    return url

  if (url.substring(0, 4).toLowerCase() === 'http')
    return url

  if (url.substring(0, 2) === '//')
    return unsafeWindow.location.protocol + url

  if (url.substring(0, 1) === '/')
    return unsafeWindow.location.protocol + '//' + unsafeWindow.location.host + url

  return unsafeWindow.location.protocol + '//' + unsafeWindow.location.host + unsafeWindow.location.pathname.replace(/[^\/]+$/, '') + url
}

var get_best_video_url = function(json) {
  if (!(json.streams instanceof Object)) return null

  var max, keys

  max = user_options.common.filters.streams.max_resolution

  if (max && json.streams[max]) {
    // exact match
    return json.streams[max]
  }

  keys = Object.keys(json.streams)
  keys = keys.map(function(key) {
    return {
      key: key,
      val: parseInt(key, 10)
    }
  })
  keys.sort(function(k1, k2) { // descending order
    return (k1.val > k2.val)
      ? -1
      : (k1.val < k2.val)
        ? 1
        : 0
  })

  if (max) {
    max = parseInt(max, 10)
  }

  if (!max || isNaN(max)) {
    // no preference; default to highest available resolution
    return json.streams[keys[0].key]
  }

  for (var i=0; i < keys.length; i++) {
    if (keys[i].val <= max) {
      // highest resolution that satisfies criteria
      return json.streams[keys[i].key]
    }
  }

  // no resolution satisfies criteria; default to lowest available resolution
  return json.streams[keys[keys.length - 1].key]
}

var get_best_caption_url = function(json) {
  var lang, subtitles, sub

  lang = user_options.common.filters.subtitles.language
  if (!lang) return null
  lang = lang.toLowerCase()

  subtitles = get_normalized_subtitles(json)
  if (!Array.isArray(subtitles) || !subtitles.length) return null

  for (var i=0; i < subtitles.length; i++) {
    sub = subtitles[i]

    if (sub.language === lang) {
      return sub.url
    }
  }

  return null
}

var get_normalized_subtitles = function(json) {
  var subtitles = []
  var sub, keys, key

  if (Array.isArray(json.subtitles) && json.subtitles.length) {
    for (var i=0; i < json.subtitles.length; i++) {
      sub = json.subtitles[i]
      process_subtitle(subtitles, sub)
    }
    return subtitles
  }

  if (json.subtitles instanceof Object) {
    keys = Object.keys(json.subtitles)

    for (var i=0; i < keys.length; i++) {
      key = keys[i]
      sub = json.subtitles[key]
      process_subtitle(subtitles, sub)
    }
    return subtitles
  }

  return subtitles
}

var process_subtitle = function(subtitles, sub) {
  var language, url

  if (sub && (sub instanceof Object)) {
    language = sub.language
    url      = sub.url || sub.file

    if (language && url && (typeof language === 'string') && (typeof url === 'string')) {
      subtitles.push({
        language: language.toLowerCase(),
        url:      url
      })
    }
  }
}

/*
 * ======
 * notes:
 * ======
 * - callback is passed 3x String parameters:
 *   * video_url
 *   * video_type
 *   * caption_url
 */

var download_video_url = function(video_id, is_movie, callback) {
  if (!video_id)
    return
  if (!callback || (typeof callback !== 'function'))
    return

  var url, headers, data, json_callback

  url = is_movie
    ? ('/api/v1/security/movie-access?id_movie='     + video_id + '&id=' + video_id)
    : ('/api/v1/security/episode-access?id_episode=' + video_id + '&id=' + video_id)

  url     = resolve_url(url)
  headers = null
  data    = null

  json_callback = function(json) {
    if (!json || !(json instanceof Object) || !json.success) return

    var video_url, video_type, caption_url

    video_url = get_best_video_url(json)
    if (!video_url) return
    video_url = resolve_url(video_url)

    video_type  = determine_video_type(video_url)
    caption_url = get_best_caption_url(json)
    caption_url = resolve_url(caption_url)

    callback(video_url, video_type, caption_url)
  }

  download_json(url, headers, data, json_callback)
}

/*
 * ======
 * debug:
 * ======
  download_video_url(164022, false, console.log)
  download_video_url(58354,  true,  console.log)
 */

// ----------------------------------------------------------------------------- process video page

// ------------------------------------- helper:

var inspect_video_dom = function() {
  return inspect_video_dom_scripts() || inspect_video_dom_lists()
}

// ------------------------------------- lists

var inspect_video_dom_lists = function() {
  var items, videos, title, video

  items = unsafeWindow.document.querySelectorAll('li[data-id-episode]')
  if (!items || !items.length) return null

  videos = {
    title:    null,
    episodes: []
  }

  title = unsafeWindow.document.querySelector('.show__title')
  title = title ? title.innerText : ''
  videos.title = title

  for (var i=0; i < items.length; i++) {
    title = items[i].querySelector('.episodes__title')
    title = title ? title.innerText : ''

    video = {
      id_episode: items[i].getAttribute('data-id-episode'),
      season:     items[i].getAttribute('data-season'),
      episode:    items[i].getAttribute('data-episode'),
      title:      title
    }

    videos.episodes.push(video)
  }

  return videos
}

// ------------------------------------- inline scripts

var inspect_video_dom_scripts = function() {
  var regex, scripts, script, prefix, json, videos

  regex = {
    whitespace: /[\r\n\t]+/g,
    json:       /^[^\{]*(\{.*\})[^\}]*$/
  }

  scripts = unsafeWindow.document.querySelectorAll('script:not([src])')
  for (var i=0; i < scripts.length; i++) {
    script = scripts[i]
    script = script.innerText.trim()

    prefix = "window['movie_storage']"
    if (script.substring(0, prefix.length) === prefix) {
      script = script.substring(prefix.length, script.length)
      script = script.replace(regex.whitespace, ' ')

      try {
        json = script.replace(regex.json, '$1')
        json = eval('(' + json + ')')

        if (!json || !(json instanceof Object) || !json.id_movie) throw ''

        videos = {
          movie: {
            id_movie: json.id_movie
          }
        }
      }
      catch(e) {
        videos = null
      }

      return videos
    }

    prefix = "window['show_storage']"
    if (script.substring(0, prefix.length) === prefix) {
      script = script.substring(prefix.length, script.length)
      script = script.replace(regex.whitespace, ' ')

      try {
        json = script.replace(regex.json, '$1')
        json = eval('(' + json + ')')

        if (!json || !(json instanceof Object) || !Array.isArray(json.seasons) || !json.seasons.length) throw ''

        videos = {
          title:    json.title,
          episodes: json.seasons
        }
      }
      catch(e) {
        videos = null
      }

      return videos
    }
  }

  return null
}

// -------------------------------------

var process_video = function(video_id, is_movie) {
  download_video_url(video_id, is_movie, process_video_url)
}

// ----------------------------------------------------------------------------- rewrite DOM to display all available full-episodes for show

// ------------------------------------- constants

var strings = {
  "button_download_video":          "Get Video URL",
  "button_start_video":             "Start Video",
  "button_unavailable_video":       "Video Is Not Available",
  "episode_labels": {
    "title":                        "title:"
  }
}

var constants = {
  "dom_classes": {
    "div_episodes":                 "episodes",
    "div_webcast_icons":            "icons-container"
  },
  "img_urls": {
    "base_webcast_reloaded_icons":  "https://github.com/warren-bank/crx-webcast-reloaded/raw/gh-pages/chrome_extension/2-release/popup/img/"
  }
}

// -------------------------------------  helpers

var repeat_string = function(str, count) {
  var rep = ''
  for (var i=0; i < count; i++)
    rep += str
  return rep
}

var pad_zeros = function(num, len) {
  var str = num.toString()
  var pad = len - str.length
  if (pad > 0)
    str = repeat_string('0', pad) + str
  return str
}

// -------------------------------------  URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url_chromecast_sender = function(video_url, caption_url, referer_url) {
  return get_webcast_reloaded_url(video_url, caption_url, referer_url, /* force_http= */ null, /* force_https= */ null).replace('/index.html', '/chromecast_sender.html')
}

var get_webcast_reloaded_url_airplay_sender = function(video_url, caption_url, referer_url) {
  return get_webcast_reloaded_url(video_url, caption_url, referer_url, /* force_http= */ true, /* force_https= */ false).replace('/index.html', '/airplay_sender.es5.html')
}

var get_webcast_reloaded_url_proxy = function(hls_url, caption_url, referer_url) {
  return get_webcast_reloaded_url(hls_url, caption_url, referer_url, /* force_http= */ true, /* force_https= */ false).replace('/index.html', '/proxy.html')
}

// -------------------------------------  DOM: static skeleton

var reinitialize_dom = function() {
  unsafeWindow.document.close()
  unsafeWindow.document.write('')
  unsafeWindow.document.close()

  var head = unsafeWindow.document.getElementsByTagName('head')[0]
  var body = unsafeWindow.document.body

  var html = {
    "head": [
      '<style>',

      // --------------------------------------------------- CSS: global

      'body {',
      '  background-color: #fff !important;',
      '  text-align: left;',
      '}',

      'body > * {',
      '  display: none !important;',
      '}',

      'body > div.' + constants.dom_classes.div_episodes + ' {',
      '  display: block !important;',
      '}',

      // --------------------------------------------------- series title

      'div.' + constants.dom_classes.div_episodes + ' > h2 {',
      '  display: block;',
      '  margin: 0;',
      '  padding: 0.5em;',
      '  font-size: 22px;',
      '  text-align: center;',
      '  background-color: #ccc;',
      '  color: #000;',
      '}',

      'div.' + constants.dom_classes.div_episodes + ' > h2 + ul > li:first-child {',
      '  margin-top: 0;',
      '  border-top-style: none;',
      '  padding-top: 0;',
      '}',

      // --------------------------------------------------- CSS: episodes

      'div.' + constants.dom_classes.div_episodes + ' > ul {',
      '  list-style: none;',
      '  margin: 0;',
      '  padding: 0;',
      '  padding-left: 1em;',
      '}',

      'div.' + constants.dom_classes.div_episodes + ' > ul > li {',
      '  list-style: none;',
      '  margin-top: 0.5em;',
      '  border-top: 1px solid #999;',
      '  padding-top: 0.5em;',
      '}',

      'div.' + constants.dom_classes.div_episodes + ' > ul > li > table {',
      '  min-height: 70px;',
      '}',

      'div.' + constants.dom_classes.div_episodes + ' > ul > li > table td:first-child {',
      '  font-style: italic;',
      '  padding-right: 1em;',
      '}',

      'div.' + constants.dom_classes.div_episodes + ' > ul > li > table td > a {',
      '  display: inline-block;',
      '  margin: 0;',
      '  color: blue;',
      '  text-decoration: none;',
      '}',

      'div.' + constants.dom_classes.div_episodes + ' > ul > li > blockquote {',
      '  display: block;',
      '  background-color: #eee;',
      '  padding: 0.5em 1em;',
      '  margin: 0;',
      '}',

      'div.' + constants.dom_classes.div_episodes + ' > ul > li > button {',
      '  margin: 0.75em 0;',
      '}',

      'div.' + constants.dom_classes.div_episodes + ' > ul > li > div.' + constants.dom_classes.div_webcast_icons + ' {',
      '}',

      // --------------------------------------------------- CSS: EPG data (links to tools on Webcast Reloaded website)

      'div.' + constants.dom_classes.div_webcast_icons + ' {',
      '  display: block;',
      '  position: relative;',
      '  z-index: 1;',
      '  float: right;',
      '  margin: 0.5em;',
      '  width: 60px;',
      '  height: 60px;',
      '  max-height: 60px;',
      '  vertical-align: top;',
      '  background-color: #d7ecf5;',
      '  border: 1px solid #000;',
      '  border-radius: 14px;',
      '}',

      'div.' + constants.dom_classes.div_webcast_icons + ' > a.chromecast,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.chromecast > img,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.airplay,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.airplay > img,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.proxy,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.proxy > img,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.video-link,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.video-link > img {',
      '  display: block;',
      '  width: 25px;',
      '  height: 25px;',
      '}',

      'div.' + constants.dom_classes.div_webcast_icons + ' > a.chromecast,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.airplay,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.proxy,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.video-link {',
      '  position: absolute;',
      '  z-index: 1;',
      '  text-decoration: none;',
      '}',

      'div.' + constants.dom_classes.div_webcast_icons + ' > a.chromecast,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.airplay {',
      '  top: 0;',
      '}',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.proxy,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.video-link {',
      '  bottom: 0;',
      '}',

      'div.' + constants.dom_classes.div_webcast_icons + ' > a.chromecast,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.proxy {',
      '  left: 0;',
      '}',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.airplay,',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.video-link {',
      '  right: 0;',
      '}',
      'div.' + constants.dom_classes.div_webcast_icons + ' > a.airplay + a.video-link {',
      '  right: 17px; /* (60 - 25)/2 to center when there is no proxy icon */',
      '}',

      '</style>'
    ],
    "body": [
      '<div class="' + constants.dom_classes.div_episodes + '"></div>'
    ]
  }

  head.innerHTML = '' + html.head.join("\n")
  body.innerHTML = '' + html.body.join("\n")
}

// ------------------------------------- DOM: dynamic elements - common

var make_element = function(elementName, html) {
  var el = unsafeWindow.document.createElement(elementName)

  if (html)
    el.innerHTML = html

  return el
}

var make_span = function(text) {return make_element('span', text)}
var make_h4   = function(text) {return make_element('h4',   text)}

// ------------------------------------- DOM: dynamic elements - episodes

var make_webcast_reloaded_div = function(video_url, caption_url, referer_url) {
  var webcast_reloaded_urls = {
//  "index":             get_webcast_reloaded_url(                  video_url, caption_url, referer_url),
    "chromecast_sender": get_webcast_reloaded_url_chromecast_sender(video_url, caption_url, referer_url),
    "airplay_sender":    get_webcast_reloaded_url_airplay_sender(   video_url, caption_url, referer_url),
    "proxy":             get_webcast_reloaded_url_proxy(            video_url, caption_url, referer_url)
  }

  var div = make_element('div')

  var html = [
    '<a target="_blank" class="chromecast" href="' + webcast_reloaded_urls.chromecast_sender + '" title="Chromecast Sender"><img src="'       + constants.img_urls.base_webcast_reloaded_icons + 'chromecast.png"></a>',
    '<a target="_blank" class="airplay" href="'    + webcast_reloaded_urls.airplay_sender    + '" title="ExoAirPlayer Sender"><img src="'     + constants.img_urls.base_webcast_reloaded_icons + 'airplay.png"></a>',
    '<a target="_blank" class="proxy" href="'      + webcast_reloaded_urls.proxy             + '" title="HLS-Proxy Configuration"><img src="' + constants.img_urls.base_webcast_reloaded_icons + 'proxy.png"></a>',
    '<a target="_blank" class="video-link" href="' + video_url                                 + '" title="direct link to video"><img src="'    + constants.img_urls.base_webcast_reloaded_icons + 'video_link.png"></a>'
  ]

  div.setAttribute('class', constants.dom_classes.div_webcast_icons)
  div.innerHTML = html.join("\n")

  return div
}

var insert_webcast_reloaded_div = function(block_element, video_url, caption_url, referer_url) {
  var webcast_reloaded_div = make_webcast_reloaded_div(video_url, caption_url, referer_url)

  if (block_element.childNodes.length)
    block_element.insertBefore(webcast_reloaded_div, block_element.childNodes[0])
  else
    block_element.appendChild(webcast_reloaded_div)
}

var download_video = function(video_id, is_movie, block_element, old_button) {
  var callback = function(video_url, video_type, caption_url) {
    if (video_url) {
      insert_webcast_reloaded_div(block_element, video_url, caption_url)
      add_start_video_button(video_url, video_type, caption_url, block_element, old_button)
    }
    else {
      old_button.innerHTML = strings.button_unavailable_video
      old_button.disabled  = true
    }
  }

  download_video_url(video_id, is_movie, callback)
}

// -------------------------------------

var onclick_start_video_button = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=true;

  var button      = event.target
  var video_url   = button.getAttribute('x-video-url')
  var video_type  = button.getAttribute('x-video-type')
  var caption_url = button.getAttribute('x-caption-url')

  if (video_url)
    process_video_url(video_url, video_type, caption_url)
}

var make_start_video_button = function(video_url, video_type, caption_url) {
  var button = make_element('button')

  button.setAttribute('x-video-url',   video_url   || '')
  button.setAttribute('x-video-type',  video_type  || '')
  button.setAttribute('x-caption-url', caption_url || '')
  button.innerHTML = strings.button_start_video
  button.addEventListener("click", onclick_start_video_button)

  return button
}

var add_start_video_button = function(video_url, video_type, caption_url, block_element, old_button) {
  var new_button = make_start_video_button(video_url, video_type, caption_url)

  if (old_button)
    old_button.parentNode.replaceChild(new_button, old_button)
  else
    block_element.appendChild(new_button)
}

// -------------------------------------

var make_episode_listitem_html = function(video) {
  var tr = []

  var append_tr = function(td, colspan) {
    if (Array.isArray(td))
      tr.push('<tr><td>' + td.join('</td><td>') + '</td></tr>')
    else if ((typeof colspan === 'number') && (colspan > 1))
      tr.push('<tr><td colspan="' + colspan + '">' + td + '</td></tr>')
    else
      tr.push('<tr><td>' + td + '</td></tr>')
  }

  var title = []
  if (video.season && video.episode)
    title.push('S' + pad_zeros(video.season, 2) + ' E' + pad_zeros(video.episode, 2))
  if (video.title)
    title.push(video.title)

  if (title.length)
    append_tr([strings.episode_labels.title, title.join(': ')])

  var html = ['<table>' + tr.join("\n") + '</table>']

  return '<li x-episode-id="' + video.id + '">' + html.join("\n") + '</li>'
}

// -------------------------------------

var onclick_download_show_video_button = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=true;

  var button, video_id, episodes_div, episode_item

  button = event.target

  video_id = button.getAttribute('x-episode-id')
  if (!video_id) return

  episodes_div = unsafeWindow.document.querySelector('div.' + constants.dom_classes.div_episodes)
  if (!episodes_div) return

  episode_item = episodes_div.querySelector('li[x-episode-id="' + video_id + '"]')
  if (!episode_item) return

  download_video(video_id, /* is_movie= */ false, /* block_element= */ episode_item, /* old_button= */ button)
}

var make_download_show_video_button = function(video_id) {
  var button = make_element('button')

  button.setAttribute('x-episode-id', video_id)
  button.innerHTML = strings.button_download_video
  button.addEventListener("click", onclick_download_show_video_button)

  return button
}

var add_episode_div_buttons = function(episodes_div) {
  var episode_items = episodes_div.querySelectorAll('li[x-episode-id]')
  var episode_item, video_id, button

  for (var i=0; i < episode_items.length; i++) {
    episode_item = episode_items[i]

    video_id = episode_item.getAttribute('x-episode-id')
    if (!video_id) continue

    button = make_download_show_video_button(video_id)
    episode_item.appendChild(button)
  }
}

// -------------------------------------

var display_episodes = function(episodes, series_title) {
  var episodes_div, html

  reinitialize_dom()

  episodes_div = unsafeWindow.document.querySelector('div.' + constants.dom_classes.div_episodes)
  if (!episodes_div) return

  html = []
  if (series_title) {
    html.push('<h2>' + series_title + '</h2>')
  }
  html.push('<ul>' + episodes.map(make_episode_listitem_html).join("\n") + '</ul>')
  episodes_div.innerHTML = html.join("\n")

  add_episode_div_buttons(episodes_div)

  user_options.webmonkey.post_intent_redirect_to_url = null
}

// -------------------------------------

var process_episodes = function(episodes, series_title) {
  // optionally: sort episodes in ascending chronological order
  if (user_options.common.sort_newest_first) {
    episodes.reverse()
  }

  // rename video attributes
  episodes = episodes.map(function(video) {
    return {
      id:           video.id_episode,
      season:       (video.season  ? parseInt(video.season,  10) : 0),
      episode:      (video.episode ? parseInt(video.episode, 10) : 0),
      title:        video.title
    }
  })

  display_episodes(episodes, series_title)
}

// ----------------------------------------------------------------------------- bootstrap

var redirect_to_video_page = function() {
  var el, url

  if (user_options.common.redirect_to_video_page) {
    el = unsafeWindow.document.querySelector('a[href] > i.big-play')

    if (el) {
      el  = el.parentNode
      url = el.getAttribute('href')
      url = resolve_url(url)

      redirect_to_url(url)
      return true
    }
  }

  return false
}

// -------------------------------------

var is_video_page = function() {
  var pathname, is_video_page

  pathname = unsafeWindow.location.pathname
  is_video_page = (pathname.indexOf('/view/') === -1)

  return is_video_page
}

// -------------------------------------

var init = function() {
  if (!is_video_page()) return

  var videos, video, is_movie

  videos = inspect_video_dom()

  if (!videos || !(videos instanceof Object)) return

  if (videos.movie instanceof Object) {
    video = videos.movie

    if (video.id_movie) {
      is_movie = true
      process_video(video.id_movie, is_movie)
      return
    }
  }

  if (Array.isArray(videos.episodes) && videos.episodes.length) {
    if (videos.episodes.length === 1) {
      video = videos.episodes[0]

      if ((video instanceof Object) && video.id_episode) {
        is_movie = false
        process_video(video.id_episode, is_movie)
        return
      }
    }

    process_episodes(videos.episodes, videos.title)
  }
}

// -------------------------------------

var should_init = function() {
  if (('function' === (typeof GM_getUrl)) && (GM_getUrl() !== unsafeWindow.location.href)) return false

  if (unsafeWindow.window.did_userscript_init) return false

  unsafeWindow.window.did_userscript_init = true
  return true
}

// -------------------------------------

if (should_init()) {
  redirect_to_video_page() || init()
}

// -----------------------------------------------------------------------------
