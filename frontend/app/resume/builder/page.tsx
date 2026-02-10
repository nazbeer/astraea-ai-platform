"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Plus, 
    Trash2, 
    ChevronDown, 
    ChevronUp, 
    FileText, 
    Download, 
    Save,
    CheckCircle,
    AlertCircle,
    Sparkles,
    Building2,
    GraduationCap,
    Award,
    FolderGit2,
    Languages,
    User,
    Briefcase,
    FileDown,
    X,
    Upload,
    Loader2,
    Eye,
    LayoutTemplate
} from 'lucide-react';
import api from '../../utils/api';
import Sidebar from '@/components/Sidebar';

interface WorkExperience {
    title: string;
    company: string;
    location: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    description: string;
    achievements: string[];
}

interface Education {
    degree: string;
    institution: string;
    location: string;
    graduation_date: string;
    gpa: string;
}

interface Certification {
    name: string;
    issuer: string;
    date: string;
}

interface Project {
    name: string;
    description: string;
    technologies: string[];
    url: string;
}

interface Language {
    language: string;
    proficiency: string;
}

interface ResumeData {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    linkedin_url: string;
    portfolio_url: string;
    github_url: string;
    twitter_url: string;
    medium_url: string;
    dribbble_url: string;
    other_url: string;
    summary: string;
    work_experience: WorkExperience[];
    education: Education[];
    skills: string[];
    certifications: Certification[];
    projects: Project[];
    languages: Language[];
    expected_salary_min: number;
    expected_salary_max: number;
    preferred_location: string;
    remote_preference: string;
    is_public: boolean;
    is_active: boolean;
}

interface ATSScore {
    score: number;
    suggestions: string[];
    keywords: string[];
    is_ats_friendly: boolean;
}

interface Template {
    id: string;
    name: string;
    description: string;
}

const TEMPLATES: Template[] = [
    { id: "modern", name: "Modern ATS-Friendly", description: "Clean, professional design with clear section headers. Best for tech and corporate roles." },
    { id: "classic", name: "Classic Professional", description: "Traditional serif fonts with elegant styling. Best for conservative industries." },
    { id: "minimal", name: "Minimal Clean", description: "Simple, whitespace-focused design. Best for creative and design roles." }
];

