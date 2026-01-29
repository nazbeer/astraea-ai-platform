"use client";

import { useEffect, useState } from 'react';
import api from '../utils/api';
import Sidebar from '@/components/Sidebar';
import { User, Activity, CreditCard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [usageData, setUsageData] = useState<any[]>([]);
    const [interval, setInterval] = useState('1month');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [showCustomRange, setShowCustomRange] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        fetchUsage();
    }, [interval, customRange]);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/profile');
            setProfile(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUsage = async () => {
        try {
            let params: any = { interval };
            if (interval === 'custom' && customRange.start && customRange.end) {
                params = { start_date: customRange.start, end_date: customRange.end };
            }
            const res = await api.get('/profile/usage', { params });
            setUsageData(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    if (!profile) return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-[var(--text-muted)] ">Synchronizing profile...</p>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] font-sans overflow-hidden">
            <Sidebar currentSessionId={null} onSelectSession={() => { }} selectedModel="gpt-4o-mini" />
            <main className="flex-1 p-6 lg:p-10 overflow-y-auto scrollbar-none">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-bold text-[var(--text-primary)] ">Biological ID</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-2 font-bold  opacity-70">Neurological usage and identity metrics.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {/* Identity Card */}
                    <div className="bg-[var(--card)] border border-[var(--border)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <User size={80} />
                        </div>
                        <div className="flex items-center gap-5 mb-6 relative z-10">
                            <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl shadow-sm">
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-bold text-[var(--text-muted)] mb-1 ">Protocol Identity</h3>
                                <p className="text-xl font-bold text-[var(--text-primary)] ">{profile.username}</p>
                            </div>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] font-bold opacity-80 pl-1">{profile.email}</p>
                    </div>

                    {/* Tier Card */}
                    <div className="bg-[var(--card)] border border-[var(--border)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-purple-500/10 text-purple-500 rounded-2xl shadow-sm">
                                    <CreditCard size={24} />
                                </div>
                                <h3 className="text-[10px] font-bold text-[var(--text-muted)] ">Access Layer</h3>
                            </div>
                            <span className="px-4 py-1.5 bg-[var(--input-bg)] text-blue-500 text-[10px] font-bold rounded-full border border-blue-500/20  shadow-sm">
                                {profile.tier}
                            </span>
                        </div>
                        <div className="space-y-6 relative z-10">
                            <div>
                                <p className="text-3xl font-bold text-[var(--text-primary)] ">{profile.remaining_quota.toLocaleString()}</p>
                                <p className="text-[10px] text-[var(--text-muted)] font-bold  mt-2 opacity-60">Remaining units</p>
                            </div>
                            <div className="w-full bg-[var(--input-bg)] h-3 rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                                    style={{ width: `${(profile.remaining_quota / profile.total_quota) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-[var(--card)] border border-[var(--border)] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                        <div className="flex items-center gap-5 mb-6 relative z-10">
                            <div className="p-4 bg-green-500/10 text-green-600 rounded-2xl shadow-sm">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-bold text-[var(--text-muted)] mb-1 ">Total Sythesized</h3>
                                <p className="text-xl font-bold text-[var(--text-primary)] ">{profile.request_count.toLocaleString()}</p>
                            </div>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] font-bold opacity-80 pl-1  text-[10px]">Logical Inferences Completed</p>
                    </div>
                </div>

                {/* Usage Chart Section */}
                <div className="bg-[var(--card)] border border-[var(--border)] p-8 lg:p-12 rounded-[3rem] shadow-2xl">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-8">
                        <div>
                            <h3 className="text-[10px] font-bold text-[var(--text-muted)] mb-2">Neural Activity Waveform</h3>
                            <p className="text-xl font-bold text-[var(--text-primary)]">Synthesis throughput</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-[var(--input-bg)] p-1.5 rounded-2xl border border-[var(--border)] shadow-sm">
                                {['hours', 'day', '15days', '1month', '60days'].map((i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setInterval(i); setShowCustomRange(false); }}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-bold  transition-all ${interval === i ? 'bg-[var(--card)] text-blue-500 shadow-md border border-[var(--border)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                    >
                                        {i === 'hours' ? '24h' : i === 'day' ? '1d' : i === '15days' ? '15d' : i === '1month' ? '30d' : '60d'}
                                    </button>
                                ))}
                                <button
                                    onClick={() => { setInterval('custom'); setShowCustomRange(!showCustomRange); }}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold  transition-all ${interval === 'custom' ? 'bg-[var(--card)] text-blue-500 shadow-md border border-[var(--border)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                >
                                    Range
                                </button>
                            </div>

                            {interval === 'custom' && showCustomRange && (
                                <div className="flex items-center gap-3 bg-[var(--input-bg)] p-2 rounded-2xl border border-blue-500/20 animate-in fade-in slide-in-from-right-2">
                                    <input
                                        type="date"
                                        className="bg-transparent text-[10px] font-bold text-[var(--text-primary)] outline-none cursor-pointer p-1"
                                        value={customRange.start}
                                        onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                                    />
                                    <span className="text-[var(--text-muted)] text-[10px] font-bold">→</span>
                                    <input
                                        type="date"
                                        className="bg-transparent text-[10px] font-bold text-[var(--text-primary)] outline-none cursor-pointer p-1"
                                        value={customRange.end}
                                        onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={usageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(value: any) => {
                                        const d = new Date(value);
                                        return interval === 'hours'
                                            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                    }}
                                    minTickGap={30}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '20px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        color: 'var(--text-primary)',
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                                    }}
                                    itemStyle={{ color: '#3b82f6', letterSpacing: '0.1em' }}
                                    labelFormatter={(label) => new Date(label).toLocaleString()}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#3b82f6"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorCount)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </main>
        </div>
    );
}
