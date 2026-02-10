"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Search, 
    MapPin, 
    Briefcase, 
    DollarSign, 
    Building2, 
    Bookmark,
    Filter,
    ChevronDown,
    Clock,
    Globe,
    Star,
    X,
    Sparkles
} from 'lucide-react';
import api from '../utils/api';
import Sidebar from '@/components/Sidebar';

interface Job {
    id: number;
    title: string;
    description: string;
    requirements?: string;
    responsibilities?: string;
    location: string;
    is_remote: boolean;
    is_hybrid: boolean;
    employment_type: string;
    experience_level: string;
    salary_min?: number;
    salary_max?: number;
    salary_currency: string;
    required_skills: string[];
    nice_to_have_skills: string[];
    company?: {
        id: number;
        name: string;
        logo_url?: string;
    };
    is_saved: boolean;
    created_at: string;
}

export default function JobsPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalJobs, setTotalJobs] = useState(0);
    const [page, setPage] = useState(1);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [savedJobs, setSavedJobs] = useState<Set<number>>(new Set());
    const [userType, setUserType] = useState<string | null>(null);
    
    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [remoteFilter, setRemoteFilter] = useState<boolean | null>(null);
    const [employmentType, setEmploymentType] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('');
    const [category, setCategory] = useState('');
    const [salaryMin, setSalaryMin] = useState('');
    
    // Metadata
    const [categories, setCategories] = useState<string[]>([]);
    const [employmentTypes, setEmploymentTypes] = useState<{value: string, label: string}[]>([]);
    const [experienceLevels, setExperienceLevels] = useState<{value: string, label: string}[]>([]);

    useEffect(() => {
        fetchUserType();
        fetchJobs();
        fetchMetadata();
    }, [page, searchQuery, locationFilter, remoteFilter, employmentType, experienceLevel, category, salaryMin]);

    const fetchUserType = async () => {
        try {
            const res = await api.get('/profile');
            setUserType(res.data.user_type);
        } catch (err) {
            console.error('Failed to fetch user type', err);
        }
    };

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 20 };
            if (searchQuery) params.query = searchQuery;
            if (locationFilter) params.location = locationFilter;
            if (remoteFilter !== null) params.is_remote = remoteFilter;
            if (employmentType) params.employment_type = employmentType;
            if (experienceLevel) params.experience_level = experienceLevel;
            if (category) params.category = category;
            if (salaryMin) params.salary_min = parseInt(salaryMin);
            
            const res = await api.get('/jobs', { params });
            const jobsData = res.data?.jobs || [];
            const totalCount = res.data?.total || jobsData.length;
            
            setJobs(jobsData);
            setTotalJobs(totalCount);
            
            // Update saved jobs set
            const saved = new Set<number>(jobsData.filter((j: Job) => j.is_saved).map((j: Job) => j.id));
            setSavedJobs(saved);
            
            if (jobsData.length > 0 && !selectedJob) {
                setSelectedJob(jobsData[0]);
            }
        } catch (err) {
            console.error('Failed to fetch jobs', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const [catRes, empRes, expRes] = await Promise.all([
                api.get('/jobs/metadata/categories'),
                api.get('/jobs/metadata/employment-types'),
                api.get('/jobs/metadata/experience-levels'),
            ]);
            setCategories(catRes.data);
            setEmploymentTypes(empRes.data);
            setExperienceLevels(expRes.data);
        } catch (err) {
            console.error('Failed to fetch metadata', err);
        }
    };

    const toggleSaveJob = async (jobId: number) => {
        try {
            if (savedJobs.has(jobId)) {
                await api.delete(`/jobs/${jobId}/save`);
                setSavedJobs(prev => {
                    const next = new Set(prev);
                    next.delete(jobId);
                    return next;
                });
            } else {
                await api.post(`/jobs/${jobId}/save`);
                setSavedJobs(prev => new Set(prev).add(jobId));
            }
        } catch (err) {
            console.error('Failed to toggle save job', err);
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    };

    const clearFilters = () => {
        setSearchQuery('');
        setLocationFilter('');
        setRemoteFilter(null);
        setEmploymentType('');
        setExperienceLevel('');
        setCategory('');
        setSalaryMin('');
    };

    // Format job text - converts plain text to HTML if needed, handles bullet points
    const formatJobText = (text: string): string => {
        if (!text) return '';
        
        // If text already contains HTML tags, return as is
        if (text.includes('<') && text.includes('>')) {
            return text;
        }
        
        // Convert bullet points (•, -, *) to HTML list items
        const lines = text.split('\n');
        let inList = false;
        let html = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Check if line is a bullet point
            if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
                if (!inList) {
                    html += '<ul class="list-disc list-inside space-y-1 my-2">';
                    inList = true;
                }
                const content = trimmed.substring(1).trim();
                html += `<li>${content}</li>`;
            } else if (trimmed.match(/^\d+\./)) {
                // Numbered list
                if (!inList) {
                    html += '<ol class="list-decimal list-inside space-y-1 my-2">';
                    inList = true;
                }
                const content = trimmed.replace(/^\d+\./, '').trim();
                html += `<li>${content}</li>`;
            } else {
                if (inList) {
                    html += html.includes('<ul') ? '</ul>' : '</ol>';
                    inList = false;
                }
                if (trimmed) {
                    html += `<p class="mb-2">${trimmed}</p>`;
                } else {
                    html += '<br/>';
                }
            }
        }
        
        if (inList) {
            html += html.includes('<ul') ? '</ul>' : '</ol>';
        }
        
        return html || text.replace(/\n/g, '<br/>');
    };

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
            <Sidebar currentSessionId={null} onSelectSession={() => {}} selectedModel="gpt-4o-mini" />
            
            <main className="flex-1 flex overflow-hidden">
                {/* Left Panel - Job List */}
                <div className="w-[450px] flex flex-col border-r border-white/10 bg-[#0f0f0f]">
                    {/* Search Header */}
                    <div className="p-4 border-b border-white/10 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search jobs, companies, or keywords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                            />
                        </div>
                        
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Location"
                                    value={locationFilter}
                                    onChange={(e) => setLocationFilter(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2 ${
                                    showFilters 
                                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                Filters
                            </button>
                        </div>

                        {/* Expanded Filters */}
                        {showFilters && (
                            <div className="space-y-3 pt-2 animate-in slide-in-from-top-2">
                                <div className="flex gap-2 flex-wrap">
                                    <select
                                        value={remoteFilter === null ? '' : remoteFilter ? 'remote' : 'onsite'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setRemoteFilter(val === '' ? null : val === 'remote');
                                        }}
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                                    >
                                        <option value="">Any workplace</option>
                                        <option value="remote">Remote</option>
                                        <option value="onsite">On-site</option>
                                    </select>
                                    
                                    <select
                                        value={employmentType}
                                        onChange={(e) => setEmploymentType(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                                    >
                                        <option value="">Any type</option>
                                        {employmentTypes.map(et => (
                                            <option key={et.value} value={et.value}>{et.label}</option>
                                        ))}
                                    </select>
                                    
                                    <select
                                        value={experienceLevel}
                                        onChange={(e) => setExperienceLevel(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                                    >
                                        <option value="">Any level</option>
                                        {experienceLevels.map(el => (
                                            <option key={el.value} value={el.value}>{el.label}</option>
                                        ))}
                                    </select>
                                    
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                                    >
                                        <option value="">Any category</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <input
                                        type="number"
                                        placeholder="Min salary"
                                        value={salaryMin}
                                        onChange={(e) => setSalaryMin(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:border-blue-500/50"
                                    />
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm text-blue-400 hover:text-blue-300"
                                    >
                                        Clear all
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                            {totalJobs} jobs found
                        </div>
                    </div>
                    
                    {/* Job List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                <Briefcase className="w-12 h-12 mb-4 opacity-30" />
                                <p>No jobs found matching your criteria</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {jobs.map((job) => (
                                    <div
                                        key={job.id}
                                        onClick={() => setSelectedJob(job)}
                                        className={`p-4 cursor-pointer transition-colors ${
                                            selectedJob?.id === job.id 
                                                ? 'bg-blue-500/10 border-l-2 border-blue-500' 
                                                : 'hover:bg-white/5 border-l-2 border-transparent'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-sm line-clamp-1 pr-2">{job.title}</h3>
                                            {/* Only show save button for candidates */}
                                            {userType === 'candidate' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleSaveJob(job.id);
                                                    }}
                                                    className="text-gray-500 hover:text-yellow-400 transition-colors"
                                                >
                                                    <Bookmark 
                                                        className={`w-4 h-4 ${savedJobs.has(job.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} 
                                                    />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                            <Building2 className="w-3 h-3" />
                                            <span className="line-clamp-1">{job.company?.name || 'Unknown Company'}</span>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2 text-xs mb-2">
                                            <span className="px-2 py-0.5 bg-white/5 rounded text-gray-400 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {job.is_remote ? 'Remote' : job.location}
                                            </span>
                                            <span className="px-2 py-0.5 bg-white/5 rounded text-gray-400">
                                                {job.employment_type}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(job.created_at)}
                                            </span>
                                            {job.required_skills?.slice(0, 2).map((skill, i) => (
                                                <span key={i} className="text-blue-400/70">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Pagination */}
                        {!loading && jobs.length > 0 && (
                            <div className="flex justify-center gap-2 p-4">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-50 hover:bg-white/10"
                                >
                                    Previous
                                </button>
                                <span className="px-3 py-1.5 text-sm text-gray-400">
                                    Page {page}
                                </span>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={jobs.length < 20}
                                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm disabled:opacity-50 hover:bg-white/10"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Right Panel - Job Details */}
                <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
                    {selectedJob ? (
                        <div className="p-8 max-w-4xl">
                            {/* Job Header */}
                            <div className="mb-8">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-2xl">
                                            {selectedJob.company?.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold mb-1">{selectedJob.title}</h1>
                                            <p className="text-gray-400">{selectedJob.company?.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Only show save/apply buttons for candidates */}
                                        {userType === 'candidate' && (
                                            <>
                                                <button
                                                    onClick={() => toggleSaveJob(selectedJob.id)}
                                                    className={`p-3 rounded-xl border transition-colors ${
                                                        savedJobs.has(selectedJob.id)
                                                            ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                    }`}
                                                >
                                                    <Bookmark className={`w-5 h-5 ${savedJobs.has(selectedJob.id) ? 'fill-current' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/jobs/${selectedJob.id}/apply`)}
                                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-colors"
                                                >
                                                    Apply Now
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Quick Info */}
                                <div className="flex flex-wrap gap-3 mb-6">
                                    <span className="px-3 py-1.5 bg-white/5 rounded-lg text-sm flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        {selectedJob.is_remote ? 'Remote' : selectedJob.location}
                                        {selectedJob.is_hybrid && ' (Hybrid)'}
                                    </span>
                                    <span className="px-3 py-1.5 bg-white/5 rounded-lg text-sm flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-gray-400" />
                                        {selectedJob.employment_type}
                                    </span>
                                    <span className="px-3 py-1.5 bg-white/5 rounded-lg text-sm flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-gray-400" />
                                        {formatSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.salary_currency)}
                                    </span>
                                    <span className="px-3 py-1.5 bg-white/5 rounded-lg text-sm flex items-center gap-2">
                                        <Star className="w-4 h-4 text-gray-400" />
                                        {selectedJob.experience_level}
                                    </span>
                                </div>
                                
                                {/* Skills */}
                                <div className="flex flex-wrap gap-2">
                                    {selectedJob.required_skills?.map((skill, i) => (
                                        <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm border border-blue-500/20">
                                            {skill}
                                        </span>
                                    ))}
                                    {selectedJob.nice_to_have_skills?.map((skill, i) => (
                                        <span key={`nice-${i}`} className="px-3 py-1 bg-white/5 text-gray-400 rounded-full text-sm border border-white/10">
                                            {skill} (nice to have)
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Job Description */}
                            <div className="space-y-6">
                                {selectedJob.description && (
                                    <section>
                                        <h2 className="text-lg font-semibold mb-3">About the Role</h2>
                                        <div 
                                            className="text-gray-300 leading-relaxed whitespace-pre-wrap prose prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: formatJobText(selectedJob.description) }}
                                        />
                                    </section>
                                )}
                                
                                {selectedJob.requirements && (
                                    <section>
                                        <h2 className="text-lg font-semibold mb-3">Requirements</h2>
                                        <div 
                                            className="text-gray-300 leading-relaxed whitespace-pre-wrap prose prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: formatJobText(selectedJob.requirements) }}
                                        />
                                    </section>
                                )}
                                
                                {selectedJob.responsibilities && (
                                    <section>
                                        <h2 className="text-lg font-semibold mb-3">Responsibilities</h2>
                                        <div 
                                            className="text-gray-300 leading-relaxed whitespace-pre-wrap prose prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: formatJobText(selectedJob.responsibilities) }}
                                        />
                                    </section>
                                )}
                            </div>
                            
                            {/* Apply Button - Only for candidates */}
                            {userType === 'candidate' && (
                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <button
                                        onClick={() => router.push(`/jobs/${selectedJob.id}/apply`)}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-lg transition-colors"
                                    >
                                        Apply for this position
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Briefcase className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg">Select a job to view details</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
