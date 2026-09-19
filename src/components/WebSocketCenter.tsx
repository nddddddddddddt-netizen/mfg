import React from 'react';
import {
  Radio,
  Power,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react';
import { WsEvent } from '../types/tikspark';

interface WebSocketCenterProps {
  wsEnabled: boolean;
  activeCount: number;
  events: WsEvent[];
  onToggleWs: () => Promise<void>;
  onReconnectWs: () => Promise<void>;
  onRefreshEvents: () => void;
  isLoading: boolean;
}

export const WebSocketCenter: React.FC<WebSocketCenterProps> = ({
  wsEnabled,
  activeCount,
  events,
  onToggleWs,
  onReconnectWs,
  onRefreshEvents,
  isLoading,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                wsEnabled && activeCount > 0
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-800 bg-slate-950 text-slate-500'
              }`}
            >
              <Radio className={`h-6 w-6 ${wsEnabled && activeCount > 0 ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">مركز اشتراكات WebSocket الحي</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    wsEnabled && activeCount > 0
                      ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {wsEnabled && activeCount > 0 ? 'متصل ونشط' : 'معطل'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                اتصال مباشر مع <code>wss://api.tikspark.xyz/graphql</code> لاشتراك <code>UserActionSub</code>
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleWs}
              disabled={isLoading}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                wsEnabled
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <Power className="h-4 w-4" />
              <span>{wsEnabled ? 'إيقاف خدمة WebSocket' : 'تشغيل خدمة WebSocket'}</span>
            </button>

            <button
              onClick={onReconnectWs}
              disabled={isLoading || !wsEnabled}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
              <span>إعادة الاتصال</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-slate-800 pt-5 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-slate-400">الاتصالات النشطة الحالية:</span>
            <p className="mt-1 font-mono text-lg font-bold text-white">{activeCount} اتصال متزامن</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-slate-400">بروتوكول البث:</span>
            <p className="mt-1 font-mono text-xs font-semibold text-emerald-400">graphql-transport-ws</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="text-slate-400">الإشعارات المسجلة:</span>
            <p className="mt-1 font-mono text-lg font-bold text-amber-400">{events.length} إشعار</p>
          </div>
        </div>
      </div>

      {/* Events Log Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-400" />
            سجل إشعارات WebSocket اللحظية
          </h3>
          <button
            onClick={onRefreshEvents}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3 w-3" /> تحديث السجل
          </button>
        </div>

        <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {events.length > 0 ? (
            events.map((evt) => {
              const d = new Date(evt.ts * 1000).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={evt.id}
                  className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs transition hover:border-slate-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-amber-400 border border-slate-800 shrink-0">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">@{evt.username || `#${evt.account_id}`}</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                          {evt.event_type}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-300 font-sans">{evt.message}</p>
                    </div>
                  </div>
                  <div className="text-left font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {d}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-500">
              <Radio className="mx-auto h-8 w-8 mb-2 text-slate-600" />
              <p className="text-xs">لا توجد إشعارات WebSocket بعد. ستظهر الأحداث هنا فور وصولها من خوادم TikSpark.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
