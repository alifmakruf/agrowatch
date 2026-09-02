import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../layout/Sidebar';
import { Layers, Tag, Palette, Save, Plus, Trash2 } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';

export default function PengaturanManajemen() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'sektor');
    const {
        kategoriKejadian,
        addKategori,
        removeKategori,
        sektorList,
        addSektor,
        removeSektor,
        settings,
        updateSettings,
    } = useAppData();

    const [newKategori, setNewKategori] = useState('');
    const [newSektorNama, setNewSektorNama] = useState('');
    const [newSektorLuas, setNewSektorLuas] = useState('');
    const [localSettings, setLocalSettings] = useState(settings);
    const [savedMsg, setSavedMsg] = useState('');

    const handleAddKategori = () => {
        const nama = newKategori.trim();
        if (!nama) return;
        addKategori(nama);
        setNewKategori('');
    };

    const handleAddSektor = () => {
        const nama = newSektorNama.trim();
        if (!nama) return;
        addSektor(nama, newSektorLuas);
        setNewSektorNama('');
        setNewSektorLuas('');
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
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Kelola parameter sistem, manajemen sektor, kategori kejadian, dan kustomisasi tampilan.</p>
                </div>

                {/* Tab Sub-menu Pengaturan */}
                <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
                    <button
                        onClick={() => setActiveTab('sektor')}
                        className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'sektor' ? 'border-[#14361e] text-[#14361e]' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
                    >
                        <Layers size={16} /> Manajemen Sektor
                    </button>
                    <button
                        onClick={() => setActiveTab('kategori')}
                        className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'kategori' ? 'border-[#14361e] text-[#14361e]' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
                    >
                        <Tag size={16} /> Kategori Kejadian
                    </button>
                    <button
                        onClick={() => setActiveTab('tampilan')}
                        className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'tampilan' ? 'border-[#14361e] text-[#14361e]' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300'}`}
                    >
                        <Palette size={16} /> Tampilan & Tema
                    </button>
                </div>

                {/* Konten Tab */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-6 space-y-6">
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

                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
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
                                <button
                                    onClick={handleAddSektor}
                                    className="flex items-center justify-center gap-1.5 bg-[#14361e] hover:bg-[#1e4d2b] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                                >
                                    <Plus size={14} /> Tambah
                                </button>
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
                        {savedMsg && <span className="text-xs text-green-700 font-medium">{savedMsg}</span>}
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 bg-[#14361e] hover:bg-[#1e4d2b] text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                            <Save size={14} /> Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>
        </Sidebar>
    );
}
