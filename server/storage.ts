import fs from 'fs';
import path from 'path';
import { parseJwt } from './tiksparkProtocol.ts';

export interface Account {
  id: number;
  idx: number;
  username: string;
  tiktok_id: string;
  user_id: string;
  nickname: string;
  avatar: string;
  referral_code: string;
  usertoken: string;
  csrftoken: string;
  refreshtoken: string;
  token_exp: number;
  token_iat: number;
  score: number;
  last_score: number;
  farming: boolean;
  enabled: boolean;
  notes: string;
  created_at: number;
  updated_at: number;
}

export interface ActionLog {
  id: number;
  account_id: number;
  order_id: string;
  coins: number;
  ok: boolean;
  ts: number;
}

export interface SessionLog {
  id: number;
  account_id: number;
  started_at: number;
  ended_at?: number;
  processed: number;
  coins: number;
  workers: number;
  stopped_reason?: string;
}

export interface Campaign {
  id: number;
  type: string;
  target: string;
  total_amount: number;
  mode: string;
  status: string;
  distribution: Record<string, number>;
  results?: any;
  created_at: number;
  finished_at?: number;
}

export interface WsEvent {
  id: number;
  account_id: number;
  event_type: string;
  message: string;
  ts: number;
}

export interface SkippedOrder {
  order_id: string;
  account_id: number;
  reason: string;
  fail_count: number;
  ts: number;
}

export interface AppStoreData {
  accounts: Account[];
  actions: ActionLog[];
  sessions: SessionLog[];
  campaigns: Campaign[];
  skipped_orders: Record<string, SkippedOrder>;
  ws_events: WsEvent[];
  app_settings: any;
  config: {
    bot_token: string;
    ws_enabled: boolean;
    workers_per_account: number;
    auto_refresh_tokens: boolean;
  };
  nextId: {
    account: number;
    action: number;
    session: number;
    campaign: number;
    ws_event: number;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'tikspark_db.json');

class StorageManager {
  private data: AppStoreData;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadInitialData();
  }

