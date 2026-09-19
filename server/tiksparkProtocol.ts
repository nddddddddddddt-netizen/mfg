import crypto from 'crypto';

export const DEV_INFO = '{"d":"33386266306135353961333434373533","n":"484f4e4f52204252502d4e5831","o":"16","t":"d","v":"2.3.0","s":"0,0"}';

// KEY_BYTES from the official TikSpark client
const KEY_BYTES = [0x35, 0x30, 0x1c, 0x2f, 0x2c, 0x2c, 0x28, 0x31, 0x35, 0x30, 0x1c, 0x2f, 0x2c, 0x2c, 0x28, 0x31];
export const SECRET_KEY = Buffer.from(KEY_BYTES.map(b => b ^ 0x43)); // 'vs_lookvs_look'

export const BASE_URL = 'https://api.tikspark.xyz';
export const GQL_URL = `${BASE_URL}/graphql`;
export const REFRESH_URL = `${BASE_URL}/api/refresh-token`;
export const WS_URL = 'wss://api.tikspark.xyz/graphql';

export const MIN_AMOUNT = 20;
export const MAX_AMOUNT = 1000000;
export const DEFAULT_COST_PER_UNIT = 3;

export const TYPE_NAMES: Record<string, string> = {
  followers: 'متابعين',
  likes: 'لايكات',
  views: 'مشاهدات',
  comments: 'تعليقات',
  shares: 'مشاركات',
  save: 'حفظ',
  pk: 'PK',
};

export const OP_IDS: Record<string, string> = {
  LoginAccount: '3522613813036d73817b2715e67743f8d23d7a85ad08b7e12aa3b29a24a17c43',
  AttestDevice: 'bfaf5a72aeb9a337811da6a6d13e0b73680a18ffde0c59a23701e55b98ac2515',
  UpdateFCMToken: '79f5eb3902cd5e4464bc337c7e0e1607469f73355a7bab3c55fddeae71348c6f',
  GetUsers: '41454e2194d7c30f1c6e11c2c246bcc0377da65a8bf06276ca5ea9ec9ff538b6',
  UpdateTiktok: '67824dfc27914d519dcf61a6a44e81fd6c8df9afbfca37ecf498784499a0b67f',
  AppSettings: '212260cb8c8d0b389b7c06cb2a6b83356af24640d067abe6ad6dde17416bd706',
  MyFollowerTrend: 'd3f9b942f222433629bca5dd98093b5707f5048d04f8ecba73502c491de4ea44',
  FetchTaskProgress: '29f4830d8ca20e996ef88ba73dac01a45e8246b23b788b2d1f37f9aad3e04440',
  MyOrders: '1165d6045763f5751960797194623d28a09ef7a7490c3637880f543cb7713d45',
  FetchOrders: 'c2ca4b87e63f30f2cca10e5867d17ea0f1712e96e716a60513f68758b2256185',
  RequestSignedBundles: '9116a7a43a24ca90428c4b8b15cf7ea7a93c3c4ec6b787dfd9dedce1a3053eb5',
  RequestVideoBundleByUrl: '6aec4c9cc8374a1ef1d41bb53ce13688e7c3d9505ba71cd471cd99e24cd551a7',
  RequestProfileBundleByUsername: '2b26eda88e17df7b268dbc1d5a7a0fbd79ff067dbb9df70308a74131d4d84a92',
  RecordSkippedOrders: '872e8ef26528c2ffcfde1cbcc58c9b4ed092999e7c209ce16dffdddd9ba6c1c5',
  UpdateCoverOrder: 'bd529c24d9755cea9b232759430387397206506292a6f22306c53cd14af0ecc2',
  MigrationPing: 'c448a360ef9c74700cc312f281827650bb07abec05a2b710ecf75f27a0a9b079',
  FetchScore: '88d30eeca55c0538539ad8217dfefd52b2f47015200cdbb7cb6ea5a765381d69',
  ActionOrder: 'ef5df012d9597742f90ecdc7eea6f3abd8219fadbecb64ad49b47760e5413c68',
  CreateOrder: 'ad7a6397c3970b1e7601f69d24989bff330e256ee5e39321a8d1ad3fe3879b48',
};

export function signMessage(ts: string, nonce: string, body: string): string {
  const msg = `${ts}-${nonce}-${body}`;
  return crypto.createHmac('sha256', SECRET_KEY).update(msg).digest('hex');
}

