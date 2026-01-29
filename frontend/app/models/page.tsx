"use client";

import { useEffect, useState } from 'react';
import api from '../utils/api';
import Sidebar from '@/components/Sidebar';
import {
    Brain, Plus, Play, CheckCircle2, Loader2,
    Upload, FileText, ShieldCheck, X, Trash2,
    Globe, Server, ChevronRight, Search, Filter, Settings, Activity, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ModelsPage() {
    const [models, setModels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedModel, setSelectedModel] = useState<any>(null);
    const [newModelName, setNewModelName] = useState('');
    const [editModel, setEditModel] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editBaseModel, setEditBaseModel] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [trainingData, setTrainingData] = useState('');
    const [datasetUrl, setDatasetUrl] = useState('');

    // File upload states
    const [uploadingModelId, setUploadingModelId] = useState<number | null>(null);
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'safe' | 'error'>('idle');
    const [scanMessage, setScanMessage] = useState('');
    const [isTraining, setIsTraining] = useState<number | null>(null);

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
            const res = await api.get('/models');
            const modelsWithFiles = await Promise.all(res.data.map(async (m: any) => {
                const filesRes = await api.get(`/models/${m.id}/files`);
                return { ...m, files: filesRes.data };
            }));
            setModels(modelsWithFiles);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createModel = async () => {
        if (!newModelName.trim()) return;
        try {
            const res = await api.post('/models', {
                name: newModelName,
                description: 'Custom Astraea variant'
            });
            const newModel = { ...res.data, files: [] };
            setModels([...models, newModel]);
            setNewModelName('');
            setIsCreating(false);
            setSelectedModel(newModel);
        } catch (err) {
            console.error(err);
        }
    };

    const deleteModel = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this agent? All training data will be lost.')) return;
        try {
            await api.delete(`/models/${id}`);
            setModels(models.filter(m => m.id !== id));
            if (selectedModel?.id === id) setSelectedModel(null);
        } catch (err) {
            console.error(err);
        }
    };

    const updateModel = async () => {
        if (!editModel) return;
        try {
            const res = await api.patch(`/models/${editModel.id}`, {
                name: editName,
                description: editDesc,
                base_model: editBaseModel,
                status: editStatus
            });
            setModels(models.map(m => m.id === editModel.id ? { ...m, ...res.data } : m));
            setEditModel(null);
        } catch (err) {
            console.error(err);
        }
    };

    const startEditing = (m: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditModel(m);
        setEditName(m.name);
        setEditDesc(m.description || '');
        setEditBaseModel(m.base_model);
        setEditStatus(m.status);
    };

    const handleFileUpload = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanStatus('scanning');
        setScanMessage('Scanning for scripts...');
        await new Promise(r => setTimeout(r, 1000));

        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post(`/models/${id}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setScanStatus('safe');
            setScanMessage('File indexed successfully');
            fetchModels();
            // Update selected model local state if it's the one open
            if (selectedModel?.id === id) {
                const filesRes = await api.get(`/models/${id}/files`);
                setSelectedModel({ ...selectedModel, files: filesRes.data });
            }
            setTimeout(() => setScanStatus('idle'), 3000);
        } catch (err: any) {
            setScanStatus('error');
            setScanMessage(err.response?.data?.detail || 'Upload failed');
        }
    };

    const fetchFromUrl = async (id: number) => {
        if (!datasetUrl.trim()) return;
        setScanStatus('scanning');
        setScanMessage('Connecting to data source...');
        try {
            await api.post(`/models/${id}/fetch-url`, { training_data: datasetUrl });
            setScanStatus('safe');
            setScanMessage('External dataset integrated');
            setDatasetUrl('');
            fetchModels();
            if (selectedModel?.id === id) {
                const filesRes = await api.get(`/models/${id}/files`);
                setSelectedModel({ ...selectedModel, files: filesRes.data });
            }
            setTimeout(() => setScanStatus('idle'), 3000);
        } catch (err: any) {
            setScanStatus('error');
            setScanMessage(err.response?.data?.detail || 'Fetch failed');
        }
    };

    const trainModel = async (id: number) => {
        setIsTraining(id);
        try {
            await api.post(`/models/${id}/train`, { training_data: trainingData });
            await fetchModels();
            setTrainingData('');
            alert('Model successfully optimized with new knowledge.');
        } catch (err) {
            console.error(err);
        } finally {
            setIsTraining(null);
        }
    };

    return (
        <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] font-sans overflow-hidden">
            <Sidebar currentSessionId={null} onSelectSession={() => { }} selectedModel="gpt-4o-mini" />

            <main className="flex-1 flex flex-col pt-20 lg:pt-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-none">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-[var(--text-primary)] ">Intelligence fleet</h1>
                                <p className="text-sm text-[var(--text-muted)] mt-2  opacity-70">Manage and deploy custom-tuned neurological clusters.</p>
                            </div>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="group flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 rounded-2xl transition-all font-bold shadow-xl shadow-blue-500/20 active:scale-95 text-xs "
                            >
                                <Plus size={18} strokeWidth={3} />
                                <span>Create model</span>
                            </button>
                        </div>

                        {/* Inventory Table */}
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--input-bg)]">
                                        <th className="px-6 py-5 text-[12px] font-bold text-[var(--text-muted)] ">Identity</th>
                                        <th className="px-6 py-5 text-[12px] font-bold text-[var(--text-muted)] ">Status</th>
                                        <th className="px-6 py-5 text-[12px] font-bold text-[var(--text-muted)] ">Inferences</th>
                                        <th className="px-6 py-5 text-[12px] font-bold text-[var(--text-muted)] ">Resources</th>
                                        <th className="px-6 py-5 text-[12px] font-bold text-[var(--text-muted)] ">Created</th>
                                        <th className="px-6 py-5 text-[12px] font-bold text-[var(--text-muted)]  text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {models.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center text-[var(--text-muted)] text-sm font-bold opacity-60 ">
                                                No models initialized. Deployed units will appear here.
                                            </td>
                                        </tr>
                                    )}
                                    {models.map((m) => (
                                        <tr
                                            key={m.id}
                                            onClick={() => setSelectedModel(m)}
                                            className="group hover:bg-[var(--input-bg)] transition-all cursor-pointer"
                                        >
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                                                        <Brain size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[var(--text-primary)] text-[14px]">{m.name}</div>
                                                        <div className="text-[var(--text-muted)] text-[11px]  mt-1 opacity-80 underline underline-offset-4 decoration-blue-500/30">Base: {m.base_model}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full text-[10px] font-bold border  ${m.status === 'Ready' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'Ready' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                                                    {m.status}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-xs font-bold text-[var(--text-secondary)]">
                                                    {m.usage_count || 0} calls
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-xs font-bold text-[var(--text-secondary)]">
                                                    {m.files?.length || 0} resources
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-xs text-[var(--text-muted)] font-bold">
                                                    {new Date(m.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2 transition-opacity">
                                                    <button
                                                        onClick={(e) => startEditing(m, e)}
                                                        className="p-2.5 text-muted hover:bg-blue-500/10 hover:text-blue-500 rounded-xl transition-all"
                                                        title="Edit details"
                                                    >
                                                        <Settings size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedModel(m)}
                                                        className="p-2.5 text-muted hover:bg-blue-500/10 hover:text-blue-500 rounded-xl transition-all"
                                                        title="Train model"
                                                    >
                                                        <Server size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => deleteModel(m.id, e)}
                                                        className="p-2.5 text-muted hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                                                        title="Delete node"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Architecture Footer */}
                        <div className="mt-20 border-t border-[var(--border)] pt-10 flex flex-col md:flex-row gap-16 text-[var(--text-muted)] ">
                            <div className="max-w-xs">
                                <h4 className="text-[var(--text-primary)] text-xs font-bold mb-4 ">Node management</h4>
                                <p className="text-[11px] leading-relaxed ">Configure internal behavioral weights and supply custom knowledge shards to refine unit logic.</p>
                            </div>
                            <div className="max-w-sm">
                                <h4 className="text-[var(--text-primary)] text-xs font-bold mb-4 ">Compliance protocols</h4>
                                <p className="text-[11px] leading-relaxed ">Every dataset undergoes multi-layer validation to ensure logical consistency and neurological safety protocols.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Slide-over Training Panel */}
            <AnimatePresence>
                {selectedModel && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedModel(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full max-w-xl bg-[var(--card)] border-l border-[var(--border)] z-[70] shadow-2xl flex flex-col"
                        >
                            <div className="p-7 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]/80 backdrop-blur-xl">
                                <div className="flex items-center gap-5">
                                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl shadow-sm">
                                        <Brain size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-[var(--text-primary)] ">{selectedModel.name}</h2>
                                        <p className="text-[var(--text-muted)] text-[10px] font-bold  mt-0.5">Tuning environment 4.0</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedModel(null)} className="p-3 hover:bg-[var(--input-bg)] rounded-2xl transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                    <X size={22} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-7 lg:p-10 space-y-12 scrollbar-none">
                                {/* Activity Stats */}
                                <section>
                                    <h3 className="text-[10px] font-bold text-[var(--text-muted)] mb-6 flex items-center gap-2 ">
                                        <Activity size={16} /> Inference metrics
                                    </h3>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="bg-[var(--input-bg)] border border-[var(--border)] p-6 rounded-[2rem] shadow-sm">
                                            <p className="text-[10px] text-[var(--text-muted)] font-bold  mb-2">Total Calls</p>
                                            <p className="text-3xl font-bold text-[var(--text-primary)] ">{selectedModel.usage_count || 0}</p>
                                        </div>
                                        <div className="bg-[var(--input-bg)] border border-[var(--border)] p-6 rounded-[2rem] shadow-sm">
                                            <p className="text-[10px] text-[var(--text-muted)] font-bold  mb-2">Base unit</p>
                                            <p className="text-sm font-bold text-[var(--text-secondary)]  truncate">{selectedModel.base_model}</p>
                                        </div>
                                    </div>
                                </section>

                                {/* Local Knowledge */}
                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-2 ">
                                            <FileText size={16} /> Knowledge base
                                        </h3>
                                        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl transition-all text-[11px] font-bold  shadow-lg shadow-blue-500/20">
                                            Link resource
                                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(selectedModel.id, e)} />
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {selectedModel.files?.map((f: any) => (
                                            <div key={f.id} className="flex items-center justify-between p-4 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl group transition-all hover:border-blue-500/30">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-background border border-[var(--border)] rounded-xl text-[var(--text-muted)] group-hover:text-blue-500 transition-colors shadow-sm">
                                                        <FileText size={16} />
                                                    </div>
                                                    <span className="text-xs font-bold text-[var(--text-primary)]">{f.filename}</span>
                                                </div>
                                                <ShieldCheck size={16} className="text-green-500/40" />
                                            </div>
                                        ))}
                                        {selectedModel.files?.length === 0 && (
                                            <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-3xl opacity-40">
                                                <p className="text-[11px] font-bold text-[var(--text-muted)] ">No local documentation provided.</p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Ingestion */}
                                <section>
                                    <h3 className="text-[10px] font-bold text-[var(--text-muted)] mb-6 flex items-center gap-2 ">
                                        <Globe size={16} /> External ingestion
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                placeholder="Enter dataset URL..."
                                                className="flex-1 bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl px-5 py-4 text-sm focus:border-blue-500/50 outline-none transition-all placeholder:text-[var(--text-muted)] font-bold text-[var(--text-primary)]"
                                                value={datasetUrl}
                                                onChange={(e) => setDatasetUrl(e.target.value)}
                                            />
                                            <button
                                                onClick={() => fetchFromUrl(selectedModel.id)}
                                                className="bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--input-bg)] text-[var(--text-primary)] px-6 py-4 rounded-2xl text-[11px] font-bold  transition-all shadow-sm"
                                            >
                                                Fetch
                                            </button>
                                        </div>
                                        {scanStatus !== 'idle' && (
                                            <div className={`p-5 rounded-2xl border flex items-center gap-4 animate-in fade-in slide-in-from-top-2 shadow-sm ${scanStatus === 'scanning' ? 'bg-blue-500/5 border-blue-500/20 text-blue-500' :
                                                scanStatus === 'safe' ? 'bg-green-500/5 border-green-500/20 text-green-600' :
                                                    'bg-red-500/5 border-red-500/20 text-red-600'
                                                }`}>
                                                {scanStatus === 'scanning' ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                                                <span className="text-[10px] font-bold ">{scanMessage}</span>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Directives */}
                                <section className="pt-10 border-t border-[var(--border)]">
                                    <h3 className="text-[10px] font-bold text-[var(--text-muted)] mb-6 ">Neurological directives</h3>
                                    <textarea
                                        className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-3xl p-5 text-[14px] h-44 focus:border-blue-500/50 outline-none resize-none transition-all placeholder:text-[var(--text-muted)] font-bold text-[var(--text-secondary)] scrollbar-none leading-relaxed"
                                        placeholder="Add mission-critical instructions for this unit..."
                                        value={trainingData}
                                        onChange={(e) => setTrainingData(e.target.value)}
                                    />
                                    <button
                                        onClick={() => trainModel(selectedModel.id)}
                                        disabled={isTraining !== null || (!trainingData && selectedModel.files?.length === 0)}
                                        className="w-full mt-10 bg-blue-600 text-white hover:bg-blue-700 py-5 rounded-[2rem] font-bold text-[13px]  transition-all active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20"
                                    >
                                        {isTraining ? (
                                            <><Loader2 className="animate-spin" size={20} /> Optimizing unit...</>
                                        ) : (
                                            <><Play fill="currentColor" size={18} /> Synchronize node</>
                                        )}
                                    </button>
                                </section>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Create Modal */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreating(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-[2.5rem] p-8 relative shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)]"
                        >
                            <h2 className="text-3xl font-bold mb-3 text-[var(--text-primary)] ">Initialize cluster</h2>
                            <p className="text-[var(--text-muted)] mb-10 font-bold text-[10px]  ">A new unique unit will be created for neurological deployment.</p>

                            <input
                                type="text"
                                placeholder="Cluster identifier..."
                                className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl px-6 py-3 text-lg font-bold outline-none focus:border-blue-500/50 transition-all mb-10 placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                                autoFocus
                                value={newModelName}
                                onChange={(e) => setNewModelName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createModel()}
                            />

                            <div className="flex gap-5">
                                <button
                                    onClick={createModel}
                                    className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-bold text-[13px]  hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                                >
                                    Confirm
                                </button>
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="px-8 py-5 rounded-2xl font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all text-sm "
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Edit Modal */}
            <AnimatePresence>
                {editModel && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditModel(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[var(--card)] border border-[var(--border)] w-full max-w-lg rounded-[2.5rem] p-8 relative shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)]"
                        >
                            <h2 className="text-3xl font-bold mb-3 text-[var(--text-primary)] ">Edit cluster</h2>
                            <p className="text-[var(--text-muted)] mb-10 font-bold text-[10px]  ">Update your model configuration and neurological identifier.</p>

                            <div className="space-y-6 mb-10">
                                <div>
                                    <label className="text-[10px] text-[var(--text-muted)] font-bold  mb-2.5 block px-1">Identity</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl px-5 py-4 text-sm font-bold focus:border-blue-500/50 outline-none transition-all text-[var(--text-primary)]"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-[var(--text-muted)] font-bold  mb-2.5 block px-1">Neurological directive</label>
                                    <textarea
                                        className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl px-5 py-4 text-sm font-bold focus:border-blue-500/50 outline-none transition-all text-[var(--text-primary)] h-32 resize-none leading-relaxed"
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="text-[10px] text-[var(--text-muted)] font-bold  mb-2.5 block px-1">Base Unit</label>
                                        <div className="relative">
                                            <select
                                                className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl px-5 py-4 text-xs font-bold focus:border-blue-500/50 outline-none transition-all text-[var(--text-primary)] appearance-none cursor-pointer"
                                                value={editBaseModel}
                                                onChange={(e) => setEditBaseModel(e.target.value)}
                                            >
                                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                                <option value="gpt-4">GPT-4 Pro</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--text-muted)] font-bold  mb-2.5 block px-1">Protocol status</label>
                                        <div className="relative">
                                            <select
                                                className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-2xl px-5 py-4 text-xs font-bold focus:border-blue-500/50 outline-none transition-all text-[var(--text-primary)] appearance-none cursor-pointer"
                                                value={editStatus}
                                                onChange={(e) => setEditStatus(e.target.value)}
                                            >
                                                <option value="Ready">Ready</option>
                                                <option value="Training">Training</option>
                                                <option value="Maintenance">Maintenance</option>
                                                <option value="Offline">Offline</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-5">
                                <button
                                    onClick={updateModel}
                                    className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-bold text-[13px]  hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                                >
                                    Commit changes
                                </button>
                                <button
                                    onClick={() => setEditModel(null)}
                                    className="px-8 py-5 rounded-2xl font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all text-sm "
                                >
                                    Abort
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
        </div >
    );
}
