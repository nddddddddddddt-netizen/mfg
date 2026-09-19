import { storage, Account } from './storage.ts';
import {
  opCreateOrder,
  opFetchScore,
  DEFAULT_COST_PER_UNIT,
  MIN_AMOUNT,
} from './tiksparkProtocol.ts';

export interface CampaignLaunchParams {
  type: string;
  target: string;
  total_amount?: number;
  mode?: 'auto' | 'fixed';
}

export class CampaignEngine {
  public static calculateCapacity(account: Account, costPerUnit = DEFAULT_COST_PER_UNIT): number {
    const score = Math.max(0, account.score || 0);
    if (costPerUnit <= 0) return 0;
    return Math.floor(score / costPerUnit);
  }

  public static distribute(
    accounts: Account[],
    totalAmount: number,
    mode: 'auto' | 'fixed' = 'auto',
    costPerUnit = DEFAULT_COST_PER_UNIT
  ): { distribution: Record<number, number>; capacities: Record<number, number> } {
    const caps: Record<number, number> = {};
    for (const a of accounts) {
      const c = this.calculateCapacity(a, costPerUnit);
      if (c >= MIN_AMOUNT) {
        caps[a.id] = c;
      }
    }

    const availableIds = Object.keys(caps).map(Number);
    if (availableIds.length === 0) {
      return { distribution: {}, capacities: caps };
    }

    if (mode === 'auto' || totalAmount <= 0) {
      return { distribution: { ...caps }, capacities: caps };
    }

    const totalCap = Object.values(caps).reduce((s, v) => s + v, 0);
    if (totalAmount >= totalCap) {
      return { distribution: { ...caps }, capacities: caps };
    }

    const dist: Record<number, number> = {};
    let remaining = totalAmount;

    // Sort descending by capacity
    const sortedIds = [...availableIds].sort((a, b) => caps[b] - caps[a]);

    for (const aid of sortedIds) {
      const cap = caps[aid];
      let share = Math.round((cap / totalCap) * totalAmount);
      share = Math.max(MIN_AMOUNT, Math.min(share, cap));

      if (share > remaining) {
        share = remaining;
      }

      if (share >= MIN_AMOUNT) {
        dist[aid] = share;
        remaining -= share;
      }

      if (remaining < MIN_AMOUNT) break;
    }

    return { distribution: dist, capacities: caps };
  }

  public static async launch(params: CampaignLaunchParams): Promise<{
    success: boolean;
    campaignId?: number;
    error?: string;
    totalLaunched?: number;
    distribution?: Record<number, number>;
  }> {
    const accounts = storage.listAccounts(true);
    if (accounts.length === 0) {
      return { success: false, error: 'لا توجد حسابات مفعّلة في النظام.' };
    }

    // Refresh scores first
    for (const a of accounts) {
      if (!a.usertoken) continue;
      try {
        const sc = await opFetchScore(a.usertoken, a.csrftoken);
        if (sc !== null) {
          storage.updateAccount(a.id, { score: sc });
          a.score = sc;
        }
      } catch {
        // Ignore
      }
    }

    const mode = params.mode || (params.total_amount && params.total_amount > 0 ? 'fixed' : 'auto');
    const totalAmount = params.total_amount || 0;

    const { distribution } = this.distribute(accounts, totalAmount, mode);

    if (Object.keys(distribution).length === 0) {
      return {
        success: false,
        error: `لا توجد نقاط كافية في الحسابات المفعّلة. الحد الأدنى لكل حساب هو ${MIN_AMOUNT} وحدة (${MIN_AMOUNT * DEFAULT_COST_PER_UNIT} نقطة).`,
      };
    }

    const stringDist: Record<string, number> = {};
    for (const [k, v] of Object.entries(distribution)) {
      stringDist[k] = v;
    }

    const campaign = storage.createCampaign({
      type: params.type,
      target: params.target,
      total_amount: totalAmount,
      mode,
      distribution: stringDist,
    });

    // Execute asynchronously
    (async () => {
      const accMap = new Map(accounts.map((a) => [a.id, a]));
      const resultsList: any[] = [];
      let totalLaunched = 0;

      const tasks = Object.entries(distribution).map(async ([aidStr, amount]) => {
        const aid = Number(aidStr);
        const acc = accMap.get(aid);
        if (!acc) return;

        try {
          const res = await opCreateOrder(
            acc.usertoken,
            acc.csrftoken,
            params.type,
            amount,
            params.target,
            acc.avatar || ''
          );

          if (res.success && res.order) {
            totalLaunched += amount;
            resultsList.push({
              accountId: aid,
              username: acc.username,
              ok: true,
              amount,
              orderId: res.order._id,
            });

            // Update score
            const sc = await opFetchScore(acc.usertoken, acc.csrftoken);
            if (sc !== null) {
              storage.updateAccount(aid, { score: sc });
            }
          } else {
            resultsList.push({
              accountId: aid,
              username: acc.username,
              ok: false,
              amount,
              error: res.error,
            });
          }
        } catch (err: any) {
          resultsList.push({
            accountId: aid,
            username: acc.username,
            ok: false,
            amount,
            error: err.message || String(err),
          });
        }
      });

      await Promise.all(tasks);

      const successCount = resultsList.filter((r) => r.ok).length;
      const failedCount = resultsList.filter((r) => !r.ok).length;

      storage.finishCampaign(campaign.id, {
        total_launched: totalLaunched,
        success: successCount,
        failed: failedCount,
        details: resultsList,
      });
    })();

    return {
      success: true,
      campaignId: campaign.id,
      distribution,
    };
  }
}
