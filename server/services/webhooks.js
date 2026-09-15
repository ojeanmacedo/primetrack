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
      name: customer.full_name || customer.name || 'Cliente Kiwify',
      email: customer.email || '',
      phone: customer.mobile || customer.phone || '',
      city: customer.city || (customer.address && customer.address.city) || '',
      state: customer.state || (customer.address && customer.address.state) || '',
      zip: customer.zipcode || customer.zip || (customer.address && (customer.address.zipcode || customer.address.zip || customer.address.cep)) || '',
      country: customer.country || (customer.address && customer.address.country) || 'BR'
    },
    tracking: {
      utm_source: tracking.utm_source || tracking.src || body.utm_source,
      utm_medium: tracking.utm_medium || body.utm_medium,
      utm_campaign: tracking.utm_campaign || body.utm_campaign,
      utm_content: tracking.utm_content || body.utm_content,
      utm_term: tracking.utm_term || body.utm_term,
      sck: tracking.sck || body.sck,
      fbp: tracking.fbp || body.fbp,
      fbc: tracking.fbc || body.fbc,
      sessionId: tracking.sessionId || body.sessionId,
      pixelId: extractTrackingPixelId(tracking, body)
    },
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
      name: buyer.name || 'Cliente Hotmart',
      email: buyer.email || '',
      phone: (buyer.checkout_phone) || (buyer.phone) || '',
      city: (buyer.address && buyer.address.city) || '',
      state: (buyer.address && buyer.address.state) || '',
      zip: (buyer.address && (buyer.address.zipcode || buyer.address.zip || buyer.address.cep)) || '',
      country: (buyer.address && buyer.address.country_iso) || 'BR'
    },
    tracking: {
      utm_source: (purchase.origin && purchase.origin.utm_source) || (purchase.tracking && purchase.tracking.source) || body.utm_source,
      utm_medium: (purchase.origin && purchase.origin.utm_medium) || body.utm_medium,
      utm_campaign: (purchase.origin && purchase.origin.utm_campaign) || body.utm_campaign,
      utm_content: (purchase.origin && purchase.origin.utm_content) || body.utm_content,
      utm_term: (purchase.origin && purchase.origin.utm_term) || body.utm_term,
      sck: (purchase.origin && purchase.origin.sck) || body.sck,
      fbp: body.fbp,
      fbc: body.fbc,
      sessionId: body.sessionId,
      pixelId: extractTrackingPixelId(purchase.tracking || purchase.origin, body)
    },
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
    tracking: {
      utm_source: body.utm_source || body.src,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      utm_term: body.utm_term,
      sck: body.sck,
      fbp: body.fbp,
      fbc: body.fbc,
      sessionId: body.sessionId,
      pixelId: extractTrackingPixelId({}, body)
    },
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
    tracking: {
      utm_source: body.utm_source || (body.metadata && body.metadata.utm_source),
      utm_medium: body.utm_medium || (body.metadata && body.metadata.utm_medium),
      utm_campaign: body.utm_campaign || (body.metadata && body.metadata.utm_campaign),
      utm_content: body.utm_content || (body.metadata && body.metadata.utm_content),
      utm_term: body.utm_term || (body.metadata && body.metadata.utm_term),
      sck: body.sck || (body.metadata && body.metadata.sck),
      fbp: body.fbp,
      fbc: body.fbc,
      sessionId: body.sessionId,
      pixelId: extractTrackingPixelId(body.metadata, body)
    },
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
    tracking: {
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      utm_term: body.utm_term,
      fbp: body.fbp,
      fbc: body.fbc,
      sessionId: body.sessionId,
      pixelId: extractTrackingPixelId({}, body)
    },
    raw: body
  };
}

