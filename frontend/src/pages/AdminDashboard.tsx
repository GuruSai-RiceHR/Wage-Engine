import React, { useState, useEffect } from "react";
import api from "../services/api";
import {
  Users,
  Activity,
  FileSpreadsheet,
  Shield,
  Search,
  CheckCircle,
  Database,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  AlertTriangle,
  Lightbulb,
  TrendingUp
} from "lucide-react";

interface AdminUser {
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

interface ValidationLog {
  id: number;
  user_email: string | null;
  browser: string | null;
  device: string | null;
  operating_system: string | null;
  ip_address: string | null;
  api_endpoint: string;
  http_status: number;
  execution_time: number | null;
  created_at: string;
  mode?: "SIMPLE" | "DYNAMIC";
  components?: any[];
  status?: "COMPLIANT" | "NON_COMPLIANT";
  issues?: string[];
  suggestions?: Array<{ message: string }>;
  recommendedStructure?: any;
  financialImpact?: any;
}

interface LoginLog {
  id: number;
  user_email: string | null;
  login_status: "SUCCESS" | "FAILED";
  browser: string | null;
  device: string | null;
  operating_system: string | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditLog {
  id: number;
  user_email: string | null;
  action: string;
  description: string;
  metadata: any | null;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  // Tabs
  const [activeTab, setActiveTab] = useState<"USERS" | "VALIDATION" | "LOGIN" | "AUDIT">("USERS");

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Users management state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersPage, setUsersPage] = useState(1);

  // Logs state
  const [valLogs, setValLogs] = useState<ValidationLog[]>([]);
  const [valTotal, setValTotal] = useState(0);
  const [valPage, setValPage] = useState(1);

  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loginTotal, setLoginTotal] = useState(0);
  const [loginPage, setLoginPage] = useState(1);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [showMetadata, setShowMetadata] = useState<any | null>(null);
  const [selectedValHistory, setSelectedValHistory] = useState<any | null>(null);

