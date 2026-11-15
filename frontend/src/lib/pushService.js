function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error("Geçersiz VAPID anahtarı formatı.");
  }
  const cleaned = base64String.trim().replace(/['"]+/g, '');
  const padding = '='.repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const getApiUrl = (endpoint) => {
  const EXTERNAL_BACKEND = 'https://epochveras.onrender.com'; 

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://localhost:8000${endpoint}`;
  }
  return `${EXTERNAL_BACKEND}${endpoint}`;
};

export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert("Tarayıcınız push bildirimlerini desteklemiyor.");
    return false;
  }

  try {
    if (typeof window.Notification !== 'undefined') {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        alert("Bildirim izni reddedildi.");
        return false;
      }
    }

    const registration = await navigator.serviceWorker.ready;
    
    const res = await fetch(getApiUrl('/api/push/public-key'), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    
    const textData = await res.text();
    if (textData.trim().startsWith('<')) {
      throw new Error("Backend HTML döndürdü.");
    }
    
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(textData);
    } catch (e) {
      jsonResponse = { public_key: textData.trim() };
    }

    // Backend'den gelebilecek farklı anahtar isimlerini otomatik yakala
    const rawKey = jsonResponse.public_key || jsonResponse.key || jsonResponse.vapid_public_key;
    if (!rawKey) {
      throw new Error("Public key bulunamadı. Yanıt: " + textData);
    }

    const convertedKey = urlBase64ToUint8Array(rawKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    const subRes = await fetch(getApiUrl('/api/push/subscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(subscription),
      cache: 'no-store'
    });

    if (subRes.ok) {
      alert("Bildirimler başarıyla aktif edildi!");
      return true;
    } else {
      throw new Error("Abonelik sunucuya kaydedilemedi.");
    }
  } catch (err) {
    console.error("Push hatası:", err);
    alert("Hata detayı: " + err.message);
    return false;
  }
}

export async function sendTestNotification(message = "Epochveras test bildirimi!") {
  try {
    const res = await fetch(getApiUrl('/api/push/send-test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ message }),
      cache: 'no-store'
    });
    
    if (!res.ok) throw new Error("Test gönderilemedi.");
    alert("Test bildirimi gönderildi!");
  } catch (err) {
    alert("Hata: " + err.message);
  }
}
