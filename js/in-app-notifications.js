// In-App Notifications Service - Live via SignalR
class InAppNotificationService {
    constructor() {
        this.apiBase = (localStorage.getItem('apiBase') || localStorage.getItem('api_origin') || 'https://localhost:5053').trim().replace(/\/$/, '');
        this.hubUrl = (this.apiBase.replace(/\/api$/, '') || this.apiBase) + '/hubs/notifications';
        this.unreadCount = 0;
        this.notifications = [];
        this.pollInterval = null;
        this.pollIntervalMs = 60000; // 60 seconds fallback (live via SignalR is primary)
        this.connection = null;
        this.init();
    }

    init() {
        const token = localStorage.getItem('token');
        if (!token) return;

        this.createNotificationBell();
        this.createToastContainer();

        this.loadNotifications();
        this.updateUnreadCount();

        this.connectSignalR();
        this.startPolling();
    }

    connectSignalR() {
        if (typeof signalR === 'undefined') {
            console.warn('SignalR not loaded - notifications will use polling only');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(this.hubUrl, {
                    accessTokenFactory: () => token
                })
                .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
                .configureLogging(signalR.LogLevel.Warning)
                .build();

            this.connection.on('ReceiveNotification', (notification) => {
                this.handleLiveNotification(notification);
            });

            this.connection.start()
                .then(() => console.log('🔔 SignalR connected - live notifications enabled'))
                .catch(err => console.warn('SignalR connection failed, using polling:', err));
        } catch (err) {
            console.warn('SignalR init error:', err);
        }
    }

    handleLiveNotification(notification) {
        if (!notification || !notification.id) return;

        const normalized = {
            id: notification.id,
            title: notification.title || '',
            body: notification.body || '',
            type: notification.type || 'general',
            url: notification.url || null,
            data: notification.data || null,
            isRead: false,
            createdAt: notification.createdAt || new Date().toISOString(),
            readAt: null
        };

        this.notifications = [normalized, ...this.notifications.filter(n => n.id !== normalized.id)];
        this.unreadCount = (this.unreadCount || 0) + 1;

        this.showToast(normalized.title, normalized.body);
        this.updateBadge();
        this.renderNotifications();
    }

