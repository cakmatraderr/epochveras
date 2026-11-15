// Base64 VAPID public key'i güvenli bir şekilde Uint8Array formatına dönüştüren fonksiyon
function urlBase64ToUint8Array(base64String) {
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
  // 1. HTTPS ve Push Desteği Kontrolü
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    alert("HATA: Push bildirimleri yalnızca HTTPS (güvenli) bağlantılar üzerinden çalışır! Mevcut protokol: " + window.location.protocol);
    return false;
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert("Tarayıcınız veya bu mod push bildirimlerini desteklemiyor.");
    return false;
  }

  try {
    // 2. iOS Safari için açıkça bildirim izni isteme
    if (typeof window.Notification !== 'undefined') {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        alert("Bildirim izni kullanıcı tarafından reddedildi veya verilmedi. (Durum: " + permission + ")");
        return false;
      }
    }

    const registration = await navigator.serviceWorker.ready;
    
    // 3. Backend'den VAPID public key'i çekme
    const res = await fetch('/api/push/public-key');
    const data = await res.json();
    
    if (!data.public_key) {
      throw new Error("Backend'den VAPID public key alınamadı.");
    }

    const convertedKey = urlBase64ToUint8Array(data.public_key);

    // 4. Tarayıcı üzerinden push aboneliği oluşturma
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    // 5. Aboneliği backend'e kaydetme
    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    if (subRes.ok) {
      alert("Bildirimler başarıyla aktif edildi!");
      return true;
    } else {
      throw new Error("Abonelik sunucuya kaydedilemedi (Sunucu hatası).");
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
