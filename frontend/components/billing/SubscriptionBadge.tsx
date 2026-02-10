"use client";

import { Crown, Zap, Sparkles } from "lucide-react";

interface SubscriptionBadgeProps {
  tier: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export function SubscriptionBadge({ tier, showIcon = true, size = "sm" }: SubscriptionBadgeProps) {
  const tierConfig: Record<string, { label: string; icon: any; className: string }> = {
    free: {
      label: "Free",
      icon: Sparkles,
      className: "bg-gray-500/20 text-gray-400",
    },
    pro: {
      label: "Pro",
      icon: Zap,
      className: "bg-gradient-to-r from-blue-600 to-cyan-600 text-white",
    },
    enterprise: {
      label: "Enterprise",
      icon: Crown,
      className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
    },
  };

  const config = tierConfig[tier] || tierConfig.free;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1",
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.className} ${sizeClasses[size]}`}>
      {showIcon && <Icon size={iconSizes[size]} className="mr-1" />}
      {config.label}
    </span>
  );
}

export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    free: "text-gray-500",
    pro: "text-blue-500",
    enterprise: "text-amber-500",
  };
  return colors[tier] || colors.free;
}

export function getTierBgColor(tier: string): string {
  const colors: Record<string, string> = {
    free: "bg-gray-500/10",
    pro: "bg-blue-500/10",
    enterprise: "bg-amber-500/10",
  };
  return colors[tier] || colors.free;
}
