import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Separator } from '../components/ui/separator';
import { Bell, Calendar, Stethoscope, PawPrint, Check, CheckCheck } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:8000';
const API = 'http://localhost:8000/api';

export default function NotificationBell() {
  const { user, token } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [open, setOpen] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchReminders = useCallback(async () => {
    if (!token || !user || user.role !== 'user') return;
    try {
      const res = await axios.get(`${API}/reminders/user`, { headers });
      setReminders(res.data.reminders);
    } catch (err) { /* silent */ }
  }, [token, user]);

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 30000);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  const unreadCount = reminders.filter(r => !r.is_read).length;

  const dismiss = async (id) => {
    try {
      await axios.put(`${API}/reminders/${id}/dismiss`, {}, { headers });
      setReminders(prev => prev.map(r => r.id === id ? { ...r, is_read: true } : r));
    } catch (err) { /* silent */ }
  };

  const dismissAll = async () => {
    try {
      await axios.put(`${API}/reminders/dismiss-all`, {}, { headers });
      setReminders(prev => prev.map(r => ({ ...r, is_read: true })));
    } catch (err) { /* silent */ }
  };

  if (!user || user.role !== 'user') return null;

  const isOverdue = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d <= today;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''} overdue`;
    if (diff <= 7) return `In ${diff} days`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-xl hover:bg-[#F4F1DE] transition-colors" data-testid="notification-bell">
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-[#E07A5F]' : 'text-[#4A5568]'}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-[#E07A5F] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse" data-testid="notification-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 rounded-2xl shadow-xl border-[#E2E8F0]" align="end" data-testid="notification-dropdown">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
          <h3 className="font-bold text-[#1E392A] text-sm" style={{ fontFamily: 'Outfit' }}>
            Follow-up Reminders
          </h3>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={dismissAll} className="text-xs text-[#81B29A] h-7 px-2 gap-1" data-testid="dismiss-all-btn">
              <CheckCheck className="h-3 w-3" /> Dismiss All
            </Button>
          )}
        </div>

        {/* Reminder List */}
        <div className="max-h-[360px] overflow-y-auto">
          {reminders.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="h-8 w-8 text-[#E2E8F0] mx-auto mb-2" />
              <p className="text-sm text-[#718096]">No reminders yet</p>
            </div>
          ) : (
            reminders.map((r) => (
              <div
                key={r.id}
                className={`px-4 py-3 border-b border-[#E2E8F0] last:border-0 transition-colors ${r.is_read ? 'bg-white opacity-60' : 'bg-[#F4F1DE]/40'}`}
                data-testid={`reminder-item-${r.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isOverdue(r.follow_up_date) && !r.is_read ? 'bg-[#E07A5F]/10' : 'bg-[#81B29A]/10'}`}>
                    <Calendar className={`h-4 w-4 ${isOverdue(r.follow_up_date) && !r.is_read ? 'text-[#E07A5F]' : 'text-[#81B29A]'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <PawPrint className="h-3 w-3 text-[#E07A5F]" />
                      <span className="font-semibold text-[#1E392A] text-sm">{r.pet_name}</span>
                    </div>
                    <p className="text-xs text-[#4A5568] leading-relaxed">{r.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1">
                        <Stethoscope className="h-3 w-3 text-[#718096]" />
                        <span className="text-[10px] text-[#718096]">{r.doctor_name}</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isOverdue(r.follow_up_date) && !r.is_read
                          ? 'bg-[#E07A5F]/10 text-[#E07A5F]'
                          : 'bg-[#81B29A]/10 text-[#81B29A]'
                      }`}>
                        {formatDate(r.follow_up_date)}
                      </span>
                    </div>
                  </div>
                  {!r.is_read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(r.id); }}
                      className="p-1 rounded-lg hover:bg-[#81B29A]/10 transition-colors flex-shrink-0"
                      title="Dismiss"
                      data-testid={`dismiss-reminder-${r.id}`}
                    >
                      <Check className="h-4 w-4 text-[#81B29A]" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
