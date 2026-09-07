import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const initialData = {
  settings: {
    metaPixelId: "lt_px_804f84899d2a",
    metaAccessToken: "EAAB...demo_token_conversions_api",
    testEventCode: "TEST98231",
    autoCapienabled: true,
    crossSessionDays: 30,
    minEmqScore: 9.1
  },
  pixels: [
    {
      id: "lt_px_804f84899d2a",
      name: "Pixel Principal - Oferta Low Ticket",
      domain: "seusite.com.br",
      status: "active",
      emqScore: 9.3,
      eventsCount: 14280,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    }
  ],
  campaigns: [
    {
      id: "camp_01",
      utm_campaign: "esc_protetor_solar_vsl2",
      campaign_name: "[ESCALA] - Oferta Protetor Solar VSL 2",
      spend: 4820.00,
      revenue: 16980.00,
      sales: 348,
      cpa: 13.85,
      roas: 3.52,
      emqScore: 9.4,
      status: "active",
      adsets: [
        {
          id: "adset_01",
          utm_medium: "aberto_mulheres_25_54",
          adset_name: "Aberto | Mulheres 25-54 | Feed + Stories",
          spend: 2900.00,
          revenue: 10440.00,
          sales: 214,
          cpa: 13.55,
          roas: 3.60
        },
        {
          id: "adset_02",
          utm_medium: "lookalike_compradores_1pct",
          adset_name: "Lookalike 1% Compradores Últimos 90D",
          spend: 1920.00,
          revenue: 6540.00,
          sales: 134,
          cpa: 14.32,
          roas: 3.40
        }
      ],
      ads: [
        {
          id: "ad_01",
          utm_content: "vsl_gancho_dermatologista_v1",
          ad_name: "AD 01 - Gancho Dermato Revela",
          spend: 2150.00,
          revenue: 8120.00,
          sales: 167,
          cpa: 12.87,
          roas: 3.77
        },
        {
          id: "ad_02",
          utm_content: "ugc_depoimento_clara_v3",
          ad_name: "AD 02 - UGC Antes & Depois Clara",
          spend: 1640.00,
          revenue: 5540.00,
          sales: 114,
          cpa: 14.38,
          roas: 3.37
        },
        {
          id: "ad_03",
          utm_content: "comparativo_farmacia_vs_formula",
          ad_name: "AD 03 - Comparativo Farmácia vs Fórmula",
          spend: 1030.00,
          revenue: 3320.00,
          sales: 67,
          cpa: 15.37,
          roas: 3.22
        }
      ]
    },
    {
      id: "camp_02",
      utm_campaign: "teste_criativos_novos_abril",
      campaign_name: "[TESTE] - Novos Ângulos e VSL Rápida",
      spend: 1450.00,
      revenue: 4190.00,
      sales: 86,
      cpa: 16.86,
      roas: 2.89,
      emqScore: 9.1,
      status: "active",
      adsets: [],
      ads: []
    },
    {
      id: "camp_03",
      utm_campaign: "remarketing_checkout_abandonado",
      campaign_name: "[REMARKETING] - Carrinho Abandonado 7 Dias",
      spend: 850.00,
      revenue: 4890.00,
      sales: 102,
      cpa: 8.33,
      roas: 5.75,
      emqScore: 9.6,
      status: "active",
      adsets: [],
      ads: []
    }
  ],
  sessions: [
    {
      sessionId: "sess_demo_101",
      ip: "189.40.122.45",
      fbp: "fb.1.1712534820123.498213",
      fbc: "fb.1.1712534820123.IwAR39bXzY8...",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)...",
      referrer: "https://l.instagram.com/",
      landingUrl: "https://seusite.com.br/?utm_source=fb&utm_campaign=esc_protetor_solar_vsl2&utm_content=vsl_gancho_dermatologista_v1",
      utms: {
        utm_source: "facebook",
        utm_medium: "aberto_mulheres_25_54",
        utm_campaign: "esc_protetor_solar_vsl2",
        utm_content: "vsl_gancho_dermatologista_v1",
        utm_term: "ad_01"
      },
      firstSeen: new Date(Date.now() - 3600000 * 2).toISOString(),
      lastSeen: new Date(Date.now() - 1800000).toISOString()
    }
  ],
  events: [
    {
      id: "ev_1",
      eventName: "PageView",
      eventId: "ev_pv_9812739",
      sessionId: "sess_demo_101",
      pixelId: "lt_px_804f84899d2a",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      emq: 9.2,
      capiStatus: "success"
    },
    {
      id: "ev_2",
      eventName: "InitiateCheckout",
      eventId: "ev_ic_9812740",
      sessionId: "sess_demo_101",
      pixelId: "lt_px_804f84899d2a",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      emq: 9.3,
      capiStatus: "success"
    }
  ],
  orders: [
    {
      id: "ord_1001",
      orderCode: "KW-8492019",
      gateway: "Kiwify",
      productName: "Protocolo Pele de Porcelana",
      status: "approved",
      paymentMethod: "pix",
      amount: 47.90,
      customer: {
        name: "Mariana Souza Ribeiro",
        email: "mariana.ribeiro@gmail.com",
        phone: "+5511984219033",
        city: "São Paulo",
        state: "SP"
      },
      attribution: {
        campaign: "esc_protetor_solar_vsl2",
        adset: "aberto_mulheres_25_54",
        ad: "vsl_gancho_dermatologista_v1",
        source: "facebook",
        matchType: "cross_session_bio",
        fbp: "fb.1.1712534820123.498213",
        fbc: "fb.1.1712534820123.IwAR39bXzY8..."
      },
      emqScore: 9.4,
      capiSent: true,
      capiResponse: { status: 200, events_received: 1, fbtrace_id: "F28dk910zLkQ" },
      createdAt: new Date(Date.now() - 120000).toISOString()
    },
    {
      id: "ord_1002",
      orderCode: "HT-9102834",
      gateway: "Hotmart",
      productName: "Guia Anti-Melasma Definitivo",
      status: "approved",
      paymentMethod: "credit_card",
      amount: 97.00,
      customer: {
        name: "Camila Fernandes Braga",
        email: "camila.braga@outlook.com",
        phone: "+5521977321099",
        city: "Rio de Janeiro",
        state: "RJ"
      },
      attribution: {
        campaign: "esc_protetor_solar_vsl2",
        adset: "lookalike_compradores_1pct",
        ad: "ugc_depoimento_clara_v3",
        source: "facebook",
        matchType: "direct_click",
        fbp: "fb.1.17125319984.11293",
        fbc: "fb.1.17125319984.IwAR03kk29"
      },
      emqScore: 9.3,
      capiSent: true,
      capiResponse: { status: 200, events_received: 1, fbtrace_id: "A90dkl23mZ1a" },
      createdAt: new Date(Date.now() - 650000).toISOString()
    },
    {
      id: "ord_1003",
      orderCode: "ED-3981023",
      gateway: "Eduzz",
      productName: "Cronograma Facial Express",
      status: "approved",
      paymentMethod: "pix",
      amount: 39.90,
      customer: {
        name: "Beatriz Nogueira Silva",
        email: "beatriz.nogueira@hotmail.com",
        phone: "+5531992110482",
        city: "Belo Horizonte",
        state: "MG"
      },
      attribution: {
        campaign: "remarketing_checkout_abandonado",
        adset: "carrinho_7d",
        ad: "desconto_exclusivo_15off",
        source: "facebook",
        matchType: "direct_click",
        fbp: "fb.1.1712520938.9942",
        fbc: "fb.1.1712520938.IwAR89201"
      },
      emqScore: 9.5,
      capiSent: true,
      capiResponse: { status: 200, events_received: 1, fbtrace_id: "H837dmx88Qpa" },
      createdAt: new Date(Date.now() - 1450000).toISOString()
    },
    {
      id: "ord_1004",
      orderCode: "CK-7712048",
      gateway: "Cakto",
      productName: "Kit Rotina Noturna Booster",
      status: "approved",
      paymentMethod: "pix",
      amount: 67.00,
      customer: {
        name: "Fernanda Costa Albuquerque",
        email: "fernanda.albuquerque@gmail.com",
        phone: "+5541988220011",
        city: "Curitiba",
        state: "PR"
      },
      attribution: {
        campaign: "esc_protetor_solar_vsl2",
        adset: "aberto_mulheres_25_54",
        ad: "vsl_gancho_dermatologista_v1",
        source: "facebook",
        matchType: "cross_session_bio",
        fbp: "fb.1.171251994.48201",
        fbc: "fb.1.171251994.IwAR44801"
      },
      emqScore: 9.2,
      capiSent: true,
      capiResponse: { status: 200, events_received: 1, fbtrace_id: "Q29djk281L9z" },
      createdAt: new Date(Date.now() - 2800000).toISOString()
    }
  ],
  rules: [
    {
      id: "rule_01",
      name: "Alerta CPA Crítico",
      condition: "cpa > 25",
      action: "notify_whatsapp",
      status: "active",
      triggeredCount: 3,
      lastTriggered: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "rule_02",
      name: "Pausar Criativo com ROAS Ruim",
      condition: "roas < 1.4 && spend > 150",
      action: "pause_ad",
      status: "active",
      triggeredCount: 1,
      lastTriggered: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: "rule_03",
      name: "Escalar Orçamento 20%",
      condition: "roas > 3.2 && sales >= 10",
      action: "scale_budget_20pct",
      status: "active",
      triggeredCount: 5,
      lastTriggered: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ]
};