function parsePerfectPay(body) {
  const customer = body.customer || {};
  const tracking = body.tracking || body.metadata || body.tracking_parameters || {};

  // Status da venda no webhook Perfect Pay:
  // sale_status_enum:
  // 1 = pending / pendente / aguardando pagamento (PIX gerado, boleto pendente)
  // 2 = approved / aprovado / pago
  // 3 = in_process / em analise
  // 5 ou 6 = rejected / cancelado / recusado
  // 7 ou 8 = refunded / chargeback / devolvido
  const statusEnum = Number(body.sale_status_enum ?? body.status_enum ?? body.sale_status ?? 0);
  const rawStatusName = String(body.sale_status_name || body.sale_status || body.status || body.step || body.event || '').toLowerCase();
  
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
  const payEnum = Number(body.payment_type_enum ?? body.payment_type ?? 0);
  const rawPayName = String(body.payment_type_name || body.payment_type || body.payment_method || '').toLowerCase();
  
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

  // Extração inteligente da COMISSÃO REAL / LÍQUIDA do usuário na Perfect Pay
  let realCommission = null;

  // 1. Array body.commission
  if (Array.isArray(body.commission) && body.commission.length > 0) {
    const userComm = body.commission.find(c => {
      const typeEnum = Number(c.affiliation_type_enum);
      const val = Number(c.value ?? c.amount ?? c.commission_value ?? 0);
      return typeEnum !== 0 && val > 0;
    }) || body.commission.find(c => Number(c.value ?? c.amount ?? c.commission_value ?? 0) > 0);

    if (userComm) {
      realCommission = Number(userComm.value ?? userComm.amount ?? userComm.commission_value ?? 0);
    }
  } else if (typeof body.commission === 'object' && body.commission !== null) {
    const val = Number(body.commission.value ?? body.commission.amount ?? body.commission.commission_value ?? 0);
    if (val > 0) realCommission = val;
  }

  // 2. Campos diretos de comissão / valor líquido
  if (!realCommission || isNaN(realCommission) || realCommission <= 0) {
    const candidateFields = [
      body.commission_value,
      body.user_commission,
      body.commission_amount,
      body.my_commission,
      body.net_amount,
      body.liquid_value,
      body.affiliate_commission,
      body.producer_commission,
      body.data?.commission_value,
      body.data?.net_amount
    ];
    for (const cand of candidateFields) {
      if (cand !== undefined && cand !== null && !isNaN(Number(cand)) && Number(cand) > 0) {
        realCommission = Number(cand);
        break;
      }
    }
  }

  const grossAmount = Number(body.sale_amount || body.amount || body.value || 47.90);
  const finalAmount = (realCommission && realCommission > 0) ? realCommission : grossAmount;

  return {
    gateway: 'PerfectPay',
    orderCode: body.code || body.sale_id || body.transaction || body.id || `PP-${Date.now().toString().slice(-7)}`,
    status,
    amount: finalAmount,
    grossAmount,
    commission: realCommission || finalAmount,
    paymentMethod,
    productName: body.product_name || body.product?.name || 'Produto PerfectPay',
    customer: {
      name: customer.customer_name || customer.name || 'Cliente PerfectPay',
      email: customer.customer_email || customer.email || '',
      phone: customer.customer_phone || customer.phone || '',
      city: customer.customer_city || customer.city || '',
      state: customer.customer_state || customer.state || '',
      zip: customer.customer_zip || customer.customer_cep || customer.cep || '',
      country: 'BR'
    },
    tracking: {
      utm_source: body.utm_source || body.src || tracking.utm_source || tracking.src,
      utm_medium: body.utm_medium || tracking.utm_medium,
      utm_campaign: body.utm_campaign || tracking.utm_campaign,
      utm_content: body.utm_content || tracking.utm_content,
      utm_term: body.utm_term || tracking.utm_term,
      fbp: body.fbp || tracking.fbp,
      fbc: body.fbc || tracking.fbc,
      sessionId: body.sessionId || tracking.sessionId,
      pixelId: extractTrackingPixelId(tracking, body)
    },
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
    tracking: {
      utm_source: body.utm_source || body.src,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      utm_term: body.utm_term,
      fbp: body.fbp,
      fbc: body.fbc,
      sessionId: body.sessionId,
      pixelId: extractTrackingPixelId({}, body)
    },
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
    tracking: {
      utm_source: tracking.utm_source || body.utm_source || tracking.src || body.src,
      utm_medium: tracking.utm_medium || body.utm_medium,
      utm_campaign: tracking.utm_campaign || body.utm_campaign,
      utm_content: tracking.utm_content || body.utm_content,
      utm_term: tracking.utm_term || body.utm_term,
      fbclid: tracking.fbclid || body.fbclid,
      sck: tracking.sck || body.sck,
      fbp: tracking.fbp || tracking._fbp || body.fbp || body._fbp,
      fbc: tracking.fbc || tracking._fbc || body.fbc || body._fbc,
      sessionId: tracking.pt_sid || body.pt_sid || tracking.sessionId || body.sessionId,
      pixelId: extractTrackingPixelId(tracking, body),
      pt_meta_pixel: extractMetaPixelId(tracking, body)
    },
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
    tracking: {
      utm_source: tracking.utm_source || body.utm_source,
      utm_medium: tracking.utm_medium || body.utm_medium,
      utm_campaign: tracking.utm_campaign || body.utm_campaign,
      utm_content: tracking.utm_content || body.utm_content,
      utm_term: tracking.utm_term || body.utm_term,
      sck: tracking.sck || body.sck,
      fbp: tracking.fbp || body.fbp,
      fbc: tracking.fbc || body.fbc,
      sessionId: tracking.sessionId || body.sessionId,
      pixelId: extractTrackingPixelId(tracking, body)
    },
    raw: body
  };
}
