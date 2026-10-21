import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY } from '../services/api';
import { User } from '../models';

const AuthContext = createContext(null);

/** Decodes the JWT payload (no verification – the server verifies it). */
function decode(token) {
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const readToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
const writeToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const payload = readToken() && decode(readToken());
    if (!payload) writeToken(null);
    return payload ? new User(payload) : null;
  });

  const applyToken = useCallback((token) => {
    writeToken(token);
    const payload = token ? decode(token) : null;
    setUser(payload ? new User(payload) : null);
  }, []);

  const login = useCallback(async (email, password) => {
    const { token } = await api.login(email, password);
    applyToken(token);
  }, [applyToken]);

  const register = useCallback(async (data) => {
    const { token } = await api.register(data);
    applyToken(token);
  }, [applyToken]);

  const logout = useCallback(() => applyToken(null), [applyToken]);

  // the API service fires this when the server answers 401 to an authenticated request
  useEffect(() => {
    const onExpired = () => applyToken(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [applyToken]);

  const value = useMemo(() => ({
    user,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    /** owner of a document or admin */
    canModify: (ownerId) => !!user && (user.role === 'admin' || String(ownerId) === String(user._id)),
  }), [user, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
