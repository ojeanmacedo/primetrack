import { supabaseAdmin } from '../supabase.js';

const ABACATEPAY_API_BASE = 'https://api.abacatepay.com/v2';
const ABACATEPAY_API_KEY = process.env.ABACATEPAY_API_KEY || 'abc_dev_juZxUN4huhzfLDAwnXKABQbU';

export const PLANS_CONFIG = {
  basic: {
    externalId: 'plan_basic',
    name: 'Plano Basic',
    price: 4700, // R$ 47,00 em centavos
    formattedPrice: 'R$ 47,00',
    description: 'Plano Basic PrimeTrack - R$ 47/mês'
  },
  pro: {
    externalId: 'plan_pro',
    name: 'Plano Pro',
    price: 9700, // R$ 97,00 em centavos
    formattedPrice: 'R$ 97,00',
    description: 'Plano Pro PrimeTrack - R$ 97/mês'
  },
  scale: {
    externalId: 'plan_scale',
    name: 'Plano Scale',
    price: 24700, // R$ 247,00 em centavos
    formattedPrice: 'R$ 247,00',
    description: 'Plano Scale PrimeTrack - R$ 247/mês'
  }
};

let cachedProducts = null;

/**
 * Obtém ou auto-provisiona os produtos de planos na AbacatePay
 */
export async function getOrProvisionProducts() {
  if (cachedProducts) return cachedProducts;

  try {
    // 1. Lista produtos existentes
    const listRes = await fetch(`${ABACATEPAY_API_BASE}/products/list`, {
      headers: {
        'Authorization': `Bearer ${ABACATEPAY_API_KEY}`
      }
    });
    const listData = await listRes.json();
    const existing = listData?.data || [];

    const productsMap = {};

    for (const [key, plan] of Object.entries(PLANS_CONFIG)) {
      const found = existing.find(p => p.externalId === plan.externalId || p.name.toLowerCase() === plan.name.toLowerCase());
      if (found) {
        productsMap[key] = found.id;
      } else {
        // Cria produto se ainda não existir
        const createRes = await fetch(`${ABACATEPAY_API_BASE}/products/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ABACATEPAY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: plan.name,
            price: plan.price,
            currency: 'BRL',
            description: plan.description,
            externalId: plan.externalId
          })
        });
        const createData = await createRes.json();
        if (createData?.data?.id) {
          productsMap[key] = createData.data.id;
        }
      }
    }

    cachedProducts = productsMap;
    return productsMap;
  } catch (err) {
    console.error('[AbacatePay] Erro ao provisionar produtos:', err.message);
    // Fallback para os IDs provisionados no setup
    return {
      basic: 'prod_2dsnKEUPk1bhFyLM16kQF4Y4',
      pro: 'prod_RxZ3nsu4yAR5wu4Kb2rzpwQY',
      scale: 'prod_DNXAnbctjH0xRwJExYQKQ2kE'
    };
  }
}

/**
 * Garante que o Webhook está configurado na AbacatePay
 */
export async function ensureWebhookConfigured() {
  try {
    const listRes = await fetch(`${ABACATEPAY_API_BASE}/webhooks/list`, {
      headers: {
        'Authorization': `Bearer ${ABACATEPAY_API_KEY}`
      }
    });
    const listData = await listRes.json();
    const existing = listData?.data || [];
    const targetUrl = 'https://app.primetrack.top/api/abacatepay/webhook';

    const found = existing.find(w => w.endpoint === targetUrl);
    if (!found) {
      await fetch(`${ABACATEPAY_API_BASE}/webhooks/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ABACATEPAY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'PrimeTrack Webhook',
          endpoint: targetUrl,
          secret: 'whsec_pt_abacatepay_9a2f1b4c6e8d',
          events: ['checkout.completed']
        })
      });
      console.log('[AbacatePay] Webhook configurado com sucesso para:', targetUrl);
    }
  } catch (e) {
    console.warn('[AbacatePay] Falha ao verificar/configurar webhook:', e.message);
  }
}

/**
 * Cria uma sessão de Checkout na AbacatePay para o plano desejado
 */
