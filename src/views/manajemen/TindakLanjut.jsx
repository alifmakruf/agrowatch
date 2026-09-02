import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../layout/Sidebar';
import { AlertTriangle, CheckCircle, Bug, Droplets, WifiOff, ShieldAlert, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';

const ICON_BY_JENIS = {
    hama: Bug,
    penyakit: Bug,
    banjir: Droplets,
    kebakaran: AlertTriangle,
    lainnya: WifiOff,
};

export default function TindakLanjutManajemen() {
    const { reports } = useAppData();
    const [page, setPage] = useState(1);
    const navigate = useNavigate(); // <-- Inisialisasi useNavigate di sini
    const PAGE_SIZE = 4;

    const dataTindakLanjut = useMemo(() => {
        return reports
            .filter((r) => r.status !== 'Selesai' && r.status !== 'Ditutup')
            .map((r) => ({
                id: '#' + r.id,
                rawId: r.id,
                jenis: r.jenisLabel || 'Insiden Lapangan',
                icon: ICON_BY_JENIS[r.jenis] || ShieldAlert,
                lokasi: r.sektor || 'Sektor Utama',
                waktu: r.createdAt ? new Date(r.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '12 Okt 2023, 08:30',
                // Kolom "Urgensi" diganti "Status" -- tampilkan status
                // penanganan asli laporan (Terbuka/Diproses/dst), bukan
                // field `urgensi` yang terpisah dan membingungkan karena
                // tidak selalu sinkron dengan status sebenarnya.
                status: r.status || 'Terbuka',
            }));
    }, [reports]);

    const totalKritis = reports.filter((r) => r.status === 'Kritis' || r.status === 'Terbuka').length;
    const tindakLanjutHariIni = reports.filter((r) => r.createdAt && new Date(r.createdAt).toDateString() === new Date().toDateString()).length || 15;

    const totalPages = Math.max(1, Math.ceil(dataTindakLanjut.length / PAGE_SIZE));
    const pageItems = dataTindakLanjut.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleRowClick = (item) => {
        navigate(`/manajemen/tindak-lanjut/${item.rawId}`);
    };

    const renderStatusBadge = (status) => {
        if (status === 'Terbuka' || status === 'Kritis' || status === 'Menunggu') {
            return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">Terbuka</span>;
        } else if (status === 'Diproses' || status === 'Sedang Diproses') {
            return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Diproses</span>;
        }
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{status}</span>;
    };

    return (
        <Sidebar>
            <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">

                {/* HEADER HALAMAN */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Manajemen Tindak Lanjut</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Daftar laporan dengan status "Open" yang membutuhkan penanganan segera.</p>
                </div>

                {/* 2 KARTU METRIK UTAMA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Laporan Kritis</p>
                            <h3 className="text-3xl font-extrabold text-red-600 mt-1">{totalKritis}</h3>
                        </div>
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <AlertTriangle size={24} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tindak Lanjut Hari Ini</p>
                            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-1">{tindakLanjutHariIni}</h3>
                        </div>
                        <div className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </div>

                {/* TABEL UTAMA */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                                    <th className="py-4 px-6">ID</th>
                                    <th className="py-4 px-6">Tipe Insiden</th>
                                    <th className="py-4 px-6">Lokasi</th>
                                    <th className="py-4 px-6">Tanggal</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                {pageItems.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-400 dark:text-gray-500">Tidak ada laporan yang membutuhkan tindak lanjut.</td>
                                    </tr>
                                )}
                                {pageItems.map((item, idx) => {
                                    const IconComponent = item.icon;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => handleRowClick(item)}>
                                            <td className="py-4 px-6 font-bold text-gray-900 dark:text-gray-100">{item.id}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <IconComponent size={16} className="text-gray-500 dark:text-gray-400 shrink-0" />
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{item.jenis}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-gray-600 dark:text-gray-400">{item.lokasi}</td>
                                            <td className="py-4 px-6 text-gray-500 dark:text-gray-400">{item.waktu}</td>
                                            <td className="py-4 px-6">{renderStatusBadge(item.status)}</td>
                                            <td className="py-4 px-6 text-right text-gray-400 dark:text-gray-500">
                                                <ChevronRight size={16} className="inline-block" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* FOOTER TABEL: PAGINATION PREV/NEXT */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Menampilkan {pageItems.length} dari {dataTindakLanjut.length} laporan</span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </Sidebar>
    );
}