import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import api from "../services/api";

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  role: "USER" | "ADMIN";
  is_paid: boolean;
  simple_trial_used: number;
  dynamic_trial_used: number;
  validation_count: number;
  registered_at: string;
  last_login_at: string | null;
}

export interface ValidationHistoryItem {
  id: number;
  mode: "SIMPLE" | "DYNAMIC";
  components: any[];
  status: "COMPLIANT" | "NON_COMPLIANT";
  issues: string[];
  suggestions: Array<{ message: string }>;
  recommended_structure: any | null;
  financial_impact: any | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  history: ValidationHistoryItem[];
  login: (email: string, password: string) => Promise<{ status: string; message?: string }>;
  register: (userData: {
    username: string;
    full_name: string;
    email: string;
    phone?: string;
    company_name?: string;
    password: string;
  }) => Promise<{ status: string; message?: string }>;
  logout: () => void;
  upgrade: (paymentCode: string) => Promise<{ status: string; message: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [history, setHistory] = useState<ValidationHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserDetails = async (email: string) => {
    try {
      const res = await api.get(`/user/${email}`);
      if (res.data.status === "SUCCESS") {
        setUser(res.data.user);
        setHistory(res.data.history || []);
      } else {
        logout();
      }
    } catch (error) {
      console.error("Hydration error:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedEmail = localStorage.getItem("userEmail");

    if (storedToken && storedEmail) {
      setToken(storedToken);
      fetchUserDetails(storedEmail);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post("/login", { email, password });
      if (res.data.status === "SUCCESS") {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("userEmail", res.data.user.email);
        setToken(res.data.token);
        // Hydrate
        await fetchUserDetails(res.data.user.email);
        return { status: "SUCCESS" };
      }
      return { status: "ERROR", message: res.data.message || "Login failed" };
    } catch (error: any) {
      return {
        status: "ERROR",
        message: error.response?.data?.message || "Invalid credentials"
      };
    }
  };

  const register = async (userData: any) => {
    try {
      const res = await api.post("/register", userData);
      if (res.data.status === "SUCCESS") {
        // Auto login
        return login(userData.email, userData.password);
      }
      return { status: "ERROR", message: res.data.message || "Registration failed" };
    } catch (error: any) {
      return {
        status: "ERROR",
        message: error.response?.data?.message || "Registration failed"
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setToken(null);
    setUser(null);
    setHistory([]);
  };

  const upgrade = async (paymentCode: string) => {
    try {
      const res = await api.post("/upgrade", { paymentCode });
      if (res.data.status === "UPGRADED") {
        localStorage.setItem("token", res.data.token);
        setToken(res.data.token);
        if (user) {
          await fetchUserDetails(user.email);
        }
        return { status: "SUCCESS", message: res.data.message };
      }
      return { status: "ERROR", message: res.data.message || "Upgrade failed" };
    } catch (error: any) {
      return {
        status: "ERROR",
        message: error.response?.data?.message || "Invalid upgrade code"
      };
    }
  };

  const refreshUser = async () => {
    if (user) {
      await fetchUserDetails(user.email);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        history,
        login,
        register,
        logout,
        upgrade,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
