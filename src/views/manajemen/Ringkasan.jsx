import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../layout/Sidebar';
import { useAppData } from '../../context/AppDataContext';
import { ExternalLink, RefreshCw, BarChart3, CalendarDays, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import PhotoLightbox from '../../components/PhotoLightbox';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
    if (status === 'Terbuka' || status === 'Kritis' || status === 'Menunggu') return 'Open';
    if (status === 'Diproses' || status === 'Sedang Diproses') return 'In Progress';
    return 'Closed';
}

export default function RingkasanManajemen() {
    const { reports, summary, fetchSummary, fetchReports, reportsLoading } = useAppData();
    const navigate = useNavigate();
    const [lightboxSrc, setLightboxSrc] = useState(null);

    const miniMapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        fetchSummary();
        fetchReports();
    }, [fetchSummary, fetchReports]);

    // Dapatkan laporan terbaru yang memiliki koordinat valid
    const latestReportWithLocation = useMemo(() => {
        return [...reports]
            .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
            .sort((a, b) => Number(b.id_laporan ?? b.rawId ?? 0) - Number(a.id_laporan ?? a.rawId ?? 0))[0] || null;
    }, [reports]);

    // Inisialisasi dan sinkronisasi mini map insiden langsung
    useEffect(() => {
        if (!miniMapRef.current) return;

        if (!mapInstanceRef.current) {
            const initialLat = latestReportWithLocation ? latestReportWithLocation.lat : -7.9666;
            const initialLng = latestReportWithLocation ? latestReportWithLocation.lng : 112.6326;
            const initialZoom = latestReportWithLocation ? 15 : 8;

            const map = L.map(miniMapRef.current, {
                zoomControl: false,
                attributionControl: false,
                dragging: true,
                touchZoom: true,
                scrollWheelZoom: false,
            }).setView([initialLat, initialLng], initialZoom);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(map);

            mapInstanceRef.current = map;
        }

        const map = mapInstanceRef.current;

        // Bersihkan layer sebelumnya
        if (markerRef.current) {
            map.removeLayer(markerRef.current);
            markerRef.current = null;
        }

        if (latestReportWithLocation) {
            const item = latestReportWithLocation;
            const warna = STATUS_COLOR[item.status] || '#dc2626';

            // Pin Marker dengan Animasi Pulse
            const customIcon = L.divIcon({
                className: 'mini-map-pin',
                html: `
                    <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
                        <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background-color: ${warna}; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                        <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${warna}; border: 2.5px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.6); position: relative; z-index: 2;"></div>
                    </div>
                `,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
            });

            markerRef.current = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(map);
            map.setView([item.lat, item.lng], 15);
        }

        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => {
            clearTimeout(timer);
        };
    }, [latestReportWithLocation]);

    // Urutkan berdasarkan ID laporan (id_laporan) turun -- BUKAN berdasarkan
    // "createdAt" string tanggal. Sebelumnya field itu memakai
    // `waktu_lapor` (tanggal kejadian yang bisa diisi bebas oleh pelapor,
    // bisa mundur/berbeda dari waktu submit) sehingga urutan "Laporan
    // Terbaru" bisa salah -- laporan yang baru disubmit malah muncul di
    // bawah. id_laporan bersifat auto-increment sehingga selalu mencerminkan
    // urutan pengiriman yang sebenarnya, terlepas dari tanggal kejadian
    // yang diisi manual.
    const laporanTerbaru = [...reports]
        .sort((a, b) => Number(b.id_laporan ?? b.rawId ?? 0) - Number(a.id_laporan ?? a.rawId ?? 0))
        .slice(0, 4)
        .map((r) => ({
            id: '#' + r.id,
            type: r.jenisLabel,
            location: r.sektor,
            status: statusGroup(r.status),
            date: r.createdAt ? new Date(r.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
        }));

    // Data Metrik dari API Summary atau fallback kalkulasi lokal
    const total = summary?.total_laporan ?? reports.length;
    const todayCount = reports.filter((r) => r.createdAt && new Date(r.createdAt).toDateString() === new Date().toDateString()).length;
    const openCount = summary?.open ?? reports.filter((r) => statusGroup(r.status) === 'Open').length;
    const inProgressCount = summary?.on_progress ?? reports.filter((r) => statusGroup(r.status) === 'In Progress').length;
    const closedCount = summary?.closed ?? reports.filter((r) => statusGroup(r.status) === 'Closed').length;

    // Persentase Kategori dari Summary API atau reports
    const kategoriCount = summary?.by_jenis || reports.reduce((acc, r) => {
        acc[r.kategori] = (acc[r.kategori] || 0) + 1;
        return acc;
    }, {});
    const kategoriTotal = Object.values(kategoriCount).reduce((a, b) => a + b, 0) || 1;

    // Jumlah personel unik yang sudah pernah membuat laporan -- dihitung dari
    // id pelapor kalau ada (akun terdaftar), fallback ke nama pelapor untuk
    // laporan tamu/anonim yang tidak punya id.
    const pelaporUniqueCount = new Set(
        reports.map((r) => r.pelaporId ?? r.pelapor).filter(Boolean)
    ).size;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Open':
                return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">Open</span>;
            case 'In Progress':
                return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">In Progress</span>;
            case 'Closed':
                return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Closed</span>;
            default:
                return null;
        }
    };

    return (
        <Sidebar>
            <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">

                {/* Header Ringkasan */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ringkasan Operasional</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Status real-time dan metrik insiden perkebunan.</p>
                    </div>
                    <button
                        onClick={() => { fetchSummary(); fetchReports(); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                        title="Refresh Metrik"
                    >
                        <RefreshCw size={14} className={reportsLoading ? 'animate-spin' : ''} />
                        <span>Refresh Data</span>
                    </button>
                </div>

                {/* 5 KARTU METRIK UTAMA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                    {/* Card 1: Total Laporan */}
                    <div className="lift-hover bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-400 dark:text-gray-500 mb-2">
                            <span className="p-2 bg-green-50 text-green-700 rounded-lg"><BarChart3 size={16} /></span>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Total</span>
                        </div>
                        <div>
                            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{total.toLocaleString('id-ID')}</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">Semua insiden hingga saat ini</p>
                        </div>
                    </div>

                    {/* Card 2: Hari Ini */}
                    <div className="lift-hover bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
                        <span className="p-2 bg-green-50 text-green-700 rounded-lg w-fit mb-2"><CalendarDays size={16} /></span>
                        <div>
                            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{todayCount}</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Hari Ini</p>
                        </div>
                    </div>

                    {/* Card 3: Terbuka */}
                    <div className="lift-hover bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
                        <span className="p-2 bg-red-50 text-red-600 rounded-lg w-fit mb-2"><AlertTriangle size={16} /></span>
                        <div>
                            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{openCount}</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Terbuka</p>
                        </div>
                    </div>

                    {/* Card 4: Sedang Diproses */}
                    <div className="lift-hover bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
                        <span className="p-2 bg-amber-50 text-amber-600 rounded-lg w-fit mb-2"><Loader2 size={16} /></span>
                        <div>
                            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{inProgressCount}</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Sedang Diproses</p>
                        </div>
                    </div>

                    {/* Card 5: Ditutup */}
                    <div className="lift-hover bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
                        <span className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 rounded-lg w-fit mb-2"><CheckCircle2 size={16} /></span>
                        <div>
                            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{closedCount}</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Ditutup</p>
                        </div>
                    </div>

                </div>

                {/* BAGIAN TENGAH: TABEL LAPORAN (Kiri) & WIDGET KANAN */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Kolom Kiri: Laporan Terbaru (2 Kolom span) */}
                    <div className="lift-hover lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">Laporan Terbaru</h2>
                            <button onClick={() => navigate('/manajemen/laporan')} className="text-xs font-semibold text-green-700 hover:underline cursor-pointer">Lihat Semua</button>
                        </div>

                        {/* max-h + overflow-y-auto: card tetap fleksibel mengikuti konten
                            (tidak dipaksa tinggi tetap saat data sedikit), tapi punya batas
                            atas supaya tidak tumbuh tanpa henti kalau laporan banyak. */}
                        <div className="overflow-x-auto overflow-y-auto max-h-[360px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                                    <tr className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                                        <th className="pb-3">ID</th>
                                        <th className="pb-3">Type</th>
                                        <th className="pb-3">Location</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-xs">
                                    {laporanTerbaru.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-gray-400 dark:text-gray-500">Belum ada data laporan insiden.</td>
                                        </tr>
                                    ) : (
                                        laporanTerbaru.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="py-4 font-bold text-gray-900 dark:text-gray-100">{item.id}</td>
                                                <td className="py-4 text-gray-700 dark:text-gray-300 font-medium">{item.type}</td>
                                                <td className="py-4 text-gray-500 dark:text-gray-400">{item.location}</td>
                                                <td className="py-4">{getStatusBadge(item.status)}</td>
                                                <td className="py-4 text-gray-400 dark:text-gray-500">{item.date}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Kolom Kanan: Personel Aktif & Peta Insiden Langsung */}
                    <div className="space-y-6">

                        {/* Personel Lapangan Aktif -- jumlah user unik yang sudah pernah
                            membuat laporan (dihitung dari data laporan asli, bukan
                            avatar dummy statis seperti sebelumnya). */}
                        <div className="lift-hover bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-5">
                            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">Personel Lapangan Aktif</h2>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-4">Jumlah pelapor unik dari seluruh laporan tercatat</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{pelaporUniqueCount}</h3>
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">orang</span>
                            </div>
                        </div>

                        {/* Peta Insiden Langsung (Live Interactive Mini Map) */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse inline-block"></span>
                                    <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Peta Insiden Langsung</h2>
                                </div>
                                <button
                                    onClick={() => navigate('/manajemen/map')}
                                    className="text-xs font-semibold text-green-700 hover:text-green-900 flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                    <span>Buka Peta</span>
                                    <ExternalLink size={12} />
                                </button>
                            </div>

                            <div className="w-full h-48 bg-gray-900 rounded-xl relative overflow-hidden border border-gray-200 dark:border-gray-800 shadow-inner group">
                                <div ref={miniMapRef} className="w-full h-full z-0"></div>

                                {latestReportWithLocation ? (
                                    <>
                                        {/* Floating Top Badge */}
                                        <div className="absolute top-2.5 left-2.5 z-10 bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow border border-white/10">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                                            <span className="truncate max-w-[170px]">{latestReportWithLocation.jenisLabel}</span>
                                        </div>

                                        {/* Floating Bottom Card */}
                                        <div
                                            onClick={() => navigate('/manajemen/map')}
                                            className="absolute bottom-2.5 inset-x-2.5 z-10 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-lg border border-gray-100 dark:border-gray-800 flex items-center justify-between cursor-pointer hover:bg-white transition-colors"
                                        >
                                            <div className="min-w-0 pr-2">
                                                <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">
                                                    {latestReportWithLocation.sektor} ({latestReportWithLocation.lat.toFixed(4)}, {latestReportWithLocation.lng.toFixed(4)})
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                    {latestReportWithLocation.pelapor} • {latestReportWithLocation.createdAt ? new Date(latestReportWithLocation.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 shrink-0">
                                                {latestReportWithLocation.status}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs text-white text-xs z-10">
                                        Belum ada data lokasi insiden
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                </div>

                {/* BAGIAN BAWAH: DOKUMENTASI TERKINI & JENIS INSIDEN */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Dokumentasi Terkini (2 Kolom span) */}
                    <div className="lift-hover lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">Dokumentasi Terkini</h2>
                            <button onClick={() => navigate('/manajemen/laporan')} className="text-xs font-semibold text-green-700 hover:underline cursor-pointer">Lihat Semua</button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {reports.slice(0, 3).map((r, i) => {
                                const photoUrl = r.image || "https://images.unsplash.com/photo-1595974482597-4e8296a255e4?w=400";
                                return (
                                    <div
                                        key={i}
                                        className="relative rounded-xl overflow-hidden group shadow-xs h-32 bg-gray-900 cursor-zoom-in"
                                        onClick={() => setLightboxSrc(photoUrl)}
                                    >
                                        <img
                                            src={photoUrl}
                                            alt={r.jenisLabel}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end text-white">
                                            <p className="text-[10px] font-medium text-gray-300">
                                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                                            </p>
                                            <p className="text-xs font-bold truncate">{r.sektor} - {r.jenisLabel}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Jenis Insiden (Bar Persentase) */}
                    {/* <div className="lift-hover bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-6">
                        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-6">Jenis Insiden</h2>

                        <div className="space-y-5">
                            {Object.entries(kategoriCount).length === 0 && (
                                <p className="text-xs text-gray-400 dark:text-gray-500">Belum ada data insiden.</p>
                            )}
                            {Object.entries(kategoriCount).map(([kat, count], i) => {
                                const countVal = Number(count) || 0;
                                const pct = Math.round((countVal / kategoriTotal) * 100);
                                const colors = ['bg-red-500', 'bg-green-700', 'bg-yellow-500', 'bg-blue-500'];
                                return (
                                    <div key={kat}>
                                        <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            <span>{kat}</span>
                                            <span className="font-bold">{pct}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                                            <div className={`${colors[i % colors.length]} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    </div> */}

                </div>

                <PhotoLightbox src={lightboxSrc} alt="Dokumentasi Laporan" onClose={() => setLightboxSrc(null)} />

            </div>
        </Sidebar>
    );
}