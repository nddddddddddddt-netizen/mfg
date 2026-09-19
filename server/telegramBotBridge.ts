import { storage } from './storage.ts';
import { globalFarmer } from './farmingEngine.ts';
import { wsManager } from './wsManager.ts';
import { CampaignEngine } from './campaignEngine.ts';
import { opLogin, opGetUsers, opFetchScore, opMyOrders, TYPE_NAMES, DEFAULT_COST_PER_UNIT } from './tiksparkProtocol.ts';

export interface TelegramButton {
  text: string;
  callback_data: string;
}

export interface TelegramMessageResponse {
  text: string;
  keyboard?: TelegramButton[][];
}

export class TelegramBotSimulator {
  private userStates = new Map<string, { step: string; pendingData?: any }>();

  public getKeyboard(isFarming = false): TelegramButton[][] {
    if (isFarming) {
      return [
        [{ text: '🛑 إيقاف الكل', callback_data: 'global_stop' }],
        [{ text: '📈 اللوحة المباشرة', callback_data: 'live_dash' }],
      ];
    }

    return [
      [
        { text: '🪙 تجميع الكل', callback_data: 'global_start' },
        { text: '🛑 إيقاف الكل', callback_data: 'global_stop' },
      ],
      [
        { text: '👥 متابعين', callback_data: 'order_followers' },
        { text: '❤️ لايكات', callback_data: 'order_likes' },
      ],
      [
        { text: '👁️ مشاهدات', callback_data: 'order_views' },
        { text: '💬 تعليقات', callback_data: 'order_comments' },
      ],
      [
        { text: '🎯 حملة جماعية', callback_data: 'mass_campaign' },
        { text: '📋 آخر الحملات', callback_data: 'camp_list' },
      ],
      [
        { text: '📈 لوحة مباشرة', callback_data: 'live_dash' },
        { text: '📊 إحصائيات', callback_data: 'stats' },
      ],
      [
        { text: '📅 توقع يومي', callback_data: 'daily_proj' },
        { text: '🔥 الذروة', callback_data: 'peak_view' },
      ],
      [
        { text: '👤 حساباتي', callback_data: 'accounts_list' },
        { text: '➕ إضافة حساب', callback_data: 'account_add' },
      ],
      [
        { text: '📤 تصدير CSV', callback_data: 'export_csv' },
        { text: '🔔 إشعارات WS', callback_data: 'ws_panel' },
      ],
      [
        { text: '⚙️ إعدادات', callback_data: 'settings' },
        { text: '❌ حذف كل الحسابات', callback_data: 'logout_all' },
      ],
    ];
  }

  public getAccountsKeyboard(): TelegramButton[][] {
    const accounts = storage.listAccounts();
    const rows: TelegramButton[][] = [];
    for (const a of accounts) {
      const status = a.farming ? '🟢' : !a.enabled ? '🔴' : '⚪';
      rows.push([
        {
          text: `${status} #${a.idx} @${a.username} — ${a.score.toLocaleString()} 🪙`,
          callback_data: `acc_view_${a.id}`,
        },
      ]);
    }
    rows.push([{ text: '➕ إضافة حساب', callback_data: 'account_add' }]);
    rows.push([{ text: '🔙 رجوع', callback_data: 'menu_main' }]);
    return rows;
  }

  public getAccountViewKeyboard(acc: any): TelegramButton[][] {
    const toggleTxt = acc.enabled ? '⏸️ تعطيل' : '▶️ تفعيل';
    return [
      [
        { text: toggleTxt, callback_data: `acc_tog_${acc.id}` },
        { text: '🔄 تجديد', callback_data: `acc_refresh_${acc.id}` },
      ],
      [
        { text: '🪙 تجميع', callback_data: `acc_farm_${acc.id}` },
        { text: '📊 طلباته', callback_data: `acc_orders_${acc.id}` },
      ],
      [{ text: '📈 لوحته', callback_data: `acc_dash_${acc.id}` }],
      [{ text: '🗑️ حذف', callback_data: `acc_del_${acc.id}` }],
      [{ text: '🔙 رجوع', callback_data: 'accounts_list' }],
    ];
  }

