export interface RateSnapshot {
  req_per_min: number;
  coins_per_min: number;
  avg_coins_per_req: number;
  span_sec: number;
  sample: number;
  window_requests: number;
  window_coins: number;
  window_ok: number;
  lifetime_requests: number;
  lifetime_ok: number;
  lifetime_coins: number;
  lifetime_avg: number;
  peak_req_per_min: number;
  peak_coins_per_min: number;
  peak_at: number;
}

interface RateEvent {
  ts: number;
  coins: number;
  ok: boolean;
}

export class RateTracker {
  private windowSec: number;
  private maxEvents: number;
  private events: RateEvent[] = [];
  private totalRequests = 0;
  private totalOk = 0;
  private totalCoins = 0;

  private peakReqPerMin = 0.0;
  private peakCoinsPerMin = 0.0;
  private peakAt = 0;
  private eventsSincePeak = 0;

  constructor(windowSec = 300, maxEvents = 5000) {
    this.windowSec = windowSec;
    this.maxEvents = maxEvents;
  }

  private prune(now: number) {
    const cutoff = now - this.windowSec;
    while (this.events.length > 0 && this.events[0].ts < cutoff) {
      this.events.shift();
    }
  }

  private updatePeak(now: number) {
    if (this.events.length < 5) return;
    const firstTs = this.events[0].ts;
    const rawSpan = Math.max(0.0, now - firstTs);
    const effSpan = rawSpan < 30.0 ? 60.0 : Math.min(rawSpan, this.windowSec);
    const mult = 60.0 / effSpan;

    const reqPm = this.events.length * mult;
    let coinsSum = 0;
    for (const e of this.events) {
      if (e.ok) coinsSum += e.coins;
    }
    const coinsPm = coinsSum * mult;

    if (reqPm > this.peakReqPerMin) {
      this.peakReqPerMin = reqPm;
      this.peakAt = Math.floor(now);
    }
    if (coinsPm > this.peakCoinsPerMin) {
      this.peakCoinsPerMin = coinsPm;
      this.peakAt = Math.floor(now);
    }
  }

  public record(coins: number, ok = true) {
    const now = Date.now() / 1000;
    this.events.push({ ts: now, coins: Math.floor(coins), ok });
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    this.prune(now);

    this.totalRequests += 1;
    if (ok) {
      this.totalOk += 1;
      this.totalCoins += Math.floor(coins);
    }

    this.eventsSincePeak += 1;
    if (this.eventsSincePeak >= 10) {
      this.eventsSincePeak = 0;
      this.updatePeak(now);
    }
  }

  public snapshot(): RateSnapshot {
    const now = Date.now() / 1000;
    this.prune(now);
    this.updatePeak(now);

    const emptyRes: RateSnapshot = {
      req_per_min: 0.0,
      coins_per_min: 0.0,
      avg_coins_per_req: 0.0,
      span_sec: 0,
      sample: 0,
      window_requests: 0,
      window_coins: 0,
      window_ok: 0,
      lifetime_requests: this.totalRequests,
      lifetime_ok: this.totalOk,
      lifetime_coins: this.totalCoins,
      lifetime_avg: this.totalOk > 0 ? this.totalCoins / this.totalOk : 0.0,
      peak_req_per_min: this.peakReqPerMin,
      peak_coins_per_min: this.peakCoinsPerMin,
      peak_at: this.peakAt,
    };

    if (this.events.length === 0) return emptyRes;

    const firstTs = this.events[0].ts;
    const rawSpan = Math.max(0.0, now - firstTs);
    const effSpan = rawSpan < 30.0 ? 60.0 : Math.min(rawSpan, this.windowSec);
    const mult = 60.0 / effSpan;

    const okEvents = this.events.filter((e) => e.ok);
    const coinsSum = okEvents.reduce((sum, e) => sum + e.coins, 0);

    return {
      req_per_min: Number((this.events.length * mult).toFixed(2)),
      coins_per_min: Number((coinsSum * mult).toFixed(2)),
      avg_coins_per_req: okEvents.length > 0 ? Number((coinsSum / okEvents.length).toFixed(2)) : 0.0,
      span_sec: Math.floor(rawSpan),
      sample: this.events.length,
      window_requests: this.events.length,
      window_coins: coinsSum,
      window_ok: okEvents.length,
      lifetime_requests: this.totalRequests,
      lifetime_ok: this.totalOk,
      lifetime_coins: this.totalCoins,
      lifetime_avg: this.totalOk > 0 ? Number((this.totalCoins / this.totalOk).toFixed(2)) : 0.0,
      peak_req_per_min: Number(this.peakReqPerMin.toFixed(2)),
      peak_coins_per_min: Number(this.peakCoinsPerMin.toFixed(2)),
      peak_at: this.peakAt,
    };
  }
}
