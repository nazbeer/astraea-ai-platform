"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, BarChart3, Zap, FileText, Briefcase, AlertCircle } from "lucide-react";
import { API_URL } from "@/lib/config";

interface UsageStats {
  period_days: number;
  total_credits_used: number;
  usage_by_type: Record<string, { count: number; credits: number }>;
  recent_records: Array<{
    type: string;
    quantity: number;
    credits: number;
    date: string;
  }>;
}

interface Subscription {
  tier: string;
  plan_name: string;
  credits_total: number;
  credits_used: number;
  credits_remaining: number;
  limits: {
    monthly_credits: number;
    job_applications_per_day: number;
    max_saved_jobs: number;
  };
}

export default function UsageStatsPage() {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    try {
      const [usageRes, subRes] = await Promise.all([
        fetch(`${API_URL}/billing/usage?days=30`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_URL}/billing/current`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      if (!usageRes.ok || !subRes.ok) throw new Error("Failed to fetch data");

      const usageData = await usageRes.json();
      const subData = await subRes.json();

      setUsage(usageData);
      setSubscription(subData);
    } catch (error) {
      setToast({ message: "Failed to load usage statistics", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUsageIcon = (type: string) => {
    switch (type) {
      case "resume_generation":
      case "cover_letter_generation":
        return <FileText className="h-4 w-4 text-blue-400" />;
      case "job_application":
        return <Briefcase className="h-4 w-4 text-green-400" />;
      default:
        return <Zap className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getUsageLabel = (type: string) => {
    const labels: Record<string, string> = {
      resume_generation: "Resume Generation",
      cover_letter_generation: "Cover Letter Generation",
      job_application: "Job Application",
      ats_optimization: "ATS Optimization",
      ai_assistance: "AI Assistance",
    };
    return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const creditPercentage = subscription
    ? subscription.credits_total > 0
      ? (subscription.credits_used / subscription.credits_total) * 100
      : 0
    : 0;

  const isLowCredits = creditPercentage > 80;

  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <a href="/billing" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Billing
          </a>

          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">Usage Statistics</h1>
          </div>

          {/* Credit Usage Overview */}
          {subscription && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-yellow-500" />
                <h2 className="text-lg font-semibold text-white">Credit Usage</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {subscription.credits_used} used
                  </span>
                  <span className="text-gray-400">
                    {subscription.credits_remaining === -1
                      ? "Unlimited"
                      : subscription.credits_remaining}{" "}
                    remaining
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      isLowCredits ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(creditPercentage, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400">
                  {subscription.credits_total > 0
                    ? `${Math.round(creditPercentage)}% of monthly limit used`
                    : "Free plan - no credit limit"}
                  {isLowCredits && (
                    <span className="ml-2 text-red-400 flex items-center gap-1 inline-flex">
                      <AlertCircle className="h-3 w-3" />
                      Running low
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Usage by Type */}
          {usage && usage.usage_by_type && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Usage by Type</h2>
              {Object.keys(usage.usage_by_type).length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No usage recorded in the last 30 days
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(usage.usage_by_type).map(([type, data]) => (
                    <div key={type} className="bg-gray-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getUsageIcon(type)}
                        <span className="font-medium text-white">{getUsageLabel(type)}</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{data.count}</p>
                      <p className="text-sm text-gray-400">
                        {data.credits} credits used
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plan Limits */}
          {subscription && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Plan Limits</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Monthly Credits</p>
                  <p className="text-xl font-bold text-white">
                    {subscription.limits.monthly_credits === -1
                      ? "Unlimited"
                      : subscription.limits.monthly_credits}
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Daily Applications</p>
                  <p className="text-xl font-bold text-white">
                    {subscription.limits.job_applications_per_day}
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Max Saved Jobs</p>
                  <p className="text-xl font-bold text-white">
                    {subscription.limits.max_saved_jobs}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {usage && usage.recent_records && usage.recent_records.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {usage.recent_records.map((record, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getUsageIcon(record.type)}
                      <div>
                        <p className="font-medium text-white">{getUsageLabel(record.type)}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(record.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full text-xs">
                        x{record.quantity}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {record.credits} credits
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
