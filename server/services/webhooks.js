/**
 * Parsers de Webhooks para Plataformas de Pagamento Brasileiras & Globais
 */

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
  const statusRaw = body.order_status || body.status || 'paid';
  
  let status = 'approved';
  if (['waiting_payment', 'pending'].includes(statusRaw)) status = 'waiting_payment';
  if (['refunded', 'chargeback'].includes(statusRaw)) status = 'refunded';

  return {
    gateway: 'Kiwify',
    orderCode: body.order_id || body.order_code || `KW-${Date.now().toString().slice(-7)}`,
    status,
    amount: Number(body.order_amount || body.amount || 0) / (body.order_amount > 1000 ? 100 : 1) || 97.00,
    paymentMethod: body.payment_method || 'pix',
    productName: (body.Product && body.Product.product_name) || body.product_name || 'Produto Kiwify',
    customer: {
      name: customer.full_name || customer.name || 'Cliente Kiwify',
      email: customer.email || '',
      phone: customer.mobile || customer.phone || '',
      city: customer.city || (customer.address && customer.address.city) || '',
      state: customer.state || (customer.address && customer.address.state) || ''
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
      sessionId: tracking.sessionId || body.sessionId
    },
    raw: body
  };
}

function parseHotmart(body) {
  const data = body.data || body;
  const buyer = data.buyer || {};
  const purchase = data.purchase || {};
  const product = data.product || {};
  const event = body.event || '';

  let status = 'approved';
  if (event === 'PURCHASE_OUT_OF_DATE' || event === 'WAITING_PAYMENT') status = 'waiting_payment';
  if (event === 'PURCHASE_REFUNDED' || event === 'PURCHASE_CHARGEBACK') status = 'refunded';

  return {
    gateway: 'Hotmart',
    orderCode: purchase.transaction || body.transaction || `HT-${Date.now().toString().slice(-7)}`,
    status,
    amount: purchase.price ? Number(purchase.price.value || purchase.price) : 97.00,
    paymentMethod: (purchase.payment && purchase.payment.type) || 'credit_card',
    productName: product.name || 'Produto Hotmart',
    customer: {
      name: buyer.name || 'Cliente Hotmart',
      email: buyer.email || '',
      phone: (buyer.checkout_phone) || (buyer.phone) || '',
      city: (buyer.address && buyer.address.city) || '',
      state: (buyer.address && buyer.address.state) || ''
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
      sessionId: body.sessionId
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
      state: customer.state || body.client_state || ''
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
      sessionId: body.sessionId
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
      city: customer.city || '',
      state: customer.state || ''
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
      sessionId: body.sessionId
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
      city: customer.city || '',
      state: customer.state || ''
    },
    tracking: {
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      utm_term: body.utm_term,
      fbp: body.fbp,
      fbc: body.fbc,
      sessionId: body.sessionId
    },
    raw: body
  };
}

function parsePerfectPay(body) {
  const customer = body.customer || {};
  return {
    gateway: 'PerfectPay',
    orderCode: body.code || body.sale_id || `PP-${Date.now().toString().slice(-7)}`,
    status: body.sale_status_enum === 2 ? 'approved' : 'approved',
    amount: Number(body.sale_amount || 47.90),
    paymentMethod: body.payment_type_enum === 2 ? 'pix' : 'credit_card',
    productName: body.product_name || 'Produto PerfectPay',
    customer: {
      name: customer.customer_name || 'Cliente PerfectPay',
      email: customer.customer_email || '',
      phone: customer.customer_phone || '',
      city: customer.customer_city || '',
      state: customer.customer_state || ''
    },
    tracking: {
      utm_source: body.utm_source || body.src,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      utm_term: body.utm_term,
      fbp: body.fbp,
      fbc: body.fbc,
      sessionId: body.sessionId
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
      state: client.client_state || ''
    },
    tracking: {
      utm_source: body.utm_source || body.src,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      utm_term: body.utm_term,
      fbp: body.fbp,
      fbc: body.fbc,
      sessionId: body.sessionId
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
    body.name || 'Cliente MonsterPay';

  const rawAmount = body.amount || body.total || body.price || body.value || body.data?.amount || 97.00;
  const numAmount = Number(rawAmount);
  const finalAmount = numAmount > 1000 && !String(rawAmount).includes('.') ? numAmount / 100 : numAmount;

  return {
    gateway: 'MonsterPay',
    orderCode: body.order_id || body.transaction_id || body.id || body.code || body.data?.id || `MP-${Date.now().toString().slice(-7)}`,
    status,
    amount: finalAmount || 97.00,
    paymentMethod: body.payment_method || body.paymentMethod || body.data?.payment_method || 'pix',
    productName: product.name || body.product_name || body.productName || body.data?.product_name || 'Produto MonsterPay',
    customer: {
      name: customerName,
      email: customer.email || body.email || body.data?.email || '',
      phone: customer.phone || customer.mobile || customer.cellphone || body.phone || '',
      city: customer.city || (customer.address && customer.address.city) || '',
      state: customer.state || (customer.address && customer.address.state) || ''
    },
    tracking: {
      utm_source: tracking.utm_source || body.utm_source || tracking.src || body.src,
      utm_medium: tracking.utm_medium || body.utm_medium,
      utm_campaign: tracking.utm_campaign || body.utm_campaign,
      utm_content: tracking.utm_content || body.utm_content,
      utm_term: tracking.utm_term || body.utm_term,
      sck: tracking.sck || body.sck,
      fbp: tracking.fbp || body.fbp,
      fbc: tracking.fbc || body.fbc,
      sessionId: tracking.sessionId || body.sessionId
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
      sessionId: tracking.sessionId || body.sessionId
    },
    raw: body
  };
}
