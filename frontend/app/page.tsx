"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import LandingPage from './login/page';
import { Suspense } from 'react';

function HomeContent() {
    const [currentSessionId] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        setMounted(true);
        const token = localStorage.getItem('token');
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

    if (!mounted) return null;

    // Show landing page if not authenticated
    if (!isAuthenticated) {
        return <LandingPage />;
    }

    // Show chat interface if authenticated
    return (
        <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
            <Sidebar
                currentSessionId={currentSessionId}
                onSelectSession={(id) => id ? router.push(`/a/${id}`) : router.push('/')}
                selectedModel={selectedModel}
            />
            <main className="flex-1 h-full relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900/0 to-gray-900/0 pointer-events-none" />
                <Chat
                    sessionId={currentSessionId}
                    onSessionCreated={(id) => router.push(`/a/${id}`)}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
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
