/**
 * Parsers de Webhooks para Plataformas de Pagamento Brasileiras & Globais
 */

function extractTrackingPixelId(tracking = {}, body = {}) {
  return tracking?.pixelId || tracking?.pt_pixel_id || tracking?.pixel_id || tracking?.pt_px_id ||
         body?.pixelId || body?.pt_pixel_id || body?.pixel_id || body?.pt_px_id ||
         body?.data?.tracking?.pixelId || body?.data?.tracking?.pt_pixel_id || null;
}

function extractMetaPixelId(tracking = {}, body = {}) {
  return tracking?.pt_meta_pixel || tracking?.meta_pixel || tracking?.metaPixelId ||
         body?.pt_meta_pixel || body?.meta_pixel || body?.metaPixelId || null;
}

export function extractUniversalTracking(tracking = {}, body = {}) {
  const t = tracking || {};
  const b = body || {};
  const dataTrack = b.data?.tracking || b.data?.tracking_parameters || b.data?.metadata || b.metadata || (b.purchase && (b.purchase.origin || b.purchase.tracking)) || {};

  const rawSrc = t.utm_source || b.utm_source || t.src || b.src || t.sck || b.sck || dataTrack.src || dataTrack.utm_source || '';
  let extractedSid = null;
  if (typeof rawSrc === 'string' && rawSrc.includes('pt_')) {
    const matchSid = rawSrc.match(/pt_[a-z0-9_]+/i);
    if (matchSid) extractedSid = matchSid[0];
  }

  const rawSck = t.sck || b.sck || dataTrack.sck || '';
  if (!extractedSid && typeof rawSck === 'string' && rawSck.includes('pt_')) {
    const matchSid = rawSck.match(/pt_[a-z0-9_]+/i);
    if (matchSid) extractedSid = matchSid[0];
  }

  if (!extractedSid) {
    const candidates = [t.utm_campaign, b.utm_campaign, t.utm_content, b.utm_content, t.utm_term, b.utm_term, t.custom_fields, b.custom_fields];
    for (const cand of candidates) {
      if (typeof cand === 'string' && cand.includes('pt_')) {
        const m = cand.match(/pt_[a-z0-9_]+/i);
        if (m) { extractedSid = m[0]; break; }
      }
    }
  }

  const fbclid = t.fbclid || b.fbclid || dataTrack.fbclid || '';
  let fbc = t.fbc || t._fbc || b.fbc || b._fbc || dataTrack.fbc || dataTrack._fbc || null;
  if (!fbc && fbclid) {
    fbc = `fb.1.${Date.now()}.${fbclid}`;
  }

  return {
    utm_source: t.utm_source || b.utm_source || t.src || b.src || dataTrack.utm_source || dataTrack.src || '',
    utm_medium: t.utm_medium || b.utm_medium || dataTrack.utm_medium || '',
    utm_campaign: t.utm_campaign || b.utm_campaign || dataTrack.utm_campaign || '',
    utm_content: t.utm_content || b.utm_content || dataTrack.utm_content || '',
    utm_term: t.utm_term || b.utm_term || dataTrack.utm_term || '',
    fbclid,
    src: t.src || b.src || dataTrack.src || '',
    sck: t.sck || b.sck || dataTrack.sck || '',
    fbp: t.fbp || t._fbp || b.fbp || b._fbp || dataTrack.fbp || dataTrack._fbp || null,
    fbc,
    sessionId: t.pt_sid || b.pt_sid || t.sessionId || b.sessionId || b.pt_click_id || b.click_id || t.click_id || dataTrack.pt_sid || dataTrack.sessionId || extractedSid || null,
    pixelId: extractTrackingPixelId(t, b) || extractTrackingPixelId(dataTrack, b),
    pt_meta_pixel: extractMetaPixelId(t, b) || extractMetaPixelId(dataTrack, b)
  };
}

export function parseWebhook(gateway, body) {
  const normGateway = (gateway || '').toLowerCase();

  switch (normGateway) {
    case 'kiwify':
      return parseKiwify(body);
    case 'hotmart':
      return parseHotmart(body);
    case 'eduzz':
      return parseEduzz(body);
    case 'cakto':
      return parseCakto(body);
    case 'kirvano':
      return parseKirvano(body);
    case 'perfectpay':
      return parsePerfectPay(body);
    case 'braip':
      return parseBraip(body);
    case 'monsterpay':
      return parseMonsterPay(body);
    default:
      return parseGeneric(body);
  }
}

