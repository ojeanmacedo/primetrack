// Utilitário seguro para localStorage que evita QuotaExceededError
export function safeStorageSet(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringVal);
  } catch (err) {
    console.warn(`[safeStorageSet] Quota exceeded on key "${key}", clearing temporary caches...`);
    try {
      // Limpa chaves volumosas de cache
      const keysToClear = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('primetrack_cached_') ||
           k.startsWith('primetrack_period_') ||
           k.startsWith('primetrack_meta_') ||
           k.includes('_cached_campaigns')) &&
          k !== key
        ) {
          keysToClear.push(k);
        }
      }
      keysToClear.forEach(k => localStorage.removeItem(k));

      // Tenta gravar novamente após a limpeza
      const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringVal);
    } catch (e2) {
      console.error(`[safeStorageSet] Could not save even after cache cleanup:`, e2);
    }
  }
}

export function safeStorageGet(key, fallback = null) {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const val = localStorage.getItem(key);
    if (!val) return fallback;
    return JSON.parse(val);
  } catch (e) {
    return localStorage.getItem(key) || fallback;
  }
}