  public buildLiveDashboard(): string {
    const snap = globalFarmer.getDashboardSnapshot();
    const lines = ['⚙️ <b>لوحة التجميع الحية</b>', `⏱️ المدة: ${Math.floor(snap.elapsedSec / 60)}د ${snap.elapsedSec % 60}ث`, ''];

    if (snap.accounts.length === 0) {
      lines.push('⏸️ لا حسابات نشطة حالياً');
    } else {
      for (const a of snap.accounts) {
        const peakMarker = snap.peakTotalReqPerMin > 0 && a.rate.req_per_min >= a.rate.peak_req_per_min * 0.95 ? ' 🔥' : '';
        lines.push(`👤 @${a.username}${peakMarker}`);
        lines.push(`   ⚡ ${a.rate.req_per_min.toFixed(1)}/د | 🪙 ${a.rate.coins_per_min.toFixed(1)}/د | 📈 ${a.rate.avg_coins_per_req.toFixed(2)}`);
      }
      lines.push('');
      lines.push(`📊 <b>المجموع (${snap.accounts.length} حساب)</b>`);
      lines.push(`⚡ الطلبات: <b>${snap.totalReqPerMin.toFixed(1)}</b> / دقيقة`);
      lines.push(`🪙 النقاط: <b>${snap.totalCoinsPerMin.toFixed(1)}</b> / دقيقة`);
      lines.push(`   أي: <b>${snap.totalCoinsPerHour.toLocaleString()}</b> / ساعة`);
      lines.push(`✅ المهام (الجلسة): ${snap.totalProcessedSession.toLocaleString()}`);
      lines.push(`💰 النقاط (الجلسة): ${snap.totalCoinsSession.toLocaleString()} 🪙`);
      lines.push(`📈 متوسط النقاط/طلب: <b>${snap.avgCoinsPerReq.toFixed(2)}</b>`);

      if (snap.peakTotalReqPerMin > 0) {
        lines.push('');
        lines.push('🔥 <b>الذروة المسجلة</b>');
        lines.push(`   ⚡ <b>${snap.peakTotalReqPerMin.toFixed(1)}</b>/دقيقة`);
        lines.push(`   🪙 <b>${snap.peakTotalCoinsPerMin.toFixed(1)}</b>/دقيقة`);
      }

      if (snap.totalCoinsPerMin > 0) {
        lines.push('');
        lines.push('📅 <b>توقع يومي</b>');
        lines.push(`   8س:  <b>${Math.round(snap.totalCoinsPerMin * 60 * 8).toLocaleString()}</b> 🪙`);
        lines.push(`   12س: <b>${Math.round(snap.totalCoinsPerMin * 60 * 12).toLocaleString()}</b> 🪙`);
        lines.push(`   24س: <b>${Math.round(snap.totalCoinsPerMin * 60 * 24).toLocaleString()}</b> 🪙`);
      }
    }

    return lines.join('\n');
  }

  public buildDailyProjection(): string {
    const accounts = storage.listAccounts();
    if (accounts.length === 0) return 'لا توجد حسابات مسجلة.';

    const lines = ['📅 <b>التوقع اليومي الشامل</b>', ''];
    let grandDaily = 0;
    let grandHourly = 0;
    let totalCoins24h = 0;
    let totalActions24h = 0;

    for (const a of accounts) {
      const proj = storage.getDailyProjection(a.id);
      if (proj) {
        grandDaily += proj.daily;
        grandHourly += proj.hourly;
        totalCoins24h += proj.last_24h_coins;
        totalActions24h += proj.last_24h_actions;
        lines.push(`👤 @${a.username}`);
        lines.push(`   آخر 24س: ${proj.last_24h_coins.toLocaleString()} 🪙 (${proj.last_24h_actions} طلب)`);
        lines.push(`   توقع: <b>${proj.hourly.toLocaleString()}</b>/ساعة | <b>${proj.daily.toLocaleString()}</b>/يوم`);
      } else {
        lines.push(`👤 @${a.username}: لا بيانات كافية (يتطلب دقيقة نشاط)`);
      }
    }

    if (grandDaily > 0) {
      lines.push('');
      lines.push('<b>المجموع المتوقع:</b>');
      lines.push(`   💰 آخر 24 ساعة: ${totalCoins24h.toLocaleString()} 🪙`);
      lines.push(`   📊 عدد الطلبات: ${totalActions24h.toLocaleString()}`);
      lines.push(`   ⚡ معدل: <b>${grandHourly.toLocaleString()}</b> / ساعة`);
      lines.push(`   📅 توقع يوم: <b>${grandDaily.toLocaleString()}</b> 🪙`);
      lines.push(`   📅 توقع أسبوع: <b>${(grandDaily * 7).toLocaleString()}</b> 🪙`);
      lines.push(`   📅 توقع شهر: <b>${(grandDaily * 30).toLocaleString()}</b> 🪙`);
    }

    return lines.join('\n');
  }

