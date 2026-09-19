import express from 'express';
import { storage } from './storage.ts';
import { globalFarmer, farmingEvents } from './farmingEngine.ts';
import { wsManager, wsEventEmitter } from './wsManager.ts';
import { CampaignEngine } from './campaignEngine.ts';
import { telegramSimulator } from './telegramBotBridge.ts';
import {
  opLogin,
  opMigrationPing,
  opGetUsers,
  opFetchScore,
  opMyOrders,
  opAppSettings,
} from './tiksparkProtocol.ts';

export const apiRouter = express.Router();

apiRouter.use(express.json());

// 1. Overall System Status
apiRouter.get('/status', async (_req, res) => {
  try {
    const pingOk = await opMigrationPing();
    const accounts = storage.listAccounts();
    const totalScore = accounts.reduce((s, a) => s + (a.score || 0), 0);
    const dash = globalFarmer.getDashboardSnapshot();

    res.json({
      online: true,
      migrationPing: pingOk,
      accountsCount: accounts.length,
      activeFarmingCount: dash.activeCount,
      isFarming: dash.isRunning,
      totalScore,
      wsActiveCount: wsManager.activeCount(),
      peakTotalReqPerMin: dash.peakTotalReqPerMin,
      peakTotalCoinsPerMin: dash.peakTotalCoinsPerMin,
      config: storage.getConfig(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Accounts Endpoints
apiRouter.get('/accounts', (_req, res) => {
  const accounts = storage.listAccounts();
  const now = Math.floor(Date.now() / 1000);
  const enriched = accounts.map((a) => ({
    ...a,
    tokenExpiresInMinutes: a.token_exp ? Math.max(0, Math.floor((a.token_exp - now) / 60)) : 0,
  }));
  res.json(enriched);
});

apiRouter.post('/accounts/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبة' });
    return;
  }

  try {
    const existing = storage.getAccountByUsername(username);
    if (existing) {
      res.status(400).json({ error: `الحساب @${username} مضاف مسبقاً في النظام` });
      return;
    }

    const loginRes = await opLogin(username, password);
    if (!loginRes.success || !loginRes.uToken || !loginRes.user) {
      res.status(400).json({ error: loginRes.error || 'فشل تسجيل الدخول' });
      return;
    }

    const newAcc = storage.addAccount({
      username: loginRes.user.username || username,
      tiktok_id: loginRes.user.tiktokId,
      user_id: loginRes.user._id,
      nickname: loginRes.user.nickname,
      avatar: loginRes.user.avatar,
      referral_code: loginRes.user.referralCode,
      usertoken: loginRes.uToken,
      csrftoken: loginRes.cToken || '',
      refreshtoken: loginRes.rToken || '',
      score: Number(loginRes.user.score) || 0,
    });

    // Start WebSocket for this account if enabled
    wsManager.startForAccount(newAcc);

    res.json({ success: true, account: newAcc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/accounts/:id/refresh', async (req, res) => {
  const id = Number(req.params.id);
  const acc = storage.getAccount(id);
  if (!acc) {
    res.status(404).json({ error: 'الحساب غير موجود' });
    return;
  }

  try {
    const [me, score] = await Promise.all([
      opGetUsers(acc.usertoken, acc.csrftoken),
      opFetchScore(acc.usertoken, acc.csrftoken),
    ]);

    const updates: any = {};
    if (me) {
      updates.nickname = me.nickname || acc.nickname;
      updates.avatar = me.avatar || acc.avatar;
      updates.referral_code = me.referralCode || acc.referral_code;
      if (me._id) updates.user_id = me._id;
    }
    if (score !== null) {
      updates.score = score;
      updates.last_score = score;
    }

    const updated = storage.updateAccount(id, updates);
    res.json({ success: true, account: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/accounts/:id/toggle', (req, res) => {
  const id = Number(req.params.id);
  const acc = storage.getAccount(id);
  if (!acc) {
    res.status(404).json({ error: 'الحساب غير موجود' });
    return;
  }

  const updated = storage.updateAccount(id, { enabled: !acc.enabled });
  if (!updated?.enabled) {
    globalFarmer.stopAccount(id);
    wsManager.stopAccount(id);
  } else {
    wsManager.startForAccount(updated);
  }
  res.json({ success: true, account: updated });
});

apiRouter.delete('/accounts/:id', (req, res) => {
  const id = Number(req.params.id);
  globalFarmer.stopAccount(id);
  wsManager.stopAccount(id);
  const ok = storage.removeAccount(id);
  res.json({ success: ok });
});

apiRouter.post('/accounts/clear', (_req, res) => {
  globalFarmer.stopAll();
  wsManager.stopAll();
  storage.clearAllAccounts();
  res.json({ success: true });
});

// 3. Farming Engine Endpoints
apiRouter.get('/farm/dashboard', (_req, res) => {
  const snap = globalFarmer.getDashboardSnapshot();
  res.json(snap);
});

apiRouter.post('/farm/global/start', async (req, res) => {
  const { workers = 1, target = 0, runtime = 0 } = req.body;
  try {
    const started = await globalFarmer.startAll(workers, target, runtime);
    res.json({ success: true, startedAccounts: started });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/farm/global/stop', (_req, res) => {
  globalFarmer.stopAll();
  res.json({ success: true });
});

apiRouter.post('/farm/account/:id/start', async (req, res) => {
  const id = Number(req.params.id);
  const { workers = 1, target = 0, runtime = 0 } = req.body;
  try {
    const ok = await globalFarmer.startAccount(id, workers, target, runtime);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/farm/account/:id/stop', (req, res) => {
  const id = Number(req.params.id);
  const ok = globalFarmer.stopAccount(id);
  res.json({ success: ok });
});

// 4. Analytics & Projections
apiRouter.get('/analytics/stats', (req, res) => {
  const accountId = req.query.accountId ? Number(req.query.accountId) : undefined;
  const stats = storage.getStats(accountId);
  const recent = storage.getRecentStats(accountId, 300);
  const projection = storage.getDailyProjection(accountId);

  res.json({ stats, recent, projection });
});

apiRouter.get('/analytics/projections', (req, res) => {
  const accountId = req.query.accountId ? Number(req.query.accountId) : undefined;
  const proj = storage.getDailyProjection(accountId);
  res.json(proj);
});

apiRouter.get('/analytics/peaks', (_req, res) => {
  const dash = globalFarmer.getDashboardSnapshot();
  res.json({
    peakTotalReqPerMin: dash.peakTotalReqPerMin,
    peakTotalCoinsPerMin: dash.peakTotalCoinsPerMin,
    peakAt: dash.peakAt,
    accountsPeaks: dash.accounts.map((a) => ({
      accountId: a.accountId,
      username: a.username,
      peakReqPerMin: a.rate.peak_req_per_min,
      peakCoinsPerMin: a.rate.peak_coins_per_min,
      peakAt: a.rate.peak_at,
    })),
  });
});

// 5. Orders & Campaigns
apiRouter.get('/orders/:accountId', async (req, res) => {
  const accountId = Number(req.params.accountId);
  const acc = storage.getAccount(accountId);
  if (!acc) {
    res.status(404).json({ error: 'الحساب غير موجود' });
    return;
  }

  try {
    const orders = await opMyOrders(acc.usertoken, acc.csrftoken);
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/campaigns', (_req, res) => {
  const list = storage.listCampaigns(30);
  res.json(list);
});

apiRouter.post('/campaigns/launch', async (req, res) => {
  const { type, target, total_amount, mode } = req.body;
  if (!type || !target) {
    res.status(400).json({ error: 'نوع الخدمة والهدف مطلوبان' });
    return;
  }

  try {
    const result = await CampaignEngine.launch({
      type,
      target,
      total_amount: Number(total_amount) || 0,
      mode: mode || (total_amount > 0 ? 'fixed' : 'auto'),
    });
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Settings & Config
apiRouter.get('/settings', async (_req, res) => {
  const accounts = storage.listAccounts(true);
  let liveSettings = storage.getAppSettings()?.data || null;

  if (!liveSettings && accounts.length > 0) {
    try {
      const fetched = await opAppSettings(accounts[0].usertoken, accounts[0].csrftoken);
      if (fetched) {
        storage.cacheAppSettings(fetched);
        liveSettings = fetched;
      }
    } catch {
      // Ignore
    }
  }

  res.json({
    config: storage.getConfig(),
    appSettings: liveSettings,
  });
});

apiRouter.post('/settings', (req, res) => {
  const updated = storage.updateConfig(req.body);
  res.json({ success: true, config: updated });
});

apiRouter.post('/settings/clear-skips', (_req, res) => {
  const cleared = storage.clearSkipped();
  res.json({ success: true, count: cleared });
});

// 7. WebSocket Events & Control
apiRouter.get('/ws/events', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 40;
  const events = storage.getWsEvents(limit);
  res.json(events);
});

apiRouter.post('/ws/toggle', (_req, res) => {
  const cfg = storage.getConfig();
  const nextVal = !cfg.ws_enabled;
  storage.updateConfig({ ws_enabled: nextVal });

  if (!nextVal) {
    wsManager.stopAll();
  } else {
    wsManager.startAll();
  }

  res.json({ success: true, ws_enabled: nextVal, activeCount: wsManager.activeCount() });
});

apiRouter.post('/ws/reconnect', (_req, res) => {
  wsManager.stopAll();
  const count = wsManager.startAll();
  res.json({ success: true, activeCount: count });
});

// 8. CSV Exports
apiRouter.get('/export/actions.csv', (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const accId = req.query.accountId ? Number(req.query.accountId) : undefined;
  const { csv } = storage.exportActionsCsv(days, accId);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=tikspark_actions_${Date.now()}.csv`);
  res.send(csv);
});

apiRouter.get('/export/campaigns.csv', (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 90;
  const { csv } = storage.exportCampaignsCsv(days);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=tikspark_campaigns_${Date.now()}.csv`);
  res.send(csv);
});

// 9. Telegram Bot Bridge / Simulator Interaction
apiRouter.post('/telegram/interact', async (req, res) => {
  const { chatId = 'web_user', message, callbackData } = req.body;
  try {
    let result;
    if (callbackData) {
      result = await telegramSimulator.handleCallback(chatId, callbackData);
    } else {
      result = await telegramSimulator.handleMessage(chatId, message || '');
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Server-Sent Events (SSE) Live Feed for real-time frontend charts & toasts
apiRouter.get('/stream/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onFarmingAction = (data: any) => sendEvent('farming_action', data);
  const onFarmingStatus = (data: any) => sendEvent('farming_status', data);
  const onWsEvent = (data: any) => sendEvent('ws_notification', data);

  farmingEvents.on('action', onFarmingAction);
  farmingEvents.on('status', onFarmingStatus);
  wsEventEmitter.on('event', onWsEvent);

  // Send dashboard stats every 2 seconds
  const interval = setInterval(() => {
    sendEvent('dashboard_tick', globalFarmer.getDashboardSnapshot());
  }, 2000);

  req.on('close', () => {
    clearInterval(interval);
    farmingEvents.off('action', onFarmingAction);
    farmingEvents.off('status', onFarmingStatus);
    wsEventEmitter.off('event', onWsEvent);
  });
});
