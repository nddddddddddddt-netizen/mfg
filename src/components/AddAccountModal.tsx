import React, { useState } from 'react';
import { UserPlus, X, Lock, User, RefreshCw, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { api } from '../services/api.ts';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onAccountAdded }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser) {
      setError('يرجى إدخال اسم مستخدم TikTok');
      return;
    }
    if (!/^[A-Za-z0-9._]{2,30}$/.test(cleanUser)) {
      setError('اسم المستخدم غير صالح (يجب أن يكون بالإنجليزية من 2 إلى 30 رمزاً وبدون @)');
      return;
    }
    if (!password) {
      setError('يرجى إدخال كلمة مرور الحساب');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.loginAccount(cleanUser, password);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onAccountAdded();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول وربط الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">إضافة وربط حساب TikTok</h3>
              <p className="text-[11px] text-slate-400">تسجيل الدخول الرسمي وتوليد توكنات الجلسة والتوثيق</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>تم التحقق من الحساب وتوثيق الجهاز بنجاح! جاري التحديث...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              اسم مستخدم TikTok (Unique ID):
            </label>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">@</span>
              <input
                type="text"
                required
                disabled={isLoading}
                placeholder="اسم المستخدم بدون @"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pr-8 pl-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              كلمة مرور الحساب في TikSpark:
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading}
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pr-9 pl-12 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-slate-200"
              >
                {showPassword ? 'إخفاء' : 'إظهار'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 flex items-start gap-2">
            <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              يتم إجراء تشفير HMAC-SHA256 وتوثيق الجهاز المحاكي (Device Attestation) مباشرة مع خوادم TikSpark الرسمية للحصول على رموز الوصول وتجديدها تلقائياً.
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading || success}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جاري تسجيل الدخول والتوثيق...</span>
                </>
              ) : (
                <span>تسجيل الدخول وربط الحساب</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
