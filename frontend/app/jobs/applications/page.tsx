"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building2, MapPin, Clock, CheckCircle, XCircle, Clock3, Star, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import Sidebar from '@/components/Sidebar';

interface Application {
    id: number;
    job_id: number;
    status: string;
    match_score?: number;
    match_reasons?: string[];
    applied_at: string;
    job: {
        id: number;
        title: string;
        location: string;
        is_remote: boolean;
        employment_type: string;
        company?: {
            id: number;
            name: string;
            logo_url?: string;
        };
    };
}

export default function MyApplications() {
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const res = await api.get('/applications/my');
            setApplications(res.data);
        } catch (err) {
            console.error('Failed to fetch applications', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock3 className="w-5 h-5 text-yellow-400" />;
            case 'reviewing':
                return <Clock className="w-5 h-5 text-blue-400" />;
            case 'shortlisted':
                return <Star className="w-5 h-5 text-purple-400" />;
            case 'hired':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'rejected':
                return <XCircle className="w-5 h-5 text-red-400" />;
            default:
                return <Clock3 className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'reviewing':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'shortlisted':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'hired':
                return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'rejected':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            default:
                return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending':
                return 'Pending';
            case 'reviewing':
                return 'Under Review';
            case 'shortlisted':
                return 'Shortlisted';
            case 'hired':
                return 'Hired';
            case 'rejected':
                return 'Not Selected';
            case 'withdrawn':
                return 'Withdrawn';
            default:
                return status;
        }
    };

    const filteredApplications = applications.filter(app => {
        if (filter === 'all') return true;
        if (filter === 'active') return ['pending', 'reviewing', 'shortlisted'].includes(app.status);
        if (filter === 'closed') return ['hired', 'rejected', 'withdrawn'].includes(app.status);
        return app.status === filter;
    });

    const stats = {
        total: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        reviewing: applications.filter(a => a.status === 'reviewing').length,
        shortlisted: applications.filter(a => a.status === 'shortlisted').length,
    };

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
            <Sidebar currentSessionId={null} onSelectSession={() => {}} selectedModel="gpt-4o-mini" />
            
            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="border-b border-white/10 bg-[#0f0f0f] px-8 py-6">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => router.push('/jobs')}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-bold">My Applications</h1>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex gap-4">
                        <div className="px-4 py-2 bg-white/5 rounded-lg">
                            <span className="text-2xl font-bold">{stats.total}</span>
                            <span className="text-gray-400 ml-2">Total</span>
                        </div>
                        <div className="px-4 py-2 bg-yellow-500/10 rounded-lg">
                            <span className="text-2xl font-bold text-yellow-400">{stats.pending}</span>
                            <span className="text-gray-400 ml-2">Pending</span>
                        </div>
                        <div className="px-4 py-2 bg-blue-500/10 rounded-lg">
                            <span className="text-2xl font-bold text-blue-400">{stats.reviewing}</span>
                            <span className="text-gray-400 ml-2">Reviewing</span>
                        </div>
                        <div className="px-4 py-2 bg-purple-500/10 rounded-lg">
                            <span className="text-2xl font-bold text-purple-400">{stats.shortlisted}</span>
                            <span className="text-gray-400 ml-2">Shortlisted</span>
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {/* Filters */}
                    <div className="flex gap-2 mb-6">
                        {[
                            { id: 'all', label: 'All Applications' },
                            { id: 'active', label: 'Active' },
                            { id: 'pending', label: 'Pending' },
                            { id: 'shortlisted', label: 'Shortlisted' },
                            { id: 'closed', label: 'Closed' },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                                    filter === f.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Applications List */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                        </div>
                    ) : filteredApplications.length === 0 ? (
                        <div className="text-center py-16">
                            <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                            <h3 className="text-xl font-semibold mb-2">No applications yet</h3>
                            <p className="text-gray-500 mb-6">Start applying to jobs to see them here</p>
                            <button
                                onClick={() => router.push('/jobs')}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors"
                            >
                                Browse Jobs
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredApplications.map(app => (
                                <div
                                    key={app.id}
                                    className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-xl font-bold">
                                                {app.job.company?.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold mb-1">{app.job.title}</h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="w-4 h-4" />
                                                        {app.job.company?.name}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-4 h-4" />
                                                        {app.job.is_remote ? 'Remote' : app.job.location}
                                                    </span>
                                                    <span>{app.job.employment_type}</span>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    Applied {new Date(app.applied_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-3">
                                            <span className={`px-3 py-1.5 rounded-full text-sm border ${getStatusColor(app.status)}`}>
                                                {getStatusLabel(app.status)}
                                            </span>
                                            
                                            {app.match_score && (
                                                <div className="flex items-center gap-2">
                                                    <Star className="w-4 h-4 text-yellow-400" />
                                                    <span className="text-sm">
                                                        {app.match_score}% match
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {app.match_reasons && app.match_reasons.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <p className="text-sm text-gray-400 mb-2">Why you match:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {app.match_reasons.map((reason, i) => (
                                                    <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                                                        {reason}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
