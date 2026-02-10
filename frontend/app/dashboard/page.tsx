"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Briefcase, 
    Bookmark, 
    FileText, 
    Star,
    Clock,
    CheckCircle,
    XCircle,
    ArrowRight,
    Building2,
    MapPin,
    Sparkles,
    TrendingUp,
    Plus,
    Eye
} from 'lucide-react';
import api from '../utils/api';
import Sidebar from '@/components/Sidebar';

interface Application {
    id: number;
    job_id: number;
    status: string;
    match_score?: number;
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

interface SavedJob {
    id: number;
    job_id: number;
    created_at: string;
    job: {
        id: number;
        title: string;
        location: string;
        is_remote: boolean;
        employment_type: string;
        salary_min?: number;
        salary_max?: number;
        company?: {
            id: number;
            name: string;
            logo_url?: string;
        };
    };
}

interface RecommendedJob {
    id: number;
    title: string;
    location: string;
    is_remote: boolean;
    employment_type: string;
    match_score: number;
    matching_skills: string[];
    company?: {
        id: number;
        name: string;
        logo_url?: string;
    };
}

interface ResumeData {
    full_name: string;
    email: string;
    phone?: string;
    location?: string;
    summary?: string;
    skills: string[];
    work_experience: any[];
    education: any[];
    ats_score: number;
    is_public: boolean;
    updated_at: string;
}

export default function CandidateDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState<Application[]>([]);
    const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
    const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
    const [resume, setResume] = useState<ResumeData | null>(null);

    useEffect(() => {
        checkUserType();
        fetchDashboardData();
    }, []);

    const checkUserType = async () => {
        try {
            const res = await api.get('/profile');
            // Redirect organizations to their dashboard
            if (res.data.user_type === 'organization') {
                router.push('/organization/dashboard');
                return;
            }
        } catch (err) {
            console.error('Failed to check user type', err);
        }
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch main data
            const [appsRes, savedRes, recRes] = await Promise.all([
                api.get('/applications/my'),
                api.get('/jobs/saved/list'),
                api.get('/jobs/recommended'),
            ]);
            setApplications(appsRes.data);
            setSavedJobs(savedRes.data);
            setRecommendedJobs(recRes.data.jobs || []);
            
            // Fetch resume separately to handle 404 gracefully
            try {
                const resumeRes = await api.get('/resume');
                setResume(resumeRes.data);
            } catch (resumeErr: any) {
                // 404 means no resume exists yet - this is ok
                if (resumeErr.response?.status === 404) {
                    setResume(null);
                } else {
                    console.error('Failed to fetch resume', resumeErr);
                }
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'reviewing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'shortlisted': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'hired': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Pending';
            case 'reviewing': return 'Under Review';
            case 'shortlisted': return 'Shortlisted';
            case 'hired': return 'Hired';
            case 'rejected': return 'Not Selected';
            default: return status;
        }
    };

    const calculateResumeCompleteness = () => {
        if (!resume) return 0;
        
        const fields = [
            resume.full_name,
            resume.email,
            resume.phone,
            resume.location,
            resume.summary,
            resume.skills?.length > 0,
            resume.work_experience?.length > 0,
            resume.education?.length > 0,
        ];
        
        const completed = fields.filter(Boolean).length;
        return Math.round((completed / fields.length) * 100);
    };

