// src/lib/pushService.js

/**
 * VAPID public anahtarını Base64 URL formatından tarayıcının (özellikle iOS Safari'nin) 
 * zorunlu koştuğu 65 baytlık P-256 Uint8Array formatına dönüştürür.
 */
function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error("Geçersiz VAPID anahtarı formatı.");
  }
  
  let cleaned = base64String.trim().replace(/^["'](.+)["']$/, '$1').replace(/['"]+/g, '');
  const padding = '='.repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/');
  
  let rawData;
  try {
    rawData = window.atob(base64);
  } catch (e) {
    throw new Error("Base64 çözülemedi.");
  }

  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  // iOS Safari P-256 standardı uyumluluğu (64 baytsa başına 0x04 ekle)
  if (outputArray.length === 64) {
    const paddedArray = new Uint8Array(65);
    paddedArray[0] = 0x04;
    paddedArray.set(outputArray, 1);
    return paddedArray;
  }

  if (outputArray.length === 65 && outputArray[0] !== 0x04) {
    outputArray[0] = 0x04;
  }

  return outputArray;
}

/**
 * Backend'den VAPID public key'i çeker ve push aboneliğini başlatır.
 */
export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error("Bu tarayıcı Web Push bildirimlerini desteklemiyor.");
  }

  const registration = await navigator.serviceWorker.ready;
  
  const response = await fetch('/api/push/public-key');
  if (!response.ok) {
    throw new Error("VAPID public key sunucudan alınamadı.");
  }
  
  const data = await response.json();
  const rawPublicKey = data.public_key;
  
  const convertedVapidKey = urlBase64ToUint8Array(rawPublicKey);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey
  });

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  });

  return subscription;
}

/**
 * Backend'e test bildirimi tetiklemesi için istek gönderir.
 */
export async function sendTestNotification(message = "Epochveras test bildirimi başarılı!") {
  const response = await fetch('/api/push/send-test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error("Test bildirimi gönderilemedi.");
  }

  return await response.json();
}