function parseKiwify(body) {
  const customer = body.Customer || body.customer || {};
  const tracking = body.TrackingParameters || body.tracking_parameters || {};
  const statusRaw = String(body.order_status || body.status || body.event || '').toLowerCase();
  
  let status = 'waiting_payment';
  if (['paid', 'approved', 'aprovado', 'pago'].some(s => statusRaw.includes(s))) {
    status = 'approved';
  } else if (['waiting_payment', 'pending', 'aguardando', 'pix_gerado', 'gerado', 'billet_printed'].some(s => statusRaw.includes(s))) {
    status = 'waiting_payment';
  } else if (['refunded', 'chargeback', 'reembolsado', 'estornado', 'chargedback'].some(s => statusRaw.includes(s))) {
    status = 'refunded';
  } else if (['cancelled', 'canceled', 'cancelado', 'recusado'].some(s => statusRaw.includes(s))) {
    status = 'cancelled';
  }

  const rawPayMethod = String(body.payment_method || body.paymentMethod || '').toLowerCase();
  let paymentMethod = 'pix';
  if (rawPayMethod.includes('pix')) {
    paymentMethod = 'pix';
  } else if (rawPayMethod.includes('boleto') || rawPayMethod.includes('billet')) {
    paymentMethod = 'boleto';
  } else if (rawPayMethod.includes('credit') || rawPayMethod.includes('card') || rawPayMethod.includes('cartao')) {
    paymentMethod = 'credit_card';
  }

  // Extração inteligente da COMISSÃO REAL / VALOR LÍQUIDO na Kiwify
  let realCommission = null;
  const rawNet = body.net_amount ?? body.data?.net_amount ?? body.my_commission ?? body.commission_value ?? body.comissao ?? body.data?.comissao ?? body.commission;
  if (rawNet !== undefined && rawNet !== null && !isNaN(Number(rawNet)) && Number(rawNet) > 0) {
    let numNet = Number(rawNet);
    if (numNet > 1000 && !String(rawNet).includes('.')) {
      numNet = numNet / 100;
    }
    realCommission = numNet;
  }

  let grossAmount = Number(body.order_amount || body.amount || body.order_value || 0);
  if (grossAmount > 1000 && !String(body.order_amount || body.amount || '').includes('.')) {
    grossAmount = grossAmount / 100;
  }
  if (!grossAmount) grossAmount = 97.00;

  const finalAmount = (realCommission && realCommission > 0) ? realCommission : grossAmount;

  return {
    gateway: 'Kiwify',
    orderCode: body.order_id || body.order_code || `KW-${Date.now().toString().slice(-7)}`,
    status,
    amount: finalAmount,
    grossAmount,
    commission: realCommission || finalAmount,
    paymentMethod,
    productName: (body.Product && body.Product.product_name) || body.product_name || 'Produto Kiwify',
    customer: {
      name: customer.full_name || customer.name || body.name || body.customer_name || 'Cliente Kiwify',
      email: customer.email || body.email || body.customer_email || '',
      phone: customer.mobile || customer.phone || customer.cellphone || body.phone || body.mobile || '',
      document: customer.CPF || customer.cpf || customer.document || body.cpf || body.document || '',
      city: customer.city || (customer.address && customer.address.city) || (body.address && body.address.city) || '',
      state: customer.state || (customer.address && customer.address.state) || (body.address && body.address.state) || '',
      zip: customer.zipcode || customer.zip || (customer.address && (customer.address.zipcode || customer.address.zip || customer.address.cep)) || '',
      country: customer.country || (customer.address && customer.address.country) || 'BR'
    },
    tracking: extractUniversalTracking(tracking, body),
    raw: body
  };
}