  private loadInitialData(): AppStoreData {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          accounts: parsed.accounts || [],
          actions: parsed.actions || [],
          sessions: parsed.sessions || [],
          campaigns: parsed.campaigns || [],
          skipped_orders: parsed.skipped_orders || {},
          ws_events: parsed.ws_events || [],
          app_settings: parsed.app_settings || null,
          config: {
            bot_token: parsed.config?.bot_token || '8901472043:AAGEUECIuDAkwu20cE7Je8HUW_CRoLAD2Yc',
            ws_enabled: parsed.config?.ws_enabled ?? true,
            workers_per_account: parsed.config?.workers_per_account || 1,
            auto_refresh_tokens: parsed.config?.auto_refresh_tokens ?? true,
          },
          nextId: parsed.nextId || {
            account: (parsed.accounts?.length || 0) + 1,
            action: (parsed.actions?.length || 0) + 1,
            session: (parsed.sessions?.length || 0) + 1,
            campaign: (parsed.campaigns?.length || 0) + 1,
            ws_event: (parsed.ws_events?.length || 0) + 1,
          },
        };
      }
    } catch (e) {
      console.error('Failed to load database from disk, initializing fresh:', e);
    }

    return {
      accounts: [],
      actions: [],
      sessions: [],
      campaigns: [],
      skipped_orders: {},
      ws_events: [],
      app_settings: null,
      config: {
        bot_token: '8901472043:AAGEUECIuDAkwu20cE7Je8HUW_CRoLAD2Yc',
        ws_enabled: true,
        workers_per_account: 1,
        auto_refresh_tokens: true,
      },
      nextId: {
        account: 1,
        action: 1,
        session: 1,
        campaign: 1,
        ws_event: 1,
      },
    };
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        // Keep max 50,000 actions to manage memory & disk
        if (this.data.actions.length > 50000) {
          this.data.actions = this.data.actions.slice(-40000);
        }
        // Keep max 1,000 ws events
        if (this.data.ws_events.length > 1000) {
          this.data.ws_events = this.data.ws_events.slice(-1000);
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (err) {
        console.error('Error saving data to disk:', err);
      }
    }, 400);
  }

  // --- Accounts ---
  public listAccounts(enabledOnly = false): Account[] {
    const list = enabledOnly ? this.data.accounts.filter((a) => a.enabled) : this.data.accounts;
    return [...list].sort((a, b) => a.idx - b.idx);
  }

  public getAccount(id: number): Account | undefined {
    return this.data.accounts.find((a) => a.id === id);
  }

  public getAccountByUsername(username: string): Account | undefined {
    return this.data.accounts.find((a) => a.username.toLowerCase() === username.toLowerCase());
  }

  public addAccount(params: {
    username: string;
    tiktok_id?: string;
    user_id?: string;
    nickname?: string;
    avatar?: string;
    referral_code?: string;
    usertoken: string;
    csrftoken: string;
    refreshtoken?: string;
    score?: number;
  }): Account {
    const maxIdx = this.data.accounts.reduce((max, a) => Math.max(max, a.idx), 0);
    const { exp, iat, userId } = parseJwt(params.usertoken);
    const now = Math.floor(Date.now() / 1000);

    const newAcc: Account = {
      id: this.data.nextId.account++,
      idx: maxIdx + 1,
      username: params.username,
      tiktok_id: params.tiktok_id || '',
      user_id: params.user_id || userId || '',
      nickname: params.nickname || params.username,
      avatar: params.avatar || '',
      referral_code: params.referral_code || '',
      usertoken: params.usertoken,
      csrftoken: params.csrftoken,
      refreshtoken: params.refreshtoken || '',
      token_exp: exp,
      token_iat: iat,
      score: params.score || 0,
      last_score: params.score || 0,
      farming: false,
      enabled: true,
      notes: '',
      created_at: now,
      updated_at: now,
    };

    this.data.accounts.push(newAcc);
    this.scheduleSave();
    return newAcc;
  }

  public updateAccount(id: number, fields: Partial<Account>): Account | undefined {
    const acc = this.getAccount(id);
    if (!acc) return undefined;

    Object.assign(acc, fields);
    acc.updated_at = Math.floor(Date.now() / 1000);
    this.scheduleSave();
    return acc;
  }

  public removeAccount(id: number): boolean {
    const idx = this.data.accounts.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.data.accounts.splice(idx, 1);
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public clearAllAccounts(): void {
    this.data.accounts = [];
    this.scheduleSave();
  }

  // --- Actions ---
  public logAction(accountId: number, orderId: string, coins: number, ok = true): ActionLog {
    const action: ActionLog = {
      id: this.data.nextId.action++,
      account_id: accountId,
      order_id: orderId,
      coins: Number(coins) || 0,
      ok,
      ts: Math.floor(Date.now() / 1000),
    };
    this.data.actions.push(action);
    this.scheduleSave();
    return action;
  }

  // --- WebSocket Events ---
  public logWsEvent(accountId: number, eventType: string, message: string): WsEvent {
    const event: WsEvent = {
      id: this.data.nextId.ws_event++,
      account_id: accountId,
      event_type: eventType,
      message,
      ts: Math.floor(Date.now() / 1000),
    };
    this.data.ws_events.push(event);
    this.scheduleSave();
    return event;
  }

  public getWsEvents(limit = 30): (WsEvent & { username?: string })[] {
    const accMap = new Map(this.data.accounts.map((a) => [a.id, a.username]));
    return [...this.data.ws_events]
      .sort((a, b) => b.id - a.id)
      .slice(0, limit)
      .map((e) => ({
        ...e,
        username: accMap.get(e.account_id) || `#${e.account_id}`,
      }));
  }

  // --- Sessions ---
  public startSession(accountId: number, workers: number): number {
    const session: SessionLog = {
      id: this.data.nextId.session++,
      account_id: accountId,
      started_at: Math.floor(Date.now() / 1000),
      processed: 0,
      coins: 0,
      workers,
    };
    this.data.sessions.push(session);
    this.scheduleSave();
    return session.id;
  }

  public endSession(sid: number, processed: number, coins: number, reason: string): void {
    const sess = this.data.sessions.find((s) => s.id === sid);
    if (sess) {
      sess.ended_at = Math.floor(Date.now() / 1000);
      sess.processed = processed;
      sess.coins = coins;
      sess.stopped_reason = reason;
      this.scheduleSave();
    }
  }

  // --- Campaigns ---
  public createCampaign(params: {
    type: string;
    target: string;
    total_amount: number;
    mode: string;
    distribution: Record<string, number>;
  }): Campaign {
    const campaign: Campaign = {
      id: this.data.nextId.campaign++,
      type: params.type,
      target: params.target,
      total_amount: params.total_amount,
      mode: params.mode,
      status: 'running',
      distribution: params.distribution,
      created_at: Math.floor(Date.now() / 1000),
    };
    this.data.campaigns.push(campaign);
    this.scheduleSave();
    return campaign;
  }

  public finishCampaign(cid: number, results: any): void {
    const camp = this.data.campaigns.find((c) => c.id === cid);
    if (camp) {
      camp.status = 'done';
      camp.results = results;
      camp.finished_at = Math.floor(Date.now() / 1000);
      this.scheduleSave();
    }
  }

  public listCampaigns(limit = 20): Campaign[] {
    return [...this.data.campaigns].sort((a, b) => b.id - a.id).slice(0, limit);
  }

  // --- Skipped Orders ---
  public recordSkip(orderId: string, accountId: number, reason = ''): void {
    const existing = this.data.skipped_orders[orderId];
    const now = Math.floor(Date.now() / 1000);
    if (existing) {
      existing.fail_count += 1;
      existing.ts = now;
    } else {
      this.data.skipped_orders[orderId] = {
        order_id: orderId,
        account_id: accountId,
        reason,
        fail_count: 1,
        ts: now,
      };
    }
    this.scheduleSave();
  }

  public isSkipped(orderId: string): boolean {
    const item = this.data.skipped_orders[orderId];
    return Boolean(item && item.fail_count >= 3);
  }

  public clearSkipped(): number {
    const count = Object.keys(this.data.skipped_orders).length;
    this.data.skipped_orders = {};
    this.scheduleSave();
    return count;
  }

  // --- App Settings ---
  public cacheAppSettings(settings: any): void {
    this.data.app_settings = {
      data: settings,
      fetched_at: Math.floor(Date.now() / 1000),
    };
    this.scheduleSave();
  }

  public getAppSettings() {
    return this.data.app_settings;
  }

  // --- Config ---
  public getConfig() {
    return this.data.config;
  }

  public updateConfig(fields: Partial<AppStoreData['config']>) {
    Object.assign(this.data.config, fields);
    this.scheduleSave();
    return this.data.config;
  }

  // --- Analytics & Statistics ---
  public getStats(accountId?: number) {
    const now = Math.floor(Date.now() / 1000);
    const dayCutoff = now - 86400;
    const weekCutoff = now - 7 * 86400;

    let actions = this.data.actions;
    if (accountId) {
      actions = actions.filter((a) => a.account_id === accountId);
    }

    let today = 0;
    let week = 0;
    let total = 0;
    let okTotal = 0;

    for (const a of actions) {
      if (a.ok) {
        total += a.coins;
        if (a.ts >= dayCutoff) today += a.coins;
        if (a.ts >= weekCutoff) week += a.coins;
        okTotal++;
      }
    }

    return {
      today,
      week,
      total,
      actions_total: actions.length,
      ok_total: okTotal,
    };
  }

  public getRecentStats(accountId?: number, windowSec = 300) {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - windowSec;

    let actions = this.data.actions.filter((a) => a.ts >= cutoff);
    if (accountId) {
      actions = actions.filter((a) => a.account_id === accountId);
    }

    if (!actions.length) return null;

    const firstTs = actions[0].ts;
    const lastTs = actions[actions.length - 1].ts;
    const rawSpan = Math.min(Math.max(1, lastTs - firstTs), windowSec);
    const effSpan = Math.max(60, rawSpan);
    const mult = 60.0 / effSpan;

    const okCount = actions.filter((a) => a.ok).length;
    const totalCoins = actions.filter((a) => a.ok).reduce((sum, a) => sum + a.coins, 0);

    return {
      requests: actions.length,
      ok_count: okCount,
      total_coins: totalCoins,
      req_per_min: actions.length * mult,
      coins_per_min: totalCoins * mult,
      avg_coins_per_req: okCount > 0 ? totalCoins / okCount : 0,
      span_sec: rawSpan,
      window_sec: windowSec,
    };
  }

  public getDailyProjection(accountId?: number) {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400;

    let actions = this.data.actions.filter((a) => a.ts >= dayAgo);
    if (accountId) {
      actions = actions.filter((a) => a.account_id === accountId);
    }

    if (actions.length < 2) return null;

    const firstTs = actions[0].ts;
    const lastTs = actions[actions.length - 1].ts;
    const span = lastTs - firstTs;

    if (span < 60) return null;

    const coins = actions.filter((a) => a.ok).reduce((sum, a) => sum + a.coins, 0);
    const rate = coins / span;

    return {
      daily: Math.floor(rate * 86400),
      hourly: Math.floor(rate * 3600),
      last_24h_coins: coins,
      last_24h_actions: actions.length,
    };
  }

  // --- CSV Exports ---
  public exportActionsCsv(days = 30, accountId?: number): { csv: string; count: number } {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - days * 86400;
    const accMap = new Map(this.data.accounts.map((a) => [a.id, a.username]));

    let rows = this.data.actions.filter((a) => a.ts >= cutoff);
    if (accountId) {
      rows = rows.filter((a) => a.account_id === accountId);
    }

    rows.sort((a, b) => b.ts - a.ts);

    let csv = '\ufefftimestamp_utc,timestamp_local,account,order_id,coins,success\n';
    for (const r of rows) {
      const d = new Date(r.ts * 1000);
      const utcStr = d.toISOString().replace('T', ' ').replace(/\..+/, '');
      const locStr = d.toLocaleString('sv-SE');
      const accName = accMap.get(r.account_id) || `#${r.account_id}`;
      csv += `"${utcStr}","${locStr}","${accName}","${r.order_id}",${r.coins},"${r.ok ? 'yes' : 'no'}"\n`;
    }

    return { csv, count: rows.length };
  }

  public exportCampaignsCsv(days = 90): { csv: string; count: number } {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - days * 86400;

    const rows = this.data.campaigns.filter((c) => c.created_at >= cutoff);
    rows.sort((a, b) => b.created_at - a.created_at);

    let csv =
      '\ufeffid,type,target,planned_amount,mode,status,total_launched,success_accounts,failed_accounts,created_at,finished_at\n';
    for (const r of rows) {
      const cDate = new Date(r.created_at * 1000).toISOString().replace('T', ' ').replace(/\..+/, '');
      const fDate = r.finished_at ? new Date(r.finished_at * 1000).toISOString().replace('T', ' ').replace(/\..+/, '') : '';
      const launched = r.results?.total_launched || 0;
      const success = r.results?.success || 0;
      const failed = r.results?.failed || 0;
      csv += `"${r.id}","${r.type}","${r.target}",${r.total_amount},"${r.mode}","${r.status}",${launched},${success},${failed},"${cDate}","${fDate}"\n`;
    }

    return { csv, count: rows.length };
  }
}

export const storage = new StorageManager();
