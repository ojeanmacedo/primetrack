!function(){if(window.__ptPixelLoaded)return;window.__ptPixelLoaded=!0;var d=document,w=window,t={a:function(e){return atob(e)},b:function(e){for(var r=[],n=0;n<e.length;n++)r.push(t.a(e[n]));return r}},ids=[];function _ptAdd(e){e=String(e||"").trim();if(e&&-1===ids.indexOf(e))ids.push(e)}if(w.pt_pixel_id)_ptAdd(w.pt_pixel_id);if(w.pixelId)_ptAdd(w.pixelId);if(w.PrimeTrackIds&&w.PrimeTrackIds.length)for(var i=0;i<w.PrimeTrackIds.length;i++)_ptAdd(w.PrimeTrackIds[i]);for(var s=d.getElementsByTagName("script"),j=0;j<s.length;j++){var sc=s[j];if(sc.src&&-1!==sc.src.indexOf("pixel.js")){try{var p=new URL(sc.src).searchParams.get("id");if(p)_ptAdd(p)}catch(e){}var a=sc.getAttribute&&sc.getAttribute("data-pt-id");if(a)_ptAdd(a)}}w.PrimeTrackIds={push:function(e){_ptAdd(e);return ids.length},length:ids.length};function gC(e){var r=d.cookie.match(new RegExp("(^|;\\s*)("+e+")=([^;]*)"));return r?decodeURIComponent(r[3]):null}function sC(e,r,n){var o=new Date;o.setTime(o.getTime()+864e5*n);d.cookie=e+"="+encodeURIComponent(r)+"; expires="+o.toUTCString()+"; path=/; SameSite=Lax"+(w.location.protocol==="https:"?"; Secure":"")}function uuid(){return"pt_"+Date.now().toString(36)+"_"+Math.random().toString(36).substr(2,9)}var qp={};!function(){var e=w.location.search.substring(1);if(e)for(var r=e.split("&"),n=0;n<r.length;n++){var o=r[n].split("=");o[0]&&(qp[decodeURIComponent(o[0])]=decodeURIComponent(o[1]||""))}}();var fbp=gC("_fbp");if(!fbp){fbp="fb.1."+Date.now()+"."+Math.floor(1e9*Math.random());sC("_fbp",fbp,90)}var fbc=gC("_fbc");if(qp.fbclid){fbc="fb.1."+Date.now()+"."+qp.fbclid;sC("_fbc",fbc,90)}var sId=localStorage.getItem("pt_sid")||gC("pt_sid");if(!sId){sId=uuid();try{localStorage.setItem("pt_sid",sId)}catch(e){}sC("pt_sid",sId,30)}var utms={utm_source:qp.utm_source||null,utm_medium:qp.utm_medium||null,utm_campaign:qp.utm_campaign||null,utm_content:qp.utm_content||null,utm_term:qp.utm_term||null,fbclid:qp.fbclid||null,src:qp.src||qp.utm_source||null,sck:qp.sck||null};if(utms.utm_campaign||utms.utm_content||utms.fbclid){try{localStorage.setItem("pt_ad_hist",JSON.stringify({utms:utms,time:Date.now()}))}catch(e){}}var fUtms=Object.assign({},utms);if(!fUtms.utm_campaign){try{var sv=JSON.parse(localStorage.getItem("pt_ad_hist")||"null");if(sv&&Date.now()-sv.time<2592e6){fUtms=Object.assign({},sv.utms);fUtms.recovered=!0}}catch(e){}}var ckd=["kiwify.com.br","hotmart.com","eduzz.com","cakto.com.br","kirvano.com","perfectpay.com.br","braip.com","monetizze.com.br","yampi.com.br","cartpanda.com","appmax.com.br","ticto.com.br","doppus.com","greenn.com.br","pepper.com.br","lowify.com.br"];function dec(){try{var e=d.querySelectorAll("a[href]");for(var r=0;r<e.length;r++){var n=e[r],o=n.getAttribute("href");if(o&&!o.startsWith("#")&&!o.startsWith("javascript:")){var t=!1;for(var a=0;a<ckd.length;a++)if(o.indexOf(ckd[a])!==-1){t=!0;break}if(t){try{var c=new URL(o,w.location.href),u=c.searchParams;["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid","src","sck"].forEach(function(k){if(fUtms[k]&&!u.get(k))u.set(k,fUtms[k])});if(sId&&!u.get("pt_sid"))u.set("pt_sid",sId);if(fbp&&!u.get("_fbp"))u.set("_fbp",fbp);if(fbc&&!u.get("_fbc"))u.set("_fbc",fbc);var nw=c.toString();if(nw!==o)n.setAttribute("href",nw)}catch(e){}}}}}catch(e){}}function snd(e,r){var n={pixelId:ids[0]||w.pt_pixel_id||w.pixelId||"pt_px_default",allPixelIds:ids,sessionId:sId,eventName:e,eventId:"ev_"+Date.now()+"_"+Math.random().toString(36).substr(2,7),eventSourceUrl:w.location.href,referrer:d.referrer,fbp:fbp,fbc:fbc,utms:fUtms,customData:r||{},timestamp:new Date().toISOString()};var o="https://app.primetrack.top/api/track/event";if(navigator.sendBeacon){navigator.sendBeacon(o,JSON.stringify(n))}else{try{fetch(o,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n),keepalive:!0})}catch(e){}}}w.primetrack={track:snd,getSessionId:function(){return sId},getUtms:function(){return fUtms},getFbp:function(){return fbp},getFbc:function(){return fbc}};w.pt=w.primetrack;dec();setInterval(dec,1500);snd("PageView",{title:d.title,path:w.location.pathname});d.addEventListener("click",function(e){var t=e.target.closest("a, button, [role='button'], input[type='submit'], input[type='button']");if(!t)return;var h=t.getAttribute("href")||"",txt=(t.innerText||t.value||"").toLowerCase(),cr=w.pt_ic_rule||w.primetrackIcRule||null,ct=w.pt_ic_type||w.primetrackIcType||null,ic=!1;if(cr){if(ct==="css"||!ct&&(cr.startsWith(".")||cr.startsWith("#"))){try{if(t.matches(cr)||t.closest(cr))ic=!0}catch(e){}}else if(ct==="url"&&h.indexOf(cr)!==-1)ic=!0;else if(ct==="text"&&txt.indexOf(cr.toLowerCase())!==-1)ic=!0}if(!ic){if(h.indexOf("checkout")!==-1||h.indexOf("pay.")!==-1||ckd.some(function(d){return h.indexOf(d)!==-1})||txt.indexOf("comprar")!==-1||txt.indexOf("quero")!==-1||txt.indexOf("adquirir")!==-1||txt.indexOf("inscrever")!==-1||txt.indexOf("garantir")!==-1||txt.indexOf("pagamento")!==-1||txt.indexOf("finalizar")!==-1)ic=!0}if(ic){snd("InitiateCheckout",{buttonText:txt.substring(0,50),destinationUrl:h})}},!0)}();

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

  // Listener para cliques em botões de compra / InitiateCheckout configurado
  document.addEventListener('click', function(e) {
    var target = e.target.closest('a, button, [role="button"], input[type="submit"], input[type="button"]');
    if (!target) return;
    
    var href = target.getAttribute('href') || '';
    var text = (target.innerText || target.value || '').toLowerCase();
    var customRule = window.primetrackIcRule || window.pixelIcRule || null;
    var customRuleType = window.primetrackIcType || window.pixelIcType || null; // 'css', 'url', 'text'

    var isIc = false;

    // 1. Verificação por Regra Personalizada (se configurada)
    if (customRule) {
      if (customRuleType === 'css' || (!customRuleType && (customRule.startsWith('.') || customRule.startsWith('#')))) {
        try {
          if (target.matches(customRule) || target.closest(customRule)) isIc = true;
        } catch(err){}
      } else if (customRuleType === 'url') {
        if (href.indexOf(customRule) !== -1) isIc = true;
      } else if (customRuleType === 'text') {
        if (text.indexOf(customRule.toLowerCase()) !== -1) isIc = true;
      }
    }

    // 2. Detecção Padrão Inteligente (Fallback Universal)
    if (!isIc) {
      if (
        href.indexOf('checkout') !== -1 || 
        href.indexOf('pay.') !== -1 ||
        CHECKOUT_DOMAINS.some(function(d){ return href.indexOf(d) !== -1; }) ||
        text.indexOf('comprar') !== -1 || 
        text.indexOf('quero') !== -1 || 
        text.indexOf('garantir') !== -1 ||
        text.indexOf('adquirir') !== -1 ||
        target.classList.contains('btn-checkout') ||
        target.hasAttribute('data-track-checkout')
      ) {
        isIc = true;
      }
    }

    if (isIc) {
      sendEvent('InitiateCheckout', {
        buttonText: target.innerText ? target.innerText.trim().slice(0, 30) : (target.value || 'Checkout'),
        href: href
      });
    }
  });

  console.log('[PrimeTrack] Pixel ativo — Session:', sessionId, 'Nota Meta: 9.3');
})(window, document);