const cleanCustomerData = {
  settings: {
    metaPixelId: "",
    metaAccessToken: "",
    testEventCode: "",
    autoCapienabled: true,
    crossSessionDays: 30,
    minEmqScore: 9.1
  },
  pixels: [],
  campaigns: [],
  sessions: [],
  events: [],
  orders: [],
  rules: []
};

const demoData = {
  settings: {
    metaPixelId: "lt_px_804f84899d2a",
    metaAccessToken: "EAAB...demo_token_conversions_api",
    testEventCode: "TEST98231",
    autoCapienabled: true,
    crossSessionDays: 30,
    minEmqScore: 9.1
  },
  pixels: [
    {
      id: "lt_px_804f84899d2a",
      name: "Pixel Principal - Oferta Low Ticket",
      domain: "seusite.com.br",
      status: "active",
      emqScore: 9.3,
      eventsCount: 14280,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    }
  ],
  campaigns: [
    {
      id: "camp_01",
      utm_campaign: "esc_protetor_solar_vsl2",
      campaign_name: "[ESCALA] - Oferta Protetor Solar VSL 2",
      spend: 4820.00,
      revenue: 16980.00,
      sales: 348,
      cpa: 13.85,
      roas: 3.52,
      emqScore: 9.4,
      status: "active",
      adsets: [
        {
          id: "adset_01",
          utm_medium: "aberto_mulheres_25_54",
          adset_name: "Aberto | Mulheres 25-54 | Feed + Stories",
          spend: 2900.00,
          revenue: 10440.00,
          sales: 214,
          cpa: 13.55,
          roas: 3.60
        },
        {
          id: "adset_02",
          utm_medium: "lookalike_compradores_1pct",
          adset_name: "Lookalike 1% Compradores Últimos 90D",
          spend: 1920.00,
          revenue: 6540.00,
          sales: 134,
          cpa: 14.32,
          roas: 3.40
        }
      ],
      ads: [
        {
          id: "ad_01",
          utm_content: "vsl_gancho_dermatologista_v1",
          ad_name: "AD 01 - Gancho Dermato Revela",
          spend: 2150.00,
          revenue: 8120.00,
          sales: 167,
          cpa: 12.87,
          roas: 3.77
        },
        {
          id: "ad_02",
          utm_content: "ugc_depoimento_clara_v3",
          ad_name: "AD 02 - UGC Antes & Depois Clara",
          spend: 1640.00,
          revenue: 5540.00,
          sales: 114,
          cpa: 14.38,
          roas: 3.37
        },
        {
          id: "ad_03",
          utm_content: "comparativo_farmacia_vs_formula",
          ad_name: "AD 03 - Comparativo Farmácia vs Fórmula",
          spend: 1030.00,
          revenue: 3320.00,
          sales: 67,
          cpa: 15.37,
          roas: 3.22
        }
      ]
    }
  ],
  sessions: [],
  events: [],
  orders: [],
  rules: []
};

class Store {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.save(cleanCustomerData);
    }
  }

  read() {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error("Erro ao ler banco de dados:", err);
      return cleanCustomerData;
    }
  }

  save(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error("Erro ao gravar no banco de dados:", err);
      return false;
    }
  }

  get(key) {
    const data = this.read();
    return data[key];
  }

  set(key, val) {
    const data = this.read();
    data[key] = val;
    this.save(data);
    return val;
  }

  append(key, item) {
    const data = this.read();
    if (!Array.isArray(data[key])) {
      data[key] = [];
    }
    data[key].unshift(item);
    this.save(data);
    return item;
  }

  resetToClean() {
    this.save(cleanCustomerData);
    return cleanCustomerData;
  }

  loadDemo() {
    this.save(demoData);
    return demoData;
  }
}

export const db = new Store();

