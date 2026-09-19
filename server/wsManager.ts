import WebSocket from 'ws';
import { storage, Account } from './storage.ts';
import { DEV_INFO, WS_URL, parseJwt } from './tiksparkProtocol.ts';
import { EventEmitter } from 'events';

export const wsEventEmitter = new EventEmitter();

class AccountWsClient {
  public accountId: number;
  public username: string;
  private token: string;
  private userId: string;
  private ws: WebSocket | null = null;
  private isStopped = false;
  private reconnectDelay = 1000;
  private lastNotify = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(account: Account) {
    this.accountId = account.id;
    this.username = account.username;
    this.token = account.usertoken;
    this.userId = account.user_id || parseJwt(account.usertoken).userId || '';
  }

  public start() {
    if (!this.userId) {
      console.warn(`[WS] No userId found for account #${this.accountId}`);
      return false;
    }
    this.isStopped = false;
    this.connect();
    return true;
  }

  public stop() {
    this.isStopped = true;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private connect() {
    if (this.isStopped) return;

    try {
      this.ws = new WebSocket(WS_URL, ['graphql-transport-ws'], {
        headers: {
          'User-Agent': 'okhttp/4.12.0',
        },
        handshakeTimeout: 15000,
      });

      this.ws.on('open', () => {
        this.reconnectDelay = 1000;
        // 1. Connection Init
        const init = {
          type: 'connection_init',
          payload: {
            token: this.token,
            'x-language': 'ar',
            'x-app-name': 'com.dev.vidspark',
            'x-device-info': DEV_INFO,
          },
        };
        this.ws?.send(JSON.stringify(init));

        // Start keepalive ping every 25s
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.send(JSON.stringify({ type: 'ping' }));
            } catch {
              // Ignore
            }
          }
        }, 25000);
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(msg);
        } catch {
          // Ignore parse errors
        }
      });

      this.ws.on('close', () => {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (!this.isStopped) {
          setTimeout(() => this.connect(), Math.min(this.reconnectDelay, 30000));
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        }
      });

      this.ws.on('error', (err) => {
        // Handled in close
      });
    } catch (e) {
      if (!this.isStopped) {
        setTimeout(() => this.connect(), 5000);
      }
    }
  }

  private handleMessage(msg: any) {
    if (msg.type === 'connection_ack') {
      // 2. Subscribe to UserActionSub
      const sub = {
        type: 'subscribe',
        id: crypto.randomUUID(),
        payload: {
          operationName: 'UserActionSub',
          variables: { userId: this.userId },
          query: 'subscription UserActionSub($userId: ID!) { userActionSub(userId: $userId) { type message } }',
        },
      };
      this.ws?.send(JSON.stringify(sub));
      return;
    }

    if (msg.type === 'ping') {
      this.ws?.send(JSON.stringify({ type: 'pong' }));
      return;
    }

    if (msg.type === 'next') {
      const payload = msg.payload?.data?.userActionSub;
      if (payload) {
        const evtType = String(payload.type || 'NOTIFICATION');
        const message = String(payload.message || '');

        storage.logWsEvent(this.accountId, evtType, message);

        wsEventEmitter.emit('event', {
          accountId: this.accountId,
          username: this.username,
          eventType: evtType,
          message,
          ts: Math.floor(Date.now() / 1000),
        });
      }
    }
  }
}

export class WebSocketSubscriptionManager {
  private clients = new Map<number, AccountWsClient>();

  public startForAccount(account: Account): boolean {
    if (!storage.getConfig().ws_enabled) return false;

    let existing = this.clients.get(account.id);
    if (existing) {
      existing.stop();
    }

    const client = new AccountWsClient(account);
    const started = client.start();
    if (started) {
      this.clients.set(account.id, client);
    }
    return started;
  }

  public stopAccount(accountId: number): boolean {
    const client = this.clients.get(accountId);
    if (client) {
      client.stop();
      this.clients.delete(accountId);
      return true;
    }
    return false;
  }

  public startAll(): number {
    if (!storage.getConfig().ws_enabled) return 0;
    const accounts = storage.listAccounts(true);
    let count = 0;
    for (const a of accounts) {
      if (this.startForAccount(a)) {
        count++;
      }
    }
    return count;
  }

  public stopAll(): void {
    for (const client of this.clients.values()) {
      client.stop();
    }
    this.clients.clear();
  }

  public activeCount(): number {
    let active = 0;
    for (const client of this.clients.values()) {
      if (client.isConnected()) active++;
    }
    return active;
  }
}

export const wsManager = new WebSocketSubscriptionManager();
