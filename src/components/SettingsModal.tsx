import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Bot,
  Layers,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Coins,
  Radio,
} from 'lucide-react';
import { api } from '../services/api.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearSkips: () => Promise<void>;
  onClearAllAccounts: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onClearSkips,
  onClearAllAccounts,
}) => {
  const [config, setConfig] = useState({
    bot_token: '',
    ws_enabled: true,
    workers_per_account: 1,
    auto_refresh_tokens: true,
  });
  const [appSettings, setAppSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data.config) setConfig(data.config);
      if (data.appSettings) setAppSettings(data.appSettings);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setIsSaved(false);
    try {
      await api.updateSettings(config);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-[580px] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">إعدادات النظام والأسعار</h3>
              <p className="text-[11px] text-slate-400">إعدادات الأتمتة، تيليجرام، وتفضيلات السيرفر</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Telegram Bot Token */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-sky-400" />
                توكن بوت تيليجرام (Telegram Bot Token):
              </label>
              <input
                type="text"
                value={config.bot_token}
                onChange={(e) => setConfig({ ...config, bot_token: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                التوكن المستخدم للاتصال مع واجهة تيليجرام والمحاكي التفاعلي المدمج
              </p>
            </div>

            {/* Workers per account */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-amber-400" />
                عدد مسارات التجميع المتزامنة لكل حساب (Workers):
              </label>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4, 5].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setConfig({ ...config, workers_per_account: w })}
                    className={`flex-1 rounded-xl border py-2 text-center text-xs font-bold transition ${
                      config.workers_per_account === w
                        ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs cursor-pointer">
                <div>
                  <span className="font-bold text-white block">تفعيل خدمة WebSocket الحية</span>
                  <span className="text-[11px] text-slate-400">استقبال الإشعارات وتحديثات الحساب المباشرة</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.ws_enabled}
                  onChange={(e) => setConfig({ ...config, ws_enabled: e.target.checked })}
                  className="h-4 w-4 rounded accent-amber-500"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs cursor-pointer">
                <div>
                  <span className="font-bold text-white block">التجديد التلقائي لتوكنات الحسابات</span>
                  <span className="text-[11px] text-slate-400">تحديث الجلسات قبل انتهائها بـ 5 دقائق تلقائياً</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.auto_refresh_tokens}
                  onChange={(e) => setConfig({ ...config, auto_refresh_tokens: e.target.checked })}
                  className="h-4 w-4 rounded accent-amber-500"
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-emerald-400 font-bold">
                {isSaved && '✓ تم حفظ الإعدادات بنجاح'}
              </span>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>حفظ التغييرات</span>
              </button>
            </div>
          </form>

          {/* TikSpark Prices from AppSettings */}
          {appSettings && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-2.5">
                <Coins className="h-4 w-4 text-amber-400" />
                أسعار الخدمات الرسمية في TikSpark (تكلفة النقاط لكل وحدة):
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-[11px]">
                {Object.entries(appSettings.scoreActions || {}).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-center">
                    <span className="text-slate-400 block font-sans">{k}</span>
                    <span className="font-bold text-amber-400">{String(v)} نقطة</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
            <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              العمليات المتقدمة والتنظيف
            </h4>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={onClearSkips}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
              >
                مسح قائمة التخطي (Skips Cache)
              </button>
              <button
                type="button"
                onClick={onClearAllAccounts}
                className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                حذف جميع الحسابات المسجلة
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
