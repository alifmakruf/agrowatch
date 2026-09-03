import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loginApi, guestApi, getUserApi, logoutApi } from '../api/auth';
import {
    getLaporanApi,
    getLaporanSummaryApi,
    createLaporanApi,
    updateLaporanStatusApi
} from '../api/laporan';
import {
    getSektorsApi,
    createSektorApi,
    updateSektorApi,
    deleteSektorApi
} from '../api/sektor';
import {
    getKategorisApi,
    createKategoriApi,
    deleteKategoriApi
} from '../api/kategori';
import {
    getTimPetugasApi,
    createTimPetugasApi,
    updateTimPetugasApi,
    deleteTimPetugasApi
} from '../api/timPetugas';

export function formatWaNumber(phone) {
    if (!phone) return '';
    let cleaned = String(phone).trim().replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+62')) {
        return '62' + cleaned.slice(3);
    } else if (cleaned.startsWith('62')) {
        return cleaned;
    } else if (cleaned.startsWith('0')) {
        return '62' + cleaned.slice(1);
    }
    return cleaned;
}

// Helper: Ensure object yang disimpan di state hanya contain scalar values

// Prevent accidentally rendering object kompleks ke JSX
function ensureScalarOnly(obj, keys) {
    if (!obj || typeof obj !== 'object') return obj;
    const result = {};
    for (const key of keys) {
        const val = obj[key];
        if (val === null || val === undefined || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            result[key] = val;
        }
    }
    return result;
}

const SETTINGS_STORAGE_KEY = 'agrowatch_ui_settings';
const TIM_PETUGAS_STORAGE_KEY = 'agrowatch_tim_petugas';
const SEKTOR_STORAGE_KEY = 'agrowatch_sektor_list';
const ACTIVITY_LOGS_STORAGE_KEY = 'agrowatch_activity_logs';

const DEFAULT_TIM_PETUGAS = [
    { id: 1, nama_tim: 'Tim Alpha (Hama & Penyakit)', nama_ketua: 'Ir. Ahmad Subagyo', nomor_wa: '081234567890', spesialisasi: 'Penanganan Hama & Penyakit' },
    { id: 2, nama_tim: 'Tim Bravo (Irigasi & Infrastruktur)', nama_ketua: 'Budi Santoso', nomor_wa: '082345678901', spesialisasi: 'Irigasi & Saluran Air' },
    { id: 3, nama_tim: 'Tim Charlie (Keamanan & Patroli)', nama_ketua: 'Suryanto', nomor_wa: '083456789012', spesialisasi: 'Patroli Kebun & Keamanan' },
];

const DEFAULT_SEKTORS = [
    { id: 1, nama: 'Sektor A (Blok 1 - 4)', luas: 120, latitude: -7.9650, longitude: 112.6310, radius: 300, status: 'Aktif' },
    { id: 2, nama: 'Sektor B (Blok 1 - 3)', luas: 95, latitude: -7.9710, longitude: 112.6370, radius: 250, status: 'Aktif' },
    { id: 3, nama: 'Sektor C (Kawasan Pembibitan)', luas: 50, latitude: -7.9600, longitude: 112.6280, radius: 200, status: 'Aktif' },
];

const DEFAULT_ACTIVITY_LOGS = [
    {
        id: 1,
        admin: 'Admin Sistem',
        action: 'Sistem AgroWatch diinisialisasi dengan konfigurasi wilayah operasional & audit log aktif.',
        time: 'Hari ini, 08:00 WIB',
    },
    {
        id: 2,
        admin: 'Ir. Ahmad Subagyo',
        action: 'Menugaskan Tim Alpha untuk inspeksi pencegahan hama di Sektor A.',
        time: 'Hari ini, 09:15 WIB',
    },
    {
        id: 3,
        admin: 'Budi Santoso',
        action: 'Memperbarui koordinat perimeter irigasi pada Sektor B (Radius 250m).',
        time: 'Kemarin, 14:30 WIB',
    },
];


// Helper Mapping Status Backend <-> Frontend
export function normalizeStatusToFrontend(backendStatus) {
    if (!backendStatus) return 'Terbuka';
    const s = String(backendStatus).trim().toLowerCase();
    if (s === 'open' || s === 'terbuka' || s === 'kritis' || s === 'menunggu') return 'Terbuka';
    if (s === 'on-progress' || s === 'diproses' || s === 'sedang diproses') return 'Diproses';
    if (s === 'closed' || s === 'selesai' || s === 'ditutup' || s === 'terverifikasi') return 'Selesai';
    return backendStatus;
}

export function normalizeStatusToBackend(frontendStatus) {
    if (!frontendStatus) return 'Open';
    const s = String(frontendStatus).trim().toLowerCase();
    if (s === 'terbuka' || s === 'kritis' || s === 'menunggu' || s === 'open') return 'Open';
    if (s === 'diproses' || s === 'sedang diproses' || s === 'on-progress') return 'On-Progress';
    if (s === 'selesai' || s === 'ditutup' || s === 'terverifikasi' || s === 'closed') return 'Closed';
    return 'Open';
}

