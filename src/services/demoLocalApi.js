/**
 * Pure Client-Side Browser Demo Store (localStorage)
 * Powers Login, Demo Session, Virtual Wallet, Transfers, Statements, and the Admin Dashboard
 * completely in-browser with zero backend server required.
 */

const STORE_KEY = 'sportzone_demo_platform_store_v1';
const SESSION_KEY = 'sportzone_demo_active_session_v1';

const DEFAULT_SETTINGS = {
  fundTransferGlobalEnabled: true,
  minTransferAmount: 50,
  maxTransferAmount: 100000,
  dailyTransferLimit: 250000,
  requireTransactionPassword: false,
  withdrawalGlobalEnabled: true,
  minWithdrawalAmount: 100,
  maxWithdrawalAmount: 50000,
  dailyWithdrawalLimit: 100000,
  buttonValues: [
    { label: '100', value: 100 },
    { label: '250', value: 250 },
    { label: '500', value: 500 },
    { label: '1K', value: 1000 },
    { label: '2.5K', value: 2500 },
    { label: '5K', value: 5000 },
  ],
  welcomeBonusCoins: 2500,
  announcementText: 'Newly Launched Matka Market In Our Exchange',
  allowSelfRegistration: true,
  platformName: 'SPORTZONE',
};

function daysAgoIso(days, hoursOffset = 0) {
  return new Date(Date.now() - days * 86_400_000 - hoursOffset * 3_600_000).toISOString();
}

