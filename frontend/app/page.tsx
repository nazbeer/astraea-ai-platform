"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import LandingPage from './login/page';
import { Suspense } from 'react';
import api from './utils/api';

function HomeContent() {
    const [currentSessionId] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
        checkAuthAndProfile();
    }, []);

    const checkAuthAndProfile = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
        }

        try {
            // Get user profile
            const profileRes = await api.get('/profile');
            const userType = profileRes.data.user_type;
            
            setIsAuthenticated(true);
            
            // If user type is not set, redirect to onboarding
            if (!userType) {
                router.push('/organization/onboarding');
                return;
            }
            
            // If organization, check if they have a company profile
            if (userType === 'organization') {
                try {
                    const companyRes = await api.get('/companies/my');
                    if (!companyRes.data) {
                        // Organization without company profile
                        router.push('/organization/onboarding');
                        return;
                    }
                } catch (err) {
                    // No company found, redirect to onboarding
                    router.push('/organization/onboarding');
                    return;
                }
            }
            
            setIsLoading(false);
        } catch (err) {
            // Token might be invalid
            localStorage.removeItem('token');
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    };

    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

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
