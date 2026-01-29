"use client";

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    Legend
} from 'recharts';

interface ChartRendererProps {
    content: string;
}

const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ChartRenderer({ content }: ChartRendererProps) {
    let chartData;
    try {
        chartData = JSON.parse(content);
    } catch (e) {
        return <div className="p-4 text-red-500 bg-red-500/10 rounded-xl">Invalid chart data</div>;
    }

    const { type, data, title } = chartData;

    const renderChart = () => {
        switch (type) {
            case 'bar':
                return (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#6b7280"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#6b7280"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #ffffff10', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #ffffff10', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                    </LineChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #ffffff10', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend />
                    </PieChart>
                );
            case 'area':
                return (
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #ffffff10', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                    </AreaChart>
                );
            default:
                return <div>Unsupported chart type: {type}</div>;
        }
    };

    return (
        <div className="my-6 p-6 bg-white/5 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            {title && <h3 className="text-sm font-semibold text-white/70 mb-6 text-center">{title}</h3>}
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
