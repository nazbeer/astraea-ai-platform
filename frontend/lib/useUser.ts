"use client";

import { useState, useEffect } from 'react';
import api from '../app/utils/api';

interface User {
    id: number;
    email: string;
    username: string;
    user_type: 'candidate' | 'organization' | null;
    tier: string;
    is_premium: boolean;
}

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }
            const res = await api.get('/profile');
            setUser(res.data);
        } catch (err) {
            console.error('Failed to fetch user', err);
        } finally {
            setLoading(false);
        }
    };

    const refreshUser = async () => {
        await fetchUser();
    };

    const isCandidate = user?.user_type === 'candidate';
    const isOrganization = user?.user_type === 'organization';
    const hasUserType = !!user?.user_type;

    return {
        user,
        loading,
        isCandidate,
        isOrganization,
        hasUserType,
        refreshUser,
    };
}
