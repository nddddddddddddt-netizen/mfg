import React, { useState } from 'react';
import {
  Send,
  Users,
  Heart,
  Eye,
  MessageCircle,
  Share2,
  Bookmark,
  Swords,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Account, Campaign } from '../types/tikspark';

interface CampaignsHubProps {
  accounts: Account[];
  campaigns: Campaign[];
  onLaunchCampaign: (params: {
    type: string;
    target: string;
    total_amount?: number;
    mode?: 'auto' | 'fixed';
  }) => Promise<any>;
  onRefreshCampaigns: () => void;
  isLoading: boolean;
}

const SERVICE_TYPES = [
  { id: 'followers', name: 'متابعين (Followers)', icon: Users, desc: 'زيادة متابعين لحساب TikTok عبر اسم المستخدم' },
  { id: 'likes', name: 'لايكات (Likes)', icon: Heart, desc: 'إرسال إعجابات لفيديو TikTok عبر الرابط' },
  { id: 'views', name: 'مشاهدات (Views)', icon: Eye, desc: 'تكثيف المشاهدات لفيديو TikTok بشكل فوري' },
  { id: 'comments', name: 'تعليقات (Comments)', icon: MessageCircle, desc: 'إرسال تعليقات متفاعلة للفيديو' },
  { id: 'shares', name: 'مشاركات (Shares)', icon: Share2, desc: 'مشاركة الفيديو لرفع خوارزميات الانتشار' },
  { id: 'save', name: 'حفظ (Saves)', icon: Bookmark, desc: 'حفظ الفيديو في المفضلة لزيادة التفاعل' },
  { id: 'pk', name: 'تحدي PK', icon: Swords, desc: 'دعم وتصويت في بثوث التحديات الحية' },
];

