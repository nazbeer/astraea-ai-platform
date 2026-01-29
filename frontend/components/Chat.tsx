"use client";

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Cpu } from 'lucide-react';
import api from '../app/utils/api';

interface ChatProps {
    sessionId: number | null;
    onSessionCreated: (id: number) => void;
}

export default function Chat({ sessionId, onSessionCreated }: ChatProps) {
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (sessionId) {
            loadSession(sessionId);
        } else {
            setMessages([]);
        }
    }, [sessionId]);

    const loadSession = async (id: number) => {
        try {
            const res = await api.get(`/history/${id}`);
            setMessages(res.data);
            scrollToBottom();
        } catch (err) {
            console.error(err);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input;
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ message: userMessage, session_id: sessionId }),
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
                    const newSessionId = parseInt(sessionLine.split(':')[1]);

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
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/50 backdrop-blur-sm">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Cpu size={20} />
                </div>
                <div>
                    <h2 className="font-bold text-white">Astraea AI</h2>
                    <p className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Online
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                        <Cpu size={64} className="mb-4 text-gray-700" />
                        <p>Start a conversation with Astraea</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shrink-0 mt-1">
                                <Bot size={16} />
                            </div>
                        )}

                        <div
                            className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-md ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-gray-800/80 border border-gray-700/50 text-gray-100 rounded-bl-none'
                                }`}
                        >
                            {msg.content}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-gray-300 shrink-0 mt-1">
                                <User size={16} />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur">
                <div className="max-w-4xl mx-auto relative flex items-center">
                    <input
                        type="text"
                        className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl py-4 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-lg placeholder-gray-600"
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        disabled={loading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-gray-600">Astraea AI can make mistakes. Consider checking important information.</p>
                </div>
            </div>
        </div>
    );
}
