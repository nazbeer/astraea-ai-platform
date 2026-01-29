"use client";

import { useEffect, useState } from 'react';
import api from '../utils/api';
import Sidebar from '@/components/Sidebar';
import { User, Activity, Zap } from 'lucide-react';

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/profile');
            setProfile(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    if (!profile) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

    return (
        <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
            <Sidebar currentSessionId={null} onSelectSession={() => { }} />
            <main className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-3xl font-bold mb-8">User Profile</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Identity Card */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-full">
                                <User size={24} />
                            </div>
                            <div>
                                <h2 className="tex-lg font-semibold">Identity</h2>
                                <p className="text-gray-400 text-sm">Account Details</p>
                            </div>
                        </div>
                        <div className="text-2xl font-bold">{profile.username}</div>
                        <div className="text-gray-500 text-sm mt-1">ID: {profile.id || 'N/A'}</div>
                    </div>

                    {/* Usage Card */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-green-600/20 text-green-400 rounded-full">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h2 className="tex-lg font-semibold">Usage</h2>
                                <p className="text-gray-400 text-sm">Total Interactions</p>
                            </div>
                        </div>
                        <div className="text-2xl font-bold">{profile.request_count}</div>
                        <div className="text-gray-500 text-sm mt-1">Messages Sent</div>
                    </div>

                    {/* Plan Card */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-purple-600/20 text-purple-400 rounded-full">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h2 className="tex-lg font-semibold">Current Plan</h2>
                                <p className="text-gray-400 text-sm">Subscription Tier</p>
                            </div>
                        </div>
                        <div className="text-2xl font-bold">{profile.tier}</div>
                        <div className={`text-sm mt-1 inline-block px-2 py-0.5 rounded-full ${profile.is_premium ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' : 'bg-gray-700 text-gray-300'}`}>
                            {profile.is_premium ? 'Premium Status' : 'Standard Access'}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
