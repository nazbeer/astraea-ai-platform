"use client";

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Cpu, Loader2 } from 'lucide-react';
import api from '../app/utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ChartRenderer from './ChartRenderer';
import Image from 'next/image';
import logo from '../images/astraea_logo.svg';

interface ChatProps {
    sessionId: string | null;
    onSessionCreated: (id: string) => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
}

export default function Chat({ sessionId, onSessionCreated, selectedModel, onModelChange }: ChatProps) {
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [generationTime, setGenerationTime] = useState<number | null>(null);
    const [customModels, setCustomModels] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchCustomModels();
    }, []);

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

                // Handle Session ID prefix in first chunk if new session
                if (isFirstChunk && text.startsWith("SESSION_ID:")) {
                    const parts = text.split('\n');
                    const sessionLine = parts[0];
                    const newSessionId = sessionLine.split(':')[1];

                    if (!sessionId) {
                        onSessionCreated(newSessionId);
                    }

                    // The rest is content
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
            {/* Header */}
            <div className="p-4 pl-14 lg:pl-8 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl sticky top-0 z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-[20%] bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                         <Image
                            src={logo}
                            alt="Astraea Logo"
                            className='w-18 h-18 object-contain'
                        />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-[var(--text-primary)] ">Astraea</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-[var(--text-muted)] font-bold flex items-center gap-1.5 ">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
                                Connected
                            </p>
                            <div className="h-3 w-px bg-[var(--border)]" />
                            <select
                                value={selectedModel}
                                onChange={(e) => onModelChange(e.target.value)}
                                className="bg-transparent text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-none rounded-lg outline-none transition-all cursor-pointer "
                            >
                                <optgroup label="Core" className="bg-[var(--card)]">
                                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                    <option value="gpt-4">GPT-4 Pro</option>
                                </optgroup>
                                {customModels.length > 0 && (
                                    <optgroup label="Tuned Units" className="bg-[var(--card)]">
                                        {customModels.map(cm => (
                                            <option key={cm.id} value={`custom-${cm.id}`}>
                                                {cm.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 scrollbar-none">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 rounded-[25%] flex items-center justify-center mb-8 shadow-2xl">
                             <Image
                            src={logo}
                            alt="Astraea Logo"
                            className='w-36 h-36 object-contain'
                        />
                        </div>
                        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3 ">How can I help you today?</h1>
                        <p className="text-[var(--text-secondary)] max-w-sm leading-relaxed font-medium">I'm Astraea, your neurological companion. Choose a cluster to begin the conversation.</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex gap-4 lg:gap-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                                <Bot size={16} />
                            </div>
                        )}

                        <div
                            className={`max-w-[90%] lg:max-w-[80%] p-4 lg:p-6 rounded-[2rem] text-[15px] leading-[1.6] shadow-sm transition-all ${msg.role === 'user'
                                ? 'bg-blue-600 text-white ml-auto shadow-blue-500/10'
                                : 'bg-[var(--input-bg)] text-[var(--text-primary)] mr-auto border border-[var(--border)]'
                                }`}
                        >
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const content = String(children).trim();

                                        // Detect if this is a chart
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
                                            <div className="my-4 rounded-[1.5rem] overflow-hidden border border-[var(--border)] shadow-xl">
                                                <div className="bg-[var(--input-bg)] px-5 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-[var(--text-muted)] ">{match[1]}</span>
                                                </div>
                                                <SyntaxHighlighter
                                                    style={vscDarkPlus}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '13px' }}
                                                    {...props}
                                                >
                                                    {content}
                                                </SyntaxHighlighter>
                                            </div>
                                        ) : (
                                            <code className="bg-blue-500/10 dark:bg-white/10 px-2 py-1 rounded-md text-blue-600 dark:text-blue-300 font-mono text-xs font-bold" {...props}>
                                                {children}
                                            </code>
                                        )
                                    },
                                    table({ children }) {
                                        return (
                                            <div className="my-6 overflow-x-auto border border-[var(--border)] rounded-2xl">
                                                <table className="w-full text-left border-collapse">{children}</table>
                                            </div>
                                        )
                                    },
                                    thead({ children }) {
                                        return <thead className="bg-[var(--input-bg)] text-[var(--text-muted)] font-bold">{children}</thead>
                                    },
                                    th({ children }) {
                                        return <th className="px-5 py-4 text-xs border-b border-[var(--border)] ">{children}</th>
                                    },
                                    td({ children }) {
                                        return <td className="px-5 py-4 text-sm border-b border-[var(--border)] text-[var(--text-secondary)]">{children}</td>
                                    },
                                    p({ children }) {
                                        return <p className="mb-4 last:mb-0">{children}</p>
                                    },
                                    ul({ children }) {
                                        return <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
                                    },
                                    ol({ children }) {
                                        return <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
                                    },
                                    a({ children, href }) {
                                        return <a href={href} className="text-blue-400 hover:underline hover:text-blue-300 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>
                                    },
                                    blockquote({ children }) {
                                        return <blockquote className="border-l-4 border-blue-500/20 pl-6 italic text-[var(--text-secondary)] my-6 py-1">{children}</blockquote>
                                    }
                                }}
                            >
                                {msg.content}
                            </ReactMarkdown>
                            {msg.role === 'assistant' && index === messages.length - 1 && generationTime && !loading && (
                                <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-bold ">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40"></div>
                                    Inference Time: {generationTime.toFixed(2)}s
                                </div>
                            )}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                                <User size={16} />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Inputarea */}
            <div className="p-4 lg:p-10">
                <div className="max-w-3xl mx-auto relative group">
                    <div className="relative flex items-center bg-[var(--input-bg)] rounded-[2.5rem] border border-[var(--border)] focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all shadow-2xl overflow-hidden">
                        <input
                            type="text"
                            className="w-full bg-transparent text-[var(--text-primary)] py-5 pl-8 pr-16 focus:outline-none placeholder:text-[var(--text-muted)] text-sm font-semibold"
                            placeholder="Message Astraea..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            disabled={loading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            className="absolute right-2 p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] transition-all disabled:opacity-20 active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                        </button>
                    </div>
                </div>
                <div className="text-center mt-6">
                    <p className="text-[10px] text-[var(--text-muted)] font-bold  opacity-60">
                        Astraea Core may pulse with inaccuracies • Protocol 4.0
                    </p>
                </div>
            </div>
        </div>
    );
}
