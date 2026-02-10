"use client";

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Briefcase, FileText, Building2, Sparkles } from 'lucide-react';
import api from '../app/utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ChartRenderer from './ChartRenderer';
import Image from 'next/image';
import logo from '../images/astraea_logo.svg';
import { useRouter } from 'next/navigation';

interface ChatProps {
    sessionId: string | null;
    onSessionCreated: (id: string) => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
}

// Candidate-only apps
const candidateApps = [
    { id: 'jobs-dashboard', name: 'Jobs Dashboard', icon: Briefcase, desc: 'Track applications', path: '/jobs/dashboard', color: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400' },
    { id: 'resume', name: 'My Resume', icon: FileText, desc: 'Build your CV', path: '/resume/builder', color: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-400' },
];

// AI Job Assistant prompts
const jobAssistantPrompts = [
    "Find software engineer jobs in San Francisco",
    "Show me remote marketing positions",
    "What jobs match my skills?",
    "Help me improve my resume for tech roles",
    "Find entry-level data science jobs",
    "Show me jobs with salary above $100k",
];

// Organization-only apps
const organizationApps = [
    { id: 'recruiter', name: 'Hire Talent', icon: Building2, desc: 'Post jobs', path: '/organization/dashboard', color: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400' },
];

// Common apps for all users
const commonApps = [
    { id: 'models', name: 'AI Models', icon: Sparkles, desc: 'Custom models', path: '/models', color: 'from-orange-500/20 to-amber-500/20', iconColor: 'text-orange-400' },
];

export default function Chat({ sessionId, onSessionCreated, selectedModel, onModelChange }: ChatProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [generationTime, setGenerationTime] = useState<number | null>(null);
    const [customModels, setCustomModels] = useState<any[]>([]);
    const [userType, setUserType] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchCustomModels();
        fetchUserType();
    }, []);

    const fetchUserType = async () => {
        try {
            const res = await api.get('/profile');
            setUserType(res.data.user_type);
        } catch (err) {
            console.error('Failed to fetch user type', err);
        }
    };

    useEffect(() => {
        if (sessionId) {
            loadSession(sessionId);
        } else {
            setMessages([]);
        }
    }, [sessionId]);

    const fetchCustomModels = async () => {
        try {
            const res = await api.get('/models');
            setCustomModels(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadSession = async (id: string) => {
        try {
            const res = await api.get(`/history/${id}`);
            setMessages(res.data);
            scrollToBottom('smooth');
        } catch (err) {
            console.error(err);
        }
    };

    const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior });
        }, 50);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input;
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);
        setGenerationTime(null);
        const startTime = Date.now();

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ message: userMessage, session_id: sessionId, model: selectedModel }),
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';
            let isFirstChunk = true;

            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);

                if (isFirstChunk && text.startsWith("SESSION_ID:")) {
                    const parts = text.split('\n');
                    const sessionLine = parts[0];
                    const newSessionId = sessionLine.split(':')[1];

                    if (!sessionId) {
                        onSessionCreated(newSessionId);
                    }

                    const content = parts.slice(1).join('\n');
                    assistantMessage += content;
                    isFirstChunk = false;
                } else {
                    assistantMessage += text;
                }

                setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantMessage };
                    return newMessages;
                });
                scrollToBottom('auto');
            }
            const endTime = Date.now();
            setGenerationTime((endTime - startTime) / 1000);
        } catch (error) {
            console.error('Error:', error);
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
        } finally {
            setLoading(false);
            scrollToBottom('smooth');
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--background)]">
            {/* Header - Smaller */}
            <div className="h-14 px-4 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl sticky top-0 z-10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                         <Image src={logo} alt="Astraea Logo" className='w-6 h-6 object-contain' />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Astraea</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Connected
                            </p>
                            <div className="h-2 w-px bg-[var(--border)]" />
                            <select
                                value={selectedModel}
                                onChange={(e) => onModelChange(e.target.value)}
                                className="bg-transparent text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-none rounded outline-none cursor-pointer"
                            >
                                <optgroup label="Core" className="bg-[var(--card)]">
                                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                    <option value="gpt-4">GPT-4 Pro</option>
                                </optgroup>
                                {customModels.length > 0 && (
                                    <optgroup label="Custom" className="bg-[var(--card)]">
                                        {customModels.map(cm => (
                                            <option key={cm.id} value={`custom-${cm.id}`}>{cm.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 lg:p-6 space-y-6 scrollbar-none">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                             <Image src={logo} alt="Astraea Logo" className='w-24 h-24 object-contain' />
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)] mb-2">How can I help you today?</h1>
                        <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">I'm Astraea, your AI companion. Start a conversation or try one of the apps below.</p>
                        
                        {/* Job Assistant Prompts - Only for candidates */}
                        {userType === 'candidate' && (
                            <div className="mt-6 max-w-lg mx-auto">
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-3">Try asking about jobs</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {jobAssistantPrompts.map((prompt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setInput(prompt)}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                                <Bot size={14} />
                            </div>
                        )}

                        <div
                            className={`max-w-[92%] lg:max-w-[80%] p-3 lg:p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm transition-all ${msg.role === 'user'
                                ? 'bg-blue-600 text-white ml-auto'
                                : 'bg-[var(--input-bg)] text-[var(--text-primary)] mr-auto border border-[var(--border)]'
                                }`}
                        >
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const content = String(children).trim();

                                        const isChartTag = className === 'language-json-chart' || className?.includes('json-chart');
                                        let looksLikeChart = false;
                                        if (className === 'language-json') {
                                            try {
                                                const parsed = JSON.parse(content);
                                                if (parsed.type && parsed.data && Array.isArray(parsed.data)) {
                                                    looksLikeChart = true;
                                                }
                                            } catch (e) { }
                                        }

                                        if (!inline && (isChartTag || looksLikeChart)) {
                                            return <ChartRenderer content={content} />;
                                        }

                                        return !inline && match ? (
                                            <div className="my-3 rounded-xl overflow-hidden border border-[var(--border)] shadow-lg">
                                                <div className="bg-[var(--input-bg)] px-3 py-2 border-b border-[var(--border)]">
                                                    <span className="text-[10px] text-[var(--text-muted)]">{match[1]}</span>
                                                </div>
                                                <SyntaxHighlighter
                                                    style={vscDarkPlus}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '12px' }}
                                                    {...props}
                                                >
                                                    {content}
                                                </SyntaxHighlighter>
                                            </div>
                                        ) : (
                                            <code className="bg-blue-500/10 px-1.5 py-0.5 rounded text-blue-300 font-mono text-[11px]" {...props}>
                                                {children}
                                            </code>
                                        )
                                    },
                                    table({ children }) {
                                        return (
                                            <div className="my-4 overflow-x-auto border border-[var(--border)] rounded-xl">
                                                <table className="w-full text-left border-collapse text-xs">{children}</table>
                                            </div>
                                        )
                                    },
                                    thead({ children }) {
                                        return <thead className="bg-[var(--input-bg)] text-[var(--text-muted)]">{children}</thead>
                                    },
                                    th({ children }) {
                                        return <th className="px-3 py-2 text-[10px] border-b border-[var(--border)]">{children}</th>
                                    },
                                    td({ children }) {
                                        return <td className="px-3 py-2 text-xs border-b border-[var(--border)] text-[var(--text-secondary)]">{children}</td>
                                    },
                                    p({ children }) {
                                        return <p className="mb-3 last:mb-0">{children}</p>
                                    },
                                    ul({ children }) {
                                        return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
                                    },
                                    ol({ children }) {
                                        return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
                                    },
                                    a({ children, href }) {
                                        return <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
                                    },
                                    blockquote({ children }) {
                                        return <blockquote className="border-l-2 border-blue-500/20 pl-4 italic text-[var(--text-secondary)] my-4 py-1">{children}</blockquote>
                                    }
                                }}
                            >
                                {msg.content}
                            </ReactMarkdown>
                            {msg.role === 'assistant' && index === messages.length - 1 && generationTime && !loading && (
                                <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                                    <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                                    {generationTime.toFixed(2)}s
                                </div>
                            )}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                                <User size={14} />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area with Apps */}
            <div className="p-3 lg:p-6 border-t border-[var(--border)] bg-[var(--background)]">
                <div className="max-w-3xl mx-auto">
                    {/* Quick Apps - Only show when no messages */}
                    {messages.length === 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                            {/* Show candidate apps for candidates */}
                            {userType === 'candidate' && candidateApps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => router.push(app.path)}
                                    className="flex items-center gap-2 p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] hover:border-blue-500/30 hover:bg-white/5 transition-all text-left group"
                                >
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center shrink-0`}>
                                        <app.icon size={16} className={app.iconColor} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{app.name}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] truncate">{app.desc}</p>
                                    </div>
                                </button>
                            ))}
                            {/* Show organization apps for organizations */}
                            {userType === 'organization' && organizationApps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => router.push(app.path)}
                                    className="flex items-center gap-2 p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] hover:border-blue-500/30 hover:bg-white/5 transition-all text-left group"
                                >
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center shrink-0`}>
                                        <app.icon size={16} className={app.iconColor} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{app.name}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] truncate">{app.desc}</p>
                                    </div>
                                </button>
                            ))}
                            {/* Show common apps for all */}
                            {commonApps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => router.push(app.path)}
                                    className="flex items-center gap-2 p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border)] hover:border-blue-500/30 hover:bg-white/5 transition-all text-left group"
                                >
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center shrink-0`}>
                                        <app.icon size={16} className={app.iconColor} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{app.name}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] truncate">{app.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="relative">
                        <div className="relative flex items-center bg-[var(--input-bg)] rounded-2xl border border-[var(--border)] focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                            <input
                                type="text"
                                className="w-full bg-transparent text-[var(--text-primary)] py-3.5 pl-4 pr-12 focus:outline-none placeholder:text-[var(--text-muted)] text-sm"
                                placeholder="Message Astraea..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                disabled={loading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-30 active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-3">
                        <p className="text-[10px] text-[var(--text-muted)] opacity-50">
                            Astraea may produce inaccurate information • v2.0
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
