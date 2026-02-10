"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Briefcase, 
    FileText, 
    Bookmark, 
    TrendingUp, 
    Clock, 
    CheckCircle2, 
    AlertCircle,
    ArrowRight,
    Sparkles,
    Building2,
    MapPin,
    DollarSign
} from 'lucide-react';
import api from '../../utils/api';
import Sidebar from '../../../components/Sidebar';

interface Stats {
    totalApplications: number;
    savedJobs: number;
    resumeScore: number;
    profileViews: number;
}

interface RecentApplication {
    id: number;
    job_title: string;
    company_name: string;
    status: string;
    applied_at: string;
}

interface RecommendedJob {
    id: number | string;
    title: string;
    company?: {
        name: string;
        logo_url?: string;
    };
    location: string;
    salary_min?: number;
    salary_max?: number;
    match_score?: number;
}

export default function JobsDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats>({
        totalApplications: 0,
        savedJobs: 0,
        resumeScore: 0,
        profileViews: 0
    });
    const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
    const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');

    useEffect(() => {
        checkUserType();
        fetchDashboardData();
    }, []);

    const checkUserType = async () => {
        try {
            const res = await api.get('/profile');
            if (res.data.user_type === 'organization') {
                router.push('/organization/dashboard');
            }
        } catch (err) {
            console.error('Failed to check user type', err);
        }
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            // Fetch applications - use /applications/my endpoint
            let applications = [];
            try {
                const appsRes = await api.get('/applications/my');
                applications = appsRes.data || [];
            } catch (err) {
                console.log('No applications yet');
            }
            
            // Fetch saved jobs
            let savedJobs = [];
            try {
                const savedRes = await api.get('/jobs/saved');
                savedJobs = savedRes.data || [];
            } catch (err) {
                console.log('No saved jobs yet');
            }
            
            // Fetch ATS score from dedicated endpoint
            let resumeScore = 0;
            try {
                const atsRes = await api.get('/resume/ats-score');
                resumeScore = atsRes.data?.score || 0;
            } catch (err) {
                console.log('No ATS score available');
            }
            
            // Fetch recommended jobs
            let recommended = [];
            try {
                const recRes = await api.get('/jobs/recommended');
                recommended = recRes.data?.jobs || recRes.data || [];
            } catch (err) {
                console.log('No recommendations available');
            }
            
            setStats({
                totalApplications: applications.length,
                savedJobs: savedJobs.length,
                resumeScore,
                profileViews: Math.floor(Math.random() * 50) + 10 // Placeholder
            });
            
            setRecentApplications(applications.slice(0, 3));
            setRecommendedJobs(recommended.slice(0, 3));
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return <Clock className="w-4 h-4 text-yellow-400" />;
            case 'reviewed':
            case 'shortlisted':
                return <CheckCircle2 className="w-4 h-4 text-green-400" />;
            case 'rejected':
                return <AlertCircle className="w-4 h-4 text-red-400" />;
            default:
                return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'reviewed':
            case 'shortlisted':
                return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'rejected':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            default:
                return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#0a0a0a]">
                <Sidebar 
                    currentSessionId={currentSessionId}
                    onSelectSession={setCurrentSessionId}
                    selectedModel={selectedModel}
                />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#0a0a0a]">
            <Sidebar 
                currentSessionId={currentSessionId}
                onSelectSession={setCurrentSessionId}
                selectedModel={selectedModel}
            />
            
            <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="border-b border-white/10 bg-[#0f0f0f]">
                    <div className="max-w-6xl mx-auto px-4 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">Jobs Dashboard</h1>
                                <p className="text-gray-400 text-sm mt-1">Track your job search progress</p>
                            </div>
                            <button
                                onClick={() => router.push('/jobs')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors text-sm font-medium"
                            >
                                <Briefcase className="w-4 h-4" />
                                Find Jobs
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-4 py-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                    <Briefcase className="w-5 h-5 text-blue-400" />
                                </div>
                                <span className="text-gray-400 text-sm">Applications</span>
                            </div>
                            <p className="text-2xl font-bold">{stats.totalApplications}</p>
                        </div>
                        
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                    <Bookmark className="w-5 h-5 text-purple-400" />
                                </div>
                                <span className="text-gray-400 text-sm">Saved Jobs</span>
                            </div>
                            <p className="text-2xl font-bold">{stats.savedJobs}</p>
                        </div>
                        
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-green-400" />
                                </div>
                                <span className="text-gray-400 text-sm">Resume Score</span>
                            </div>
                            <p className="text-2xl font-bold">{stats.resumeScore > 0 ? stats.resumeScore : 'N/A'}</p>
                        </div>
                        
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-orange-400" />
                                </div>
                                <span className="text-gray-400 text-sm">Profile Views</span>
                            </div>
                            <p className="text-2xl font-bold">{stats.profileViews}</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Recent Applications */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-400" />
                                    Recent Applications
                                </h2>
                                <button
                                    onClick={() => router.push('/jobs/applications')}
                                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    View All
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {recentApplications.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>No applications yet</p>
                                    <button
                                        onClick={() => router.push('/jobs')}
                                        className="mt-3 text-sm text-blue-400 hover:underline"
                                    >
                                        Start applying
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recentApplications.map((app) => (
                                        <div
                                            key={app.id}
                                            className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                            onClick={() => router.push('/jobs/applications')}
                                        >
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center text-lg font-bold">
                                                {app.company_name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{app.job_title}</p>
                                                <p className="text-sm text-gray-400">{app.company_name}</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusColor(app.status)}`}>
                                                {getStatusIcon(app.status)}
                                                {app.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recommended Jobs */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    Recommended For You
                                </h2>
                                <button
                                    onClick={() => router.push('/jobs/recommended')}
                                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    View All
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {recommendedJobs.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>No recommendations yet</p>
                                    <button
                                        onClick={() => router.push('/jobs')}
                                        className="mt-3 text-sm text-blue-400 hover:underline"
                                    >
                                        Browse all jobs
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {recommendedJobs.map((job) => (
                                        <div
                                            key={job.id}
                                            className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/jobs/${job.id}`)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center text-lg font-bold">
                                                        {job.company?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{job.title}</p>
                                                        <p className="text-sm text-gray-400 flex items-center gap-1">
                                                            <Building2 className="w-3 h-3" />
                                                            {job.company?.name}
                                                        </p>
                                                    </div>
                                                </div>
                                                {job.match_score && (
                                                    <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium">
                                                        {job.match_score}% match
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-400 mt-3">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {job.location}
                                                </span>
                                                {(job.salary_min || job.salary_max) && (
                                                    <span className="flex items-center gap-1">
                                                        <DollarSign className="w-3 h-3" />
                                                        {job.salary_min && `$${job.salary_min.toLocaleString()}`}
                                                        {job.salary_min && job.salary_max && ' - '}
                                                        {job.salary_max && `$${job.salary_max.toLocaleString()}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-8 grid md:grid-cols-3 gap-4">
                        <button
                            onClick={() => router.push('/resume/builder')}
                            className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl text-left hover:border-green-500/40 transition-all group"
                        >
                            <FileText className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                            <h3 className="font-semibold mb-1">Update Resume</h3>
                            <p className="text-sm text-gray-400">Improve your ATS score</p>
                        </button>
                        
                        <button
                            onClick={() => router.push('/jobs')}
                            className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl text-left hover:border-blue-500/40 transition-all group"
                        >
                            <Briefcase className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                            <h3 className="font-semibold mb-1">Search Jobs</h3>
                            <p className="text-sm text-gray-400">Find new opportunities</p>
                        </button>
                        
                        <button
                            onClick={() => router.push('/jobs/recommended')}
                            className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl text-left hover:border-amber-500/40 transition-all group"
                        >
                            <Sparkles className="w-8 h-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
                            <h3 className="font-semibold mb-1">AI Recommendations</h3>
                            <p className="text-sm text-gray-400">Jobs matched to your skills</p>
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
}
