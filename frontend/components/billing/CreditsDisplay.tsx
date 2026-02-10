"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2, AlertCircle } from "lucide-react";
import { API_URL } from "@/lib/config";

interface CreditsDisplayProps {
  showLabel?: boolean;
  variant?: "compact" | "full";
}

export function CreditsDisplay({ showLabel = true, variant = "compact" }: CreditsDisplayProps) {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredits();
    const interval = setInterval(fetchCredits, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await fetch(`${API_URL}/billing/current`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch credits");
      const data = await response.json();
      setCredits(data.credits_remaining);
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-gray-400">
        <Loader2 size={12} className="animate-spin" />
        {showLabel && <span className="text-xs">Loading...</span>}
      </div>
    );
  }

  if (credits === null) {
    return null;
  }

  const isUnlimited = credits === -1;
  const isLow = credits > 0 && credits < 10;

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1.5">
        <Zap size={14} className={isLow ? "text-amber-500" : "text-blue-500"} />
        <AnimatePresence mode="wait">
          <motion.span
            key={credits}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`text-xs font-medium ${
              isLow ? "text-amber-500" : "text-white"
            }`}
          >
            {isUnlimited ? "∞" : credits}
          </motion.span>
        </AnimatePresence>
        {showLabel && (
          <span className="text-xs text-gray-400">
            {isUnlimited ? "" : "credits"}
          </span>
        )}
        {isLow && !isUnlimited && (
          <AlertCircle size={12} className="text-amber-500" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-md ${isLow ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
        <Zap size={16} className={isLow ? "text-amber-500" : "text-blue-500"} />
      </div>
      <div>
        <p className="text-sm font-medium text-white">
          {isUnlimited ? "Unlimited Credits" : `${credits} Credits`}
        </p>
        {isLow && !isUnlimited && (
          <p className="text-xs text-amber-500">Running low</p>
        )}
      </div>
    </div>
  );
}