  public buildPeakView(): string {
    const lines = ['🔥 <b>الذروة المسجلة</b>', ''];
    const snap = globalFarmer.getDashboardSnapshot();

    if (snap.peakTotalReqPerMin > 0) {
      lines.push('<b>المجموع (كل الحسابات):</b>');
      lines.push(`⚡ طلبات: <b>${snap.peakTotalReqPerMin}</b>/دقيقة`);
      lines.push(`🪙 نقاط: <b>${snap.peakTotalCoinsPerMin}</b>/دقيقة`);
      if (snap.peakAt > 0) {
        const ago = Math.max(0, Math.floor(Date.now() / 1000) - snap.peakAt);
        lines.push(`🕐 قبل: ${Math.floor(ago / 60)}د ${ago % 60}ث`);
      }
      lines.push('');
    }

    lines.push('<b>لكل حساب نشط:</b>');
    if (snap.accounts.length === 0) {
      lines.push('<i>لا توجد بيانات ذروة بعد. شغّل التجميع لدقيقة واحدة على الأقل.</i>');
    } else {
      for (const a of snap.accounts) {
        lines.push(`👤 @${a.username}`);
        lines.push(`   ⚡ ${a.rate.peak_req_per_min}/د | 🪙 ${a.rate.peak_coins_per_min}/د`);
      }
    }

    return lines.join('\n');
  }

  public async handleMessage(chatId: string, text: string): Promise<TelegramMessageResponse> {
    const trimmed = (text || '').trim();
    const state = this.userStates.get(chatId) || { step: 'main_menu' };

    if (trimmed === '/start') {
      this.userStates.set(chatId, { step: 'main_menu' });
      const accounts = storage.listAccounts();
      const totalScore = accounts.reduce((s, a) => s + (a.score || 0), 0);
      return {
        text: `👋 <b>مرحباً بك في TikSpark Pro Suite!</b>\n\nعدد الحسابات المربوطة: <b>${accounts.length}</b>\nإجمالي رصيد النقاط: <b>${totalScore.toLocaleString()}</b> 🪙`,
        keyboard: this.getKeyboard(globalFarmer.isAnyRunning()),
      };
    }

    // Step: Add Account - Username
    if (state.step === 'acc_add_user') {
      if (!/^[A-Za-z0-9._]{2,30}$/.test(trimmed)) {
        return {
          text: '❌ اسم مستخدم غير صالح. يجب أن يكون من 2 إلى 30 حرفاً بالإنجليزية.',
          keyboard: [[{ text: '🔙 إلغاء', callback_data: 'menu_main' }]],
        };
      }
      this.userStates.set(chatId, {
        step: 'acc_add_pass',
        pendingData: { username: trimmed },
      });
      return {
        text: `🔑 أرسل الآن <b>كلمة مرور</b> الحساب @${trimmed}:`,
      };
    }

    // Step: Add Account - Password
    if (state.step === 'acc_add_pass') {
      const username = state.pendingData?.username;
      const res = await opLogin(username, trimmed);
      this.userStates.set(chatId, { step: 'main_menu' });

      if (res.success && res.user && res.uToken) {
        const added = storage.addAccount({
          username: res.user.username || username,
          tiktok_id: res.user.tiktokId,
          user_id: res.user._id,
          nickname: res.user.nickname,
          avatar: res.user.avatar,
          referral_code: res.user.referralCode,
          usertoken: res.uToken,
          csrftoken: res.cToken || '',
          refreshtoken: res.rToken || '',
          score: Number(res.user.score) || 0,
        });

        wsManager.startForAccount(added);

        return {
          text: `✅ <b>تم ربط الحساب بنجاح!</b>\n\n👤 @${added.username}\n🪙 الرصيد: ${added.score.toLocaleString()} نقطة\n🆔 معرف: #${added.id}`,
          keyboard: this.getKeyboard(globalFarmer.isAnyRunning()),
        };
      }

      return {
        text: `❌ <b>فشل تسجيل الدخول:</b>\n${res.error || 'تحقق من صحة البيانات'}`,
        keyboard: this.getKeyboard(globalFarmer.isAnyRunning()),
      };
    }

    // Step: Target for Order / Mass Campaign
    if (state.step.startsWith('target_')) {
      const orderType = state.step.replace('target_', '');
      this.userStates.set(chatId, {
        step: 'camp_amount',
        pendingData: { type: orderType, target: trimmed },
      });

      return {
        text: `🔢 <b>أرسل الكمية المطلوبة</b> لخدمة (${TYPE_NAMES[orderType] || orderType})\nأو أرسل <code>auto</code> لاستغلال جميع نقاط الحسابات تلقائياً:`,
      };
    }

    // Step: Campaign Amount
    if (state.step === 'camp_amount') {
      const { type, target } = state.pendingData || {};
      this.userStates.set(chatId, { step: 'main_menu' });

      let mode: 'auto' | 'fixed' = 'auto';
      let total = 0;

      if (trimmed.toLowerCase() !== 'auto') {
        const parsedNum = parseInt(trimmed, 10);
        if (isNaN(parsedNum) || parsedNum < 20) {
          return {
            text: '❌ الرجاء إدخال رقم أكبر من 20 أو كلمة auto.',
            keyboard: this.getKeyboard(),
          };
        }
        mode = 'fixed';
        total = parsedNum;
      }

      const launchRes = await CampaignEngine.launch({
        type,
        target,
        mode,
        total_amount: total,
      });

      if (launchRes.success) {
        return {
          text: `🚀 <b>تم إطلاق الحملة #${launchRes.campaignId}!</b>\n\nالنوع: ${TYPE_NAMES[type] || type}\nالهدف: <code>${target}</code>\nالنظام وزّع الطلب بنجاح عبر الحسابات المفعّلة.`,
          keyboard: this.getKeyboard(),
        };
      }

      return {
        text: `❌ <b>تعذر إطلاق الحملة:</b>\n${launchRes.error}`,
        keyboard: this.getKeyboard(),
      };
    }

    return {
      text: 'اختر أمراً من القائمة:',
      keyboard: this.getKeyboard(globalFarmer.isAnyRunning()),
    };
  }

