import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../layout/Sidebar';
import { ArrowLeft, Save, MapPin, ExternalLink, ClipboardList, FilePenLine, RefreshCw, Map } from 'lucide-react';
import { useAppData, formatReportItem } from '../../context/AppDataContext';
import { getLaporanDetailApi } from '../../api/laporan';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function DetailTindakLanjut() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { reports, updateReportStatus } = useAppData();
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

    useEffect(() => {
        if (currentReport.status) setStatus(currentReport.status);
    }, [currentReport.status]);

    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current) return;

        const lat = currentReport.lat || -7.9666;
        const lng = currentReport.lng || 112.6326;
        const zoom = 15;

        if (!mapInstanceRef.current) {
            const map = L.map(mapRef.current, { zoomControl: false }).setView([lat, lng], zoom);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
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

    const constraints = ['Akses Jalan', 'Cuaca', 'Ketersediaan Pestisida', 'Alat Rusak'];

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedTeam) {
            alert('Silakan pilih Tim Penanggung Jawab terlebih dahulu.');
            return;
        }

        const note = `Tim: ${selectedTeam}${selectedConstraint ? ` (Kendala: ${selectedConstraint})` : ''}. ${instructions}`.trim();

        try {
            await updateReportStatus(currentReport.rawId || id, status === 'Terbuka' ? 'Diproses' : status, note);
            alert(`Penugasan untuk laporan #${currentReport.id} berhasil disimpan!`);
            navigate('/manajemen/tindak-lanjut');
        } catch (err) {
            alert('Gagal menyimpan penugasan.');
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
                                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{currentReport.jenisLabel || 'Serangan Hama'}</span>
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

                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-5">
                            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <FilePenLine size={13} /> Form Penugasan
                            </h2>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tim Penanggung Jawab</label>
                                    <select
                                        value={selectedTeam}
                                        onChange={(e) => setSelectedTeam(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs outline-none focus:bg-white dark:bg-gray-900 focus:border-[#14361e] font-medium text-gray-700 dark:text-gray-300"
                                    >
                                        <option value="">Pilih Tim...</option>
                                        <option value="Tim Alpha (Hama & Penyakit)">Tim Alpha (Hama & Penyakit)</option>
                                        <option value="Tim Bravo (Irigasi & Infrastruktur)">Tim Bravo (Irigasi & Infrastruktur)</option>
                                        <option value="Tim Charlie (Keamanan & Patroli)">Tim Charlie (Keamanan & Patroli)</option>
                                    </select>
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

                                <button
                                    type="submit"
                                    className="w-full bg-[#14361e] hover:bg-[#1e4d2b] text-white font-semibold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                                >
                                    <Save size={16} />
                                    <span>Simpan Penugasan</span>
                                </button>
                            </form>
                        </div>
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
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${status === s ? 'border-[#14361e] bg-green-50/50 font-bold text-[#14361e]' : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="statusLaporan"
                                            value={s}
                                            checked={status === s}
                                            onChange={() => setStatus(s)}
                                            className="accent-[#14361e]"
                                        />
                                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s === 'Terbuka' ? '#dc2626' : s === 'Diproses' ? '#d97706' : '#16a34a' }}></span>
                                        <span className="text-xs">{s}</span>
                                    </label>
                                ))}
                            </div>
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
            </div>
        </Sidebar>
    );
}