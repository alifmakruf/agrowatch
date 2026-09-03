import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tractor, LogOut, Plus, History, ClipboardList, Loader2, CheckCircle2 } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';

export default function DashboardPetani() {
    const navigate = useNavigate();
    const { logout, auth, reports, fetchReports } = useAppData();
    const currentDate = new Date()
        .toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        .toUpperCase();

    // Statistik dihitung dari laporan milik akun petani yang sedang login
    // saja -- sama seperti pola filter id_pelapor di History.jsx.
    useEffect(() => {
        if (auth?.id) {
            fetchReports({ id_pelapor: auth.id });
        }
    }, [fetchReports, auth?.id]);

    const myReports = useMemo(
        () => reports.filter((r) => !auth?.id || r.pelaporId == auth.id),
        [reports, auth?.id]
    );

    const stats = useMemo(() => {
        const total = myReports.length;
        const diproses = myReports.filter((r) => r.status === 'Diproses' || r.status === 'Sedang Diproses').length;
        const selesai = myReports.filter((r) => r.status === 'Selesai' || r.status === 'Ditutup').length;
        return { total, diproses, selesai };
    }, [myReports]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex flex-col font-sans">

            {/* Header - Berukuran Lebar Penuh (Full Width) */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-[#2E5E32] p-2 rounded-md">
                        <Tractor size={24} className="text-white" />
                    </div>
                    <span className="font-bold text-[#2E5E32] text-xl tracking-tight">AgroWatch</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:text-gray-200 transition-colors"
                >
                    <LogOut size={16} strokeWidth={2.5} />
                    {/* Teks keluar disembunyikan di HP sangat kecil, muncul di layar menengah ke atas */}
                    <span className="hidden sm:inline">Keluar</span>
                </button>
            </header>

            {/* Area Konten Utama */}
            <main className="flex-1 flex flex-col items-center p-6 lg:p-12">
                {/* max-w-4xl membatasi agar di layar TV/Monitor raksasa pun tidak terlalu melar merusak mata */}
                <div className="w-full max-w-4xl">

                    {/* Bagian Sambutan - Rata tengah di HP, Rata kiri di Desktop */}
                    <section className="text-center md:text-left mb-10 mt-4 md:mt-8">
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-2">
                            {currentDate}
                        </p>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                            Selamat Datang, {auth?.name || 'Petani'}
                        </h1>
                        <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto md:mx-0">
                            Pilih aksi di bawah ini untuk memulai aktivitas harian Anda. Laporan akan terintegrasi langsung dengan dashboard manajemen untuk penanganan cepat.
                        </p>
                    </section>

                    {/* Statistik Laporan Milik Petani Ini */}
                    <section className="grid grid-cols-3 gap-3 md:gap-4 mb-10">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 md:p-5 flex flex-col items-center md:items-start shadow-sm">
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-xl mb-2">
                                <ClipboardList size={18} className="text-gray-600 dark:text-gray-300" />
                            </div>
                            <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</span>
                            <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 font-medium text-center md:text-left">Total Laporan</span>
                        </div>
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 md:p-5 flex flex-col items-center md:items-start shadow-sm">
                            <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl mb-2">
                                <Loader2 size={18} className="text-amber-600" />
                            </div>
                            <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.diproses}</span>
                            <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 font-medium text-center md:text-left">Diproses</span>
                        </div>
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 md:p-5 flex flex-col items-center md:items-start shadow-sm">
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-xl mb-2">
                                <CheckCircle2 size={18} className="text-emerald-600" />
                            </div>
                            <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.selesai}</span>
                            <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 font-medium text-center md:text-left">Selesai</span>
                        </div>
                    </section>

                    {/* Pilihan Menu (Cards) - Responsif Grid */}
                    {/* grid-cols-1 (HP) -> md:grid-cols-2 (Mulai layar tablet/laptop jadi 2 kolom) */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Card 1: Tambah Laporan */}
                        <button
                            onClick={() => navigate('/petani/form')}
                            className="lift-hover shine-hover w-full bg-[#2E5E32] hover:bg-[#244a27] transition-all duration-300 rounded-3xl p-8 md:p-10 flex flex-col items-center md:items-start text-center md:text-left shadow-lg hover:shadow-xl group active:scale-[0.98]"
                        >
                            <div className="bg-[#A3D295] p-4 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                                <Plus size={36} className="text-[#2E5E32]" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
                                Tambah Laporan
                            </h2>
                            <p className="text-sm text-green-100/90 leading-relaxed">
                                Buat laporan baru untuk aktivitas harian, kondisi lahan, atau insiden (hama, kebakaran, dll) langsung dari lokasi Anda.
                            </p>
                        </button>

                        {/* Card 2: Riwayat Laporan */}
                        <button
                            onClick={() => navigate('/petani/history')} // Akan kita buat halamannya nanti
                            className="lift-hover w-full bg-white dark:bg-gray-900 hover:bg-gray-50 border-2 border-gray-200 dark:border-gray-800 transition-all duration-300 rounded-3xl p-8 md:p-10 flex flex-col items-center md:items-start text-center md:text-left shadow-sm hover:shadow-md group active:scale-[0.98]"
                        >
                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
                                <History size={36} className="text-[#2E5E32]" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                                Riwayat Laporan
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                Lihat daftar lengkap laporan yang telah Anda kirimkan, pantau status penanganannya, dan lihat riwayat aktivitas sebelumnya.
                            </p>
                        </button>

                    </section>

                </div>
            </main>
        </div>
    );
}