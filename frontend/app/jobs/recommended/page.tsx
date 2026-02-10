"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Sparkles, 
    ArrowLeft, 
    Building2, 
    MapPin, 
    DollarSign, 
    Briefcase,
    Bookmark,
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    Loader2,
    FileText
} from 'lucide-react';
import api from '../../utils/api';
import Sidebar from '@/components/Sidebar';

interface Job {
    id: number | string;
    title: string;
    description?: string;
    company?: {
        name: string;
        logo_url?: string;
    };
    location: string;
    is_remote: boolean;
    employment_type: string;
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
    required_skills: string[];
    match_score?: number;
    match_reasons?: string[];
    source?: string;
    application_url?: string;
    external_id?: string;
}

export default function RecommendedJobs() {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [savedJobs, setSavedJobs] = useState<Set<number | string>>(new Set());
    const [userSkills, setUserSkills] = useState<string[]>([]);
    const [hasResume, setHasResume] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');

    useEffect(() => {
        checkUserType();
        fetchRecommendedJobs();
        fetchSavedJobs();
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

    const fetchRecommendedJobs = async () => {
        try {
            setLoading(true);
            
            // First try to get user's resume
            let resumeExists = false;
            try {
                const resumeRes = await api.get('/resume');
                if (resumeRes.data) {
                    resumeExists = true;
                    setHasResume(true);
                    if (resumeRes.data.skills) {
                        setUserSkills(resumeRes.data.skills);
                    }
                }
            } catch (err) {
                setHasResume(false);
            }
            
            let allJobs: Job[] = [];
            
            // Try 1: Fetch AI recommended jobs
            try {
                const res = await api.get('/jobs/recommended');
                const recommendedJobs = res.data?.jobs || [];
                allJobs = [...recommendedJobs];
            } catch (err) {
                console.log('Recommended jobs fetch failed, trying fallback...');
            }
            
            // Try 2: If no recommended jobs, fetch regular jobs
            if (allJobs.length === 0) {
                try {
                    const allJobsRes = await api.get('/jobs?limit=20');
                    // Backend returns { jobs: [...], total: ..., page: ..., ... }
                    const regularJobs = allJobsRes.data?.jobs || [];
                    allJobs = regularJobs.map((job: Job, index: number) => ({
                        ...job,
                        match_score: Math.max(60, 95 - (index * 5)),
                        match_reasons: ['Available now', 'Popular choice', 'Great opportunity']
                    }));
                } catch (err) {
                    console.log('Regular jobs fetch failed, trying external jobs...');
                }
            }
            
            // Try 3: If still no jobs, fetch with search query
            if (allJobs.length === 0) {
                try {
                    const searchQuery = userSkills.slice(0, 3).join(' ') || 'software engineer';
                    const externalRes = await api.get(`/jobs?query=${encodeURIComponent(searchQuery)}&limit=10`);
                    const externalJobs = externalRes.data?.jobs || [];
                    allJobs = externalJobs.map((job: Job) => ({
                        ...job,
                        source: job.source || 'external',
                        match_score: 75,
                        match_reasons: ['External job listing', 'Matching your search']
                    }));
                } catch (err) {
                    console.log('External jobs fetch also failed');
                }
            }
            
            // Debug logging
            console.log('Total jobs fetched:', allJobs.length);
            console.log('Has resume:', hasResume);
            console.log('User skills:', userSkills);
            
            setJobs(allJobs);
        } catch (err) {
            console.error('Failed to fetch recommended jobs', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSavedJobs = async () => {
        try {
            const res = await api.get('/jobs/saved');
            setSavedJobs(new Set(res.data?.map((j: Job) => j.id) || []));
        } catch (err) {
            console.error('Failed to fetch saved jobs', err);
        }
    };

    const toggleSaveJob = async (jobId: number | string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            if (savedJobs.has(jobId)) {
                await api.delete(`/jobs/${jobId}/save`);
                setSavedJobs(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(jobId);
                    return newSet;
                });
            } else {
                await api.post(`/jobs/${jobId}/save`);
                setSavedJobs(prev => new Set(prev).add(jobId));
            }
        } catch (err) {
            console.error('Failed to toggle save job', err);
        }
    };

    const getMatchScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400 bg-green-500/10 border-green-500/20';
        if (score >= 60) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        if (score >= 40) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex">
                <Sidebar 
                    currentSessionId={currentSessionId}
                    onSelectSession={setCurrentSessionId}
                    selectedModel={selectedModel}
                />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        <span className="text-gray-400">Finding best matches...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex">
            <Sidebar 
                currentSessionId={currentSessionId}
                onSelectSession={setCurrentSessionId}
                selectedModel={selectedModel}
            />
            
            <div className="flex-1 overflow-auto">
                {/* Header */}
                <header className="border-b border-white/10 bg-[#0f0f0f]">
                    <div className="max-w-6xl mx-auto px-4 py-6">
                        <div className="flex items-center gap-4 mb-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-amber-400" />
                                    AI Recommended Jobs
                                </h1>
                                <p className="text-gray-400 text-sm mt-1">
                                    Personalized job matches based on your skills and preferences
                                </p>
                            </div>
                        </div>
                        
                        {/* User Skills Tags */}
                        {userSkills.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-500">Your skills:</span>
                                {userSkills.slice(0, 5).map((skill, idx) => (
                                    <span 
                                        key={idx}
                                        className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs"
                                    >
                                        {skill}
                                    </span>
                                ))}
                                {userSkills.length > 5 && (
                                    <span className="text-xs text-gray-500">+{userSkills.length - 5} more</span>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-4 py-8" style={{maxHeight: 'calc(100vh - 150px)', overflowY: 'auto'}}>
                    {!hasResume ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FileText className="w-10 h-10 text-amber-400" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">No resume found</h2>
                            <p className="text-gray-400 max-w-md mx-auto mb-6">
                                Create your resume and we&apos;ll use AI to match you with the best job opportunities.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => router.push('/resume/builder')}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors font-medium"
                                >
                                    Create Resume
                                </button>
                                <button
                                    onClick={() => router.push('/jobs')}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    Browse All Jobs
                                </button>
                            </div>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Briefcase className="w-10 h-10 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">No job matches yet</h2>
                            <p className="text-gray-400 max-w-md mx-auto mb-6">
                                We couldn&apos;t find any jobs matching your profile right now. Check back later or browse all available jobs.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => router.push('/jobs')}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors font-medium"
                                >
                                    Browse All Jobs
                                </button>
                                <button
                                    onClick={() => router.push('/resume/builder')}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    Update Resume
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 ">
                            {jobs.map((job) => (
                                <div
                                    key={job.id}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            {/* Company Logo */}
                                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-xl font-bold shrink-0">
                                                {job.company?.name?.charAt(0) || '?'}
                                            </div>
                                            
                                            {/* Job Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h3 className="text-lg font-semibold mb-1">{job.title}</h3>
                                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                                                            <span className="flex items-center gap-1">
                                                                <Building2 className="w-4 h-4" />
                                                                {job.company?.name || 'Unknown Company'}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-4 h-4" />
                                                                {job.is_remote ? 'Remote' : job.location}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Briefcase className="w-4 h-4" />
                                                                {job.employment_type}
                                                            </span>
                                                            {(job.salary_min || job.salary_max) && (
                                                                <span className="flex items-center gap-1">
                                                                    <DollarSign className="w-4 h-4" />
                                                                    {job.salary_min && `$${job.salary_min.toLocaleString()}`}
                                                                    {job.salary_min && job.salary_max && ' - '}
                                                                    {job.salary_max && `$${job.salary_max.toLocaleString()}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Match Score */}
                                                    {job.match_score && (
                                                        <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium shrink-0 ${getMatchScoreColor(job.match_score)}`}>
                                                            {job.match_score}% Match
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Match Reasons */}
                                                {job.match_reasons && job.match_reasons.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {job.match_reasons.map((reason, idx) => (
                                                            <span 
                                                                key={idx}
                                                                className="flex items-center gap-1 text-xs text-green-400"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                {reason}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {/* Required Skills */}
                                                {job.required_skills && job.required_skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                        {job.required_skills.slice(0, 5).map((skill, idx) => (
                                                            <span 
                                                                key={idx}
                                                                className="px-2 py-1 bg-white/5 text-gray-400 rounded text-xs"
                                                            >
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {job.required_skills.length > 5 && (
                                                            <span className="text-xs text-gray-500">
                                                                +{job.required_skills.length - 5} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={(e) => toggleSaveJob(job.id, e)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    savedJobs.has(job.id) 
                                                        ? 'bg-blue-500/20 text-blue-400' 
                                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                }`}
                                            >
                                                <Bookmark className={`w-5 h-5 ${savedJobs.has(job.id) ? 'fill-current' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // For external jobs with application_url, open directly
                                                    if (job.application_url || job.source === 'external' || String(job.id).includes('_')) {
                                                        const url = job.application_url || `https://www.google.com/search?q=${encodeURIComponent(job.title)}+${encodeURIComponent(job.company?.name || '')}+jobs`;
                                                        window.open(url, '_blank');
                                                    } else {
                                                        // For internal jobs, navigate to detail page
                                                        router.push(`/jobs/${job.id}`);
                                                    }
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
                                            >
                                                {job.application_url || job.source === 'external' || String(job.id).includes('_') ? 'Apply Now' : 'View Job'}
                                                    <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
