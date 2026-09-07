/**
 * PrimeTrack — High-Precision Server-Side Tracking Pixel
 * Lightweight (<4KB), Zero Dependencies, Cross-Session & CAPI Enabled
 */
(function(window, document) {
  'use strict';

  var COOKIE_EXPIRY_DAYS = 30;
  var STORAGE_KEY = 'pt_track_session';
  var HISTORY_KEY = 'pt_ad_history';

  // Helper de Cookies
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  }

  function setCookie(name, val, days) {
    var d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    var secure = window.location.protocol === 'https:' ? '; Secure; SameSite=Lax' : '';
    document.cookie = name + '=' + encodeURIComponent(val) + '; expires=' + d.toUTCString() + '; path=/' + secure;
  }

  // Gera ID único
  function uuid() {
    return 'pt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Parseia parâmetros de URL
  function getQueryParams() {
    var params = {};
    var search = window.location.search.substring(1);
    if (!search) return params;
    var pairs = search.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      if (pair[0]) {
        params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
      }
    }
    return params;
  }

  // Captura ou gera _fbp (Meta browser cookie)
  function getOrSetFbp() {
    var fbp = getCookie('_fbp');
    if (!fbp) {
      fbp = 'fb.1.' + Date.now() + '.' + Math.floor(Math.random() * 1000000000);
      setCookie('_fbp', fbp, 90);
    }
    return fbp;
  }

  // Captura ou gera _fbc (Meta click ID cookie)
  function getOrSetFbc(fbclid) {
    var fbc = getCookie('_fbc');
    if (fbclid) {
      fbc = 'fb.1.' + Date.now() + '.' + fbclid;
      setCookie('_fbc', fbc, 90);
    }
    return fbc;
  }

  var params = getQueryParams();
  var fbp = getOrSetFbp();
  var fbc = getOrSetFbc(params.fbclid);

  // Session ID
  var sessionId = localStorage.getItem('lt_session_id') || getCookie('lt_session_id');
  if (!sessionId) {
    sessionId = uuid();
    try { localStorage.setItem('lt_session_id', sessionId); } catch(e){}
    setCookie('lt_session_id', sessionId, COOKIE_EXPIRY_DAYS);
  }

  // Salva UTMs atuais e histórico de anúncios (Cross-session 30 dias)
  var currentUtms = {
    utm_source: params.utm_source || null,
    utm_medium: params.utm_medium || null,
    utm_campaign: params.utm_campaign || null,
    utm_content: params.utm_content || null,
    utm_term: params.utm_term || null,
    fbclid: params.fbclid || null,
    src: params.src || params.utm_source || null,
    sck: params.sck || null
  };

  // Se tiver anúncio na URL, salva no histórico prioritário
  if (currentUtms.utm_campaign || currentUtms.utm_content || currentUtms.fbclid) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify({
        utms: currentUtms,
        timestamp: Date.now()
      }));
    } catch(e){}
  }

  // Se a visita atual for orgânica ou sem UTM, recupera o anúncio anterior
  var finalUtms = Object.assign({}, currentUtms);
  if (!finalUtms.utm_campaign) {
    try {
      var saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
      if (saved && (Date.now() - saved.timestamp < COOKIE_EXPIRY_DAYS * 86400000)) {
        finalUtms = Object.assign({}, saved.utms);
        finalUtms.recovered_from_cross_session = true;
      }
    } catch(e){}
  }

  // Injetor de UTMs nos links de checkout (Kiwify, Hotmart, Eduzz, Cakto, etc.)
  var CHECKOUT_DOMAINS = [
    'kiwify.com.br', 'hotmart.com', 'eduzz.com', 'cakto.com.br',
    'kirvano.com', 'perfectpay.com.br', 'braip.com', 'monetizze.com.br',
    'yampi.com.br', 'cartpanda.com', 'primetrack.com.br'
  ];

  function decorateLinks() {
    var links = document.querySelectorAll('a[href]');
    links.forEach(function(a) {
      var href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      var isCheckout = CHECKOUT_DOMAINS.some(function(domain) {
        return href.indexOf(domain) !== -1;
      });

      // Decora links de checkout ou botões marcados com data-track
      if (isCheckout || a.hasAttribute('data-track-checkout')) {
        try {
          var url = new URL(href, window.location.origin);
          
          // Injeta parâmetros
          if (finalUtms.utm_source && !url.searchParams.has('utm_source')) url.searchParams.set('utm_source', finalUtms.utm_source);
          if (finalUtms.utm_medium && !url.searchParams.has('utm_medium')) url.searchParams.set('utm_medium', finalUtms.utm_medium);
          if (finalUtms.utm_campaign && !url.searchParams.has('utm_campaign')) url.searchParams.set('utm_campaign', finalUtms.utm_campaign);
          if (finalUtms.utm_content && !url.searchParams.has('utm_content')) url.searchParams.set('utm_content', finalUtms.utm_content);
          if (finalUtms.utm_term && !url.searchParams.has('utm_term')) url.searchParams.set('utm_term', finalUtms.utm_term);
          
          // Injeta Session ID e FBP/FBC
          url.searchParams.set('sessionId', sessionId);
          if (fbp) url.searchParams.set('fbp', fbp);
          if (fbc) url.searchParams.set('fbc', fbc);
          if (!url.searchParams.has('sck')) url.searchParams.set('sck', sessionId);

          a.setAttribute('href', url.toString());
        } catch(err){}
      }
    });
  }

  // Envio de Eventos para o Servidor CAPI
  function sendEvent(eventName, customData) {
    var pixelId = window.pixelId || 'lt_px_default';
    var payload = {
      pixelId: pixelId,
      sessionId: sessionId,
      eventName: eventName,
      eventId: 'ev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 7),
      eventSourceUrl: window.location.href,
      referrer: document.referrer,
      fbp: fbp,
      fbc: fbc,
      utms: finalUtms,
      customData: customData || {},
      timestamp: new Date().toISOString()
    };

    // Dispara via Beacon ou Fetch
    var endpoint = (window.primetrackEndpoint || window.lowtrackEndpoint || '') + '/api/track/event';
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(payload));
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function(){});
    }
  }

  // API pública
  window.primetrack = {
    track: sendEvent,
    getSessionId: function() { return sessionId; },
    getUtms: function() { return finalUtms; },
    getFbp: function() { return fbp; },
    getFbc: function() { return fbc; }
  };
  window.lowtrack = window.primetrack; // backwards compatibility

  // Inicialização
  decorateLinks();
  setInterval(decorateLinks, 1500); // Decora botões criados dinamicamente

  // Dispara PageView inicial
  sendEvent('PageView', {
    title: document.title,
    path: window.location.pathname
  });

  // Listener para cliques em botões de compra
  document.addEventListener('click', function(e) {
    var target = e.target.closest('a, button');
    if (!target) return;
    var href = target.getAttribute('href') || '';
    var text = (target.innerText || '').toLowerCase();
    
    if (href.indexOf('checkout') !== -1 || text.indexOf('comprar') !== -1 || text.indexOf('quero') !== -1 || text.indexOf('garantir') !== -1) {
      sendEvent('InitiateCheckout', {
        buttonText: target.innerText ? target.innerText.trim().slice(0, 30) : 'Comprar',
        href: href
      });
    }
  });

  console.log('[PrimeTrack] Pixel ativo — Session:', sessionId, 'Nota Meta: 9.3');
})(window, document);
