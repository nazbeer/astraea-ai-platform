"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Loader2, 
  Check, 
  Sparkles, 
  Zap, 
  Crown, 
  CreditCard, 
  History,
  BarChart3 
} from "lucide-react";
import { API_URL } from "@/lib/config";

interface Plan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[] | Record<string, any>;
  limits: {
    monthly_credits: number;
    job_applications_per_day: number;
    max_saved_jobs: number;
  };
}

// Helper to normalize features from API (handles both array and object)
function getFeaturesArray(features: string[] | Record<string, any>): string[] {
  if (Array.isArray(features)) {
    return features;
  }
  if (typeof features === 'object' && features !== null) {
    // Convert object values to array
    return Object.values(features).filter(v => typeof v === 'string');
  }
  return [];
}

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  description: string;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/billing/plans`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch plans");
      const data = await response.json();
      setPlans(data.plans);
      setCreditPacks(data.credit_packs || []);
    } catch (error) {
      setToast({ message: "Failed to load subscription plans", type: "error" });
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await fetch(`${API_URL}/billing/current`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch subscription");
      const data = await response.json();
      setCurrentSubscription(data);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setPageLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (planId === "free") return;
    
    setLoading(planId);
    try {
      const response = await fetch(
        `${API_URL}/billing/checkout?plan_id=${planId}&interval=${isYearly ? "year" : "month"}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      if (!response.ok) throw new Error("Failed to create checkout");
      const data = await response.json();
      
      window.location.href = data.checkout_url;
    } catch (error) {
      setToast({ message: "Failed to start checkout process", type: "error" });
      setLoading(null);
    }
  };

  const handleBuyCredits = async (packId: string) => {
    setLoading(packId);
    try {
      const response = await fetch(
        `${API_URL}/billing/credits/checkout?pack_id=${packId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      if (!response.ok) throw new Error("Failed to create checkout");
      const data = await response.json();
      window.location.href = data.checkout_url;
    } catch (error) {
      setToast({ message: "Failed to start credit purchase", type: "error" });
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;
    
    setLoading("cancel");
    try {
      const response = await fetch(`${API_URL}/billing/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to cancel");
      setToast({ message: "Your subscription has been cancelled", type: "success" });
      fetchCurrentSubscription();
    } catch (error) {
      setToast({ message: "Failed to cancel subscription", type: "error" });
    } finally {
      setLoading(null);
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "free":
        return <Sparkles className="h-6 w-6 text-gray-400" />;
      case "pro":
        return <Zap className="h-6 w-6 text-blue-500" />;
      case "enterprise":
        return <Crown className="h-6 w-6 text-amber-500" />;
      default:
        return <Sparkles className="h-6 w-6" />;
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

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

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold mb-4 text-white"
          >
            Choose Your Plan
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 max-w-2xl mx-auto"
          >
            Unlock the full potential of your job search with our premium features
          </motion.p>
        </div>

        {/* Current Subscription Status */}
        {currentSubscription && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-12"
          >
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-white">Current Subscription</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-400">Plan</p>
                  <p className="text-xl font-semibold text-white">{currentSubscription.plan_name}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    currentSubscription.status === 'active' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {currentSubscription.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Credits</p>
                  <p className="text-xl font-semibold text-white">
                    {currentSubscription.credits_remaining === -1
                      ? "Unlimited"
                      : currentSubscription.credits_remaining}
                  </p>
                  <p className="text-sm text-gray-500">
                    of {currentSubscription.credits_total} used
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a href="/billing/history" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">
                    <History className="h-4 w-4 inline mr-2" />
                    Payment History
                  </a>
                  <a href="/billing/usage" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">
                    <BarChart3 className="h-4 w-4 inline mr-2" />
                    Usage Stats
                  </a>
                </div>
              </div>
              {currentSubscription.tier !== "free" && currentSubscription.status === "active" && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <button
                    onClick={handleCancel}
                    disabled={loading === "cancel"}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {loading === "cancel" ? (
                      <Loader2 className="h-4 w-4 animate-spin inline" />
                    ) : (
                      "Cancel Subscription"
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <span className={`text-sm ${!isYearly ? "font-semibold text-white" : "text-gray-400"}`}>Monthly</span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors ${isYearly ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isYearly ? 'left-8' : 'left-1'}`} />
          </button>
          <span className={`text-sm ${isYearly ? "font-semibold text-white" : "text-gray-400"}`}>
            Yearly
            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
              Save 17%
            </span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => {
            const isCurrentPlan = currentSubscription?.tier === plan.id;
            const price = isYearly ? plan.price_yearly : plan.price_monthly;
            const isPro = plan.id === "pro";
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={`relative h-full flex flex-col bg-gray-900 rounded-2xl border ${
                  isPro ? "border-blue-500 scale-105" : "border-gray-800"
                } ${isCurrentPlan ? "ring-2 ring-blue-500" : ""} p-6`}>
                  {isPro && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                      Most Popular
                    </span>
                  )}
                  {isCurrentPlan && (
                    <span className="absolute -top-3 right-4 px-3 py-1 bg-gray-700 text-white text-xs font-medium rounded-full">
                      Current Plan
                    </span>
                  )}
                  
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      {getPlanIcon(plan.id)}
                      <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                    </div>
                    <p className="text-gray-400 text-sm">{plan.description}</p>
                  </div>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">
                      {formatPrice(price)}
                    </span>
                    {price > 0 && (
                      <span className="text-gray-400">
                        /{isYearly ? "year" : "month"}
                      </span>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mb-6 flex-1">
                    {getFeaturesArray(plan.features).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check className="h-5 w-5 text-green-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-6 border-t border-gray-800 mb-6">
                    <p className="text-sm font-medium text-white mb-2">Limits:</p>
                    <p className="text-sm text-gray-400">
                      • {plan.limits.monthly_credits === -1
                        ? "Unlimited AI credits"
                        : `${plan.limits.monthly_credits} AI credits/month`}
                    </p>
                    <p className="text-sm text-gray-400">
                      • {plan.limits.job_applications_per_day} job applications/day
                    </p>
                    <p className="text-sm text-gray-400">
                      • {plan.limits.max_saved_jobs} saved jobs
                    </p>
                  </div>
                  
                  <button
                    disabled={isCurrentPlan || loading === plan.id}
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50 ${
                      isPro 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                    }`}
                  >
                    {loading === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : plan.id === "free" ? (
                      "Get Started"
                    ) : (
                      "Subscribe"
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Credit Packs */}
        {creditPacks.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-8 text-white">Need More Credits?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {creditPacks.map((pack, index) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center"
                >
                  <h3 className="text-2xl font-bold text-white mb-1">{pack.credits}</h3>
                  <p className="text-gray-400 text-sm mb-4">{pack.description}</p>
                  <p className="text-2xl font-bold text-white mb-4">${pack.price}</p>
                  <button
                    onClick={() => handleBuyCredits(pack.id)}
                    disabled={loading === pack.id}
                    className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {loading === pack.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      "Buy Now"
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I change plans anytime?",
                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.",
              },
              {
                q: "What happens to my credits if I cancel?",
                a: "Your credits remain available until the end of your billing period. After that, you'll be switched to the free plan.",
              },
              {
                q: "Are credit packs one-time purchases?",
                a: "Yes, credit packs are one-time purchases that add credits to your account immediately.",
              },
              {
                q: "Do credits expire?",
                a: "Subscription credits reset monthly. Purchased credits never expire.",
              },
            ].map((faq, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-gray-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
