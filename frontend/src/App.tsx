import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { LogOut, LayoutDashboard, Shield, LogIn, UserPlus, Sun, Moon } from "lucide-react";

// Admin Route Guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-700 border-t-brand-500"></div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Navbar Component for structured layout
const NavigationBar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 font-outfit text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              <span className="bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                🇮🇳 WageValidator
              </span>
              <span className="rounded bg-brand-500/10 px-1.5 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400 border border-brand-500/20">
                2025 Rules
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
            </button>

            {user ? (
              <>
                {user.role === "ADMIN" && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <Shield className="h-4 w-4 text-brand-500 dark:text-brand-400" />
                    Admin Panel
                  </Link>
                )}
                
                <Link
                  to="/"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Validator
                </Link>

                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user.full_name}</span>
                  <span className="text-3xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">{user.role}</span>
                </div>

                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 dark:bg-slate-800 dark:hover:bg-red-950 dark:hover:text-red-300 dark:border-slate-700 dark:hover:border-red-900 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-1.8 text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all duration-200"
                >
                  <UserPlus className="h-4 w-4" />
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-700 border-t-brand-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <NavigationBar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
