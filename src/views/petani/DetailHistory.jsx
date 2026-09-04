import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Calendar, MapPin, ExternalLink, Crosshair } from 'lucide-react';
import { useAppData, formatReportItem } from '../../context/AppDataContext';
import { getLaporanDetailApi } from '../../api/laporan';
import PhotoLightbox from '../../components/PhotoLightbox';
import CategoryIcon from '../../components/CategoryIcon';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function DetailHistory() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { reports } = useAppData();
    const [remoteReport, setRemoteReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    // Fetch detail dari API jika diakses langsung
    useEffect(() => {
        let isMounted = true;
        async function fetchDetail() {
            if (!id) return;
            const cleanId = String(id).replace('#', '').replace('RP-', '');
            const localFound = reports.find(r => String(r.id) === String(id) || String(r.id) === cleanId || String(r.rawId) === cleanId);
            if (localFound) {
                setRemoteReport(localFound);
                return;
            }

            setLoading(true);
            try {
                const res = await getLaporanDetailApi(cleanId);
                const item = res.laporan || res.data || res;
                if (item && isMounted) {
                    setRemoteReport(formatReportItem(item));
                }
            } catch (err) {
                console.warn('Gagal ambil detail laporan dari server:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchDetail();
        return () => {
            isMounted = false;
        };
    }, [id, reports]);

    const report = useMemo(() => {
        if (remoteReport) return remoteReport;

        const cleanId = id ? String(id).replace('#', '').replace('RP-', '') : '';
        const found = reports.find(r => String(r.id) === String(id) || String(r.id) === cleanId || String(r.rawId) === cleanId);
        if (found) return found;

        return {
            id: id || 'RP-2024-089',
            tanggal: '12 Okt 2024, 09:45 AM',
            jenisLabel: 'Serangan Hama',
            pelapor: 'Budi Waluyo',
            sektor: 'Blok A',
            status: 'Diproses',
            deskripsi: 'Ditemukan bercak coklat kemerahan dan lubang pada daun tebu di sebagian besar tanaman.',
            lat: -7.9666,
            lng: 112.6326,
            locationType: 'titik',
            image: "https://images.unsplash.com/photo-1595974482597-4e8296a255e4?w=800",
            tindakLanjut: 'Menunggu penanganan lebih lanjut dari tim manajemen.',
        };
    }, [remoteReport, id, reports]);

    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current) return;

        const lat = report.lat;
        const lng = report.lng;
        const zoom = report.locationType === 'radius' || report.locationType === 'area' ? 14 : 16;

        if (!mapInstanceRef.current) {
            const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], zoom);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
                maxZoom: 19,
            }).addTo(map);

            mapInstanceRef.current = map;
        }

        const map = mapInstanceRef.current;
        map.setView([lat, lng], zoom);

        if (markerRef.current) {
            map.removeLayer(markerRef.current);
            markerRef.current = null;
        }

        const warna = report.status === 'Selesai' ? '#16a34a' : report.status === 'Diproses' ? '#d97706' : '#dc2626';

        const customIcon = L.divIcon({
            className: 'custom-pin-detail',
            html: `
                <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                    <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background-color: ${warna}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                    <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background-color: ${warna}; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.45);"></div>
                </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
        });

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        marker.bindPopup(`<b>${report.jenisLabel}</b><br/>${report.sektor}`).openPopup();
        markerRef.current = marker;

        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => {
            clearTimeout(timer);
        };
    }, [report]);

    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    const handleFocusLocation = () => {
        if (!mapInstanceRef.current) return;
        mapInstanceRef.current.flyTo([report.lat, report.lng], 16, { duration: 1 });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Selesai':
            case 'Ditutup':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Diproses':
            case 'Sedang Diproses':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Terbuka':
            case 'Menunggu':
            case 'Kritis':
            default:
                return 'bg-red-100 text-red-700 border-red-200';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex flex-col font-sans text-gray-800 dark:text-gray-200">
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/petani/history')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
                    </button>
                    <h1 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Detail Laporan</h1>
                </div>
                <button
                    onClick={() => alert('Detail laporan insiden tersimpan di database AgroWatch.')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 dark:text-gray-400 cursor-pointer"
                >
                    <HelpCircle size={20} />
                </button>
            </header>

            <main className="flex-1 p-6 lg:p-10">
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Banner ID & Status */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">ID LAPORAN</span>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {String(report.id).startsWith('#') ? report.id : '#' + report.id}
                            </h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 mt-1">
                                <Calendar size={13} /> {report.tanggal ? new Date(report.tanggal).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                            </p>
                        </div>
                        <div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(report.status)}`}>
                                <span className={`w-2 h-2 rounded-full ${report.status === 'Selesai' ? 'bg-emerald-600' : report.status === 'Diproses' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                {report.status}
                            </span>
                        </div>
                    </div>

                    {/* Jenis & Pelapor */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">JENIS INSIDEN</span>
                            <CategoryIcon name={report.jenisLabel} size={18} withBackground showLabel labelClassName="font-bold text-gray-900 dark:text-gray-100 text-sm" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">PELAPOR</span>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#1a472a] text-white flex items-center justify-center font-bold text-xs">
                                    {(report.pelapor || 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{report.pelapor}</span>
                            </div>
                        </div>
                    </div>

                    {/* Deskripsi */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">DESKRIPSI KEJADIAN</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                            {report.deskripsi || 'Tidak ada deskripsi detail tambahan.'}
                        </p>
                    </div>

                    {/* Bukti Foto Lapangan */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">BUKTI FOTO</span>
                        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 relative">
                            <div className="h-64 bg-gray-900 flex items-center justify-center relative">
                                <img
                                    src={report.image || "https://images.unsplash.com/photo-1595974482597-4e8296a255e4?w=800"}
                                    alt="Bukti Foto"
                                    onClick={() => setLightboxSrc(report.image || "https://images.unsplash.com/photo-1595974482597-4e8296a255e4?w=800")}
                                    className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card Lokasi Kejadian dengan Peta Interaktif Leaflet */}
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">LOKASI KEJADIAN</span>
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1 mt-0.5">
                                    <MapPin size={13} className="text-red-500" />
                                    {report.sektor}
                                </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-800">
                                {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
                            </span>
                        </div>
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-inner">
                            <div
                                ref={mapRef}
                                style={{ height: '240px', width: '100%' }}
                                className="z-0"
                            ></div>
                            <div className="absolute bottom-3 right-3 z-[400] flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleFocusLocation}
                                    className="bg-white/95 hover:bg-white text-gray-700 dark:text-gray-300 font-semibold text-xs py-1.5 px-3 rounded-lg shadow border border-gray-200 dark:border-gray-800 flex items-center gap-1 cursor-pointer"
                                >
                                    <Crosshair size={13} className="text-emerald-700" />
                                    <span>Pusatkan</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.open(`https://www.google.com/maps?q=${report.lat},${report.lng}`, '_blank')}
                                    className="bg-[#1a472a] hover:bg-[#12331e] text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow flex items-center gap-1 cursor-pointer"
                                >
                                    <ExternalLink size={13} />
                                    <span>Google Maps</span>
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
            <PhotoLightbox src={lightboxSrc} alt="Bukti Foto" onClose={() => setLightboxSrc(null)} />
        </div>
    );
}