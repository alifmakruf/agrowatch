import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../layout/Sidebar';
import { ArrowLeft, MoreVertical, AlertTriangle, Calendar, MapPin, CheckCircle, UserPlus, Flag, FileText, Image as ImageIcon, ClipboardCheck, X, Wrench, Timer, Loader2 } from 'lucide-react';
import { useAppData, formatReportItem } from '../../context/AppDataContext';
import { getLaporanDetailApi } from '../../api/laporan';
import PhotoLightbox from '../../components/PhotoLightbox';
import CategoryIcon from '../../components/CategoryIcon';

export default function DetailLaporan() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { reports, updateReportStatus } = useAppData();
    const [remoteReport, setRemoteReport] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    // Form Selesai -- modal yang wajib diisi saat status diubah ke
    // "Selesai", supaya data penanganan lapangan (durasi, alat, foto
    // hasil) tercatat, bukan langsung berubah status tanpa jejak apa pun.
    const [showSelesaiModal, setShowSelesaiModal] = useState(false);
    const [tindakanLapangan, setTindakanLapangan] = useState('');
    const [durasiPenanganan, setDurasiPenanganan] = useState('');
    const [alatDigunakan, setAlatDigunakan] = useState('');
    const [tglSelesai, setTglSelesai] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });
    const [fotoSelesaiFile, setFotoSelesaiFile] = useState(null);
    const [fotoSelesaiPreview, setFotoSelesaiPreview] = useState(null);
    const [submittingSelesai, setSubmittingSelesai] = useState(false);

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
        currentReport.timPenanggungJawab ||
        (currentReport.catatan_tindak_lanjut &&
        currentReport.catatan_tindak_lanjut !== 'Menunggu penanganan dari tim manajemen.')
    );

    const isSelesai = currentReport.status === 'Selesai' || currentReport.status === 'Ditutup';
    const isDiproses = currentReport.status === 'Diproses' || currentReport.status === 'Sedang Diproses';

    const handleFotoSelesaiChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setFotoSelesaiFile(file);
        setFotoSelesaiPreview(URL.createObjectURL(file));
    };

    const handleOpenSelesaiModal = () => {
        setTindakanLapangan('');
        setDurasiPenanganan('');
        setAlatDigunakan('');
        setFotoSelesaiFile(null);
        setFotoSelesaiPreview(null);
        setShowSelesaiModal(true);
    };

    const handleSubmitSelesai = async () => {
        if (!tindakanLapangan.trim()) {
            alert('Tindakan/penanganan lapangan wajib diisi.');
            return;
        }
        setSubmittingSelesai(true);
        try {
            await updateReportStatus(currentReport.rawId || id, 'Selesai', {
                catatan_tindak_lanjut: currentReport.catatan_tindak_lanjut,
                tim_penanggung_jawab: currentReport.timPenanggungJawab,
                kendala: currentReport.kendala,
                catatan_selesai: tindakanLapangan.trim(),
                durasi_penanganan: durasiPenanganan.trim(),
                alat_digunakan: alatDigunakan.trim(),
                tgl_selesai: tglSelesai,
                fotoSelesaiPreview: fotoSelesaiPreview,
            });
            setShowSelesaiModal(false);
        } catch (err) {
            console.error('Gagal menyimpan data penyelesaian:', err);
            alert('Gagal menyimpan data penyelesaian. Coba lagi.');
        } finally {
            setSubmittingSelesai(false);
        }
    };

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

                    {/* KOLOM KIRI (2 Span): 3 Section -- Data Awal, Diproses, Selesai */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* ===== SECTION 1: DATA LAPORAN AWAL ===== */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-[10px]">1</span>
                                Data Laporan Awal
                            </h2>

                            {/* Card Judul & Meta */}
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <CategoryIcon name={currentReport.jenisLabel || currentReport.jenis} size={20} />
                                        {currentReport.jenisLabel || currentReport.jenis}
                                    </h2>
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

                            {/* Card Bukti Foto Lapangan (Awal) */}
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <ImageIcon size={14} /> Bukti Foto Lapangan (Awal)
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
                        </div>

                        {/* ===== SECTION 2: DATA DIPROSES ===== */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${hasTindakLanjut ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>2</span>
                                Data Diproses
                            </h2>

                            <div className={`rounded-2xl border shadow-xs p-6 space-y-3 ${hasTindakLanjut ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <ClipboardCheck size={14} className={hasTindakLanjut ? 'text-amber-700' : 'text-gray-400'} />
                                        Status Tindak Lanjut
                                    </h3>
                                    {hasTindakLanjut ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                                            <CheckCircle size={11} /> Sudah Ditindaklanjuti
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                            Belum Ditindaklanjuti
                                        </span>
                                    )}
                                </div>
                                {hasTindakLanjut ? (
                                    <div className="space-y-2.5">
                                        {currentReport.timPenanggungJawab && (
                                            <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl px-3 py-2 border border-amber-100 dark:border-amber-900">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Tim Penanggung Jawab</span>
                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{currentReport.timPenanggungJawab}</span>
                                            </div>
                                        )}
                                        {currentReport.kendala && (
                                            <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl px-3 py-2 border border-amber-100 dark:border-amber-900">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Kendala</span>
                                                <span className="text-xs font-semibold text-amber-700">{currentReport.kendala}</span>
                                            </div>
                                        )}
                                        {currentReport.catatan_tindak_lanjut && currentReport.catatan_tindak_lanjut !== 'Menunggu penanganan dari tim manajemen.' && (
                                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-white dark:bg-gray-900 rounded-xl p-3 border border-amber-100 dark:border-amber-900">
                                                {currentReport.catatan_tindak_lanjut}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Belum ada tim yang ditugaskan atau tindakan yang dicatat untuk laporan ini.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ===== SECTION 3: DATA SELESAI ===== */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isSelesai ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>3</span>
                                Data Selesai
                            </h2>

                            <div className={`rounded-2xl border shadow-xs p-6 space-y-3 ${isSelesai ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
                                {isSelesai ? (
                                    <div className="space-y-2.5">
                                        {currentReport.catatanSelesai && (
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">Tindakan / Penanganan Lapangan</span>
                                                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-white dark:bg-gray-900 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900">
                                                    {currentReport.catatanSelesai}
                                                </p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                            <div className="bg-white dark:bg-gray-900 rounded-xl px-3 py-2 border border-emerald-100 dark:border-emerald-900">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Durasi Penanganan</span>
                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{currentReport.durasiPenanganan || '-'}</span>
                                            </div>
                                            <div className="bg-white dark:bg-gray-900 rounded-xl px-3 py-2 border border-emerald-100 dark:border-emerald-900">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Alat Digunakan</span>
                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{currentReport.alatDigunakan || '-'}</span>
                                            </div>
                                            <div className="bg-white dark:bg-gray-900 rounded-xl px-3 py-2 border border-emerald-100 dark:border-emerald-900">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Waktu Selesai</span>
                                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                    {currentReport.tglSelesai ? new Date(currentReport.tglSelesai).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                                                </span>
                                            </div>
                                        </div>
                                        {currentReport.fotoSelesai && (
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">Foto Hasil Lapangan</span>
                                                <div className="rounded-xl overflow-hidden bg-gray-900 h-56 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center">
                                                    <img
                                                        src={currentReport.fotoSelesai}
                                                        alt="Foto hasil penyelesaian"
                                                        onClick={() => setLightboxSrc(currentReport.fotoSelesai)}
                                                        className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Laporan ini belum ditandai selesai. Data penanganan lapangan (durasi, alat, foto hasil) akan tampil di sini setelah Form Selesai diisi.
                                    </p>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* KOLOM KANAN (1 Span): Tindakan & Prioritas */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-5">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Tindakan</h3>

                            <div className="space-y-3">
                                <button
                                    onClick={handleOpenSelesaiModal}
                                    disabled={isSelesai}
                                    className="lift-hover shine-hover w-full bg-[#14361e] hover:bg-[#1e4d2b] text-white font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle size={16} />
                                    <span>{isSelesai ? 'Sudah Selesai' : 'Tandai Selesai'}</span>
                                </button>

                                <button
                                    onClick={() => navigate(`/manajemen/tindak-lanjut/${currentReport.rawId || id}`)}
                                    disabled={isSelesai}
                                    className="lift-hover w-full bg-white dark:bg-gray-900 border border-gray-300 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-900"
                                >
                                    <UserPlus size={16} />
                                    <span>{isSelesai ? 'Penugasan Terkunci' : hasTindakLanjut ? 'Edit Penugasan' : 'Tugaskan Tim'}</span>
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

                {/* MODAL FORM SELESAI -- wajib diisi saat status diubah
                    ke "Selesai", supaya data penanganan lapangan tercatat
                    (bukan cuma perubahan status tanpa jejak). */}
                {showSelesaiModal && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/50" onClick={() => !submittingSelesai && setShowSelesaiModal(false)} />
                        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                                        <CheckCircle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Form Penyelesaian Lapangan</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Isi data penanganan sebelum laporan #{currentReport.id} ditandai selesai.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSelesaiModal(false)}
                                    disabled={submittingSelesai}
                                    className="p-1 text-gray-400 hover:text-gray-700 dark:text-gray-300 cursor-pointer disabled:opacity-50"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tindakan / Penanganan Lapangan</label>
                                    <textarea
                                        value={tindakanLapangan}
                                        onChange={(e) => setTindakanLapangan(e.target.value)}
                                        rows={3}
                                        placeholder="Jelaskan apa yang dilakukan untuk menangani insiden ini..."
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#14361e] bg-white dark:bg-gray-900"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1"><Timer size={12} /> Durasi Penanganan</label>
                                        <input
                                            type="text"
                                            value={durasiPenanganan}
                                            onChange={(e) => setDurasiPenanganan(e.target.value)}
                                            placeholder="mis. 2 Jam"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#14361e] bg-white dark:bg-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1"><Wrench size={12} /> Alat yang Digunakan</label>
                                        <input
                                            type="text"
                                            value={alatDigunakan}
                                            onChange={(e) => setAlatDigunakan(e.target.value)}
                                            placeholder="mis. Sprayer, Cangkul"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#14361e] bg-white dark:bg-gray-900"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tanggal & Waktu Selesai</label>
                                    <input
                                        type="datetime-local"
                                        value={tglSelesai}
                                        onChange={(e) => setTglSelesai(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#14361e] bg-white dark:bg-gray-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Foto Lapangan (Opsional)</label>
                                    {fotoSelesaiPreview ? (
                                        <div className="relative">
                                            <img src={fotoSelesaiPreview} alt="Preview foto selesai" className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-800" />
                                            <button
                                                type="button"
                                                onClick={() => { setFotoSelesaiFile(null); setFotoSelesaiPreview(null); }}
                                                className="absolute top-2 right-2 bg-white/90 dark:bg-gray-900/90 p-1.5 rounded-full text-red-600 hover:bg-white cursor-pointer"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-4 text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <ImageIcon size={16} />
                                            <span>Ketuk untuk unggah foto hasil</span>
                                            <input type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={handleFotoSelesaiChange} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={() => setShowSelesaiModal(false)}
                                    disabled={submittingSelesai}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmitSelesai}
                                    disabled={submittingSelesai}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#14361e] hover:bg-[#1e4d2b] cursor-pointer disabled:opacity-60"
                                >
                                    {submittingSelesai ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    Simpan & Tandai Selesai
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <PhotoLightbox src={lightboxSrc} alt="Bukti Foto Lapangan" onClose={() => setLightboxSrc(null)} />

            </div>
        </Sidebar>
    );
}