  public async handleCallback(chatId: string, data: string): Promise<TelegramMessageResponse> {
    if (data === 'menu_main') {
      this.userStates.set(chatId, { step: 'main_menu' });
      return {
        text: 'القائمة الرئيسية لـ TikSpark Pro Suite:',
        keyboard: this.getKeyboard(globalFarmer.isAnyRunning()),
      };
    }

    if (data === 'live_dash') {
      return {
        text: this.buildLiveDashboard(),
        keyboard: this.getKeyboard(globalFarmer.isAnyRunning()),
      };
    }

    if (data === 'daily_proj') {
      return {
        text: this.buildDailyProjection(),
        keyboard: this.getKeyboard(globalFarmer.isAnyRunning()),
      };
    }

    if (data === 'peak_view') {
      return {
        text: this.buildPeakView(),
        keyboard: this.getKeyboard(globalFarmer.isAnyRunning()),
      };
    }

    if (data === 'global_start') {
      const started = await globalFarmer.startAll(1);
      return {
        text: started.length > 0
          ? `🪙 <b>بدأ التجميع الشامل!</b>\nالحسابات النشطة: ${started.map((u) => '@' + u).join(', ')}`
          : '⚠️ لم يتم تشغيل أي حساب (تأكد من وجود حسابات مفعّلة).',
        keyboard: this.getKeyboard(true),
      };
    }

    if (data === 'global_stop') {
      globalFarmer.stopAll();
      return {
        text: '🛑 <b>تم إيقاف جميع عمليات التجميع.</b>',
        keyboard: this.getKeyboard(false),
      };
    }

    if (data === 'accounts_list') {
      const accounts = storage.listAccounts();
      let text = `👤 <b>قائمة الحسابات المربوطة (${accounts.length})</b>\n\n`;
      for (const a of accounts) {
        const st = a.farming ? '🟢 يجمع' : a.enabled ? '⚪ نشط' : '🔴 معطل';
        text += `#${a.idx} @${a.username} — ${a.score.toLocaleString()} 🪙 (${st})\n`;
      }
      return {
        text,
        keyboard: this.getAccountsKeyboard(),
      };
    }

    if (data === 'account_add') {
      this.userStates.set(chatId, { step: 'acc_add_user' });
      return {
        text: '👤 أرسل الآن <b>اسم مستخدم TikTok</b>:',
        keyboard: [[{ text: '🔙 إلغاء', callback_data: 'menu_main' }]],
      };
    }

    if (data.startsWith('acc_view_')) {
      const aid = Number(data.replace('acc_view_', ''));
      const acc = storage.getAccount(aid);
      if (!acc) return { text: 'الحساب غير موجود.', keyboard: this.getAccountsKeyboard() };

      const expMinutes = acc.token_exp ? Math.max(0, Math.floor((acc.token_exp - Date.now() / 1000) / 60)) : 0;
      const text = `👤 <b>@{acc.username}</b>\n🆔 المعرف: <code>${acc.tiktok_id || '—'}</code>\n🪙 النقاط: <b>${acc.score.toLocaleString()}</b>\n🔑 صلاحية التوكن: ${expMinutes} دقيقة\n⚙️ الحالة: ${acc.enabled ? '🟢 مفعّل' : '🔴 معطّل'}\n🎁 كود الإحالة: <code>${acc.referral_code || '—'}</code>`;

      return {
        text,
        keyboard: this.getAccountViewKeyboard(acc),
      };
    }

    if (data.startsWith('acc_tog_')) {
      const aid = Number(data.replace('acc_tog_', ''));
      const acc = storage.getAccount(aid);
      if (acc) {
        storage.updateAccount(aid, { enabled: !acc.enabled });
      }
      return this.handleCallback(chatId, `acc_view_${aid}`);
    }

    if (data.startsWith('acc_del_')) {
      const aid = Number(data.replace('acc_del_', ''));
      globalFarmer.stopAccount(aid);
      wsManager.stopAccount(aid);
      storage.removeAccount(aid);
      return {
        text: '🗑️ تم حذف الحساب بنجاح.',
        keyboard: this.getAccountsKeyboard(),
      };
    }

    if (data.startsWith('acc_farm_')) {
      const aid = Number(data.replace('acc_farm_', ''));
      const acc = storage.getAccount(aid);
      if (acc) {
        await globalFarmer.startAccount(aid, 1);
        return {
          text: `▶️ بدأ التجميع المنفرد للحساب @${acc.username}!`,
          keyboard: this.getKeyboard(true),
        };
      }
    }

    if (data.startsWith('acc_orders_')) {
      const aid = Number(data.replace('acc_orders_', ''));
      const acc = storage.getAccount(aid);
      if (!acc) return { text: 'الحساب غير موجود.' };

      const orders = await opMyOrders(acc.usertoken, acc.csrftoken);
      if (orders.length === 0) {
        return {
          text: `📋 لا توجد طلبات سابقة للحساب @${acc.username}.`,
          keyboard: this.getAccountViewKeyboard(acc),
        };
      }

      let lines = [`📋 <b>طلبات @${acc.username} (آخر ${Math.min(orders.length, 8)}):</b>\n`];
      for (const o of orders.slice(0, 8)) {
        const tn = TYPE_NAMES[o.type] || o.type;
        const ic = o.status === 'done' ? '🟢' : o.status === 'pending' ? '🟡' : '🔴';
        lines.push(`${ic} <b>${tn}</b> × ${o.amount} (${o.fulfilled || 0}/${o.amount}) [${o.status}]`);
      }

      return {
        text: lines.join('\n'),
        keyboard: this.getAccountViewKeyboard(acc),
      };
    }

    if (data.startsWith('order_') || data.startsWith('mass_type_')) {
      const orderType = data.replace('order_', '').replace('mass_type_', '');
      this.userStates.set(chatId, { step: `target_${orderType}` });
      const prompt = orderType === 'followers' ? 'يوزر حساب TikTok' : 'رابط فيديو TikTok';
      return {
        text: `🔗 أرسل ${prompt} المطلوب لخدمة <b>${TYPE_NAMES[orderType] || orderType}</b>:`,
        keyboard: [[{ text: '🔙 إلغاء', callback_data: 'menu_main' }]],
      };
    }

    if (data === 'mass_campaign') {
      return {
        text: '🎯 <b>إطلاق حملة جماعية</b>\n\nاختر نوع الخدمة لتوزيعها ذكياً على جميع الحسابات المفعّلة بحسب أرصدتها:',
        keyboard: [
          [
            { text: '👥 متابعين', callback_data: 'mass_type_followers' },
            { text: '❤️ لايكات', callback_data: 'mass_type_likes' },
          ],
          [
            { text: '👁️ مشاهدات', callback_data: 'mass_type_views' },
            { text: '💬 تعليقات', callback_data: 'mass_type_comments' },
          ],
          [{ text: '🔙 رجوع', callback_data: 'menu_main' }],
        ],
      };
    }

    if (data === 'camp_list') {
      const camps = storage.listCampaigns(6);
      if (camps.length === 0) {
        return { text: '📋 لا توجد حملات منشأة بعد.', keyboard: this.getKeyboard() };
      }
      let lines = ['📋 <b>آخر الحملات الجماعية:</b>\n'];
      for (const c of camps) {
        const tn = TYPE_NAMES[c.type] || c.type;
        const icon = c.status === 'done' ? '🟢' : '🟡';
        lines.push(`${icon} #${c.id} <b>${tn}</b> — ${c.mode === 'auto' ? 'تلقائي' : c.total_amount + ' وحدة'}\n   الهدف: <code>${c.target.slice(0, 32)}</code>\n   الناجح: ${c.results?.total_launched || 0}`);
      }
      return { text: lines.join('\n'), keyboard: this.getKeyboard() };
    }

    if (data === 'stats') {
      const accounts = storage.listAccounts();
      const stats = storage.getStats();
      let lines = [
        '📊 <b>الإحصائيات الشاملة</b>\n',
        `💰 إجمالي النقاط المجمعة: <b>${stats.total.toLocaleString()}</b> 🪙`,
        `📅 نقاط اليوم: <b>${stats.today.toLocaleString()}</b> 🪙`,
        `📅 نقاط الأسبوع: <b>${stats.week.toLocaleString()}</b> 🪙`,
        `🎯 المهام المنفذة بنجاح: <b>${stats.ok_total.toLocaleString()}</b> / ${stats.actions_total.toLocaleString()}`,
      ];
      return { text: lines.join('\n'), keyboard: this.getKeyboard() };
    }

    if (data === 'settings') {
      return {
        text: `⚙️ <b>إعدادات النظام</b>\n\n🪙 التكلفة القياسية: <b>${DEFAULT_COST_PER_UNIT}</b> نقطة لكل وحدة\n🤖 التوكن الحالي: <code>${storage.getConfig().bot_token.slice(0, 15)}...</code>`,
        keyboard: [
          [{ text: '🗑️ مسح قائمة التخطي (Skips)', callback_data: 'clear_skips' }],
          [{ text: '🔙 رجوع', callback_data: 'menu_main' }],
        ],
      };
    }

    if (data === 'clear_skips') {
      const count = storage.clearSkipped();
      return {
        text: `✅ تم مسح ${count} طلبات من قائمة التخطي.`,
        keyboard: this.getKeyboard(),
      };
    }

    if (data === 'logout_all') {
      globalFarmer.stopAll();
      wsManager.stopAll();
      storage.clearAllAccounts();
      return {
        text: '✅ تم حذف وإلغاء تسجيل الدخول من جميع الحسابات بنجاح.',
        keyboard: this.getKeyboard(),
      };
    }

    if (data === 'ws_panel') {
      const cfg = storage.getConfig();
      const count = wsManager.activeCount();
      return {
        text: `🔔 <b>إشعارات WebSocket الحية</b>\n\nالحالة: ${cfg.ws_enabled ? '🟢 مفعّلة' : '🔴 معطّلة'}\nالاتصالات الحية: <b>${count}</b>`,
        keyboard: [
          [
            { text: cfg.ws_enabled ? '🔕 إيقاف WS' : '🔔 تفعيل WS', callback_data: 'ws_toggle' },
            { text: '🔄 إعادة اتصال', callback_data: 'ws_restart' },
          ],
          [{ text: '🔙 رجوع', callback_data: 'menu_main' }],
        ],
      };
    }

    if (data === 'ws_toggle') {
      const cfg = storage.getConfig();
      storage.updateConfig({ ws_enabled: !cfg.ws_enabled });
      if (cfg.ws_enabled) {
        wsManager.stopAll();
      } else {
        wsManager.startAll();
      }
      return this.handleCallback(chatId, 'ws_panel');
    }

    if (data === 'ws_restart') {
      wsManager.stopAll();
      const n = wsManager.startAll();
      return {
        text: `🔄 تمت إعادة تشغيل اتصالات WebSocket بنجاح (${n} اتصال).`,
        keyboard: this.getKeyboard(),
      };
    }

    return {
      text: 'الأمر غير معروف.',
      keyboard: this.getKeyboard(),
    };
  }
}

export const telegramSimulator = new TelegramBotSimulator();
