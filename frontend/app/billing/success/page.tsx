"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";

function BillingSuccessContent() {
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">Confirming your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="bg-gray-900 border border-green-500/20 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-gray-400 mb-6">
            Thank you for subscribing. Your account has been upgraded.
          </p>
          
          <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-left mb-6">
            <p className="text-gray-400 mb-2">What happens next:</p>
            <ul className="space-y-1 text-gray-300">
              <li>• Your subscription is now active</li>
              <li>• Credits have been added to your account</li>
              <li>• Premium features are unlocked</li>
              <li>• You can manage your subscription anytime</li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <a href="/billing" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
              Manage Subscription
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/jobs/dashboard" className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors">
              Go to Dashboard
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  );
}
