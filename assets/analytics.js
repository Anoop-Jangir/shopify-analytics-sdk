/*
 * assets/analytics.js
 * Single-file Shopify mParticle integration for theme inclusion.
 * - Auto-loads the mParticle Web SDK (if MPARTICLE_API_KEY global is set) or via init(apiKey)
 * - Provides a single global: window.ShopifyMPAnalytics
 * - Auto-collects browser / os / device / screen / viewport / language / tz / url / path / referrer / UTM params / timestamp / sessionId / anonymousId
 * - Exposes logEvent and high-level helpers: trackLoginAttempt, trackLoginSuccess, trackLoginFail, trackAccountEvent, trackProductView, trackAddToCart
 * - Designed to be reused from theme scripts or a custom pixel (call ShopifyMPAnalytics.logEvent(...))
 *
 * Usage:
 *   <script>window.MPARTICLE_API_KEY = 'REPLACE_WITH_API_KEY';</script>
 *   <script src="/assets/analytics.js"></script>
 *
 * Or initialize manually:
 *   ShopifyMPAnalytics.init('REPLACE_WITH_API_KEY', { isDevelopmentMode: true })
 *   ShopifyMPAnalytics.trackLoginSuccess({ userId: '12345', method: 'multipass' })
 */
(function (window, document) {
  'use strict';

  var NAMESPACE = 'ShopifyMPAnalytics';
  if (window[NAMESPACE]) {
    // already loaded
    return;
  }

  // Simple helpers
  function _safeUUID() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (e) {}
    // fallback
    return 'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function _getOrCreateLocal(key, createFn) {
    try {
      var v = localStorage.getItem(key);
      if (v) return v;
      v = createFn();
      localStorage.setItem(key, v);
      return v;
    } catch (e) {
      return createFn();
    }
  }

  function _getOrCreateSession(key, createFn) {
    try {
      var v = sessionStorage.getItem(key);
      if (v) return v;
      v = createFn();
      sessionStorage.setItem(key, v);
      return v;
    } catch (e) {
      return createFn();
    }
  }

  function _parseUTM(search) {
    try {
      var params = new URLSearchParams(search || window.location.search || '');
      var utm = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
        if (params.has(k)) utm[k.replace('utm_', 'utm_')] = params.get(k);
      });
      return Object.keys(utm).length ? utm : null;
    } catch (e) {
      return null;
    }
  }

  function _parseUserAgent(ua) {
    ua = ua || navigator.userAgent || '';
    var result = {
      browser: 'Unknown',
      browserVersion: null,
      os: 'Unknown',
      osVersion: null,
      device: 'Unknown'
    };

    // Browser
    var browserRegexes = [
      [/\b(OPR|Opera)\/(\d+[\.\d]*)/, 'Opera'],
      [/Edg\/(\d+[\.\d]*)/, 'Edge'],
      [/Chrome\/(\d+[\.\d]*)/, 'Chrome'],
      [/Firefox\/(\d+[\.\d]*)/, 'Firefox'],
      [/Version\/(\d+[\.\d]*)\s+Safari\//, 'Safari'],
      [/Safari\/(\d+[\.\d]*)/, 'Safari']
    ];
    for (var i = 0; i < browserRegexes.length; i++) {
      var r = browserRegexes[i][0];
      var name = browserRegexes[i][1];
      var m = ua.match(r);
      if (m) {
        result.browser = name;
        result.browserVersion = m[2] || m[1] || null;
        break;
      }
    }

    // OS
    var osRegexes = [
      [/Windows NT (\d+[\.\d]*)/, 'Windows'],
      [/Android (\d+[\.\d]*)/, 'Android'],
      [/iPhone OS (\d+[_\d]*)/, 'iOS'],
      [/iPad; CPU OS (\d+[_\d]*)/, 'iOS'],
      [/Mac OS X (\d+[_\d]*)/, 'macOS'],
      [/Linux/, 'Linux']
    ];
    for (i = 0; i < osRegexes.length; i++) {
      var ro = osRegexes[i][0];
      var oname = osRegexes[i][1];
      var mo = ua.match(ro);
      if (mo) {
        result.os = oname;
        result.osVersion = mo[1] ? mo[1].replace(/_/g, '.') : null;
        break;
      }
    }

    // Device type guess
    if (/Mobi|Android|iPhone/.test(ua)) result.device = 'Mobile';
    else if (/iPad|Tablet/.test(ua)) result.device = 'Tablet';
    else result.device = 'Desktop';

    return result;
  }

  function _collectAutoAttributes() {
    var uaInfo = _parseUserAgent(navigator.userAgent);
    var screenRes = (window.screen && window.screen.width && window.screen.height) ? (window.screen.width + 'x' + window.screen.height) : null;
    var viewport = (window.innerWidth && window.innerHeight) ? (window.innerWidth + 'x' + window.innerHeight) : null;
    var language = (navigator.languages && navigator.languages.length) ? navigator.languages[0] : (navigator.language || null);
    var tz = null;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch (e) {
      tz = null;
    }

    var utm = _parseUTM(window.location.search);

    var attrs = {
      browser: uaInfo.browser,
      browserVersion: uaInfo.browserVersion,
      os: uaInfo.os,
      osVersion: uaInfo.osVersion,
      device: uaInfo.device,
      screenResolution: screenRes,
      viewport: viewport,
      language: language,
      timezone: tz,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || null,
      timestamp: new Date().toISOString(),
      sessionId: _getOrCreateSession('shopify_mp_session_id', function () { return 'sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }),
      anonymousId: _getOrCreateLocal('shopify_mp_anon_id', _safeUUID)
    };

    if (utm) {
      // flatten UTM keys but prefix with utm_
      Object.keys(utm).forEach(function (k) {
        attrs[k] = utm[k];
      });
    }

    return attrs;
  }

  // Prevent duplicate attribute keys when merging. The passed-in attrs take precedence.
  function _mergeAttributes(autoAttrs, customAttrs) {
    var out = {};
    customAttrs = customAttrs || {};
    // start with custom so they override
    Object.keys(customAttrs).forEach(function (k) { out[k] = customAttrs[k]; });
    Object.keys(autoAttrs).forEach(function (k) { if (!(k in out)) out[k] = autoAttrs[k]; });
    return out;
  }

  // SDK loader
  function _loadMParticle(apiKey, opts) {
    opts = opts || {};
    if (!apiKey) return Promise.reject(new Error('mParticle API key required'));

    // If already loaded
    if (window.mParticle && window.mParticle.logEvent) return Promise.resolve(window.mParticle);

    // If a loader is already in progress, return the same promise
    if (_loadMParticle._promise) return _loadMParticle._promise;

    _loadMParticle._promise = new Promise(function (resolve, reject) {
      try {
        // Insert minimal snippet that queues calls
        window.mParticle = window.mParticle || {};
        window.mParticle.config = window.mParticle.config || {};
        window.mParticle.config.rq = window.mParticle.config.rq || [];
        window.mParticle.EventType = window.mParticle.EventType || { Unknown:0, Navigation:1, Location:2, Search:3, Transaction:4, UserContent:5, UserPreference:6, Social:7, Other:8, Media:9 };
        window.mParticle.eCommerce = window.mParticle.eCommerce || { Cart: {} };

        // create script
        var p = document.createElement('script');
        p.type = 'text/javascript';
        p.async = true;
        var protocol = (document.location.protocol === 'https:') ? 'https://' : 'http://';
        var src = protocol + 'jssdkcdns.mparticle.com/js/v2/' + encodeURIComponent(apiKey) + '/mparticle.js';
        // support options: isDevelopmentMode -> env query
        var envFlag = opts.isDevelopmentMode ? '1' : '0';
        src += '?env=' + envFlag;
        if (opts.dataPlan && opts.dataPlan.planId) {
          src += '&plan_id=' + encodeURIComponent(opts.dataPlan.planId);
          if (opts.dataPlan.planVersion) src += '&plan_version=' + encodeURIComponent(opts.dataPlan.planVersion);
        }
        p.src = src;
        p.onload = function () {
          // wait briefly for SDK to initialize
          setTimeout(function () {
            if (window.mParticle) {
              resolve(window.mParticle);
            } else {
              reject(new Error('mParticle SDK loaded but window.mParticle missing'));
            }
          }, 50);
        };
        p.onerror = function (e) { reject(new Error('Failed to load mParticle SDK: ' + e)); };
        var first = document.getElementsByTagName('script')[0];
        first.parentNode.insertBefore(p, first);
      } catch (err) {
        reject(err);
      }
    });

    return _loadMParticle._promise;
  }

  // Public API
  var API = {
    _apiKey: null,
    _opts: null,
    _sdkReady: null,

    init: function (apiKey, opts) {
      this._apiKey = apiKey;
      this._opts = opts || {};
      this._sdkReady = _loadMParticle(apiKey, opts).catch(function (err) {
        // swallow but log
        console.error('[ShopifyMPAnalytics] mParticle load failed', err);
        throw err;
      });
      return this._sdkReady;
    },

    // low-level: logEvent
    logEvent: function (eventName, eventAttributes, eventType) {
      eventName = String(eventName || 'Unknown Event');
      eventAttributes = eventAttributes || {};
      eventType = typeof eventType !== 'undefined' ? eventType : (window.mParticle && window.mParticle.EventType && window.mParticle.EventType.Other) || 8;

      var auto = _collectAutoAttributes();
      var attrs = _mergeAttributes(auto, eventAttributes);

      var call = function () {
        try {
          if (window.mParticle && window.mParticle.logEvent) {
            window.mParticle.logEvent(eventName, eventType, attrs);
          } else {
            // If SDK not present, queue in mParticle.config.rq if available
            if (window.mParticle && window.mParticle.config && Array.isArray(window.mParticle.config.rq)) {
              window.mParticle.config.rq.push(['logEvent', eventName, eventType, attrs]);
            }
            console.info('[ShopifyMPAnalytics] queued event', eventName, attrs);
          }
        } catch (e) {
          console.error('[ShopifyMPAnalytics] logEvent failed', e);
        }
      };

      if (this._sdkReady) {
        // Ensure sdkReady resolves before calling
        this._sdkReady.then(function () { call(); }).catch(function () { call(); });
      } else {
        // no init called; attempt to auto-init if global key exists
        if (window.MPARTICLE_API_KEY) {
          try { this.init(window.MPARTICLE_API_KEY, this._opts).then(function () { call(); }).catch(function () { call(); }); } catch (e) { call(); }
        } else {
          // don't block — just call which will queue into snippet if present
          call();
        }
      }
    },

    // Higher-level helpers
    trackLoginAttempt: function (opts) {
      // opts: { userId, method: 'default'|'multipass'|'multipass-redirect', success: true/false, reason }
      opts = opts || {};
      var method = opts.method || 'default';
      var success = !!opts.success;
      var eventName = success ? 'customer_login_success' : 'customer_login_fail';
      var attrs = {
        userId: opts.userId || null,
        loginMethod: method,
        loginSuccess: success,
        loginReason: opts.reason || null
      };
      this.logEvent(eventName, attrs, (window.mParticle && window.mParticle.EventType && window.mParticle.EventType.Other) || 8);
    },

    trackLoginSuccess: function (opts) { opts = opts || {}; opts.success = true; return this.trackLoginAttempt(opts); },
    trackLoginFail: function (opts) { opts = opts || {}; opts.success = false; return this.trackLoginAttempt(opts); },

    trackAccountEvent: function (action, attrs) {
      // action e.g., 'account_created', 'account_updated'
      attrs = attrs || {};
      this.logEvent(action, attrs);
    },

    // product view / cart
    trackProductView: function (product) {
      // product: { id, sku, name, price, category }
      var attrs = Object.assign({}, product || {});
      this.logEvent('product_view', attrs, (window.mParticle && window.mParticle.EventType && window.mParticle.EventType.Transaction) || 4);
    },

    trackAddToCart: function (product) {
      var attrs = Object.assign({}, product || {});
      this.logEvent('add_to_cart', attrs, (window.mParticle && window.mParticle.EventType && window.mParticle.EventType.Transaction) || 4);
    },

    // expose collect function for custom pixel or other calls that want the auto attributes
    collectAutoAttributes: function () { return _collectAutoAttributes(); },

    // convenience for identifying / setting user identities
    identifyUser: function (userIdentities) {
      if (!userIdentities) return;
      var call = function () {
        try {
          if (window.mParticle && window.mParticle.Identity && window.mParticle.Identity.identify) {
            window.mParticle.Identity.identify({ userIdentities: userIdentities });
          } else if (window.mParticle && window.mParticle.config && Array.isArray(window.mParticle.config.rq)) {
            window.mParticle.config.rq.push(['Identity.identify', { userIdentities: userIdentities }]);
          }
        } catch (e) { console.error('[ShopifyMPAnalytics] identify failed', e); }
      };
      if (this._sdkReady) this._sdkReady.then(call).catch(call);
      else if (window.MPARTICLE_API_KEY) this.init(window.MPARTICLE_API_KEY, this._opts).then(call).catch(call);
      else call();
    }
  };

  // attach to window
  window[NAMESPACE] = API;

  // Auto init if key present on window before script load
  try {
    if (window.MPARTICLE_API_KEY) {
      API.init(window.MPARTICLE_API_KEY, window.MPARTICLE_OPTIONS || {});
    }
  } catch (e) {
    // ignore
  }

  // Small compatibility shim so custom pixel calls can be short
  // e.g., if other code calls window.logMParticleEvent -> proxy to ShopifyMPAnalytics.logEvent
  window.logMParticleEvent = function (name, attrs, type) { try { window[NAMESPACE].logEvent(name, attrs, type); } catch (e) {} };

})(window, document);
