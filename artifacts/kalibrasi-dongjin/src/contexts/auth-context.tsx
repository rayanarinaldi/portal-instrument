import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { API_BASE } from "../lib/api";

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  canDelete: (recordUserId?: number | null) => boolean;
  canEdit: (recordUserId?: number | null) => boolean;
  canCreate: () => boolean;
  canManageUsers: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "kalibrasi-token";
const USER_KEY = "kalibrasi-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser) as AuthUser);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Login gagal" }));
      throw new Error(err.error || "Login gagal");
    }

    const data = (await res.json()) as { token: string; user: AuthUser };

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    setToken(null);
    setUser(null);
  };

  const canDelete = (recordUserId?: number | null) => {
    if (!user) return false;
    if (user.role === "foreman" || user.role === "pic") return false;

    if (user.role === "teknisi") {
      return recordUserId != null && recordUserId === user.id;
    }

    return true;
  };

  const canEdit = (recordUserId?: number | null) => {
    if (!user) return false;
    if (user.role === "pic") return false;

    if (user.role === "teknisi") {
      return recordUserId != null && recordUserId === user.id;
    }

    return true;
  };

  const canCreate = () => {
    return !!user;
  };

  const canManageUsers = () => {
    return user?.role === "admin_it";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        canDelete,
        canEdit,
        canCreate,
        canManageUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}