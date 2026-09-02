import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, LineChart, LogIn, User, Settings, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useGoogleLogin } from '@react-oauth/google';

export default function Login() {
    const [selectedRole, setSelectedRole] = useState('petani');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const navigate = useNavigate();
    const { login, loginGuest, loginWithGoogle } = useAppData();

    // Inisialisasi Google OAuth Login untuk Petugas Lapangan/Petani
    const handleGoogleAuth = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setErrorMessage('');
            try {
                // Ambil profil user dari Google userinfo API
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: {
                        Authorization: `Bearer ${tokenResponse.access_token}`,
                    },
                });
                const googleProfile = await res.json();
                const userAuth = await loginWithGoogle(googleProfile);
                if (userAuth.role === 'manajemen') {
                    navigate('/manajemen/overview');
                } else {
                    navigate('/petani/dashboard');
                }
            } catch (err) {
                console.error('Google Auth Error:', err);
                setErrorMessage('Gagal autentikasi dengan Google. Mencoba akses tamu...');
                await loginGuest();
                navigate('/petani/dashboard');
            } finally {
                setLoading(false);
            }
        },
        onError: (errorResponse) => {
            console.error('Google Login Gagal:', errorResponse);
            setErrorMessage('Gagal membuka popup Google Login. Silakan gunakan Akses Tamu.');
        },
    });

    // Fungsi untuk menangani klik tombol Login
    const handleLogin = async (e) => {
        e?.preventDefault();
        setErrorMessage('');

        if (selectedRole === 'petani') {
            // Trigger Google OAuth flow
            handleGoogleAuth();
            return;
        }

        // Login Akun Manajemen via Email & Password
        if (!email || !password) {
            setErrorMessage('Silakan masukkan Email dan Password untuk akun Manajemen.');
            return;
        }

        setLoading(true);
        try {
            const userAuth = await login(email, password);
            if (userAuth.role === 'manajemen') {
                navigate('/manajemen/overview');
            } else {
                navigate('/petani/dashboard');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Email atau password salah. Pastikan kredensial Anda benar.';
            setErrorMessage(msg);
        } finally {
            setLoading(false);
        }
    };

    // Fungsi untuk menangani klik tombol Akses Tamu
    const handleGuestLogin = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            await loginGuest();
            navigate('/petani/dashboard');
        } catch (err) {
            setErrorMessage('Gagal menghubungkan sesi tamu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row font-sans">

            {/* KIRI - Panel Hijau (Branding) */}
            <div className="w-full lg:w-1/2 lg:h-full bg-[#4a7c2b] flex flex-col justify-between gap-8 lg:gap-0 p-6 sm:p-10 lg:p-12 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AgroWatch</h1>
                    <p className="text-sm font-light mt-1 text-green-100">Precision Ecology System</p>
                </div>

                <div className="relative z-10 lg:mt-0">
                    <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold leading-tight mb-4">
                        Laporkan Masalah di Sektor Agroforestri
                    </h2>
                    <p className="text-green-100 text-sm sm:text-base leading-relaxed max-w-md">
                        Sederhanakan pelaporan lapangan dan manajemen sumber daya dengan pengambilan data presisi yang dirancang untuk medan ekologi yang kompleks.
                    </p>
                </div>
            </div>

            {/* KANAN - Panel Form Login */}
            <div className="w-full lg:w-1/2 lg:h-full bg-gray-50 dark:bg-gray-800 flex flex-col justify-center p-6 sm:p-10 lg:p-24 relative overflow-y-auto">
                <div className="max-w-md w-full mx-auto my-auto py-8">

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pilih Peran Anda</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Pilih cara Anda mengakses sistem hari ini.</p>
                    </div>

                    {/* Pesan Error jika Ada */}
                    {errorMessage && (
                        <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div className="space-y-4 mb-6">
                        {/* Opsi 1: Petani / Petugas Lapangan */}
                        <div
                            onClick={() => { setSelectedRole('petani'); setErrorMessage(''); }}
                            className={`cursor-pointer border rounded-lg p-4 transition-all flex items-start gap-4 
                            ${selectedRole === 'petani' ? 'border-[#1a472a] bg-white dark:bg-gray-900 ring-1 ring-[#1a472a]' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300'}`}
                        >
                            <div className="mt-1">
                                <div className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center 
                                ${selectedRole === 'petani' ? 'border-[#1a472a]' : 'border-gray-300'}`}>
                                    {selectedRole === 'petani' && <div className="w-3 h-3 rounded-full bg-[#1a472a]" />}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Sprout size={18} className="text-[#1a472a] shrink-0" />
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Petani / Petugas Lapangan</h3>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    Akses alat pelaporan lapangan, peta offline, dan kirim tiket masalah langsung dari sektor perkebunan.
                                </p>
                            </div>
                        </div>

                        {/* Opsi 2: Manajemen */}
                        <div
                            onClick={() => { setSelectedRole('manajemen'); setErrorMessage(''); }}
                            className={`cursor-pointer border rounded-lg p-4 transition-all flex items-start gap-4 
                            ${selectedRole === 'manajemen' ? 'border-[#1a472a] bg-white dark:bg-gray-900 ring-1 ring-[#1a472a]' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300'}`}
                        >
                            <div className="mt-1">
                                <div className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center 
                                ${selectedRole === 'manajemen' ? 'border-[#1a472a]' : 'border-gray-300'}`}>
                                    {selectedRole === 'manajemen' && <div className="w-3 h-3 rounded-full bg-[#1a472a]" />}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <LineChart size={18} className="text-[#1a472a] shrink-0" />
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Manajemen</h3>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    Akses analitik dashboard lengkap, setujui laporan, dan kelola operasional lapangan serta distribusi personel.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* FORM INPUT TAMBAHAN: Hanya muncul jika role yang dipilih adalah 'manajemen' */}
                    {selectedRole === 'manajemen' && (
                        <div className="bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-800 rounded-lg space-y-4 mb-6 animate-fadeIn">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Autentikasi Akun Manajemen</p>

                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Email Organisasi</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
                                    <input
                                        type="email"
                                        placeholder="nama@agrowatch.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-md pl-9 pr-3 py-2 text-xs outline-none focus:border-[#1a472a] focus:bg-white dark:bg-gray-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-md pl-9 pr-3 py-2 text-xs outline-none focus:border-[#1a472a] focus:bg-white dark:bg-gray-900"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tombol Aksi */}
                    <div className="space-y-4">
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full bg-[#1a472a] hover:bg-[#12331e] text-white font-medium rounded-md py-3 px-4 flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    {selectedRole === 'manajemen' ? 'Masuk ke Dashboard Manajemen' : 'Lanjutkan dengan Google'}
                                </>
                            )}
                        </button>

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 dark:text-gray-500 text-xs">atau</span>
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                        </div>

                        <button
                            onClick={handleGuestLogin}
                            disabled={loading}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-medium rounded-md py-3 px-4 flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                            <User size={18} />
                            Akses Tamu (Hanya Lapangan)
                        </button>
                    </div>

                </div>

                {/* Footer */}
                {/* <div className="absolute bottom-6 left-8 right-8 flex justify-between items-center text-xs text-gray-400 dark:text-gray-500">
                    <span>Didukung oleh EcoSys Enterprise</span>
                    <button className="flex items-center gap-1 hover:text-gray-600 dark:text-gray-400 transition-colors">
                        <Settings size={14} />
                        Pengaturan Aplikasi
                    </button>
                </div> */}
            </div>

        </div>
    );
}