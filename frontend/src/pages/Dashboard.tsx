import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import {
  FileCheck,
  AlertTriangle,
  Lightbulb,
  Plus,
  Trash2,
  Lock,
  ArrowUpRight,
  TrendingUp,
  History,
  CheckCircle,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";

interface ComponentInput {
  name: string;
  value: string;
  category: "CORE" | "EXCLUSION";
  locked?: boolean;
}

const Dashboard: React.FC = () => {
  const { user, history, upgrade, refreshUser } = useAuth();

  // Mode management
  const [mode, setMode] = useState<"SIMPLE" | "DYNAMIC">("SIMPLE");

  // Simple Mode form state
  const [simpleForm, setSimpleForm] = useState({
    basic: "",
    da: "",
    hra: "",
    special: "",
    overtimeHours: "",
    overtimeRate: ""
  });

  // Dynamic Mode components state
  const [components, setComponents] = useState<ComponentInput[]>([
    { name: "Basic", value: "", category: "CORE", locked: true },
    { name: "DA", value: "", category: "CORE", locked: true },
    { name: "HRA", value: "", category: "EXCLUSION" }
  ]);

  // Response and UI state
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [paymentCode, setPaymentCode] = useState("");
  const [upgradeError, setUpgradeError] = useState("");
  const [upgradeSuccess, setUpgradeSuccess] = useState("");

  // Guest validation counter locally stored if database is slow, but we rely on backend checks
  const handleModeSwitch = (targetMode: "SIMPLE" | "DYNAMIC") => {
    setMode(targetMode);
    setResult(null);
  };

  const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSimpleForm({ ...simpleForm, [e.target.name]: e.target.value });
  };

  const handleComponentChange = (index: number, field: "name" | "value", value: string) => {
    const updated = [...components];
    updated[index][field] = value;
    if (field === "name") {
      const name = value.toLowerCase();
      if (name.includes("basic") || name === "da") {
        updated[index].category = "CORE";
      } else {
        updated[index].category = "EXCLUSION";
      }
    }
    setComponents(updated);
  };

  const addComponent = () => {
    setComponents([...components, { name: "", value: "", category: "EXCLUSION" }]);
  };

  const removeComponent = (index: number) => {
    if (components[index].locked) return;
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleValidate = async () => {
    setLoading(true);
    setResult(null);

    try {
      let payload: any;
      if (mode === "SIMPLE") {
        payload = {
          mode: "SIMPLE",
          components: [
            { name: "Basic", value: Number(simpleForm.basic) || 0 },
            { name: "DA", value: Number(simpleForm.da) || 0 },
            { name: "HRA", value: Number(simpleForm.hra) || 0 },
            { name: "Special Allowance", value: Number(simpleForm.special) || 0 }
          ],
          overtimeHours: Number(simpleForm.overtimeHours) || 0,
          overtimeRate: Number(simpleForm.overtimeRate) || 0
        };
      } else {
        payload = {
          mode: "DYNAMIC",
          components: components.map(c => ({
            name: c.name,
            value: Number(c.value) || 0
          }))
        };
      }

      const res = await api.post("/validate", payload);
      
      if (res.data.status === "LOCKED") {
        setShowUpgradeModal(true);
      } else {
        setResult(res.data);
        if (user) {
          await refreshUser();
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Validation failed. Please check network connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeError("");
    setUpgradeSuccess("");

    if (!user) {
      setUpgradeError("You must be registered and logged in to upgrade.");
      return;
    }

    try {
      const res = await upgrade(paymentCode);
      if (res.status === "SUCCESS") {
        setUpgradeSuccess("Subscription unlocked! Try validating now.");
        setTimeout(() => {
          setShowUpgradeModal(false);
          setPaymentCode("");
          handleValidate();
        }, 1500);
      } else {
        setUpgradeError(res.message || "Invalid code. Please try again.");
      }
    } catch {
      setUpgradeError("Failed to verify code.");
    }
  };

  const getTrialStatusText = () => {
    if (!user) {
      return "Guest trials: Max 2 simple & dynamic validations. Sign up for more!";
    }
    if (user.is_paid) {
      return "👑 Premium Account - Unlimited Validations";
    }
    return `Simple trials: ${user.simple_trial_used}/3 | Dynamic trials: ${user.dynamic_trial_used}/2. Upgrade for unlimited runs.`;
  };

  return (
    <div className="space-y-8 font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-outfit">
            Wage Code Compliance Validator
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Evaluate salary structures against the Indian Code on Wages, 2019. Check the 50% rule, minimum floor wage thresholds, and overtime calculations.
          </p>
        </div>

        {/* TRIAL WARNING BAR */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 shadow-lg flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${user?.is_paid ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></div>
          <span className="text-xs font-medium text-slate-300">
            {getTrialStatusText()}
          </span>
          {!user?.is_paid && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="ml-2 bg-brand-500 hover:bg-brand-400 text-white rounded px-2.5 py-1 text-2s font-bold uppercase tracking-wider transition-all duration-200"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* WORKSPACE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT PANEL: INPUT FORM (LG: 5 columns) */}
        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
            <h2 className="font-outfit text-lg font-bold text-white">Input Parameters</h2>
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex gap-1">
              <button
                onClick={() => handleModeSwitch("SIMPLE")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  mode === "SIMPLE" ? "bg-brand-500 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => handleModeSwitch("DYNAMIC")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  mode === "DYNAMIC" ? "bg-brand-500 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Dynamic
              </button>
            </div>
          </div>

          {/* Simple Mode Form */}
          {mode === "SIMPLE" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Basic Pay (Monthly) *
                </label>
                <input
                  type="number"
                  name="basic"
                  value={simpleForm.basic}
                  onChange={handleSimpleChange}
                  placeholder="e.g. 8000"
                  className="w-full rounded-lg bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 py-2 px-3 text-sm text-white placeholder-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Dearness Allowance (DA) *
                </label>
                <input
                  type="number"
                  name="da"
                  value={simpleForm.da}
                  onChange={handleSimpleChange}
                  placeholder="e.g. 1500"
                  className="w-full rounded-lg bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 py-2 px-3 text-sm text-white placeholder-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  House Rent Allowance (HRA)
                </label>
                <input
                  type="number"
                  name="hra"
                  value={simpleForm.hra}
                  onChange={handleSimpleChange}
                  placeholder="e.g. 4000"
                  className="w-full rounded-lg bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 py-2 px-3 text-sm text-white placeholder-slate-700 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Special Allowance
                </label>
                <input
                  type="number"
                  name="special"
                  value={simpleForm.special}
                  onChange={handleSimpleChange}
                  placeholder="e.g. 3000"
                  className="w-full rounded-lg bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 py-2 px-3 text-sm text-white placeholder-slate-700 outline-none transition-all"
                />
              </div>

              <div className="border-t border-slate-800/60 pt-4 mt-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Overtime Validation (Optional)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      OT Hours (Monthly)
                    </label>
                    <input
                      type="number"
                      name="overtimeHours"
                      value={simpleForm.overtimeHours}
                      onChange={handleSimpleChange}
                      placeholder="e.g. 10"
                      className="w-full rounded-lg bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 py-2 px-3 text-sm text-white placeholder-slate-700 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      OT Hourly Rate (₹)
                    </label>
                    <input
                      type="number"
                      name="overtimeRate"
                      value={simpleForm.overtimeRate}
                      onChange={handleSimpleChange}
                      placeholder="e.g. 150"
                      className="w-full rounded-lg bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 py-2 px-3 text-sm text-white placeholder-slate-700 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Dynamic Mode Form
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {components.map((comp, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/40">
                  <div className="flex-1">
                    <input
                      type="text"
                      disabled={comp.locked}
                      value={comp.name}
                      onChange={(e) => handleComponentChange(idx, "name", e.target.value)}
                      placeholder="Component Name"
                      className="w-full rounded bg-slate-950/80 border border-slate-800 px-2 py-1.5 text-xs text-white placeholder-slate-700 outline-none disabled:opacity-60"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      value={comp.value}
                      onChange={(e) => handleComponentChange(idx, "value", e.target.value)}
                      placeholder="Value (₹)"
                      className="w-full rounded bg-slate-950/80 border border-slate-800 px-2 py-1.5 text-xs text-white placeholder-slate-700 outline-none"
                    />
                  </div>
                  <div className="w-24 text-center">
                    <span className={`px-2 py-1 rounded text-xxs font-bold ${
                      comp.category === "CORE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}>
                      {comp.category}
                    </span>
                  </div>
                  <button
                    onClick={() => removeComponent(idx)}
                    disabled={comp.locked}
                    className="text-slate-500 hover:text-red-400 disabled:opacity-20 p-1 transition-colors"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addComponent}
                className="w-full flex items-center justify-center gap-1.5 border border-dashed border-slate-800 hover:border-brand-500/60 rounded-lg py-2.5 text-xs font-semibold text-slate-400 hover:text-brand-400 transition-all bg-slate-950/10"
              >
                <Plus className="h-4 w-4" /> Add Component
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleValidate}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                  Validating...
                </>
              ) : (
                <>
                  <FileCheck className="h-4.5 w-4.5" /> Run Compliance Check
                </>
              )}
            </button>
            <button
              onClick={() => {
                setSimpleForm({ basic: "", da: "", hra: "", special: "", overtimeHours: "", overtimeRate: "" });
                setComponents([
                  { name: "Basic", value: "", category: "CORE", locked: true },
                  { name: "DA", value: "", category: "CORE", locked: true },
                  { name: "HRA", value: "", category: "EXCLUSION" }
                ]);
                setResult(null);
              }}
              className="px-4 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold border border-slate-800 hover:border-slate-700 transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: AUDIT RESULTS (LG: 7 columns) */}
        <div className="lg:col-span-7 space-y-6 min-h-[500px]">
          {result ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>

              {/* Status Header */}
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest">Compliance Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xl font-bold font-outfit ${
                      result.status === "COMPLIANT" ? "text-emerald-400" : "text-rose-400"
                    }`}>
                      {result.status === "COMPLIANT" ? "COMPLIANT STRUCTURE" : "NON-COMPLIANT STRUCTURE"}
                    </span>
                  </div>
                </div>

                <div className={`h-10 px-4 rounded-full flex items-center justify-center font-bold text-sm border ${
                  result.status === "COMPLIANT"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}>
                  {result.status === "COMPLIANT" ? "✓ Compliant" : "✗ Actions Required"}
                </div>
              </div>

              {/* Issues and suggestions */}
              {result.status === "NON_COMPLIANT" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Issues */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs uppercase tracking-wider">
                      <AlertTriangle className="h-4 w-4" /> Violations Found ({result.issues.length})
                    </div>
                    <ul className="space-y-2 text-slate-300 text-xs">
                      {result.issues.map((issue: string, i: number) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="text-rose-500 mt-0.5">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggestions */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                      <Lightbulb className="h-4 w-4" /> Remediation Actions
                    </div>
                    <ul className="space-y-2 text-slate-300 text-xs">
                      {result.suggestions.map((sug: any, i: number) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <span>{sug.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Financial Impact */}
              {result.financialImpact && (
                <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Immediate Financial Impact (Est. Monthly)
                      </h4>
                      <p className="text-xxs text-slate-500">
                        Based on the current structure's Basic+DA deficit
                      </p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-indigo-500/60" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                      <span className="block text-xxs text-slate-400 font-medium">PF Employer Share Increase</span>
                      <span className="text-lg font-bold text-white mt-1 block">
                        ₹{(result.financialImpact.difference.pfIncrease || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                      <span className="block text-xxs text-slate-400 font-medium">Gratuity Provision Increase</span>
                      <span className="text-lg font-bold text-white mt-1 block">
                        ₹{(result.financialImpact.difference.gratuityIncrease || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommended Structure */}
              {result.recommendedStructure && (
                <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                    <div>
                      <h3 className="font-outfit text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle className="h-4.5 w-4.5" /> Optimized Salary Structure
                      </h3>
                      <p className="text-xxs text-slate-400">
                        Restructured to ensure compliance without employee net-take-home loss.
                      </p>
                    </div>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xxs font-semibold text-emerald-400 border border-emerald-500/20 w-fit">
                      Fully Compliant
                    </span>
                  </div>

                  <table className="w-full border-collapse text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="text-left pb-2 font-medium">Component</th>
                        <th className="text-right pb-2 font-medium">Current</th>
                        <th className="text-right pb-2 font-medium text-emerald-400">Recommended</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {result.recommendedStructure.components.map((comp: any, idx: number) => {
                        let currentValue = 0;
                        if (mode === "SIMPLE") {
                          if (comp.name === "Basic") currentValue = Number(simpleForm.basic) || 0;
                          else if (comp.name === "DA") currentValue = Number(simpleForm.da) || 0;
                          else if (comp.name === "HRA") currentValue = Number(simpleForm.hra) || 0;
                          else if (comp.name === "Special Allowance") currentValue = Number(simpleForm.special) || 0;
                        } else {
                          const orig = components.find(c => c.name.toLowerCase() === comp.name.toLowerCase());
                          if (orig) currentValue = Number(orig.value) || 0;
                        }
                        return (
                          <tr key={idx} className="hover:bg-slate-900/30">
                            <td className="py-2.5 font-medium">{comp.name}</td>
                            <td className="py-2.5 text-right text-slate-500">₹{currentValue.toFixed(2)}</td>
                            <td className="py-2.5 text-right font-bold text-slate-200">₹{comp.value.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Optimization metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-850">
                    <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-850">
                      <span className="block text-xxs text-slate-400">New Gross Salary</span>
                      <span className="text-sm font-bold text-white block mt-0.5">
                        ₹{result.recommendedStructure.totalGross.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-850">
                      <span className="block text-xxs text-slate-400">Take-Home Change</span>
                      <span className={`text-sm font-bold block mt-0.5 ${
                        result.recommendedStructure.netChange >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {result.recommendedStructure.netChange >= 0 ? "▲" : "▼"} ₹{Math.abs(result.recommendedStructure.netChange).toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-850">
                      <span className="block text-xxs text-slate-400">Employer CTC Change</span>
                      <span className="text-sm font-bold text-slate-200 block mt-0.5">
                        +₹{result.recommendedStructure.employerCostIncrease.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3 text-xxs text-emerald-400 leading-normal">
                    <strong>Note:</strong> {result.recommendedStructure.note}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center border border-dashed border-slate-800/80 rounded-2xl p-12 text-center h-full bg-slate-900/10 min-h-[400px]">
              <div className="h-14 w-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
                <FileCheck className="h-6 w-6 text-slate-500" />
              </div>
              <h3 className="font-outfit font-bold text-slate-300">Ready for Validation</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Enter your wage components in the left panel and trigger the audit check. Full compliance reports, suggestions, and recommendations will be populated here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* USER RUN HISTORY SECTION (only for logged in users) */}
      {user && history.length > 0 && (
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <History className="h-5 w-5 text-brand-400" />
            <h2 className="font-outfit text-lg font-bold text-white">Your Validation History</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-left">
                  <th className="pb-2 font-medium">Date & Time</th>
                  <th className="pb-2 font-medium">Mode</th>
                  <th className="pb-2 font-medium">Components Evaluated</th>
                  <th className="pb-2 font-medium">Compliance Status</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/20">
                    <td className="py-3 text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 text-xxs rounded bg-slate-950 border border-slate-850 font-bold">
                        {item.mode}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300 max-w-xs truncate">
                      {item.components.map(c => `${c.name}: ₹${c.value}`).join(", ")}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xxs font-bold ${
                        item.status === "COMPLIANT" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => {
                          setResult(item);
                          setMode(item.mode);
                          if (item.mode === "SIMPLE") {
                            // Map simple values back
                            const basicVal = item.components.find(c => c.name.toLowerCase() === "basic")?.value || "";
                            const daVal = item.components.find(c => c.name.toLowerCase() === "da")?.value || "";
                            const hraVal = item.components.find(c => c.name.toLowerCase() === "hra")?.value || "";
                            const specialVal = item.components.find(c => c.name.toLowerCase() === "special allowance")?.value || "";
                            setSimpleForm({
                              basic: basicVal.toString(),
                              da: daVal.toString(),
                              hra: hraVal.toString(),
                              special: specialVal.toString(),
                              overtimeHours: "",
                              overtimeRate: ""
                            });
                          } else {
                            setComponents(item.components.map(c => ({
                              name: c.name,
                              value: c.value.toString(),
                              category: c.name.toLowerCase().includes("basic") || c.name.toLowerCase() === "da" ? "CORE" : "EXCLUSION",
                              locked: c.name.toLowerCase().includes("basic") || c.name.toLowerCase() === "da"
                            })));
                          }
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-0.5 hover:underline"
                      >
                        Load <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UPGRADE / PREMIUM MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-brand-500"></div>

            <div className="flex flex-col items-center text-center space-y-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="font-outfit text-xl font-bold text-white">Validation Limit Exceeded</h2>
              <p className="text-xs text-slate-400 max-w-xs leading-normal">
                {!user 
                  ? "You have reached the 2 free Guest validation limits. Please register an account to unlock more trials!"
                  : "You have used up your free user trial validations. Unlock Premium validation mode."
                }
              </p>
            </div>

            {/* Registration CTA for Guest */}
            {!user ? (
              <div className="space-y-3">
                <Link
                  to="/register"
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 shadow-lg shadow-brand-500/15"
                >
                  Create Free Account <ChevronRight className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              // Payment form for registered user
              <form onSubmit={handleUpgrade} className="space-y-4">
                {upgradeError && (
                  <div className="rounded-lg bg-red-950/40 border border-red-900/60 p-2.5 text-xxs text-red-400">
                    {upgradeError}
                  </div>
                )}
                {upgradeSuccess && (
                  <div className="rounded-lg bg-emerald-950/40 border border-emerald-900/60 p-2.5 text-xxs text-emerald-400">
                    {upgradeSuccess}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xxs font-semibold text-slate-400 uppercase tracking-wider">
                      Premium Payment Code
                    </label>
                    <span className="text-xxs text-slate-500">
                      Use code: <strong className="text-brand-400 font-mono">123456789</strong>
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={paymentCode}
                    onChange={(e) => setPaymentCode(e.target.value)}
                    placeholder="Enter 123456789"
                    className="w-full rounded-lg bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 py-2 px-3 text-sm text-white placeholder-slate-700 outline-none text-center font-mono tracking-widest"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 shadow-lg shadow-amber-500/10 transition-colors"
                  >
                    Activate Subscription (₹999/mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(false)}
                    className="px-4 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
