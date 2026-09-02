import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, MapPin, CircleDashed, Map, Crosshair, Camera, AlertCircle, Lightbulb, Square, AlertTriangle, Expand } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import PhotoLightbox from '../../components/PhotoLightbox';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function FormPetani() {
    const navigate = useNavigate();
    const { addReport, auth, kategoriKejadian, sektorList } = useAppData();

    // State untuk mengontrol tab lokasi aktif (Titik, Radius, Area)
    const [locationType, setLocationType] = useState('titik');

    // State form terhubung ke API backend
    const [jenis, setJenis] = useState('');
    const [tanggal, setTanggal] = useState(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });
    const [sektor, setSektor] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [fotoFile, setFotoFile] = useState(null);
    const [fotoName, setFotoName] = useState('');
    const [fotoPreview, setFotoPreview] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [locating, setLocating] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // State untuk Radius (UI dipertahankan, backend saat ini menerima titik pusat)
    const [radius, setRadius] = useState('');
    const [radiusUnit, setRadiusUnit] = useState('m');

    // State untuk Area (UI dipertahankan, backend saat ini menerima titik pusat)
    const [areaType, setAreaType] = useState('persegi');
    const [areaDimension1, setAreaDimension1] = useState('');
    const [areaDimension2, setAreaDimension2] = useState('');

    // State untuk map preview
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const circleRef = useRef(null);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Perangkat ini tidak mendukung deteksi lokasi otomatis. Silakan isi koordinat secara manual.');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLat(pos.coords.latitude.toFixed(6));
                setLng(pos.coords.longitude.toFixed(6));
                setLocating(false);
            },
            () => {
                alert('Gagal mengambil lokasi. Pastikan izin lokasi diaktifkan, atau isi koordinat secara manual.');
                setLocating(false);
            }
        );
    };

    const handleFotoChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            setFotoFile(file);
            setFotoName(file.name);
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                setFotoPreview(uploadEvent.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            setFotoFile(null);
            setFotoName('');
            setFotoPreview(null);
        }
    };

    const handleRemoveFoto = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setFotoFile(null);
        setFotoName('');
        setFotoPreview(null);
    };

    const validate = () => {
        const next = {};
        if (!jenis) next.jenis = 'Pilih jenis kejadian.';
        if (!tanggal) next.tanggal = 'Isi tanggal & waktu kejadian.';
        if (!sektor) next.sektor = 'Pilih lahan/sektor terkena dampak.';
        if (!lat || !lng) next.lokasi = 'Isi koordinat lokasi atau gunakan lokasi saat ini.';
        if (!fotoFile && !fotoPreview) next.foto = 'Foto bukti kejadian wajib diunggah (1 foto).';
        if (!deskripsi.trim()) next.deskripsi = 'Berikan deskripsi kejadian.';

        // Validasi Radius
        if (locationType === 'radius') {
            if (!radius || parseFloat(radius) <= 0) next.radius = 'Isi radius dengan nilai lebih dari 0.';
        }

        // Validasi Area
        if (locationType === 'area') {
            if (!areaDimension1 || parseFloat(areaDimension1) <= 0) next.areaDimension1 = 'Isi dimensi pertama dengan nilai lebih dari 0.';
            if (areaType === 'persegi' && (!areaDimension2 || parseFloat(areaDimension2) <= 0)) {
                next.areaDimension2 = 'Isi dimensi kedua dengan nilai lebih dari 0.';
            }
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);

        try {
            // Membangun FormData multipart untuk API backend Laravel
            const formData = new FormData();
            formData.append('jenis_kejadian', jenis);
            formData.append('wilayah', sektor);
            formData.append('latitude', Number(parseFloat(lat).toFixed(6)));
            formData.append('longitude', Number(parseFloat(lng).toFixed(6)));
            formData.append('keterangan_tambahan', deskripsi);
            formData.append('waktu_lapor', new Date(tanggal).toISOString());

            if (fotoFile) {
                // Backend wajib 1 foto bukti file upload
                formData.append('foto_bukti', fotoFile);
            }

            // Kirim juga data geometri (radius/area) yang dipilih user --
            // SEBELUMNYA field ini hanya dipakai untuk preview visual lokal
            // di form dan tidak pernah dikirim ke backend, sehingga hilang
            // begitu laporan dibuka lagi lewat Peta Interaktif manajemen.
            formData.append('location_type', locationType);
            if (locationType === 'radius' && radius) {
                formData.append('radius', parseFloat(radius));
                formData.append('radius_unit', radiusUnit);
            }
            if (locationType === 'area' && areaDimension1) {
                formData.append('area_type', areaType);
                formData.append('area_dimension_1', parseFloat(areaDimension1));
                if (areaType === 'persegi' && areaDimension2) {
                    formData.append('area_dimension_2', parseFloat(areaDimension2));
                }
            }

            const createdReport = await addReport(formData);
            alert(`Laporan #${createdReport.id || createdReport.id_laporan || ''} berhasil dikirim dan tersimpan di server.`);
            navigate('/petani/history');
        } catch (err) {
            console.error('Error kirim laporan:', err);
            const serverMsg = err.response?.data?.message || err.message || 'Gagal mengirim laporan. Pastikan semua data dan koneksi server terhubung.';
            alert(`Gagal: ${serverMsg}`);
        } finally {
            setSubmitting(false);
        }
    };

    const fieldError = (key) =>
        errors[key] ? <p className="text-[11px] text-red-600 mt-1">{errors[key]}</p> : null;

    // Initialize map on mount
    useEffect(() => {
        if (!mapRef.current) return;

        const map = L.map(mapRef.current, { zoomControl: true });

        // Initial center
        const initLat = lat ? parseFloat(lat) : -7.9666;
        const initLng = lng ? parseFloat(lng) : 112.6326;
        const initZoom = lat && lng ? 15 : 12;
        map.setView([initLat, initLng], initZoom);

        // Tile layer OSM & Satelit
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        // Klik pada peta untuk memilih koordinat langsung
        map.on('click', (e) => {
            setLat(e.latlng.lat.toFixed(6));
            setLng(e.latlng.lng.toFixed(6));
        });

        mapInstanceRef.current = map;

        // Force resize recalculation
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => {
            clearTimeout(timer);
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Update map marker and visual shapes when coordinates change
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (markerRef.current) {
            map.removeLayer(markerRef.current);
            markerRef.current = null;
        }

        if (circleRef.current) {
            map.removeLayer(circleRef.current);
            circleRef.current = null;
        }

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        if (isNaN(latNum) || isNaN(lngNum)) return;

        const customIcon = L.divIcon({
            className: 'custom-pin-form',
            html: `
                <div style="
                    background-color: #dc2626;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 0 8px rgba(0,0,0,0.5);
                    cursor: grab;
                "></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        });

        const marker = L.marker([latNum, lngNum], {
            icon: customIcon,
            draggable: true,
        }).addTo(map);

        marker.bindTooltip('Titik Lokasi (Geser untuk ubah)', { direction: 'top' });

        marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            setLat(pos.lat.toFixed(6));
            setLng(pos.lng.toFixed(6));
        });

        markerRef.current = marker;

        if (locationType === 'radius' && radius && parseFloat(radius) > 0) {
            const radiusInMeters = radiusUnit === 'km' ? parseFloat(radius) * 1000 : parseFloat(radius);
            const radiusCircle = L.circle([latNum, lngNum], {
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
                weight: 2,
                dashArray: '6, 6',
                radius: radiusInMeters,
            }).addTo(map);

            radiusCircle.bindTooltip(`Radius: ${radius} ${radiusUnit}`, { direction: 'top' });
            circleRef.current = radiusCircle;
        }

        if (locationType === 'area' && areaDimension1 && parseFloat(areaDimension1) > 0) {
            if (areaType === 'lingkaran') {
                const radiusInMeters = parseFloat(areaDimension1) || 50;
                const areaCircle = L.circle([latNum, lngNum], {
                    color: '#16a34a',
                    fillColor: '#22c55e',
                    fillOpacity: 0.22,
                    weight: 2,
                    dashArray: '4, 4',
                    radius: radiusInMeters,
                }).addTo(map);

                areaCircle.bindTooltip(`Area Lingkaran: r=${radiusInMeters}m`, { direction: 'top' });
                circleRef.current = areaCircle;
            } else {
                const dim1 = parseFloat(areaDimension1) || 100;
                const dim2 = areaDimension2 && parseFloat(areaDimension2) > 0 ? parseFloat(areaDimension2) : dim1;
                const latOffset = dim1 / 111000;
                const lngOffset = dim2 / (111000 * Math.cos((latNum * Math.PI) / 180));
                const bounds = [
                    [latNum - latOffset / 2, lngNum - lngOffset / 2],
                    [latNum + latOffset / 2, lngNum + lngOffset / 2],
                ];
                const areaRect = L.rectangle(bounds, {
                    color: '#16a34a',
                    fillColor: '#22c55e',
                    fillOpacity: 0.22,
                    weight: 2,
                    dashArray: '4, 4',
                }).addTo(map);

                areaRect.bindTooltip(`Area Persegi: ${dim1}m × ${dim2}m`, { direction: 'top' });
                circleRef.current = areaRect;
            }
        }

        if (map.getZoom() < 10) {
            map.setView([latNum, lngNum], 15);
        } else {
            map.panTo([latNum, lngNum]);
        }
    }, [lat, lng, locationType, radius, radiusUnit, areaDimension1, areaType, areaDimension2]);

    const categories = (kategoriKejadian && kategoriKejadian.length > 0)
        ? kategoriKejadian
        : ['Serangan Hama', 'Penyakit Tanaman', 'Kebakaran', 'Banjir/Genangan', 'Kerusakan Irigasi', 'Kendala Lainnya'];

    const sectors = (sektorList && sektorList.length > 0)
        ? sektorList.map(s => s.nama)
        : ['Sektor A (Blok 1 - 4)', 'Sektor B (Blok 1 - 3)', 'Blok A', 'Blok B'];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex flex-col font-sans text-gray-800 dark:text-gray-200">

            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/petani/dashboard')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
                    </button>
                    <h1 className="font-semibold text-lg">Laporan Kejadian Baru</h1>
                </div>
                <button
                    type="button"
                    onClick={() => alert('Butuh bantuan? Isi jenis kejadian, lokasi, dan deskripsi sedetail mungkin agar tim manajemen dapat menindaklanjuti lebih cepat.')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 dark:text-gray-400 cursor-pointer"
                >
                    <HelpCircle size={20} />
                </button>
            </header>

            {/* Main Form Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Section 1: Informasi Umum */}
                    <section className="bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
                        <h2 className="text-lg font-bold mb-4">Informasi Umum</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Jenis Kejadian</label>
                                <select
                                    value={jenis}
                                    onChange={(e) => setJenis(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-[#1a472a] outline-none bg-white dark:bg-gray-900"
                                >
                                    <option value="">Pilih jenis kejadian</option>
                                    {categories.map((kat, idx) => (
                                        <option key={idx} value={kat}>{kat}</option>
                                    ))}
                                </select>
                                {fieldError('jenis')}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tanggal & Waktu</label>
                                <input
                                    type="datetime-local"
                                    value={tanggal}
                                    onChange={(e) => setTanggal(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-[#1a472a] outline-none"
                                />
                                {fieldError('tanggal')}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Lahan / Sektor Terkena Dampak</label>
                            <select
                                value={sektor}
                                onChange={(e) => setSektor(e.target.value)}
                                className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-[#1a472a] outline-none bg-white dark:bg-gray-900"
                            >
                                <option value="">Pilih sektor / wilayah</option>
                                {sectors.map((sec, idx) => (
                                    <option key={idx} value={sec}>{sec}</option>
                                ))}
                            </select>
                            {fieldError('sektor')}
                        </div>
                    </section>

                    {/* Section 2: Lokasi */}
                    <section className="bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm relative">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Lokasi</h2>
                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded">Required</span>
                        </div>

                        {/* Segmented Control */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-1 mb-5">
                            <button
                                type="button"
                                onClick={() => setLocationType('titik')}
                                className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm rounded-md transition-all ${locationType === 'titik' ? 'bg-[#1a472a] text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100'}`}
                            >
                                <MapPin size={16} /> Titik
                            </button>
                            <button
                                type="button"
                                onClick={() => setLocationType('radius')}
                                className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm rounded-md transition-all ${locationType === 'radius' ? 'bg-[#1a472a] text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100'}`}
                            >
                                <CircleDashed size={16} /> Radius
                            </button>
                            <button
                                type="button"
                                onClick={() => setLocationType('area')}
                                className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm rounded-md transition-all ${locationType === 'area' ? 'bg-[#1a472a] text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100'}`}
                            >
                                <Map size={16} /> Area
                            </button>
                        </div>

                        {/* Input Koordinat */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Lintang (Latitude)</label>
                                <input
                                    type="text"
                                    value={lat}
                                    onChange={(e) => setLat(e.target.value)}
                                    placeholder="e.g. -7.9666"
                                    className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a472a]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Bujur (Longitude)</label>
                                <input
                                    type="text"
                                    value={lng}
                                    onChange={(e) => setLng(e.target.value)}
                                    placeholder="e.g. 112.6326"
                                    className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1a472a]"
                                />
                            </div>
                        </div>
                        {fieldError('lokasi')}

                        <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={locating}
                            className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 text-gray-700 dark:text-gray-300 font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-60 mb-5 cursor-pointer"
                        >
                            <Crosshair size={18} className={locating ? 'animate-spin' : ''} />
                            {locating ? 'Mendeteksi lokasi...' : 'Gunakan Lokasi Saat Ini'}
                        </button>

                        {/* Radius Section */}
                        {locationType === 'radius' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <div className="flex items-start gap-2 mb-3">
                                    <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-blue-700">Tentukan radius dampak dari titik lokasi pusat</p>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Jarak Radius</label>
                                        <input
                                            type="number"
                                            value={radius}
                                            onChange={(e) => setRadius(e.target.value)}
                                            placeholder="Masukkan nilai radius"
                                            className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900"
                                        />
                                        {fieldError('radius')}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Satuan</label>
                                        <select
                                            value={radiusUnit}
                                            onChange={(e) => setRadiusUnit(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900"
                                        >
                                            <option value="m">Meter</option>
                                            <option value="km">Kilometer</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Area Section */}
                        {locationType === 'area' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                <div className="flex items-start gap-2 mb-3">
                                    <AlertCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-green-700">Tentukan luas area terdampak</p>
                                </div>
                                <div className="mb-3">
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Bentuk Area</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAreaType('persegi')}
                                            className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${areaType === 'persegi' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-900 border border-green-300 text-green-700 hover:bg-green-50'}`}
                                        >
                                            Persegi Panjang
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAreaType('lingkaran')}
                                            className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${areaType === 'lingkaran' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-900 border border-green-300 text-green-700 hover:bg-green-50'}`}
                                        >
                                            Lingkaran
                                        </button>
                                    </div>
                                </div>

                                {areaType === 'persegi' ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Panjang (m)</label>
                                            <input
                                                type="number"
                                                value={areaDimension1}
                                                onChange={(e) => setAreaDimension1(e.target.value)}
                                                placeholder="Panjang"
                                                className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900"
                                            />
                                            {fieldError('areaDimension1')}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Lebar (m)</label>
                                            <input
                                                type="number"
                                                value={areaDimension2}
                                                onChange={(e) => setAreaDimension2(e.target.value)}
                                                placeholder="Lebar"
                                                className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900"
                                            />
                                            {fieldError('areaDimension2')}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Jari-jari (m)</label>
                                        <input
                                            type="number"
                                            value={areaDimension1}
                                            onChange={(e) => setAreaDimension1(e.target.value)}
                                            placeholder="Jari-jari lingkaran"
                                            className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900"
                                        />
                                        {fieldError('areaDimension1')}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Section 2.5: Map Preview (Selalu Aktif & Interaktif) */}
                    <section className="bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Pratinjau Peta Interaktif</h2>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full font-medium">
                                Klik peta untuk memilih titik
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                            <Lightbulb size={13} className="shrink-0 mt-0.5" />
                            <span>Anda dapat mengeklik langsung di peta atau menggeser pin merah untuk menentukan koordinat lokasi kejadian secara presisi.</span>
                        </p>

                        <div
                            ref={mapRef}
                            className="w-full h-80 rounded-xl border border-gray-300 overflow-hidden relative shadow-inner z-0"
                        ></div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                            {lat && lng ? (
                                <>
                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                                        <span>Koordinat: <b>{lat}, {lng}</b></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {locationType === 'radius' && radius && (
                                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                                                <CircleDashed size={12} /> Radius: {radius} {radiusUnit}
                                            </span>
                                        )}
                                        {locationType === 'area' && areaDimension1 && (
                                            <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                                                {areaType === 'persegi' ? <Square size={12} /> : <CircleDashed size={12} />}
                                                {areaType === 'persegi' ? `Area: ${areaDimension1}m × ${areaDimension2 || areaDimension1}m` : `Area: r=${areaDimension1}m`}
                                            </span>
                                        )}
                                        {locationType === 'titik' && (
                                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md font-semibold text-[11px] flex items-center gap-1">
                                                <MapPin size={12} /> Mode Titik
                                            </span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <p className="text-amber-600 font-medium flex items-center gap-1.5">
                                    <AlertTriangle size={14} className="shrink-0" />
                                    <span>Belum ada titik koordinat yang dipilih. Klik di peta atau gunakan tombol di atas.</span>
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Section 3: Detail */}
                    <section className="bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm mb-20">
                        <h2 className="text-lg font-bold mb-4">Detail</h2>

                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Deskripsi Kejadian</label>
                            <textarea
                                rows="4"
                                value={deskripsi}
                                onChange={(e) => setDeskripsi(e.target.value)}
                                placeholder="Berikan detail tentang kejadian tersebut..."
                                className="w-full border border-gray-300 rounded-md p-3 text-sm outline-none focus:ring-2 focus:ring-[#1a472a] resize-none"
                            ></textarea>
                            {fieldError('deskripsi')}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Foto Bukti Lapangan (Wajib 1 Foto)</label>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Hanya 1 foto didukung saat ini</span>
                            </div>

                            {fotoPreview ? (
                                <div className="relative rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-900 group">
                                    <img
                                        src={fotoPreview}
                                        alt="Preview Bukti"
                                        onClick={() => setLightboxSrc(fotoPreview)}
                                        className="w-full h-52 object-cover cursor-zoom-in"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setLightboxSrc(fotoPreview)}
                                            className="bg-white/95 hover:bg-white text-gray-800 dark:text-gray-200 text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow flex items-center gap-1.5"
                                        >
                                            <Expand size={14} />
                                            <span>Lihat Full</span>
                                        </button>
                                        <label className="bg-white/95 hover:bg-white text-gray-800 dark:text-gray-200 text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow flex items-center gap-1.5">
                                            <Camera size={14} />
                                            <span>Ganti Foto</span>
                                            <input type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={handleFotoChange} />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleRemoveFoto}
                                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow cursor-pointer"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-md truncate max-w-[85%] flex items-center gap-1.5">
                                        <Camera size={12} />
                                        <span className="truncate">{fotoName}</span>
                                    </div>
                                </div>
                            ) : (
                                <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 hover:border-emerald-600 transition-colors">
                                    <input type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={handleFotoChange} />
                                    <Camera size={32} className="text-gray-400 dark:text-gray-500 mb-3" />
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Ketuk untuk mengunggah foto bukti kejadian
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Format JPEG, PNG, JPG, atau WEBP (Maks 5MB)</p>
                                </label>
                            )}
                            {fieldError('foto')}
                        </div>
                    </section>

                </div>
            </main>

            {/* Footer / Action Buttons */}
            <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 sticky bottom-0 z-10">
                <div className="max-w-3xl mx-auto flex justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/petani/dashboard')}
                        disabled={submitting}
                        className="px-6 py-2.5 border border-gray-300 text-gray-700 dark:text-gray-300 font-medium rounded-md hover:bg-gray-50 transition-colors w-1/4 min-w-[100px] cursor-pointer disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2.5 bg-[#1a472a] hover:bg-[#12331e] text-white font-medium rounded-md transition-colors flex-1 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Mengirim ke Server...</span>
                            </>
                        ) : (
                            'Kirim Laporan'
                        )}
                    </button>
                </div>
            </footer>

            <PhotoLightbox src={lightboxSrc} alt="Preview Bukti Foto" onClose={() => setLightboxSrc(null)} />

        </div>
    );
}