export default function ResumeBuilder() {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState('personal');
    const [saving, setSaving] = useState(false);
    const [atsScore, setAtsScore] = useState<ATSScore | null>(null);
    const [showATSModal, setShowATSModal] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [generatingDOCX, setGeneratingDOCX] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [parsedData, setParsedData] = useState<any>(null);
    const [selectedTemplate, setSelectedTemplate] = useState('modern');
    const [showPreview, setShowPreview] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');

    const [resume, setResume] = useState<ResumeData>({
        full_name: '',
        email: '',
        phone: '',
        location: '',
        linkedin_url: '',
        portfolio_url: '',
        github_url: '',
        twitter_url: '',
        medium_url: '',
        dribbble_url: '',
        other_url: '',
        summary: '',
        work_experience: [],
        education: [],
        skills: [],
        certifications: [],
        projects: [],
        languages: [],
        expected_salary_min: 0,
        expected_salary_max: 0,
        preferred_location: '',
        remote_preference: 'any',
        is_public: false,
        is_active: true,
    });

    const [newSkill, setNewSkill] = useState('');

    useEffect(() => {
        checkUserType();
        fetchResume();
    }, []);

    useEffect(() => {
        // Update preview URL when template changes
        if (showPreview) {
            generatePreview();
        }
    }, [selectedTemplate, showPreview]);

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

    const fetchResume = async () => {
        try {
            const res = await api.get('/resume');
            if (res.data) {
                setResume(prev => ({
                    ...prev,
                    ...res.data,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch resume', err);
        }
    };

    const calculateATSScore = async () => {
        try {
            const res = await api.get('/resume/ats-score');
            setAtsScore(res.data);
            setShowATSModal(true);
        } catch (err) {
            console.error('Failed to calculate ATS score', err);
        }
    };

    const saveResume = async () => {
        setSaving(true);
        try {
            await api.post('/resume', resume);
            alert('Resume saved successfully!');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to save resume');
        } finally {
            setSaving(false);
        }
    };

    const generatePreview = async () => {
        // Create preview URL with token as query param for iframe support
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const url = `${apiUrl}/resume/preview?template=${selectedTemplate}&token=${token}`;
        setPreviewUrl(url);
    };

    const openPreview = async () => {
        await generatePreview();
        setShowPreview(true);
    };

    const downloadPDF = async () => {
        setGeneratingPDF(true);
        try {
            // First save the resume
            await api.post('/resume', resume);
            
            // Then download with template
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/resume/generate-pdf?template=${selectedTemplate}&download=true`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }
            
            // Get filename from Content-Disposition header
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'resume.pdf';
            if (disposition) {
                const match = disposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }
            
            // Download file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message || 'Failed to generate PDF');
        } finally {
            setGeneratingPDF(false);
        }
    };

    const downloadDOCX = async () => {
        setGeneratingDOCX(true);
        try {
            // First save the resume
            await api.post('/resume', resume);
            
            // Then download with template
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/resume/generate-docx?template=${selectedTemplate}&download=true`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate DOCX');
            }
            
            // Get filename from Content-Disposition header
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'resume.docx';
            if (disposition) {
                const match = disposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }
            
            // Download file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message || 'Failed to generate DOCX');
        } finally {
            setGeneratingDOCX(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
            alert('Please upload a PDF or DOCX file');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/resume/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setParsedData(res.data);
            setShowUploadModal(true);
            fetchResume();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to upload and parse resume');
        } finally {
            setUploading(false);
        }
    };

    const applyParsedData = () => {
        if (parsedData?.parsed_data) {
            setResume(prev => ({
                ...prev,
                ...parsedData.parsed_data,
            }));
            setShowUploadModal(false);
            setParsedData(null);
            alert('Resume data imported successfully!');
        }
    };

    // ... (keep all the add/update/remove functions the same)
    const addWorkExperience = () => {
        setResume(prev => ({
            ...prev,
            work_experience: [...prev.work_experience, {
                title: '',
                company: '',
                location: '',
                start_date: '',
                end_date: '',
                is_current: false,
                description: '',
                achievements: [''],
            }],
        }));
    };

    const updateWorkExperience = (index: number, field: keyof WorkExperience, value: any) => {
        const updated = [...resume.work_experience];
        updated[index] = { ...updated[index], [field]: value };
        setResume(prev => ({ ...prev, work_experience: updated }));
    };

    const removeWorkExperience = (index: number) => {
        setResume(prev => ({
            ...prev,
            work_experience: prev.work_experience.filter((_, i) => i !== index),
        }));
    };

    const addEducation = () => {
        setResume(prev => ({
            ...prev,
            education: [...prev.education, {
                degree: '',
                institution: '',
                location: '',
                graduation_date: '',
                gpa: '',
            }],
        }));
    };

    const updateEducation = (index: number, field: keyof Education, value: string) => {
        const updated = [...resume.education];
        updated[index] = { ...updated[index], [field]: value };
        setResume(prev => ({ ...prev, education: updated }));
    };

    const removeEducation = (index: number) => {
        setResume(prev => ({
            ...prev,
            education: prev.education.filter((_, i) => i !== index),
        }));
    };

    const addSkill = () => {
        if (newSkill.trim() && !resume.skills.includes(newSkill.trim())) {
            setResume(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
            setNewSkill('');
        }
    };

    const removeSkill = (skill: string) => {
        setResume(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
    };

    const addCertification = () => {
        setResume(prev => ({
            ...prev,
            certifications: [...prev.certifications, { name: '', issuer: '', date: '' }],
        }));
    };

    const updateCertification = (index: number, field: keyof Certification, value: string) => {
        const updated = [...resume.certifications];
        updated[index] = { ...updated[index], [field]: value };
        setResume(prev => ({ ...prev, certifications: updated }));
    };

    const removeCertification = (index: number) => {
        setResume(prev => ({
            ...prev,
            certifications: prev.certifications.filter((_, i) => i !== index),
        }));
    };

    const addProject = () => {
        setResume(prev => ({
            ...prev,
            projects: [...prev.projects, { name: '', description: '', technologies: [], url: '' }],
        }));
    };

    const updateProject = (index: number, field: keyof Project, value: any) => {
        const updated = [...resume.projects];
        updated[index] = { ...updated[index], [field]: value };
        setResume(prev => ({ ...prev, projects: updated }));
    };

    const removeProject = (index: number) => {
        setResume(prev => ({
            ...prev,
            projects: prev.projects.filter((_, i) => i !== index),
        }));
    };

    const addLanguage = () => {
        setResume(prev => ({
            ...prev,
            languages: [...prev.languages, { language: '', proficiency: '' }],
        }));
    };

    const updateLanguage = (index: number, field: keyof Language, value: string) => {
        const updated = [...resume.languages];
        updated[index] = { ...updated[index], [field]: value };
        setResume(prev => ({ ...prev, languages: updated }));
    };

    const removeLanguage = (index: number) => {
        setResume(prev => ({
            ...prev,
            languages: prev.languages.filter((_, i) => i !== index),
        }));
    };

    return (
        <div className="flex h-screen bg-[#0a0a0a]">
            <Sidebar 
                currentSessionId={currentSessionId}
                onSelectSession={setCurrentSessionId}
                selectedModel={selectedModel}
            />
            
            <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="bg-[#0f0f0f] border-b border-white/10 sticky top-0 z-10">
                    <div className="max-w-6xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold">Resume Builder</h1>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={calculateATSScore}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-xl hover:bg-green-600/30 transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    ATS Score
                                </button>
                                <button
                                    onClick={openPreview}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-colors"
                                >
                                    <Eye className="w-4 h-4" />
                                    Preview
                                </button>
                                <button
                                    onClick={saveResume}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-4 py-8">
                    {/* Template Selection */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <LayoutTemplate className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-semibold">Choose Resume Template</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            {TEMPLATES.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template.id)}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                                        selectedTemplate === template.id
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-white/10 hover:border-white/30'
                                    }`}
                                >
                                    <h3 className="font-semibold mb-2">{template.name}</h3>
                                    <p className="text-sm text-gray-400">{template.description}</p>
                                    {selectedTemplate === template.id && (
                                        <div className="mt-3 flex items-center gap-2 text-sm text-blue-400">
                                            <CheckCircle className="w-4 h-4" />
                                            Selected
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Download Options */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                        <h2 className="text-lg font-semibold mb-4">Download Resume</h2>
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={downloadPDF}
                                disabled={generatingPDF}
                                className="flex items-center gap-2 px-6 py-3 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-600/30 transition-colors disabled:opacity-50"
                            >
                                {generatingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                                Download PDF
                            </button>
                            <button
                                onClick={downloadDOCX}
                                disabled={generatingDOCX}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                            >
                                {generatingDOCX ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                Download DOCX
                            </button>
                        </div>
                        <p className="text-sm text-gray-400 mt-3">
                            Using template: <span className="text-white font-medium">{TEMPLATES.find(t => t.id === selectedTemplate)?.name}</span>
                        </p>
                    </div>

                    {/* Upload Resume */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                        <h2 className="text-lg font-semibold mb-4">Upload Existing Resume</h2>
                        <p className="text-sm text-gray-400 mb-4">
                            Upload a PDF or DOCX file to auto-fill your resume data using AI.
                        </p>
                        <label className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer w-fit">
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            <span>Choose File</span>
                            <input
                                type="file"
                                accept=".pdf,.docx"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {/* Resume Form */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold mb-6">Resume Information</h2>
                        
                        {/* Personal Information */}
                        <div className="mb-8">
                            <h3 className="text-md font-medium mb-4 text-blue-400">Personal Information</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={resume.full_name}
                                        onChange={(e) => setResume(prev => ({ ...prev, full_name: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={resume.email}
                                        onChange={(e) => setResume(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={resume.phone}
                                        onChange={(e) => setResume(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={resume.location}
                                        onChange={(e) => setResume(prev => ({ ...prev, location: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                        placeholder="San Francisco, CA"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">LinkedIn URL</label>
                                    <input
                                        type="text"
                                        value={resume.linkedin_url}
                                        onChange={(e) => setResume(prev => ({ ...prev, linkedin_url: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                        placeholder="https://linkedin.com/in/johndoe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Portfolio/Website</label>
                                    <input
                                        type="text"
                                        value={resume.portfolio_url}
                                        onChange={(e) => setResume(prev => ({ ...prev, portfolio_url: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                        placeholder="https://johndoe.com"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm text-gray-400 mb-1">Professional Summary</label>
                                <textarea
                                    value={resume.summary}
                                    onChange={(e) => setResume(prev => ({ ...prev, summary: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 h-24"
                                    placeholder="Brief overview of your professional background and key strengths..."
                                />
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="mb-8">
                            <h3 className="text-md font-medium mb-4 text-blue-400">Skills</h3>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                    placeholder="Add a skill (e.g., Python, React, Project Management)"
                                />
                                <button
                                    onClick={addSkill}
                                    className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {resume.skills.map((skill, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm flex items-center gap-2">
                                        {skill}
                                        <button onClick={() => removeSkill(skill)} className="hover:text-white">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Work Experience */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-md font-medium text-blue-400">Work Experience</h3>
                                <button
                                    onClick={addWorkExperience}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Experience
                                </button>
                            </div>
                            <div className="space-y-4">
                                {resume.work_experience.map((exp, idx) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <div className="flex justify-between mb-3">
                                            <h4 className="font-medium">Experience {idx + 1}</h4>
                                            <button
                                                onClick={() => removeWorkExperience(idx)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                value={exp.title}
                                                onChange={(e) => updateWorkExperience(idx, 'title', e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                                placeholder="Job Title"
                                            />
                                            <input
                                                type="text"
                                                value={exp.company}
                                                onChange={(e) => updateWorkExperience(idx, 'company', e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                                placeholder="Company"
                                            />
                                            <input
                                                type="text"
                                                value={exp.location}
                                                onChange={(e) => updateWorkExperience(idx, 'location', e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                                placeholder="Location"
                                            />
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={exp.start_date}
                                                    onChange={(e) => updateWorkExperience(idx, 'start_date', e.target.value)}
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                                    placeholder="Start Date"
                                                />
                                                <input
                                                    type="text"
                                                    value={exp.end_date}
                                                    onChange={(e) => updateWorkExperience(idx, 'end_date', e.target.value)}
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                                    placeholder="End Date"
                                                />
                                            </div>
                                        </div>
                                        <textarea
                                            value={exp.description}
                                            onChange={(e) => updateWorkExperience(idx, 'description', e.target.value)}
                                            className="w-full mt-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 h-20"
                                            placeholder="Job description and responsibilities..."
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Education */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-md font-medium text-blue-400">Education</h3>
                                <button
                                    onClick={addEducation}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Education
                                </button>
                            </div>
                            <div className="space-y-4">
                                {resume.education.map((edu, idx) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <div className="flex justify-between mb-3">
                                            <h4 className="font-medium">Education {idx + 1}</h4>
                                            <button
                                                onClick={() => removeEducation(idx)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                value={edu.degree}
                                                onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                                placeholder="Degree (e.g., Bachelor of Science)"
                                            />
                                            <input
                                                type="text"
                                                value={edu.institution}
                                                onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                                placeholder="Institution"
                                            />
                                            <input
                                                type="text"
                                                value={edu.graduation_date}
                                                onChange={(e) => updateEducation(idx, 'graduation_date', e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                                placeholder="Graduation Year"
                                            />
                                            <input
                                                type="text"
                                                value={edu.gpa}
                                                onChange={(e) => updateEducation(idx, 'gpa', e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                                placeholder="GPA (optional)"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Certifications */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-md font-medium text-blue-400">Certifications</h3>
                                <button
                                    onClick={addCertification}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Certification
                                </button>
                            </div>
                            <div className="space-y-3">
                                {resume.certifications.map((cert, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={cert.name}
                                            onChange={(e) => updateCertification(idx, 'name', e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                            placeholder="Certification Name"
                                        />
                                        <input
                                            type="text"
                                            value={cert.issuer}
                                            onChange={(e) => updateCertification(idx, 'issuer', e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                            placeholder="Issuing Organization"
                                        />
                                        <input
                                            type="text"
                                            value={cert.date}
                                            onChange={(e) => updateCertification(idx, 'date', e.target.value)}
                                            className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                            placeholder="Date"
                                        />
                                        <button
                                            onClick={() => removeCertification(idx)}
                                            className="text-red-400 hover:text-red-300 px-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Projects */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-md font-medium text-blue-400">Projects</h3>
                                <button
                                    onClick={addProject}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Project
                                </button>
                            </div>
                            <div className="space-y-4">
                                {resume.projects.map((proj, idx) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                        <div className="flex justify-between mb-3">
                                            <input
                                                type="text"
                                                value={proj.name}
                                                onChange={(e) => updateProject(idx, 'name', e.target.value)}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 mr-2"
                                                placeholder="Project Name"
                                            />
                                            <button
                                                onClick={() => removeProject(idx)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <textarea
                                            value={proj.description}
                                            onChange={(e) => updateProject(idx, 'description', e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 h-20 mb-2"
                                            placeholder="Project description..."
                                        />
                                        <input
                                            type="text"
                                            value={proj.url}
                                            onChange={(e) => updateProject(idx, 'url', e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                            placeholder="Project URL (optional)"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Languages */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-md font-medium text-blue-400">Languages</h3>
                                <button
                                    onClick={addLanguage}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Language
                                </button>
                            </div>
                            <div className="space-y-3">
                                {resume.languages.map((lang, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={lang.language}
                                            onChange={(e) => updateLanguage(idx, 'language', e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                            placeholder="Language (e.g., English, Spanish)"
                                        />
                                        <select
                                            value={lang.proficiency}
                                            onChange={(e) => updateLanguage(idx, 'proficiency', e.target.value)}
                                            className="w-48 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="">Select Proficiency</option>
                                            <option value="Native">Native</option>
                                            <option value="Fluent">Fluent</option>
                                            <option value="Professional">Professional</option>
                                            <option value="Conversational">Conversational</option>
                                            <option value="Basic">Basic</option>
                                        </select>
                                        <button
                                            onClick={() => removeLanguage(idx)}
                                            className="text-red-400 hover:text-red-300 px-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-lg font-semibold">Resume Preview - {TEMPLATES.find(t => t.id === selectedTemplate)?.name}</h2>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 p-4">
                            <iframe
                                src={previewUrl}
                                className="w-full h-full rounded-lg bg-white"
                                title="Resume Preview"
                            />
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t border-white/10">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={downloadPDF}
                                disabled={generatingPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {generatingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ATS Score Modal */}
            {showATSModal && atsScore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">ATS Compatibility Score</h2>
                            <button
                                onClick={() => setShowATSModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="text-center mb-6">
                            <div className={`text-5xl font-bold mb-2 ${
                                atsScore.score >= 80 ? 'text-green-400' :
                                atsScore.score >= 60 ? 'text-yellow-400' :
                                'text-red-400'
                            }`}>
                                {atsScore.score}
                            </div>
                            <p className="text-gray-400">out of 100</p>
                        </div>

                        {atsScore.suggestions.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-semibold mb-3">Suggestions to Improve:</h3>
                                <ul className="space-y-2">
                                    {atsScore.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                                            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                                            {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {atsScore.keywords.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3">Detected Keywords:</h3>
                                <div className="flex flex-wrap gap-2">
                                    {atsScore.keywords.map((keyword, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs">
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
