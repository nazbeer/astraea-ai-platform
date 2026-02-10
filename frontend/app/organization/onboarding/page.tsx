"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Building2, 
    ArrowRight, 
    CheckCircle,
    Globe,
    Users,
    MapPin,
    Briefcase,
    Linkedin,
    AlertCircle,
    Loader2
} from 'lucide-react';
import api from '../../utils/api';

interface CompanyFormData {
    name: string;
    description: string;
    website: string;
    industry: string;
    company_size: string;
    location: string;
    linkedin_url: string;
}

const industries = [
    "Technology", "Finance", "Healthcare", "Education", "E-commerce",
    "Manufacturing", "Consulting", "Media", "Real Estate", "Transportation",
    "Energy", "Agriculture", "Entertainment", "Government", "Non-profit",
    "Other"
];

const companySizes = [
    { value: "1-10", label: "1-10 employees" },
    { value: "11-50", label: "11-50 employees" },
    { value: "51-200", label: "51-200 employees" },
    { value: "201-500", label: "201-500 employees" },
    { value: "501-1000", label: "501-1000 employees" },
    { value: "1000+", label: "1000+ employees" },
];

export default function OrganizationOnboarding() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [userType, setUserType] = useState('');
    
    const [formData, setFormData] = useState<CompanyFormData>({
        name: '',
        description: '',
        website: '',
        industry: '',
        company_size: '',
        location: '',
        linkedin_url: '',
    });

    useEffect(() => {
        // Check if user is already set as organization and has a company
        checkUserStatus();
    }, []);

    const checkUserStatus = async () => {
        try {
            const res = await api.get('/profile');
            setUserType(res.data.user_type);
            
            // If already an organization, check if they have a company
            if (res.data.user_type === 'organization') {
                const companyRes = await api.get('/companies/my');
                if (companyRes.data) {
                    // Already has a company, redirect to dashboard
                    router.push('/organization/dashboard');
                }
            }
        } catch (err) {
            console.error('Failed to check user status', err);
        }
    };

    const handleUserTypeSelect = async (type: string) => {
        setLoading(true);
        try {
            await api.patch('/profile/user-type', { user_type: type });
            setUserType(type);
            
            if (type === 'candidate') {
                // Candidate goes to dashboard
                router.push('/dashboard');
            } else {
                // Organization proceeds to company setup
                setStep(2);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to update user type');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        
        try {
            await api.post('/companies', formData);
            setStep(3); // Success step
            
            // Redirect to dashboard after a delay
            setTimeout(() => {
                router.push('/organization/dashboard');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create company profile');
        } finally {
            setLoading(false);
        }
    };

    const updateForm = (field: keyof CompanyFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const canProceed = () => {
        return formData.name && formData.industry && formData.company_size && formData.location;
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Progress Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold">Set up your account</h1>
                        <span className="text-sm text-gray-400">Step {step === 1 ? 1 : step === 2 ? 2 : 3} of 3</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                        />
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {/* Step 1: Choose Account Type */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-semibold mb-2">How will you use Astraea?</h2>
                            <p className="text-gray-400">Choose the account type that best describes you</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleUserTypeSelect('candidate')}
                                disabled={loading}
                                className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-blue-500/50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Briefcase className="w-6 h-6 text-blue-400" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">I'm a Job Seeker</h3>
                                <p className="text-sm text-gray-400">
                                    Browse jobs, create resumes, and apply to positions
                                </p>
                                {loading && userType !== 'organization' && (
                                    <Loader2 className="w-5 h-5 animate-spin mt-4" />
                                )}
                            </button>

                            <button
                                onClick={() => handleUserTypeSelect('organization')}
                                disabled={loading}
                                className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-purple-500/50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Building2 className="w-6 h-6 text-purple-400" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">I'm an Employer</h3>
                                <p className="text-sm text-gray-400">
                                    Post jobs, find candidates, and manage applications
                                </p>
                                {loading && userType === 'organization' && (
                                    <Loader2 className="w-5 h-5 animate-spin mt-4" />
                                )}
                            </button>
                        </div>

                        <p className="text-center text-sm text-gray-500">
                            You can change this later in your profile settings
                        </p>
                    </div>
                )}

                {/* Step 2: Company Information */}
                {step === 2 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-lg">Company Information</h2>
                                <p className="text-sm text-gray-400">Tell us about your organization</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Company Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => updateForm('name', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500/50"
                                    placeholder="e.g., Acme Corporation"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => updateForm('description', e.target.value)}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500/50 resize-none"
                                    placeholder="Brief description of your company..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Industry *</label>
                                    <select
                                        value={formData.industry}
                                        onChange={(e) => updateForm('industry', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500/50"
                                    >
                                        <option value="">Select industry</option>
                                        {industries.map(ind => (
                                            <option key={ind} value={ind}>{ind}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Company Size *</label>
                                    <select
                                        value={formData.company_size}
                                        onChange={(e) => updateForm('company_size', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500/50"
                                    >
                                        <option value="">Select size</option>
                                        {companySizes.map(size => (
                                            <option key={size.value} value={size.value}>{size.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Location *</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => updateForm('location', e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500/50"
                                            placeholder="e.g., San Francisco, CA"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Website</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="url"
                                            value={formData.website}
                                            onChange={(e) => updateForm('website', e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500/50"
                                            placeholder="https://example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">LinkedIn URL</label>
                                <div className="relative">
                                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="url"
                                        value={formData.linkedin_url}
                                        onChange={(e) => updateForm('linkedin_url', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500/50"
                                        placeholder="https://linkedin.com/company/..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!canProceed() || loading}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Create Company Profile
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Company Profile Created!</h2>
                        <p className="text-gray-400 mb-6">
                            Your organization is now set up. You can start posting jobs and finding candidates.
                        </p>
                        <div className="animate-pulse text-sm text-gray-500">
                            Redirecting to dashboard...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
