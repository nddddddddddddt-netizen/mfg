import { storage, Account } from './storage.ts';
import {
  opActionOrder,
  opFetchOrders,
  opFetchScore,
  opRecordSkippedOrders,
} from './tiksparkProtocol.ts';
import { RateTracker, RateSnapshot } from './rateTracker.ts';
import { EventEmitter } from 'events';

export const farmingEvents = new EventEmitter();

export interface AccountFarmerSnapshot {
  accountId: number;
  username: string;
  processed: number;
  coins: number;
  errors: number;
  speed: number;
  running: boolean;
  started: number;
  target: number;
  runtime: number;
  queueSize: number;
  rate: RateSnapshot;
}

export interface GlobalDashboardSnapshot {
  activeCount: number;
  elapsedSec: number;
  totalReqPerMin: number;
  totalCoinsPerMin: number;
  totalCoinsPerHour: number;
  totalProcessedSession: number;
  totalCoinsSession: number;
  avgCoinsPerReq: number;
  peakTotalReqPerMin: number;
  peakTotalCoinsPerMin: number;
  peakAt: number;
  accounts: AccountFarmerSnapshot[];
  isRunning: boolean;
}

export class AccountFarmer {
  public accountId: number;
  public username: string;
  public workersCount: number;
  public target: number;
  public runtime: number;

  public isRunning = false;
  private stopRequested = false;
  private queue: string[] = [];
  private processed = 0;
  private coins = 0;
  private consecErrors = 0;
  private consecSuccess = 0;
  private lastScore = 0;
  private started = 0;
  private speed = 1.0;
  private sessionId: number | null = null;
  private stopReason = 'user';
  private failMap = new Map<string, number>();

  public rate = new RateTracker(300);
  private workerPromises: Promise<void>[] = [];
  private refillerInterval: NodeJS.Timeout | null = null;

  constructor(accountId: number, workers = 1, target = 0, runtime = 0) {
    this.accountId = accountId;
    const acc = storage.getAccount(accountId);
    this.username = acc?.username || `#${accountId}`;
    this.workersCount = Math.max(1, Math.min(5, workers));
    this.target = target;
    this.runtime = runtime;
  }

  private getAccount(): Account | undefined {
    return storage.getAccount(this.accountId);
  }

  public async start() {
    const acc = this.getAccount();
    if (!acc || !acc.usertoken) {
      throw new Error(`الحساب #${this.accountId} غير موجود أو بدون تصريح.`);
    }

    this.isRunning = true;
    this.stopRequested = false;
    this.started = Math.floor(Date.now() / 1000);
    this.lastScore = acc.score || 0;

    this.sessionId = storage.startSession(this.accountId, this.workersCount);
    storage.updateAccount(this.accountId, { farming: true });

    // Initial score check
    try {
      const initialScore = await opFetchScore(acc.usertoken, acc.csrftoken);
      if (initialScore !== null) {
        this.lastScore = initialScore;
        storage.updateAccount(this.accountId, { score: initialScore, last_score: initialScore });
      }
    } catch {
      // Ignore
    }

    // Start refiller loop
    this.runRefillerLoop();

    // Start worker routines
    for (let i = 0; i < this.workersCount; i++) {
      this.workerPromises.push(this.workerRoutine(i));
    }

    farmingEvents.emit('status', {
      type: 'account_started',
      accountId: this.accountId,
      username: this.username,
    });
  }

  public stop(reason = 'user') {
    this.stopRequested = true;
    this.stopReason = reason;
  }

  private async processOrder(orderId: string): Promise<{ ok: boolean; gained: number }> {
    const acc = this.getAccount();
    if (!acc) return { ok: false, gained: 0 };

    const { success, result } = await opActionOrder(acc.usertoken, acc.csrftoken, orderId);

    if (success && result) {
      const newScore = Number(result.score) || this.lastScore;
      const gained = Math.max(0, newScore - this.lastScore);
      this.lastScore = newScore;

      storage.updateAccount(this.accountId, { score: newScore, last_score: newScore });
      storage.logAction(this.accountId, orderId, gained, true);
      this.rate.record(gained, true);

      farmingEvents.emit('action', {
        accountId: this.accountId,
        username: this.username,
        orderId,
        coinsGained: gained,
        newScore,
        success: true,
      });

      return { ok: true, gained };
    }

    storage.logAction(this.accountId, orderId, 0, false);
    this.rate.record(0, false);

    farmingEvents.emit('action', {
      accountId: this.accountId,
      username: this.username,
      orderId,
      coinsGained: 0,
      newScore: this.lastScore,
      success: false,
    });

    return { ok: false, gained: 0 };
  }

