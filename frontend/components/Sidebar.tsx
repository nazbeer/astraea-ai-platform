"use client";

import { useEffect, useState } from 'react';
import { MessageSquare, Plus, LogOut, Trash2 } from 'lucide-react';
import api from '../app/utils/api';
import { useRouter } from 'next/navigation';

interface SidebarProps {
    currentSessionId: number | null;
    onSelectSession: (id: number | null) => void;
}

export default function Sidebar({ currentSessionId, onSelectSession }: SidebarProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        fetchHistory();
    }, [currentSessionId]); // Refresh when session changes (e.g. after creating new one)

    const fetchHistory = async () => {
        try {
            const res = await api.get('/history');
            setSessions(res.data);
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    return (
        <div className="w-64 bg-gray-900 text-white h-screen flex flex-col border-r border-gray-800">
            <div className="p-4">
                <button
                    onClick={() => onSelectSession(null)}
                    className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md transition-all"
                >
                    <Plus size={20} />
                    <span>New Chat</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">History</h3>
                {sessions.map((s) => (
                    <div
                        key={s.id}
                        onClick={() => onSelectSession(s.id)}
                        className={`p-3 rounded-md cursor-pointer flex items-center gap-3 mb-1 transition-colors ${currentSessionId === s.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50'
                            }`}
                    >
                        <MessageSquare size={16} />
                        <span className="truncate text-sm">{s.title}</span>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-gray-800">
                <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <LogOut size={18} />
                    <span>Log out</span>
                </button>
            </div>
        </div>
    );
}