export function buildHeaders(opName: string, uToken = '', cToken = '', needsAuth = true) {
  const ts = Date.now().toString();
  const nonce = crypto.randomUUID().slice(0, 16);
  const headers: Record<string, string> = {
    'X-APOLLO-OPERATION-NAME': opName,
    'Accept': 'multipart/mixed; deferSpec=20220824, application/json',
    'x-language': 'ar',
    'x-app-name': 'com.dev.vidspark',
    'x-device-info': DEV_INFO,
    'x-app-ts': ts,
    'x-app-nonce': nonce,
    'Content-Type': 'application/json',
    'User-Agent': 'okhttp/4.12.0',
    'Accept-Encoding': 'gzip',
  };

  if (OP_IDS[opName]) {
    headers['X-APOLLO-OPERATION-ID'] = OP_IDS[opName];
  }
  if (needsAuth) {
    headers['token'] = uToken;
    headers['x-csrf-token'] = cToken;
  }
  return { headers, ts, nonce };
}

export async function gqlRequest<T = any>(
  payload: any,
  opName: string,
  uToken = '',
  cToken = '',
  needsAuth = true,
  maxAttempts = 3
): Promise<{ status: number; headers: Headers; data?: T; errors?: any[]; error?: string }> {
  const body = JSON.stringify(payload);
  const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

  let lastRes: { status: number; headers: Headers; data?: T; errors?: any[]; error?: string } = {
    status: 0,
    headers: new Headers(),
    error: 'Unattempted request',
  };

  for (let i = 0; i < maxAttempts; i++) {
    const { headers, ts, nonce } = buildHeaders(opName, uToken, cToken, needsAuth);
    headers['x-app-sig'] = signMessage(ts, nonce, body);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(GQL_URL, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      let parsed: any;
      try {
        parsed = await res.json();
      } catch (err) {
        parsed = null;
      }

      lastRes = {
        status: res.status,
        headers: res.headers,
        data: parsed?.data,
        errors: parsed?.errors,
        error: parsed?.errors?.[0]?.message || (!res.ok ? `HTTP ${res.status}` : undefined),
      };

      if (!RETRYABLE_STATUS.has(res.status)) {
        return lastRes;
      }
    } catch (err: any) {
      lastRes = {
        status: 0,
        headers: new Headers(),
        error: `Network error: ${err.message || err}`,
      };
    }

    if (i < maxAttempts - 1) {
      const delay = 1500 * Math.pow(2, i) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return lastRes;
}

export function parseJwt(token: string): { exp: number; iat: number; userId?: string } {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return { exp: 0, iat: 0 };
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const jsonStr = Buffer.from(b64, 'base64').toString('utf-8');
    const parsed = JSON.parse(jsonStr);
    return {
      exp: Number(parsed.exp) || 0,
      iat: Number(parsed.iat) || 0,
      userId: parsed.userId || parsed.id || parsed.sub,
    };
  } catch {
    return { exp: 0, iat: 0 };
  }
}

// Op: MigrationPing
export async function opMigrationPing(): Promise<boolean> {
  const payload = {
    operationName: 'MigrationPing',
    variables: {},
    query: 'query MigrationPing { __typename }',
  };
  const res = await gqlRequest(payload, 'MigrationPing', '', '', false, 1);
  return res.data?.__typename === 'Query';
}

// Op: AttestDevice
export async function opAttestDevice(uToken: string, cToken: string): Promise<boolean> {
  const payload = {
    operationName: 'AttestDevice',
    variables: {
      integrityToken:
        'CpsCARCnMGtvLkiuhYFGDW3rUoE73im9X9NmXA1cHOZZOzgRp5FtsmIrZBoNek0K7XIoZiR9XKg1bpApXNem9MbcR4UiIxz1n4Wgv_LA4hSSAbHzpaAfXcnLyKgwnOXGRUieQ4OOpMTMDRxD6O7kd3jjAfcbcHFt3bdgyw7CJYpxz4oq3lIti658lCdnt1NvJzUwfYSp6eWKcvKV5lScaq-nkplRn7hz38A8kLhYNx6w-7rne41hWCR6BQISVfBewaqeh7RL-9iEDrzK-ECbdEwBnpO_LfAqCJKn1bf5VkVxuPAz5qPvB8cNE7ZBMAyMnDHdjNDwpnZMA2EXsgRsyT6Fm_l3MNugWDdWbRgww6sAw6KrRzeBDETsXTh1ZBpqAWerZWp6AIjaDa-b0NFbOS69HsGnfpE7hljmu3OTsd4tM6nM50qiSc4QGuD4aM-joJFJYKIsWf_grquB66tYnYa2mCWcPl1hIEApHMXbCLiO7nwX-8LXEwCDvVNT4f8mjgtI1__D_C_f4g',
      requestHash: 'gPyB7FF-XeZc2kwi2L-KZXs21Z8oPErvHD9gn572PyR',
    },
    query: 'mutation AttestDevice($integrityToken: String!, $requestHash: String!) { attestDevice(integrityToken: $integrityToken, requestHash: $requestHash) { ok verified } }',
  };
  const res = await gqlRequest(payload, 'AttestDevice', uToken, cToken, true);
  return Boolean(res.data?.attestDevice?.ok || res.data?.attestDevice?.verified);
}

// Op: Login
export async function opLogin(username: string, password: string) {
  const payload = {
    operationName: 'LoginAccount',
    variables: {
      data: {
        id: '',
        uniqueId: username,
        nickname: '',
        avatarMedium: 'https://p16-common-sign.tiktokcdn.com/musically-maliva-obj/1594805258216454~tplv-tiktokx-cropcenter:720:720.webp',
        followerCount: 0,
        followingCount: 0,
        videoCount: 0,
        privateAccount: false,
        diggCount: 0,
        authMethod: 'local',
        password: password,
      },
    },
    query: 'mutation LoginAccount($data: TiktokInfo) { loginTiktok(data: $data) { accessToken refreshToken user { _id tiktokId nickname email score diggCount followerCount followingCount friendCount isMembershipExpired heartCount username avatar banned vip vipExpiresAt authMethod isSubscription allowd referralCode referralCount referredBy } } }',
  };

  const res = await gqlRequest(payload, 'LoginAccount', '', '', false);
  if (!res.data || res.errors?.length) {
    return {
      success: false,
      error: res.error || 'فشل تسجيل الدخول، تحقق من اسم المستخدم وكلمة المرور',
    };
  }

  const loginData = res.data?.loginTiktok;
  const uToken = loginData?.accessToken;
  const rToken = loginData?.refreshToken || '';
  const user = loginData?.user;
  const cToken = res.headers.get('x-csrf-token') || '';

  if (!uToken) {
    return { success: false, error: 'استجابة غير صالحة من السيرفر' };
  }

  // Execute AttestDevice
  await opAttestDevice(uToken, cToken);

  return {
    success: true,
    uToken,
    cToken,
    rToken,
    user,
  };
}

// Op: Refresh Token
export async function opRefreshToken(uToken: string): Promise<{ success: boolean; accessToken?: string; refreshToken?: string }> {
  try {
    const res = await fetch(REFRESH_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${uToken}`,
        token: uToken,
        'x-language': 'ar',
        'x-app-name': 'com.dev.vidspark',
        'Content-Type': 'application/json',
        'User-Agent': 'okhttp/4.12.0',
      },
    });
    if (!res.ok) return { success: false };
    const data = await res.json();
    return {
      success: true,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  } catch {
    return { success: false };
  }
}

// Op: GetUsers
export async function opGetUsers(uToken: string, cToken: string) {
  const payload = {
    operationName: 'GetUsers',
    variables: {},
    query: 'query GetUsers { me { _id tiktokId nickname email score diggCount followerCount followingCount friendCount isMembershipExpired heartCount username avatar banned vip vipExpiresAt authMethod isSubscription allowd referralCode referralCount referredBy } }',
  };
  const res = await gqlRequest(payload, 'GetUsers', uToken, cToken, true);
  return res.data?.me || null;
}

// Op: AppSettings
export async function opAppSettings(uToken: string, cToken: string) {
  const payload = {
    operationName: 'AppSettings',
    variables: {},
    query: 'query AppSettings { appSettings { prices { coins price } scoreActions { followers likes comments views shares save pk } quantitySettings { action min max } dailyReward taskCompletionBonus isEligibleForDailyReward offerExpiresAt announcement announcementId } }',
  };
  const res = await gqlRequest(payload, 'AppSettings', uToken, cToken, true);
  return res.data?.appSettings || null;
}

// Op: FetchScore
export async function opFetchScore(uToken: string, cToken: string): Promise<number | null> {
  const payload = {
    operationName: 'FetchScore',
    variables: {},
    query: 'query FetchScore { fetchScore }',
  };
  const res = await gqlRequest(payload, 'FetchScore', uToken, cToken, true);
  if (res.data?.fetchScore !== undefined) {
    return Number(res.data.fetchScore);
  }
  return null;
}

// Op: MyOrders
export async function opMyOrders(uToken: string, cToken: string) {
  const payload = {
    operationName: 'MyOrders',
    variables: {},
    query: 'query MyOrders { myOrders { _id type videoLink tiktokerUsername avatar score priority amount initialCount fulfilled isPublished status deletedReason createdAt } }',
  };
  const res = await gqlRequest(payload, 'MyOrders', uToken, cToken, true);
  return res.data?.myOrders || [];
}

// Op: FetchOrders
export async function opFetchOrders(uToken: string, cToken: string, page = 1) {
  const payload = {
    operationName: 'FetchOrders',
    variables: { page },
    query: 'query FetchOrders($page: Int!) { getOrders(page: $page) { _id type videoLink tiktokerUsername avatar score priority } }',
  };
  const res = await gqlRequest(payload, 'FetchOrders', uToken, cToken, true);
  return res.data?.getOrders || [];
}

// Op: ActionOrder
export async function opActionOrder(uToken: string, cToken: string, orderId: string) {
  const rn = Math.floor(Math.random() * (4500 - 3000 + 1)) + 3000;
  const payload = {
    operationName: 'ActionOrder',
    variables: {
      orderId,
      validationData: {
        attempts: 1,
        initialNumber: Number(rn),
        timeSpent: Number(Math.floor(Math.random() * 3000) + 4000),
        actualCount: rn + 1,
        source: 'CLIENT_CRONET',
      },
    },
    query: 'mutation ActionOrder($orderId: ID!, $validationData: ValidationDataInput!) { actionOrder(orderId: $orderId, validationData: $validationData) { score taskProgress { count startTime taskProgressLimit } } }',
  };
  const res = await gqlRequest(payload, 'ActionOrder', uToken, cToken, true, 2);
  if (res.data?.actionOrder) {
    return { success: true, result: res.data.actionOrder };
  }
  return { success: false, error: res.error || 'فشلت معالجة الطلب' };
}

// Op: CreateOrder
export async function opCreateOrder(
  uToken: string,
  cToken: string,
  orderType: string,
  amount: number,
  target: string,
  avatar = ''
) {
  const payload: any = {
    operationName: 'CreateOrder',
    variables: {
      type: orderType,
      amount: Math.floor(amount),
      avatar,
      initialCount: 0,
    },
    query: 'mutation CreateOrder($type: Action!, $amount: Int!, $tiktokerUsername: String, $videoLink: String, $avatar: String, $initialCount: Int) { createOrder(orderInput: { type: $type amount: $amount tiktokerUsername: $tiktokerUsername videoLink: $videoLink avatar: $avatar initialCount: $initialCount } ) { _id type videoLink tiktokerUsername avatar score amount initialCount fulfilled isPublished status createdAt } }',
  };

  if (orderType === 'followers') {
    payload.variables.tiktokerUsername = target;
  } else {
    payload.variables.videoLink = target;
  }

  const res = await gqlRequest(payload, 'CreateOrder', uToken, cToken, true);
  if (res.data?.createOrder) {
    return { success: true, order: res.data.createOrder };
  }
  return { success: false, error: res.error || 'فشل إنشاء الطلب' };
}

// Op: RecordSkippedOrders
export async function opRecordSkippedOrders(uToken: string, cToken: string, orderIds: string[]) {
  const payload = {
    operationName: 'RecordSkippedOrders',
    variables: { orderIds },
    query: 'mutation RecordSkippedOrders($orderIds: [ID!]!) { recordSkippedOrders(orderIds: $orderIds) }',
  };
  const res = await gqlRequest(payload, 'RecordSkippedOrders', uToken, cToken, true);
  return Boolean(res.data?.recordSkippedOrders);
}
