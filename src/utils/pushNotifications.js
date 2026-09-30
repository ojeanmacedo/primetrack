// Utilitário para inscrição de Web Push no iOS Safari e Navegadores

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Service Worker registrado com sucesso:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('[SW] Falha ao registrar Service Worker:', err);
    }
  }
  return null;
}

export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Notificações push não suportadas neste navegador.');
  }

  // Permissão
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação negada.');
  }

  // 1. Garante que o Service Worker está registrado e pronto
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }
  const registration = await navigator.serviceWorker.ready;

  // 2. Busca VAPID public key do servidor
  const keyRes = await fetch('/api/push/vapid-public-key');
  const { publicKey } = await keyRes.json();
  if (!publicKey) throw new Error('Chave VAPID pública não encontrada.');

  const convertedVapidKey = urlBase64ToUint8Array(publicKey);

  // 3. Força a renovação da inscrição com a chave VAPID atual da Apple
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    try {
      await subscription.unsubscribe();
    } catch(e){}
  }

  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey
  });

  // 4. Envia subscription para o backend com isolamento de usuário
  let currentUserId = null;
  try {
    const rawUser = localStorage.getItem('primetrack_current_user');
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser);
      if (parsedUser?.id) currentUserId = parsedUser.id;
    }
  } catch(e) {}

  const subPayload = {
    ...(subscription.toJSON ? subscription.toJSON() : JSON.parse(JSON.stringify(subscription))),
    userId: currentUserId || 'usr_1788826403159'
  };

  const subRes = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(currentUserId ? { 'x-user-id': currentUserId } : {})
    },
    body: JSON.stringify(subPayload)
  });

  if (!subRes.ok) {
    throw new Error('Servidor não conseguiu registrar a inscrição push.');
  }

  return subscription;
}
