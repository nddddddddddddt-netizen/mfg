import {
  Account,
  GlobalDashboardSnapshot,
  SystemStatus,
  Campaign,
  WsEvent,
  TikSparkOrder,
  DailyProjection,
} from '../types/tikspark';

export const api = {
  // Status
  getStatus: async (): Promise<SystemStatus> => {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('فشل جلب حالة النظام');
    return res.json();
  },

  // Accounts
  getAccounts: async (): Promise<Account[]> => {
    const res = await fetch('/api/accounts');
    if (!res.ok) throw new Error('فشل جلب الحسابات');
    return res.json();
  },

  loginAccount: async (username: string, password: string): Promise<{ success: boolean; account: Account }> => {
    const res = await fetch('/api/accounts/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل تسجيل الدخول');
    return data;
  },

  refreshAccount: async (id: number): Promise<{ success: boolean; account: Account }> => {
    const res = await fetch(`/api/accounts/${id}/refresh`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل تحديث الحساب');
    return data;
  },

  toggleAccount: async (id: number): Promise<{ success: boolean; account: Account }> => {
    const res = await fetch(`/api/accounts/${id}/toggle`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل تبديل حالة الحساب');
    return data;
  },

  deleteAccount: async (id: number): Promise<boolean> => {
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  },

  clearAllAccounts: async (): Promise<boolean> => {
    const res = await fetch('/api/accounts/clear', { method: 'POST' });
    const data = await res.json();
    return data.success;
  },

  // Farming
  getDashboard: async (): Promise<GlobalDashboardSnapshot> => {
    const res = await fetch('/api/farm/dashboard');
    if (!res.ok) throw new Error('فشل جلب لوحة التجميع');
    return res.json();
  },

  startGlobalFarming: async (options?: { workers?: number; target?: number; runtime?: number }) => {
    const res = await fetch('/api/farm/global/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل تشغيل التجميع');
    return data;
  },

  stopGlobalFarming: async () => {
    const res = await fetch('/api/farm/global/stop', { method: 'POST' });
    return res.json();
  },

  startAccountFarming: async (id: number, options?: { workers?: number; target?: number; runtime?: number }) => {
    const res = await fetch(`/api/farm/account/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل بدء تجميع الحساب');
    return data;
  },

  stopAccountFarming: async (id: number) => {
    const res = await fetch(`/api/farm/account/${id}/stop`, { method: 'POST' });
    return res.json();
  },

  // Analytics
  getProjections: async (accountId?: number): Promise<DailyProjection | null> => {
    const url = accountId ? `/api/analytics/projections?accountId=${accountId}` : '/api/analytics/projections';
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  },

  getPeaks: async () => {
    const res = await fetch('/api/analytics/peaks');
    if (!res.ok) throw new Error('فشل جلب إحصائيات الذروة');
    return res.json();
  },

  // Orders & Campaigns
  getOrders: async (accountId: number): Promise<TikSparkOrder[]> => {
    const res = await fetch(`/api/orders/${accountId}`);
    if (!res.ok) throw new Error('فشل جلب طلبات الحساب');
    return res.json();
  },

  getCampaigns: async (): Promise<Campaign[]> => {
    const res = await fetch('/api/campaigns');
    if (!res.ok) throw new Error('فشل جلب الحملات');
    return res.json();
  },

  launchCampaign: async (params: {
    type: string;
    target: string;
    total_amount?: number;
    mode?: 'auto' | 'fixed';
  }) => {
    const res = await fetch('/api/campaigns/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل إطلاق الحملة');
    return data;
  },

  // Settings
  getSettings: async () => {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('فشل جلب الإعدادات');
    return res.json();
  },

  updateSettings: async (settings: any) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  clearSkips: async () => {
    const res = await fetch('/api/settings/clear-skips', { method: 'POST' });
    return res.json();
  },

  // WebSocket
  getWsEvents: async (limit = 40): Promise<WsEvent[]> => {
    const res = await fetch(`/api/ws/events?limit=${limit}`);
    if (!res.ok) return [];
    return res.json();
  },

  toggleWs: async () => {
    const res = await fetch('/api/ws/toggle', { method: 'POST' });
    return res.json();
  },

  reconnectWs: async () => {
    const res = await fetch('/api/ws/reconnect', { method: 'POST' });
    return res.json();
  },

  // Telegram Bridge
  telegramInteract: async (payload: { chatId?: string; message?: string; callbackData?: string }) => {
    const res = await fetch('/api/telegram/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};