// Helper Mapping Role Backend <-> Frontend
export function roleToFrontend(peranUser) {
    if (!peranUser) return 'petani';
    const p = String(peranUser).toLowerCase();
    if (p.includes('manajemen') || p.includes('admin')) return 'manajemen';
    return 'petani';
}

export function formatSummaryData(data) {
    if (!data || typeof data !== 'object') return null;
    // Only extract scalar values, ensure no complex objects
    return {
        total_laporan: Number(data.total_laporan) || 0,
        open: Number(data.open) || 0,
        on_progress: Number(data.on_progress) || 0,
        closed: Number(data.closed) || 0,
        by_jenis: typeof data.by_jenis === 'object' && data.by_jenis !== null
            ? Object.fromEntries(
                Object.entries(data.by_jenis).map(([key, val]) => [
                    String(key),
                    Number(val) || 0
                ])
            )
            : {},
    };
}

// Helper Normalisasi Objek Laporan dari Backend ke Bentuk Standar Frontend
export function formatReportItem(item) {
    if (!item) return null;
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const reportId = item.id_laporan || item.id || Math.floor(Math.random() * 10000);

    // foto_bukti bisa datang dalam beberapa bentuk dari backend: string
    // path/URL tunggal, array of string (multi-foto), atau kosong/null.
    // SEBELUMNYA kode ini langsung memanggil `.startsWith()` pada
    // item.foto_bukti tanpa cek tipe dulu -- kalau backend mengirim
    // array atau object, ini crash dengan "startsWith is not a function".
    let imageUrl = null;
    if (typeof item.foto_bukti === 'string' && item.foto_bukti) {
        imageUrl = item.foto_bukti.startsWith('http')
            ? item.foto_bukti
            : `${backendUrl}/storage/${item.foto_bukti.replace(/^\//, '')}`;
    } else if (Array.isArray(item.foto_bukti) && item.foto_bukti.length > 0 && typeof item.foto_bukti[0] === 'string') {
        const first = item.foto_bukti[0];
        imageUrl = first.startsWith('http')
            ? first
            : `${backendUrl}/storage/${first.replace(/^\//, '')}`;
    } else if (item.image) {
        imageUrl = item.image;
    }

    const lat = typeof item.latitude === 'number'
        ? item.latitude
        : typeof item.lat === 'number'
            ? item.lat
            : parseFloat(item.latitude || item.lat || -7.9666);

    const lng = typeof item.longitude === 'number'
        ? item.longitude
        : typeof item.lng === 'number'
            ? item.lng
            : parseFloat(item.longitude || item.lng || 112.6326);

    const jenisName = item.jenis_kejadian || item.jenisLabel || item.jenis || 'Serangan Hama';
    const sektorName = item.wilayah || item.sektor || 'Sektor A';
    const deskripsiText = item.keterangan_tambahan || item.deskripsi || '';
    const tindakLanjutText = item.catatan_tindak_lanjut || item.tindakLanjut || 'Menunggu penanganan dari tim manajemen.';

    // Tim & kendala sekarang punya kolom sendiri di backend (lihat
    // migration add_tim_kendala_to_laporans_table) supaya bisa dibaca
    // ulang untuk prefill form Tindak Lanjut. Untuk laporan LAMA yang
    // sempat tersimpan sebelum kolom ini ada (format gabungan
    // "Tim: X (Kendala: Y). instruksi..." di catatan_tindak_lanjut),
    // tetap dicoba di-parse sebagai fallback supaya data lama tidak hilang.
    let timValue = item.tim_penanggung_jawab || item.timPenanggungJawab || '';
    let kendalaValue = item.kendala || '';
    let catatanMurni = item.catatan_tindak_lanjut || '';
    if (!timValue && catatanMurni) {
        const match = catatanMurni.match(/^Tim:\s*([^(.]+?)(?:\s*\(Kendala:\s*([^)]+)\))?\.\s*(.*)$/s);
        if (match) {
            timValue = match[1]?.trim() || '';
            kendalaValue = kendalaValue || match[2]?.trim() || '';
            catatanMurni = match[3]?.trim() || '';
        }
    }
    const statusNormalized = normalizeStatusToFrontend(item.status_penanganan || item.status);

    // Extract pelapor name safely - convert to string, never include object!
    // BUG SEBELUMNYA: kode ini mengecek `item.user`, padahal relasi yang
    // benar-benar dikirim backend (Laravel eager-load `pelapor`) bernama
    // `item.pelapor` dan ISINYA OBJECT `{id, name, email, ...}`, bukan
    // string. Karena `item.user` selalu undefined, kode jatuh ke baris
    // else dan melakukan `String(item.pelapor)` pada OBJECT tsb -- yang di
    // JavaScript menghasilkan literal string "[object Object]". Itulah
    // sumber bug "[object Object]" yang muncul di kolom Pelapor.
    const pelaporObj = (item.pelapor && typeof item.pelapor === 'object') ? item.pelapor
        : (item.user && typeof item.user === 'object') ? item.user
        : null;
    const pelaporValue = pelaporObj?.name
        ? String(pelaporObj.name)
        : (typeof item.pelapor === 'string' && item.pelapor) ? item.pelapor
        : 'Petugas Lapangan';
    const pelaporIdValue = pelaporObj?.id ?? item.id_pelapor ?? null;

    // Nomor laporan yang ditampilkan ke pengguna sekarang berbasis waktu
    // (format: detik-menit-jam-hari-bulan-tahun-###, lihat backend
    // Laporan::booted()), BUKAN lagi angka urut id database (`#1`, `#2`,
    // dst). `rawId`/`id_laporan` TETAP murni angka -- itu yang dipakai
    // untuk routing URL & pemanggilan API, tidak berubah.
    const displayCode = item.kode_laporan || String(reportId);

    // Multi-foto support
    let photosList = [];
    if (Array.isArray(item.photos)) {
        photosList = item.photos;
    } else if (Array.isArray(item.foto_list)) {
        photosList = item.foto_list;
    } else if (imageUrl) {
        photosList = [imageUrl];
    }

    // Foto selesai bukti penanganan lapangan
    let fotoSelesaiUrl = item.foto_selesai || item.fotoSelesai || null;
    if (fotoSelesaiUrl && typeof fotoSelesaiUrl === 'string' && !fotoSelesaiUrl.startsWith('http') && !fotoSelesaiUrl.startsWith('data:')) {
        fotoSelesaiUrl = `${backendUrl}/storage/${fotoSelesaiUrl.replace(/^\//, '')}`;
    }

    return {
        id: displayCode,
        id_laporan: reportId,
        rawId: reportId,
        kodeLaporan: displayCode,
        displayId: '#' + displayCode,
        jenis: jenisName,
        jenisLabel: jenisName,
        kategori: jenisName,
        sektor: sektorName,
        wilayah: sektorName,
        tanggal: item.waktu_lapor || item.created_at || item.tanggal || new Date().toISOString(),
        createdAt: item.waktu_lapor || item.created_at || item.createdAt || new Date().toISOString(),
        lat: !isNaN(lat) ? lat : -7.9666,
        lng: !isNaN(lng) ? lng : 112.6326,
        latitude: !isNaN(lat) ? lat : -7.9666,
        longitude: !isNaN(lng) ? lng : 112.6326,
        locationType: item.location_type || item.locationType || 'titik',
        radius: item.radius ?? null,
        radiusUnit: item.radius_unit || item.radiusUnit || 'm',
        areaType: item.area_type || item.areaType || 'persegi',
        areaDimension1: item.area_dimension_1 ?? item.areaDimension1 ?? null,
        areaDimension2: item.area_dimension_2 ?? item.areaDimension2 ?? null,
        deskripsi: deskripsiText,
        keterangan_tambahan: deskripsiText,
        image: imageUrl,
        foto_bukti: typeof item.foto_bukti === 'string' ? item.foto_bukti : imageUrl,
        photos: photosList,
        status: statusNormalized,
        status_penanganan: normalizeStatusToBackend(statusNormalized),
        tindakLanjut: tindakLanjutText,
        catatan_tindak_lanjut: catatanMurni || tindakLanjutText,
        timPenanggungJawab: timValue,
        kendala: kendalaValue,
        pelapor: pelaporValue,  // ← Safe: only string, never object
        pelaporId: pelaporIdValue,
        urgensi: item.urgensi || (statusNormalized === 'Terbuka' ? 'Tinggi' : 'Menengah'),
        // Data penyelesaian lapangan (Selesai)
        tglSelesai: item.tgl_selesai || item.tglSelesai || item.waktu_selesai || null,
        durasiPenanganan: item.durasi_penanganan || item.durasiPenanganan || null,
        alatDigunakan: item.alat_digunakan || item.alatDigunakan || null,
        catatanSelesai: item.catatan_selesai || item.tindakan_lapangan || item.catatanSelesai || null,
        fotoSelesai: fotoSelesaiUrl,
    };
}

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
    // 1. Auth State
    const [auth, setAuth] = useState({ role: null, name: null, email: null });
    const [authLoading, setAuthLoading] = useState(true);

    // 2. Data State
    const [reports, setReports] = useState([]);
    const [reportsPagination, setReportsPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 15 });
    const [reportsLoading, setReportsLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [sektorList, setSektorList] = useState([]);
    const [kategoriKejadian, setKategoriKejadian] = useState([]);
    // Riwayat aktivitas dipersist ke localStorage supaya tidak hilang
    // saat refresh/logout -- SEBELUMNYA activityLogs cuma disimpan di
    // state React di memori, jadi hilang total tiap kali halaman
    // dimuat ulang. Ini solusi sementara sampai backend menyediakan
    // tabel riwayat_aktivitas + endpoint /api/riwayat; begitu itu ada,
    // ganti sumbernya jadi fetch dari API (lihat fetchActivityLogs di
    // bawah, yang sudah disiapkan untuk kasus itu).
    const RIWAYAT_STORAGE_KEY = 'agrowatch_riwayat_aktivitas';
    const [activityLogs, setActivityLogs] = useState(() => {
        try {
            const saved = localStorage.getItem(RIWAYAT_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (err) {
            console.warn('Gagal membaca riwayat aktivitas dari localStorage:', err);
            return [];
        }
    });

    useEffect(() => {
        try {
            // Dibatasi 200 entri terbaru supaya localStorage tidak membengkak.
            localStorage.setItem(RIWAYAT_STORAGE_KEY, JSON.stringify(activityLogs.slice(0, 200)));
        } catch (err) {
            console.warn('Gagal menyimpan riwayat aktivitas ke localStorage:', err);
        }
    }, [activityLogs]);
    const [timPetugasList, setTimPetugasList] = useState(() => {
        try {
            const raw = localStorage.getItem(TIM_PETUGAS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : DEFAULT_TIM_PETUGAS;
        } catch {
            return DEFAULT_TIM_PETUGAS;
        }
    });

    useEffect(() => {
        localStorage.setItem(TIM_PETUGAS_STORAGE_KEY, JSON.stringify(timPetugasList));
    }, [timPetugasList]);


    // 3. Settings UI State (Lokal)
    const [settings, setSettings] = useState(() => {
        try {
            const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : { darkMode: false, notifSuara: true };
        } catch {
            return { darkMode: false, notifSuara: true };
        }
    });

    useEffect(() => {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    // Terapkan Dark Mode secara nyata ke seluruh aplikasi dengan menambah/
    // menghapus class "dark" di elemen <html>. SEBELUMNYA toggle ini hanya
    // menyimpan boolean ke localStorage tanpa efek visual apa pun karena
    // tidak ada kode yang benar-benar membaca nilainya. Dikombinasikan
    // dengan `darkMode: 'class'` di tailwind.config.js, baris ini yang
    // membuat setting-nya benar-benar fungsional.
    useEffect(() => {
        document.documentElement.classList.toggle('dark', !!settings.darkMode);
    }, [settings.darkMode]);

    // ==========================================
    // DATA FETCHING DARI BACKEND
    // ==========================================

    const fetchReports = useCallback(async (params = {}) => {
        setReportsLoading(true);
        try {
            const res = await getLaporanApi(params);
            // Menangani pagination Laravel { data: [...], current_page, last_page, total, per_page }
            if (res && Array.isArray(res.data)) {
                const formatted = res.data.map(formatReportItem);
                setReports(formatted);
                setReportsPagination({
                    currentPage: res.current_page || 1,
                    lastPage: res.last_page || 1,
                    total: res.total || formatted.length,
                    perPage: res.per_page || 15,
                });
            } else if (Array.isArray(res)) {
                const formatted = res.map(formatReportItem);
                setReports(formatted);
                setReportsPagination({ currentPage: 1, lastPage: 1, total: formatted.length, perPage: formatted.length });
            }
        } catch (err) {
            console.error('Gagal mengambil data laporan:', err);
        } finally {
            setReportsLoading(false);
        }
    }, []);

    const fetchSummary = useCallback(async () => {
        try {
            const res = await getLaporanSummaryApi();
            // Normalize response - hanya simpan scalar values
            const normalized = formatSummaryData(res);
            setSummary(normalized);
        } catch (err) {
            console.error('Gagal mengambil data summary:', err);
        }
    }, []);

    const fetchSektors = useCallback(async () => {
        try {
            const res = await getSektorsApi();
            const rawData = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
            const mapped = rawData.map((s) => ({
                id: s.id || s.id_sektor,
                nama: s.nama_sektor || s.nama || 'Sektor A',
                luas: s.luas_ha || s.luas || 100,
                status: s.status || 'Aktif',
                // Koordinat pusat & radius (meter) sektor -- dipakai Form.jsx
                // untuk auto-isi lokasi & menampilkan visual radius di map
                // saat petani memilih sektor ini. Backend belum tentu sudah
                // punya kolom ini, jadi field-nya bisa null/undefined dan
                // itu tetap aman (Form.jsx sudah menangani kasus kosong).
                latitude: s.latitude != null ? Number(s.latitude) : null,
                longitude: s.longitude != null ? Number(s.longitude) : null,
                radius: s.radius != null ? Number(s.radius) : null,
            }));
            // Selalu pakai data asli dari backend (termasuk kalau memang
            // kosong). SEBELUMNYA di sini ada fallback ke daftar sektor
            // hardcoded ber-id 1 & 2 setiap kali hasil dari backend kosong.
            // Id palsu itu ditampilkan di UI seolah-olah data asli, lalu
            // dipakai untuk memanggil updateSektorApi/deleteSektorApi --
            // yang gagal dengan 404 karena id itu tidak benar-benar ada
            // di database. Kalau memang kosong, tampilkan kosong saja.
            setSektorList(mapped);
        } catch (err) {
            // Jangan timpa sektorList dengan data hardcoded yang bisa
            // mismatch dengan id di database (penyebab 404 saat hapus/edit
            // sektor). Biarkan state sebelumnya tetap ada supaya tidak ada
            // id palsu yang beredar di UI.
            console.warn('Gagal mengambil daftar sektor dari backend:', err);
        }
    }, []);

    const fetchKategoris = useCallback(async () => {
        try {
            const res = await getKategorisApi();
            const rawData = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
            const mapped = rawData.map((k) => k.nama_kategori || k.nama || k).filter(Boolean);
            if (mapped.length > 0) {
                setKategoriKejadian(mapped);
            } else {
                setKategoriKejadian(['Serangan Hama', 'Kerusakan Irigasi', 'Kebakaran', 'Penyakit Tanaman', 'Sensor Offline', 'Pencurian Hasil Panen']);
            }
        } catch (err) {
            console.warn('Gagal mengambil daftar kategori dari backend, menggunakan default lokal:', err);
            setKategoriKejadian(['Serangan Hama', 'Kerusakan Irigasi', 'Kebakaran', 'Penyakit Tanaman', 'Sensor Offline', 'Pencurian Hasil Panen']);
        }
    }, []);

    const fetchTimPetugas = useCallback(async () => {
        try {
            const res = await getTimPetugasApi();
            const rawData = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
            if (rawData.length > 0) {
                const mapped = rawData.map((t) => ({
                    id: t.id || t.id_tim,
                    nama_tim: t.nama_tim || t.nama || 'Tim Petugas',
                    nama_ketua: t.nama_ketua || t.ketua || '',
                    nomor_wa: t.nomor_wa || t.no_wa || '',
                    spesialisasi: t.spesialisasi || '',
                }));
                setTimPetugasList(mapped);
            }
        } catch (err) {
            console.warn('Gagal mengambil tim petugas dari API, menggunakan data lokal:', err);
        }
    }, []);

    // ==========================================
    // CEK SESI USER PADA SAAT MOUNT (SANCTUM SPA)
    // ==========================================

    useEffect(() => {
        let isMounted = true;

        async function initAuthAndData() {
            setAuthLoading(true);
            let user = null;
            try {
                // Cek cookie sesi yang aktif
                const userData = await getUserApi();
                user = userData.user || userData;
                if (user && isMounted) {
                    const frontendRole = roleToFrontend(user.peran_user);
                    // Gunakan ensureScalarOnly untuk prevent object rendering ke JSX
                    // `id` WAJIB disertakan -- dipakai untuk memfilter
                    // "laporan milik saya" di Riwayat Laporan (petani).
                    // SEBELUMNYA auth tidak pernah menyimpan id user sama
                    // sekali, sehingga frontend tidak bisa membedakan
                    // laporan siapa yang harus ditampilkan dan menampilkan
                    // SEMUA laporan dari semua pengguna.
                    setAuth(ensureScalarOnly({
                        id: user.id,
                        role: frontendRole,
                        name: user.name || (frontendRole === 'manajemen' ? 'Manajemen' : 'Petugas Lapangan'),
                        email: user.email,
                    }, ['id', 'role', 'name', 'email']));
                }
            } catch (err) {
                // Sesi belum ada atau expired, biarkan auth role null
                if (isMounted) {
                    setAuth({ id: null, role: null, name: null, email: null });
                }
            } finally {
                if (isMounted) {
                    setAuthLoading(false);
                }
            }

            // Muat data jika user terautentikasi, atau muat data publik jika tidak
            if (isMounted) {
                if (user) {
                    fetchReports();
                    fetchSummary();
                    fetchSektors();
                    fetchKategoris();
                    fetchTimPetugas();
                } else {
                    // Fetch summary publik untuk guest/guest view
                    fetchSummary();
                }
            }
        }

        initAuthAndData();

        return () => {
            isMounted = false;
        };
    }, [fetchReports, fetchSummary, fetchSektors, fetchKategoris, fetchTimPetugas]);


    // ==========================================
    // AUTENTIKASI ACTIONS
    // ==========================================

    const login = useCallback(async (email, password) => {
        try {
            const res = await loginApi({ email, password });
            const user = res.user || res;
            const frontendRole = roleToFrontend(user.peran_user);
            const userAuth = ensureScalarOnly({
                id: user.id,
                role: frontendRole,
                name: user.name || (frontendRole === 'manajemen' ? 'Manajemen' : 'Petugas Lapangan'),
                email: user.email,
            }, ['id', 'role', 'name', 'email']);
            setAuth(userAuth);
            fetchReports();
            fetchSummary();
            fetchSektors();
            fetchKategoris();
            return userAuth;
        } catch (err) {
            console.error('Login gagal:', err);
            throw err;
        }
    }, [fetchReports, fetchSummary, fetchSektors, fetchKategoris]);

    const loginGuest = useCallback(async () => {
        try {
            const res = await guestApi();
            const user = res.user || res;
            const userAuth = ensureScalarOnly({
                id: user?.id,
                role: 'petani',
                name: user?.name || 'Petugas Lapangan (Tamu)',
                email: user?.email || 'tamu@agrowatch.local',
            }, ['id', 'role', 'name', 'email']);
            setAuth(userAuth);
            fetchReports();
            fetchSummary();
            fetchSektors();
            fetchKategoris();
            return userAuth;
        } catch (err) {
            console.error('Guest login gagal:', err);
            // Fallback lokal jika backend bermasalah
            const fallbackAuth = { role: 'petani', name: 'Petugas Lapangan (Tamu)', email: 'tamu@agrowatch.local' };
            setAuth(fallbackAuth);
            return fallbackAuth;
        }
    }, [fetchReports, fetchSummary, fetchSektors, fetchKategoris]);

    const loginWithGoogle = useCallback(async (googleProfile) => {
        try {
            // Kirim nama & email asli dari profil Google ke backend saat
            // membuat sesi guest, supaya AKUN BACKEND yang benar-benar
            // menjadi pemilik laporan (relasi `pelapor`) punya nama yang
            // sama dengan yang ditampilkan di UI ("Selamat Datang, ...").
            // SEBELUMNYA nama Google hanya disimpan di state lokal `auth`
            // untuk sapaan, sementara akun tamu di backend dibuat tanpa
            // nama sama sekali -- sehingga laporan yang dikirim tetap
            // tercatat atas nama generik "Tamu (Guest ####)" di halaman
            // Detail Laporan / Riwayat, padahal dashboard menyapa dengan
            // nama Google yang benar. Catatan: ini butuh endpoint backend
            // POST /guest menerima & menyimpan field `name`/`email`; kalau
            // belum, field ini akan diabaikan backend dan perlu ditambahkan
            // di sisi API juga.
            const res = await guestApi({
                name: googleProfile?.name,
                email: googleProfile?.email,
            });
            const user = res.user || res;
            const userAuth = ensureScalarOnly({
                id: user?.id,
                role: 'petani',
                name: user?.name || googleProfile?.name || 'Petani (Google)',
                email: user?.email || googleProfile?.email,
                avatar: googleProfile?.picture || null,
            }, ['id', 'role', 'name', 'email', 'avatar']);
            setAuth(userAuth);
            fetchReports();
            fetchSummary();
            fetchSektors();
            fetchKategoris();
            return userAuth;
        } catch (err) {
            console.warn('Google auth bridge ke backend guest gagal, menggunakan session lokal:', err);
            const fallbackAuth = ensureScalarOnly({
                role: 'petani',
                name: googleProfile?.name || 'Petani (Google)',
                email: googleProfile?.email,
                avatar: googleProfile?.picture || null,
            }, ['role', 'name', 'email', 'avatar']);
            setAuth(fallbackAuth);
            return fallbackAuth;
        }
    }, [fetchReports, fetchSummary, fetchSektors, fetchKategoris]);

    const logout = useCallback(async () => {
        try {
            await logoutApi();
        } catch (err) {
            console.warn('Logout API error:', err);
        } finally {
            setAuth({ role: null, name: null, email: null });
        }
    }, []);

    // ==========================================
    // LAPORAN ACTIONS
    // ==========================================

    const addReport = useCallback(async (dataOrFormData) => {
        let formData;
        if (dataOrFormData instanceof FormData) {
            formData = dataOrFormData;
        } else {
            formData = new FormData();
            formData.append('jenis_kejadian', dataOrFormData.jenis || dataOrFormData.jenis_kejadian || 'Serangan Hama');
            if (dataOrFormData.sektor || dataOrFormData.wilayah) {
                formData.append('wilayah', dataOrFormData.sektor || dataOrFormData.wilayah);
            }
            formData.append('latitude', Number(dataOrFormData.lat || dataOrFormData.latitude || -7.9666));
            formData.append('longitude', Number(dataOrFormData.lng || dataOrFormData.longitude || 112.6326));
            if (dataOrFormData.deskripsi || dataOrFormData.keterangan_tambahan) {
                formData.append('keterangan_tambahan', dataOrFormData.deskripsi || dataOrFormData.keterangan_tambahan);
            }
            if (dataOrFormData.tanggal || dataOrFormData.waktu_lapor) {
                formData.append('waktu_lapor', dataOrFormData.tanggal || dataOrFormData.waktu_lapor);
            }
            if (dataOrFormData.fotoFile) {
                formData.append('foto_bukti', dataOrFormData.fotoFile);
            }
        }

        try {
            const res = await createLaporanApi(formData);
            const createdReport = formatReportItem(res.laporan || res.data || res);
            setReports((prev) => [createdReport, ...prev]);

            // Catat log aktivitas
            setActivityLogs((prev) => [
                {
                    id: Date.now(),
                    admin: auth?.name || 'Petugas Lapangan',
                    action: `Mengirim laporan baru ${createdReport.jenisLabel} di ${createdReport.sektor}`,
                    time: 'Baru saja',
                },
                ...prev,
            ]);

            fetchSummary();
            return createdReport;
        } catch (err) {
            console.error('Gagal mengirim laporan ke backend:', err);
            throw err;
        }
    }, [auth, fetchSummary]);

    const updateReportStatus = useCallback(async (id, status, noteOrExtra) => {
        const backendStatus = normalizeStatusToBackend(status);
        const reportId = String(id).replace('#', '').replace('RP-', '');

        // `noteOrExtra` bisa berupa string biasa (dipakai DaftarLaporan.jsx
        // & DetailLaporan.jsx yang cuma mengirim catatan singkat) ATAU
        // objek { catatan_tindak_lanjut, tim_penanggung_jawab, kendala,
        // durasi_penanganan, alat_digunakan, catatan_selesai, tgl_selesai,
        // fotoSelesaiPreview } -- field kelompok kedua (durasi..dst) dipakai
        // DetailLaporan.jsx saat mengisi Form Selesai. `fotoSelesaiPreview`
        // adalah object URL lokal (bukan file asli) karena endpoint
        // status saat ini masih JSON, bukan multipart -- jadi foto belum
        // benar-benar terunggah ke server sampai backend menyediakan
        // endpoint atau kolom yang menerima file untuk data penyelesaian.
        const isObjectPayload = noteOrExtra && typeof noteOrExtra === 'object';
        const payload = {
            status_penanganan: backendStatus,
            catatan_tindak_lanjut: isObjectPayload ? noteOrExtra.catatan_tindak_lanjut : (noteOrExtra || undefined),
        };
        if (isObjectPayload) {
            payload.tim_penanggung_jawab = noteOrExtra.tim_penanggung_jawab;
            payload.kendala = noteOrExtra.kendala;
            payload.durasi_penanganan = noteOrExtra.durasi_penanganan;
            payload.alat_digunakan = noteOrExtra.alat_digunakan;
            payload.catatan_selesai = noteOrExtra.catatan_selesai;
            payload.tgl_selesai = noteOrExtra.tgl_selesai;
        }

        const applyLocalState = (frontendStatus, noteForLocalState) => {
            setReports((prev) =>
                prev.map((r) =>
                    String(r.id) === String(reportId) || String(r.rawId) === String(reportId)
                        ? {
                            ...r,
                            status: frontendStatus,
                            tindakLanjut: noteForLocalState || r.tindakLanjut,
                            catatan_tindak_lanjut: noteForLocalState || r.catatan_tindak_lanjut,
                            timPenanggungJawab: isObjectPayload ? (noteOrExtra.tim_penanggung_jawab || r.timPenanggungJawab) : r.timPenanggungJawab,
                            kendala: isObjectPayload ? (noteOrExtra.kendala || r.kendala) : r.kendala,
                            durasiPenanganan: isObjectPayload ? (noteOrExtra.durasi_penanganan || r.durasiPenanganan) : r.durasiPenanganan,
                            alatDigunakan: isObjectPayload ? (noteOrExtra.alat_digunakan || r.alatDigunakan) : r.alatDigunakan,
                            catatanSelesai: isObjectPayload ? (noteOrExtra.catatan_selesai || r.catatanSelesai) : r.catatanSelesai,
                            tglSelesai: isObjectPayload ? (noteOrExtra.tgl_selesai || r.tglSelesai) : r.tglSelesai,
                            fotoSelesai: isObjectPayload ? (noteOrExtra.fotoSelesaiPreview || r.fotoSelesai) : r.fotoSelesai,
                        }
                        : r
                )
            );
        };

        try {
            await updateLaporanStatusApi(reportId, payload);

            const frontendStatus = normalizeStatusToFrontend(backendStatus);
            const noteForLocalState = isObjectPayload ? noteOrExtra.catatan_tindak_lanjut : noteOrExtra;
            applyLocalState(frontendStatus, noteForLocalState);

            setActivityLogs((prev) => [
                {
                    id: Date.now(),
                    admin: auth?.name || 'Hendra Wijaya',
                    action: `Mengubah status laporan #${reportId} menjadi ${frontendStatus}`,
                    time: 'Baru saja',
                },
                ...prev,
            ]);

            fetchSummary();
        } catch (err) {
            console.error('Gagal update status laporan:', err);
            // Optimistic update -- tetap simpan data yang sudah diisi
            // user secara lokal walau request ke backend gagal, supaya
            // tidak hilang dan bisa dicoba disinkronkan lagi nanti.
            const frontendStatus = normalizeStatusToFrontend(backendStatus);
            const noteForLocalState = isObjectPayload ? noteOrExtra.catatan_tindak_lanjut : noteOrExtra;
            applyLocalState(frontendStatus, noteForLocalState);
        }
    }, [auth, fetchSummary]);

    // ==========================================
    // SEKTOR & KATEGORI ACTIONS
    // ==========================================

    const addSektor = useCallback(async (nama, luas, koordinat) => {
        // `koordinat` opsional: { latitude, longitude, radius }. Backend
        // yang belum punya kolom ini akan tetap menerima request (field
        // ekstra biasanya diabaikan), dan fallback lokal di bawah tetap
        // menyimpannya supaya UI (preview radius di Form.jsx) langsung
        // berfungsi meski backend belum diupdate.
        const lat = koordinat?.latitude !== '' && koordinat?.latitude != null ? Number(koordinat.latitude) : null;
        const lng = koordinat?.longitude !== '' && koordinat?.longitude != null ? Number(koordinat.longitude) : null;
        const rad = koordinat?.radius !== '' && koordinat?.radius != null ? Number(koordinat.radius) : null;
        // CATATAN: dulu ada fallback yang menambahkan sektor ke state lokal
        // dengan id sementara (Date.now()) kalau request ke backend gagal.
        // Itu bikin sektor "muncul" di UI padahal tidak pernah tersimpan di
        // database -- begitu user coba edit/hapus sektor itu, id sementara
        // itu tidak dikenali backend dan selalu gagal 404. Sekarang kalau
        // gagal, cukup beri tahu user dan JANGAN ubah state lokal, supaya
        // data yang ditampilkan selalu konsisten dengan database.
        try {
            await createSektorApi({
                nama_sektor: nama,
                luas_ha: Number(luas) || 0,
                status: 'Aktif',
                latitude: lat,
                longitude: lng,
                radius: rad,
            });
            fetchSektors();
        } catch (err) {
            console.warn('Gagal addSektor API:', err);
            alert('Gagal menambahkan sektor ke server. Coba lagi.');
        }
    }, [fetchSektors]);

    const updateSektor = useCallback(async (id, data) => {
        try {
            await updateSektorApi(id, data);
            fetchSektors();
        } catch (err) {
            console.warn('Gagal updateSektor API:', err);
            alert('Gagal mengubah sektor di server. Coba lagi.');
        }
    }, [fetchSektors]);

    const removeSektor = useCallback(async (id) => {
        try {
            await deleteSektorApi(id);
            fetchSektors();
        } catch (err) {
            console.warn('Gagal deleteSektor API:', err);
            alert('Gagal menghapus sektor di server. Coba lagi.');
        }
    }, [fetchSektors]);

    const addKategori = useCallback(async (nama) => {
        try {
            await createKategoriApi({ nama_kategori: nama });
            fetchKategoris();
        } catch (err) {
            console.warn('Gagal addKategori API, update lokal:', err);
            setKategoriKejadian((prev) => (prev.includes(nama) ? prev : [...prev, nama]));
        }
    }, [fetchKategoris]);

    const removeKategori = useCallback(async (kategoriOrId) => {
        try {
            await deleteKategoriApi(kategoriOrId);
            fetchKategoris();
        } catch (err) {
            console.warn('Gagal deleteKategori API, update lokal:', err);
            setKategoriKejadian((prev) => prev.filter((k) => k !== kategoriOrId));
        }
    }, [fetchKategoris]);

    const addTimPetugas = useCallback(async (data) => {

        try {
            await createTimPetugasApi(data);
            fetchTimPetugas();
        } catch (err) {
            console.warn('Gagal addTimPetugas API, simpan lokal:', err);
            const newItem = {
                id: Date.now(),
                nama_tim: data.nama_tim || data.namaTim,
                nama_ketua: data.nama_ketua || data.namaKetua || '',
                nomor_wa: data.nomor_wa || data.nomorWa || '',
                spesialisasi: data.spesialisasi || '',
            };
            setTimPetugasList((prev) => [...prev, newItem]);
        }
    }, [fetchTimPetugas]);

    const updateTimPetugas = useCallback(async (id, data) => {
        try {
            await updateTimPetugasApi(id, data);
            fetchTimPetugas();
        } catch (err) {
            console.warn('Gagal updateTimPetugas API, update lokal:', err);
            setTimPetugasList((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
        }
    }, [fetchTimPetugas]);

    const removeTimPetugas = useCallback(async (id) => {
        try {
            await deleteTimPetugasApi(id);
            fetchTimPetugas();
        } catch (err) {
            console.warn('Gagal deleteTimPetugas API, update lokal:', err);
            setTimPetugasList((prev) => prev.filter((t) => t.id !== id));
        }
    }, [fetchTimPetugas]);

    const updateSettings = useCallback((patch) => {
        setSettings((prev) => ({ ...prev, ...patch }));
    }, []);

    const value = {
        auth,
        authLoading,
        login,
        loginGuest,
        loginWithGoogle,
        logout,
        reports,
        reportsPagination,
        reportsLoading,
        fetchReports,
        summary,
        fetchSummary,
        sektorList,
        fetchSektors,
        addSektor,
        updateSektor,
        removeSektor,
        kategoriKejadian,
        fetchKategoris,
        addKategori,
        removeKategori,
        timPetugasList,
        fetchTimPetugas,
        addTimPetugas,
        updateTimPetugas,
        removeTimPetugas,
        activityLogs,
        addReport,
        updateReportStatus,
        settings,
        updateSettings,
        // Backward compatibility
        myReportIds: reports.map((r) => r.id),
    };


    return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
    const ctx = useContext(AppDataContext);
    if (!ctx) throw new Error('useAppData harus dipakai di dalam AppDataProvider');
    return ctx;
}