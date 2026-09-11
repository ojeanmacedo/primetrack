/**
 * PrimeTrack Intelligent Client Pixel v2.1
 * Rastreamento Server-Side CAPI, Atribuição Cross-Session de UTMs e Detecção Automática de Checkout
 */
(function() {
  if (window.__ptPixelLoaded) return;
  window.__ptPixelLoaded = true;

  var pixelIds = [];
  function addPixelId(id) {
    if (!id) return;
    id = String(id).trim();
    if (id && pixelIds.indexOf(id) === -1) pixelIds.push(id);
  }

  if (window.pixelId) addPixelId(window.pixelId);
  if (window.pt_pixel_id) addPixelId(window.pt_pixel_id);
  if (window.PrimeTrackIds && Array.isArray(window.PrimeTrackIds)) {
    for (var i = 0; i < window.PrimeTrackIds.length; i++) addPixelId(window.PrimeTrackIds[i]);
  }

  // Detecta pixelId em tags <script>
  var scripts = document.getElementsByTagName('script');
  for (var s = 0; s < scripts.length; s++) {
    var src = scripts[s].src || '';
    if (src && src.indexOf('pixel.js') !== -1) {
      try {
        var pId = new URL(src, window.location.href).searchParams.get('id');
        if (pId) addPixelId(pId);
      } catch (e) {}
      var attrId = scripts[s].getAttribute('data-pt-id') || scripts[s].getAttribute('data-pixel-id');
      if (attrId) addPixelId(attrId);
    }
  }

  window.PrimeTrackIds = {
    push: function(id) {
      addPixelId(id);
      return pixelIds.length;
    },
    length: pixelIds.length
  };

  // Base API URL
  var API_BASE = 'https://app.primetrack.top';
  try {
    var currentScript = document.currentScript;
    if (currentScript && currentScript.src) {
      var scriptUrl = new URL(currentScript.src);
      if (scriptUrl.origin && !scriptUrl.origin.includes('localhost')) {
        API_BASE = scriptUrl.origin;
      }
    }
  } catch (e) {}

  var TRACK_EVENT_URL = API_BASE + '/api/track/event';
  var CONFIG_URL = API_BASE + '/api/pixel/config';

  // Checkout keywords para detecção inteligente
  var CHECKOUT_PATTERNS = [
    'checkout', 'pagamento', 'payment', 'monsterpay', 'kiwify', 'hotmart',
    'eduzz', 'monetizze', 'braip', 'cakto', 'kirvano', 'perfectpay',
    'comprar', 'finalizar', 'compra', 'cart', 'carrinho', 'pedido', 'order'
  ];

  var BUTTON_TEXT_PATTERNS = [
    'comprar', 'finalizar', 'compra', 'confirmar', 'quero ter', 'próximo passo',
    'proximo passo', 'inscrição', 'inscricao', 'participar', 'participe',
    'quero participar', 'checkout', 'buy now', 'purchase', 'adquirir',
    'garantir', 'quero', 'assinar', 'contratar', 'começar', 'iniciar'
  ];

  var configuredIcType = 'css';
  var configuredIcRule = null;
  var lastIcTime = 0;
  var metaPixelIdsList = [];

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + (days * 86400000));
    var secure = window.location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax' + secure;
  }

  function getFbp() {
    var fbp = getCookie('_fbp');
    if (fbp) return fbp;
    fbp = 'fb.1.' + Date.now() + '.' + Math.floor(Math.random() * 2147483647);
    setCookie('_fbp', fbp, 90);
    return fbp;
  }

  function getFbc() {
    var fbc = getCookie('_fbc');
    if (fbc) return fbc;
    var fbclid = new URLSearchParams(window.location.search).get('fbclid');
    if (fbclid) {
      fbc = 'fb.1.' + Date.now() + '.' + fbclid;
      setCookie('_fbc', fbc, 90);
      return fbc;
    }
    return '';
  }

  function getUtms() {
    var params = new URLSearchParams(window.location.search);
    var utms = {
      utm_source: params.get('utm_source') || params.get('src') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
      utm_term: params.get('utm_term') || '',
      fbclid: params.get('fbclid') || '',
      src: params.get('src') || params.get('utm_source') || '',
      sck: params.get('sck') || '',
      pt_meta_pixel: params.get('pt_meta_pixel') || params.get('meta_pixel') || params.get('pixel') || ''
    };

    // Se a página não tem UTMs na URL, recupera do histórico de navegação local (30 dias)
    if (!utms.utm_campaign) {
      try {
        var saved = JSON.parse(localStorage.getItem('pt_ad_hist') || 'null');
        if (saved && (Date.now() - saved.time < 30 * 86400000)) {
          utms = Object.assign({}, saved.utms);
        }
      } catch (e) {}
    }

    if (utms.utm_campaign || utms.utm_content || utms.fbclid) {
      try {
        localStorage.setItem('pt_ad_hist', JSON.stringify({ utms: utms, time: Date.now() }));
      } catch (e) {}
    }

    return utms;
  }

  function getOrCreateClickId() {
    var clickId = getCookie('_pt_click_id');
    if (!clickId) {
      clickId = 'pt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
      setCookie('_pt_click_id', clickId, 30);
    }
    return clickId;
  }

  function sendEvent(payload, callback) {
    var data = JSON.stringify(payload);
    if (typeof fetch === 'function') {
      fetch(TRACK_EVENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
        credentials: 'omit',
        mode: 'cors'
      }).then(function() { if (callback) callback(); }).catch(function() { if (callback) callback(); });
      return;
    }

    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(TRACK_EVENT_URL, blob);
        if (callback) callback();
        return;
      } catch (e) {}
    }

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', TRACK_EVENT_URL, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && callback) callback();
      };
      xhr.send(data);
    } catch (e) {
      if (callback) callback();
    }
  }

  // Disparo de InitiateCheckout
  function trackInitiateCheckout(callback) {
    var now = Date.now();
    if (now - lastIcTime < 1200) {
      if (callback) callback();
      return;
    }
    lastIcTime = now;

    var clickId = getOrCreateClickId();
    var utms = getUtms();
    var fbp = getFbp();
    var fbc = getFbc();

    var targetPixels = pixelIds.length > 0 ? pixelIds : ['pt_px_default'];
    var icEventId = 'ev_ic_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    for (var i = 0; i < targetPixels.length; i++) {
      sendEvent({
        pixel_id: targetPixels[i],
        click_id: clickId,
        event_name: 'InitiateCheckout',
        event_id: icEventId,
        page: window.location.href,
        referrer: document.referrer || '',
        fbp: fbp,
        fbc: fbc,
        utm_source: utms.utm_source,
        utm_medium: utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        utm_content: utms.utm_content,
        utm_term: utms.utm_term,
        fbclid: utms.fbclid,
        src: utms.src,
        sck: utms.sck
      });
    }

    if (window.fbq && metaPixelIdsList.length > 0) {
      for (var m = 0; m < metaPixelIdsList.length; m++) {
        try {
          window.fbq('trackSingle', metaPixelIdsList[m], 'InitiateCheckout', {}, { eventID: icEventId });
        } catch (e) {
          try { window.fbq('track', 'InitiateCheckout', {}, { eventID: icEventId }); } catch (err) {}
        }
      }
    }

    if (callback) setTimeout(callback, 150);
  }

  // Verifica se um link aponta para checkout
  function isCheckoutUrl(url) {
    if (!url) return false;
    try { url = decodeURIComponent(url); } catch (e) {}
    url = url.toLowerCase();
    for (var i = 0; i < CHECKOUT_PATTERNS.length; i++) {
      if (url.indexOf(CHECKOUT_PATTERNS[i]) !== -1) return true;
    }
    return false;
  }

  // Verifica se o elemento clicado corresponde ao botão de compra
  function isPurchaseElement(el) {
    if (!el || el.nodeType !== 1) return false;

    // 1. Checagem do Seletor CSS configurado no PrimeTrack (ex: .btn-checkout, #comprar)
    if (configuredIcRule) {
      try {
        var rule = configuredIcRule.trim();
        if (rule) {
          // Se não começa com . ou #, adiciona . por padrão
          var cssSel = (rule.startsWith('.') || rule.startsWith('#')) ? rule : ('.' + rule);
          if (el.matches && (el.matches(cssSel) || el.closest(cssSel))) return true;
          if (el.matches && (el.matches(rule) || el.closest(rule))) return true;
        }
      } catch (e) {}
    }

    // 2. Checagem de Tag <a> com link para MonsterPay / Checkout
    var current = el;
    for (var d = 0; d < 8 && current && current !== document.body; d++) {
      if (current.tagName === 'A') {
        var href = current.getAttribute('href') || '';
        if (href && !href.startsWith('#') && !href.startsWith('javascript:') && isCheckoutUrl(href)) {
          return true;
        }
      }
      current = current.parentElement;
    }

    // 3. Checagem do texto do botão
    var txt = (el.innerText || el.value || '').trim().toLowerCase();
    if (txt && txt.length <= 60) {
      for (var b = 0; b < BUTTON_TEXT_PATTERNS.length; b++) {
        if (txt.indexOf(BUTTON_TEXT_PATTERNS[b]) !== -1) return true;
      }
    }

    return false;
  }

  // Injeta automaticamente UTMs e pt_sid em todos os links de checkout da página
  function injectParametersIntoCheckoutLinks() {
    try {
      var links = document.querySelectorAll('a[href]');
      var utms = getUtms();
      var clickId = getOrCreateClickId();
      var fbp = getFbp();
      var fbc = getFbc();

      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        var href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          continue;
        }

        var isConfiguredTarget = false;
        if (configuredIcRule) {
          try {
            var rule = configuredIcRule.trim();
            var cssSel = (rule.startsWith('.') || rule.startsWith('#')) ? rule : ('.' + rule);
            if (link.matches && (link.matches(cssSel) || link.closest(cssSel))) {
              isConfiguredTarget = true;
            }
          } catch (e) {}
        }

        if (isCheckoutUrl(href) || isConfiguredTarget) {
          try {
            var urlObj = new URL(href, window.location.href);
            ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'src', 'sck', 'pt_meta_pixel'].forEach(function(key) {
              if (utms[key] && !urlObj.searchParams.get(key)) {
                urlObj.searchParams.set(key, utms[key]);
              }
            });

            if (clickId && !urlObj.searchParams.get('pt_sid')) {
              urlObj.searchParams.set('pt_sid', clickId);
            }
            if (fbp && !urlObj.searchParams.get('_fbp')) {
              urlObj.searchParams.set('_fbp', fbp);
            }
            if (fbc && !urlObj.searchParams.get('_fbc')) {
              urlObj.searchParams.set('_fbc', fbc);
            }
            var currentPx = (pixelIds && pixelIds.length > 0) ? pixelIds[0] : (initialPixels && initialPixels[0]);
            if (currentPx && !urlObj.searchParams.get('pt_pixel_id')) {
              urlObj.searchParams.set('pt_pixel_id', currentPx);
            }

            var newUrl = urlObj.toString();
            if (newUrl !== href) {
              link.setAttribute('href', newUrl);
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  // Interceptadores de eventos de clique
  function handleElementInteraction(e) {
    var path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    if (path && path.length) {
      for (var p = 0; p < path.length && p < 10; p++) {
        var node = path[p];
        if (node && node.nodeType === 1 && isPurchaseElement(node)) {
          trackInitiateCheckout();
          return;
        }
      }
    }

    var target = e.target;
    if (target && isPurchaseElement(target)) {
      trackInitiateCheckout();
      return;
    }
  }

  document.addEventListener('click', handleElementInteraction, true);
  document.addEventListener('pointerdown', handleElementInteraction, true);
  document.addEventListener('touchstart', handleElementInteraction, true);

  // Intercepta window.open
  var originalOpen = window.open;
  window.open = function(url, name, features) {
    if (url && isCheckoutUrl(url.toString())) {
      trackInitiateCheckout(function() {
        originalOpen.call(window, url, name || '', features || '');
      });
      return null;
    }
    return originalOpen.call(window, url, name || '', features || '');
  };

  // Inicializa Meta Pixel CAPI se metaPixelId fornecido
  function initFbq(fbId) {
    if (!fbId || !/^\d{10,25}$/.test(String(fbId))) return;
    try {
      var strFbId = String(fbId);
      if (metaPixelIdsList.indexOf(strFbId) === -1) {
        metaPixelIdsList.push(strFbId);
      }
      var w = window, d = document, s = 'script';
      if (!w.fbq) {
        var fb = w.fbq = function() {
          fb.callMethod ? fb.callMethod.apply(fb, arguments) : fb.queue.push(arguments);
        };
        if (!w._fbq) w._fbq = fb;
        fb.push = fb;
        fb.loaded = true;
        fb.version = '2.0';
        fb.queue = [];
        var el = d.createElement(s);
        el.async = true;
        el.src = 'https://connect.facebook.net/en_US/fbevents.js';
        var firstScript = d.getElementsByTagName(s)[0];
        firstScript.parentNode.insertBefore(el, firstScript);
      }
      w.fbq('init', strFbId);
      w.fbq('trackSingle', strFbId, 'PageView', {}, { eventID: pvEventId });
    } catch (e) {}
  }

  // Dispara PageView imediatamente ao carregar
  var clickId = getOrCreateClickId();
  var utms = getUtms();
  var fbp = getFbp();
  var fbc = getFbc();
  var pvEventId = 'ev_pv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  var initialPixels = pixelIds.length > 0 ? pixelIds : ['pt_px_default'];
  for (var p = 0; p < initialPixels.length; p++) {
    sendEvent({
      pixel_id: initialPixels[p],
      click_id: clickId,
      event_name: 'PageView',
      event_id: pvEventId,
      page: window.location.href,
      referrer: document.referrer || '',
      fbp: fbp,
      fbc: fbc,
      utm_source: utms.utm_source,
      utm_medium: utms.utm_medium,
      utm_campaign: utms.utm_campaign,
      utm_content: utms.utm_content,
      utm_term: utms.utm_term,
      fbclid: utms.fbclid,
      src: utms.src,
      sck: utms.sck
    });
  }

  // Carrega configurações dos pixels criados (Meta Pixel ID e Seletor CSS do botão)
  for (var k = 0; k < initialPixels.length; k++) {
    (function(pxId) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', CONFIG_URL + '?id=' + encodeURIComponent(pxId), true);
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4 && xhr.status === 200) {
            try {
              var cfg = JSON.parse(xhr.responseText);
              if (cfg.icRule) configuredIcRule = cfg.icRule;
              if (cfg.icType) configuredIcType = cfg.icType;
              if (Array.isArray(cfg.metaPixelIds) && cfg.metaPixelIds.length > 0) {
                for (var m = 0; m < cfg.metaPixelIds.length; m++) {
                  initFbq(cfg.metaPixelIds[m]);
                }
              } else if (cfg.metaPixelId) {
                initFbq(cfg.metaPixelId);
              }
            } catch (e) {}
            injectParametersIntoCheckoutLinks();
          }
        };
        xhr.send();
      } catch (e) {}
    })(initialPixels[k]);
  }

  // Garante injeção contínua nos botões
  if (document.readyState === 'complete') {
    injectParametersIntoCheckoutLinks();
  } else {
    window.addEventListener('load', injectParametersIntoCheckoutLinks);
  }
  setInterval(injectParametersIntoCheckoutLinks, 2000);

  // Métodos globais
  window.PrimeTrack = {
    getClickId: getOrCreateClickId,
    getUtms: getUtms,
    getFbp: getFbp,
    getFbc: getFbc,
    trackIC: function(cb) { trackInitiateCheckout(cb); },
    getPixelIds: function() { return pixelIds.slice(); }
  };
})();