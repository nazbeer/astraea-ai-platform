"use client";

import { Check, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function PricingPage() {
    return (
        <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
            <Sidebar currentSessionId={null} onSelectSession={() => { }} />
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
                        Choose Your Plan
                    </h1>
                    <p className="text-gray-400">Unlock the full power of Astraea AI</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Free Tier */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 relative overflow-hidden">
                        <h3 className="text-xl font-bold text-gray-300">Starter</h3>
                        <div className="text-4xl font-bold mt-4 mb-2">$0</div>
                        <p className="text-gray-500 text-sm mb-6">Forever free for individuals</p>

                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 text-sm text-gray-300">
                                <Check size={16} className="text-green-500" /> 100 Messages / day
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-300">
                                <Check size={16} className="text-green-500" /> Basic Math Tools
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-300">
                                <Check size={16} className="text-green-500" /> GPT-3.5 Turbo
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-500">
                                <X size={16} /> No Search Access
                            </li>
                        </ul>

                        <button className="w-full py-3 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors">
                            Current Plan
                        </button>
                    </div>

                    {/* Pro Tier */}
                    <div className="bg-gradient-to-b from-gray-900 to-gray-900 border border-blue-500/30 rounded-2xl p-8 relative overflow-hidden shadow-2xl shadow-blue-900/10">
                        <div className="absolute top-0 right-0 bg-blue-600 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                            Recommended
                        </div>
                        <h3 className="text-xl font-bold text-white">Pro</h3>
                        <div className="text-4xl font-bold mt-4 mb-2">$20<span className="text-lg text-gray-500 font-normal">/mo</span></div>
                        <p className="text-blue-200/60 text-sm mb-6">For power users & pros</p>

                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 text-sm text-white">
                                <Check size={16} className="text-blue-400" /> Unlimited Messages
                            </li>
                            <li className="flex items-center gap-3 text-sm text-white">
                                <Check size={16} className="text-blue-400" /> Advanced Calculator
                            </li>
                            <li className="flex items-center gap-3 text-sm text-white">
                                <Check size={16} className="text-blue-400" /> GPT-4o Access
                            </li>
                            <li className="flex items-center gap-3 text-sm text-white">
                                <Check size={16} className="text-blue-400" /> Web Search & RAG
                            </li>
                        </ul>

                        <button className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors font-semibold">
                            Upgrade to Pro
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
