// Base64 VAPID public key'i güvenli bir şekilde Uint8Array formatına dönüştüren fonksiyon
function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== 'string' || base64String.trim().startsWith('<')) {
    throw new Error("Sunucudan geçerli bir VAPID anahtarı alınamadı (API yanıtı geçersiz).");
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

// Telefonda veya tarayıcıda bildirim izni isteyip abone olma
export async function subscribeUserToPush() {
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    alert("HATA: Push bildirimleri yalnızca HTTPS üzerinden çalışır!");
    return false;
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert("Tarayıcınız veya bu mod push bildirimlerini desteklemiyor.");
    return false;
  }

  try {
    // 1. iOS Safari için bildirim izni isteme
    if (typeof window.Notification !== 'undefined') {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        alert("Bildirim izni reddedildi. (Durum: " + permission + ")");
        return false;
      }
    }

    const registration = await navigator.serviceWorker.ready;
    
    // 2. Backend'den VAPID public key'i çekme
    const res = await fetch('/api/push/public-key');
    const textData = await res.text();
    
    let data;
    try {
      data = JSON.parse(textData);
    } catch (e) {
      throw new Error("API JSON yerine HTML döndürdü. Endpoint adresi hatalı olabilir.");
    }
    
    if (!data.public_key) {
      throw new Error("Backend yanıtında public_key bulunamadı.");
    }

    const convertedKey = urlBase64ToUint8Array(data.public_key);

    // 3. Tarayıcı üzerinden push aboneliği oluşturma
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    // 4. Aboneliği backend'e kaydetme
    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    if (subRes.ok) {
      alert("Bildirimler başarıyla aktif edildi!");
      return true;
    } else {
      throw new Error("Abonelik sunucuya kaydedilemedi.");
    }
  } catch (err) {
    console.error("Push aboneliği başarısız:", err);
    alert("Hata detayı: " + (err.message || err));
    return false;
  }
}

// Test bildirimi tetikleme fonksiyonu
export async function sendTestNotification(message = "Epochveras test bildirimi çalışıyor!") {
  try {
    const res = await fetch('/api/push/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Test bildirimi gönderildi!");
    } else {
      alert("Test gönderilemedi: " + (data.detail || "Bilinmeyen hata"));
    }
  } catch (err) {
    console.error("Test bildirimi hatası:", err);
    alert("Test isteği gönderilemedi: " + err.message);
  }
}
