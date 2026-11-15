// Base64 VAPID public key'i Uint8Array formatına dönüştüren yardımcı fonksiyon
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Telefonda veya tarayıcıda bildirim izni isteyip abone olma
export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert("Tarayıcınız veya bu mod push bildirimlerini desteklemiyor.");
    return false;
  }

  try {
    // 1. Önce iOS Safari için açıkça bildirim izni penceresini tetikliyoruz
    if (typeof window.Notification !== 'undefined') {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        alert("Bildirim izni kullanıcı tarafından reddedildi.");
        return false;
      }
    }

    const registration = await navigator.serviceWorker.ready;
    
    // 2. Backend'den VAPID public key'i çekiyoruz
    const res = await fetch('/api/push/public-key');
    const data = await res.json();
    
    if (!data.public_key) {
      throw new Error("VAPID public key alınamadı.");
    }

    const convertedKey = urlBase64ToUint8Array(data.public_key);

    // 3. Tarayıcı üzerinden push aboneliği oluşturuyoruz
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    // 4. Aboneliği backend'e gönderip kaydediyoruz
    const subRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    if (subRes.ok) {
      alert("Bildirimler başarıyla aktif edildi! Artık anlık uyarı alabileceksiniz.");
      return true;
    } else {
      throw new Error("Abonelik sunucuya kaydedilemedi.");
    }
  } catch (err) {
    console.error("Push aboneliği başarısız:", err);
    alert("Bildirim izni alınamadı: " + (err.message || err));
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
      alert("Test bildirimi gönderildi! Cihazınızı kontrol edin.");
    } else {
      alert("Test bildirimi gönderilemedi: " + (data.detail || "Bilinmeyen hata"));
    }
  } catch (err) {
    console.error("Test bildirimi hatası:", err);
  }
}
