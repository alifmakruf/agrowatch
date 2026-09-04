import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Map,
    ClipboardList,
    CheckSquare,
    History,
    Settings,
    LogOut,
    User,
    Tractor,
    Search,
    Bell,
    HelpCircle,
    Menu,
    X
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export default function Sidebar({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, reports } = useAppData();
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        // Arahkan pencarian ke Daftar Laporan dengan kata kunci di query string
        navigate(`/manajemen/laporan?q=${encodeURIComponent(searchTerm.trim())}`);
        setIsMobileMenuOpen(false);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Bungkus navigate agar sidebar mobile otomatis tertutup setelah memilih menu
    const handleNavigate = (path, options) => {
        navigate(path, options);
        setIsMobileMenuOpen(false);
    };

    const menuItems = [
        { name: 'Ringkasan', path: '/manajemen/overview', icon: LayoutDashboard },
        { name: 'Peta Interaktif', path: '/manajemen/map', icon: Map },
        { name: 'Daftar Laporan', path: '/manajemen/laporan', icon: ClipboardList },
        { name: 'Tindak Lanjut', path: '/manajemen/tindak-lanjut', icon: CheckSquare },
        { name: 'Riwayat Aktivitas', path: '/manajemen/riwayat', icon: History },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex font-sans text-gray-800 dark:text-gray-200">

            {/* OVERLAY GELAP - hanya muncul di HP/tablet saat sidebar dibuka */}
            {isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    aria-hidden="true"
                ></div>
            )}

            {/* SIDEBAR HIJAU TUA (Sesuai Gambar) */}
            <aside
                className={`w-64 bg-[#14361e] text-white flex flex-col justify-between fixed md:sticky top-0 left-0 h-screen shadow-lg select-none z-50 transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
            >
                <div>
                    {/* Logo Brand */}
                    <div className="shine-hover p-6 border-b border-white/10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-[#1e4d2b] p-2 rounded-lg shrink-0">
                                <Tractor size={22} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="font-bold text-base tracking-tight">AgroWatch</h1>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Precision Ecology</p>
                            </div>
                        </div>
                        {/* Tombol Tutup - hanya tampil di HP/tablet */}
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="md:hidden text-gray-300 hover:text-white p-1 shrink-0 cursor-pointer"
                            aria-label="Tutup menu"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Menu Utama */}
                    <nav className="p-4 space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigate(item.path)}
                                    className={`lift-hover w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                        ? 'bg-[#c5e3c4] text-[#14361e] font-bold shadow-md'
                                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span>{item.name}</span>
                                </button>
                            );
                        })}

                        {/* Menu Pengaturan Aplikasi & Sub-menu */}
                        <div className="pt-4">
                            <div
                                onClick={() => handleNavigate('/manajemen/pengaturan')}
                                className="lift-hover w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 cursor-pointer"
                            >
                                <Settings size={18} />
                                <span>Pengaturan Aplikasi</span>
                            </div>
                            <div className="pl-11 pr-4 py-2 space-y-2 text-xs text-gray-400">
                                <p onClick={() => handleNavigate('/manajemen/pengaturan', { state: { tab: 'tim' } })} className="hover:text-white cursor-pointer transition-colors">Manajemen Tim</p>
                                <p onClick={() => handleNavigate('/manajemen/pengaturan', { state: { tab: 'sektor' } })} className="hover:text-white cursor-pointer transition-colors">Manajemen Sektor</p>
                                <p onClick={() => handleNavigate('/manajemen/pengaturan', { state: { tab: 'kategori' } })} className="hover:text-white cursor-pointer transition-colors">Kategori Kejadian</p>
                                <p onClick={() => handleNavigate('/manajemen/pengaturan', { state: { tab: 'tampilan' } })} className="hover:text-white cursor-pointer transition-colors">Tampilan & Warna</p>
                            </div>
                        </div>
                    </nav>
                </div>

                {/* Footer Sidebar (Profile & Sign Out) */}
                <div className="p-4 border-t border-white/10 space-y-1 bg-black/10">
                    <button
                        onClick={() => handleNavigate('/manajemen/pengaturan')}
                        className="lift-hover w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                    >
                        <User size={16} />
                        <span>Profile Settings</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="lift-hover w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* KONTEN UTAMA DI KANAN */}
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {/* Top Navbar Pencarian & Profil */}
                <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 px-4 sm:px-6 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Tombol Hamburger - hanya tampil di HP/tablet */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-1.5 -ml-1.5 shrink-0 cursor-pointer"
                            aria-label="Buka menu"
                        >
                            <Menu size={22} />
                        </button>

                        <form className="w-full min-w-0 max-w-[180px] sm:max-w-xs md:max-w-none md:w-96" onSubmit={handleSearchSubmit}>
                            <div className="relative">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search reports, ID, or locations..."
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-full pl-9 pr-4 py-2 text-xs outline-none focus:bg-white dark:focus:bg-gray-800 focus:border-green-800 transition-all"
                                />
                            </div>
                        </form>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 text-gray-600 dark:text-gray-400 shrink-0">
                        <span className="cursor-pointer hover:text-gray-900 dark:hover:text-white"><Bell size={16} /></span>
                        <span className="cursor-pointer hover:text-gray-900 dark:hover:text-white"><HelpCircle size={16} /></span>
                        <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
                            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </header>

                {/* Render Halaman Aktif */}
                {children}
            </main>

        </div>
    );
}