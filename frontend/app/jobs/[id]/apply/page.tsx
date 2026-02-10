"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Building2, MapPin, Briefcase, Sparkles, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import api from '../../../utils/api';
import Sidebar from '@/components/Sidebar';

interface Job {
    id: number | string;
    external_id?: string;
    source?: string;
    title: string;
    company?: {
        name: string;
        logo_url?: string;
    };
    location: string;
    is_remote: boolean;
    employment_type: string;
    required_skills: string[];
    application_url?: string;
}

interface Resume {
    id: number;
    full_name: string;
    skills: string[];
    ats_score: number;
}

export default function ApplyPage() {
    const router = useRouter();
    const params = useParams();
    const jobId = params.id as string;
    
    const [job, setJob] = useState<Job | null>(null);
    const [resume, setResume] = useState<Resume | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [matchScore, setMatchScore] = useState<number | null>(null);
    const [isExternal, setIsExternal] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
    
    const [coverLetter, setCoverLetter] = useState('');
    const [useAI, setUseAI] = useState(false);

    useEffect(() => {
        checkUserType();
        fetchData();
    }, [jobId]);

    const checkUserType = async () => {
        try {
            const res = await api.get('/profile');
            if (res.data.user_type === 'organization') {
                router.push('/organization/dashboard');
                return;
            }
        } catch (err) {
            console.error('Failed to check user type', err);
        }
    };

    const fetchData = async () => {
        try {
            const jobRes = await api.get(`/jobs/${jobId}`);
            const jobData = jobRes.data;
            setJob(jobData);
            
            const external = jobData.source === 'external' || jobData.external_id || String(jobId).includes('_');
            setIsExternal(external);
            
            if (!external) {
                try {
                    const resumeRes = await api.get('/resume');
                    setResume(resumeRes.data);
                    
                    if (resumeRes.data && jobData && jobData.required_skills) {
                        const resumeSkills = new Set(resumeRes.data.skills?.map((s: string) => s.toLowerCase()) || []);
                        const jobSkills = jobData.required_skills.map((s: string) => s.toLowerCase());
                        const matching = jobSkills.filter((s: string) => 
                            Array.from(resumeSkills).some((rs: string) => rs.includes(s) || s.includes(rs))
                        );
                        setMatchScore(jobSkills.length > 0 ? Math.round((matching.length / jobSkills.length) * 100) : 0);
                    }
                } catch (resumeErr: any) {
                    if (resumeErr.response?.status === 404) {
                        setResume(null);
                    } else {
                        console.error('Failed to fetch resume', resumeErr);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch job data', err);
        } finally {
            setLoading(false);
        }
    };

    const generateAICoverLetter = async () => {
        setUseAI(true);
        const generatedLetter = `Dear Hiring Manager,

I am excited to apply for the ${job?.title} position at ${job?.company?.name}. With my background and skills in ${resume?.skills.slice(0, 3).join(', ')}, I believe I would be a valuable addition to your team.

Throughout my career, I have developed strong expertise that aligns with the requirements of this role. I am particularly drawn to this opportunity because of the innovative work being done at your company.

I would welcome the chance to discuss how my experience and skills can contribute to your team's success.

Thank you for considering my application.

Best regards,
${resume?.full_name}`;
        
        setCoverLetter(generatedLetter);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            await api.post('/applications', {
                job_id: parseInt(jobId),
                cover_letter: coverLetter,
            });
            setSubmitted(true);
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
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
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
            </div>
        );
    }

    // External Job View
    if (isExternal) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex">
                <Sidebar 
                    currentSessionId={currentSessionId}
                    onSelectSession={setCurrentSessionId}
                    selectedModel={selectedModel}
                />
                <div className="flex-1 overflow-auto">
                    <header className="border-b border-white/10 bg-[#0f0f0f]">
                        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="font-semibold">External Job</h1>
                        </div>
                    </header>

                    <main className="max-w-4xl mx-auto px-4 py-12">
                        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8 text-center">
                            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ExternalLink className="w-10 h-10 text-blue-400" />
                            </div>
                            <h1 className="text-2xl font-bold mb-4">External Job Posting</h1>
                            <p className="text-gray-400 mb-6 max-w-md mx-auto">
                                This job is hosted on an external platform. To apply, you&apos;ll be redirected to the external application page.
                            </p>
                            
                            <div className="bg-white/5 rounded-xl p-6 mb-8 max-w-lg mx-auto">
                                <h3 className="font-semibold mb-2">{job?.title}</h3>
                                <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-400">
                                    {job?.company?.name && (
                                        <span className="flex items-center gap-1">
                                            <Building2 className="w-4 h-4" />
                                            {job.company.name}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {job?.is_remote ? 'Remote' : job?.location}
                                    </span>
                                </div>
                            </div>
                            
                            <a
                                href={job?.application_url || `https://www.google.com/search?q=${encodeURIComponent(job?.title || '')}+${encodeURIComponent(job?.company?.name || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors font-semibold"
                            >
                                Apply on External Site
                                <ExternalLink className="w-5 h-5" />
                            </a>
                            
                            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                                <AlertTriangle className="w-4 h-4" />
                                <span>You&apos;ll leave this site to complete your application</span>
                            </div>
                        </div>
                        
                        <div className="mt-8 text-center">
                            <button
                                onClick={() => router.push('/jobs')}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ← Back to Job Listings
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex">
                <Sidebar 
                    currentSessionId={currentSessionId}
                    onSelectSession={setCurrentSessionId}
                    selectedModel={selectedModel}
                />
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="max-w-md w-full text-center">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold mb-4">Application Submitted!</h1>
                        <p className="text-gray-400 mb-8">
                            Your application for <span className="text-white font-medium">{job?.title}</span> at{' '}
                            <span className="text-white font-medium">{job?.company?.name}</span> has been submitted successfully.
                        </p>
                        {matchScore && (
                            <div className="bg-white/5 rounded-xl p-4 mb-6">
                                <p className="text-sm text-gray-400 mb-2">Match Score</p>
                                <div className="text-3xl font-bold text-blue-400">{matchScore}%</div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push('/jobs')}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                            >
                                Browse More Jobs
                            </button>
                            <button
                                onClick={() => router.push('/jobs/applications')}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                            >
                                View Applications
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!resume) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex">
                <Sidebar 
                    currentSessionId={currentSessionId}
                    onSelectSession={setCurrentSessionId}
                    selectedModel={selectedModel}
                />
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="max-w-md w-full text-center">
                        <h1 className="text-2xl font-bold mb-4">Create Your Resume First</h1>
                        <p className="text-gray-400 mb-6">
                            You need to create a resume before applying to jobs.
                        </p>
                        <button
                            onClick={() => router.push('/resume/builder')}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                        >
                            Create Resume
                        </button>
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
                <header className="border-b border-white/10 bg-[#0f0f0f]">
                    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="font-semibold">Apply for Position</h1>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto px-4 py-8">
                    {/* Job Card */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-xl font-bold">
                                {job?.company?.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold mb-1">{job?.title}</h2>
                                <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Building2 className="w-4 h-4" />
                                        {job?.company?.name}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {job?.is_remote ? 'Remote' : job?.location}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Briefcase className="w-4 h-4" />
                                        {job?.employment_type}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {matchScore !== null && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">Match Score:</span>
                                <span className={`font-semibold ${
                                    matchScore >= 70 ? 'text-green-400' : 
                                    matchScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {matchScore}%
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Resume Preview */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Your Resume</h3>
                            <button
                                onClick={() => router.push('/resume/builder')}
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                Edit Resume
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <p className="font-medium">{resume.full_name}</p>
                                <p className="text-sm text-gray-400">
                                    {resume.skills.slice(0, 5).join(', ')}...
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-400">ATS Score</p>
                                <p className={`text-xl font-bold ${
                                    resume.ats_score >= 70 ? 'text-green-400' : 
                                    resume.ats_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                    {resume.ats_score}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Application Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="font-medium">Cover Letter</label>
                                <button
                                    type="button"
                                    onClick={generateAICoverLetter}
                                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Generate with AI
                                </button>
                            </div>
                            <textarea
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                placeholder="Write a brief cover letter explaining why you're a great fit for this role..."
                                rows={10}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Optional but recommended. A good cover letter increases your chances.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors font-semibold"
                            >
                                {submitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}
