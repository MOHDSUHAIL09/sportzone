import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient, {
  clearMemoryToken,
  getApiErrorMessage,
  setMemoryToken,
} from '../services/apiClient';

const AuthContext = createContext(null);

const DEMO_SESSION_KEY = 'sportzone_demo_session_v1';

function readStoredDemoSession() {
  try {
    return sessionStorage.getItem(DEMO_SESSION_KEY) === 'active';
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [demoSession, setDemoSession] = useState(() => readStoredDemoSession());
  const [loading, setLoading] = useState(true);
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const [envPasscodeActive, setEnvPasscodeActive] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState(null);
  const [blockedNotice, setBlockedNotice] = useState(null);

  const enterDemoSession = useCallback(() => {
    try {
      sessionStorage.setItem(DEMO_SESSION_KEY, 'active');
    } catch {
      // ignore storage errors
    }
    setDemoSession(true);
  }, []);

  const exitDemoSession = useCallback(() => {
    try {
      sessionStorage.removeItem(DEMO_SESSION_KEY);
    } catch {
      // ignore storage errors
    }
    setDemoSession(false);
  }, []);

  const refreshMe = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await apiClient.get('/auth/me');
      if (data?.ok) {
        setUser(data.user || null);
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        setUnreadCount(Number(data.unreadCount) || 0);
        setBootstrapRequired(Boolean(data.bootstrapRequired));
        setEnvPasscodeActive(Boolean(data.envPasscodeActive));
        if (data.settings) setSettings(data.settings);
        if (data.user) setBlockedNotice(null);
      }
      return data;
    } catch (err) {
      if (err?.response?.data?.code === 'ACCOUNT_BLOCKED') {
        clearMemoryToken();
        setUser(null);
        setBlockedNotice(err.response.data.error || 'Your account has been restricted by an administrator.');
      }
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  // Periodic background sync when signed in so balance, notifications & block state stay authoritative
  useEffect(() => {
    if (!user) return undefined;
    const timer = setInterval(() => {
      refreshMe({ silent: true });
    }, 20000);
    return () => clearInterval(timer);
  }, [user, refreshMe]);

  const login = useCallback(
    async ({ identifier, password }) => {
      try {
        const { data } = await apiClient.post('/auth/login', { identifier, password });
        if (data?.ok) {
          setMemoryToken(data.token);
          setUser(data.user);
          setBlockedNotice(null);
          await refreshMe({ silent: true });
          return { ok: true, user: data.user };
        }
        return { ok: false, error: data?.error || 'Sign in failed.' };
      } catch (err) {
        const code = err?.response?.data?.code;
        const msg = getApiErrorMessage(err, 'Unable to sign in.');
        if (code === 'ACCOUNT_BLOCKED') setBlockedNotice(msg);
        return { ok: false, error: msg, code };
      }
    },
    [refreshMe]
  );

  const register = useCallback(
    async (payload) => {
      try {
        const { data } = await apiClient.post('/auth/register', payload);
        if (data?.ok) {
          setMemoryToken(data.token);
          setUser(data.user);
          setBlockedNotice(null);
          await refreshMe({ silent: true });
          return { ok: true, user: data.user };
        }
        return { ok: false, error: data?.error || 'Registration failed.' };
      } catch (err) {
        return { ok: false, error: getApiErrorMessage(err, 'Registration failed.') };
      }
    },
    [refreshMe]
  );

  const bootstrapAdmin = useCallback(
    async (payload) => {
      try {
        const { data } = await apiClient.post('/auth/bootstrap-admin', payload);
        if (data?.ok) {
          setMemoryToken(data.token);
          setUser(data.user);
          setBootstrapRequired(false);
          setBlockedNotice(null);
          await refreshMe({ silent: true });
          return { ok: true, user: data.user };
        }
        return { ok: false, error: data?.error || 'Admin setup failed.' };
      } catch (err) {
        return { ok: false, error: getApiErrorMessage(err, 'Admin setup failed.') };
      }
    },
    [refreshMe]
  );

  const enterAdminSession = useCallback(async () => {
    try {
      const { data } = await apiClient.post('/auth/demo-admin-session');
      if (data?.ok && data?.user) {
        setMemoryToken(data.token);
        setUser(data.user);
        setBootstrapRequired(false);
        setBlockedNotice(null);
        refreshMe({ silent: true });
        return { ok: true, user: data.user };
      }
      return { ok: false, error: data?.error || 'Unable to open Admin Dashboard.' };
    } catch (err) {
      return { ok: false, error: getApiErrorMessage(err, 'Unable to open Admin Dashboard.') };
    }
  }, [refreshMe]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore logout network errors
    } finally {
      clearMemoryToken();
      exitDemoSession();
      setUser(null);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [exitDemoSession]);

  const markNotificationsRead = useCallback(async (id = '') => {
    try {
      await apiClient.post('/wallet/notifications/read', id ? { id } : {});
      setNotifications((prev) =>
        prev.map((n) => (!id || n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => (id ? Math.max(0, prev - 1) : 0));
    } catch {
      // ignore
    }
  }, []);

  const updateUserState = useCallback((nextUser) => {
    if (!nextUser) return;
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      demoSession,
      hasWebsiteSession: Boolean(demoSession || user),
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      loading,
      bootstrapRequired,
      envPasscodeActive,
      notifications,
      unreadCount,
      settings,
      blockedNotice,
      clearBlockedNotice: () => setBlockedNotice(null),
      refreshMe,
      login,
      register,
      bootstrapAdmin,
      enterAdminSession,
      enterDemoSession,
      exitDemoSession,
      logout,
      markNotificationsRead,
      updateUserState,
      setSettings,
    }),
    [
      user,
      demoSession,
      loading,
      bootstrapRequired,
      envPasscodeActive,
      notifications,
      unreadCount,
      settings,
      blockedNotice,
      refreshMe,
      login,
      register,
      bootstrapAdmin,
      enterAdminSession,
      enterDemoSession,
      exitDemoSession,
      logout,
      markNotificationsRead,
      updateUserState,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
