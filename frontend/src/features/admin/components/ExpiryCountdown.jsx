import { Bell, Clock } from 'lucide-react';
import { useState } from 'react';

export function ExpiryCountdown({ user, onSendReminder }) {
  const [sending, setSending] = useState(false);

  function getDaysUntilExpiry() {
    if (!user.subscriptionEndDate) return null;
    const endDate = new Date(user.subscriptionEndDate);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return daysLeft;
  }

  function getExpiryStatus() {
    const daysLeft = getDaysUntilExpiry();
    if (daysLeft === null) return null;
    if (daysLeft <= 0) return { status: 'expired', label: 'EXPIRED', color: 'bg-red-600' };
    if (daysLeft === 1) return { status: '1day', label: '1 Day Left', color: 'bg-red-500' };
    if (daysLeft === 2) return { status: '2days', label: '2 Days Left', color: 'bg-orange-500' };
    if (daysLeft === 3) return { status: '3days', label: '3 Days Left', color: 'bg-amber-500' };
    return null;
  }

  async function handleSendReminder() {
    setSending(true);
    try {
      await onSendReminder(user);
    } catch (err) {
      console.error('Error sending reminder:', err);
    } finally {
      setSending(false);
    }
  }

  const expiryStatus = getExpiryStatus();
  if (!expiryStatus) return null;

  return (
    <div className={`${expiryStatus.color} text-white rounded-lg p-3 flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <Clock size={18} />
        <span className="font-bold text-sm">{expiryStatus.label}</span>
      </div>
      <button
        onClick={handleSendReminder}
        disabled={sending}
        className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-bold border-0 cursor-pointer transition disabled:opacity-50"
      >
        <Bell size={14} />
        {sending ? 'Sending...' : 'Send Reminder'}
      </button>
    </div>
  );
}
