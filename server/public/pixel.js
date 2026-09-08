!function(){
  if(window.__ptPixelLoaded)return;
  window.__ptPixelLoaded=!0;
  var d=document,w=window;
  var ids=[];
  var metaIds=[];

  function _ptAdd(e){
    e=String(e||"").trim();
    if(!e)return;
    if(/^\d{10,20}$/.test(e)){
      if(metaIds.indexOf(e)===-1)metaIds.push(e);
    }
    if(ids.indexOf(e)===-1)ids.push(e);
  }

  function _metaAdd(e){
    e=String(e||"").trim();
    if(e&&metaIds.indexOf(e)===-1)metaIds.push(e);
  }

  if(w.pt_pixel_id)_ptAdd(w.pt_pixel_id);
  if(w.pixelId)_ptAdd(w.pixelId);
  if(w.metaPixelId)_metaAdd(w.metaPixelId);
  if(w.pt_meta_id)_metaAdd(w.pt_meta_id);

  if(w.PrimeTrackIds&&w.PrimeTrackIds.length){
    for(var i=0;i<w.PrimeTrackIds.length;i++)_ptAdd(w.PrimeTrackIds[i]);
  }

  for(var s=d.getElementsByTagName("script"),j=0;j<s.length;j++){
    var sc=s[j];
    if(sc.src&&sc.src.indexOf("pixel.js")!==-1){
      try{
        var p=new URL(sc.src,w.location.href).searchParams.get("id");
        if(p)_ptAdd(p);
        var mp=new URL(sc.src,w.location.href).searchParams.get("meta_id");
        if(mp)_metaAdd(mp);
      }catch(e){}
      var a=sc.getAttribute&&sc.getAttribute("data-pt-id");
      if(a)_ptAdd(a);
      var m=sc.getAttribute&&sc.getAttribute("data-meta-id");
      if(m)_metaAdd(m);
    }
  }

  w.PrimeTrackIds={push:function(e){_ptAdd(e);return ids.length},length:ids.length};

  // Inicializa Meta Pixel fbq no DOM para a extensão Facebook Pixel Helper detectar
  function initMetaFbq(){
    if(!metaIds.length)return;
    if(!w.fbq){
      !function(f,b,e,v,n,t,s){
        if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)
      }(w,d,'script','https://connect.facebook.net/en_US/fbevents.js');
    }
    for(var k=0;k<metaIds.length;k++){
      try{w.fbq('init',metaIds[k]);}catch(e){}
    }
  }
  initMetaFbq();

  // Se nenhum metaId estiver declarado inline, busca dinamicamente a configuração no PrimeTrack
  var primaryId = ids[0] || w.pt_pixel_id || w.pixelId;
  if(primaryId && !metaIds.length){
    try{
      fetch("https://app.primetrack.top/api/pixel/config?id=" + encodeURIComponent(primaryId))
        .then(function(res){ return res.json(); })
        .then(function(cfg){
          if(cfg && cfg.metaPixelId){
            _metaAdd(cfg.metaPixelId);
            initMetaFbq();
            if(w.fbq){
              try{
                w.fbq('track', 'PageView', { title: d.title, path: w.location.pathname }, { eventID: "ev_pv_" + Date.now() });
              }catch(e){}
            }
          }
          if(cfg && cfg.icRule && !w.pt_ic_rule){
            w.pt_ic_rule = cfg.icRule;
            w.pt_ic_type = cfg.icType || 'css';
          }
        }).catch(function(){});
    }catch(e){}
  }

  function gC(e){
    var r=d.cookie.match(new RegExp("(^|;\\s*)("+e+")=([^;]*)"));
    return r?decodeURIComponent(r[3]):null;
  }

  function sC(e,r,n){
    var o=new Date;
    o.setTime(o.getTime()+864e5*n);
    d.cookie=e+"="+encodeURIComponent(r)+"; expires="+o.toUTCString()+"; path=/; SameSite=Lax"+(w.location.protocol==="https:"?"; Secure":"");
  }

  function uuid(){
    return"pt_"+Date.now().toString(36)+"_"+Math.random().toString(36).substr(2,9);
  }

  var qp={};
  !function(){
    var e=w.location.search.substring(1);
    if(e){
      for(var r=e.split("&"),n=0;n<r.length;n++){
        var o=r[n].split("=");
        if(o[0])qp[decodeURIComponent(o[0])]=decodeURIComponent(o[1]||"");
      }
    }
  }();

  var fbp=gC("_fbp");
  if(!fbp){
    fbp="fb.1."+Date.now()+"."+Math.floor(1e9*Math.random());
    sC("_fbp",fbp,90);
  }

  var fbc=gC("_fbc");
  if(qp.fbclid){
    fbc="fb.1."+Date.now()+"."+qp.fbclid;
    sC("_fbc",fbc,90);
  }

  var sId=localStorage.getItem("pt_sid")||gC("pt_sid");
  if(!sId){
    sId=uuid();
    try{localStorage.setItem("pt_sid",sId);}catch(e){}
    sC("pt_sid",sId,30);
  }

  var utms={
    utm_source:qp.utm_source||null,
    utm_medium:qp.utm_medium||null,
    utm_campaign:qp.utm_campaign||null,
    utm_content:qp.utm_content||null,
    utm_term:qp.utm_term||null,
    fbclid:qp.fbclid||null,
    src:qp.src||qp.utm_source||null,
    sck:qp.sck||null
  };

  if(utms.utm_campaign||utms.utm_content||utms.fbclid){
    try{localStorage.setItem("pt_ad_hist",JSON.stringify({utms:utms,time:Date.now()}));}catch(e){}
  }

  var fUtms=Object.assign({},utms);
  if(!fUtms.utm_campaign){
    try{
      var sv=JSON.parse(localStorage.getItem("pt_ad_hist")||"null");
      if(sv&&Date.now()-sv.time<2592e6){
        fUtms=Object.assign({},sv.utms);
        fUtms.recovered=!0;
      }
    }catch(e){}
  }

  var ckd=[
    "kiwify.com.br","hotmart.com","eduzz.com","cakto.com.br","kirvano.com",
    "perfectpay.com.br","braip.com","monetizze.com.br","yampi.com.br",
    "cartpanda.com","appmax.com.br","ticto.com.br","doppus.com",
    "greenn.com.br","pepper.com.br","lowify.com.br"
  ];

  function dec(){
    try{
      var e=d.querySelectorAll("a[href]");
      for(var r=0;r<e.length;r++){
        var n=e[r],o=n.getAttribute("href");
        if(o&&!o.startsWith("#")&&!o.startsWith("javascript:")){
          var t=!1;
          for(var a=0;a<ckd.length;a++){
            if(o.indexOf(ckd[a])!==-1){t=!0;break;}
          }
          if(t){
            try{
              var c=new URL(o,w.location.href),u=c.searchParams;
              ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid","src","sck"].forEach(function(k){
                if(fUtms[k]&&!u.get(k))u.set(k,fUtms[k]);
              });
              if(sId&&!u.get("pt_sid"))u.set("pt_sid",sId);
              if(fbp&&!u.get("_fbp"))u.set("_fbp",fbp);
              if(fbc&&!u.get("_fbc"))u.set("_fbc",fbc);
              var nw=c.toString();
              if(nw!==o)n.setAttribute("href",nw);
            }catch(e){}
          }
        }
      }
    }catch(e){}
  }

  function snd(e,r){
    var evId="ev_"+Date.now()+"_"+Math.random().toString(36).substr(2,7);
    
    // Dispara via fbq client-side no navegador (visível no Facebook Pixel Helper)
    if(w.fbq&&metaIds.length){
      try{
        w.fbq('track', e, r||{}, { eventID: evId });
      }catch(err){}
    }

    var n={
      pixelId:ids[0]||w.pt_pixel_id||w.pixelId||"pt_px_default",
      metaPixelId:metaIds[0]||w.metaPixelId||null,
      allPixelIds:ids,
      allMetaIds:metaIds,
      sessionId:sId,
      eventName:e,
      eventId:evId,
      eventSourceUrl:w.location.href,
      referrer:d.referrer,
      fbp:fbp,
      fbc:fbc,
      utms:fUtms,
      customData:r||{},
      timestamp:new Date().toISOString()
    };

    var o="https://app.primetrack.top/api/track/event";
    if(navigator.sendBeacon){
      navigator.sendBeacon(o,JSON.stringify(n));
    }else{
      try{
        fetch(o,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(n),
          keepalive:!0
        });
      }catch(e){}
    }
  }

  w.primetrack={
    track:snd,
    getSessionId:function(){return sId;},
    getUtms:function(){return fUtms;},
    getFbp:function(){return fbp;},
    getFbc:function(){return fbc;},
    addMetaPixel:function(id){_metaAdd(id);initMetaFbq();}
  };
  w.pt=w.primetrack;

  dec();
  setInterval(dec,1500);

  snd("PageView",{title:d.title,path:w.location.pathname});

  d.addEventListener("click",function(e){
    var t=e.target.closest("a, button, [role='button'], input[type='submit'], input[type='button']");
    if(!t)return;
    var h=t.getAttribute("href")||"",txt=(t.innerText||t.value||"").toLowerCase();
    var cr=w.pt_ic_rule||w.primetrackIcRule||null;
    var ct=w.pt_ic_type||w.primetrackIcType||null;
    var ic=!1;

    if(cr){
      if(ct==="css"||(!ct&&(cr.startsWith(".")||cr.startsWith("#")))){
        try{if(t.matches(cr)||t.closest(cr))ic=!0;}catch(e){}
      }else if(ct==="url"&&h.indexOf(cr)!==-1){
        ic=!0;
      }else if(ct==="text"&&txt.indexOf(cr.toLowerCase())!==-1){
        ic=!0;
      }
    }

    if(!ic){
      if(
        h.indexOf("checkout")!==-1||
        h.indexOf("pay.")!==-1||
        ckd.some(function(d){return h.indexOf(d)!==-1})||
        txt.indexOf("comprar")!==-1||
        txt.indexOf("quero")!==-1||
        txt.indexOf("adquirir")!==-1||
        txt.indexOf("inscrever")!==-1||
        txt.indexOf("garantir")!==-1||
        txt.indexOf("pagamento")!==-1||
        txt.indexOf("finalizar")!==-1
      ){
        ic=!0;
      }
    }

    if(ic){
      snd("InitiateCheckout",{buttonText:txt.substring(0,50),destinationUrl:h});
    }
  },!0);
}();