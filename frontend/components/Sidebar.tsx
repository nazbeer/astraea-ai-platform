"use client";

import { useEffect, useState } from 'react';
import { MessageSquare, Plus, LogOut, Trash2, User, CreditCard, Brain, Menu, X, Search, Settings, Cpu } from 'lucide-react';

import api from '../app/utils/api';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

interface SidebarProps {
    currentSessionId: string | null;
    onSelectSession: (id: string | null) => void;
    selectedModel: string;
}

export default function Sidebar({ currentSessionId, onSelectSession, selectedModel }: SidebarProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileExpanded, setIsProfileExpanded] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [appearance, setAppearance] = useState<'Light' | 'Dark' | 'System'>('Dark');
    const [isAppearanceDropdownOpen, setIsAppearanceDropdownOpen] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState('general');
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isModelImprovementModalOpen, setIsModelImprovementModalOpen] = useState(false);
    const [archivedSessions, setArchivedSessions] = useState<any[]>([]);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as any;
        if (savedTheme) {
            setAppearance(savedTheme);
            applyTheme(savedTheme);
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            const currentTheme = localStorage.getItem('theme') as any;
            if (currentTheme === 'System') {
                applyTheme('System');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const applyTheme = (theme: 'Light' | 'Dark' | 'System') => {
        const root = window.document.documentElement;
        if (typeof window === 'undefined') return;

        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light';
        const effectiveTheme = theme === 'System' ? systemTheme : theme;

        if (effectiveTheme === 'Dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    };

    const handleAppearanceChange = (theme: 'Light' | 'Dark' | 'System') => {
        setAppearance(theme);
        applyTheme(theme);
        setIsAppearanceDropdownOpen(false);
    };
    const [customModels, setCustomModels] = useState<any[]>([]);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        fetchHistory();
        fetchProfile();
        fetchCustomModels();
    }, [currentSessionId]);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/history');
            setSessions(res.data);
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await api.get('/profile');
            setProfile(res.data);
        } catch (err) {
            console.error("Failed to fetch profile", err);
        }
    };

    const fetchCustomModels = async () => {
        try {
            const res = await api.get('/models');
            setCustomModels(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchArchivedHistory = async () => {
        try {
            const res = await api.get('/history/archived');
            setArchivedSessions(res.data);
        } catch (err) {
            console.error("Failed to fetch archived history", err);
        }
    };

    const handleArchiveAll = async () => {
        try {
            await api.post('/history/archive-all');
            fetchHistory();
            setIsSettingsOpen(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm("Are you sure you want to delete all chats? This cannot be undone.")) return;
        try {
            await api.post('/history/delete-all');
            fetchHistory();
            setIsSettingsOpen(false);
            router.push('/');
        } catch (err) {
            console.error(err);
        }
    };

    const handleExport = async () => {
        try {
            await api.post('/profile/export');
            setIsExportModalOpen(false);
            alert("Data export requested.");
        } catch (err) {
            console.error(err);
        }
    };

    const toggleImproveModel = async () => {
        try {
            const newVal = !profile.improve_model;
            await api.patch('/profile/settings', { improve_model: newVal });
            setProfile({ ...profile, improve_model: newVal });
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/';  // Full reload to refresh auth state
    };

    const handleNavigation = (id: string | null) => {
        setIsOpen(false);
        setIsSearchOpen(false);
        if (id) {
            router.push(`/a/${id}`);
        } else {
            router.push('/');
        }
    };

    const filteredSessions = sessions.filter(s =>
        (s.title || 'Untitled conversation').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getSelectedModelName = () => {
        if (selectedModel.startsWith('custom-')) {
            const id = parseInt(selectedModel.split('-')[1]);
            const model = customModels.find(m => m.id === id);
            return model ? model.name : 'Custom Model';
        }
        const defaults: { [key: string]: string } = {
            'gpt-4o-mini': 'GPT-4o Mini',
            'gpt-3.5-turbo': 'GPT-3.5 Turbo',
            'gpt-4': 'GPT-4 Pro'
        };
        return defaults[selectedModel] || selectedModel;
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-[#0f0f0f] border border-white/5 rounded-xl text-gray-400 hover:text-white shadow-lg"
                >
                    <Menu size={22} />
                </button>
            )}

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-[var(--sidebar)] text-[var(--foreground)] flex flex-col border-r border-[var(--sidebar-border)] transition-transform duration-300 ease-in-out
                lg:translate-x-0 lg:static flex-shrink-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Top Section: New Chat */}
                <div className="p-5 pt-8 space-y-4">
                    <button
                        onClick={() => handleNavigation(null)}
                        className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] text-sm "
                    >
                        <Plus size={18} strokeWidth={3} />
                        <span>New chat</span>
                    </button>

                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="w-full flex items-center gap-3 bg-[var(--input-bg)] border border-[var(--border)] rounded-xl py-3 px-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-blue-500/30 transition-all text-xs "
                    >
                        <Search size={16} strokeWidth={2.5} />
                        <span>Search chats...</span>
                    </button>
                </div>

                {/* Middle Section: Chat History (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-none">
                    <h3 className="text-xs font-medium text-[var(--text-muted)] px-3 mb-6 flex justify-between items-center">
                        <span>Recent</span>
                        {searchQuery && <span className="text-[10px] text-[var(--text-muted)] font-bold">{filteredSessions.length} found</span>}
                    </h3>
                    <div className="space-y-1">
                        {filteredSessions.length === 0 ? (
                            <p className="px-3 text-xs text-[var(--text-muted)]">{searchQuery ? 'No chats match your search' : 'No active history'}</p>
                        ) : (
                            filteredSessions.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => handleNavigation(s.id)}
                                    className={`p-3 rounded-xl cursor-pointer flex items-center gap-3.5 transition-all group ${currentSessionId === s.id
                                        ? 'bg-blue-500/10 text-blue-500 dark:bg-white/10 dark:text-white'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    <MessageSquare size={17} className={currentSessionId === s.id ? 'text-blue-500' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'} />
                                    <span className="truncate text-sm font-medium">{s.title || 'Untitled conversation'}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Bottom Section: Profile & Navigation Items */}
                <div className="mt-auto border-t border-[var(--sidebar-border)] p-4">
                    {isProfileExpanded && (
                        <div className="space-y-1 mb-2 animate-in slide-in-from-bottom-2 duration-200">
                            <button
                                onClick={() => { router.push('/profile'); setIsOpen(false); setIsProfileExpanded(false); }}
                                className={`w-full flex items-center gap-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all p-3 hover:bg-[var(--input-bg)] rounded-xl group text-sm ${pathname === '/profile' ? 'bg-[var(--input-bg)] text-[var(--text-primary)]' : ''}`}
                            >
                                <User size={18} className="group-hover:text-blue-500 transition-colors" />
                                <span className="font-medium">Profile</span>
                            </button>

                            <button
                                onClick={() => { router.push('/models'); setIsOpen(false); setIsProfileExpanded(false); }}
                                className={`w-full flex items-center gap-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all p-3 hover:bg-[var(--input-bg)] rounded-xl group text-sm ${pathname === '/models' ? 'bg-[var(--input-bg)] text-[var(--text-primary)]' : ''}`}
                            >
                                <Brain size={18} className="group-hover:text-blue-500 transition-colors" />
                                <span className="font-medium">Models</span>
                            </button>

                            <button
                                onClick={() => { router.push('/pricing'); setIsOpen(false); setIsProfileExpanded(false); }}
                                className={`w-full flex items-center gap-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all p-3 hover:bg-[var(--input-bg)] rounded-xl group text-sm ${pathname === '/pricing' ? 'bg-[var(--input-bg)] text-[var(--text-primary)]' : ''}`}
                            >
                                <CreditCard size={18} className="group-hover:text-blue-500 transition-colors" />
                                <span className="font-medium">Pricing</span>
                            </button>

                            <button
                                onClick={() => { setIsSettingsOpen(true); setIsProfileExpanded(false); setIsOpen(false); }}
                                className={`w-full flex items-center gap-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all p-3 hover:bg-[var(--input-bg)] rounded-xl group text-sm`}
                            >
                                <Settings size={18} className="group-hover:text-blue-500 transition-colors" />
                                <span className="font-medium">Settings</span>
                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3.5 text-[var(--text-muted)] hover:text-red-500 transition-all p-3 hover:bg-red-500/5 rounded-xl group text-sm border-t border-[var(--sidebar-border)] pt-3 mt-2"
                            >
                                <LogOut size={18} />
                                <span className="font-medium">Log out</span>
                            </button>
                        </div>
                    )}

                    <div
                        onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[var(--input-bg)] cursor-pointer transition-all border border-transparent hover:border-[var(--border)]"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-sm border border-white/10">
                            {profile?.username ? (
                                <span className="text-xs ">{profile.username.substring(0, 2)}</span>
                            ) : (
                                <User size={20} />
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{profile?.username || 'User'}</p>
                            <p className="text-[11px] text-[var(--text-muted)] font-medium truncate flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                {getSelectedModelName()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
                    <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-4xl h-[600px] rounded-3xl relative shadow-2xl overflow-hidden flex flex-col md:flex-row">
                        {/* Settings Sidebar */}
                        <div className="w-full md:w-64 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] p-4 flex flex-col">
                            <button onClick={() => setIsSettingsOpen(false)} className="self-end p-2 hover:bg-white/5 rounded-xl text-gray-400 lg:hidden mb-4">
                                <X size={20} />
                            </button>
                            <nav className="space-y-1">
                                {[
                                    { id: 'general', label: 'General', icon: Settings },
                                    { id: 'notifications', label: 'Notifications', icon: (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg> },
                                    { id: 'personalization', label: 'Personalization', icon: (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg> },
                                    { id: 'apps', label: 'Apps', icon: (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
                                    { id: 'data', label: 'Data controls', icon: (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /><rect width="8" height="8" x="2" y="2" rx="2" /><path d="m9 2 5 10 5-10" /></svg> },
                                    { id: 'security', label: 'Security', icon: (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg> },
                                    { id: 'parental', label: 'Parental controls', icon: (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
                                    { id: 'account', label: 'Account', icon: User },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSettingsTab(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm  transition-all  text-[10px] ${settingsTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-white/5'}`}
                                    >
                                        <item.icon className="w-4 h-4" strokeWidth={settingsTab === item.id ? 3 : 2} />
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)]">
                            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                                <h1 className="text-xl font-bold text-[var(--foreground)]">{settingsTab.replace('-', ' ')}</h1>
                                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hidden lg:block transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-none">
                                {settingsTab === 'general' && (
                                    <>
                                        {/* Appearance */}
                                        <div className="flex items-center justify-between group relative">
                                            <div className="space-y-0.5">
                                                <h3 className="text-sm font-semibold text-[var(--foreground)]">Appearance</h3>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setIsAppearanceDropdownOpen(!isAppearanceDropdownOpen)}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 bg-white/[0.02] border border-white/10 text-sm font-medium text-gray-400 hover:text-white transition-all min-w-[100px] justify-between"
                                                >
                                                    <span>{appearance}</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isAppearanceDropdownOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                                                </button>

                                                {isAppearanceDropdownOpen && (
                                                    <div className="absolute right-0 top-full mt-2 w-[110px] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden py-1 animate-in slide-in-from-top-2 duration-200 z-[110]">
                                                        {['Light', 'Dark', 'System'].map((mode) => (
                                                            <button
                                                                key={mode}
                                                                onClick={() => handleAppearanceChange(mode as any)}
                                                                className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                                                            >
                                                                <span>{mode}</span>
                                                                {appearance === mode && (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M20 6 9 17l-5-5" /></svg>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Accent color */}
                                        <div className="hidden items-center justify-between ">
                                            <div className="space-y-0.5">
                                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Accent color</h3>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-bold">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20" />
                                                <span>Blue</span>
                                            </div>
                                        </div>

                                        {/* Language */}
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Language</h3>
                                            </div>
                                            <select className="bg-transparent text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] outline-none cursor-pointer">
                                                <option className="bg-[var(--card)]">Auto-detect</option>
                                                <option className="bg-[var(--card)]">English</option>
                                                <option className="bg-[var(--card)]">Spanish</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {settingsTab === 'data' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-2 bg-[var(--input-bg)] rounded-2xl border border-[var(--border)] group cursor-pointer hover:border-blue-500/30 transition-all" onClick={() => setIsModelImprovementModalOpen(true)}>
                                            <div>
                                                <h3 className="text-sm font-bold text-[var(--text-primary)]">Improve the model for everyone</h3>
                                                <p className="text-[10px] text-[var(--text-muted)]   mt-1 opacity-60">Help refine neurological outputs</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-blue-500 ">{profile?.improve_model ? 'On' : 'Off'}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)] group-hover:text-blue-500 transition-all"><path d="m9 18 6-6-6-6" /></svg>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-2 border-b border-[var(--border)]">
                                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Shared links</h3>
                                            <button className="px-5 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-xl text-[10px]   hover:bg-white/5 transition-all text-[var(--text-secondary)]">Manage</button>
                                        </div>

                                        <div className="flex items-center justify-between p-2 border-b border-[var(--border)]">
                                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Archived chats</h3>
                                            <button
                                                onClick={() => { fetchArchivedHistory(); setIsArchiveModalOpen(true); }}
                                                className="px-5 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-xl text-[10px]   hover:bg-white/5 transition-all text-[var(--text-secondary)]"
                                            >
                                                Manage
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-2 border-b border-[var(--border)]">
                                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Archive all chats</h3>
                                            <button
                                                onClick={handleArchiveAll}
                                                className="px-5 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-xl text-[10px]   hover:bg-white/5 transition-all text-[var(--text-secondary)]"
                                            >
                                                Archive all
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-2 border-b border-[var(--border)]">
                                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Delete all chats</h3>
                                            <button
                                                onClick={handleDeleteAll}
                                                className="px-5 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px]   hover:bg-red-500/20 transition-all"
                                            >
                                                Delete all
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-2">
                                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Export data</h3>
                                            <button
                                                onClick={() => setIsExportModalOpen(true)}
                                                className="px-5 py-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-xl text-[10px]   hover:bg-white/5 transition-all text-[var(--text-secondary)]"
                                            >
                                                Export
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {settingsTab !== 'general' && settingsTab !== 'data' && (
                                    <div className="py-20 text-center opacity-40">
                                        <div className="w-16 h-16 bg-[var(--input-bg)] rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                            <Cpu size={32} />
                                        </div>
                                        <p className="text-sm  ">{settingsTab.replace('-', ' ')} module under maintenance</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Search Modal */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-[var(--card)] border border-[var(--border)] rounded-[2rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
                        <div className="p-6 border-b border-[var(--border)] flex items-center gap-4">
                            <Search size={20} className="text-blue-500" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search conversations..."
                                className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button
                                onClick={() => setIsSearchOpen(false)}
                                className="p-2 hover:bg-[var(--input-bg)] rounded-xl text-[var(--text-muted)] transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-4 scrollbar-none">
                            <div className="space-y-4">
                                <button
                                    onClick={() => handleNavigation(null)}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-[var(--input-bg)] rounded-2xl transition-all group"
                                >
                                    <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                                        <Plus size={18} strokeWidth={3} />
                                    </div>
                                    <span className="font-bold text-[var(--text-primary)]  text-xs">New chat</span>
                                </button>

                                {filteredSessions.length > 0 ? (
                                    <div className="space-y-1">
                                        <h3 className="text-[10px] font-bold text-[var(--text-muted)] px-4 py-2  mb-1">Recent conversations</h3>
                                        {filteredSessions.map((s) => (
                                            <button
                                                key={s.id}
                                                onClick={() => handleNavigation(s.id)}
                                                className="w-full flex items-center gap-4 p-4 hover:bg-[var(--input-bg)] border border-transparent hover:border-[var(--border)] rounded-2xl transition-all group"
                                            >
                                                <div className="p-2.5 bg-[var(--input-bg)] text-[var(--text-muted)] group-hover:text-blue-500 rounded-xl transition-all">
                                                    <MessageSquare size={18} />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="font-bold text-[var(--text-primary)] text-sm line-clamp-1">{s.title || 'Untitled conversation'}</p>
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)]  mt-1 opacity-60">
                                                        {new Date(s.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center">
                                        <div className="w-12 h-12 bg-[var(--input-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
                                            <Search size={20} className="text-[var(--text-muted)]" />
                                        </div>
                                        <p className="text-sm font-bold text-[var(--text-muted)] ">No neurological matches found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Archived Chats Modal */}
            {isArchiveModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col h-[500px]">
                        <div className="p-7 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]/80 backdrop-blur-xl">
                            <h2 className="text-xl font-bold text-[var(--text-primary)] ">Archived chats</h2>
                            <button onClick={() => setIsArchiveModalOpen(false)} className="p-3 hover:bg-[var(--input-bg)] rounded-2xl transition-all text-[var(--text-muted)] group">
                                <X size={22} className="group-hover:text-blue-500 transition-colors" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-7 scrollbar-none">
                            {archivedSessions.length > 0 ? (
                                <div className="space-y-3">
                                    {archivedSessions.map((s) => (
                                        <div key={s.id} className="flex items-center justify-between p-5 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl group hover:border-blue-500/30 transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                                                    <MessageSquare size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[var(--text-primary)] text-sm">{s.title || 'Untitled Session'}</p>
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)]  mt-1 opacity-60">Archived on {new Date(s.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    await api.post(`/history/${s.id}/archive`);
                                                    fetchArchivedHistory();
                                                    fetchHistory();
                                                }}
                                                className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-bold rounded-xl  hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                                            >
                                                Unarchive
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-40">
                                    <div className="w-20 h-20 bg-[var(--input-bg)] rounded-[2.5rem] flex items-center justify-center mb-6">
                                        <MessageSquare size={32} />
                                    </div>
                                    <p className="text-sm   text-[var(--text-muted)]">You have no archived conversations.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {isExportModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-[2.5rem] p-12 relative shadow-2xl">
                        <h2 className="text-3xl font-bold mb-6 text-[var(--text-primary)] ">Request data export - are you sure?</h2>
                        <ul className="space-y-6 mb-12">
                            {[
                                "Your account details and chats will be included in the export.",
                                "The data will be sent to your registered email in a downloadable file.",
                                "The download link will expire 24 hours after you receive it.",
                                "Processing may take some time. You'll be notified when it's ready."
                            ].map((text, i) => (
                                <li key={i} className="flex gap-4 items-start">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />
                                    <p className="text-sm font-bold text-[var(--text-secondary)] leading-relaxed opacity-80">{text}</p>
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs font-bold text-[var(--text-muted)]  mb-10 opacity-60">To proceed, click "Confirm export" below.</p>
                        <div className="flex gap-5">
                            <button
                                onClick={handleExport}
                                className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-bold text-[13px]  hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                            >
                                Confirm export
                            </button>
                            <button
                                onClick={() => setIsExportModalOpen(false)}
                                className="px-10 py-5 rounded-2xl font-bold text-[var(--text-muted)] hover:text-white transition-all text-sm "
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Model Improvement Modal */}
            {isModelImprovementModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-[2.5rem] p-10 relative shadow-2xl">
                        <h2 className="text-2xl font-bold mb-8 text-[var(--text-primary)] ">Model improvement</h2>

                        <div className="space-y-10">
                            <div className="flex items-start justify-between gap-6">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Improve the model for everyone</h3>
                                    <p className="text-[11px] font-medium text-[var(--text-muted)] leading-relaxed opacity-70">Allow your content to be used to train our models, which makes Astraea better for you and everyone who uses it. We take steps to protect your privacy. <span className="text-blue-500 cursor-pointer hover:underline">Learn more</span></p>
                                </div>
                                <button
                                    onClick={toggleImproveModel}
                                    className={`shrink-0 w-12 h-6 rounded-full relative transition-all shadow-inner ${profile?.improve_model ? 'bg-blue-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${profile?.improve_model ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="space-y-6 pt-6 border-t border-[var(--border)]">
                                <h4 className="text-[10px] font-bold text-[var(--text-muted)] ">Voice configuration</h4>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[var(--text-primary)]">Include your audio recordings</span>
                                    <button className="w-10 h-5 bg-gray-700 rounded-full relative opacity-50 cursor-not-allowed">
                                        <div className="absolute left-1 top-1 w-3 h-3 bg-gray-400 rounded-full" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[var(--text-primary)]">Include your video recordings</span>
                                    <button className="w-10 h-5 bg-gray-700 rounded-full relative opacity-50 cursor-not-allowed">
                                        <div className="absolute left-1 top-1 w-3 h-3 bg-gray-400 rounded-full" />
                                    </button>
                                </div>
                                <p className="text-[10px] font-medium text-[var(--text-muted)] leading-relaxed italic opacity-60">Transcripts and other files are already covered by global improvement protocols. <span className="text-blue-500 cursor-pointer hover:underline">Learn more</span></p>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsModelImprovementModalOpen(false)}
                            className="w-full mt-10 bg-[var(--input-bg)] hover:bg-white/5 border border-[var(--border)] text-[var(--text-primary)] py-4 rounded-2xl font-bold text-xs  transition-all"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
