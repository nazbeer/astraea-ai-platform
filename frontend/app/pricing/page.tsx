"use client";

import { Check, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function PricingPage() {
    return (
        <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] font-sans overflow-hidden">
            <Sidebar currentSessionId={null} onSelectSession={() => { }} selectedModel="gpt-4o-mini" />
            <main className="flex-1 px-6 py-2 lg:px-10 lg:py-2 overflow-y-auto scrollbar-none">
                <div className="text-center mb-4 max-w-2xl mx-auto pt-2">
                    <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-3 ">
                        Select a plan
                    </h1>
                    <p className="text-[var(--text-secondary)] font-medium text-lg leading-relaxed">Choose the cognitive capacity that fits your neurological requirements.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto pb-10">
                    {/* Free Tier */}
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-8 lg:p-10 shadow-xl transition-all hover:border-blue-500/20 group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h3 className="text-sm font-bold text-[var(--text-muted)] mb-8 ">Starter</h3>
                        <div className="text-6xl font-bold mb-6 text-[var(--text-primary)] ">$0</div>
                        <p className="text-sm text-[var(--text-secondary)] font-medium mb-10">Essential features for individual exploration and synthesis.</p>

                        <ul className="space-y-5 mb-10 relative z-10 font-bold">
                            <li className="flex items-center gap-4 text-[13px] text-[var(--text-secondary)]">
                                <Check size={20} className="text-green-500" strokeWidth={3} /> 100 messages per day
                            </li>
                            <li className="flex items-center gap-4 text-[13px] text-[var(--text-secondary)]">
                                <Check size={20} className="text-green-500" strokeWidth={3} /> Basic logic synthesis
                            </li>
                            <li className="flex items-center gap-4 text-[13px] text-[var(--text-secondary)]">
                                <Check size={20} className="text-green-500" strokeWidth={3} /> GPT-3.5 core engine
                            </li>
                            <li className="flex items-center gap-4 text-[13px] text-[var(--text-muted)] line-through">
                                <X size={20} /> Web-link ingestion
                            </li>
                        </ul>

                        <button className="w-full py-5 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-muted)] font-bold text-[13px]  hover:bg-[var(--border)] transition-all relative z-10 transition-colors disabled pointer-events-none" >
                            Current protocol
                        </button>
                    </div>

                    {/* Pro Tier */}
                    <div className="bg-[var(--card)] border border-blue-600/30 rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden shadow-2xl transition-all hover:border-blue-500 group">
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-6 py-2.5 rounded-bl-3xl  shadow-lg">
                            Recommended
                        </div>
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600" />

                        <h3 className="text-sm font-bold text-blue-500 mb-8 ">Astraea Pro</h3>
                        <div className="text-6xl font-bold mb-6 text-[var(--text-primary)] ">$20<span className="text-2xl text-[var(--text-muted)] font-medium">/mo</span></div>
                        <p className="text-sm text-[var(--text-secondary)] font-medium mb-10">Full cognitive capabilities for high-frequency power users.</p>

                        <ul className="space-y-5 mb-10 relative z-10 font-bold">
                            <li className="flex items-center gap-4 text-[13px] text-[var(--text-primary)]">
                                <Check size={20} className="text-blue-500" strokeWidth={3} /> Unlimited messages
                            </li>
                            <li className="flex items-center gap-4 text-[13px] text-[var(--text-primary)]">
                                <Check size={20} className="text-blue-500" strokeWidth={3} /> Advanced reasoning engine
                            </li>
                            <li className="flex items-center gap-4 text-[13px] text-[var(--text-primary)]">
                                <Check size={20} className="text-blue-500" strokeWidth={3} /> GPT-4o prime access
                            </li>
                            <li className="flex items-center gap-4 text-[13px] text-[var(--text-primary)]">
                                <Check size={20} className="text-blue-500" strokeWidth={3} /> Real-time search & ingestion
                            </li>
                        </ul>

                        <button className="w-full py-5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-bold text-[13px]  shadow-xl shadow-blue-500/25 relative z-10 active:scale-[0.98]">
                            Upgrade now
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
