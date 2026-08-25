import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "./api";
import type { Role } from "./types";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamId: string | null;
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  /** true quando um Master trocou a sessão pra "ver como" um Supervisor/Colaborador. */
  isImpersonating: boolean;
  /** Master: troca a sessão atual pela de um Supervisor/Colaborador existente (mantém o login do Master guardado à parte). */
  viewAs: (userId: string) => Promise<void>;
  /** Desfaz a troca acima, voltando pra sessão original do Master. */
  returnToMaster: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = "flexpremia_user";
// Guarda o token/usuário do Master enquanto ele estiver "vendo como" outra
// pessoa — permite voltar sem precisar logar de novo.
const MASTER_BACKUP_TOKEN_KEY = "flexpremia_master_backup_token";
const MASTER_BACKUP_USER_KEY = "flexpremia_master_backup_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const token = getToken();
    const storedUser = localStorage.getItem(USER_KEY);
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setToken(null);
      }
    }
    setIsImpersonating(!!localStorage.getItem(MASTER_BACKUP_TOKEN_KEY));
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const data = await api.post<{ token: string; user: AuthUser }>("/api/auth/login", { email, password });
    setToken(data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(MASTER_BACKUP_TOKEN_KEY);
    localStorage.removeItem(MASTER_BACKUP_USER_KEY);
    setUser(null);
    setIsImpersonating(false);
  }

  async function viewAs(userId: string) {
    const backupToken = getToken();
    const backupUser = localStorage.getItem(USER_KEY);
    const data = await api.post<{ token: string; user: AuthUser }>(`/api/master/impersonate/${userId}`);
    if (backupToken) localStorage.setItem(MASTER_BACKUP_TOKEN_KEY, backupToken);
    if (backupUser) localStorage.setItem(MASTER_BACKUP_USER_KEY, backupUser);
    setToken(data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    setIsImpersonating(true);
  }

  function returnToMaster() {
    const backupToken = localStorage.getItem(MASTER_BACKUP_TOKEN_KEY);
    const backupUser = localStorage.getItem(MASTER_BACKUP_USER_KEY);
    if (!backupToken || !backupUser) return;
    setToken(backupToken);
    localStorage.setItem(USER_KEY, backupUser);
    localStorage.removeItem(MASTER_BACKUP_TOKEN_KEY);
    localStorage.removeItem(MASTER_BACKUP_USER_KEY);
    try {
      setUser(JSON.parse(backupUser));
    } catch {
      setUser(null);
    }
    setIsImpersonating(false);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isImpersonating, viewAs, returnToMaster }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return ctx;
}