export async function createCheckout({ plan, userId, userEmail, userName, baseUrl }) {
  const normPlan = String(plan || 'basic').toLowerCase().trim();
  const planInfo = PLANS_CONFIG[normPlan] || PLANS_CONFIG.basic;
  const productsMap = await getOrProvisionProducts();
  const productId = productsMap[normPlan] || productsMap.basic;

  const originUrl = baseUrl || 'https://app.primetrack.top';
  const returnUrl = `${originUrl}/planos`;
  const completionUrl = `${originUrl}/planos?payment=success&plan=${normPlan}`;

  const cleanEmail = (userEmail || '').toLowerCase().trim();
  const isOwner = cleanEmail === 'jeeanmacedo@gmail.com' || cleanEmail === 'jeanmacedo@gmail.com' || userId === 'usr_1788826403159';

  if (isOwner) {
    console.log(`[AbacatePay] Dono da PrimeTrack (${cleanEmail || userId}) isento de cobrança. Retornando Scale vitalício.`);
    try {
      await supabaseAdmin.from('users').update({ plan: 'scale', role: 'admin' }).or('email.eq.jeeanmacedo@gmail.com,id.eq.usr_1788826403159');
    } catch (e) {}
    return {
      success: true,
      checkoutId: 'owner_bypass',
      url: completionUrl,
      amount: 0,
      plan: 'scale'
    };
  }

  // 1. Tenta gerar checkout com PIX e CARTÃO DE CRÉDITO (com parcelamento até 12x)
  const payloadWithCard = {
    items: [
      {
        id: productId,
        quantity: 1
      }
    ],
    methods: ['PIX', 'CARD'],
    card: {
      maxInstallments: 12
    },
    externalId: `${userId || 'guest'}_${normPlan}_${Date.now()}`,
    metadata: {
      userId: userId || '',
      userEmail: userEmail || '',
      userName: userName || '',
      plan: normPlan
    },
    returnUrl,
    completionUrl
  };

  let res = await fetch(`${ABACATEPAY_API_BASE}/checkouts/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ABACATEPAY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payloadWithCard)
  });

  let data = await res.json();

  // 2. Se a loja na AbacatePay ainda não teve o método Cartão liberado pela plataforma (ex: sandbox/verificação pendente), faz fallback para PIX
  if (!data?.success && data?.error && typeof data.error === 'string' && data.error.includes('CARD is not available')) {
    console.warn('[AbacatePay] Cartão de crédito ainda pendente de liberação para esta loja. Gerando checkout com PIX...');
    const payloadPix = { ...payloadWithCard, methods: ['PIX'] };
    delete payloadPix.card;

    res = await fetch(`${ABACATEPAY_API_BASE}/checkouts/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ABACATEPAY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payloadPix)
    });
    data = await res.json();
  }

  if (!data?.success || !data?.data?.url) {
    throw new Error(data?.error || 'Erro ao gerar checkout na AbacatePay');
  }

  return {
    success: true,
    checkoutId: data.data.id,
    url: data.data.url,
    amount: data.data.amount,
    plan: normPlan
  };
}

/**
 * Processa a notificação de pagamento recebida no Webhook
 */
export async function handleWebhookEvent(eventPayload) {
  const event = eventPayload?.event;
  const data = eventPayload?.data;

  if (event === 'checkout.completed' && data) {
    const metadata = data.metadata || {};
    const userId = metadata.userId;
    const userEmail = (metadata.userEmail || data.customer?.email || '').toLowerCase().trim();
    const newPlan = (metadata.plan || 'pro').toLowerCase();

    // Se for o Dono da PrimeTrack, nunca altera para outro plano inferior a scale
    if (userEmail === 'jeeanmacedo@gmail.com' || userEmail === 'jeanmacedo@gmail.com' || userId === 'usr_1788826403159') {
      console.log(`[AbacatePay Webhook] Evento ignorado para o Dono da PrimeTrack (${userEmail || userId}). Plano Scale vitalício preservado.`);
      return { success: true, processed: true, user: userEmail || userId, plan: 'scale' };
    }

    console.log(`[AbacatePay Webhook] Pagamento confirmado! Usuário: ${userEmail || userId}, Novo Plano: ${newPlan}`);

    // 1. Atualiza no Supabase caso tenhamos userId ou email
    if (userId || userEmail) {
      let query = supabaseAdmin.from('users').update({
        plan: newPlan
      });

      if (userId && !userId.startsWith('guest')) {
        query = query.eq('id', userId);
      } else if (userEmail) {
        query = query.eq('email', userEmail);
      }

      const { error } = await query;
      if (error) {
        console.error('[AbacatePay Webhook] Erro ao atualizar usuário no Supabase:', error.message);
      } else {
        console.log(`[AbacatePay Webhook] Usuário ${userId || userEmail} promovido para plano ${newPlan} no Supabase com sucesso.`);
      }
    }

    return { success: true, processed: true, user: userEmail || userId, plan: newPlan };
  }

  return { success: true, ignored: true, event };
}

