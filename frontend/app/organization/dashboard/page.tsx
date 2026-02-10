"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Plus, 
    Building2, 
    Briefcase, 
    Users, 
    Search,
    Filter,
    ChevronDown,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    MapPin,
    DollarSign,
    Star,
    CheckCircle,
    XCircle,
    Clock,
    FileDown,
    Mail,
    Phone,
    Globe,
    Linkedin,
    Github,
    X,
    Download
} from 'lucide-react';
import api from '../../utils/api';
import Sidebar from '@/components/Sidebar';

interface Company {
    id: number;
    name: string;
    description: string;
    website: string;
    logo_url?: string;
    industry: string;
    company_size: string;
    location: string;
}

interface Job {
    id: number;
    title: string;
    status: string;
    views_count: number;
    applications_count: number;
    created_at: string;
    location: string;
    is_remote: boolean;
    salary_min?: number;
    salary_max?: number;
}

interface Application {
    id: number;
    job_id: number;
    candidate_id: number;
    resume_id: number;
    status: string;
    match_score: number;
    match_reasons: string[];
    applied_at: string;
    notes?: string;
    candidate: {
        id: number;
        username: string;
        email: string;
        resume: {
            id: number;
            full_name: string;
            email: string;
            phone?: string;
            location?: string;
            skills: string[];
            ats_score: number;
            summary?: string;
            work_experience: any[];
            education: any[];
            certifications: any[];
            projects: any[];
            languages: any[];
            linkedin_url?: string;
            portfolio_url?: string;
            github_url?: string;
            pdf_url?: string;
            docx_url?: string;
        }
    };
    job: {
        id: number;
        title: string;
    }
}

interface Candidate {
    id: number;
    full_name: string;
    location: string;
    skills: string[];
    ats_score: number;
    is_active: boolean;
}

