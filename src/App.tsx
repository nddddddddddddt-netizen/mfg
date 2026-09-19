import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { LiveDashboard } from './components/LiveDashboard.tsx';
import { AccountsManager } from './components/AccountsManager.tsx';
import { CampaignsHub } from './components/CampaignsHub.tsx';
import { WebSocketCenter } from './components/WebSocketCenter.tsx';
import { TelegramSimulatorModal } from './components/TelegramSimulatorModal.tsx';
import { AddAccountModal } from './components/AddAccountModal.tsx';
import { OrdersModal } from './components/OrdersModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { api } from './services/api.ts';
import {
  SystemStatus,
  Account,
  GlobalDashboardSnapshot,
  DailyProjection,
  Campaign,
  WsEvent,
} from './types/tikspark';

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dashboard, setDashboard] = useState<GlobalDashboardSnapshot | null>(null);
  const [projections, setProjections] = useState<DailyProjection | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [wsEvents, setWsEvents] = useState<WsEvent[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState(false);

  // Chart & live activity states
  const [chartHistory, setChartHistory] = useState<Array<{ time: string; reqPerMin: number; coinsPerMin: number }>>([]);
  const [liveActivity, setLiveActivity] = useState<
    Array<{ id: string; username: string; coinsGained: number; success: boolean; orderId: string; time: string }>
  >([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [ordersModalAccount, setOrdersModalAccount] = useState<Account | null>(null);

  // Fetch initial & recurring data
  const refreshAll = useCallback(async () => {
    try {
      const [statusData, accountsData, dashData, projData, campData, wsData] = await Promise.all([
        api.getStatus().catch(() => null),
        api.getAccounts().catch(() => []),
        api.getDashboard().catch(() => null),
        api.getProjections().catch(() => null),
        api.getCampaigns().catch(() => []),
        api.getWsEvents(30).catch(() => []),
      ]);

      if (statusData) setStatus(statusData);
      if (accountsData) setAccounts(accountsData);
      if (dashData) {
        setDashboard(dashData);
        updateChartPoint(dashData);
      }
      if (projData) setProjections(projData);
      if (campData) setCampaigns(campData);
      if (wsData) setWsEvents(wsData);
    } catch (e) {
      console.error('Refresh error:', e);
    }
  }, []);

  const updateChartPoint = (dash: GlobalDashboardSnapshot) => {
    const timeStr = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setChartHistory((prev) => {
      const next = [...prev, { time: timeStr, reqPerMin: dash.totalReqPerMin, coinsPerMin: dash.totalCoinsPerMin }];
      return next.slice(-25);
    });
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 4000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Server-Sent Events (SSE) for Real-Time Event Stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/stream/events');

      eventSource.addEventListener('dashboard_tick', (e) => {
        try {
          const dash: GlobalDashboardSnapshot = JSON.parse(e.data);
          setDashboard(dash);
          updateChartPoint(dash);
        } catch {
          // Ignore
        }
      });

      eventSource.addEventListener('farming_action', (e) => {
        try {
          const data = JSON.parse(e.data);
          setLiveActivity((prev) => {
            const newAct = {
              id: crypto.randomUUID(),
              username: data.username,
              coinsGained: data.coinsGained,
              success: data.success,
              orderId: data.orderId,
              time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            };
            return [newAct, ...prev].slice(0, 30);
          });
        } catch {
          // Ignore
        }
      });

      eventSource.addEventListener('ws_notification', (e) => {
        try {
          const data: WsEvent = JSON.parse(e.data);
          setWsEvents((prev) => [data, ...prev].slice(0, 50));
        } catch {
          // Ignore
        }
      });
    } catch {
      // SSE not supported or errored
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Handlers
  const handleGlobalStart = async () => {
    setIsLoading(true);
    try {
      await api.startGlobalFarming();
      await refreshAll();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGlobalStop = async () => {
    setIsLoading(true);
    try {
      await api.stopGlobalFarming();
      await refreshAll();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartAccountFarm = async (id: number) => {
    try {
      await api.startAccountFarming(id);
      await refreshAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStopAccountFarm = async (id: number) => {
    try {
      await api.stopAccountFarming(id);
      await refreshAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRefreshAccount = async (id: number) => {
    await api.refreshAccount(id);
    await refreshAll();
  };

  const handleToggleAccount = async (id: number) => {
    await api.toggleAccount(id);
    await refreshAll();
  };

  const handleDeleteAccount = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الحساب؟')) return;
    await api.deleteAccount(id);
    await refreshAll();
  };

  const handleClearAllAccounts = async () => {
    if (!window.confirm('تحذير: هل أنت متأكد من حذف جميع الحسابات المسجلة بالكامل؟')) return;
    await api.clearAllAccounts();
    await refreshAll();
  };

  const handleExportActions = () => {
    window.open('/api/export/actions.csv', '_blank');
  };

  const handleToggleWs = async () => {
    await api.toggleWs();
    await refreshAll();
  };

  const handleReconnectWs = async () => {
    await api.reconnectWs();
    await refreshAll();
  };

  const handleClearSkips = async () => {
    const res = await api.clearSkips();
    alert(`تم مسح ${res.count || 0} طلب من قائمة التخطي.`);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* Navbar */}
      <Navbar
        status={status}
        onGlobalStart={handleGlobalStart}
        onGlobalStop={handleGlobalStop}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenCampaignModal={() => setActiveTab('campaigns')}
        onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onExportActions={handleExportActions}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <LiveDashboard
            dashboard={dashboard}
            projections={projections}
            liveActivity={liveActivity}
            chartHistory={chartHistory}
            onStartGlobal={handleGlobalStart}
            onStopGlobal={handleGlobalStop}
            onStartAccount={handleStartAccountFarm}
            onStopAccount={handleStopAccountFarm}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsManager
            accounts={accounts}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onRefreshAccount={handleRefreshAccount}
            onToggleAccount={handleToggleAccount}
            onDeleteAccount={handleDeleteAccount}
            onStartFarm={handleStartAccountFarm}
            onStopFarm={handleStopAccountFarm}
            onViewOrders={(acc) => setOrdersModalAccount(acc)}
            onClearAll={handleClearAllAccounts}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsHub
            accounts={accounts}
            campaigns={campaigns}
            onLaunchCampaign={api.launchCampaign}
            onRefreshCampaigns={refreshAll}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'websocket' && (
          <WebSocketCenter
            wsEnabled={status?.config.ws_enabled ?? true}
            activeCount={status?.wsActiveCount ?? 0}
            events={wsEvents}
            onToggleWs={handleToggleWs}
            onReconnectWs={handleReconnectWs}
            onRefreshEvents={refreshAll}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'telegram' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl text-center">
            <h2 className="text-base font-bold text-white mb-2">محاكي بوت تيليجرام التفاعلي</h2>
            <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto">
              يمكنك التفاعل المباشر مع البوت من خلال النافذة التفاعلية بدون مغادرة المتصفح.
            </p>
            <button
              onClick={() => setIsTelegramModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400"
            >
              فتح شات البوت التفاعلي الآن
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAccountAdded={refreshAll}
      />

      <TelegramSimulatorModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />

      <OrdersModal
        account={ordersModalAccount}
        isOpen={Boolean(ordersModalAccount)}
        onClose={() => setOrdersModalAccount(null)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onClearSkips={handleClearSkips}
        onClearAllAccounts={handleClearAllAccounts}
      />
    </div>
  );
}
