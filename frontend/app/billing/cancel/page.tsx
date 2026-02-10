"use client";

import { motion } from "framer-motion";
import { XCircle, ArrowLeft, MessageSquare } from "lucide-react";

export default function BillingCancelPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-10 w-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Checkout Cancelled</h1>
          <p className="text-gray-400 mb-6">
            Your payment was cancelled. No charges were made to your account.
          </p>
          
          <div className="bg-gray-800/50 p-4 rounded-lg text-sm mb-6">
            <p className="text-gray-400">
              If you experienced any issues during checkout, please contact our support team. 
              We&apos;re here to help!
            </p>
          </div>
          
          <div className="flex gap-3">
            <a href="/billing" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Pricing
            </a>
            <a href="/" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
              <MessageSquare className="h-4 w-4" />
              Chat with AI
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
