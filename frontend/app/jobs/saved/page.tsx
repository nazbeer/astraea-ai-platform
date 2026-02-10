"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Building2, MapPin, Briefcase, DollarSign, Trash2, ArrowLeft } from 'lucide-react';
import api from '../../utils/api';
import Sidebar from '@/components/Sidebar';

interface SavedJob {
    id: number;
    job_id: number;
    created_at: string;
    job: {
        id: number;
        title: string;
        location: string;
        is_remote: boolean;
        is_hybrid: boolean;
        employment_type: string;
        experience_level: string;
        salary_min?: number;
        salary_max?: number;
        salary_currency: string;
        required_skills: string[];
        company?: {
            id: number;
            name: string;
            logo_url?: string;
        };
    };
}

export default function SavedJobs() {
    const router = useRouter();
    const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSavedJobs();
    }, []);

    const fetchSavedJobs = async () => {
        try {
            const res = await api.get('/jobs/saved/list');
            setSavedJobs(res.data);
        } catch (err) {
            console.error('Failed to fetch saved jobs', err);
        } finally {
            setLoading(false);
        }
    };

    const unsaveJob = async (jobId: number) => {
        try {
            await api.delete(`/jobs/${jobId}/save`);
            setSavedJobs(prev => prev.filter(sj => sj.job_id !== jobId));
        } catch (err) {
            console.error('Failed to unsave job', err);
        }
    };

    const formatSalary = (min?: number, max?: number, currency: string = 'USD') => {
        if (!min && !max) return 'Salary not specified';
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0,
        });
        if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
        if (min) return `From ${formatter.format(min)}`;
        if (max) return `Up to ${formatter.format(max)}`;
        return '';
    };

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
            <Sidebar currentSessionId={null} onSelectSession={() => {}} selectedModel="gpt-4o-mini" />
            
            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="border-b border-white/10 bg-[#0f0f0f] px-8 py-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/jobs')}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">Saved Jobs</h1>
                            <p className="text-gray-400">{savedJobs.length} jobs saved</p>
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                        </div>
                    ) : savedJobs.length === 0 ? (
                        <div className="text-center py-16">
                            <Bookmark className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                            <h3 className="text-xl font-semibold mb-2">No saved jobs</h3>
                            <p className="text-gray-500 mb-6">Jobs you save will appear here</p>
                            <button
                                onClick={() => router.push('/jobs')}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors"
                            >
                                Browse Jobs
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4 max-w-4xl">
                            {savedJobs.map(saved => (
                                <div
                                    key={saved.id}
                                    className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-xl font-bold">
                                                {saved.job.company?.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold mb-1">{saved.job.title}</h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="w-4 h-4" />
                                                        {saved.job.company?.name}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-4 h-4" />
                                                        {saved.job.is_remote ? 'Remote' : saved.job.location}
                                                        {saved.job.is_hybrid && ' (Hybrid)'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Briefcase className="w-4 h-4" />
                                                        {saved.job.employment_type}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                                                    <DollarSign className="w-4 h-4" />
                                                    {formatSalary(saved.job.salary_min, saved.job.salary_max, saved.job.salary_currency)}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {saved.job.required_skills?.slice(0, 4).map((skill, i) => (
                                                        <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-3">
                                            <button
                                                onClick={() => unsaveJob(saved.job_id)}
                                                className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                                                title="Remove from saved"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => router.push(`/jobs/${saved.job_id}`)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                                            >
                                                View Job
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <p className="text-xs text-gray-500 mt-4">
                                        Saved on {new Date(saved.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
