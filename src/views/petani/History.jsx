import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tractor, ArrowLeft, MapPin, Clock, Search, Filter, LogOut, RefreshCw, Check, Tag } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';

export default function HistoryPetani() {
    const navigate = useNavigate();
    const { reports, reportsLoading, fetchReports, logout, auth } = useAppData();
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // SEBELUMNYA: fetchReports() dipanggil tanpa filter apapun, jadi
        // halaman ini menampilkan laporan SEMUA pengguna, bukan cuma milik
        // akun yang sedang login. Kirim `id_pelapor` supaya backend hanya
        // mengembalikan laporan milik user ini.
        if (auth?.id) {
            fetchReports({ id_pelapor: auth.id });
        }
    }, [fetchReports, auth?.id]);

    const listRiwayat = reports
        // Filter defensif di sisi frontend juga -- jaga-jaga kalau endpoint
        // dipanggil ulang (mis. dari halaman lain) tanpa filter id_pelapor.
        .filter((r) => !auth?.id || r.pelaporId == auth.id)
        .map((r) => ({
            id: '#' + r.id,
            rawId: r.id,
            tanggal: r.tanggal
                ? new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : '12 Okt 2024',
            judul: r.jenisLabel || 'Insiden Lapangan',
            lokasi: r.sektor || 'Sektor A',
            kategori: r.kategori || 'Serangan Hama',
            status: r.status || 'Terbuka',
            deskripsi: r.deskripsi,
        }))
        .filter((item) =>
            item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.lokasi.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const renderBadgeStatus = (status) => {
        switch (status) {
            case 'Terbuka':
            case 'Menunggu':
            case 'Kritis':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        • Terbuka
                    </span>
                );
            case 'Diproses':
            case 'Sedang Diproses':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        • Diproses
                    </span>
                );
            case 'Selesai':
            case 'Ditutup':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        <Check size={12} /> Selesai
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {status}
                    </span>
                );
        }
    };

    const getAccentColor = (status) => {
        if (status === 'Terbuka' || status === 'Menunggu' || status === 'Kritis') return 'border-l-red-500';
        if (status === 'Diproses' || status === 'Sedang Diproses') return 'border-l-amber-500';
        return 'border-l-green-600';
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex flex-col font-sans text-gray-800 dark:text-gray-200">

            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="bg-[#1a472a] p-2 rounded-md">
                        <Tractor size={20} className="text-white" />
                    </div>
                    <div>
                        <span className="font-bold text-[#1a472a] text-lg tracking-tight block leading-tight">AgroWatch</span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">PETANI</span>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                >
                    <LogOut size={14} /> Logout
                </button>
            </header>

            <main className="flex-1 p-6 md:p-10">
                <div className="max-w-4xl mx-auto w-full space-y-6">

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <button
                            onClick={() => navigate('/petani/dashboard')}
                            className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 transition-colors group w-fit cursor-pointer"
                        >
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                            <span>Kembali ke Dashboard</span>
                        </button>

                        <div className="flex items-center gap-2">
                            <div className="relative flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 w-full sm:w-64 shadow-xs">
                                <Search size={14} className="text-gray-400 dark:text-gray-500 mr-2 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Cari ID Laporan..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full text-xs outline-none bg-transparent"
                                />
                            </div>
                            <button
                                onClick={() => auth?.id && fetchReports({ id_pelapor: auth.id })}
                                className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 shadow-xs cursor-pointer"
                                title="Refresh Data"
                            >
                                <RefreshCw size={14} className={reportsLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                            Riwayat Laporan
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Daftar semua laporan insiden yang tersimpan di server.
                        </p>
                    </div>

                    {reportsLoading && listRiwayat.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center shadow-xs">
                            <div className="w-8 h-8 border-4 border-[#1a472a] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Memuat riwayat laporan dari server...</p>
                        </div>
                    ) : listRiwayat.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 rounded-2xl p-12 text-center shadow-xs">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Tidak ada laporan yang dapat ditampilkan.</p>
                            <button
                                onClick={() => navigate('/petani/form')}
                                className="text-xs font-bold text-[#1a472a] hover:underline cursor-pointer"
                            >
                                + Buat Laporan Baru
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {listRiwayat.map((item) => (
                                <div
                                    key={item.id}
                                    className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 ${getAccentColor(item.status)}`}
                                >
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="font-bold text-gray-900 dark:text-gray-100">{item.id}</span>
                                            <span className="text-gray-300">•</span>
                                            <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                                <Clock size={12} /> {item.tanggal}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                                                {item.judul}
                                            </h2>
                                            {renderBadgeStatus(item.status)}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <MapPin size={13} className="text-gray-400 dark:text-gray-500 shrink-0" /> {item.lokasi}
                                            </span>
                                            <span className="text-gray-300">•</span>
                                            <span className="flex items-center gap-1"><Tag size={13} className="text-gray-400 dark:text-gray-500" /> {item.kategori}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <button
                                            onClick={() => navigate(`/petani/history/${item.rawId}`)}
                                            className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                                        >
                                            <span>Detail</span>
                                            <span className="text-gray-400 dark:text-gray-500 font-bold">&gt;</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="pt-4 text-center">
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">Menampilkan {listRiwayat.length} laporan insiden.</p>
                    </div>

                </div>
            </main>

        </div>
    );
}