export const CampaignsHub: React.FC<CampaignsHubProps> = ({
  accounts,
  campaigns,
  onLaunchCampaign,
  onRefreshCampaigns,
  isLoading,
}) => {
  const [selectedType, setSelectedType] = useState('followers');
  const [targetInput, setTargetInput] = useState('');
  const [mode, setMode] = useState<'auto' | 'fixed'>('auto');
  const [customAmount, setCustomAmount] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  const activeAccounts = accounts.filter((a) => a.enabled);
  const costPerUnit = 3; // Standard 3 coins per unit
  const totalCapacity = activeAccounts.reduce((sum, a) => sum + Math.floor((a.score || 0) / costPerUnit), 0);

  // Proportional distribution preview
  const previewDistribution = () => {
    const caps: Record<number, number> = {};
    for (const a of activeAccounts) {
      const c = Math.floor((a.score || 0) / costPerUnit);
      if (c >= 20) caps[a.id] = c;
    }

    if (mode === 'auto' || customAmount <= 0) {
      return caps;
    }

    const totalCap = Object.values(caps).reduce((s, v) => s + v, 0);
    if (customAmount >= totalCap) return caps;

    const dist: Record<number, number> = {};
    let remaining = customAmount;
    const sortedIds = Object.keys(caps).map(Number).sort((a, b) => caps[b] - caps[a]);

    for (const aid of sortedIds) {
      const cap = caps[aid];
      let share = Math.round((cap / totalCap) * customAmount);
      share = Math.max(20, Math.min(share, cap));
      if (share > remaining) share = remaining;
      if (share >= 20) {
        dist[aid] = share;
        remaining -= share;
      }
      if (remaining < 20) break;
    }

    return dist;
  };

  const distPreview = previewDistribution();
  const totalPlannedUnits = Object.values(distPreview).reduce((s, v) => s + v, 0);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput.trim()) {
      setResultMsg({ success: false, text: 'الرجاء إدخال الهدف (اسم المستخدم أو رابط الفيديو)' });
      return;
    }

    setIsSubmitting(true);
    setResultMsg(null);

    try {
      const res = await onLaunchCampaign({
        type: selectedType,
        target: targetInput.trim(),
        mode,
        total_amount: mode === 'fixed' ? customAmount : 0,
      });

      if (res.success) {
        setResultMsg({
          success: true,
          text: `تم إطلاق الحملة #${res.campaignId} بنجاح عبر الحسابات المتاحة!`,
        });
        setTargetInput('');
      } else {
        setResultMsg({ success: false, text: res.error || 'فشل إطلاق الحملة' });
      }
    } catch (err: any) {
      setResultMsg({ success: false, text: err.message || 'حدث خطأ أثناء إطلاق الحملة' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Launcher Wizard */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="h-5 w-5 text-amber-400" />
                محرك الحملات الجماعية الذكي (Smart Mass Dispatcher)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                توزيع الحملة بالتوازي على كل الحسابات المفعّلة بنسب متناسبة مع أرصدة كل حساب
              </p>
            </div>
            <div className="text-left font-mono">
              <span className="text-[10px] text-slate-400 block">إجمالي السعة المتاحة</span>
              <span className="text-sm font-bold text-emerald-400">
                {totalCapacity.toLocaleString()} وحدة ({activeAccounts.length} حساب مفعّل)
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleLaunch} className="mt-6 space-y-6">
          {/* 1. Service Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">1. اختر نوع الخدمة المطلوبة:</label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
              {SERVICE_TYPES.map((service) => {
                const Icon = service.icon;
                const isSelected = selectedType === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedType(service.id)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 text-amber-400 ring-1 ring-amber-500'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1.5" />
                    <span className="text-xs font-bold leading-tight">{service.name.split(' ')[0]}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{service.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Target Link or Username */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              2. الهدف ({selectedType === 'followers' ? 'اسم مستخدم TikTok بدون @' : 'رابط فيديو TikTok'}):
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder={
                  selectedType === 'followers'
                    ? 'مثال: tiktok_creator'
                    : 'مثال: https://www.tiktok.com/@user/video/7300000000000000000'
                }
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* 3. Mode Selection & Quantity */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">3. نمط التوزيع:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('auto')}
                  className={`rounded-xl border p-3 text-right transition ${
                    mode === 'auto'
                      ? 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    تلقائي كامل (Auto)
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    يستغل كل حساب أقصى سعة ممكنة من نقاطه
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('fixed')}
                  className={`rounded-xl border p-3 text-right transition ${
                    mode === 'fixed'
                      ? 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    كمية محددة (Fixed)
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    تحديد رقم إجمالي وتوزيعه ذكياً بنسب متوازنة
                  </p>
                </button>
              </div>
            </div>

            {mode === 'fixed' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  الكمية المطلوبة (الحد الأدنى 20 وحدة لكل حساب):
                </label>
                <input
                  type="number"
                  min={20}
                  step={10}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(Math.max(20, Number(e.target.value)))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none font-mono font-bold"
                />
              </div>
            )}
          </div>

          {/* Real-time Proportional Plan Breakdown Preview */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="font-bold text-slate-300">خطة التوزيع المتوقعة عبر الحسابات:</span>
              <span className="font-mono font-bold text-amber-400">
                إجمالي الطلب: {totalPlannedUnits.toLocaleString()} وحدة (تكلفة: {(totalPlannedUnits * costPerUnit).toLocaleString()} 🪙)
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 max-h-32 overflow-y-auto pr-1">
              {Object.entries(distPreview).map(([aidStr, amt]) => {
                const aid = Number(aidStr);
                const acc = accounts.find((a) => a.id === aid);
                return (
                  <div key={aid} className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-2 text-xs">
                    <p className="font-bold text-white truncate">@{acc?.username}</p>
                    <div className="flex justify-between mt-1 text-[11px]">
                      <span className="text-amber-400 font-mono font-semibold">{amt} وحدة</span>
                      <span className="text-slate-500 font-mono">رصيد: {acc?.score} 🪙</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback messages */}
          {resultMsg && (
            <div
              className={`rounded-xl p-3.5 text-xs flex items-center gap-2 ${
                resultMsg.success
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {resultMsg.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{resultMsg.text}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || totalPlannedUnits === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-300 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جاري الإرسال بالتوازي...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 fill-slate-950" />
                  <span>إطلاق الحملة الجماعية الآن</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Historical Campaigns Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              سجل الحملات السابقة ({campaigns.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">سجل كامل بجميع الحملات الجماعية المنفذة ونتائجها</p>
          </div>
          <button
            onClick={onRefreshCampaigns}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3 w-3" /> تحديث
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {campaigns.length > 0 ? (
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2.5 font-semibold">المعرف</th>
                  <th className="pb-2.5 font-semibold">النوع</th>
                  <th className="pb-2.5 font-semibold">الهدف</th>
                  <th className="pb-2.5 font-semibold">الكمية</th>
                  <th className="pb-2.5 font-semibold">المنفذ الفعلي</th>
                  <th className="pb-2.5 font-semibold">الحالة</th>
                  <th className="pb-2.5 font-semibold">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {campaigns.map((c) => {
                  const isDone = c.status === 'done';
                  const launched = c.results?.total_launched ?? 0;
                  const cDate = new Date(c.created_at * 1000).toLocaleString('ar-EG', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30">
                      <td className="py-3 text-slate-400">#{c.id}</td>
                      <td className="py-3 font-sans font-bold text-white">
                        {c.type}
                      </td>
                      <td className="py-3 text-amber-400 font-mono max-w-[200px] truncate">
                        {c.target}
                      </td>
                      <td className="py-3 text-slate-300 font-sans">
                        {c.mode === 'auto' ? 'تلقائي' : `${c.total_amount} وحدة`}
                      </td>
                      <td className="py-3 text-emerald-400 font-bold">
                        {launched.toLocaleString()} وحدة
                      </td>
                      <td className="py-3 font-sans">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            مكتملة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                            جاري التنفيذ
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-400 font-sans text-[11px]">
                        {cDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <p className="text-xs">لا توجد حملات منشأة بعد. استخدم النموذج أعلاه لإنشاء حملتك الأولى.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
