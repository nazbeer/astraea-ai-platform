"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Receipt } from "lucide-react";
import { API_URL } from "@/lib/config";

interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: string;
  type: string;
  description: string;
  created_at: string;
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/billing/payments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch payments");
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      setToast({ message: "Failed to load payment history", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      succeeded: "bg-green-500/20 text-green-400",
      paid: "bg-green-500/20 text-green-400",
      pending: "bg-yellow-500/20 text-yellow-400",
      failed: "bg-red-500/20 text-red-400",
      cancelled: "bg-gray-500/20 text-gray-400",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.cancelled}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
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

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <a href="/billing" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Billing
          </a>

          <div className="flex items-center gap-3 mb-8">
            <Receipt className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">Payment History</h1>
          </div>

          {payments.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 mb-4">No payments yet</p>
              <a href="/billing" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
                View Plans
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-full">
                          <Receipt className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{payment.description}</p>
                          <p className="text-sm text-gray-400">
                            {formatDate(payment.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">
                          {formatAmount(payment.amount, payment.currency)}
                        </p>
                        <div className="mt-1">{getStatusBadge(payment.status)}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