    const stats = {
        totalApplications: applications.length,
        activeApplications: applications.filter(a => ['pending', 'reviewing', 'shortlisted'].includes(a.status)).length,
        savedJobs: savedJobs.length,
        resumeCompleteness: calculateResumeCompleteness(),
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#0a0a0a] items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
            <Sidebar currentSessionId={null} onSelectSession={() => {}} selectedModel="gpt-4o-mini" />
            
            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="border-b border-white/10 bg-[#0f0f0f] px-8 py-6">
                    <h1 className="text-2xl font-bold">Candidate Dashboard</h1>
                    <p className="text-gray-400 mt-1">Track your job search and manage your applications</p>
                </header>

                <div className="p-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                    <Briefcase className="w-5 h-5 text-blue-400" />
                                </div>
                                <span className="text-2xl font-bold">{stats.totalApplications}</span>
                            </div>
                            <p className="text-sm text-gray-400">Total Applications</p>
                        </div>
                        
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-yellow-400" />
                                </div>
                                <span className="text-2xl font-bold">{stats.activeApplications}</span>
                            </div>
                            <p className="text-sm text-gray-400">Active Applications</p>
                        </div>
                        
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                    <Bookmark className="w-5 h-5 text-purple-400" />
                                </div>
                                <span className="text-2xl font-bold">{stats.savedJobs}</span>
                            </div>
                            <p className="text-sm text-gray-400">Saved Jobs</p>
                        </div>
                        
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-green-400" />
                                </div>
                                <span className="text-2xl font-bold">{stats.resumeCompleteness}%</span>
                            </div>
                            <p className="text-sm text-gray-400">Resume Complete</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        {/* Left Column - Applications & Recommendations */}
                        <div className="col-span-2 space-y-6">
                            {/* Recent Applications */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 text-blue-400" />
                                        Recent Applications
                                    </h2>
                                    <button 
                                        onClick={() => router.push('/jobs/applications')}
                                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        View All <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <div className="space-y-3">
                                    {applications.slice(0, 5).map(app => (
                                        <div 
                                            key={app.id} 
                                            className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/jobs/${app.job_id}`)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center text-lg font-bold">
                                                    {app.job.company?.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium">{app.job.title}</h3>
                                                    <p className="text-sm text-gray-400 flex items-center gap-2">
                                                        <Building2 className="w-3 h-3" />
                                                        {app.job.company?.name}
                                                        <span className="text-gray-600">•</span>
                                                        <MapPin className="w-3 h-3" />
                                                        {app.job.is_remote ? 'Remote' : app.job.location}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {app.match_score && (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Star className="w-4 h-4 text-yellow-400" />
                                                        <span>{app.match_score}% match</span>
                                                    </div>
                                                )}
                                                <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(app.status)}`}>
                                                    {getStatusLabel(app.status)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {applications.length === 0 && (
                                        <div className="text-center py-8 bg-white/5 rounded-lg border border-dashed border-white/10">
                                            <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                            <p className="text-gray-500 mb-3">No applications yet</p>
                                            <button 
                                                onClick={() => router.push('/jobs')}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                                            >
                                                Browse Jobs
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Job Recommendations */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-yellow-400" />
                                        Recommended for You
                                    </h2>
                                    <button 
                                        onClick={() => router.push('/jobs')}
                                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        View All <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    {recommendedJobs.slice(0, 4).map(job => (
                                        <div 
                                            key={job.id}
                                            className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/jobs/${job.id}`)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-medium line-clamp-1">{job.title}</h3>
                                                <span className="text-xs text-blue-400">{job.match_score}%</span>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-2">{job.company?.name}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {job.matching_skills?.slice(0, 3).map((skill, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {recommendedJobs.length === 0 && (
                                        <div className="col-span-2 text-center py-8 bg-white/5 rounded-lg border border-dashed border-white/10">
                                            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                            <p className="text-gray-500">Complete your resume to get personalized recommendations</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Resume & Saved Jobs */}
                        <div className="space-y-6">
                            {/* Resume Status Card */}
                            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-xl p-6">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Your Resume
                                </h2>
                                
                                {resume ? (
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-gray-400">Completeness</span>
                                                <span>{stats.resumeCompleteness}%</span>
                                            </div>
                                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-500 rounded-full transition-all"
                                                    style={{ width: `${stats.resumeCompleteness}%` }}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between py-2 border-t border-white/10">
                                            <span className="text-sm text-gray-400">ATS Score</span>
                                            <span className={`font-semibold ${
                                                resume.ats_score >= 70 ? 'text-green-400' :
                                                resume.ats_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                                {resume.ats_score}/100
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center justify-between py-2 border-t border-white/10">
                                            <span className="text-sm text-gray-400">Visibility</span>
                                            <span className={`text-sm ${resume.is_public ? 'text-green-400' : 'text-gray-400'}`}>
                                                {resume.is_public ? 'Public' : 'Private'}
                                            </span>
                                        </div>
                                        
                                        <div className="pt-2 space-y-2">
                                            <button 
                                                onClick={() => router.push('/resume/builder')}
                                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Edit Resume
                                            </button>
                                            <button 
                                                onClick={() => router.push('/resume/builder')}
                                                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
                                            >
                                                Check ATS Score
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-gray-400 mb-4">No resume found</p>
                                        <button 
                                            onClick={() => router.push('/resume/builder')}
                                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Create Resume
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Saved Jobs */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Bookmark className="w-5 h-5 text-purple-400" />
                                        Saved Jobs
                                    </h2>
                                    <button 
                                        onClick={() => router.push('/jobs/saved')}
                                        className="text-sm text-blue-400 hover:text-blue-300"
                                    >
                                        View All
                                    </button>
                                </div>
                                
                                <div className="space-y-3">
                                    {savedJobs.slice(0, 4).map(saved => (
                                        <div 
                                            key={saved.id}
                                            className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/jobs/${saved.job_id}`)}
                                        >
                                            <h3 className="font-medium text-sm line-clamp-1">{saved.job.title}</h3>
                                            <p className="text-xs text-gray-400">{saved.job.company?.name}</p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                <MapPin className="w-3 h-3" />
                                                {saved.job.is_remote ? 'Remote' : saved.job.location}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {savedJobs.length === 0 && (
                                        <div className="text-center py-6">
                                            <Bookmark className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                                            <p className="text-gray-500 text-sm">No saved jobs yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                                <div className="space-y-2">
                                    <button 
                                        onClick={() => router.push('/jobs')}
                                        className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-left flex items-center gap-3 transition-colors"
                                    >
                                        <Briefcase className="w-4 h-4 text-blue-400" />
                                        Browse Jobs
                                    </button>
                                    <button 
                                        onClick={() => router.push('/resume/builder')}
                                        className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-left flex items-center gap-3 transition-colors"
                                    >
                                        <FileText className="w-4 h-4 text-green-400" />
                                        Update Resume
                                    </button>
                                    <button 
                                        onClick={() => router.push('/jobs/applications')}
                                        className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-left flex items-center gap-3 transition-colors"
                                    >
                                        <Eye className="w-4 h-4 text-purple-400" />
                                        View Applications
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