  private async workerRoutine(workerId: number) {
    while (!this.stopRequested) {
      if (this.queue.length === 0) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }

      const orderId = this.queue.shift();
      if (!orderId) continue;

      try {
        const { ok, gained } = await this.processOrder(orderId);

        if (ok) {
          this.processed += 1;
          this.coins += gained;
          this.consecErrors = 0;
          this.consecSuccess += 1;
          this.failMap.delete(orderId);

          if (this.consecSuccess >= 5) {
            this.speed = Math.max(0.5, this.speed * 0.93);
          }

          // In TikSpark, same active order can sometimes be executed again if space remains
          if (!this.stopRequested && Math.random() > 0.4) {
            this.queue.push(orderId);
          }
        } else {
          this.consecErrors += 1;
          this.consecSuccess = 0;
          this.speed = Math.min(3.0, this.speed * 1.15);

          const currentFails = (this.failMap.get(orderId) || 0) + 1;
          this.failMap.set(orderId, currentFails);

          if (currentFails >= 3) {
            storage.recordSkip(orderId, this.accountId, '3 fails');
          }
        }

        // Check completion triggers
        if (this.runtime > 0 && Math.floor(Date.now() / 1000) - this.started >= this.runtime) {
          this.stop('runtime');
          break;
        }
        if (this.target > 0 && this.coins >= this.target) {
          this.stop('target');
          break;
        }
        if (this.consecErrors >= 20) {
          this.stop('errors');
          break;
        }

        // Dynamic pacing
        const sleepDuration = (Math.random() * (2.6 - 1.3) + 1.3) * this.speed * 1000;
        await new Promise((r) => setTimeout(r, sleepDuration));
      } catch (err) {
        console.error(`Worker ${workerId} error on account #${this.accountId}:`, err);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    await this.cleanup();
  }

  private async runRefillerLoop() {
    const refill = async () => {
      if (this.stopRequested) return;

      try {
        const acc = this.getAccount();
        if (!acc) return;

        const pending: string[] = [];
        for (let page = 1; page <= 2; page++) {
          const orders = await opFetchOrders(acc.usertoken, acc.csrftoken, page);
          for (const o of orders) {
            const oid = o._id;
            if (oid && !storage.isSkipped(oid) && !this.queue.includes(oid)) {
              pending.push(oid);
            }
          }
          if (orders.length < 10) break;
        }

        if (pending.length > 0) {
          const space = Math.max(0, 30 - this.queue.length);
          // Shuffle
          pending.sort(() => Math.random() - 0.5);
          const toAdd = pending.slice(0, space);
          this.queue.push(...toAdd);
        }
      } catch (err) {
        console.error(`Refiller error on account #${this.accountId}:`, err);
      }

      if (!this.stopRequested) {
        this.refillerInterval = setTimeout(refill, this.queue.length < 5 ? 3000 : 7000);
      }
    };

    refill();
  }

  private async cleanup() {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.refillerInterval) {
      clearTimeout(this.refillerInterval);
      this.refillerInterval = null;
    }

    storage.updateAccount(this.accountId, {
      farming: false,
      last_score: this.lastScore,
    });

    if (this.sessionId) {
      storage.endSession(this.sessionId, this.processed, this.coins, this.stopReason);
    }

    // Submit skipped orders if any reached 3 fails
    const failed3 = Array.from(this.failMap.entries())
      .filter(([, count]) => count >= 3)
      .map(([oid]) => oid);

    if (failed3.length > 0) {
      try {
        const acc = this.getAccount();
        if (acc) {
          await opRecordSkippedOrders(acc.usertoken, acc.csrftoken, failed3);
        }
      } catch {
        // Ignore
      }
    }

    // Fetch latest fresh score
    try {
      const acc = this.getAccount();
      if (acc) {
        const sc = await opFetchScore(acc.usertoken, acc.csrftoken);
        if (sc !== null) {
          storage.updateAccount(this.accountId, { score: sc, last_score: sc });
        }
      }
    } catch {
      // Ignore
    }

    farmingEvents.emit('status', {
      type: 'account_stopped',
      accountId: this.accountId,
      username: this.username,
      reason: this.stopReason,
      processed: this.processed,
      coins: this.coins,
    });
  }

  public snapshot(): AccountFarmerSnapshot {
    return {
      accountId: this.accountId,
      username: this.username,
      processed: this.processed,
      coins: this.coins,
      errors: this.consecErrors,
      speed: Number(this.speed.toFixed(2)),
      running: this.isRunning && !this.stopRequested,
      started: this.started,
      target: this.target,
      runtime: this.runtime,
      queueSize: this.queue.length,
      rate: this.rate.snapshot(),
    };
  }
}

export class GlobalFarmer {
  private farmers = new Map<number, AccountFarmer>();
  public startedAt = Math.floor(Date.now() / 1000);
  public peakTotalReqPerMin = 0.0;
  public peakTotalCoinsPerMin = 0.0;
  public peakAt = 0;