function parseHotmart(body) {
  const data = body.data || body;
  const buyer = data.buyer || {};
  const purchase = data.purchase || {};
  const product = data.product || {};
  const event = String(body.event || body.status || '').toUpperCase().trim();
  const rawPaymentType = String(
    (purchase.payment && purchase.payment.type) || 
    (purchase.payment && purchase.payment.method) || 
    body.payment_type || 
    body.payment_method || 
    ''
  ).toLowerCase();

  // Status de Venda no Webhook Hotmart 2.0:
  // - PURCHASE_APPROVED, PURCHASE_COMPLETE -> Aprovado
  // - PURCHASE_BILLET_PRINTED (Boleto impresso ou PIX gerado), WAITING_PAYMENT, PURCHASE_OUT_OF_DATE, PURCHASE_DELAYED -> Pendente (PIX ou Boleto gerado)
  // - PURCHASE_REFUNDED, PURCHASE_CHARGEBACK -> Reembolsado
  // - PURCHASE_CANCELED, PURCHASE_EXPIRED, PURCHASE_PROTEST -> Cancelado
  let status = 'waiting_payment';
  if (['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'APPROVED'].some(ev => event.includes(ev))) {
    status = 'approved';
  } else if ([
    'PURCHASE_BILLET_PRINTED', 
    'WAITING_PAYMENT', 
    'PURCHASE_OUT_OF_DATE', 
    'PURCHASE_DELAYED', 
    'BILLET_PRINTED', 
    'PIX_GENERATED'
  ].some(ev => event.includes(ev))) {
    status = 'waiting_payment';
  } else if (['REFUNDED', 'CHARGEBACK', 'REVERSAL'].some(ev => event.includes(ev))) {
    status = 'refunded';
  } else if (['CANCELED', 'CANCELLED', 'EXPIRED'].some(ev => event.includes(ev))) {
    status = 'cancelled';
  } else {
    status = 'waiting_payment';
  }

  // Identificação do método de pagamento:
  let paymentMethod = 'pix';
  if (rawPaymentType.includes('pix')) {
    paymentMethod = 'pix';
  } else if (rawPaymentType.includes('billet') || rawPaymentType.includes('boleto')) {
    paymentMethod = 'boleto';
  } else if (event.includes('BILLET') && !rawPaymentType.includes('pix')) {
    paymentMethod = 'boleto';
  } else if (rawPaymentType.includes('card') || rawPaymentType.includes('credit') || rawPaymentType.includes('cartao')) {
    paymentMethod = 'credit_card';
  } else if (event.includes('PIX')) {
    paymentMethod = 'pix';
  }

  // Extração inteligente da COMISSÃO REAL na Hotmart
  let realCommission = null;

  // 1. Array data.commissions ou purchase.commissions
  const commissionsList = data.commissions || purchase.commissions || body.commissions;
  if (Array.isArray(commissionsList) && commissionsList.length > 0) {
    const userComm = commissionsList.find(c => {
      const src = String(c.source || '').toUpperCase();
      const val = Number(c.value ?? c.commission ?? 0);
      return src !== 'PLATFORM' && src !== 'HOTMART' && val > 0;
    }) || commissionsList[0];

    if (userComm) {
      realCommission = Number(userComm.value ?? userComm.commission ?? 0);
    }
  }

  // 2. Campo direto purchase.commission ou data.commission
  if (!realCommission || isNaN(realCommission) || realCommission <= 0) {
    const directComm = purchase.commission?.value ?? purchase.commission ?? data.commission?.value ?? data.commission ?? body.commission_value;
    if (directComm !== undefined && directComm !== null && !isNaN(Number(directComm)) && Number(directComm) > 0) {
      realCommission = Number(directComm);
    }
  }

  const grossPrice = purchase.price ? Number(purchase.price.value || purchase.price) : 97.00;
  const finalAmount = (realCommission && realCommission > 0) ? realCommission : grossPrice;

  return {
    gateway: 'Hotmart',
    orderCode: purchase.transaction || body.transaction || `HT-${Date.now().toString().slice(-7)}`,
    status,
    amount: finalAmount,
    grossAmount: grossPrice,
    commission: realCommission || finalAmount,
    paymentMethod,
    productName: product.name || 'Produto Hotmart',
    customer: {
      name: buyer.name || (buyer.first_name ? `${buyer.first_name} ${buyer.last_name || ''}`.trim() : null) || body.name || body.buyer_name || 'Cliente Hotmart',
      email: buyer.email || body.email || body.buyer_email || '',
      phone: (buyer.checkout_phone) || (buyer.phone) || (buyer.cellphone) || body.phone || body.buyer_phone || '',
      document: buyer.document || buyer.doc || buyer.cpf || body.doc || body.cpf || '',
      city: (buyer.address && buyer.address.city) || body.city || '',
      state: (buyer.address && buyer.address.state) || body.state || '',
      zip: (buyer.address && (buyer.address.zipcode || buyer.address.zip || buyer.address.cep)) || body.zip || body.cep || '',
      country: (buyer.address && buyer.address.country_iso) || 'BR'
    },
    tracking: extractUniversalTracking(purchase.origin || purchase.tracking, { ...body, ...buyer, ...purchase }),
    raw: body
  };
}

function parseEduzz(body) {
  const customer = body.client || body.customer || {};
  let status = 'approved';
  if (body.trans_status === 1) status = 'waiting_payment';
  if (body.trans_status === 7) status = 'refunded';

  return {
    gateway: 'Eduzz',
    orderCode: String(body.trans_id || body.order_id || `ED-${Date.now().toString().slice(-7)}`),
    status,
    amount: Number(body.trans_value || body.amount || 67.00),
    paymentMethod: body.trans_payment_method === 1 ? 'boleto' : (body.trans_payment_method === 29 ? 'pix' : 'credit_card'),
    productName: body.product_name || 'Produto Eduzz',
    customer: {
      name: customer.name || body.client_name || 'Cliente Eduzz',
      email: customer.email || body.client_email || '',
      phone: customer.cellphone || body.client_cellphone || '',
      city: customer.city || body.client_city || '',
      state: customer.state || body.client_state || '',
      zip: customer.zip_code || body.client_zip_code || '',
      country: customer.country || 'BR'
    },
    tracking: extractUniversalTracking(body, body),
    raw: body
  };
}

function parseCakto(body) {
  const customer = body.customer || {};
  return {
    gateway: 'Cakto',
    orderCode: body.order_id || `CK-${Date.now().toString().slice(-7)}`,
    status: body.status === 'paid' ? 'approved' : body.status || 'approved',
    amount: Number(body.amount || 57.00),
    paymentMethod: body.payment_method || 'pix',
    productName: body.product_name || (body.product && body.product.name) || 'Produto Cakto',
    customer: {
      name: customer.name || 'Cliente Cakto',
      email: customer.email || '',
      phone: customer.phone || '',
      city: customer.city || (customer.address && customer.address.city) || '',
      state: customer.state || (customer.address && customer.address.state) || '',
      zip: customer.zip || customer.zipcode || customer.cep || (customer.address && customer.address.zipcode) || '',
      country: customer.country || 'BR'
    },
    tracking: extractUniversalTracking(body.metadata, body),
    raw: body
  };
}

function parseKirvano(body) {
  const customer = body.customer || {};
  return {
    gateway: 'Kirvano',
    orderCode: body.id || body.code || `KV-${Date.now().toString().slice(-7)}`,
    status: body.status === 'PAID' ? 'approved' : 'approved',
    amount: Number(body.total || body.amount || 97.00),
    paymentMethod: body.payment_method || 'pix',
    productName: body.product_title || 'Produto Kirvano',
    customer: {
      name: customer.name || 'Cliente Kirvano',
      email: customer.email || '',
      phone: customer.phone_number || customer.phone || '',
      city: customer.city || (customer.address && customer.address.city) || '',
      state: customer.state || (customer.address && customer.address.state) || '',
      zip: customer.zip || customer.zipcode || customer.cep || (customer.address && customer.address.zipcode) || '',
      country: customer.country || 'BR'
    },
    tracking: extractUniversalTracking(body, body),
    raw: body
  };
}

function parsePerfectPay(body) {
  const customer = body.customer || body.client || body.buyer || body.data?.customer || {};
  const tracking = body.tracking || body.metadata || body.tracking_parameters || body.data?.tracking || {};

  // Status da venda no webhook Perfect Pay:
  // sale_status_enum:
  // 1 = pending / pendente / aguardando pagamento (PIX gerado, boleto pendente)
  // 2 = approved / aprovado / pago
  // 3 = in_process / em analise
  // 5 ou 6 = rejected / cancelado / recusado
  // 7 ou 8 = refunded / chargeback / devolvido
  const statusEnum = Number(body.sale_status_enum ?? body.status_enum ?? body.sale_status ?? body.data?.sale_status_enum ?? 0);
  const rawStatusName = String(body.sale_status_name || body.sale_status || body.status || body.step || body.event || body.data?.status || '').toLowerCase();
  
  let status = 'waiting_payment';
  if (statusEnum === 2 || ['aprovad', 'paid', 'pago', 'approved'].some(s => rawStatusName.includes(s))) {
    status = 'approved';
  } else if (statusEnum === 1 || ['pendent', 'aguardand', 'waiting', 'pending', 'pix_gerado', 'gerado'].some(s => rawStatusName.includes(s))) {
    status = 'waiting_payment';
  } else if ([7, 8].includes(statusEnum) || ['reembols', 'refund', 'chargeback', 'estorn'].some(s => rawStatusName.includes(s))) {
    status = 'refunded';
  } else if ([5, 6].includes(statusEnum) || ['cancel', 'recus', 'rejeit', 'rejected'].some(s => rawStatusName.includes(s))) {
    status = 'cancelled';
  } else {
    status = 'waiting_payment';
  }

  // Método de pagamento
  // payment_type_enum: 1 = Cartão, 2 = Boleto, 3 = PIX
  const payEnum = Number(body.payment_type_enum ?? body.payment_type ?? body.payment_method_enum ?? body.data?.payment_type_enum ?? 0);
  const rawPayName = String(body.payment_type_name || body.payment_type || body.payment_method || body.data?.payment_type || '').toLowerCase();
  
  let paymentMethod = 'pix';
  if (rawPayName.includes('pix') || payEnum === 3) {
    paymentMethod = 'pix';
  } else if (rawPayName.includes('boleto') || rawPayName.includes('billet') || payEnum === 2) {
    paymentMethod = 'boleto';
  } else if (rawPayName.includes('cart') || rawPayName.includes('card') || rawPayName.includes('credito') || payEnum === 1) {
    paymentMethod = 'credit_card';
  } else if (rawStatusName.includes('pix') || String(body.step || '').toLowerCase().includes('pix')) {
    paymentMethod = 'pix';
  }

  // Helper para converter valores monetários (números, strings 'R$ 47,90', '47,90', '47.90')
  const parseCurrency = (val) => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') {
      if (isNaN(val) || val <= 0) return null;
      return val;
    }
    const clean = String(val)
      .replace(/R\$\s*/gi, '')
      .replace(/[^\d.,-]/g, '')
      .trim();
    if (!clean) return null;
    let num;
    if (clean.includes(',') && clean.includes('.')) {
      num = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    } else if (clean.includes(',')) {
      num = parseFloat(clean.replace(',', '.'));
    } else {
      num = parseFloat(clean);
    }
    if (isNaN(num) || num <= 0) return null;
    return num;
  };

  const rawGross = body.sale_amount ?? body.amount ?? body.value ?? body.price ?? body.order_amount ?? body.data?.sale_amount ?? body.data?.amount ?? 47.90;
  const grossAmount = parseCurrency(rawGross) || 47.90;

  // Extração inteligente da COMISSÃO REAL / LÍQUIDA do usuário na Perfect Pay
  let realCommission = null;

  // 1. Campos diretos de comissão / valor líquido enviados pela Perfect Pay
  const candidateFields = [
    body.commission_amount,
    body.commission_value,
    body.user_commission,
    body.my_commission,
    body.net_amount,
    body.liquid_value,
    body.liquid_amount,
    body.sale_net_amount,
    body.sale_net_value,
    body.producer_commission,
    body.producer_commission_amount,
    body.producer_amount,
    body.affiliate_commission,
    body.affiliate_commission_amount,
    body.affiliate_amount,
    (typeof body.commission === 'number' || typeof body.commission === 'string') ? body.commission : null,
    body.data?.commission_amount,
    body.data?.commission_value,
    body.data?.net_amount,
    body.data?.liquid_value,
    body.data?.user_commission,
    body.data?.producer_commission,
    body.data?.affiliate_commission,
    body.sale?.commission_amount,
    body.sale?.net_amount,
    body.sale?.liquid_value,
    body.order?.commission_amount,
    body.order?.net_amount
  ];

  for (const cand of candidateFields) {
    const val = parseCurrency(cand);
    if (val && val > 0) {
      realCommission = val;
      break;
    }
  }

  // 2. Extração via lista de afiliados / comissões (body.affiliates, body.commissions, body.commission, body.splits)
  const affiliatesList = body.affiliates || body.commissions || body.commission || body.splits || body.split || body.data?.affiliates || body.data?.commissions || body.data?.commission;
  let platformFee = null;

  if (Array.isArray(affiliatesList) && affiliatesList.length > 0) {
    // Procura taxa da plataforma Perfect Pay (affiliation_type_enum === 0 ou nome platform / perfect)
    const platformEntry = affiliatesList.find(c => {
      const typeEnum = Number(c.affiliation_type_enum);
      const name = String(c.name || c.affiliation_type || '').toLowerCase();
      return typeEnum === 0 || name.includes('platform') || name.includes('perfect');
    });
    if (platformEntry) {
      platformFee = parseCurrency(platformEntry.commission_amount ?? platformEntry.value ?? platformEntry.amount ?? platformEntry.commission_value);
    }

    if (!realCommission) {
      // Se veio affiliation_type_enum no root, busca o item específico
      const rootTypeEnum = body.affiliation_type_enum !== undefined ? Number(body.affiliation_type_enum) : null;
      if (rootTypeEnum !== null && !isNaN(rootTypeEnum)) {
        const matchingEntry = affiliatesList.find(c => Number(c.affiliation_type_enum) === rootTypeEnum);
        if (matchingEntry) {
          const val = parseCurrency(matchingEntry.commission_amount ?? matchingEntry.value ?? matchingEntry.amount ?? matchingEntry.commission_value ?? matchingEntry.net_amount);
          if (val && val > 0) realCommission = val;
        }
      }

      // Se ainda não achou, busca qualquer entrada do usuário (typeEnum !== 0, produtor ou afiliado)
      if (!realCommission) {
        const userEntry = affiliatesList.find(c => {
          const typeEnum = Number(c.affiliation_type_enum);
          const val = parseCurrency(c.commission_amount ?? c.value ?? c.amount ?? c.commission_value ?? c.net_amount ?? c.liquid_value);
          return typeEnum !== 0 && val && val > 0;
        }) || affiliatesList.find(c => {
          const val = parseCurrency(c.commission_amount ?? c.value ?? c.amount ?? c.commission_value ?? c.net_amount ?? c.liquid_value);
          return val && val > 0;
        });

        if (userEntry) {
          realCommission = parseCurrency(userEntry.commission_amount ?? userEntry.value ?? userEntry.amount ?? userEntry.commission_value ?? userEntry.net_amount ?? userEntry.liquid_value);
        }
      }
    }
  } else if (typeof affiliatesList === 'object' && affiliatesList !== null) {
    const val = parseCurrency(affiliatesList.commission_amount ?? affiliatesList.value ?? affiliatesList.amount ?? affiliatesList.commission_value ?? affiliatesList.net_amount);
    if (val && val > 0 && !realCommission) realCommission = val;
  }

  // 3. Se houver taxa explícita da plataforma informada, desconta do valor bruto caso não tenhamos comissão líquida
  if (!platformFee) {
    const candidateFees = [
      body.platform_fee,
      body.fee,
      body.fees,
      body.tax,
      body.tax_value,
      body.tax_amount,
      body.rate_value,
      body.rate_amount,
      body.perfectpay_fee,
      body.gateway_fee,
      body.data?.platform_fee,
      body.data?.fee,
      body.data?.tax
    ];
    for (const candFee of candidateFees) {
      const parsedFee = parseCurrency(candFee);
      if (parsedFee && parsedFee > 0) {
        platformFee = parsedFee;
        break;
      }
    }
  }

  if (!realCommission && platformFee && platformFee > 0 && grossAmount > platformFee) {
    realCommission = Number((grossAmount - platformFee).toFixed(2));
  }

  // 4. Se a Perfect Pay NÃO enviou nenhum campo de comissão ou taxa (enviou apenas o valor cheio sale_amount):
  // Desconta automaticamente a taxa oficial da Perfect Pay (8,9% + $1,00 para internacional/USD ou 7,9% + R$ 1,00 para Brasil)
  const isUsd = Number(body.currency_enum) === 2 || String(body.currency || '').toUpperCase() === 'USD';
  if (!realCommission || realCommission <= 0) {
    const ppRate = isUsd ? 0.089 : 0.079; // 8,9% internacional (EUA) ou 7,9% nacional (Brasil)
    const ppFixed = 1.00; // $1,00 ou R$ 1,00 taxa fixa por transação
    const calculatedFee = Number(((grossAmount * ppRate) + ppFixed).toFixed(2));
    realCommission = Math.max(0, Number((grossAmount - calculatedFee).toFixed(2)));
  }

  // Garante que o valor da venda seja estritamente a comissão verdadeira
  const finalAmount = (realCommission && realCommission > 0) ? realCommission : grossAmount;

  return {
    gateway: 'PerfectPay',
    orderCode: body.code || body.sale_id || body.sale_code || body.transaction || body.order_id || body.id || body.data?.code || `PP-${Date.now().toString().slice(-7)}`,
    status,
    amount: finalAmount,
    grossAmount,
    commission: finalAmount,
    currency: isUsd ? 'USD' : 'BRL',
    paymentMethod,
    productName: body.product_name || body.product?.name || body.product?.title || body.plan?.name || body.data?.product_name || 'Produto PerfectPay',
    customer: {
      name: customer.customer_name || customer.name || customer.full_name || body.customer_name || body.client_name || body.name || 'Cliente PerfectPay',
      email: customer.customer_email || customer.email || body.customer_email || body.client_email || body.email || '',
      phone: customer.customer_phone || customer.phone || customer.cellphone || customer.mobile || body.customer_phone || body.phone || '',
      document: customer.identification_number || customer.document_number || customer.cpf || customer.doc || body.cpf || body.document || '',
      city: customer.customer_city || customer.city || (customer.address && customer.address.city) || body.city || '',
      state: customer.customer_state || customer.state || (customer.address && customer.address.state) || body.state || '',
      zip: customer.customer_zip || customer.customer_cep || customer.cep || (customer.address && (customer.address.zipcode || customer.address.cep)) || '',
      country: customer.customer_country || customer.country || (isUsd ? 'US' : 'BR')
    },
    tracking: extractUniversalTracking(tracking, body),
    raw: body
  };
}

