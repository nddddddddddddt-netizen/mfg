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
  tokenExpiresInMinutes?: number;
}

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

export interface SystemStatus {
  online: boolean;
  migrationPing: boolean;
  accountsCount: number;
  activeFarmingCount: number;
  isFarming: boolean;
  totalScore: number;
  wsActiveCount: number;
  peakTotalReqPerMin: number;
  peakTotalCoinsPerMin: number;
  config: {
    bot_token: string;
    ws_enabled: boolean;
    workers_per_account: number;
    auto_refresh_tokens: boolean;
  };
}

export interface Campaign {
  id: number;
  type: string;
  target: string;
  total_amount: number;
  mode: string;
  status: string;
  distribution: Record<string, number>;
  results?: {
    total_launched: number;
    success: number;
    failed: number;
    details?: {
      accountId: number;
      username: string;
      ok: boolean;
      amount: number;
      orderId?: string;
      error?: string;
    }[];
  };
  created_at: number;
  finished_at?: number;
}

export interface WsEvent {
  id: number;
  account_id: number;
  username?: string;
  event_type: string;
  message: string;
  ts: number;
}

export interface TikSparkOrder {
  _id: string;
  type: string;
  videoLink?: string;
  tiktokerUsername?: string;
  avatar?: string;
  score: number;
  amount: number;
  initialCount: number;
  fulfilled: number;
  isPublished: boolean;
  status: string;
  createdAt?: string;
}

export interface DailyProjection {
  daily: number;
  hourly: number;
  last_24h_coins: number;
  last_24h_actions: number;
}
