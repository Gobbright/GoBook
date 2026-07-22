import { Bell, Trash2, Eye, EyeOff, AlertCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function NotificationCenter({ notifications = [], onMarkRead, onDelete, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState(notifications);

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const unreadCount = localNotifications.filter((n) => !n.read).length;

  async function handleMarkRead(id) {
    await onMarkRead?.(id);
    setLocalNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  async function handleDelete(id) {
    await onDelete?.(id);
    setLocalNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition border-0 bg-transparent cursor-pointer"
        title="Notifications"
      >
        <Bell size={20} className="text-slate-600 dark:text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-5 w-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] max-h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="m-0 font-bold text-slate-900 dark:text-slate-100">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 cursor-pointer"
              title="Close notifications"
            >
              <X size={16} />
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {localNotifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {localNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                      !notification.read
                        ? 'bg-blue-50 dark:bg-blue-950/20'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="m-0 font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                          )}
                        </div>
                        <p className="m-0 text-[12px] text-slate-600 dark:text-slate-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="m-0 text-[11px] text-slate-500 dark:text-slate-500 mt-1">
                          {new Date(notification.createdAt).toLocaleString('en-IN')}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleMarkRead(notification.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-0 bg-transparent cursor-pointer transition"
                          title={notification.read ? 'Mark unread' : 'Mark as read'}
                        >
                          {notification.read ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-300 border-0 bg-transparent cursor-pointer transition"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {localNotifications.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={onRefresh}
                className="w-full text-center text-[12px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 py-2 rounded transition border-0 bg-transparent cursor-pointer"
              >
                Refresh Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
