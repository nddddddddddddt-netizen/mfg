import React, { useState, useEffect } from 'react';
import { X, ListOrdered, RefreshCw, CheckCircle2, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { Account, TikSparkOrder } from '../types/tikspark';
import { api } from '../services/api.ts';

interface OrdersModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrdersModal: React.FC<OrdersModalProps> = ({ account, isOpen, onClose }) => {
  const [orders, setOrders] = useState<TikSparkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && account) {
      loadOrders();
    }
  }, [isOpen, account]);

  const loadOrders = async () => {
    if (!account) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await api.getOrders(account.id);
      setOrders(list);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الطلبات');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-[550px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <ListOrdered className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">طلبات الحساب @{account.username}</h3>
              <p className="text-[11px] text-slate-400 font-mono">الرصيد: {account.score.toLocaleString()} 🪙</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadOrders}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <RefreshCw className="h-7 w-7 animate-spin text-amber-400 mb-2" />
              <p className="text-xs">جاري جلب قائمة الطلبات من خوادم TikSpark...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((o) => {
                const isDone = o.status === 'done';
                const isPending = o.status === 'pending';
                const percent = o.amount > 0 ? Math.min(100, Math.round(((o.fulfilled || 0) / o.amount) * 100)) : 0;

                return (
                  <div
                    key={o._id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs transition hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm capitalize">{o.type}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              isDone
                                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : isPending
                                ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
                                : 'border border-slate-700 bg-slate-800 text-slate-300'
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>

                        <p className="mt-1 font-mono text-[11px] text-amber-400 max-w-md truncate">
                          {o.tiktokerUsername ? `@${o.tiktokerUsername}` : o.videoLink}
                        </p>
                      </div>

                      <div className="text-left font-mono">
                        <span className="text-sm font-black text-white">
                          {o.fulfilled || 0} / {o.amount}
                        </span>
                        <span className="block text-[10px] text-slate-400">إنجاز {percent}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isDone ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
              <ListOrdered className="h-9 w-9 mb-2 text-slate-600" />
              <p className="text-xs">لا توجد طلبات سابقة لهذا الحساب.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