  const limit = 10;

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      if (res.data.status === "SUCCESS") {
        setStats(res.data.stats);
      }
    } catch (error) {
      console.error("Failed to load statistics:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const offset = (usersPage - 1) * limit;
      const res = await api.get(`/admin/users?limit=${limit}&offset=${offset}&search=${encodeURIComponent(usersSearch)}`);
      if (res.data.status === "SUCCESS") {
        setUsers(res.data.data.users);
        setUsersTotal(res.data.data.total);
      }
    } catch (error) {
      console.error("Failed to load users list:", error);
    }
  };

  const fetchValidationLogs = async () => {
    try {
      const offset = (valPage - 1) * limit;
      const res = await api.get(`/admin/validation-logs?limit=${limit}&offset=${offset}`);
      if (res.data.status === "SUCCESS") {
        setValLogs(res.data.data.logs);
        setValTotal(res.data.data.total);
      }
    } catch (error) {
      console.error("Failed to load validation logs:", error);
    }
  };

  const fetchLoginLogs = async () => {
    try {
      const offset = (loginPage - 1) * limit;
      const res = await api.get(`/admin/login-history?limit=${limit}&offset=${offset}`);
      if (res.data.status === "SUCCESS") {
        setLoginLogs(res.data.data.logs);
        setLoginTotal(res.data.data.total);
      }
    } catch (error) {
      console.error("Failed to load login history:", error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const offset = (auditPage - 1) * limit;
      const actionParam = auditActionFilter ? `&action=${auditActionFilter}` : "";
      const res = await api.get(`/admin/audit-logs?limit=${limit}&offset=${offset}${actionParam}`);
      if (res.data.status === "SUCCESS") {
        setAuditLogs(res.data.data.logs);
        setAuditTotal(res.data.data.total);
      }
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await fetchStats();
    if (activeTab === "USERS") await fetchUsers();
    else if (activeTab === "VALIDATION") await fetchValidationLogs();
    else if (activeTab === "LOGIN") await fetchLoginLogs();
    else if (activeTab === "AUDIT") await fetchAuditLogs();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab, usersPage, valPage, loginPage, auditPage, auditActionFilter]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (usersPage === 1) fetchUsers();
      else setUsersPage(1); // will trigger useeffect
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [usersSearch]);

  const toggleSubscription = async (targetUser: AdminUser) => {
    setActionLoadingId(targetUser.id);
    try {
      const res = await api.post(`/admin/users/${targetUser.id}/subscription`, { isPaid: !targetUser.is_paid });
      if (res.data.status === "SUCCESS") {
        await fetchUsers();
        await fetchStats();
      }
    } catch (error) {
      console.error("Subscription update failed:", error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleRole = async (targetUser: AdminUser) => {
    setActionLoadingId(targetUser.id);
    const newRole = targetUser.role === "ADMIN" ? "USER" : "ADMIN";
    try {
      const res = await api.post(`/admin/users/${targetUser.id}/role`, { role: newRole });
      if (res.data.status === "SUCCESS") {
        await fetchUsers();
      }
    } catch (error) {
      console.error("Role update failed:", error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getComplianceRate = () => {
    if (!stats || stats.totalValidations === 0) return "0.0%";
    const rate = (stats.compliantCount / stats.totalValidations) * 100;
    return `${rate.toFixed(1)}%`;
  };

  return (
    <div className="space-y-8 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-outfit flex items-center gap-2">
            <Shield className="h-8 w-8 text-brand-500" /> Admin Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Technical diagnostics, auditing, and subscription overrides for the Wage Validator Platform.
          </p>
        </div>
        <button
          onClick={loadData}
          className="w-fit flex items-center gap-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <RefreshCw className="h-4 w-4" /> Refresh Data
        </button>
      </div>

      {/* STATS OVERVIEW CARDS */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-lg flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xxs text-slate-400 uppercase font-medium tracking-wider">Total Users</span>
              <span className="text-xl font-bold text-white mt-0.5 block">{stats.totalUsers}</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-lg flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xxs text-slate-400 uppercase font-medium tracking-wider">Total Validations</span>
              <span className="text-xl font-bold text-white mt-0.5 block">{stats.totalValidations}</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-lg flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xxs text-slate-400 uppercase font-medium tracking-wider">Compliance Rate</span>
              <span className="text-xl font-bold text-emerald-400 mt-0.5 block">{getComplianceRate()}</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 shadow-lg flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xxs text-slate-400 uppercase font-medium tracking-wider">Simple / Dynamic Runs</span>
              <span className="text-sm font-bold text-slate-200 mt-1 block">
                {stats.simpleCount} / {stats.dynamicCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW: TABS & TABLES */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Tab Switcher */}
        <div className="border-b border-slate-800 flex flex-wrap gap-4 pb-2">
          <button
            onClick={() => setActiveTab("USERS")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all px-1 ${
              activeTab === "USERS" ? "border-brand-500 text-brand-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            User Directory
          </button>
          <button
            onClick={() => setActiveTab("VALIDATION")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all px-1 ${
              activeTab === "VALIDATION" ? "border-brand-500 text-brand-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Technical API Logs
          </button>
          <button
            onClick={() => setActiveTab("LOGIN")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all px-1 ${
              activeTab === "LOGIN" ? "border-brand-500 text-brand-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Login Security History
          </button>
          <button
            onClick={() => setActiveTab("AUDIT")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all px-1 ${
              activeTab === "AUDIT" ? "border-brand-500 text-brand-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Compliance Audit Trail
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "USERS" && (
          <div className="space-y-4">
            {/* User Search Bar */}
            <div className="relative max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Search className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                placeholder="Search username, email, full name..."
                className="w-full rounded-lg bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-700 outline-none transition-all"
              />
            </div>

            {/* Users Directory Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-left">
                    <th className="pb-3 font-medium">User Profile</th>
                    <th className="pb-3 font-medium">Company / Contact</th>
                    <th className="pb-3 font-medium text-center">Plan Status</th>
                    <th className="pb-3 font-medium text-center">Trial usage (S / D)</th>
                    <th className="pb-3 font-medium text-center">Total Audits</th>
                    <th className="pb-3 font-medium">Last Login</th>
                    <th className="pb-3 font-medium text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">Loading directory...</td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">No users found.</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/10">
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-xs">{u.full_name}</span>
                            <span className="text-xxs text-slate-500 font-mono mt-0.5">@{u.username}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span className="text-slate-300">{u.email}</span>
                            <span className="text-xxs text-slate-500 mt-0.5">{u.company_name || "No Company"} • {u.phone || "No Phone"}</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => toggleSubscription(u)}
                            disabled={actionLoadingId === u.id}
                            className={`rounded-full px-3 py-1 font-bold text-3xs border uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${
                              u.is_paid
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-slate-900 text-slate-400 border-slate-800"
                            }`}
                          >
                            {u.is_paid ? "👑 Premium" : "Free"}
                          </button>
                        </td>
                        <td className="py-3 text-center text-slate-400 font-mono">
                          {u.simple_trial_used} / {u.dynamic_trial_used}
                        </td>
                        <td className="py-3 text-center text-white font-mono font-bold">
                          {u.validation_count}
                        </td>
                        <td className="py-3 text-slate-400">
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => toggleRole(u)}
                            disabled={actionLoadingId === u.id}
                            className={`rounded px-2 py-1 font-bold text-3xs border uppercase transition-all ${
                              u.role === "ADMIN"
                                ? "bg-brand-500/20 text-brand-400 border-brand-500/30"
                                : "bg-slate-950 text-slate-500 border-slate-850 hover:bg-slate-900"
                            }`}
                          >
                            {u.role === "ADMIN" ? "⚙ Admin" : "User"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {usersTotal > limit && (
              <div className="flex items-center justify-between border-t border-slate-850 pt-4">
                <span className="text-xxs text-slate-500">
                  Showing {(usersPage - 1) * limit + 1} to {Math.min(usersPage * limit, usersTotal)} of {usersTotal} users
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUsersPage(usersPage - 1)}
                    disabled={usersPage === 1}
                    className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setUsersPage(usersPage + 1)}
                    disabled={usersPage * limit >= usersTotal}
                    className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "VALIDATION" && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-left">
                    <th className="pb-3 font-medium">Timestamp</th>
                    <th className="pb-3 font-medium">User Account</th>
                    <th className="pb-3 font-medium">Browser / OS</th>
                    <th className="pb-3 font-medium">Network Details</th>
                    <th className="pb-3 font-medium text-center">HTTP Status</th>
                    <th className="pb-3 font-medium text-center">Execution Time</th>
                    <th className="pb-3 font-medium text-right">Validation Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">Loading logs...</td>
                    </tr>
                  ) : valLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">No logs generated.</td>
                    </tr>
                  ) : (
                    valLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/10">
                        <td className="py-3 text-slate-400 font-sans">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 text-slate-200 font-sans">
                          {log.user_email || "ANONYMOUS GUEST"}
                        </td>
                        <td className="py-3 text-slate-300 text-xxs font-sans">
                          {log.browser || "Unknown"} • {log.operating_system || "Unknown"} ({log.device})
                        </td>
                        <td className="py-3 text-slate-400">
                          IP: {log.ip_address} • {log.api_endpoint}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-2xs font-bold ${
                            log.http_status === 200 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {log.http_status}
                          </span>
                        </td>
                        <td className="py-3 text-center text-white font-bold">
                          {log.execution_time}ms
                        </td>
                        <td className="py-3 text-right font-sans">
                          {log.components ? (
                            <button
                              onClick={() => setSelectedValHistory(log)}
                              className="text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-0.5 hover:underline"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Audit
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {valTotal > limit && (
              <div className="flex items-center justify-between border-t border-slate-850 pt-4">
                <span className="text-xxs text-slate-500">
                  Showing {(valPage - 1) * limit + 1} to {Math.min(valPage * limit, valTotal)} of {valTotal} logs
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setValPage(valPage - 1)}
                    disabled={valPage === 1}
                    className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setValPage(valPage + 1)}
                    disabled={valPage * limit >= valTotal}
                    className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "LOGIN" && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-left">
                    <th className="pb-3 font-medium">Timestamp</th>
                    <th className="pb-3 font-medium">User Account</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                    <th className="pb-3 font-medium">Browser / OS</th>
                    <th className="pb-3 font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">Loading security logs...</td>
                    </tr>
                  ) : loginLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">No logs generated.</td>
                    </tr>
                  ) : (
                    loginLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/10">
                        <td className="py-3 text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 text-slate-200">
                          {log.user_email || "Unknown User / Nonexistent"}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-3xs font-bold border uppercase tracking-wider ${
                            log.login_status === "SUCCESS"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse"
                          }`}>
                            {log.login_status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-300 text-xxs">
                          {log.browser || "Unknown"} • {log.operating_system || "Unknown"} ({log.device})
                        </td>
                        <td className="py-3 text-slate-400">
                          {log.ip_address}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {loginTotal > limit && (
              <div className="flex items-center justify-between border-t border-slate-850 pt-4">
                <span className="text-xxs text-slate-500">
                  Showing {(loginPage - 1) * limit + 1} to {Math.min(loginPage * limit, loginTotal)} of {loginTotal} logs
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLoginPage(loginPage - 1)}
                    disabled={loginPage === 1}
                    className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setLoginPage(loginPage + 1)}
                    disabled={loginPage * limit >= loginTotal}
                    className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "AUDIT" && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="flex gap-2">
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="rounded-lg bg-slate-950/60 border border-slate-800 focus:border-brand-500 py-1.5 px-3 text-xs text-white outline-none"
              >
                <option value="">All Actions</option>
                <option value="REGISTER">REGISTER</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="VALIDATE">VALIDATE</option>
                <option value="UPGRADE">UPGRADE</option>
                <option value="PROFILE_UPDATE">PROFILE_UPDATE</option>
                <option value="ADMIN_ACTION">ADMIN_ACTION</option>
              </select>
            </div>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-left">
                    <th className="pb-3 font-medium">Timestamp</th>
                    <th className="pb-3 font-medium">User Email</th>
                    <th className="pb-3 font-medium">Event Action</th>
                    <th className="pb-3 font-medium">Event Description</th>
                    <th className="pb-3 font-medium text-center">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">Loading audit trail...</td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">No audit logs found.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/10">
                        <td className="py-3 text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 text-slate-200">
                          {log.user_email || "SYSTEM"}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-3xs font-bold border uppercase tracking-wider ${
                            log.action === "ADMIN_ACTION"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : log.action === "UPGRADE"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-slate-950 text-slate-400 border-slate-850"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 text-slate-300 font-sans text-xs">
                          {log.description}
                        </td>
                        <td className="py-3 text-center">
                          {log.metadata ? (
                            <button
                              onClick={() => setShowMetadata(log.metadata)}
                              className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 hover:underline"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {auditTotal > limit && (
              <div className="flex items-center justify-between border-t border-slate-850 pt-4">
                <span className="text-xxs text-slate-500">
                  Showing {(auditPage - 1) * limit + 1} to {Math.min(auditPage * limit, auditTotal)} of {auditTotal} logs
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAuditPage(auditPage - 1)}
                    disabled={auditPage === 1}
                    className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setAuditPage(auditPage + 1)}
                    disabled={auditPage * limit >= auditTotal}
                    className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* METADATA PREVIEW MODAL */}
      {showMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Database className="h-4.5 w-4.5 text-brand-400" /> Audit Log Metadata
              </h3>
              <button
                onClick={() => setShowMetadata(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-300"
              >
                Close
              </button>
            </div>

            <pre className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-xxs font-mono text-emerald-400 overflow-x-auto max-h-[300px]">
              {JSON.stringify(showMetadata, null, 2)}
            </pre>

          </div>
        </div>
      )}

      {/* VALIDATION AUDIT HISTORY DETAILS MODAL */}
      {selectedValHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-6 my-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-brand-500 to-indigo-500"></div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5 font-outfit">
                  <Activity className="h-5 w-5 text-brand-400" /> Wage Compliance Audit Record
                </h3>
                <p className="text-xxs text-slate-400 mt-0.5">
                  Run on {new Date(selectedValHistory.created_at).toLocaleString()} | User: {selectedValHistory.user_email || "ANONYMOUS GUEST"}
                </p>
              </div>
              <button
                onClick={() => setSelectedValHistory(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            {/* Compliance Status and Mode */}
            <div className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
              <div>
                <span className="text-3xs text-slate-500 uppercase tracking-widest block font-mono">Validation Mode</span>
                <span className="text-xs font-bold text-slate-300 font-mono mt-0.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 uppercase inline-block font-sans">
                  {selectedValHistory.mode} Mode
                </span>
              </div>
              <div className={`px-4 py-1.5 rounded-full font-bold text-xs border uppercase tracking-wider font-sans ${
                selectedValHistory.status === "COMPLIANT"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse"
              }`}>
                {selectedValHistory.status}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Components Evaluated (Input) */}
              <div className="lg:col-span-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800/60 pb-2">
                  Input Components
                </h4>
                <div className="overflow-x-auto max-h-[300px] border border-slate-850 rounded-lg">
                  <table className="w-full text-left text-xxs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-500 border-b border-slate-850">
                      <tr>
                        <th className="p-2.5 font-medium">Component</th>
                        <th className="p-2.5 font-medium text-right">Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 bg-slate-950/10">
                      {selectedValHistory.components && selectedValHistory.components.map((comp: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-900/15">
                          <td className="p-2.5 font-medium text-slate-200 font-sans">{comp.name}</td>
                          <td className="p-2.5 text-right font-mono font-semibold">₹{(comp.value || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Findings & Recommendations */}
              <div className="lg:col-span-7 space-y-4 font-sans">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800/60 pb-2">
                  Audit Findings & Optimization
                </h4>

                {/* Issues List if Non-Compliant */}
                {selectedValHistory.status === "NON_COMPLIANT" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-rose-950/10 border border-rose-950/30 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-rose-400 font-bold text-3xs uppercase tracking-wider">
                        <AlertTriangle className="h-3.5 w-3.5" /> Violations ({selectedValHistory.issues?.length || 0})
                      </div>
                      <ul className="space-y-1 text-slate-300 text-xxs leading-normal pl-1.5 list-disc list-inside">
                        {selectedValHistory.issues && selectedValHistory.issues.map((issue: string, i: number) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-indigo-950/10 border border-indigo-950/30 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-3xs uppercase tracking-wider">
                        <Lightbulb className="h-3.5 w-3.5" /> Remediation Actions
                      </div>
                      <ul className="space-y-1 text-slate-300 text-xxs leading-normal pl-1.5 list-disc list-inside">
                        {selectedValHistory.suggestions && selectedValHistory.suggestions.map((sug: any, i: number) => (
                          <li key={i}>{sug.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Compliant Banner if Compliant */}
                {selectedValHistory.status === "COMPLIANT" && (
                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-6 text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-outfit font-bold text-white text-sm">Structure is Fully Compliant</h4>
                      <p className="text-xxs text-slate-400 max-w-sm mx-auto leading-normal">
                        This wage structure meets all statutory provisions of the Code on Wages, 2019. Exclusions are below the 50% limit and total wages satisfy the minimum floor wage threshold.
                      </p>
                    </div>
                  </div>
                )}

                {/* Financial Impact */}
                {selectedValHistory.financialImpact && (
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="block text-3xs text-slate-500 uppercase tracking-wider font-mono">Statutory Cost Incremental Impact</span>
                      <div className="flex gap-4 mt-2">
                        <div>
                          <span className="text-slate-455 text-xxs">PF Contribution:</span>
                          <span className="text-xs font-bold text-white ml-1 font-mono">
                            +₹{selectedValHistory.financialImpact.difference?.pfIncrease?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-455 text-xxs">Gratuity Provision:</span>
                          <span className="text-xs font-bold text-white ml-1 font-mono">
                            +₹{selectedValHistory.financialImpact.difference?.gratuityIncrease?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <TrendingUp className="h-5 w-5 text-indigo-500/40" />
                  </div>
                )}

                {/* Recommended Structure table */}
                {selectedValHistory.recommendedStructure && (
                  <div className="border border-slate-850 rounded-xl p-3 space-y-3 bg-slate-950/30">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <span className="text-xxs font-bold text-emerald-400 uppercase tracking-wider font-outfit">Optimized Salary Structure (Compliant)</span>
                      <span className="text-3xs text-slate-500">No take-home loss for employee</span>
                    </div>

                    <table className="w-full text-xxs text-slate-300">
                      <thead>
                        <tr className="border-b border-slate-850 text-slate-500">
                          <th className="pb-1.5 text-left font-medium">Component</th>
                          <th className="pb-1.5 text-right font-medium">Original</th>
                          <th className="pb-1.5 text-right font-medium text-emerald-400">Optimized</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 font-mono">
                        {selectedValHistory.recommendedStructure.components.map((comp: any, i: number) => {
                          let origVal = 0;
                          if (selectedValHistory.components) {
                            const orig = selectedValHistory.components.find((c: any) => c.name.toLowerCase() === comp.name.toLowerCase());
                            if (orig) origVal = orig.value;
                          }
                          return (
                            <tr key={i} className="hover:bg-slate-900/15">
                              <td className="py-1.5 font-sans font-medium text-slate-300">{comp.name}</td>
                              <td className="py-1.5 text-right text-slate-500">₹{origVal.toFixed(2)}</td>
                              <td className="py-1.5 text-right text-slate-200 font-bold">₹{comp.value.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-850 font-mono text-2xs text-slate-300">
                      <div>
                        <span className="block text-3xs text-slate-500">New Gross:</span>
                        <span className="font-bold text-white">₹{selectedValHistory.recommendedStructure.totalGross.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-3xs text-slate-500">Net Difference:</span>
                        <span className={`font-bold ${
                          selectedValHistory.recommendedStructure.netChange >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {selectedValHistory.recommendedStructure.netChange >= 0 ? "+" : ""}₹{selectedValHistory.recommendedStructure.netChange.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-3xs text-slate-500">Employer CTC:</span>
                        <span className="font-bold text-slate-200">+₹{selectedValHistory.recommendedStructure.employerCostIncrease.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedValHistory(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-850 hover:border-slate-800 rounded-lg text-xs transition-all duration-200 font-sans"
            >
              Close Record View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