export default function OrganizationDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [company, setCompany] = useState<Company | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showJobModal, setShowJobModal] = useState(false);
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [showCandidateModal, setShowCandidateModal] = useState(false);
    const [applicationFilter, setApplicationFilter] = useState('all');

    useEffect(() => {
        checkUserType();
        fetchData();
    }, []);

    const checkUserType = async () => {
        try {
            const res = await api.get('/profile');
            // Redirect candidates to the jobs page
            if (res.data.user_type === 'candidate') {
                router.push('/jobs');
                return;
            }
        } catch (err) {
            console.error('Failed to check user type', err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [companyRes, jobsRes, appsRes] = await Promise.all([
                api.get('/companies/my'),
                api.get('/jobs/my/posted'),
                api.get('/applications/received'),
            ]);
            setCompany(companyRes.data);
            setJobs(jobsRes.data);
            setApplications(appsRes.data);
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    };

    const searchCandidates = async (query: string = '') => {
        try {
            const res = await api.post('/resumes/search', {
                query,
                page: 1,
                limit: 20,
            });
            setCandidates(res.data.resumes);
        } catch (err) {
            console.error('Failed to search candidates', err);
        }
    };

    const updateApplicationStatus = async (applicationId: number, status: string) => {
        try {
            await api.patch(`/applications/${applicationId}`, { status });
            fetchData();
            if (selectedApplication) {
                setSelectedApplication({...selectedApplication, status});
            }
        } catch (err) {
            console.error('Failed to update application', err);
        }
    };

    const downloadResume = async (resumeId: number, fileType: 'pdf' | 'docx') => {
        try {
            const response = await api.get(`/resumes/${resumeId}/download/${fileType}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `resume.${fileType}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Failed to download resume', err);
            alert('Resume file not available. Candidate may not have generated it yet.');
        }
    };

    const viewCandidateDetails = (application: Application) => {
        setSelectedApplication(application);
        setShowCandidateModal(true);
    };

    const stats = [
        { label: 'Active Jobs', value: jobs.filter(j => j.status === 'active').length, icon: Briefcase },
        { label: 'Total Applications', value: applications.length, icon: Users },
        { label: 'Job Views', value: jobs.reduce((sum, j) => sum + j.views_count, 0), icon: Eye },
        { label: 'Hired', value: applications.filter(a => a.status === 'hired').length, icon: CheckCircle },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500/20 text-green-400';
            case 'paused': return 'bg-yellow-500/20 text-yellow-400';
            case 'closed': return 'bg-red-500/20 text-red-400';
            case 'pending': return 'bg-yellow-500/20 text-yellow-400';
            case 'reviewing': return 'bg-blue-500/20 text-blue-400';
            case 'shortlisted': return 'bg-purple-500/20 text-purple-400';
            case 'hired': return 'bg-green-500/20 text-green-400';
            case 'rejected': return 'bg-red-500/20 text-red-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    const filteredApplications = applications.filter(app => {
        if (applicationFilter === 'all') return true;
        return app.status === applicationFilter;
    });

    if (loading) {
        return (
            <div className="flex h-screen bg-[#0a0a0a] items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!company) {
        return (
            <div className="flex h-screen bg-[#0a0a0a] text-white">
                <Sidebar currentSessionId={null} onSelectSession={() => {}} selectedModel="gpt-4o-mini" />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <h1 className="text-2xl font-bold mb-4">Create Your Company Profile</h1>
                        <p className="text-gray-400 mb-6">
                            To post jobs and find candidates, you need to create a company profile first.
                        </p>
                        <button
                            onClick={() => setShowCompanyModal(true)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors"
                        >
                            Create Company Profile
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
            <Sidebar currentSessionId={null} onSelectSession={() => {}} selectedModel="gpt-4o-mini" />
            
            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="border-b border-white/10 bg-[#0f0f0f] px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-2xl font-bold">
                                {company.name?.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{company.name}</h1>
                                <p className="text-gray-400">{company.industry} • {company.location}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCompanyModal(true)}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
                        >
                            Edit Profile
                        </button>
                    </div>
                </header>

                <div className="p-8">
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        {stats.map((stat, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                        <stat.icon className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <span className="text-2xl font-bold">{stat.value}</span>
                                </div>
                                <p className="text-sm text-gray-400">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-6 border-b border-white/10">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'jobs', label: 'My Jobs' },
                            { id: 'applications', label: 'Applications' },
                            { id: 'candidates', label: 'Find Candidates' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-400'
                                        : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="space-y-6">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Recent Jobs */}
                                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold">Recent Jobs</h3>
                                        <button
                                            onClick={() => setActiveTab('jobs')}
                                            className="text-sm text-blue-400 hover:text-blue-300"
                                        >
                                            View All
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {jobs.slice(0, 5).map(job => (
                                            <div key={job.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                                <div>
                                                    <p className="font-medium">{job.title}</p>
                                                    <p className="text-sm text-gray-400">
                                                        {job.applications_count} applications • {job.views_count} views
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(job.status)}`}>
                                                    {job.status}
                                                </span>
                                            </div>
                                        ))}
                                        {jobs.length === 0 && (
                                            <p className="text-gray-500 text-center py-4">No jobs posted yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* Recent Applications */}
                                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold">Recent Applications</h3>
                                        <button
                                            onClick={() => setActiveTab('applications')}
                                            className="text-sm text-blue-400 hover:text-blue-300"
                                        >
                                            View All
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {applications.slice(0, 5).map(app => (
                                            <div key={app.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors"
                                                onClick={() => viewCandidateDetails(app)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                                                        {app.candidate.resume?.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{app.candidate.resume?.full_name}</p>
                                                        <p className="text-sm text-gray-400">{app.job.title}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {app.match_score && (
                                                        <span className="text-sm text-blue-400">{app.match_score}% match</span>
                                                    )}
                                                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(app.status)}`}>
                                                        {app.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {applications.length === 0 && (
                                            <p className="text-gray-500 text-center py-4">No applications yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Jobs Tab */}
                        {activeTab === 'jobs' && (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-lg">My Jobs</h3>
                                    <button
                                        onClick={() => setShowJobModal(true)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Post New Job
                                    </button>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Job Title</th>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Views</th>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Applications</th>
                                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {jobs.map(job => (
                                                <tr key={job.id} className="hover:bg-white/5">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium">{job.title}</p>
                                                        <p className="text-sm text-gray-400">{job.location}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(job.status)}`}>
                                                            {job.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400">{job.views_count}</td>
                                                    <td className="px-4 py-3 text-gray-400">{job.applications_count}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <button className="p-1.5 hover:bg-white/10 rounded-lg">
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button className="p-1.5 hover:bg-white/10 rounded-lg">
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button className="p-1.5 hover:bg-white/10 rounded-lg text-red-400">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {jobs.length === 0 && (
                                        <div className="text-center py-12">
                                            <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                            <p className="text-gray-500">No jobs posted yet</p>
                                            <button
                                                onClick={() => setShowJobModal(true)}
                                                className="mt-4 text-blue-400 hover:text-blue-300"
                                            >
                                                Post your first job
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Applications Tab */}
                        {activeTab === 'applications' && (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-lg">Applications Received ({filteredApplications.length})</h3>
                                    <select
                                        value={applicationFilter}
                                        onChange={(e) => setApplicationFilter(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="reviewing">Reviewing</option>
                                        <option value="shortlisted">Shortlisted</option>
                                        <option value="hired">Hired</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                                <div className="space-y-4">
                                    {filteredApplications.map(app => (
                                        <div key={app.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors cursor-pointer"
                                            onClick={() => viewCandidateDetails(app)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-lg">
                                                        {app.candidate.resume?.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold">{app.candidate.resume?.full_name}</h4>
                                                        <p className="text-sm text-gray-400 mb-2">
                                                            Applied for {app.job.title} • {new Date(app.applied_at).toLocaleDateString()}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {app.candidate.resume?.skills?.slice(0, 5).map((skill, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        {app.match_score && (
                                                            <div className="flex items-center gap-2">
                                                                <Star className="w-4 h-4 text-yellow-400" />
                                                                <span className="text-sm">{app.match_score}% match</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(app.status)}`}>
                                                        {app.status}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateApplicationStatus(app.id, 'shortlisted'); }}
                                                            className="p-2 hover:bg-green-500/10 text-green-400 rounded-lg"
                                                            title="Shortlist"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateApplicationStatus(app.id, 'rejected'); }}
                                                            className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredApplications.length === 0 && (
                                        <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                            <p className="text-gray-500">No applications found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Candidates Tab */}
                        {activeTab === 'candidates' && (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-lg">Find Candidates</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="Search candidates..."
                                                onChange={(e) => searchCandidates(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                                            />
                                        </div>
                                        <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">
                                            <Filter className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {candidates.map(candidate => (
                                        <div key={candidate.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-lg">
                                                        {candidate.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold">{candidate.full_name}</h4>
                                                        <p className="text-sm text-gray-400">{candidate.location}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-400">ATS Score</p>
                                                    <p className={`font-bold ${
                                                        candidate.ats_score >= 70 ? 'text-green-400' :
                                                        candidate.ats_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                                                    }`}>
                                                        {candidate.ats_score}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {candidate.skills?.slice(0, 5).map((skill, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                            <button className="w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm transition-colors">
                                                View Profile
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {candidates.length === 0 && (
                                    <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                                        <Search className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                        <p className="text-gray-500">Search for candidates to see results</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Candidate Details Modal */}
            {showCandidateModal && selectedApplication && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowCandidateModal(false)}
                >
                    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-[#0f0f0f] border-b border-white/10 p-6 flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-2xl font-bold">
                                    {selectedApplication.candidate.resume?.full_name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{selectedApplication.candidate.resume?.full_name}</h2>
                                    <p className="text-gray-400">{selectedApplication.candidate.email}</p>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {selectedApplication.candidate.resume?.location || 'Location not specified'}
                                        </span>
                                        {selectedApplication.candidate.resume?.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="w-3 h-3" />
                                                {selectedApplication.candidate.resume.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowCandidateModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status & Actions */}
                            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-400">Application Status:</span>
                                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedApplication.status)}`}>
                                        {selectedApplication.status}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => updateApplicationStatus(selectedApplication.id, 'shortlisted')}
                                        className="px-4 py-2 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg text-sm transition-colors"
                                    >
                                        Shortlist
                                    </button>
                                    <button
                                        onClick={() => updateApplicationStatus(selectedApplication.id, 'rejected')}
                                        className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm transition-colors"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => updateApplicationStatus(selectedApplication.id, 'hired')}
                                        className="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm transition-colors"
                                    >
                                        Hire
                                    </button>
                                </div>
                            </div>

                            {/* Match Score */}
                            {selectedApplication.match_score && (
                                <div className="bg-white/5 rounded-xl p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Star className="w-5 h-5 text-yellow-400" />
                                        <span className="font-medium">Match Score: {selectedApplication.match_score}%</span>
                                    </div>
                                    {selectedApplication.match_reasons && selectedApplication.match_reasons.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedApplication.match_reasons.map((reason, i) => (
                                                <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                                                    {reason}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Social Links */}
                            <div className="flex flex-wrap gap-2">
                                {selectedApplication.candidate.resume?.linkedin_url && (
                                    <a href={selectedApplication.candidate.resume.linkedin_url} target="_blank" rel="noopener noreferrer"
                                        className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-600/30 transition-colors">
                                        <Linkedin className="w-4 h-4" />
                                        LinkedIn
                                    </a>
                                )}
                                {selectedApplication.candidate.resume?.github_url && (
                                    <a href={selectedApplication.candidate.resume.github_url} target="_blank" rel="noopener noreferrer"
                                        className="px-3 py-2 bg-gray-600/20 text-gray-400 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-600/30 transition-colors">
                                        <Github className="w-4 h-4" />
                                        GitHub
                                    </a>
                                )}
                                {selectedApplication.candidate.resume?.portfolio_url && (
                                    <a href={selectedApplication.candidate.resume.portfolio_url} target="_blank" rel="noopener noreferrer"
                                        className="px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-600/30 transition-colors">
                                        <Globe className="w-4 h-4" />
                                        Portfolio
                                    </a>
                                )}
                            </div>

                            {/* ATS Score */}
                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-400">ATS Score</p>
                                        <p className={`text-2xl font-bold ${
                                            (selectedApplication.candidate.resume?.ats_score || 0) >= 70 ? 'text-green-400' :
                                            (selectedApplication.candidate.resume?.ats_score || 0) >= 40 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                            {selectedApplication.candidate.resume?.ats_score || 0}/100
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => downloadResume(selectedApplication.candidate.resume?.id!, 'pdf')}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm flex items-center gap-2 transition-colors"
                                        >
                                            <FileDown className="w-4 h-4" />
                                            Download PDF
                                        </button>
                                        <button
                                            onClick={() => downloadResume(selectedApplication.candidate.resume?.id!, 'docx')}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm flex items-center gap-2 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download DOCX
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Skills */}
                            {selectedApplication.candidate.resume?.skills && selectedApplication.candidate.resume.skills.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-3">Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedApplication.candidate.resume.skills.map((skill, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-sm border border-blue-500/20">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            {selectedApplication.candidate.resume?.summary && (
                                <div>
                                    <h3 className="font-semibold mb-3">Professional Summary</h3>
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        {selectedApplication.candidate.resume.summary}
                                    </p>
                                </div>
                            )}

                            {/* Work Experience */}
                            {selectedApplication.candidate.resume?.work_experience && selectedApplication.candidate.resume.work_experience.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-3">Work Experience</h3>
                                    <div className="space-y-4">
                                        {selectedApplication.candidate.resume.work_experience.map((exp, i) => (
                                            <div key={i} className="bg-white/5 rounded-lg p-4">
                                                <h4 className="font-medium">{exp.title}</h4>
                                                <p className="text-sm text-gray-400">{exp.company}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
                                                </p>
                                                {exp.description && (
                                                    <p className="text-sm text-gray-300 mt-2">{exp.description}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Education */}
                            {selectedApplication.candidate.resume?.education && selectedApplication.candidate.resume.education.length > 0 && (
                                <div>
                                    <h3 className="font-semibold mb-3">Education</h3>
                                    <div className="space-y-3">
                                        {selectedApplication.candidate.resume.education.map((edu, i) => (
                                            <div key={i} className="bg-white/5 rounded-lg p-3">
                                                <h4 className="font-medium text-sm">{edu.degree}</h4>
                                                <p className="text-sm text-gray-400">{edu.institution}</p>
                                                {edu.graduation_date && (
                                                    <p className="text-xs text-gray-500">Graduated: {edu.graduation_date}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
