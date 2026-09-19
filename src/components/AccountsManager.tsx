import React, { useState } from 'react';
import {
  User,
  Plus,
  Play,
  Square,
  RefreshCw,
  ListOrdered,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Search,
  KeyRound,
  Coins,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Account } from '../types/tikspark';

interface AccountsManagerProps {
  accounts: Account[];
  onOpenAddModal: () => void;
  onRefreshAccount: (id: number) => Promise<void>;
  onToggleAccount: (id: number) => Promise<void>;
  onDeleteAccount: (id: number) => Promise<void>;
  onStartFarm: (id: number) => void;
  onStopFarm: (id: number) => void;
  onViewOrders: (account: Account) => void;
  onClearAll: () => void;
  isLoading: boolean;
}

export const AccountsManager: React.FC<AccountsManagerProps> = ({
  accounts,
  onOpenAddModal,
  onRefreshAccount,
  onToggleAccount,
  onDeleteAccount,
  onStartFarm,
  onStopFarm,
  onViewOrders,
  onClearAll,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'farming' | 'idle' | 'disabled'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.nickname.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'farming') return acc.farming;
    if (filterStatus === 'disabled') return !acc.enabled;
    if (filterStatus === 'idle') return acc.enabled && !acc.farming;
    return true;
  });

  const totalScore = accounts.reduce((sum, a) => sum + (a.score || 0), 0);

  const handleRefresh = async (id: number) => {
    setActionLoadingId(id);
    try {
      await onRefreshAccount(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-400" />
            إدارة حسابات TikTok المربوطة ({accounts.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إجمالي رصيد النقاط المحتسبة: <span className="font-bold text-amber-400 font-mono">{totalScore.toLocaleString()} 🪙</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="بحث باليوزر أو الاسم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-48 sm:w-60 rounded-xl border border-slate-700 bg-slate-950/80 pr-9 pl-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                filterStatus === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل ({accounts.length})
            </button>
            <button
              onClick={() => setFilterStatus('farming')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                filterStatus === 'farming' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              يجمع ({accounts.filter((a) => a.farming).length})
            </button>
            <button
              onClick={() => setFilterStatus('idle')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                filterStatus === 'idle' ? 'bg-slate-800 text-slate-200 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              جاهز ({accounts.filter((a) => a.enabled && !a.farming).length})
            </button>
            <button
              onClick={() => setFilterStatus('disabled')}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                filterStatus === 'disabled' ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              معطل ({accounts.filter((a) => !a.enabled).length})
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow hover:from-amber-400 hover:to-amber-300 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة حساب جديد</span>
          </button>

          {accounts.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>حذف الكل</span>
            </button>
          )}
        </div>
      </div>

      {/* Accounts Bento Grid */}
      {filteredAccounts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((acc) => {
            const isFarming = acc.farming;
            const isActionLoading = actionLoadingId === acc.id;

            return (
              <div
                key={acc.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 transition shadow-lg ${
                  isFarming
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-slate-900/90 ring-1 ring-amber-500/30'
                    : !acc.enabled
                    ? 'border-slate-800/60 bg-slate-950/60 opacity-70'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Row: Avatar, Username, Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {acc.avatar ? (
                        <img
                          src={acc.avatar}
                          alt={acc.username}
                          className="h-11 w-11 rounded-full object-cover border-2 border-slate-700"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight">
                          {acc.nickname || acc.username}
                        </h3>
                        <p className="text-xs font-mono text-amber-400/90 leading-tight mt-0.5">
                          @{acc.username}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">#{acc.idx} • ID: {acc.tiktok_id || acc.id}</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isFarming ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
                          يجمع الآن
                        </span>
                      ) : !acc.enabled ? (
                        <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-400">
                          معطّل
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          جاهز
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score & Token Info */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400">الرصيد الحالي</p>
                      <p className="mt-0.5 font-mono text-base font-black text-amber-400">
                        {acc.score.toLocaleString()} 🪙
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <KeyRound className="h-3 w-3 text-slate-400" />
                        صلاحية الجلسة
                      </p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-slate-300">
                        {acc.tokenExpiresInMinutes && acc.tokenExpiresInMinutes > 0 ? (
                          <span>{acc.tokenExpiresInMinutes} دقيقة</span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> تجديد تلقائي
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Controls Footer */}
                <div className="mt-5 border-t border-slate-800/80 pt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Start/Stop Single Farm */}
                    {isFarming ? (
                      <button
                        onClick={() => onStopFarm(acc.id)}
                        className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
                      >
                        <Square className="h-3 w-3 fill-rose-400" /> إيقاف
                      </button>
                    ) : (
                      <button
                        onClick={() => onStartFarm(acc.id)}
                        disabled={!acc.enabled}
                        className="flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/25 disabled:opacity-40"
                      >
                        <Play className="h-3 w-3 fill-amber-400" /> تجميع
                      </button>
                    )}

                    {/* Refresh Button */}
                    <button
                      onClick={() => handleRefresh(acc.id)}
                      disabled={isActionLoading}
                      title="تجديد بيانات الحساب ورصيده"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isActionLoading ? 'animate-spin text-amber-400' : ''}`} />
                    </button>

                    {/* View Orders */}
                    <button
                      onClick={() => onViewOrders(acc)}
                      title="عرض طلبات هذا الحساب"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95"
                    >
                      <ListOrdered className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Toggle Enabled */}
                    <button
                      onClick={() => onToggleAccount(acc.id)}
                      title={acc.enabled ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      {acc.enabled ? (
                        <ToggleRight className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-slate-600" />
                      )}
                    </button>

                    {/* Delete Account */}
                    <button
                      onClick={() => onDeleteAccount(acc.id)}
                      title="حذف الحساب"
                      className="p-1.5 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <User className="mx-auto h-10 w-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-white">لا توجد حسابات مطابقة</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            قم بإضافة حساب TikSpark عبر إدخال اسم المستخدم وكلمة المرور للبدء في تشغيل محرك التجميع والحملات.
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" /> إضافة أول حساب
          </button>
        </div>
      )}
    </div>
  );
};
