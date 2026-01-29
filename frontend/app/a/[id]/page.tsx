"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Chat from '@/components/Chat';

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.id as string;
    const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        }
    }, []);

    if (!mounted) return null;

    return (
        <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
            <Sidebar
                currentSessionId={sessionId}
                onSelectSession={(id) => id ? router.push(`/a/${id}`) : router.push('/')}
                selectedModel={selectedModel}
            />
            <main className="flex-1 h-full relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900/0 to-gray-900/0 pointer-events-none" />
                <Chat
                    sessionId={sessionId}
                    onSessionCreated={(id) => router.push(`/a/${id}`)}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                />
            </main>
        </div>
    );
}
