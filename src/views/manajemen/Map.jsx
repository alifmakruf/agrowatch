import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../layout/Sidebar';
import { Filter, X, ChevronRight, ChevronUp, ChevronDown, AlertTriangle, Camera, MapPin, Crosshair } from 'lucide-react';
import PhotoLightbox from '../../components/PhotoLightbox';
import DatePicker from 'react-datepicker';
import { getLaporanMapApi } from '../../api/laporan';
import { formatReportItem, useAppData, normalizeStatusToBackend } from '../../context/AppDataContext';

// Import Leaflet
import L from 'leaflet';
import 'leaflet.markercluster';

const STATUS_COLOR = {
    Terbuka: '#dc2626',
    Kritis: '#dc2626',
    Menunggu: '#dc2626',
    Diproses: '#d97706',
    'Sedang Diproses': '#d97706',
    Selesai: '#15803d',
    Ditutup: '#15803d',
    Terverifikasi: '#15803d',
};

function statusGroup(status) {
    if (status === 'Terbuka' || status === 'Kritis' || status === 'Menunggu') return 'terbuka';
    if (status === 'Diproses' || status === 'Sedang Diproses') return 'diproses';
    return 'ditutup';
}

export default function PetaManajemen() {
    const { kategoriKejadian } = useAppData();
    const navigate = useNavigate();
    const [mapReports, setMapReports] = useState([]);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [kategoriFilter, setKategoriFilter] = useState('Semua Kategori');
    const [statusChecks, setStatusChecks] = useState({ terbuka: true, diproses: true, ditutup: true });
    const [filterCollapsed, setFilterCollapsed] = useState(false);

    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const areaLayersRef = useRef([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const debounceTimerRef = useRef(null);
    const didMountCategoryEffect = useRef(false);

    // Fungsi fetch laporan berdasarkan Bounding Box Viewport Peta
    // CATATAN: sengaja TIDAK auto-memilih laporan pertama hasil fetch --
    // sebelumnya ini menyebabkan popup detail muncul sendiri tiap kali
    // peta di-pan/zoom (karena selectedReport sempat null setelah ditutup).
    const fetchBBoxReports = useCallback(async (mapInstance) => {
        if (!mapInstance) return;
        const bounds = mapInstance.getBounds();
        const min_lat = bounds.getSouth();
        const max_lat = bounds.getNorth();
        const min_lng = bounds.getWest();
        const max_lng = bounds.getEast();

        const params = {
            min_lat: Number(min_lat.toFixed(6)),
            max_lat: Number(max_lat.toFixed(6)),
            min_lng: Number(min_lng.toFixed(6)),
            max_lng: Number(max_lng.toFixed(6)),
        };

        if (kategoriFilter !== 'Semua Kategori') {
            params.jenis_kejadian = kategoriFilter;
        }

        try {
            const res = await getLaporanMapApi(params);
            const rawData = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
            const formatted = rawData.map(formatReportItem);
            setMapReports(formatted);
        } catch (err) {
            console.warn('Gagal fetch data BBox map:', err);
        }
    }, [kategoriFilter]);

    // Ref supaya event listener peta selalu memanggil versi terbaru
    // fetchBBoxReports TANPA perlu membongkar ulang instance peta setiap
    // kali kategoriFilter berubah (lihat efek inisialisasi peta di bawah).
    const fetchBBoxReportsRef = useRef(fetchBBoxReports);
    useEffect(() => {
        fetchBBoxReportsRef.current = fetchBBoxReports;
    }, [fetchBBoxReports]);

    // Data laporan yang punya koordinat, difilter sesuai kontrol di panel kiri
    const filteredReports = mapReports.filter((r) => {
        if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return false;
        if (!statusChecks[statusGroup(r.status)]) return false;
        if (kategoriFilter !== 'Semua Kategori' && r.kategori !== kategoriFilter) return false;
        if (startDate && r.createdAt && new Date(r.createdAt) < startDate) return false;
        if (endDate && r.createdAt && new Date(r.createdAt) > endDate) return false;
        return true;
    });

    useEffect(() => {
        // Inisialisasi Peta -- HANYA SEKALI saat komponen mount (deps kosong).
        // BUG SEBELUMNYA: efek ini punya dependency [fetchBBoxReports], padahal
        // fetchBBoxReports adalah useCallback yang identitasnya berubah tiap
        // kategoriFilter ATAU selectedReport berubah. Akibatnya, setiap kali
        // marker diklik atau popup detail ditutup, seluruh peta di-destroy
        // (map.remove()) lalu dibuat ULANG dari titik default -- itulah
        // sumber bug "kepental ke area default" dan "popup kebuka sendiri".
        const map = L.map('map-container', { zoomControl: false }).setView([-7.9666, 112.6326], 9);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);
        mapRef.current = map;

        // Muat SEMUA laporan (tanpa batas bounding box) sekali di awal untuk
        // menentukan area fokus yang relevan -- bukan selalu titik default
        // yang sama. Kalau ada laporan, peta langsung fitBounds ke situ.
        (async () => {
            try {
                const res = await getLaporanMapApi({});
                const rawData = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
                const formatted = rawData
                    .map(formatReportItem)
                    .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number');

                if (formatted.length > 0) {
                    const bounds = L.latLngBounds(formatted.map((r) => [r.lat, r.lng]));
                    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
                }
            } catch (err) {
                console.warn('Gagal menentukan area fokus awal peta:', err);
            } finally {
                // Setelah posisi awal ditentukan, lanjut ke mode fetch
                // berbasis bounding box viewport seperti biasa.
                fetchBBoxReportsRef.current(map);
            }
        })();

        // Event listener moveend / zoomend dengan debounce 300ms
        const handleMapMove = () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                fetchBBoxReportsRef.current(map);
            }, 300);
        };

        map.on('moveend', handleMapMove);
        map.on('zoomend', handleMapMove);

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            map.off('moveend', handleMapMove);
            map.off('zoomend', handleMapMove);
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Saat filter Kategori berubah, cukup refetch data bbox pada viewport
    // yang sedang aktif -- TIDAK perlu (dan tidak boleh) membangun ulang peta.
    useEffect(() => {
        if (!didMountCategoryEffect.current) {
            didMountCategoryEffect.current = true;
            return;
        }
        if (mapRef.current) {
            fetchBBoxReports(mapRef.current);
        }
    }, [kategoriFilter, fetchBBoxReports]);

    // Render ulang marker dan visualisasi area/radius setiap kali data/filter berubah
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        markersRef.current.forEach((m) => map.removeLayer(m));
        markersRef.current = [];
        areaLayersRef.current.forEach((l) => map.removeLayer(l));
        areaLayersRef.current = [];

        filteredReports.forEach((item) => {
            const warna = STATUS_COLOR[item.status] || '#6b7280';

            // VISUALISASI RADIUS / AREA -- SEBELUMNYA tidak pernah digambar
            // sama sekali di peta ini walau komentar di atas menyebut
            // "visualisasi area/radius"; datanya juga baru benar-benar
            // tersimpan & terbaca sejak formatReportItem & backend
            // diperbaiki untuk field location_type/radius/area_*.
            if (item.locationType === 'radius' && item.radius) {
                const radiusInMeters = item.radiusUnit === 'km' ? item.radius * 1000 : item.radius;
                const radiusCircle = L.circle([item.lat, item.lng], {
                    color: '#2563eb',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.15,
                    weight: 2,
                    dashArray: '6, 6',
                    radius: radiusInMeters,
                }).addTo(map);
                radiusCircle.bindTooltip(`Radius: ${item.radius} ${item.radiusUnit}`, { direction: 'top' });
                areaLayersRef.current.push(radiusCircle);
            } else if (item.locationType === 'area' && item.areaDimension1) {
                if (item.areaType === 'lingkaran') {
                    const radiusInMeters = item.areaDimension1 || 50;
                    const areaCircle = L.circle([item.lat, item.lng], {
                        color: '#16a34a',
                        fillColor: '#22c55e',
                        fillOpacity: 0.18,
                        weight: 2,
                        dashArray: '4, 4',
                        radius: radiusInMeters,
                    }).addTo(map);
                    areaCircle.bindTooltip(`Area Lingkaran: r=${radiusInMeters}m`, { direction: 'top' });
                    areaLayersRef.current.push(areaCircle);
                } else {
                    const dim1 = item.areaDimension1 || 100;
                    const dim2 = item.areaDimension2 && item.areaDimension2 > 0 ? item.areaDimension2 : dim1;
                    const latOffset = dim1 / 111000;
                    const lngOffset = dim2 / (111000 * Math.cos((item.lat * Math.PI) / 180));
                    const bounds = [
                        [item.lat - latOffset / 2, item.lng - lngOffset / 2],
                        [item.lat + latOffset / 2, item.lng + lngOffset / 2],
                    ];
                    const areaRect = L.rectangle(bounds, {
                        color: '#16a34a',
                        fillColor: '#22c55e',
                        fillOpacity: 0.18,
                        weight: 2,
                        dashArray: '4, 4',
                    }).addTo(map);
                    areaRect.bindTooltip(`Area Persegi: ${dim1}m × ${dim2}m`, { direction: 'top' });
                    areaLayersRef.current.push(areaRect);
                }
            }

            // MARKER PIN PUSAT
            const customIcon = L.divIcon({
                className: 'custom-pin',
                html: `
                    <div style="
                        background-color: ${warna};
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 0 6px ${warna};
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    "></div>
                `,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
            });

            const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(map);
            marker.bindTooltip(`<b>${item.jenisLabel}</b><br/>${item.sektor}`, { direction: 'top' });
            marker.on('click', () => setSelectedReport(item));
            markersRef.current.push(marker);
        });
    }, [filteredReports]);

    const toggleStatus = (key) => setStatusChecks((s) => ({ ...s, [key]: !s[key] }));

    const handleFocusLocation = (report) => {
        if (!mapRef.current || !report) return;
        mapRef.current.flyTo([report.lat, report.lng], 16, { duration: 1.2 });
    };

    const categories = (kategoriKejadian && kategoriKejadian.length > 0)
        ? kategoriKejadian
        : ['Serangan Hama', 'Penyakit Tanaman', 'Kebakaran', 'Banjir/Genangan', 'Kerusakan Irigasi', 'Kendala Lainnya'];

    return (
        <Sidebar>
            <div className="flex h-[calc(100vh-4rem)] relative overflow-hidden">

                {/* CONTAINER UTAMA PETA */}
                <div id="map-container" className="w-full h-full absolute inset-0 z-0"></div>

                {/* 1. FILTER PETA PANEL (Melayang di Kiri Atas Peta) */}
                <div className={`absolute top-6 left-6 z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-80 p-5 max-h-[calc(100vh-7rem)] overflow-y-auto ${filterCollapsed ? '' : 'space-y-4'}`}>
                    <div className={`flex items-center justify-between ${filterCollapsed ? '' : 'border-b border-gray-100 dark:border-gray-800 pb-3'}`}>
                        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Filter Peta Interaktif</h2>
                        <div className="flex items-center gap-1">
                            <Filter size={16} className="text-gray-500 dark:text-gray-400" />
                            <button
                                onClick={() => setFilterCollapsed((v) => !v)}
                                className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 p-1 rounded-md transition-colors cursor-pointer"
                                title={filterCollapsed ? 'Perluas panel filter' : 'Kecilkan panel filter'}
                            >
                                {filterCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </button>
                        </div>
                    </div>

                    {!filterCollapsed && (
                        <>
                            {/* Status Checkbox */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</label>
                                <div className="space-y-1.5 text-xs">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input type="checkbox" checked={statusChecks.terbuka} onChange={() => toggleStatus('terbuka')} className="rounded text-green-900 w-4 h-4" />
                                        <span className="w-3 h-3 rounded-sm bg-red-600 inline-block"></span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">Terbuka (Open)</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input type="checkbox" checked={statusChecks.diproses} onChange={() => toggleStatus('diproses')} className="rounded text-green-900 w-4 h-4" />
                                        <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block"></span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">Sedang Diproses (On-Progress)</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input type="checkbox" checked={statusChecks.ditutup} onChange={() => toggleStatus('ditutup')} className="rounded text-green-900 w-4 h-4" />
                                        <span className="w-3 h-3 rounded-sm bg-green-700 inline-block"></span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">Ditutup (Closed)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Kategori Dropdown */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Kategori / Jenis</label>
                                <select
                                    value={kategoriFilter}
                                    onChange={(e) => setKategoriFilter(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-xs outline-none font-medium text-gray-700 dark:text-gray-300"
                                >
                                    <option>Semua Kategori</option>
                                    {categories.map((kat, idx) => (
                                        <option key={idx} value={kat}>{kat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Rentang Tanggal */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Rentang Tanggal</label>
                                <div className="flex items-center gap-2">
                                    <DatePicker
                                        selected={startDate}
                                        onChange={(date) => setStartDate(date)}
                                        placeholderText="mm/dd/yyyy"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-[11px] outline-none"
                                    />
                                    <span className="text-gray-400 dark:text-gray-500">-</span>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={(date) => setEndDate(date)}
                                        placeholderText="mm/dd/yyyy"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-[11px] outline-none"
                                    />
                                </div>
                            </div>

                            <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-800">
                                Menampilkan {filteredReports.length} pin laporan pada viewport saat ini.
                            </p>
                        </>
                    )}
                </div>

                {/* 2. KARTU INFORMASI / POPUP DETAIL (Melayang di Kanan Atas saat Marker Diklik) */}
                {selectedReport && (
                    <div className="absolute top-6 right-16 z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-96 overflow-hidden animate-in fade-in slide-in-from-right duration-200 max-h-[calc(100vh-7rem)] overflow-y-auto">

                        {/* Foto & Banner Status */}
                        <div className="relative h-48 bg-gray-900 flex items-center justify-center overflow-hidden">
                            {selectedReport.image ? (
                                <img
                                    src={selectedReport.image}
                                    alt={selectedReport.jenisLabel}
                                    onClick={() => setLightboxSrc(selectedReport.image)}
                                    className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 text-xs gap-1.5 bg-gray-800">
                                    <Camera size={26} className="text-gray-500 dark:text-gray-400" />
                                    <span>Belum ada foto bukti lapangan</span>
                                </div>
                            )}
                            <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow">
                                <AlertTriangle size={12} /> {selectedReport.status?.toUpperCase()}
                            </div>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Konten Detail */}
                        <div className="p-5 space-y-4">
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{selectedReport.jenisLabel}</h3>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                        <MapPin size={11} /> #{selectedReport.id}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">@{selectedReport.sektor} (Lat: {selectedReport.lat.toFixed(5)}, Lng: {selectedReport.lng.toFixed(5)})</p>
                            </div>

                            {/* Grid Info Pelapor & Kategori */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-2.5 rounded-xl">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Pelapor</span>
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{selectedReport.pelapor}</span>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 p-2.5 rounded-xl">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Kategori</span>
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{selectedReport.kategori}</span>
                                </div>
                            </div>

                            {/* Tindak Lanjut Terakhir */}
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tindak Lanjut Terakhir</span>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl">
                                    {selectedReport.tindakLanjut}
                                </p>
                            </div>

                            {/* Tombol Aksi */}
                            <div className="space-y-2 pt-1">
                                <button
                                    onClick={() => handleFocusLocation(selectedReport)}
                                    className="w-full bg-white dark:bg-gray-900 hover:bg-gray-50 text-emerald-900 border border-emerald-700 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                    <span className="flex items-center gap-1.5"><Crosshair size={13} /> Fokus ke Titik Lokasi</span>
                                </button>
                                <button
                                    onClick={() => navigate(`/manajemen/laporan/${selectedReport.rawId ?? selectedReport.id}`)}
                                    className="w-full bg-[#14361e] hover:bg-[#1e4d2b] text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                                >
                                    <span>Lihat Detail Lengkap</span>
                                    <ChevronRight size={16} />
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
