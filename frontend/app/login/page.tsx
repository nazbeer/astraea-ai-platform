"use client";

import { useRouter } from 'next/navigation';
import api from '../utils/api';
import Image from 'next/image';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useState, useEffect } from 'react';
import logo from '@/images/astraea_logo.svg';
import { 
  MessageSquare, 
  Bot, 
  Sparkles, 
  Zap, 
  Shield, 
  ChevronRight,
  Play,
  Cpu,
  Globe,
  Workflow
} from 'lucide-react';

export default function LandingPage() {
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        try {
            if (!credentialResponse.credential) return;
            const res = await api.post('/auth/google', {
                token: credentialResponse.credential
            });
            localStorage.setItem('token', res.data.access_token);
            window.location.href = '/';  // Full reload to refresh auth state
        } catch (err: any) {
            const errorMsg = err.response?.data?.detail || 'Authentication failed';
            alert(errorMsg);
        }
    };

    const features = [
        {
            icon: <MessageSquare className="w-6 h-6" />,
            title: "Multi-Model Chat",
            desc: "Access GPT-4, Claude, Gemini, and custom models in one unified interface"
        },
        {
            icon: <Bot className="w-6 h-6" />,
            title: "AI Agents",
            desc: "Deploy autonomous agents that can perform complex tasks and workflows"
        },
        {
            icon: <Workflow className="w-6 h-6" />,
            title: "Workflow Builder",
            desc: "Create custom AI pipelines with our visual no-code workflow designer"
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: "Enterprise Security",
            desc: "SOC 2 compliant with end-to-end encryption for all conversations"
        }
    ];

    const models = [
        { name: "GPT-4", provider: "OpenAI", color: "from-green-400 to-blue-500" },
        { name: "Claude 3", provider: "Anthropic", color: "from-orange-400 to-red-500" },
        { name: "Gemini Pro", provider: "Google", color: "from-blue-400 to-purple-500" },
        { name: "Llama 3", provider: "Meta", color: "from-purple-400 to-pink-500" }
    ];

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden font-sans">
            {/* Navigation */}
            <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        
                            {/* <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur-lg opacity-50" />
                            <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div> */}
                            <Image
                            src={logo}
                            alt="Astraea Logo"
                            className='w-10 h-10 object-contain'/>
                        
                        <span className="text-2xl font-bold tracking-tight">
                            Astraea
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        {/* <a href="#models" className="hover:text-white transition-colors">Models</a> */}
                    </div>
                    <div className="hidden md:block">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => {}}
                            theme="filled_black"
                            size="medium"
                            text="signin_with"
                            shape="pill"
                        />
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.15),transparent_50%)]" />
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse delay-1000" />
                    
                    {/* Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)]" />
                </div>

                <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 mb-8 hover:bg-white/10 transition-colors cursor-pointer">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        New: Agent Workflows 2.0 is now live
                        <ChevronRight className="w-4 h-4" />
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.1]">
                        One platform.
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                            Every AI model.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                        Chat with the world's best AI models, build autonomous agents, 
                        and create powerful workflows—all in one place.
                    </p>

                    {/* Google SSO Button - Prominent */}
                    <div className="flex flex-col items-center gap-4 mb-12">
                        <div 
                            className="relative group"
                            onMouseEnter={() => setIsHovering(true)}
                            onMouseLeave={() => setIsHovering(false)}
                        >
                            <div className={`absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur transition-all duration-500 ${isHovering ? 'opacity-100' : 'opacity-70'}`} />
                            <div className="relative bg-black rounded-full p-1">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => alert('Login failed')}
                                    theme="filled_black"
                                    size="large"
                                    text="signup_with"
                                    shape="pill"
                                    width="280"
                                />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">
                            Free to start • No credit card required
                        </p>
                    </div>

                    {/* Model Pills */}
                    <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                        {models.map((model, idx) => (
                            <div 
                                key={idx}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-all cursor-default"
                            >
                                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${model.color}`} />
                                <span className="text-gray-300">{model.name}</span>
                                <span className="text-gray-600">•</span>
                                <span className="text-gray-500">{model.provider}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
                        <div className="w-1 h-2 bg-white/40 rounded-full" />
                    </div>
                </div>
            </section>

            {/* Chat Interface Preview */}
            <section className="py-24 relative">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-gray-900 to-black shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-purple-600/10" />
                        
                        {/* Browser Chrome */}
                        <div className="relative border-b border-white/10 bg-white/5 px-4 py-3 flex items-center gap-2">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            </div>
                            <div className="flex-1 text-center">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-black/30 text-xs text-gray-500">
                                    <Globe className="w-3 h-3" />
                                    app.aiastraea.com/chat
                                </div>
                            </div>
                        </div>

                        {/* Chat Content */}
                        <div className="relative p-8 grid md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="bg-white/5 rounded-2xl rounded-tl-none px-4 py-3 max-w-sm">
                                        <p className="text-sm text-gray-300">Hello! I'm Astraea. I can help you with coding, analysis, creative writing, or connect you to specialized AI agents. What would you like to explore today?</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4 justify-end">
                                    <div className="bg-blue-600/20 border border-blue-500/30 rounded-2xl rounded-tr-none px-4 py-3 max-w-sm">
                                        <p className="text-sm text-blue-100">Help me analyze this sales data and create a forecast model</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs">You</span>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="bg-white/5 rounded-2xl rounded-tl-none px-4 py-3 max-w-sm">
                                        <p className="text-sm text-gray-300">I'll analyze your data and create a forecast. I can also deploy a Data Analyst Agent to automate this workflow for future reports.</p>
                                        <div className="mt-3 flex gap-2">
                                            <span className="px-2 py-1 rounded-md bg-blue-500/20 text-xs text-blue-300 border border-blue-500/30">📊 Analysis</span>
                                            <span className="px-2 py-1 rounded-md bg-purple-500/20 text-xs text-purple-300 border border-purple-500/30">🤖 Agent</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-2xl" />
                                <div className="relative bg-black/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Cpu className="w-5 h-5 text-blue-400" />
                                        Available Agents
                                    </h3>
                                    <div className="space-y-3">
                                        {['Data Analyst', 'Code Assistant', 'Research Agent', 'Creative Writer'].map((agent, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                                                        <Bot className="w-4 h-4 text-blue-400" />
                                                    </div>
                                                    <span className="text-sm font-medium">{agent}</span>
                                                </div>
                                                <Zap className="w-4 h-4 text-gray-600 group-hover:text-yellow-400 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need</h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            From simple chats to complex autonomous workflows, Astraea scales with your needs.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, idx) => (
                            <div 
                                key={idx}
                                className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/10 to-transparent" />
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                        Ready to supercharge your<br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            AI workflow?
                        </span>
                    </h2>
                    <p className="text-xl text-gray-400 mb-8">
                        Join thousands of developers, researchers, and creators using Astraea.
                    </p>
                    
                    <div className="flex flex-col items-center gap-4">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => alert('Login failed')}
                            theme="filled_black"
                            size="large"
                            text="signup_with"
                            shape="pill"
                            width="250"
                        />
                        <p className="text-sm text-gray-500">
                            Start free • Pro plans from $20/month
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-black py-12">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="hidden md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                               <Image src={logo} alt="Astraea Logo" className='w-8 h-8 object-contain'/>
                                <span className="text-lg font-bold">Astraea</span>
                            </div>
                            <p className="text-gray-500 text-sm">
                                The unified platform for AI models and autonomous agents.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4 text-sm">Product</h4>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li className="hover:text-white cursor-pointer">Chat</li>
                                <li className="hover:text-white cursor-pointer">Models</li>
                            </ul>
                        </div>
                    </div>
                    <div className=" text-center text-sm text-gray-600">
                        © 2024 Astraea AI. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}