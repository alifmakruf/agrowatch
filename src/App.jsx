import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppData } from './context/AppDataContext';

import Login from './views/Login';
import DashboardPetani from './views/petani/Dashboard';
import FormPetani from './views/petani/Form';
import HistoryPetani from './views/petani/History'; // 1. Pastikan file History di-import dengan benar
import RingkasanManajemen from './views/manajemen/Ringkasan';
import PetaManajemen from './views/manajemen/Map';
import DaftarLaporan from './views/manajemen/DaftarLaporan';
import TindakLanjutManajemen from './views/manajemen/TindakLanjut';
import RiwayatManajemen from './views/manajemen/Riwayat';
import PengaturanManajemen from './views/manajemen/Pengaturan';
import DetailLaporan from './views/manajemen/DetailLaporan';
import DetailTindakLanjut from './views/manajemen/DetailTindakLanjut';
import DetailHistory from './views/petani/DetailHistory';

// Menjaga agar halaman hanya bisa diakses setelah login dengan peran yang sesuai
function RequireRole({ role, children }) {
  const { auth, authLoading } = useAppData();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#1a472a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 font-medium">Memeriksa sesi pengguna...</p>
        </div>
      </div>
    );
  }

  if (!auth?.role) return <Navigate to="/login" replace />;
  if (role && auth.role !== role) {
    // Jika salah peran, arahkan ke dashboard sesuai peran yang sedang login
    return <Navigate to={auth.role === 'manajemen' ? '/manajemen/overview' : '/petani/dashboard'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect otomatis dari root '/' ke '/login' */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Route Login */}
        <Route path="/login" element={<Login />} />

        {/* Route Petani */}
        <Route path="/petani/dashboard" element={<RequireRole role="petani"><DashboardPetani /></RequireRole>} />
        <Route path="/petani/form" element={<RequireRole role="petani"><FormPetani /></RequireRole>} />
        <Route path="/petani/history" element={<RequireRole role="petani"><HistoryPetani /></RequireRole>} /> {/* 2. Daftarkan path routenya di sini */}
        <Route path="/petani/history/:id" element={<DetailHistory />} />

        {/* Route Manajemen */}
        <Route path="/manajemen/overview" element={<RequireRole role="manajemen"><RingkasanManajemen /></RequireRole>} />
        <Route path="/manajemen/map" element={<RequireRole role="manajemen"><PetaManajemen /></RequireRole>} />
        <Route path="/manajemen/laporan" element={<RequireRole role="manajemen"><DaftarLaporan /></RequireRole>} />
        <Route path="/manajemen/tindak-lanjut" element={<RequireRole role="manajemen"><TindakLanjutManajemen /></RequireRole>} />
        <Route path="/manajemen/riwayat" element={<RequireRole role="manajemen"><RiwayatManajemen /></RequireRole>} />
        <Route path="/manajemen/pengaturan" element={<RequireRole role="manajemen"><PengaturanManajemen /></RequireRole>} />
        <Route path="/manajemen/laporan/:id" element={<DetailLaporan />} />
        <Route path="/manajemen/tindak-lanjut/:id" element={<DetailTindakLanjut />} />

        {/* Fallback: path tak dikenal kembali ke login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