function parseBraip(body) {
  const client = body.client || {};
  return {
    gateway: 'Braip',
    orderCode: body.trans_key || `BR-${Date.now().toString().slice(-7)}`,
    status: body.trans_status === 'Pagamento Aprovado' ? 'approved' : 'approved',
    amount: Number(body.trans_value || 87.00),
    paymentMethod: body.trans_payment_type || 'pix',
    productName: body.product_name || 'Produto Braip',
    customer: {
      name: client.client_name || 'Cliente Braip',
      email: client.client_email || '',
      phone: client.client_telephone || '',
      city: client.client_city || '',
      state: client.client_state || '',
      zip: client.client_zip_code || client.client_cep || '',
      country: 'BR'
    },
    tracking: extractUniversalTracking(body, body),
    raw: body
  };
}

function parseMonsterPay(body) {
  const customer = body.customer || body.buyer || body.client || body.data?.customer || {};
  const tracking = body.tracking || body.tracking_parameters || body.metadata || body.utm || body.data?.tracking || {};
  const product = body.product || (Array.isArray(body.products) && body.products[0]) || body.data?.product || {};
  const rawStatus = (body.status || body.event || body.order_status || body.data?.status || 'approved').toLowerCase();
  
  let status = 'approved';
  if (['pending', 'waiting_payment', 'aguardando_pagamento', 'processando'].some(s => rawStatus.includes(s))) {
    status = 'waiting_payment';
  } else if (['refunded', 'chargeback', 'reembolsado', 'estornado', 'cancelado', 'canceled'].some(s => rawStatus.includes(s))) {
    status = 'refunded';
  }

  const customerName = customer.name || customer.full_name || 
    (customer.first_name ? `${customer.first_name} ${customer.last_name || ''}`.trim() : '') || 
    body.name || '';

  // Extração inteligente de comissão / valor líquido na MonsterPay
  const rawComm = body.commission ?? body.commission_value ?? body.net_amount ?? body.data?.commission ?? body.data?.net_amount ?? body.user_amount;
  let realCommission = null;
  if (rawComm !== undefined && rawComm !== null && !isNaN(Number(rawComm)) && Number(rawComm) > 0) {
    let numComm = Number(rawComm);
    if (numComm > 1000 && !String(rawComm).includes('.')) {
      numComm = numComm / 100;
    }
    realCommission = numComm;
  }

  const rawAmount = body.amount || body.total || body.price || body.value || body.data?.amount || 0;
  const numAmount = Number(rawAmount);
  const finalGross = numAmount > 1000 && !String(rawAmount).includes('.') ? numAmount / 100 : numAmount;
  const finalAmount = (realCommission && realCommission > 0) ? realCommission : (finalGross || 97.00);

  return {
    gateway: 'MonsterPay',
    orderCode: body.order_id || body.transaction_id || body.id || body.code || body.data?.id || '',
    status,
    amount: finalAmount,
    grossAmount: finalGross || 97.00,
    commission: realCommission || finalAmount,
    paymentMethod: body.payment_method || body.paymentMethod || body.data?.payment_method || 'pix',
    productName: product.name || body.product_name || body.productName || body.data?.product_name || 'Produto MonsterPay',
    customer: {
      name: customerName,
      email: customer.email || body.email || body.data?.email || '',
      phone: customer.phone || customer.mobile || customer.cellphone || body.phone || '',
      city: customer.city || (customer.address && customer.address.city) || '',
      state: customer.state || (customer.address && customer.address.state) || '',
      zip: customer.zip || customer.zipcode || customer.cep || (customer.address && (customer.address.zipcode || customer.address.zip || customer.address.cep)) || '',
      country: customer.country || (customer.address && customer.address.country) || 'BR'
    },
    tracking: extractUniversalTracking(tracking, body),
    raw: body
  };
}

