import React, { useMemo, useState } from 'react';
import Sidebar from '../../layout/Sidebar';
import { History, Search, Filter } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';

export default function RiwayatManajemen() {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('Semua');
    const { activityLogs: rawLogs } = useAppData();

    const activityLogs = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return rawLogs.filter((log) => {
            const matchesSearch = !q || log.admin.toLowerCase().includes(q) || log.action.toLowerCase().includes(q);
            const matchesDate = dateFilter === 'Semua' || log.time.toLowerCase().startsWith(dateFilter.toLowerCase());
            return matchesSearch && matchesDate;
        });
    }, [rawLogs, searchTerm, dateFilter]);

    return (
        <Sidebar>
            <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Riwayat Aktivitas Sistem</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Catatan audit log dan seluruh aktivitas administratif di dalam sistem AgroWatch.</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                        <div className="relative w-full sm:w-80">
                            <Search size={16} className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Cari aktivitas atau nama admin..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:bg-white dark:bg-gray-900 focus:border-[#14361e]"
                            />
                        </div>
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-xs font-semibold px-4 py-2 rounded-xl transition-colors outline-none"
                        >
                            <option value="Semua">Semua Tanggal</option>
                            <option value="Hari ini">Hari Ini</option>
                            <option value="Kemarin">Kemarin</option>
                            <option value="Baru saja">Baru Saja</option>
                        </select>
                    </div>

                    {activityLogs.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">Tidak ada aktivitas yang cocok dengan pencarian.</p>
                    )}

                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {activityLogs.map((log) => (
                            <div key={log.id} className="py-4 flex items-start gap-4 hover:bg-gray-50/50 px-2 rounded-xl transition-colors">
                                <div className="p-2.5 rounded-xl bg-green-50 text-[#14361e] mt-0.5">
                                    <History size={18} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">{log.admin}</h4>
                                        <span className="text-[11px] text-gray-400 dark:text-gray-500">{log.time}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{log.action}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Sidebar>
    );
}