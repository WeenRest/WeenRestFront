// Push Notifications Service
class PushNotificationService {
  constructor() {
    // Normalize base URL (some pages store it with leading/trailing spaces)
    this.apiBase = (localStorage.getItem('api_origin') || localStorage.getItem('apiBase') || ' https://weenrest-001-site1.jtempurl.com').trim();
    this.subscription = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.init();
  }

  async init() {
    if (!this.isSupported) {
      console.log('Push notifications are not supported in this browser');
      return;
    }

    // Web Push requires HTTPS (except localhost)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      console.warn('Push notifications require HTTPS (except localhost).');
    }

    try {
      // Register service worker
      let registration;
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (e) {
        // Fallback for sub-path hosting
        registration = await navigator.serviceWorker.register('sw.js');
      }
      console.log('Service Worker registered:', registration);

      // Check for existing subscription
      this.subscription = await registration.pushManager.getSubscription();
      
      // Update subscription status in UI
      this.updateUIBadge();
      this.ensureGlobalWidget();

      // Listen for subscription changes
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'subscription-updated') {
          this.updateUIBadge();
        }
      });
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  async requestPermission() {
    if (!this.isSupported) {
      return { granted: false, error: 'غير مدعوم في هذا المتصفح' };
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        return { granted: true };
      } else if (permission === 'denied') {
        return { granted: false, error: 'تم رفض الإذن. يرجى تفعيل الإشعارات من إعدادات المتصفح' };
      } else {
        return { granted: false, error: 'تم إلغاء الإذن' };
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      return { granted: false, error: 'حدث خطأ في طلب الإذن' };
    }
  }

  async subscribe() {
    if (!this.isSupported) {
      return { success: false, error: 'غير مدعوم في هذا المتصفح' };
    }

    try {
      // Request permission first
      const permissionResult = await this.requestPermission();
      if (!permissionResult.granted) {
        return permissionResult;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from server
      const vapidResponse = await fetch(`${this.apiBase}/api/PushNotifications/vapid-public-key`);
      if (!vapidResponse.ok) {
        throw new Error('فشل في الحصول على مفتاح VAPID');
      }
      // API returns AdminResponse<object> with Data: { publicKey }
      const vapidJson = await vapidResponse.json();
      const publicKey =
        vapidJson?.publicKey ||
        vapidJson?.data?.publicKey ||
        vapidJson?.Data?.publicKey;
      if (!publicKey) {
        throw new Error('مفتاح VAPID غير موجود في استجابة الخادم');
      }

      // Convert VAPID key from base64 to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(publicKey);

      // Subscribe to push notifications
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // Send subscription to server
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiBase}/api/PushNotifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint,
          p256dh: this.arrayBufferToBase64(this.subscription.getKey('p256dh')),
          auth: this.arrayBufferToBase64(this.subscription.getKey('auth'))
        })
      });

      if (!response.ok) {
        throw new Error('فشل في حفظ الاشتراك');
      }

      this.updateUIBadge();
      return { success: true, message: 'تم تفعيل الإشعارات بنجاح' };
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return { success: false, error: error.message || 'حدث خطأ في تفعيل الإشعارات' };
    }
  }

  async unsubscribe() {
    if (!this.isSupported || !this.subscription) {
      return { success: false, error: 'لا يوجد اشتراك نشط' };
    }

    try {
      // Unsubscribe from push manager
      await this.subscription.unsubscribe();

      // Remove subscription from server
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiBase}/api/PushNotifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint
        })
      });

      if (!response.ok) {
        console.warn('Failed to remove subscription from server');
      }

      this.subscription = null;
      this.updateUIBadge();
      return { success: true, message: 'تم إلغاء تفعيل الإشعارات' };
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return { success: false, error: error.message || 'حدث خطأ في إلغاء الإشعارات' };
    }
  }

  async checkSubscription() {
    if (!this.isSupported) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.getSubscription();
      return this.subscription !== null;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  updateUIBadge() {
    // Update any UI elements that show notification status
    const badges = document.querySelectorAll('.notification-badge');
    badges.forEach(badge => {
      if (this.subscription) {
        badge.classList.add('active');
        badge.setAttribute('title', 'الإشعارات مفعلة');
      } else {
        badge.classList.remove('active');
        badge.setAttribute('title', 'الإشعارات غير مفعلة');
      }
    });
  }

  // Helper: Convert base64 URL to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Helper: Convert ArrayBuffer to base64
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  ensureGlobalWidget() {
    if (document.getElementById('pushWidget')) return;

    const widget = document.createElement('button');
    widget.id = 'pushWidget';
    widget.type = 'button';
    widget.title = 'تفعيل/إلغاء إشعارات المتصفح';
    widget.style.cssText = [
      'position:fixed',
      'bottom:16px',
      'left:16px',
      'z-index:99999',
      'width:48px',
      'height:48px',
      'border-radius:9999px',
      'border:1px solid rgba(0,0,0,0.15)',
      'background:#111',
      'color:#fbbf24',
      'box-shadow:0 10px 25px rgba(0,0,0,0.25)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'cursor:pointer'
    ].join(';');
    widget.innerHTML = this.subscription ? '🔔' : '🔕';

    const updateIcon = async () => {
      const subscribed = await this.checkSubscription();
      widget.innerHTML = subscribed ? '🔔' : '🔕';
      widget.title = subscribed ? 'الإشعارات مفعلة - اضغط لإلغاء' : 'الإشعارات غير مفعلة - اضغط للتفعيل';
    };

    widget.addEventListener('click', async () => {
      try {
        const subscribed = await this.checkSubscription();
        const result = subscribed ? await this.unsubscribe() : await this.subscribe();
        const msg = result.message || result.error;
        if (msg && typeof window.showToast === 'function') {
          window.showToast(msg, result.success ? 'success' : 'error');
        }
        await updateIcon();
      } catch (e) {
        if (typeof window.showToast === 'function') window.showToast('حدث خطأ في الإشعارات', 'error');
      }
    });

    document.body.appendChild(widget);
    updateIcon();
  }
}

// Create global instance
window.pushNotificationService = new PushNotificationService();

// Auto-subscribe on page load if user is logged in and permission was previously granted
window.addEventListener('load', async () => {
  const token = localStorage.getItem('token');
  if (token && window.pushNotificationService.isSupported) {
    const permission = Notification.permission;
    if (permission === 'granted') {
      const isSubscribed = await window.pushNotificationService.checkSubscription();
      if (!isSubscribed) {
        // Silently try to subscribe (don't show error if it fails)
        window.pushNotificationService.subscribe().catch(() => {});
      }
    }
  }
});