function parseGeneric(body) {
  const customer = body.customer || body.buyer || body.client || {};
  const tracking = body.tracking || body.tracking_parameters || body.metadata || {};
  const product = body.product || (Array.isArray(body.products) && body.products[0]) || {};

  const rawEvent = (body.event || body.status || 'sale.approved').toLowerCase();
  let status = 'approved';
  if (['sale.pending', 'waiting_payment', 'pending'].includes(rawEvent)) {
    status = 'waiting_payment';
  } else if (['sale.refunded', 'subscription.cancelled', 'refunded', 'chargeback'].includes(rawEvent)) {
    status = 'refunded';
  }

  const customerName = customer.name || 
    (customer.first_name ? `${customer.first_name} ${customer.last_name || ''}`.trim() : '') || 
    customer.full_name || body.name || 'Cliente';

  return {
    gateway: body.gateway || 'Custom Webhook',
    orderCode: body.transaction_id || body.order_id || body.id || body.transaction || `ORD-${Date.now().toString().slice(-7)}`,
    status,
    amount: Number(body.amount || body.total || body.sale_amount || body.price || 97.00),
    paymentMethod: body.payment_method || body.paymentMethod || 'pix',
    productName: product.name || body.product_name || body.productName || 'Produto Digital',
    products: body.products || (product.name ? [product] : []),
    customer: {
      name: customerName,
      email: customer.email || body.email || '',
      phone: customer.phone || customer.mobile || body.phone || '',
      document: customer.document || customer.cpf || '',
      country: customer.country || 'br',
      city: customer.city || (customer.address && customer.address.city) || body.city || '',
      state: customer.state || (customer.address && customer.address.state) || body.state || '',
      zip: customer.zip || customer.cep || ''
    },
    tracking: extractUniversalTracking(tracking, body),
    raw: body
  };
}