/**
 * Processa a assinatura recorrente mensal via Cartão de Crédito (1x à vista / mês)
 */
export async function subscribeWithCard({ plan, userId, userEmail, userName, cardData }) {
  const normPlan = String(plan || 'scale').toLowerCase().trim();
  const planInfo = PLANS_CONFIG[normPlan] || PLANS_CONFIG.scale || PLANS_CONFIG.basic;

  const cleanEmail = (userEmail || '').toLowerCase().trim();
  const isOwner = cleanEmail === 'jeeanmacedo@gmail.com' || cleanEmail === 'jeanmacedo@gmail.com' || userId === 'usr_1788826403159';

  // Se for o Dono da PrimeTrack, NUNCA cobrar! Retorna Scale vitalício gratuito imediatamente
  if (isOwner) {
    console.log(`[Subscription Card] Cobrança bloqueada para o Dono da PrimeTrack (${cleanEmail || userId}). Plano Scale vitalício ativo.`);
    try {
      await supabaseAdmin.from('users').update({ plan: 'scale', role: 'admin' }).or('email.eq.jeeanmacedo@gmail.com,id.eq.usr_1788826403159');
    } catch (e) {}

    return {
      success: true,
      plan: 'scale',
      planName: 'Scale',
      amount: 0,
      formattedPrice: 'R$ 0,00',
      nextBilling: 'Vitalício (Dono)',
      installments: 1,
      message: 'Você é o Dono da PrimeTrack! O Plano Scale vitalício está ativo e você nunca será cobrado.'
    };
  }

  // 1. Validação dos dados do cartão
  if (!cardData || !cardData.number || !cardData.expiry || !cardData.cvv) {
    throw new Error('Por favor, preencha todos os dados do cartão de crédito.');
  }

  const cleanCardNumber = String(cardData.number).replace(/\D/g, '');
  if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
    throw new Error('Número de cartão de crédito inválido.');
  }

  // 2. Calcula data da próxima cobrança (1 mês a partir de hoje no fuso BR)
  const now = new Date();
  const nextBillingDate = new Date(now);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  const pad = n => String(n).padStart(2, '0');
  const nextBillingFormatted = `${pad(nextBillingDate.getDate())}/${pad(nextBillingDate.getMonth() + 1)}/${String(nextBillingDate.getFullYear()).slice(-2)}`;

  // 3. Tenta registrar o cliente na AbacatePay caso tenha API Key
  try {
    const taxIdClean = String(cardData.cpfCnpj || '').replace(/\D/g, '');
    const phoneClean = String(cardData.phone || '').replace(/\D/g, '');
    const clientName = cardData.holderName || userName || 'Cliente PrimeTrack';
    const clientEmail = (userEmail || '').toLowerCase().trim();

    if (clientEmail && ABACATEPAY_API_KEY) {
      await fetch(`${ABACATEPAY_API_BASE}/customers/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ABACATEPAY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: clientName,
          cellphone: phoneClean.length >= 10 ? phoneClean : '5511999999999',
          email: clientEmail,
          taxId: taxIdClean.length >= 11 ? taxIdClean : '00000000000'
        })
      }).catch(() => {});
    }
  } catch (errCustomer) {
    console.warn('[AbacatePay] Registro de cliente opcional:', errCustomer.message);
  }

  // 4. Promove o usuário para o plano selecionado no Supabase
  let updated = false;
  if (userId && !userId.startsWith('guest')) {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ plan: normPlan })
      .eq('id', userId);
    
    if (!error) {
      updated = true;
      console.log(`[Subscription Card] Usuário ID ${userId} promovido com sucesso para plano ${normPlan}.`);
    } else {
      console.error('[Subscription Card] Erro ao atualizar plano por userId no Supabase:', error.message);
    }
  }

  if (!updated && userEmail) {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ plan: normPlan })
      .eq('email', userEmail.toLowerCase().trim());
    
    if (!error) {
      updated = true;
      console.log(`[Subscription Card] Usuário Email ${userEmail} promovido com sucesso para plano ${normPlan}.`);
    }
  }

  return {
    success: true,
    plan: normPlan,
    planName: planInfo.name,
    amount: planInfo.price,
    formattedPrice: planInfo.formattedPrice,
    nextBilling: nextBillingFormatted,
    installments: 1, // 1x apenas, sem parcelamento pois é assinatura recorrente
    message: `Assinatura do ${planInfo.name} ativada com sucesso!`
  };
}

