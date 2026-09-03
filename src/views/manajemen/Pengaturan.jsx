import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../layout/Sidebar';
import { Layers, Tag, Palette, Save, Plus, Trash2, Users, Phone, Edit2, CheckCircle2, UserCheck, MapPin, Crosshair } from 'lucide-react';
import { useAppData, formatWaNumber } from '../../context/AppDataContext';

export default function PengaturanManajemen() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'tim');
    const {
        kategoriKejadian,
        addKategori,
        removeKategori,
        sektorList,
        addSektor,
        removeSektor,
        timPetugasList,
        addTimPetugas,
        updateTimPetugas,
        removeTimPetugas,
        settings,
        updateSettings,
    } = useAppData();

    const [newKategori, setNewKategori] = useState('');
    const [newSektorNama, setNewSektorNama] = useState('');
    const [newSektorLuas, setNewSektorLuas] = useState('');
    const [newSektorLat, setNewSektorLat] = useState('');
    const [newSektorLng, setNewSektorLng] = useState('');
    const [newSektorRadius, setNewSektorRadius] = useState('');
    const [locatingSektor, setLocatingSektor] = useState(false);
    const [localSettings, setLocalSettings] = useState(settings);
    const [savedMsg, setSavedMsg] = useState('');

    // State untuk Form Tim Petugas
    const [editingTimId, setEditingTimId] = useState(null);
    const [namaTim, setNamaTim] = useState('');
    const [namaKetua, setNamaKetua] = useState('');
    const [nomorWa, setNomorWa] = useState('');
    const [spesialisasi, setSpesialisasi] = useState('');

    const handleAddKategori = () => {
        const nama = newKategori.trim();
        if (!nama) return;
        addKategori(nama);
        setNewKategori('');
    };

    const handleAddSektor = () => {
        const nama = newSektorNama.trim();
        if (!nama) return;
        addSektor(nama, newSektorLuas, { latitude: newSektorLat, longitude: newSektorLng, radius: newSektorRadius });
        setNewSektorNama('');
        setNewSektorLuas('');
        setNewSektorLat('');
        setNewSektorLng('');
        setNewSektorRadius('');
    };

    const handleUseCurrentLocationForSektor = () => {
        if (!navigator.geolocation) {
            alert('Perangkat/browser ini tidak mendukung deteksi lokasi.');
            return;
        }
        setLocatingSektor(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setNewSektorLat(String(pos.coords.latitude.toFixed(6)));
                setNewSektorLng(String(pos.coords.longitude.toFixed(6)));
                setLocatingSektor(false);
            },
            () => {
                alert('Gagal mendapatkan lokasi. Isi koordinat secara manual.');
                setLocatingSektor(false);
            }
        );
    };

    const handleSaveTimPetugas = (e) => {
        e.preventDefault();
        if (!namaTim.trim()) {
            alert('Nama Tim wajib diisi.');
            return;
        }
        if (!nomorWa.trim()) {
            alert('Nomor WhatsApp wajib diisi.');
            return;
        }

        const payload = {
            nama_tim: namaTim.trim(),
            nama_ketua: namaKetua.trim(),
            nomor_wa: nomorWa.trim(),
            spesialisasi: spesialisasi.trim(),
        };

        if (editingTimId) {
            updateTimPetugas(editingTimId, payload);
            setSavedMsg('Data tim petugas berhasil diperbarui.');
        } else {
            addTimPetugas(payload);
            setSavedMsg('Tim petugas baru berhasil ditambahkan.');
        }

        resetTimForm();
        setTimeout(() => setSavedMsg(''), 3000);
    };

    const handleEditTim = (tim) => {
        setEditingTimId(tim.id);
        setNamaTim(tim.nama_tim || '');
        setNamaKetua(tim.nama_ketua || '');
        setNomorWa(tim.nomor_wa || '');
        setSpesialisasi(tim.spesialisasi || '');
    };

    const resetTimForm = () => {
        setEditingTimId(null);
        setNamaTim('');
        setNamaKetua('');
        setNomorWa('');
        setSpesialisasi('');
    };

    const handleSave = () => {
        updateSettings(localSettings);
        setSavedMsg('Perubahan tersimpan.');
        setTimeout(() => setSavedMsg(''), 2000);
    };

    return (
        <Sidebar>
            <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Pengaturan Aplikasi</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Kelola tim petugas, sektor perkebunan, kategori kejadian, dan kustomisasi tampilan.</p>
                </div>

                {/* Tab Sub-menu Pengaturan */}
                <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('tim')}
                        className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === 'tim' ? 'border-[#14361e] text-[#14361e]' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
                    >
                        <Users size={16} /> Tim Petugas (WA)
                    </button>
                    <button
                        onClick={() => setActiveTab('sektor')}
                        className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === 'sektor' ? 'border-[#14361e] text-[#14361e]' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
                    >
                        <Layers size={16} /> Manajemen Sektor
                    </button>
                    <button
                        onClick={() => setActiveTab('kategori')}
                        className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === 'kategori' ? 'border-[#14361e] text-[#14361e]' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
                    >
                        <Tag size={16} /> Kategori Kejadian
                    </button>
                    <button
                        onClick={() => setActiveTab('tampilan')}
                        className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === 'tampilan' ? 'border-[#14361e] text-[#14361e]' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
                    >
                        <Palette size={16} /> Tampilan & Tema
                    </button>
                </div>

                {/* Konten Tab */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-6 space-y-6">

                    {/* TAB TIM PETUGAS */}
                    {activeTab === 'tim' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <UserCheck size={18} className="text-[#14361e]" />
                                    Manajemen Tim Petugas & Nomor WhatsApp
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Kelola daftar tim penindak lanjut dan nomor WhatsApp ketua tim. Nomor WA akan otomatis terhubung ke tombol penugasan pada detail tindak lanjut.
                                </p>
                            </div>

                            {/* Form Input / Edit Tim */}
                            <form onSubmit={handleSaveTimPetugas} className="bg-gray-50 dark:bg-gray-800/60 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                                <h3 className="text-xs font-bold text-[#14361e] dark:text-emerald-400 uppercase tracking-wider">
                                    {editingTimId ? '✏️ Edit Data Tim Petugas' : '➕ Tambah Tim Petugas Baru'}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Nama Tim <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={namaTim}
                                            onChange={(e) => setNamaTim(e.target.value)}
                                            placeholder="Contoh: Tim Alpha (Hama & Penyakit)"
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-[#14361e]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Nama Ketua Tim / Penanggung Jawab
                                        </label>
                                        <input
                                            type="text"
                                            value={namaKetua}
                                            onChange={(e) => setNamaKetua(e.target.value)}
                                            placeholder="Contoh: Ir. Ahmad Subagyo"
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-[#14361e]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Nomor WhatsApp <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={nomorWa}
                                            onChange={(e) => setNomorWa(e.target.value)}
                                            placeholder="Contoh: 081234567890 / 6281234567890 / +6281234567890"
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-[#14361e]"
                                            required
                                        />
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Bisa diawali angka `0`, `62`, atau `+62`.</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Spesialisasi / Deskripsi Tugas
                                        </label>
                                        <input
                                            type="text"
                                            value={spesialisasi}
                                            onChange={(e) => setSpesialisasi(e.target.value)}
                                            placeholder="Contoh: Penanganan Hama, Gulma, & Bakteri"
                                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-[#14361e]"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    {editingTimId && (
                                        <button
                                            type="button"
                                            onClick={resetTimForm}
                                            className="px-4 py-2 rounded-xl text-xs font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-100 text-gray-700 dark:text-gray-300 cursor-pointer"
                                        >
                                            Batal Edit
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="flex items-center gap-1.5 bg-[#14361e] hover:bg-[#1e4d2b] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                                    >
                                        {editingTimId ? <Save size={14} /> : <Plus size={14} />}
                                        <span>{editingTimId ? 'Simpan Perubahan' : 'Tambah Tim'}</span>
                                    </button>
                                </div>
                            </form>

                            {/* Daftar Tim Petugas */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    Daftar Tim Terdaftar ({timPetugasList.length})
                                </h3>

                                {timPetugasList.length === 0 ? (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">Belum ada tim petugas terdaftar.</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {timPetugasList.map((tim) => {
                                            const formattedWa = formatWaNumber(tim.nomor_wa);
                                            return (
                                                <div
                                                    key={tim.id}
                                                    className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl flex items-start justify-between gap-3 shadow-xs hover:border-[#14361e] transition-colors"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">{tim.nama_tim}</h4>
                                                        </div>
                                                        {tim.nama_ketua && (
                                                            <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">
                                                                Ketua: <span className="font-bold text-gray-800 dark:text-gray-200">{tim.nama_ketua}</span>
                                                            </p>
                                                        )}
                                                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold flex items-center gap-1.5">
                                                            <Phone size={12} /> {tim.nomor_wa}
                                                            {formattedWa && (
                                                                <a
                                                                    href={`https://wa.me/${formattedWa}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full hover:underline ml-1"
                                                                >
                                                                    Tes WA
                                                                </a>
                                                            )}
                                                        </p>
                                                        {tim.spesialisasi && (
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">{tim.spesialisasi}</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => handleEditTim(tim)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
                                                            title="Edit Tim"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Hapus ${tim.nama_tim}?`)) {
                                                                    removeTimPetugas(tim.id);
                                                                }
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                                                            title="Hapus Tim"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'sektor' && (
                        <div className="space-y-4">
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Manajemen Sektor / Blok Kebun</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Tambah atau ubah cakupan blok wilayah operasional di lapangan.</p>

                            <div className="space-y-3">
                                {sektorList.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl">
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">{s.nama}</h3>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400">Luas: {s.luas} Hektar • Status: {s.status}</p>
                                            {s.latitude != null && s.longitude != null ? (
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <MapPin size={11} /> {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
                                                    {s.radius != null && <span> • Radius {s.radius}m</span>}
                                                </p>
                                            ) : (
                                                <p className="text-[11px] text-amber-600 mt-0.5">Koordinat belum diatur</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {removeSektor && (
                                                <button
                                                    onClick={() => removeSektor(s.id)}
                                                    className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Trash2 size={13} />
                                                    <span>Hapus</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Tambah Sektor Baru</p>
                                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={newSektorNama}
                                        onChange={(e) => setNewSektorNama(e.target.value)}
                                        placeholder="Nama sektor baru, mis. Sektor C (Blok 1-2)"
                                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#14361e]"
                                    />
                                    <input
                                        type="number"
                                        value={newSektorLuas}
                                        onChange={(e) => setNewSektorLuas(e.target.value)}
                                        placeholder="Luas (Ha)"
                                        className="sm:w-32 border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#14361e]"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="number"
                                        step="any"
                                        value={newSektorLat}
                                        onChange={(e) => setNewSektorLat(e.target.value)}
                                        placeholder="Latitude"
                                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#14361e]"
                                    />
                                    <input
                                        type="number"
                                        step="any"
                                        value={newSektorLng}
                                        onChange={(e) => setNewSektorLng(e.target.value)}
                                        placeholder="Longitude"
                                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#14361e]"
                                    />
                                    <input
                                        type="number"
                                        value={newSektorRadius}
                                        onChange={(e) => setNewSektorRadius(e.target.value)}
                                        placeholder="Radius (meter)"
                                        className="sm:w-32 border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#14361e]"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleUseCurrentLocationForSektor}
                                        disabled={locatingSektor}
                                        title="Gunakan lokasi perangkat saat ini"
                                        className="flex items-center justify-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-300 hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        <Crosshair size={14} className={locatingSektor ? 'animate-pulse' : ''} />
                                    </button>
                                    <button
                                        onClick={handleAddSektor}
                                        className="flex items-center justify-center gap-1.5 bg-[#14361e] hover:bg-[#1e4d2b] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <Plus size={14} /> Tambah
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">Koordinat & radius opsional -- kosongkan jika belum diketahui. Dipakai untuk auto-isi lokasi & preview area sektor di form laporan petani.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'kategori' && (
                        <div className="space-y-4">
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Kategori Kejadian Lapangan</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Konfigurasi jenis masalah yang dapat dilaporkan oleh petani.</p>

                            <div className="flex flex-wrap gap-2">
                                {kategoriKejadian.map((kat, idx) => (
                                    <span key={idx} className="bg-green-50 text-[#14361e] border border-green-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                                        {kat}
                                        <button onClick={() => removeKategori(kat)} className="text-gray-400 dark:text-gray-500 hover:text-red-600 font-bold cursor-pointer">×</button>
                                    </span>
                                ))}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <input
                                    type="text"
                                    value={newKategori}
                                    onChange={(e) => setNewKategori(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddKategori()}
                                    placeholder="Tambah kategori baru..."
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#14361e]"
                                />
                                <button
                                    onClick={handleAddKategori}
                                    className="flex items-center justify-center gap-1.5 bg-[#14361e] hover:bg-[#1e4d2b] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                                >
                                    <Plus size={14} /> Tambah
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tampilan' && (
                        <div className="space-y-4">
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Kustomisasi Tampilan & Tema</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Sesuaikan preferensi visual dashboard manajemen.</p>

                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer">
                                    <div>
                                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 block">Mode Tampilan Gelap (Dark Mode)</span>
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Gunakan tema gelap untuk operasional malam hari</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={localSettings.darkMode}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setLocalSettings((s) => ({ ...s, darkMode: checked }));
                                            // Terapkan LANGSUNG (live preview) supaya toggle terasa
                                            // fungsional seketika, tidak perlu menunggu klik "Simpan
                                            // Perubahan" dulu baru tema berubah.
                                            updateSettings({ darkMode: checked });
                                        }}
                                        className="w-4 h-4 rounded text-[#14361e]"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer">
                                    <div>
                                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 block">Notifikasi Suara Real-time</span>
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">Bunyikan alarm saat ada laporan kritis baru masuk</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={localSettings.notifSuara}
                                        onChange={(e) => setLocalSettings((s) => ({ ...s, notifSuara: e.target.checked }))}
                                        className="w-4 h-4 rounded text-[#14361e]"
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
                        {savedMsg && <span className="text-xs text-green-700 dark:text-emerald-400 font-medium flex items-center gap-1"><CheckCircle2 size={14} /> {savedMsg}</span>}
                        {activeTab === 'tampilan' && (
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 bg-[#14361e] hover:bg-[#1e4d2b] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                                <Save size={14} /> Simpan Perubahan
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Sidebar>
    );
}