    createNotificationBell() {
        if (document.getElementById('notificationBell')) return;

        const bell = document.createElement('div');
        bell.id = 'notificationBell';
        bell.className = 'notification-bell-container';
        bell.innerHTML = `
            <button id="notificationBellBtn" class="notification-bell-btn" title="الإشعارات">
                <i class="fas fa-bell"></i>
                <span id="notificationBadge" class="notification-badge hidden">0</span>
            </button>
            <div id="notificationDropdown" class="notification-dropdown hidden">
                <div class="notification-dropdown-header">
                    <h3>الإشعارات</h3>
                    <button id="markAllReadBtn" class="mark-all-read-btn">تحديد الكل كمقروء</button>
                </div>
                <div id="notificationList" class="notification-list">
                    <div class="notification-loading">جاري التحميل...</div>
                </div>
                <div class="notification-dropdown-footer">
                    <a href="#" id="viewAllNotifications" class="view-all-link">عرض الكل</a>
                </div>
            </div>
        `;

        // Try to place inside the dedicated slot first
        const slot = document.getElementById('notification-bell-slot');
        if (slot) {
            slot.appendChild(bell);
        } else {
            // Fallback: place inside user-info as first child
            const userInfo = document.getElementById('user-info');
            if (userInfo && !userInfo.classList.contains('hidden')) {
                userInfo.insertBefore(bell, userInfo.firstChild);
            } else {
                const header = document.querySelector('header .container');
                if (header) {
                    const nav = header.querySelector('nav');
                    if (nav) {
                        nav.parentNode.insertBefore(bell, nav.nextSibling);
                    } else {
                        header.appendChild(bell);
                    }
                } else {
                    document.body.appendChild(bell);
                }
            }
        }

        document.getElementById('notificationBellBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        document.getElementById('markAllReadBtn').addEventListener('click', () => this.markAllAsRead());

        document.addEventListener('click', (e) => {
            if (!bell.contains(e.target)) this.closeDropdown();
        });
    }

    createToastContainer() {
        if (document.getElementById('toastContainer')) return;
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    async loadNotifications(refresh = false) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${this.apiBase}/api/notifications/in-app?page=1&pageSize=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load notifications');

            const result = await response.json();
            if (result.success) {
                this.notifications = result.data || [];
                this.renderNotifications();

                if (refresh) {
                    const newUnread = this.notifications.filter(n => !n.isRead);
                    if (newUnread.length > 0) this.showToast(newUnread[0].title, newUnread[0].body);
                }
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            const list = document.getElementById('notificationList');
            if (list) list.innerHTML = '<div class="notification-error">حدث خطأ في تحميل الإشعارات</div>';
        }
    }

    renderNotifications() {
        const list = document.getElementById('notificationList');
        if (!list) return;

        if (this.notifications.length === 0) {
            list.innerHTML = '<div class="notification-empty">لا توجد إشعارات</div>';
            return;
        }

        list.innerHTML = this.notifications.map(n => `
            <div class="notification-item ${n.isRead ? '' : 'unread'}" data-id="${n.id}">
                <div class="notification-content">
                    <h4 class="notification-title">${this.escapeHtml(n.title)}</h4>
                    <p class="notification-body">${this.escapeHtml(n.body)}</p>
                    <span class="notification-time">${this.formatTime(n.createdAt)}</span>
                </div>
                <div class="notification-actions">
                    ${!n.isRead ? '<button class="mark-read-btn" title="تحديد كمقروء"><i class="fas fa-check"></i></button>' : ''}
                    <button class="delete-notification-btn" title="حذف"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAsRead(parseInt(btn.closest('.notification-item').dataset.id));
            });
        });

        list.querySelectorAll('.delete-notification-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNotification(parseInt(btn.closest('.notification-item').dataset.id));
            });
        });

        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.notification-actions')) return;
                const id = parseInt(item.dataset.id);
                const n = this.notifications.find(x => x.id === id);
                if (n && n.url) window.location.href = n.url;
                else if (n && !n.isRead) this.markAsRead(id);
            });
        });
    }

    async updateUnreadCount() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${this.apiBase}/api/notifications/in-app/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.unreadCount = result.count || 0;
                    this.updateBadge();
                }
            }
        } catch (error) {
            console.error('Error updating unread count:', error);
        }
    }

    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;

        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    async markAsRead(id) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${this.apiBase}/api/notifications/in-app/${id}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const n = this.notifications.find(x => x.id === id);
                if (n) {
                    n.isRead = true;
                    n.readAt = new Date().toISOString();
                }
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.renderNotifications();
                this.updateBadge();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${this.apiBase}/api/notifications/in-app/mark-all-read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.notifications.forEach(n => { n.isRead = true; n.readAt = new Date().toISOString(); });
                this.unreadCount = 0;
                this.renderNotifications();
                this.updateBadge();
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }

    async deleteNotification(id) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${this.apiBase}/api/notifications/in-app/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const n = this.notifications.find(x => x.id === id);
                this.notifications = this.notifications.filter(x => x.id !== id);
                if (n && !n.isRead) this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.renderNotifications();
                this.updateBadge();
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    }

    toggleDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;

        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            this.loadNotifications();
        }
    }

    closeDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) dropdown.classList.add('hidden');
    }

    showToast(title, body) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-content">
                <h4 class="toast-title">${this.escapeHtml(title)}</h4>
                <p class="toast-body">${this.escapeHtml(body)}</p>
            </div>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);

        const autoRemove = setTimeout(() => this.removeToast(toast), 5000);

        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeToast(toast);
        });

        toast.addEventListener('click', (e) => {
            if (!e.target.classList.contains('toast-close')) {
                this.toggleDropdown();
                this.removeToast(toast);
            }
        });
    }

    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }

    startPolling() {
        this.pollInterval = setInterval(() => this.updateUnreadCount(), this.pollIntervalMs);
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        if (days < 7) return `منذ ${days} يوم`;
        return date.toLocaleDateString('ar-EG');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.inAppNotificationService = new InAppNotificationService();
    });
} else {
    window.inAppNotificationService = new InAppNotificationService();
}
