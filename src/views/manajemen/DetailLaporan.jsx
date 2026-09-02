import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../layout/Sidebar';
import { ArrowLeft, MoreVertical, AlertTriangle, Calendar, MapPin, CheckCircle, UserPlus, Flag, FileText, Image as ImageIcon, ClipboardCheck } from 'lucide-react';
import { useAppData, formatReportItem } from '../../context/AppDataContext';
import { getLaporanDetailApi } from '../../api/laporan';
import PhotoLightbox from '../../components/PhotoLightbox';

export default function DetailLaporan() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { reports, updateReportStatus } = useAppData();
    const [remoteReport, setRemoteReport] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchDetail() {
            if (!id) return;
            const cleanId = String(id).replace('#', '').replace('RP-', '');
            const local = reports.find((r) => String(r.id) === String(id) || String(r.id) === cleanId || String(r.rawId) === cleanId);
            if (local) {
                setRemoteReport(local);
                return;
            }

            try {
                const res = await getLaporanDetailApi(cleanId);
                const item = res.laporan || res.data || res;
                if (item && isMounted) {
                    setRemoteReport(formatReportItem(item));
                }
            } catch (err) {
                console.warn('Gagal ambil detail laporan:', err);
            }
        }
        fetchDetail();
        return () => {
            isMounted = false;
        };
    }, [id, reports]);

    const cleanId = id ? String(id).replace('#', '').replace('RP-', '') : '';
    const currentReport = remoteReport || reports.find((r) => String(r.id) === String(id) || String(r.id) === cleanId || String(r.rawId) === cleanId) || {
        id: id || '1',
        rawId: id || '1',
        jenisLabel: 'Serangan Hama',
        tanggal: '2024-10-12T08:30:00',
        pelapor: 'Budi Santoso',
        sektor: 'Blok A2',
        status: 'Terbuka',
        deskripsi: 'Ditemukan ulat grayak pada daun tanaman tebu.',
        image: "https://images.unsplash.com/photo-1595974482597-4e8296a255e4?w=500",
    };

    // Placeholder text ini dipasang di formatReportItem saat
    // catatan_tindak_lanjut masih kosong -- dipakai di sini sebagai
    // penanda apakah laporan SUDAH pernah ditindaklanjuti atau belum,
    // supaya bisa ditampilkan jelas di halaman ini (SEBELUMNYA info ini
    // tersimpan di backend tapi tidak pernah ditampilkan sama sekali).
    const hasTindakLanjut = Boolean(
        currentReport.catatan_tindak_lanjut &&
        currentReport.catatan_tindak_lanjut !== 'Menunggu penanganan dari tim manajemen.'
    );

    return (
        <Sidebar>
            <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">

                {/* HEADER / BREADCRUMB */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/manajemen/laporan')}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="font-bold text-gray-900 dark:text-gray-100 text-base">Detail Laporan #{currentReport.id}</h1>
                    </div>
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 dark:text-gray-400 transition-colors cursor-pointer">
                        <MoreVertical size={18} />
                    </button>
                </div>

                {/* KONTEN UTAMA DUA KOLOM */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* KOLOM KIRI (2 Span): Informasi Utama, Deskripsi, & Bukti Foto */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Card Judul & Meta */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{currentReport.jenisLabel || currentReport.jenis}</h2>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${currentReport.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : currentReport.status === 'Diproses' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-600'}`}>
                                    <AlertTriangle size={12} /> {currentReport.status || 'Terbuka'}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
                                    <span>{currentReport.tanggal ? new Date(currentReport.tanggal).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-[9px]">
                                        {(currentReport.pelapor || 'P').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{currentReport.pelapor}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-gray-400 dark:text-gray-500" />
                                    <span>{currentReport.sektor || currentReport.lokasi}</span>
                                </div>
                            </div>
                        </div>

                        {/* Card Deskripsi Kejadian */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <FileText size={14} /> Deskripsi Kejadian
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                                {currentReport.deskripsi || 'Tidak ada deskripsi kejadian tambahan.'}
                            </p>
                        </div>

                        {/* Card Bukti Foto Lapangan */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <ImageIcon size={14} /> Bukti Foto Lapangan
                            </h3>
                            <div className="rounded-xl overflow-hidden bg-gray-900 h-64 border border-gray-200 dark:border-gray-800 flex items-center justify-center">
                                <img
                                    src={currentReport.image || "https://images.unsplash.com/photo-1595974482597-4e8296a255e4?w=800"}
                                    alt={currentReport.jenisLabel}
                                    onClick={() => setLightboxSrc(currentReport.image || "https://images.unsplash.com/photo-1595974482597-4e8296a255e4?w=800")}
                                    className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                                />
                            </div>
                        </div>

                        {/* Card Riwayat Tindak Lanjut -- SEBELUMNYA tidak ada
                            sama sekali, padahal data catatan_tindak_lanjut
                            sudah tersimpan di backend sejak tim ditugaskan
                            lewat halaman Tindak Lanjut. */}
                        <div className={`rounded-2xl border shadow-xs p-6 space-y-3 ${hasTindakLanjut ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <ClipboardCheck size={14} className={hasTindakLanjut ? 'text-emerald-700' : 'text-gray-400'} />
                                    Status Tindak Lanjut
                                </h3>
                                {hasTindakLanjut ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                                        <CheckCircle size={11} /> Sudah Ditindaklanjuti
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                        Belum Ditindaklanjuti
                                    </span>
                                )}
                            </div>
                            {hasTindakLanjut ? (
                                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-white dark:bg-gray-900 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900">
                                    {currentReport.catatan_tindak_lanjut}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Belum ada tim yang ditugaskan atau tindakan yang dicatat untuk laporan ini.
                                </p>
                            )}
                        </div>

                    </div>

                    {/* KOLOM KANAN (1 Span): Tindakan & Prioritas */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-5">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Tindakan</h3>

                            <div className="space-y-3">
                                <button
                                    onClick={async () => {
                                        await updateReportStatus(currentReport.rawId || id, 'Selesai');
                                        alert('Laporan berhasil ditandai selesai.');
                                        navigate('/manajemen/laporan');
                                    }}
                                    className="w-full bg-[#14361e] hover:bg-[#1e4d2b] text-white font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                                >
                                    <CheckCircle size={16} />
                                    <span>Tandai Selesai</span>
                                </button>

                                <button
                                    onClick={() => navigate(`/manajemen/tindak-lanjut/${currentReport.rawId || id}`)}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                    <UserPlus size={16} />
                                    <span>{hasTindakLanjut ? 'Edit Penugasan' : 'Tugaskan Tim'}</span>
                                </button>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">PRIORITAS</span>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                                    <Flag size={14} />
                                    <span>Tinggi (Segera)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <PhotoLightbox src={lightboxSrc} alt="Bukti Foto Lapangan" onClose={() => setLightboxSrc(null)} />

            </div>
        </Sidebar>
    );
}