function genId(prefix) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now().toString(36).slice(-4).toUpperCase()}${rand}`;
}

function cleanText(val, maxLen = 160) {
  return String(val ?? '').trim().slice(0, maxLen);
}

function parsePositiveAmount(val) {
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    mobile: u.mobile,
    role: u.role,
    status: u.status,
    blockReason: u.blockReason || null,
    virtualBalance: Number(Number(u.virtualBalance || 0).toFixed(2)),
    fundTransferEnabled: u.fundTransferEnabled !== false,
    withdrawalEnabled: u.withdrawalEnabled !== false,
    hasTransactionPassword: Boolean(u.transactionPassword),
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt || null,
  };
}

function buildInitialState() {
  const users = [
    {
      id: 'ADM-0001',
      username: 'admin',
      fullName: 'SportZone Administrator',
      email: 'admin@sportzone.demo',
      mobile: '+91 90000 00001',
      role: 'admin',
      status: 'active',
      blockReason: null,
      virtualBalance: 250000,
      fundTransferEnabled: true,
      withdrawalEnabled: true,
      password: 'admin123',
      transactionPassword: '',
      createdAt: daysAgoIso(6, 5),
      lastLoginAt: daysAgoIso(0, 1),
    },
    {
      id: 'USR-1001',
      username: 'rohan_k',
      fullName: 'Rohan Kulkarni',
      email: 'rohan.k@sportzone.demo',
      mobile: '+91 98201 44120',
      role: 'user',
      status: 'active',
      blockReason: null,
      virtualBalance: 14850,
      fundTransferEnabled: true,
      withdrawalEnabled: true,
      password: 'demo123',
      transactionPassword: '',
      createdAt: daysAgoIso(6, 2),
      lastLoginAt: daysAgoIso(0, 1),
    },
    {
      id: 'USR-1002',
      username: 'ananya_s',
      fullName: 'Ananya Sharma',
      email: 'ananya.s@sportzone.demo',
      mobile: '+91 98112 77834',
      role: 'user',
      status: 'active',
      blockReason: null,
      virtualBalance: 22400,
      fundTransferEnabled: true,
      withdrawalEnabled: true,
      password: 'demo123',
      transactionPassword: '',
      createdAt: daysAgoIso(5, 4),
      lastLoginAt: daysAgoIso(0, 3),
    },
    {
      id: 'USR-1003',
      username: 'vikram_m',
      fullName: 'Vikram Malhotra',
      email: 'vikram.m@sportzone.demo',
      mobile: '+91 97654 22190',
      role: 'user',
      status: 'blocked',
      blockReason: 'Account temporarily paused pending compliance review',
      virtualBalance: 3200,
      fundTransferEnabled: false,
      withdrawalEnabled: false,
      password: 'demo123',
      transactionPassword: '',
      createdAt: daysAgoIso(4, 1),
      lastLoginAt: daysAgoIso(2, 5),
    },
    {
      id: 'USR-1004',
      username: 'priya_d',
      fullName: 'Priya Deshmukh',
      email: 'priya.d@sportzone.demo',
      mobile: '+91 99004 51288',
      role: 'user',
      status: 'active',
      blockReason: null,
      virtualBalance: 9650,
      fundTransferEnabled: true,
      withdrawalEnabled: false,
      password: 'demo123',
      transactionPassword: '',
      createdAt: daysAgoIso(3, 6),
      lastLoginAt: daysAgoIso(1, 2),
    },
    {
      id: 'USR-1005',
      username: 'arjun_p',
      fullName: 'Arjun Patel',
      email: 'arjun.p@sportzone.demo',
      mobile: '+91 98450 33912',
      role: 'user',
      status: 'active',
      blockReason: null,
      virtualBalance: 18900,
      fundTransferEnabled: true,
      withdrawalEnabled: true,
      password: 'demo123',
      transactionPassword: '',
      createdAt: daysAgoIso(1, 3),
      lastLoginAt: daysAgoIso(0, 2),
    },
    {
      id: 'USR-1006',
      username: 'neha_r',
      fullName: 'Neha Rathore',
      email: 'neha.r@sportzone.demo',
      mobile: '+91 98711 60921',
      role: 'user',
      status: 'active',
      blockReason: null,
      virtualBalance: 6500,
      fundTransferEnabled: true,
      withdrawalEnabled: true,
      password: 'demo123',
      transactionPassword: '',
      createdAt: daysAgoIso(0, 4),
      lastLoginAt: daysAgoIso(0, 1),
    },
  ];

  const transactions = [
    {
      id: 'TXN-9001',
      userId: 'USR-1001',
      username: 'rohan_k',
      senderId: 'SYSTEM',
      senderUsername: 'SYSTEM',
      receiverId: 'USR-1001',
      receiverUsername: 'rohan_k',
      type: 'admin_credit',
      amount: 15000,
      credit: 15000,
      debit: 0,
      openingBalance: 2500,
      closingBalance: 17500,
      status: 'completed',
      remarks: 'Initial virtual credit allocation',
      actorId: 'SYSTEM',
      actorUsername: 'system',
      createdAt: daysAgoIso(5, 1),
    },
    {
      id: 'TXN-9002',
      userId: 'USR-1001',
      username: 'rohan_k',
      senderId: 'USR-1001',
      senderUsername: 'rohan_k',
      receiverId: 'USR-1002',
      receiverUsername: 'ananya_s',
      type: 'transfer_out',
      amount: 2650,
      credit: 0,
      debit: 2650,
      openingBalance: 17500,
      closingBalance: 14850,
      status: 'completed',
      remarks: 'League pool virtual transfer',
      actorId: 'USR-1001',
      actorUsername: 'rohan_k',
      createdAt: daysAgoIso(2, 3),
    },
    {
      id: 'TXN-9003',
      userId: 'USR-1002',
      username: 'ananya_s',
      senderId: 'USR-1001',
      senderUsername: 'rohan_k',
      receiverId: 'USR-1002',
      receiverUsername: 'ananya_s',
      type: 'transfer_in',
      amount: 2650,
      credit: 2650,
      debit: 0,
      openingBalance: 19750,
      closingBalance: 22400,
      status: 'completed',
      remarks: 'League pool virtual transfer',
      actorId: 'USR-1001',
      actorUsername: 'rohan_k',
      createdAt: daysAgoIso(2, 3),
    },
    {
      id: 'TXN-9004',
      userId: 'USR-1005',
      username: 'arjun_p',
      senderId: 'SYSTEM',
      senderUsername: 'SYSTEM',
      receiverId: 'USR-1005',
      receiverUsername: 'arjun_p',
      type: 'admin_credit',
      amount: 16400,
      credit: 16400,
      debit: 0,
      openingBalance: 2500,
      closingBalance: 18900,
      status: 'completed',
      remarks: 'Tournament virtual bankroll top-up',
      actorId: 'SYSTEM',
      actorUsername: 'system',
      createdAt: daysAgoIso(1, 2),
    },
    {
      id: 'TXN-9005',
      userId: 'USR-1004',
      username: 'priya_d',
      senderId: 'USR-1004',
      senderUsername: 'priya_d',
      receiverId: 'SYSTEM',
      receiverUsername: 'SYSTEM',
      type: 'admin_debit',
      amount: 1350,
      credit: 0,
      debit: 1350,
      openingBalance: 11000,
      closingBalance: 9650,
      status: 'completed',
      remarks: 'Virtual credit reconciliation adjustment',
      actorId: 'SYSTEM',
      actorUsername: 'system',
      createdAt: daysAgoIso(0, 6),
    },
  ];

  const transfers = [
    {
      id: 'TRF-5001',
      senderId: 'USR-1001',
      senderUsername: 'rohan_k',
      senderFullName: 'Rohan Kulkarni',
      receiverId: 'USR-1002',
      receiverUsername: 'ananya_s',
      receiverFullName: 'Ananya Sharma',
      initiatedBy: 'user',
      initiatedByUsername: 'rohan_k',
      amount: 2650,
      senderOpeningBalance: 17500,
      senderClosingBalance: 14850,
      receiverOpeningBalance: 19750,
      receiverClosingBalance: 22400,
      status: 'completed',
      remarks: 'League pool virtual transfer',
      createdAt: daysAgoIso(2, 3),
    },
  ];

  const withdrawals = [
    {
      id: 'WDR-3001',
      userId: 'USR-1002',
      username: 'ananya_s',
      fullName: 'Ananya Sharma',
      amount: 4500,
      status: 'pending',
      remarks: 'Simulated test withdrawal request',
      adminRemarks: '',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: daysAgoIso(0, 5),
    },
    {
      id: 'WDR-3002',
      userId: 'USR-1005',
      username: 'arjun_p',
      fullName: 'Arjun Patel',
      amount: 2000,
      status: 'approved',
      remarks: 'Simulated payout verification test',
      adminRemarks: 'Approved in simulated test ledger',
      reviewedBy: 'admin',
      reviewedAt: daysAgoIso(0, 9),
      createdAt: daysAgoIso(1, 1),
    },
    {
      id: 'WDR-3003',
      userId: 'USR-1001',
      username: 'rohan_k',
      fullName: 'Rohan Kulkarni',
      amount: 1500,
      status: 'rejected',
      remarks: 'Duplicate test withdrawal submission',
      adminRemarks: 'Rejected — duplicate test entry',
      reviewedBy: 'admin',
      reviewedAt: daysAgoIso(2, 1),
      createdAt: daysAgoIso(2, 4),
    },
  ];

  const bets = [
    {
      id: 'BET-7001',
      userId: 'USR-1001',
      username: 'rohan_k',
      fixtureId: 'sample-1',
      eventName: 'South Africa v Bangladesh',
      marketName: 'MATCH_ODDS',
      selection: 'South Africa',
      side: 'back',
      stake: 500,
      odds: 1.42,
      potentialProfit: 210,
      status: 'matched',
      placedAt: daysAgoIso(0, 3),
    },
    {
      id: 'BET-7002',
      userId: 'USR-1002',
      username: 'ananya_s',
      fixtureId: 'sample-2',
      eventName: 'Australia v England',
      marketName: 'Bookmaker',
      selection: 'Australia',
      side: 'lay',
      stake: 1000,
      odds: 1.85,
      potentialProfit: 1000,
      status: 'matched',
      placedAt: daysAgoIso(0, 2),
    },
    {
      id: 'BET-7003',
      userId: 'USR-1005',
      username: 'arjun_p',
      fixtureId: 'sample-3',
      eventName: 'India A v United Arab Emirates',
      marketName: 'Tied Match',
      selection: 'NO',
      side: 'back',
      stake: 250,
      odds: 1.75,
      potentialProfit: 187.5,
      status: 'won',
      placedAt: daysAgoIso(1, 5),
    },
  ];

  const casinoResults = [
    {
      id: 'CAS-8001',
      userId: 'USR-1001',
      username: 'rohan_k',
      gameName: 'DOLIDANA',
      roundId: 'RND-261124-01',
      recordedResult: 'Dice rolled 6-5-3 (Total 14 · BIG)',
      stake: 250,
      netCoins: 250,
      status: 'win',
      playedAt: daysAgoIso(0, 4),
    },
    {
      id: 'CAS-8002',
      userId: 'USR-1002',
      username: 'ananya_s',
      gameName: 'ROULETTE',
      roundId: 'RND-261124-02',
      recordedResult: 'Landed 17 Black · Even/Odd',
      stake: 500,
      netCoins: -500,
      status: 'loss',
      playedAt: daysAgoIso(0, 2),
    },
    {
      id: 'CAS-8003',
      userId: 'USR-1005',
      username: 'arjun_p',
      gameName: 'LUCKY 7',
      roundId: 'RND-261124-03',
      recordedResult: 'Card 8♠ · High',
      stake: 100,
      netCoins: 100,
      status: 'win',
      playedAt: daysAgoIso(1, 3),
    },
  ];

  const activityLogs = [
    {
      id: 'LOG-1001',
      actorId: 'SYSTEM',
      actorUsername: 'system',
      actorRole: 'admin',
      action: 'SYSTEM_INITIALIZED',
      targetType: 'settings',
      targetId: 'global',
      targetLabel: 'SportZone Demo Ledger',
      details: 'Client-side demo virtual wallet store initialized with default limits.',
      ip: 'local',
      createdAt: daysAgoIso(6, 5),
    },
    {
      id: 'LOG-1002',
      actorId: 'ADM-0001',
      actorUsername: 'admin',
      actorRole: 'admin',
      action: 'USER_BLOCKED',
      targetType: 'user',
      targetId: 'USR-1003',
      targetLabel: 'vikram_m',
      details: 'Account temporarily paused pending compliance review.',
      ip: 'local',
      createdAt: daysAgoIso(2, 4),
    },
  ];

  const notifications = [
    {
      id: 'NTF-1001',
      userId: 'ADM-0001',
      category: 'system',
      title: 'Demo Admin Console Ready',
      message: 'All Admin tools run locally in your browser for instant demo testing.',
      read: false,
      createdAt: daysAgoIso(0, 2),
    },
  ];

  return {
    adminClaimed: true,
    users,
    transactions,
    transfers,
    withdrawals,
    bets,
    casinoResults,
    notifications,
    activityLogs,
    settings: { ...DEFAULT_SETTINGS },
  };
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const base = buildInitialState();
      return {
        ...base,
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        users: Array.isArray(parsed.users) && parsed.users.length ? parsed.users : base.users,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : base.transactions,
        transfers: Array.isArray(parsed.transfers) ? parsed.transfers : base.transfers,
        withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : base.withdrawals,
        bets: Array.isArray(parsed.bets) ? parsed.bets : base.bets,
        casinoResults: Array.isArray(parsed.casinoResults) ? parsed.casinoResults : base.casinoResults,
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : base.notifications,
        activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : base.activityLogs,
      };
    }
  } catch {
    // ignore storage errors
  }
  const initial = buildInitialState();
  saveStore(initial);
  return initial;
}

function saveStore(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function readSessionUserId() {
  try {
    return localStorage.getItem(SESSION_KEY) || null;
  } catch {
    return null;
  }
}

function writeSessionUserId(userId) {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function pushActivity(state, entry) {
  state.activityLogs.unshift({
    id: genId('LOG'),
    ip: 'local',
    createdAt: new Date().toISOString(),
    ...entry,
  });
  state.activityLogs = state.activityLogs.slice(0, 200);
}

function pushNotif(state, entry) {
  state.notifications.unshift({
    id: genId('NTF'),
    read: false,
    createdAt: new Date().toISOString(),
    ...entry,
  });
  state.notifications = state.notifications.slice(0, 100);
}

function apiError(status, message) {
  const err = new Error(message);
  err.response = {
    status,
    data: { ok: false, error: message },
  };
  return err;
}

function paginate(items, params = {}, defaultLimit = 20) {
  const page = Math.max(1, parseInt(String(params.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(5, parseInt(String(params.limit || defaultLimit), 10) || defaultLimit));
  const total = items.length;
  return {
    items: items.slice((page - 1) * limit, page * limit),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function filterByDateRange(items, from, to, field = 'createdAt') {
  return items.filter((item) => {
    const val = String(item[field] || '');
    const day = val.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
}

function getCurrentUser(state) {
  const uid = readSessionUserId();
  if (!uid) return null;
  return state.users.find((u) => u.id === uid) || null;
}

function getAdminActor(state) {
  const curr = getCurrentUser(state);
  if (curr && curr.role === 'admin') return curr;
  return state.users.find((u) => u.role === 'admin') || state.users[0];
}

export async function dispatchLocalApi(methodRaw, urlRaw, body = {}, params = {}) {
  const method = String(methodRaw || 'GET').toUpperCase();
  const [rawPath, queryStr] = String(urlRaw || '').split('?');
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  const mergedParams = { ...(params || {}) };
  if (queryStr) {
    const sp = new URLSearchParams(queryStr);
    for (const [k, v] of sp.entries()) {
      if (mergedParams[k] === undefined) mergedParams[k] = v;
    }
  }

  const state = readStore();
  const now = new Date().toISOString();

  /* ==================== AUTH ==================== */
  if (method === 'GET' && path === '/auth/status') {
    return {
      ok: true,
      bootstrapRequired: false,
      envPasscodeActive: false,
      allowSelfRegistration: state.settings.allowSelfRegistration,
    };
  }

  if (method === 'GET' && path === '/auth/me') {
    const user = getCurrentUser(state);
    const notifs = user ? state.notifications.filter((n) => n.userId === user.id).slice(0, 20) : [];
    return {
      ok: true,
      authenticated: Boolean(user),
      user: sanitizeUser(user),
      bootstrapRequired: false,
      envPasscodeActive: false,
      settings: state.settings,
      notifications: notifs,
      unreadCount: notifs.filter((n) => !n.read).length,
    };
  }

  if (method === 'POST' && path === '/auth/demo-admin-session') {
    let admin = state.users.find((u) => u.role === 'admin');
    if (!admin) {
      admin = {
        id: 'ADM-0001',
        username: 'admin',
        fullName: 'SportZone Administrator',
        email: 'admin@sportzone.demo',
        mobile: '+91 90000 00001',
        role: 'admin',
        status: 'active',
        blockReason: null,
        virtualBalance: 250000,
        fundTransferEnabled: true,
        withdrawalEnabled: true,
        password: 'admin123',
        transactionPassword: '',
        createdAt: now,
        lastLoginAt: now,
      };
      state.users.unshift(admin);
    } else {
      admin.status = 'active';
      admin.lastLoginAt = now;
    }
    saveStore(state);
    writeSessionUserId(admin.id);
    return { ok: true, token: `demo-token-${admin.id}`, user: sanitizeUser(admin) };
  }

  if (method === 'POST' && path === '/auth/login') {
    const identifier = cleanText(body?.identifier, 80).toLowerCase();
    const password = String(body?.password || '');
    if (!identifier || !password) {
      throw apiError(400, 'Please enter both username and password.');
    }
    let found = state.users.find(
      (u) => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
    );
    // In demo mode, if an unregistered username is entered, create a quick demo user so testing is effortless
    if (!found) {
      found = {
        id: genId('USR'),
        username: identifier.replace(/[^a-z0-9_.-]/g, '').slice(0, 24) || 'demo_user',
        fullName: identifier,
        email: `${identifier.replace(/[^a-z0-9]/g, '') || 'demo'}@sportzone.demo`,
        mobile: '+91 90000 12345',
        role: identifier === 'admin' ? 'admin' : 'user',
        status: 'active',
        blockReason: null,
        virtualBalance: state.settings.welcomeBonusCoins || 2500,
        fundTransferEnabled: true,
        withdrawalEnabled: true,
        password,
        transactionPassword: '',
        createdAt: now,
        lastLoginAt: now,
      };
      state.users.unshift(found);
      state.transactions.unshift({
        id: genId('TXN'),
        userId: found.id,
        username: found.username,
        senderId: 'SYSTEM',
        senderUsername: 'SYSTEM',
        receiverId: found.id,
        receiverUsername: found.username,
        type: 'welcome_grant',
        amount: found.virtualBalance,
        credit: found.virtualBalance,
        debit: 0,
        openingBalance: 0,
        closingBalance: found.virtualBalance,
        status: 'completed',
        remarks: 'Demo account welcome virtual credits',
        actorId: 'SYSTEM',
        actorUsername: 'system',
        createdAt: now,
      });
    } else {
      if (found.status === 'blocked') {
        throw apiError(403, found.blockReason || 'This account is currently blocked.');
      }
      if (found.password && found.password !== password && password !== 'demo123') {
        throw apiError(401, 'Invalid password. (Demo hint: demo123 or admin123)');
      }
      found.lastLoginAt = now;
    }
    saveStore(state);
    writeSessionUserId(found.id);
    return { ok: true, token: `demo-token-${found.id}`, user: sanitizeUser(found) };
  }

  if (method === 'POST' && (path === '/auth/register' || path === '/auth/bootstrap-admin')) {
    const username = cleanText(body?.username, 32).toLowerCase();
    const fullName = cleanText(body?.fullName || username, 80);
    const email = cleanText(body?.email || `${username}@sportzone.demo`, 100).toLowerCase();
    const mobile = cleanText(body?.mobile || '+91 90000 00000', 24);
    const password = String(body?.password || 'demo123');
    if (!username || username.length < 3) throw apiError(400, 'Username must be at least 3 characters.');
    if (state.users.some((u) => u.username.toLowerCase() === username)) {
      throw apiError(409, 'Username is already taken.');
    }
    const isAdminReg = path === '/auth/bootstrap-admin';
    const welcome = isAdminReg ? 250000 : state.settings.welcomeBonusCoins || 2500;
    const newUser = {
      id: genId(isAdminReg ? 'ADM' : 'USR'),
      username,
      fullName,
      email,
      mobile,
      role: isAdminReg ? 'admin' : 'user',
      status: 'active',
      blockReason: null,
      virtualBalance: welcome,
      fundTransferEnabled: true,
      withdrawalEnabled: true,
      password,
      transactionPassword: String(body?.transactionPassword || ''),
      createdAt: now,
      lastLoginAt: now,
    };
    state.users.unshift(newUser);
    saveStore(state);
    writeSessionUserId(newUser.id);
    return { ok: true, token: `demo-token-${newUser.id}`, user: sanitizeUser(newUser) };
  }

  if (method === 'POST' && path === '/auth/logout') {
    writeSessionUserId(null);
    return { ok: true };
  }

  if (method === 'POST' && path === '/auth/change-password') {
    const curr = getCurrentUser(state) || getAdminActor(state);
    const targetType = body?.type === 'transaction' ? 'transaction' : 'login';
    const newPwd = String(body?.newPassword || '');
    if (newPwd.length < 4) throw apiError(400, 'New password must be at least 4 characters.');
    if (targetType === 'transaction') curr.transactionPassword = newPwd;
    else curr.password = newPwd;
    pushActivity(state, {
      actorId: curr.id,
      actorUsername: curr.username,
      actorRole: curr.role,
      action: targetType === 'transaction' ? 'TX_PASSWORD_UPDATED' : 'PASSWORD_CHANGED',
      targetType: 'security',
      targetId: curr.id,
      targetLabel: curr.username,
      details: `Updated ${targetType} password in demo account.`,
    });
    saveStore(state);
    return { ok: true, message: `${targetType === 'transaction' ? 'Transaction' : 'Login'} password updated.` };
  }

  /* ==================== PUBLIC SETTINGS & WALLET ==================== */
  if (method === 'GET' && path === '/settings/public') {
    return { ok: true, settings: state.settings };
  }

  if (method === 'GET' && path === '/wallet/summary') {
    const user = getCurrentUser(state) || state.users.find((u) => u.role === 'user') || state.users[0];
    const today = getTodayUtcDate();
    const dailyTransferred = state.transfers
      .filter((t) => t.senderId === user.id && t.status === 'completed' && t.createdAt.startsWith(today))
      .reduce((s, t) => s + t.amount, 0);
    const dailyWithdrawn = state.withdrawals
      .filter((w) => w.userId === user.id && ['pending', 'approved'].includes(w.status) && w.createdAt.startsWith(today))
      .reduce((s, w) => s + w.amount, 0);
    const notifs = state.notifications.filter((n) => n.userId === user.id).slice(0, 30);
    return {
      ok: true,
      user: sanitizeUser(user),
      dailyTransferred: Number(dailyTransferred.toFixed(2)),
      dailyWithdrawn: Number(dailyWithdrawn.toFixed(2)),
      limits: state.settings,
      notifications: notifs,
      unreadCount: notifs.filter((n) => !n.read).length,
    };
  }

  if (method === 'POST' && path === '/wallet/verify-receiver') {
    const q = cleanText(body?.receiver, 80).toLowerCase();
    const curr = getCurrentUser(state);
    if (!q) throw apiError(400, 'Enter a receiver username or User ID.');
    const target = state.users.find((u) => u.username.toLowerCase() === q || u.id.toLowerCase() === q);
    if (!target) throw apiError(404, 'No user found with that Username or User ID.');
    if (curr && target.id === curr.id) throw apiError(400, 'Self-transfers are not allowed.');
    if (target.status === 'blocked') throw apiError(400, 'Receiver account is blocked.');
    return {
      ok: true,
      receiver: { id: target.id, username: target.username, fullName: target.fullName, status: target.status },
    };
  }

  if (method === 'POST' && path === '/wallet/transfer') {
    const sender = getCurrentUser(state) || getAdminActor(state);
    const q = cleanText(body?.receiver, 80).toLowerCase();
    const amount = parsePositiveAmount(body?.amount);
    const remarks = cleanText(body?.remarks || 'Virtual credit transfer', 180);
    if (!amount) throw apiError(400, 'Enter a valid positive amount.');
    const receiver = state.users.find((u) => u.username.toLowerCase() === q || u.id.toLowerCase() === q);
    if (!receiver) throw apiError(404, 'Receiver account not found.');
    if (receiver.id === sender.id) throw apiError(400, 'Cannot transfer to your own account.');
    if (receiver.status === 'blocked') throw apiError(400, 'Receiver account is blocked.');
    if (sender.virtualBalance < amount) throw apiError(400, 'Insufficient virtual balance.');

    const sOpen = sender.virtualBalance;
    const sClose = Number((sOpen - amount).toFixed(2));
    const rOpen = receiver.virtualBalance;
    const rClose = Number((rOpen + amount).toFixed(2));
    sender.virtualBalance = sClose;
    receiver.virtualBalance = rClose;

    const transfer = {
      id: genId('TRF'),
      senderId: sender.id,
      senderUsername: sender.username,
      senderFullName: sender.fullName,
      receiverId: receiver.id,
      receiverUsername: receiver.username,
      receiverFullName: receiver.fullName,
      initiatedBy: sender.role === 'admin' ? 'admin' : 'user',
      initiatedByUsername: sender.username,
      amount,
      senderOpeningBalance: sOpen,
      senderClosingBalance: sClose,
      receiverOpeningBalance: rOpen,
      receiverClosingBalance: rClose,
      status: 'completed',
      remarks,
      createdAt: now,
    };
    state.transfers.unshift(transfer);
    state.transactions.unshift(
      {
        id: genId('TXN'),
        userId: receiver.id,
        username: receiver.username,
        senderId: sender.id,
        senderUsername: sender.username,
        receiverId: receiver.id,
        receiverUsername: receiver.username,
        type: 'transfer_in',
        amount,
        credit: amount,
        debit: 0,
        openingBalance: rOpen,
        closingBalance: rClose,
        status: 'completed',
        remarks: `Received from ${sender.username}: ${remarks}`,
        actorId: sender.id,
        actorUsername: sender.username,
        createdAt: now,
      },
      {
        id: genId('TXN'),
        userId: sender.id,
        username: sender.username,
        senderId: sender.id,
        senderUsername: sender.username,
        receiverId: receiver.id,
        receiverUsername: receiver.username,
        type: 'transfer_out',
        amount,
        credit: 0,
        debit: amount,
        openingBalance: sOpen,
        closingBalance: sClose,
        status: 'completed',
        remarks: `Sent to ${receiver.username}: ${remarks}`,
        actorId: sender.id,
        actorUsername: sender.username,
        createdAt: now,
      }
    );
    saveStore(state);
    return { ok: true, transfer, user: sanitizeUser(sender) };
  }

  if (method === 'GET' && path === '/wallet/transfers') {
    const user = getCurrentUser(state);
    let list = user
      ? state.transfers.filter((t) => t.senderId === user.id || t.receiverId === user.id)
      : state.transfers;
    if (mergedParams.direction === 'sent' && user) list = list.filter((t) => t.senderId === user.id);
    if (mergedParams.direction === 'received' && user) list = list.filter((t) => t.receiverId === user.id);
    if (mergedParams.search) {
      const q = String(mergedParams.search).toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.senderUsername.toLowerCase().includes(q) ||
          t.receiverUsername.toLowerCase().includes(q) ||
          String(t.remarks || '').toLowerCase().includes(q)
      );
    }
    list = filterByDateRange(list, mergedParams.from, mergedParams.to);
    return { ok: true, ...paginate(list, mergedParams, 20) };
  }

  if (method === 'GET' && path === '/wallet/statement') {
    const user = getCurrentUser(state);
    let list = user ? state.transactions.filter((t) => t.userId === user.id) : state.transactions;
    if (mergedParams.type && mergedParams.type !== 'all') {
      list = list.filter((t) => t.type === mergedParams.type);
    }
    list = filterByDateRange(list, mergedParams.from, mergedParams.to);
    return { ok: true, ...paginate(list, mergedParams, 25) };
  }

  if (method === 'POST' && path === '/wallet/notifications/read') {
    const user = getCurrentUser(state);
    state.notifications.forEach((n) => {
      if ((!user || n.userId === user.id) && (!body?.id || n.id === body.id)) {
        n.read = true;
      }
    });
    saveStore(state);
    return { ok: true };
  }

  if (method === 'POST' && path === '/wallet/sync-bet') {
    const user = getCurrentUser(state);
    if (!user) return { ok: true };
    const stake = Number(body?.stake || 0);
    const liability = Number(body?.liability || stake);
    const open = user.virtualBalance;
    const close = Math.max(0, Number((open - liability).toFixed(2)));
    user.virtualBalance = close;
    state.bets.unshift({
      id: genId('BET'),
      userId: user.id,
      username: user.username,
      fixtureId: String(body?.fixtureId || ''),
      eventName: cleanText(body?.eventName || 'Match', 120),
      marketName: cleanText(body?.marketName || 'MATCH_ODDS', 60),
      selection: cleanText(body?.selection || 'Selection', 80),
      side: body?.side || 'back',
      stake,
      odds: Number(body?.odds || 1),
      potentialProfit: Number(body?.potentialProfit || 0),
      status: 'matched',
      placedAt: now,
    });
    state.transactions.unshift({
      id: genId('TXN'),
      userId: user.id,
      username: user.username,
      senderId: user.id,
      senderUsername: user.username,
      receiverId: 'EXCHANGE',
      receiverUsername: 'EXCHANGE',
      type: 'bet_stake',
      amount: liability,
      credit: 0,
      debit: liability,
      openingBalance: open,
      closingBalance: close,
      status: 'completed',
      remarks: `${body?.marketName || 'MATCH_ODDS'}: ${body?.selection || ''}`,
      actorId: user.id,
      actorUsername: user.username,
      createdAt: now,
    });
    saveStore(state);
    return { ok: true, user: sanitizeUser(user) };
  }

  if (method === 'POST' && path === '/wallet/sync-casino') {
    const user = getCurrentUser(state);
    if (!user) return { ok: true };
    const stake = Number(body?.stake || 0);
    const payout = Number(body?.payout || 0);
    const net = Number((payout - stake).toFixed(2));
    const open = user.virtualBalance;
    const close = Math.max(0, Number((open + net).toFixed(2)));
    user.virtualBalance = close;
    state.casinoResults.unshift({
      id: genId('CAS'),
      userId: user.id,
      username: user.username,
      gameName: cleanText(body?.gameName || 'Casino', 60),
      roundId: genId('RND'),
      recordedResult: cleanText(body?.summary || '', 180),
      stake,
      netCoins: net,
      status: body?.won ? 'win' : net === 0 ? 'push' : 'loss',
      playedAt: now,
    });
    saveStore(state);
    return { ok: true, user: sanitizeUser(user) };
  }

  /* ==================== ADMIN ROUTES ==================== */
  if (method === 'GET' && path === '/admin/dashboard') {
    const today = getTodayUtcDate();
    const memberUsers = state.users;
    const totalUsers = memberUsers.length;
    const activeUsers = memberUsers.filter((u) => u.status === 'active').length;
    const blockedUsers = memberUsers.filter((u) => u.status === 'blocked').length;
    const todaysRegistrations = memberUsers.filter((u) => u.createdAt.startsWith(today)).length;
    const totalVirtualWalletBalance = Number(
      memberUsers.reduce((sum, u) => sum + (Number(u.virtualBalance) || 0), 0).toFixed(2)
    );
    const totalVirtualCreditsIssued = Number(
      state.transactions
        .filter((tx) => tx.type === 'admin_credit' || tx.type === 'welcome_grant')
        .reduce((sum, tx) => sum + tx.credit, 0)
        .toFixed(2)
    );
    const totalVirtualCreditsDeducted = Number(
      state.transactions
        .filter((tx) => tx.type === 'admin_debit')
        .reduce((sum, tx) => sum + tx.debit, 0)
        .toFixed(2)
    );
    const totalVirtualTransfers = state.transfers.length;
    const totalVirtualTransferVolume = Number(
      state.transfers.reduce((sum, t) => sum + t.amount, 0).toFixed(2)
    );
    const pendingSimulatedWithdrawals = state.withdrawals.filter((w) => w.status === 'pending').length;
    const completedSimulatedWithdrawals = state.withdrawals.filter((w) => w.status === 'approved').length;

    const chartSeries = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const registrations = memberUsers.filter((u) => u.createdAt.startsWith(key)).length;
      const creditsIssued = state.transactions
        .filter((tx) => (tx.type === 'admin_credit' || tx.type === 'welcome_grant') && tx.createdAt.startsWith(key))
        .reduce((s, tx) => s + tx.credit, 0);
      const transfersVolume = state.transfers
        .filter((t) => t.createdAt.startsWith(key))
        .reduce((s, t) => s + t.amount, 0);
      chartSeries.push({
        date: key,
        label,
        registrations,
        creditsIssued: Number(creditsIssued.toFixed(2)),
        transfersVolume: Number(transfersVolume.toFixed(2)),
      });
    }

    return {
      ok: true,
      metrics: {
        totalUsers,
        activeUsers,
        blockedUsers,
        todaysRegistrations,
        totalVirtualWalletBalance,
        totalVirtualCreditsIssued,
        totalVirtualCreditsDeducted,
        totalVirtualTransfers,
        totalVirtualTransferVolume,
        pendingSimulatedWithdrawals,
        completedSimulatedWithdrawals,
      },
      chartSeries,
      recentUsers: [...memberUsers]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6)
        .map(sanitizeUser),
      recentTransactions: state.transactions.slice(0, 8),
      recentActivity: state.activityLogs.slice(0, 8),
    };
  }

  if (method === 'GET' && path === '/admin/users') {
    const search = cleanText(mergedParams.search, 80).toLowerCase();
    const status = cleanText(mergedParams.status, 20).toLowerCase();
    const transferFilter = cleanText(mergedParams.transfer, 20).toLowerCase();
    const withdrawalFilter = cleanText(mergedParams.withdrawal, 20).toLowerCase();
    const sortBy = cleanText(mergedParams.sortBy, 32) || 'createdAt';
    const sortDir = mergedParams.sortDir === 'asc' ? 1 : -1;

    let rows = state.users.map(sanitizeUser);
    if (status === 'active' || status === 'blocked') rows = rows.filter((u) => u.status === status);
    if (transferFilter === 'enabled') rows = rows.filter((u) => u.fundTransferEnabled);
    else if (transferFilter === 'disabled') rows = rows.filter((u) => !u.fundTransferEnabled);
    if (withdrawalFilter === 'enabled') rows = rows.filter((u) => u.withdrawalEnabled);
    else if (withdrawalFilter === 'disabled') rows = rows.filter((u) => !u.withdrawalEnabled);
    if (search) {
      rows = rows.filter(
        (u) =>
          u.id.toLowerCase().includes(search) ||
          u.username.toLowerCase().includes(search) ||
          u.fullName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.mobile.toLowerCase().includes(search)
      );
    }
    rows.sort((a, b) => {
      if (sortBy === 'virtualBalance') return (a.virtualBalance - b.virtualBalance) * sortDir;
      if (sortBy === 'username') return a.username.localeCompare(b.username) * sortDir;
      if (sortBy === 'fullName') return a.fullName.localeCompare(b.fullName) * sortDir;
      return a.createdAt.localeCompare(b.createdAt) * sortDir;
    });
    return { ok: true, ...paginate(rows, mergedParams, 12) };
  }

  if (method === 'POST' && path === '/admin/users') {
    const actor = getAdminActor(state);
    const fullName = cleanText(body?.fullName, 80);
    const username = cleanText(body?.username, 32).toLowerCase();
    const email = cleanText(body?.email, 100).toLowerCase();
    const mobile = cleanText(body?.mobile, 24);
    const password = String(body?.password || '');
    const initialBalance = Math.max(0, Number(body?.initialBalance || 0));
    if (!fullName || fullName.length < 2) throw apiError(400, 'Full name is required.');
    if (!username || username.length < 3) throw apiError(400, 'Username must be at least 3 characters.');
    if (!password || password.length < 6) throw apiError(400, 'Password must be at least 6 characters.');
    if (state.users.some((u) => u.username.toLowerCase() === username)) throw apiError(409, 'Username already exists.');

    const newUser = {
      id: genId('USR'),
      username,
      fullName,
      email: email || `${username}@sportzone.demo`,
      mobile: mobile || '+91 90000 00000',
      role: 'user',
      status: body?.status === 'blocked' ? 'blocked' : 'active',
      blockReason: body?.status === 'blocked' ? 'Created in blocked state by admin' : null,
      virtualBalance: initialBalance,
      fundTransferEnabled: body?.fundTransferEnabled !== false,
      withdrawalEnabled: body?.withdrawalEnabled !== false,
      password,
      transactionPassword: String(body?.transactionPassword || ''),
      createdAt: now,
      lastLoginAt: null,
    };
    state.users.unshift(newUser);
    if (initialBalance > 0) {
      state.transactions.unshift({
        id: genId('TXN'),
        userId: newUser.id,
        username: newUser.username,
        senderId: actor.id,
        senderUsername: actor.username,
        receiverId: newUser.id,
        receiverUsername: newUser.username,
        type: 'admin_credit',
        amount: initialBalance,
        credit: initialBalance,
        debit: 0,
        openingBalance: 0,
        closingBalance: initialBalance,
        status: 'completed',
        remarks: `Initial virtual balance issued by ${actor.username}`,
        actorId: actor.id,
        actorUsername: actor.username,
        createdAt: now,
      });
    }
    pushActivity(state, {
      actorId: actor.id,
      actorUsername: actor.username,
      actorRole: 'admin',
      action: 'USER_CREATED',
      targetType: 'user',
      targetId: newUser.id,
      targetLabel: newUser.username,
      details: `Created user ${newUser.username} with initial balance ${initialBalance}.`,
    });
    saveStore(state);
    return { ok: true, user: sanitizeUser(newUser) };
  }

  // Dynamic /admin/users/:id/* routes
  const userMatch = path.match(/^\/admin\/users\/([^/]+)(?:\/([^/]+))?$/);
  if (userMatch) {
    const [, userId, subAction] = userMatch;
    const actor = getAdminActor(state);
    const target = state.users.find((u) => u.id === userId);
    if (!target) throw apiError(404, 'User not found.');

    if (method === 'GET' && !subAction) {
      const userTx = state.transactions.filter((t) => t.userId === target.id);
      const userTransfers = state.transfers.filter((t) => t.senderId === target.id || t.receiverId === target.id);
      const userBets = state.bets.filter((b) => b.userId === target.id);
      return {
        ok: true,
        user: sanitizeUser(target),
        stats: {
          totalCredits: Number(userTx.reduce((s, t) => s + t.credit, 0).toFixed(2)),
          totalDebits: Number(userTx.reduce((s, t) => s + t.debit, 0).toFixed(2)),
          transferCount: userTransfers.length,
          betCount: userBets.length,
        },
        recentTransactions: userTx.slice(0, 10),
      };
    }

    if (method === 'PATCH' && !subAction) {
      if (body?.fullName) target.fullName = cleanText(body.fullName, 80);
      if (body?.email) target.email = cleanText(body.email, 100);
      if (body?.mobile) target.mobile = cleanText(body.mobile, 24);
      if (body?.status === 'active' || body?.status === 'blocked') target.status = body.status;
      if (typeof body?.fundTransferEnabled === 'boolean') target.fundTransferEnabled = body.fundTransferEnabled;
      if (typeof body?.withdrawalEnabled === 'boolean') target.withdrawalEnabled = body.withdrawalEnabled;
      pushActivity(state, {
        actorId: actor.id,
        actorUsername: actor.username,
        actorRole: 'admin',
        action: 'USER_UPDATED',
        targetType: 'user',
        targetId: target.id,
        targetLabel: target.username,
        details: `Updated profile details for ${target.username}.`,
      });
      saveStore(state);
      return { ok: true, user: sanitizeUser(target) };
    }

    if (method === 'POST' && subAction === 'block') {
      target.status = 'blocked';
      target.blockReason = cleanText(body?.reason || 'Blocked by administrator', 180);
      pushActivity(state, {
        actorId: actor.id,
        actorUsername: actor.username,
        actorRole: 'admin',
        action: 'USER_BLOCKED',
        targetType: 'user',
        targetId: target.id,
        targetLabel: target.username,
        details: target.blockReason,
      });
      saveStore(state);
      return { ok: true, user: sanitizeUser(target) };
    }

    if (method === 'POST' && subAction === 'unblock') {
      target.status = 'active';
      target.blockReason = null;
      pushActivity(state, {
        actorId: actor.id,
        actorUsername: actor.username,
        actorRole: 'admin',
        action: 'USER_UNBLOCKED',
        targetType: 'user',
        targetId: target.id,
        targetLabel: target.username,
        details: `Unblocked user ${target.username}.`,
      });
      saveStore(state);
      return { ok: true, user: sanitizeUser(target) };
    }

    if (method === 'POST' && subAction === 'permissions') {
      if (typeof body?.fundTransferEnabled === 'boolean') target.fundTransferEnabled = body.fundTransferEnabled;
      if (typeof body?.withdrawalEnabled === 'boolean') target.withdrawalEnabled = body.withdrawalEnabled;
      pushActivity(state, {
        actorId: actor.id,
        actorUsername: actor.username,
        actorRole: 'admin',
        action: 'PERMISSIONS_UPDATED',
        targetType: 'user',
        targetId: target.id,
        targetLabel: target.username,
        details: `Updated transfer/withdrawal permissions for ${target.username}.`,
      });
      saveStore(state);
      return { ok: true, user: sanitizeUser(target) };
    }

    if (method === 'POST' && subAction === 'reset-password') {
      const newPwd = String(body?.newPassword || '');
      if (newPwd.length < 4) throw apiError(400, 'Password must be at least 4 characters.');
      target.password = newPwd;
      pushActivity(state, {
        actorId: actor.id,
        actorUsername: actor.username,
        actorRole: 'admin',
        action: 'PASSWORD_RESET',
        targetType: 'security',
        targetId: target.id,
        targetLabel: target.username,
        details: `Password reset for ${target.username}.`,
      });
      saveStore(state);
      return { ok: true, message: `Password reset for ${target.username}.` };
    }
  }

  if (method === 'POST' && path === '/admin/funds/adjust') {
    const actor = getAdminActor(state);
    const target = state.users.find((u) => u.id === body?.userId);
    const action = body?.action === 'debit' ? 'debit' : 'credit';
    const amount = parsePositiveAmount(body?.amount);
    const remarks = cleanText(body?.remarks || `Admin ${action}`, 180);
    if (!target) throw apiError(404, 'User not found.');
    if (!amount) throw apiError(400, 'Please enter a valid positive amount.');
    if (action === 'debit' && target.virtualBalance < amount) {
      throw apiError(400, 'Insufficient user balance to deduct that amount.');
    }

    const open = target.virtualBalance;
    const close = action === 'credit' ? Number((open + amount).toFixed(2)) : Number((open - amount).toFixed(2));
    target.virtualBalance = close;

    const tx = {
      id: genId('TXN'),
      userId: target.id,
      username: target.username,
      senderId: action === 'credit' ? actor.id : target.id,
      senderUsername: action === 'credit' ? actor.username : target.username,
      receiverId: action === 'credit' ? target.id : actor.id,
      receiverUsername: action === 'credit' ? target.username : actor.username,
      type: action === 'credit' ? 'admin_credit' : 'admin_debit',
      amount,
      credit: action === 'credit' ? amount : 0,
      debit: action === 'debit' ? amount : 0,
      openingBalance: open,
      closingBalance: close,
      status: 'completed',
      remarks,
      actorId: actor.id,
      actorUsername: actor.username,
      createdAt: now,
    };
    state.transactions.unshift(tx);
    pushActivity(state, {
      actorId: actor.id,
      actorUsername: actor.username,
      actorRole: 'admin',
      action: action === 'credit' ? 'CREDITS_ISSUED' : 'CREDITS_DEDUCTED',
      targetType: 'wallet',
      targetId: target.id,
      targetLabel: target.username,
      details: `${action === 'credit' ? 'Added' : 'Deducted'} ${amount} virtual credits (${remarks}).`,
    });
    saveStore(state);
    return { ok: true, user: sanitizeUser(target), transaction: tx };
  }

  if (method === 'POST' && path === '/admin/funds/transfer') {
    const actor = getAdminActor(state);
    const sender = state.users.find((u) => u.id === body?.senderId);
    const receiver = state.users.find((u) => u.id === body?.receiverId);
    const amount = parsePositiveAmount(body?.amount);
    const remarks = cleanText(body?.remarks || 'Admin-initiated virtual transfer', 180);
    if (!sender || !receiver) throw apiError(404, 'Sender or receiver not found.');
    if (sender.id === receiver.id) throw apiError(400, 'Sender and receiver must be different accounts.');
    if (!amount) throw apiError(400, 'Enter a valid positive amount.');
    if (sender.virtualBalance < amount) throw apiError(400, 'Sender has insufficient virtual balance.');

    const sOpen = sender.virtualBalance;
    const sClose = Number((sOpen - amount).toFixed(2));
    const rOpen = receiver.virtualBalance;
    const rClose = Number((rOpen + amount).toFixed(2));
    sender.virtualBalance = sClose;
    receiver.virtualBalance = rClose;

    const transfer = {
      id: genId('TRF'),
      senderId: sender.id,
      senderUsername: sender.username,
      senderFullName: sender.fullName,
      receiverId: receiver.id,
      receiverUsername: receiver.username,
      receiverFullName: receiver.fullName,
      initiatedBy: 'admin',
      initiatedByUsername: actor.username,
      amount,
      senderOpeningBalance: sOpen,
      senderClosingBalance: sClose,
      receiverOpeningBalance: rOpen,
      receiverClosingBalance: rClose,
      status: 'completed',
      remarks,
      createdAt: now,
    };
    state.transfers.unshift(transfer);
    state.transactions.unshift(
      {
        id: genId('TXN'),
        userId: receiver.id,
        username: receiver.username,
        senderId: sender.id,
        senderUsername: sender.username,
        receiverId: receiver.id,
        receiverUsername: receiver.username,
        type: 'transfer_in',
        amount,
        credit: amount,
        debit: 0,
        openingBalance: rOpen,
        closingBalance: rClose,
        status: 'completed',
        remarks,
        actorId: actor.id,
        actorUsername: actor.username,
        createdAt: now,
      },
      {
        id: genId('TXN'),
        userId: sender.id,
        username: sender.username,
        senderId: sender.id,
        senderUsername: sender.username,
        receiverId: receiver.id,
        receiverUsername: receiver.username,
        type: 'transfer_out',
        amount,
        credit: 0,
        debit: amount,
        openingBalance: sOpen,
        closingBalance: sClose,
        status: 'completed',
        remarks,
        actorId: actor.id,
        actorUsername: actor.username,
        createdAt: now,
      }
    );
    pushActivity(state, {
      actorId: actor.id,
      actorUsername: actor.username,
      actorRole: 'admin',
      action: 'ADMIN_TRANSFER',
      targetType: 'transfer',
      targetId: transfer.id,
      targetLabel: `${sender.username} -> ${receiver.username}`,
      details: `Transferred ${amount} virtual credits from ${sender.username} to ${receiver.username}.`,
    });
    saveStore(state);
    return { ok: true, transfer };
  }

  if (method === 'GET' && path === '/admin/transfers') {
    let list = [...state.transfers];
    if (mergedParams.search) {
      const q = String(mergedParams.search).toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.senderUsername.toLowerCase().includes(q) ||
          t.receiverUsername.toLowerCase().includes(q)
      );
    }
    list = filterByDateRange(list, mergedParams.from, mergedParams.to);
    return { ok: true, ...paginate(list, mergedParams, 20) };
  }

  if (method === 'GET' && (path === '/admin/transactions' || path === '/admin/account-statement')) {
    let list = [...state.transactions];
    if (mergedParams.userId) list = list.filter((t) => t.userId === mergedParams.userId);
    if (mergedParams.type && mergedParams.type !== 'all') list = list.filter((t) => t.type === mergedParams.type);
    if (mergedParams.search) {
      const q = String(mergedParams.search).toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.username.toLowerCase().includes(q) ||
          String(t.remarks || '').toLowerCase().includes(q)
      );
    }
    list = filterByDateRange(list, mergedParams.from, mergedParams.to);
    const totalCredit = Number(list.reduce((s, t) => s + (t.credit || 0), 0).toFixed(2));
    const totalDebit = Number(list.reduce((s, t) => s + (t.debit || 0), 0).toFixed(2));
    return {
      ok: true,
      summary: { totalCredit, totalDebit, net: Number((totalCredit - totalDebit).toFixed(2)) },
      ...paginate(list, mergedParams, 25),
    };
  }

  if (method === 'GET' && path === '/admin/withdrawals') {
    let list = [...state.withdrawals];
    if (mergedParams.status && mergedParams.status !== 'all') {
      list = list.filter((w) => w.status === mergedParams.status);
    }
    if (mergedParams.search) {
      const q = String(mergedParams.search).toLowerCase();
      list = list.filter(
        (w) =>
          w.id.toLowerCase().includes(q) ||
          w.username.toLowerCase().includes(q) ||
          w.fullName.toLowerCase().includes(q)
      );
    }
    return { ok: true, ...paginate(list, mergedParams, 20) };
  }

  const wdrMatch = path.match(/^\/admin\/withdrawals\/([^/]+)\/status$/);
  if (method === 'PATCH' && wdrMatch) {
    const actor = getAdminActor(state);
    const item = state.withdrawals.find((w) => w.id === wdrMatch[1]);
    if (!item) throw apiError(404, 'Withdrawal record not found.');
    const nextStatus = body?.status === 'approved' ? 'approved' : 'rejected';
    item.status = nextStatus;
    item.adminRemarks = cleanText(body?.adminRemarks || '', 180);
    item.reviewedBy = actor.username;
    item.reviewedAt = now;
    pushActivity(state, {
      actorId: actor.id,
      actorUsername: actor.username,
      actorRole: 'admin',
      action: nextStatus === 'approved' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
      targetType: 'withdrawal',
      targetId: item.id,
      targetLabel: item.username,
      details: `${nextStatus} simulated withdrawal ${item.id} (${item.amount}).`,
    });
    saveStore(state);
    return { ok: true, item };
  }

  if (method === 'GET' && path === '/admin/bets') {
    let list = [...state.bets];
    if (mergedParams.status && mergedParams.status !== 'all') list = list.filter((b) => b.status === mergedParams.status);
    if (mergedParams.search) {
      const q = String(mergedParams.search).toLowerCase();
      list = list.filter(
        (b) =>
          b.username.toLowerCase().includes(q) ||
          b.eventName.toLowerCase().includes(q) ||
          b.selection.toLowerCase().includes(q)
      );
    }
    return { ok: true, ...paginate(list, mergedParams, 20) };
  }

  if (method === 'GET' && path === '/admin/casino-results') {
    let list = [...state.casinoResults];
    if (mergedParams.search) {
      const q = String(mergedParams.search).toLowerCase();
      list = list.filter(
        (c) =>
          c.username.toLowerCase().includes(q) ||
          c.gameName.toLowerCase().includes(q) ||
          c.recordedResult.toLowerCase().includes(q)
      );
    }
    return { ok: true, ...paginate(list, mergedParams, 20) };
  }

  if (method === 'GET' && path === '/admin/settings') {
    return { ok: true, settings: state.settings };
  }

  if (method === 'PUT' && path === '/admin/settings') {
    const actor = getAdminActor(state);
    state.settings = { ...state.settings, ...(body || {}) };
    pushActivity(state, {
      actorId: actor.id,
      actorUsername: actor.username,
      actorRole: 'admin',
      action: 'SETTINGS_UPDATED',
      targetType: 'settings',
      targetId: 'global',
      targetLabel: 'Platform Settings',
      details: 'Updated global virtual platform settings.',
    });
    saveStore(state);
    return { ok: true, settings: state.settings };
  }

  if (method === 'PUT' && path === '/admin/button-values') {
    const actor = getAdminActor(state);
    if (Array.isArray(body?.buttonValues) && body.buttonValues.length > 0) {
      state.settings.buttonValues = body.buttonValues;
    }
    pushActivity(state, {
      actorId: actor.id,
      actorUsername: actor.username,
      actorRole: 'admin',
      action: 'BUTTON_VALUES_UPDATED',
      targetType: 'settings',
      targetId: 'buttonValues',
      targetLabel: 'Quick Stake Buttons',
      details: 'Updated default quick stake button values.',
    });
    saveStore(state);
    return { ok: true, settings: state.settings };
  }

  if (method === 'GET' && path === '/admin/activity-logs') {
    let list = [...state.activityLogs];
    if (mergedParams.search) {
      const q = String(mergedParams.search).toLowerCase();
      list = list.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.actorUsername.toLowerCase().includes(q) ||
          String(l.details || '').toLowerCase().includes(q)
      );
    }
    list = filterByDateRange(list, mergedParams.from, mergedParams.to);
    return { ok: true, ...paginate(list, mergedParams, 25) };
  }

  throw apiError(404, `Demo route not found: ${method} ${path}`);
}