  public async startAccount(accountId: number, workers = 1, target = 0, runtime = 0) {
    let farmer = this.farmers.get(accountId);
    if (farmer && farmer.isRunning) {
      return false;
    }

    farmer = new AccountFarmer(accountId, workers, target, runtime);
    this.farmers.set(accountId, farmer);
    await farmer.start();
    return true;
  }

  public async startAll(workersPerAccount = 1, target = 0, runtime = 0): Promise<string[]> {
    const accounts = storage.listAccounts(true);
    const started: string[] = [];

    for (const acc of accounts) {
      try {
        const ok = await this.startAccount(acc.id, workersPerAccount, target, runtime);
        if (ok) started.push(acc.username);
      } catch (err) {
        console.error(`Failed to start farming for @${acc.username}:`, err);
      }
    }

    this.startedAt = Math.floor(Date.now() / 1000);
    return started;
  }

  public stopAll() {
    for (const farmer of this.farmers.values()) {
      farmer.stop('user');
    }
  }

  public stopAccount(accountId: number): boolean {
    const farmer = this.farmers.get(accountId);
    if (farmer && farmer.isRunning) {
      farmer.stop('user');
      return true;
    }
    return false;
  }

  public isAnyRunning(): boolean {
    for (const f of this.farmers.values()) {
      if (f.isRunning) return true;
    }
    return false;
  }

  public getDashboardSnapshot(): GlobalDashboardSnapshot {
    const activeFarmers: AccountFarmerSnapshot[] = [];
    let totalReqPerMin = 0;
    let totalCoinsPerMin = 0;
    let totalProcessed = 0;
    let totalCoins = 0;

    for (const f of this.farmers.values()) {
      const snap = f.snapshot();
      if (snap.running) {
        activeFarmers.push(snap);
        totalReqPerMin += snap.rate.req_per_min;
        totalCoinsPerMin += snap.rate.coins_per_min;
        totalProcessed += snap.processed;
        totalCoins += snap.coins;
      }
    }

    // Track total sum peaks
    if (totalReqPerMin > this.peakTotalReqPerMin) {
      this.peakTotalReqPerMin = Number(totalReqPerMin.toFixed(2));
      this.peakAt = Math.floor(Date.now() / 1000);
    }
    if (totalCoinsPerMin > this.peakTotalCoinsPerMin) {
      this.peakTotalCoinsPerMin = Number(totalCoinsPerMin.toFixed(2));
      this.peakAt = Math.floor(Date.now() / 1000);
    }

    const elapsed = Math.max(1, Math.floor(Date.now() / 1000) - this.startedAt);

    return {
      activeCount: activeFarmers.length,
      elapsedSec: elapsed,
      totalReqPerMin: Number(totalReqPerMin.toFixed(2)),
      totalCoinsPerMin: Number(totalCoinsPerMin.toFixed(2)),
      totalCoinsPerHour: Number((totalCoinsPerMin * 60).toFixed(0)),
      totalProcessedSession: totalProcessed,
      totalCoinsSession: totalCoins,
      avgCoinsPerReq: totalProcessed > 0 ? Number((totalCoins / totalProcessed).toFixed(2)) : 0,
      peakTotalReqPerMin: this.peakTotalReqPerMin,
      peakTotalCoinsPerMin: this.peakTotalCoinsPerMin,
      peakAt: this.peakAt,
      accounts: activeFarmers,
      isRunning: this.isAnyRunning(),
    };
  }
}

export const globalFarmer = new GlobalFarmer();

// Auto token refresher loop (runs every 60s)
const tokenRefresherInterval = setInterval(async () => {
  try {
    const config = storage.getConfig();
    if (!config.auto_refresh_tokens) return;

    const accounts = storage.listAccounts();
    const now = Math.floor(Date.now() / 1000);

    for (const acc of accounts) {
      if (!acc.usertoken) continue;

      if (acc.token_exp && acc.token_exp - now < 300) {
        const { opRefreshToken, parseJwt } = await import('./tiksparkProtocol.ts');
        const res = await opRefreshToken(acc.usertoken);
        if (res.success && res.accessToken) {
          const { exp, iat } = parseJwt(res.accessToken);
          storage.updateAccount(acc.id, {
            usertoken: res.accessToken,
            refreshtoken: res.refreshToken || acc.refreshtoken,
            token_exp: exp,
            token_iat: iat,
          });
          console.log(`[TokenRefresher] Token refreshed for @${acc.username}`);
        }
      }
    }
  } catch (err) {
    console.error('Error in token refresh loop:', err);
  }
}, 60000);

tokenRefresherInterval.unref();

