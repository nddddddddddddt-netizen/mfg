import React from 'react';
import {
  Zap,
  Coins,
  Radio,
  Play,
  Square,
  Plus,
  Send,
  Bot,
  Settings,
  Download,
  Flame,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SystemStatus } from '../types/tikspark';

interface NavbarProps {
  status: SystemStatus | null;
  onGlobalStart: () => void;
  onGlobalStop: () => void;
  onOpenAddModal: () => void;
  onOpenCampaignModal: () => void;
  onOpenTelegramModal: () => void;
  onOpenSettingsModal: () => void;
  onExportActions: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  onGlobalStart,
  onGlobalStop,
  onOpenAddModal,
  onOpenCampaignModal,
  onOpenTelegramModal,
  onOpenSettingsModal,
  onExportActions,
  activeTab,
  setActiveTab,
  isLoading,
}) => {
  const isFarming = status?.isFarming || (status?.activeFarmingCount ?? 0) > 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-md">
      {/* Top Banner & Quick Metrics */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 font-black text-slate-950 shadow-lg shadow-amber-500/20">
              <Zap className="h-5 w-5 fill-slate-950" />
              {isFarming && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">TikSpark</span>
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                  PRO v3.2
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {status?.migrationPing ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> السيرفر متصل
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <AlertCircle className="h-3 w-3" /> جاري التحقق...
                  </span>
                )}
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Radio className={`h-3 w-3 ${status?.wsActiveCount ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                  {status?.wsActiveCount ?? 0} WS
                </span>
              </div>
            </div>
          </div>

          {/* Quick Real-time Stat Pills */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Total Points */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-1.5">
              <Coins className="h-4 w-4 text-amber-400" />
              <div className="text-right">
                <p className="text-[10px] font-medium text-slate-400 leading-none">إجمالي النقاط</p>
                <p className="text-sm font-bold text-white leading-tight font-mono">
                  {(status?.totalScore ?? 0).toLocaleString()} 🪙
                </p>
              </div>
            </div>

            {/* Active Accounts */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
              <div className="text-right">
                <p className="text-[10px] font-medium text-slate-400 leading-none">الحسابات</p>
                <p className="text-sm font-bold text-white leading-tight">
                  <span className="text-emerald-400">{status?.activeFarmingCount ?? 0} نشط</span> / {status?.accountsCount ?? 0}
                </p>
              </div>
            </div>

            {/* Peak Stats */}
            {Boolean(status?.peakTotalReqPerMin && status.peakTotalReqPerMin > 0) && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
                <Flame className="h-4 w-4 text-amber-400" />
                <div className="text-right">
                  <p className="text-[10px] font-medium text-amber-400/80 leading-none">أعلى ذروة</p>
                  <p className="text-xs font-bold text-amber-300 leading-tight font-mono">
                    {status?.peakTotalReqPerMin} طلب/د
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Global Farm Toggle */}
            {isFarming ? (
              <button
                id="btn-global-stop"
                onClick={onGlobalStop}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 px-3.5 py-2 text-xs font-bold text-rose-400 transition hover:bg-rose-500/25 active:scale-95 disabled:opacity-50"
              >
                <Square className="h-3.5 w-3.5 fill-rose-400" />
                <span>إيقاف التجميع</span>
              </button>
            ) : (
              <button
                id="btn-global-start"
                onClick={onGlobalStart}
                disabled={isLoading || (status?.accountsCount ?? 0) === 0}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition hover:from-amber-400 hover:to-amber-300 active:scale-95 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-slate-950" />
                <span>تجميع الكل</span>
              </button>
            )}

            {/* Launch Campaign */}
            <button
              id="btn-nav-campaign"
              onClick={onOpenCampaignModal}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 active:scale-95"
            >
              <Send className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">حملة جماعية</span>
            </button>

            {/* Add Account */}
            <button
              id="btn-nav-add-account"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">إضافة حساب</span>
            </button>

            {/* Telegram Bot Simulator */}
            <button
              id="btn-nav-telegram"
              onClick={onOpenTelegramModal}
              title="محاكي بوت تيليجرام التفاعلي"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 transition hover:bg-sky-500/20 active:scale-95"
            >
              <Bot className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-sky-400"></span>
            </button>

            {/* CSV Export */}
            <button
              id="btn-nav-export"
              onClick={onExportActions}
              title="تصدير سجل العمليات CSV"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:bg-slate-800 active:scale-95"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* Settings */}
            <button
              id="btn-nav-settings"
              onClick={onOpenSettingsModal}
              title="الإعدادات والأسعار"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:bg-slate-800 active:scale-95"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800/50 scrollbar-none">
          <button
            id="tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            لوحة المراقبة الحية
          </button>

          <button
            id="tab-accounts"
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'accounts'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            إدارة الحسابات ({status?.accountsCount ?? 0})
          </button>

          <button
            id="tab-campaigns"
            onClick={() => setActiveTab('campaigns')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            الحملات الجماعية
          </button>

          <button
            id="tab-websocket"
            onClick={() => setActiveTab('websocket')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'websocket'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            مركز WebSocket
          </button>

          <button
            id="tab-telegram"
            onClick={() => setActiveTab('telegram')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'telegram'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            شات بوت تيليجرام التفاعلي
          </button>
        </div>
      </div>
    </header>
  );
};
