import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../layout/Sidebar';
import { ArrowLeft, Save, MapPin, ExternalLink, ClipboardList, FilePenLine, RefreshCw, Map, MessageCircle, Phone, CheckCircle, X, Wrench, Timer, Loader2, Image as ImageIcon, Lock } from 'lucide-react';
import CategoryIcon from '../../components/CategoryIcon';
import { useAppData, formatReportItem, formatWaNumber } from '../../context/AppDataContext';
import { getLaporanDetailApi } from '../../api/laporan';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function DetailTindakLanjut() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { reports, updateReportStatus, timPetugasList } = useAppData();
    const [remoteReport, setRemoteReport] = useState(null);

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
                console.warn('Gagal fetch detail laporan:', err);
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
        tanggal: '12 Okt 2024',
        pelapor: 'Budi Santoso',
        sektor: 'Blok A2',
        status: 'Terbuka',
        lat: -7.9666,
        lng: 112.6326,
        locationType: 'titik',
    };

    const [selectedTeam, setSelectedTeam] = useState('');
    const [selectedConstraint, setSelectedConstraint] = useState(null);
    const [instructions, setInstructions] = useState('');
    const [status, setStatus] = useState(currentReport.status || 'Terbuka');
    const [isEditing, setIsEditing] = useState(false);

    // Form Selesai -- sebelumnya halaman ini belum punya cara untuk
    // melengkapi data penanganan lapangan (durasi, alat, foto hasil) saat
    // status diubah ke "Selesai". Polanya disamakan dengan modal di
    // DetailLaporan.jsx supaya konsisten.
    const isSelesaiReport = currentReport.status === 'Selesai' || currentReport.status === 'Ditutup';
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
        if (currentReport.status) setStatus(currentReport.status);
    }, [currentReport.status]);

    useEffect(() => {
        if (currentReport.timPenanggungJawab) {
            setSelectedTeam(currentReport.timPenanggungJawab);
            setSelectedConstraint(currentReport.kendala || null);
            setInstructions(
                currentReport.catatan_tindak_lanjut && currentReport.catatan_tindak_lanjut !== 'Menunggu penanganan dari tim manajemen.'
                    ? currentReport.catatan_tindak_lanjut
                    : ''
            );
            setIsEditing(true);
        }
    }, [currentReport.timPenanggungJawab, currentReport.kendala, currentReport.catatan_tindak_lanjut]);

    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current) return;

        const lat = currentReport.lat || -7.9666;
        const lng = currentReport.lng || 112.6326;
        const zoom = 15;

        if (!mapInstanceRef.current) {
            const map = L.map(mapRef.current, { zoomControl: false }).setView([lat, lng], zoom);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
                maxZoom: 19,
            }).addTo(map);

            const warna = currentReport.status === 'Selesai' ? '#15803d' : currentReport.status === 'Diproses' ? '#d97706' : '#dc2626';

            const customIcon = L.divIcon({
                className: 'custom-pin',
                html: `<div style="background-color: ${warna}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px ${warna};"></div>`,
                iconSize: [16, 16],
            });
            L.marker([lat, lng], { icon: customIcon }).addTo(map);

            mapInstanceRef.current = map;
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [currentReport]);

    const matchedTeamObj = timPetugasList?.find(
        (t) => t.nama_tim === selectedTeam || selectedTeam.includes(t.nama_tim) || t.nama_tim.includes(selectedTeam)
    );


    const waFormattedNumber = matchedTeamObj ? formatWaNumber(matchedTeamObj.nomor_wa) : '';

    const handleOpenWhatsApp = () => {
        const teamName = matchedTeamObj?.nama_ketua ? `${matchedTeamObj.nama_tim} (${matchedTeamObj.nama_ketua})` : selectedTeam || 'Tim Petugas';
        const message = `Halo *${teamName}*,\n\nBerikut penugasan instruksi tindak lanjut insiden dari AgroWatch:\n\n📍 *Detail Laporan*: #${currentReport.id}\n📌 *Jenis Kejadian*: ${currentReport.jenisLabel || currentReport.jenis || '-'}\n🗺️ *Lokasi / Sektor*: ${currentReport.sektor || currentReport.lokasi || '-'}\n📝 *Deskripsi Kejadian*: ${currentReport.deskripsi || '-'}\n${selectedConstraint ? `⚠️ *Kendala*: ${selectedConstraint}\n` : ''}\n💬 *Instruksi Tindakan*:\n${instructions || 'Segera lakukan pengecekan dan tindakan di lokasi.'}\n\nMohon untuk segera ditindaklanjuti. Terima kasih.`;

        const targetWa = waFormattedNumber || (matchedTeamObj?.nomor_wa ? formatWaNumber(matchedTeamObj.nomor_wa) : '');
        if (targetWa) {
            window.open(`https://wa.me/${targetWa}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        }
    };

    const constraints = ['Akses Jalan', 'Cuaca', 'Ketersediaan Pestisida', 'Alat Rusak'];

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedTeam) {
            alert('Silakan pilih Tim Penanggung Jawab terlebih dahulu.');
            return;
        }

        try {
            await updateReportStatus(currentReport.rawId || id, status === 'Terbuka' ? 'Diproses' : status, {
                catatan_tindak_lanjut: instructions,
                tim_penanggung_jawab: selectedTeam,
                kendala: selectedConstraint || '',
            });
            alert(`Penugasan untuk laporan #${currentReport.id} berhasil disimpan!`);
            navigate('/manajemen/tindak-lanjut');
        } catch (err) {
            alert('Gagal menyimpan penugasan.');
        }
    };

    const handleFotoSelesaiChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setFotoSelesaiFile(file);
        setFotoSelesaiPreview(URL.createObjectURL(file));
    };

    const handleOpenSelesaiModal = () => {
        if (!selectedTeam) {
            alert('Pilih Tim Penanggung Jawab terlebih dahulu sebelum menandai laporan selesai.');
            return;
        }
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
                catatan_tindak_lanjut: instructions,
                tim_penanggung_jawab: selectedTeam,
                kendala: selectedConstraint || '',
                catatan_selesai: tindakanLapangan.trim(),
                durasi_penanganan: durasiPenanganan.trim(),
                alat_digunakan: alatDigunakan.trim(),
                tgl_selesai: tglSelesai,
                fotoSelesaiPreview: fotoSelesaiPreview,
            });
            setShowSelesaiModal(false);
            alert(`Laporan #${currentReport.id} berhasil ditandai selesai!`);
            navigate('/manajemen/tindak-lanjut');
        } catch (err) {
            console.error('Gagal menyimpan data penyelesaian:', err);
            alert('Gagal menyimpan data penyelesaian. Coba lagi.');
        } finally {
            setSubmittingSelesai(false);
        }
    };


    return (
        <Sidebar>
            <div className="p-8 space-y-6 max-w-7xl mx-auto w-full font-sans text-gray-800 dark:text-gray-200">
                <div className="space-y-1 border-b border-gray-200 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/manajemen/tindak-lanjut')}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Tindak Lanjut Laporan #{currentReport.id}</h1>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 pl-9">Lengkapi form di bawah untuk menugaskan tim dan merencanakan tindakan.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
                            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <ClipboardList size={13} /> Ringkasan Laporan
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">JUDUL</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                                        <CategoryIcon name={currentReport.jenisLabel} size={14} />
                                        {currentReport.jenisLabel || 'Serangan Hama'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">TANGGAL</span>
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{currentReport.tanggal ? new Date(currentReport.tanggal).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">PELAPOR</span>
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{currentReport.pelapor || 'Petugas Lapangan'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">LOKASI</span>
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 mt-0.5">
                                        <MapPin size={12} className="text-gray-400 dark:text-gray-500" /> {currentReport.sektor || 'Sektor A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {isSelesaiReport ? (
                            // Laporan sudah Selesai -- penugasan tidak bisa diedit lagi,
                            // cukup tampilkan ringkasan tim & instruksi yang sudah
                            // dijalankan (data penanganan lapangan ada di modal Form
                            // Selesai / kartu Status Laporan).
                            <div className="rounded-2xl border shadow-xs p-6 space-y-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <FilePenLine size={13} /> Ringkasan Penugasan
                                    </h2>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                                        <Lock size={11} /> Terkunci (Selesai)
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Tim Penanggung Jawab</span>
                                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{selectedTeam || '-'}</span>
                                        {matchedTeamObj && (
                                            <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                                                <Phone size={12} />
                                                <span>Ketua: <strong>{matchedTeamObj.nama_ketua || 'Penanggung Jawab'}</strong> ({matchedTeamObj.nomor_wa})</span>
                                            </div>
                                        )}
                                    </div>
                                    {selectedConstraint && (
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Kendala</span>
                                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{selectedConstraint}</span>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Catatan Tindakan / Instruksi</span>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{instructions || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                        <div className={`rounded-2xl border shadow-xs p-6 space-y-5 ${isEditing ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <FilePenLine size={13} /> Form Penugasan
                                </h2>
                                {isEditing && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                        Mode Edit
                                    </span>
                                )}
                            </div>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tim Penanggung Jawab</label>
                                    <select
                                        value={selectedTeam}
                                        onChange={(e) => setSelectedTeam(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs outline-none focus:bg-white dark:bg-gray-900 focus:border-[#14361e] font-medium text-gray-700 dark:text-gray-300"
                                    >
                                        <option value="">Pilih Tim...</option>
                                        {timPetugasList && timPetugasList.length > 0 ? (
                                            timPetugasList.map((t) => (
                                                <option key={t.id} value={t.nama_tim}>
                                                    {t.nama_tim} {t.nama_ketua ? `(${t.nama_ketua})` : ''} - WA: {t.nomor_wa}
                                                </option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="Tim Alpha (Hama & Penyakit)">Tim Alpha (Hama & Penyakit)</option>
                                                <option value="Tim Bravo (Irigasi & Infrastruktur)">Tim Bravo (Irigasi & Infrastruktur)</option>
                                                <option value="Tim Charlie (Keamanan & Patroli)">Tim Charlie (Keamanan & Patroli)</option>
                                            </>
                                        )}
                                    </select>
                                    {matchedTeamObj && (
                                        <div className="mt-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                                            <Phone size={12} />
                                            <span>Ketua: <strong>{matchedTeamObj.nama_ketua || 'Penanggung Jawab'}</strong> ({matchedTeamObj.nomor_wa})</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Jenis Kendala (Opsional)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {constraints.map((item) => (
                                            <button
                                                type="button"
                                                key={item}
                                                onClick={() => setSelectedConstraint(selectedConstraint === item ? null : item)}
                                                className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${selectedConstraint === item
                                                        ? 'bg-[#14361e] text-white font-bold shadow-xs'
                                                        : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Catatan Tindakan / Instruksi</label>
                                    <textarea
                                        rows={4}
                                        value={instructions}
                                        onChange={(e) => setInstructions(e.target.value)}
                                        placeholder="Tuliskan rencana tindakan secara detail..."
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs outline-none focus:bg-white dark:bg-gray-900 focus:border-[#14361e] resize-none"
                                    ></textarea>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <button
                                        type="submit"
                                        className="lift-hover w-full bg-[#14361e] hover:bg-[#1e4d2b] text-white font-semibold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                                    >
                                        <Save size={16} />
                                        <span>{isEditing ? 'Perbarui Penugasan' : 'Simpan Penugasan'}</span>
                                    </button>

                                    {/* Tombol WhatsApp Ketua Tim (Nomor 3) */}
                                    {selectedTeam && (
                                        <button
                                            type="button"
                                            onClick={handleOpenWhatsApp}
                                            className="lift-hover w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                                            title="Kirim instruksi penugasan langsung ke WhatsApp Ketua Tim"
                                        >
                                            <MessageCircle size={16} />
                                            <span>
                                                {matchedTeamObj?.nomor_wa
                                                    ? `Kirim Instruksi ke WA Ketua Tim (${matchedTeamObj.nama_ketua ? matchedTeamObj.nama_ketua + ' - ' : ''}${matchedTeamObj.nomor_wa})`
                                                    : `Kirim Instruksi ke WhatsApp ${selectedTeam}`}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </form>

                        </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
                            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <RefreshCw size={13} /> Status Laporan
                            </h2>
                            <div className="space-y-2 pt-1">
                                {['Terbuka', 'Diproses', 'Selesai'].map((s) => (
                                    <label
                                        key={s}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${status === s ? 'border-[#14361e] bg-green-50/50 font-bold text-[#14361e]' : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300'
                                            } ${s === 'Selesai' && isSelesaiReport ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="statusLaporan"
                                            value={s}
                                            checked={status === s}
                                            disabled={s === 'Selesai' && isSelesaiReport}
                                            onChange={() => {
                                                // "Selesai" butuh data penanganan lapangan (durasi,
                                                // alat, foto) yang dilengkapi lewat Form Selesai --
                                                // jadi tidak langsung mengubah status seperti Terbuka/
                                                // Diproses, melainkan membuka form itu dulu.
                                                if (s === 'Selesai') {
                                                    handleOpenSelesaiModal();
                                                } else {
                                                    setStatus(s);
                                                }
                                            }}
                                            className="accent-[#14361e]"
                                        />
                                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s === 'Terbuka' ? '#dc2626' : s === 'Diproses' ? '#d97706' : '#16a34a' }}></span>
                                        <span className="text-xs">{s}</span>
                                    </label>
                                ))}
                            </div>
                            {isSelesaiReport && (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 pt-1">
                                    <Lock size={11} /> Laporan sudah selesai, data penanganan lapangan tersimpan.
                                </p>
                            )}
                        </div>

                        {/* Peta Lokasi Kejadian */}
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
                            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <Map size={13} /> Lokasi Kejadian
                            </h2>
                            <div ref={mapRef} className="w-full h-44 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 z-0"></div>
                            <button
                                onClick={() => window.open(`https://maps.google.com/?q=${currentReport.lat || -7.9666},${currentReport.lng || 112.6326}`, '_blank')}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                            >
                                <ExternalLink size={14} />
                                <span>Buka di Google Maps</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* MODAL FORM SELESAI -- wajib diisi saat status diubah ke
                    "Selesai", supaya data penanganan lapangan (durasi, alat,
                    foto hasil) tercatat, sama seperti di DetailLaporan.jsx. */}
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
            </div>
        </Sidebar>
    );
}