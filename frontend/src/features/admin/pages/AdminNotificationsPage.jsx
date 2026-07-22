import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { safeNavigate } from '../../../routes/navigation.js';
import { ArrowLeft, Trash2, Eye, EyeOff, Bell, AlertCircle, AlertTriangle, CreditCard, MailCheck, Megaphone, UserPlus } from 'lucide-react';
import { AdminLayout } from '../AdminLayout.jsx';

export function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'expiry_3day',
      title: 'Subscription Expiring in 3 Days',
      message: 'User "Acme Corp" subscription expires in 3 days',
      relatedUser: 'Acme Corp',
      read: false,
      createdAt: new Date(),
    },
    {
      id: 2,
      type: 'new_user',
      title: 'New User Registration',
      message: 'New user "John Doe" registered',
      relatedUser: 'John Doe',
      read: false,
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: 3,
      type: 'expiry_1day',
      title: 'Subscription Expiring Tomorrow',
      message: 'User "Tech Solutions" subscription expires tomorrow',
      relatedUser: 'Tech Solutions',
      read: true,
      createdAt: new Date(Date.now() - 7200000),
    },
    {
      id: 4,
      type: 'reminder_sent',
      title: 'Renewal Reminder Sent',
      message: 'Renewal reminder sent to "Global Enterprises"',
      relatedUser: 'Global Enterprises',
      read: true,
      createdAt: new Date(Date.now() - 86400000),
    },
  ]);

  function getNotificationMeta(type) {
    const meta = {
      expiry_1day: { icon: AlertTriangle, iconClass: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40' },
      expiry_2day: { icon: AlertTriangle, iconClass: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/40' },
      expiry_3day: { icon: AlertTriangle, iconClass: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40' },
      new_user: { icon: UserPlus, iconClass: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/40' },
      reminder_sent: { icon: MailCheck, iconClass: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/40' },
      payment: { icon: CreditCard, iconClass: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/40' },
    };
    return meta[type] || { icon: Megaphone, iconClass: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800' };
  }

  function getNotificationColor(type) {
    const colors = {
      expiry_1day: 'border-l-red-500 bg-red-50 dark:bg-red-950/20',
      expiry_2day: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20',
      expiry_3day: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20',
      new_user: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
      reminder_sent: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
      payment: 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20',
    };
    return colors[type] || 'border-l-slate-500 bg-slate-50 dark:bg-slate-950/20';
  }

  function toggleRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  }

  function deleteNotification(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 md:py-5">
          <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => safeNavigate(navigate, '/admin')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition border-0 bg-transparent cursor-pointer"
                title="Back to Dashboard"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="m-0 text-lg md:text-2xl font-extrabold flex items-center gap-2">
                  <Bell size={24} /> Notifications
                </h1>
                <p className="m-0 text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {notifications.length} total | {unreadCount} unread
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {notifications.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center">
              <AlertCircle size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <h3 className="m-0 text-lg font-bold text-slate-600 dark:text-slate-300">No Notifications</h3>
              <p className="m-0 text-sm text-slate-500 dark:text-slate-400 mt-2">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const { icon: NotificationIcon, iconClass } = getNotificationMeta(notification.type);
                return (
                <div
                  key={notification.id}
                  className={`bg-white dark:bg-slate-900 border-l-4 rounded-lg p-4 md:p-5 flex items-start justify-between gap-4 ${getNotificationColor(
                    notification.type
                  )} ${!notification.read ? 'ring-1 ring-blue-200 dark:ring-blue-800' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ${iconClass}`}><NotificationIcon size={18} /></span>
                      <h3 className="m-0 font-bold text-slate-900 dark:text-slate-100">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                      )}
                    </div>
                    <p className="m-0 text-sm text-slate-600 dark:text-slate-300">
                      {notification.message}
                    </p>
                    <p className="m-0 text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleRead(notification.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-0 bg-transparent cursor-pointer transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title={notification.read ? 'Mark unread' : 'Mark as read'}
                    >
                      {notification.read ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 border-0 bg-transparent cursor-pointer transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AdminLayout>
  );
}
