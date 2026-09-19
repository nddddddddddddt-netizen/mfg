import React from 'react';
import {
  Zap,
  Coins,
  Flame,
  Activity,
  Calendar,
  Clock,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Play,
  Square,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { GlobalDashboardSnapshot, DailyProjection } from '../types/tikspark';

interface LiveDashboardProps {
  dashboard: GlobalDashboardSnapshot | null;
  projections: DailyProjection | null;
  liveActivity: Array<{
    id: string;
    username: string;
    coinsGained: number;
    success: boolean;
    orderId: string;
    time: string;
  }>;
  chartHistory: Array<{
    time: string;
    reqPerMin: number;
    coinsPerMin: number;
  }>;
  onStartGlobal: () => void;
  onStopGlobal: () => void;
  onStartAccount: (id: number) => void;
  onStopAccount: (id: number) => void;
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  dashboard,
  projections,
  liveActivity,
  chartHistory,
  onStartGlobal,
  onStopGlobal,
  onStartAccount,
  onStopAccount,
}) => {
  const isRunning = dashboard?.isRunning || (dashboard?.activeCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Velocity */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">سرعة الطلبات</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-white font-mono">
              {dashboard?.totalReqPerMin.toFixed(1) ?? '0.0'}
            </span>
            <span className="text-xs text-slate-400 font-medium">طلب / دقيقة</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
            <span>الذروة:</span>
            <span className="font-bold text-amber-400 font-mono">
              {dashboard?.peakTotalReqPerMin ? `${dashboard.peakTotalReqPerMin} / د` : '—'}
            </span>
          </div>
        </div>

        {/* Card 2: Coin Yield */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">معدل كسب النقاط</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
              {dashboard?.totalCoinsPerMin.toFixed(1) ?? '0.0'}
            </span>
            <span className="text-xs text-slate-400 font-medium">نقطة / دقيقة</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
            <span>المعدل بالساعة:</span>
            <span className="font-bold text-emerald-300 font-mono">
              ≈ {(dashboard?.totalCoinsPerHour ?? 0).toLocaleString()} 🪙
            </span>
          </div>
        </div>

        {/* Card 3: Session Accomplishments */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">مهام الجلسة المكتملة</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-white font-mono">
              {(dashboard?.totalProcessedSession ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">مهمة منفذة</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
            <span>مجموع النقاط المحصودة:</span>
            <span className="font-bold text-amber-400 font-mono">
              +{(dashboard?.totalCoinsSession ?? 0).toLocaleString()} 🪙
            </span>
          </div>
        </div>

        {/* Card 4: Efficiency & Active Count */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">كفاءة التجميع والحسابات</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-white font-mono">
              {dashboard?.avgCoinsPerReq.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs text-slate-400 font-medium">نقطة / طلب</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
            <span>الحسابات المشتغلة الآن:</span>
            <span className="font-bold text-purple-300 font-mono">
              {dashboard?.activeCount ?? 0} حساب
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Live Velocity Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                مخطط السرعة الحية وتدفق النقاط (Real-time Velocity)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تحديث تلقائي فوري كل ثانيتين من السيرفر
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                الطلبات / دقيقة
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                النقاط / دقيقة
              </span>
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            {chartHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCoins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="reqPerMin"
                    name="طلبات/د"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReq)"
                  />
                  <Area
                    type="monotone"
                    dataKey="coinsPerMin"
                    name="نقاط/د"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCoins)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <RefreshCw className="h-6 w-6 animate-spin mb-2 text-slate-600" />
                <p className="text-xs">جاري جمع بيانات السرعة الحية مع بدء التجميع...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Daily & Hourly Projections */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-400" />
                التوقعات المستقبلية للأرباح
              </h2>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                PROJECTION
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {/* 8 Hours */}
              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-300 font-medium">8 ساعات تجميع</span>
                </div>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {Math.round((dashboard?.totalCoinsPerMin ?? 0) * 60 * 8).toLocaleString()} 🪙
                </span>
              </div>

              {/* 12 Hours */}
              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-300 font-medium">12 ساعة تجميع</span>
                </div>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {Math.round((dashboard?.totalCoinsPerMin ?? 0) * 60 * 12).toLocaleString()} 🪙
                </span>
              </div>

              {/* 24 Hours */}
              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-slate-200 font-bold">24 ساعة (يومي)</span>
                </div>
                <span className="font-mono text-sm font-black text-emerald-400">
                  {Math.round((dashboard?.totalCoinsPerMin ?? 0) * 60 * 24).toLocaleString()} 🪙
                </span>
              </div>

              {/* Weekly Forecast */}
              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-sky-400" />
                  <span className="text-xs text-slate-300 font-medium">أسبوع كامل</span>
                </div>
                <span className="font-mono text-sm font-bold text-sky-300">
                  {Math.round((dashboard?.totalCoinsPerMin ?? 0) * 60 * 24 * 7).toLocaleString()} 🪙
                </span>
              </div>
            </div>
          </div>

          {projections && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 text-[11px] text-slate-400 flex items-center justify-between">
              <span>نشاط آخر 24س المسجل:</span>
              <span className="font-mono font-bold text-slate-200">
                {projections.last_24h_coins.toLocaleString()} 🪙 ({projections.last_24h_actions} طلب)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Active Farmers & Live Activity Stream Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active Accounts Table (2 cols) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-400" />
                الحسابات النشطة في محرك التجميع (Live Farmers)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                مراقبة حية لسرعة وأداء كل حساب على حدة
              </p>
            </div>
            {isRunning ? (
              <button
                onClick={onStopGlobal}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
              >
                <Square className="h-3 w-3 fill-rose-400" /> إيقاف الكل
              </button>
            ) : (
              <button
                onClick={onStartGlobal}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                <Play className="h-3 w-3 fill-slate-950" /> تشغيل الكل
              </button>
            )}
          </div>

          <div className="mt-4 overflow-x-auto">
            {dashboard?.accounts && dashboard.accounts.length > 0 ? (
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 font-semibold">الحساب</th>
                    <th className="pb-2.5 font-semibold">السرعة</th>
                    <th className="pb-2.5 font-semibold">النقاط/د</th>
                    <th className="pb-2.5 font-semibold">المنجز</th>
                    <th className="pb-2.5 font-semibold">المحصول</th>
                    <th className="pb-2.5 font-semibold">الذروة</th>
                    <th className="pb-2.5 font-semibold">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {dashboard.accounts.map((a) => (
                    <tr key={a.accountId} className="hover:bg-slate-800/30">
                      <td className="py-3 font-sans font-medium text-white flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
                        @{a.username}
                      </td>
                      <td className="py-3 text-amber-400 font-bold">
                        ⚡ {a.rate.req_per_min.toFixed(1)} / د
                      </td>
                      <td className="py-3 text-emerald-400 font-bold">
                        🪙 {a.rate.coins_per_min.toFixed(1)} / د
                      </td>
                      <td className="py-3 text-slate-300 font-sans">
                        {a.processed.toLocaleString()}
                      </td>
                      <td className="py-3 text-amber-300">
                        +{a.coins.toLocaleString()}
                      </td>
                      <td className="py-3 text-slate-400">
                        {a.rate.peak_req_per_min} / د
                      </td>
                      <td className="py-3 font-sans">
                        {a.running ? (
                          <button
                            onClick={() => onStopAccount(a.accountId)}
                            className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-400 hover:bg-rose-500/20"
                          >
                            إيقاف
                          </button>
                        ) : (
                          <button
                            onClick={() => onStartAccount(a.accountId)}
                            className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/25"
                          >
                            تجميع
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-500">
                <p className="text-xs">لا يوجد تجميع نشط حالياً. اضغط على زر "تجميع الكل" لبدء الحصاد التلقائي.</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Activity Stream (1 col) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl flex flex-col h-[400px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
              البث المباشر للعمليات
            </h2>
            <span className="text-[10px] text-slate-400">SSE Feed</span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {liveActivity.length > 0 ? (
              liveActivity.map((act) => (
                <div
                  key={act.id}
                  className={`flex items-start justify-between rounded-xl border p-2.5 text-xs transition ${
                    act.success
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
                      : 'border-rose-500/20 bg-rose-500/5 text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {act.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold text-white">@{act.username}</span>
                      <p className="text-[10px] text-slate-400 font-mono">
                        طلب: {act.orderId.slice(0, 10)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <span className="font-bold text-amber-400">
                      {act.coinsGained > 0 ? `+${act.coinsGained} 🪙` : '0 🪙'}
                    </span>
                    <p className="text-[10px] text-slate-500">{act.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 text-xs">
                <Activity className="h-5 w-5 mb-2 text-slate-600" />
                <span>في انتظار تنفيذ أول عملية تجميع...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
