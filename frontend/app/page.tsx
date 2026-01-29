"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';

import { Suspense } from 'react';

function HomeContent() {
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        } else {
            const sessionParam = searchParams.get('session');
            if (sessionParam) {
                setCurrentSessionId(parseInt(sessionParam));
            } else {
                setCurrentSessionId(null);
            }
        }
    }, [searchParams]);

    if (!mounted) return null;

    return (
        <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
            <Sidebar
                currentSessionId={currentSessionId}
                onSelectSession={setCurrentSessionId}
            />
            <main className="flex-1 h-full relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900/0 to-gray-900/0 pointer-events-none" />
                <Chat
                    sessionId={currentSessionId}
                    onSessionCreated={(id) => setCurrentSessionId(id)}
                />
            </main>
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
            <HomeContent />
        </Suspense>
    );
}
