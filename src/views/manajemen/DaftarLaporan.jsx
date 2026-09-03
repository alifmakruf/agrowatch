import React, { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../layout/Sidebar';
import { MoreVertical, ChevronLeft, ChevronRight, X, Search, Flame, Bug, Droplets, RefreshCw, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useAppData, formatReportItem } from '../../context/AppDataContext';
import { getLaporanApi } from '../../api/laporan';
import CategoryIcon from '../../components/CategoryIcon';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAGE_SIZE = 5;

// Dropdown aksi dirender lewat portal ke document.body dan diposisikan
// `fixed` berdasarkan posisi tombol pemicunya. BUG SEBELUMNYA: dropdown
// dirender sebagai <div className="absolute ..."> di dalam <td> yang ada
// di dalam wrapper `overflow-x-auto` dan container luar `overflow-hidden`
// -- dua-duanya MEMOTONG (clip) elemen absolute yang keluar dari
// batasnya, sehingga dropdown terlihat "kepotong"/terjebak di dalam
// area tabel alih-alih melayang bebas di atas seluruh halaman.
//
// BUG LANJUTAN (masih terpotong di sudut/sisi layar): fix pertama di atas
// cuma mengklem posisi horizontal (`left`) memakai lebar menu yang
// di-hardcode, dan sama sekali tidak mengklem posisi vertikal (`top`).
// Jadi kalau tombol titik-3 dipencet di baris paling bawah / dekat tepi
// bawah layar, dropdown tetap dibuka ke bawah (`anchorRect.bottom + 6`)
// dan terpotong oleh batas bawah viewport. Solusinya: ukur dimensi asli
// dropdown SETELAH ia dirender (via ref + useLayoutEffect), baru tentukan
// posisi akhir -- buka ke ATAS tombol kalau ruang di bawah tidak cukup,
// dan klem `left`/`top` supaya menu selalu penuh berada di dalam viewport
// pada keempat sisi, bukan cuma sisi kanan.
function ActionMenuPortal({ anchorRect, onClose, children }) {
    const menuRef = useRef(null);
    const [style, setStyle] = useState({ position: 'fixed', top: -9999, left: -9999, zIndex: 1000, visibility: 'hidden' });

    useLayoutEffect(() => {
        if (!anchorRect || !menuRef.current) return;
        const margin = 8;
        const { offsetWidth: menuWidth, offsetHeight: menuHeight } = menuRef.current;

        // Horizontal: default rata kanan ke tombol, lalu klem ke dalam viewport
        let left = anchorRect.right - menuWidth;
        left = Math.min(left, window.innerWidth - menuWidth - margin);
        left = Math.max(left, margin);

        // Vertikal: default buka ke bawah tombol, tapi flip ke atas kalau
        // ruang di bawah tidak cukup untuk menampung seluruh tinggi menu
        const spaceBelow = window.innerHeight - anchorRect.bottom;
        const spaceAbove = anchorRect.top;
        let top;
        if (spaceBelow >= menuHeight + margin || spaceBelow >= spaceAbove) {
            top = anchorRect.bottom + 6;
        } else {
            top = anchorRect.top - menuHeight - 6;
        }
        top = Math.min(top, window.innerHeight - menuHeight - margin);
        top = Math.max(top, margin);

        setStyle({ position: 'fixed', top, left, zIndex: 1000, visibility: 'visible' });
    }, [anchorRect]);

    if (!anchorRect) return null;
    return createPortal(
        <>
            <div className="fixed inset-0 z-[999]" onClick={onClose} />
            <div
                ref={menuRef}
                style={style}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg w-44 py-1 text-left animate-in fade-in zoom-in-95 duration-150"
            >
                {children}
            </div>
        </>,
        document.body
    );
}

export default function DaftarLaporan() {
    const [activeTab, setActiveTab] = useState('Semua Laporan');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [page, setPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuAnchorRect, setMenuAnchorRect] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { reports, fetchReports, fetchSummary, summary, reportsLoading, updateReportStatus } = useAppData();

    const [exportingFormat, setExportingFormat] = useState(null); // 'excel' | 'pdf' | null

    const closeMenu = () => { setOpenMenuId(null); setMenuAnchorRect(null); };

    const handleToggleMenu = (e, id) => {
        if (openMenuId === id) {
            closeMenu();
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuAnchorRect(rect);
        setOpenMenuId(id);
    };

    useEffect(() => {
        fetchReports();
        fetchSummary();
    }, [fetchReports, fetchSummary]);

    const query = (searchParams.get('q') || '').toLowerCase();

    const daftarLaporan = useMemo(() => {
        return reports.map((r) => ({
            id: '#' + r.id,
            rawId: r.id,
            tanggal: r.tanggal ? new Date(r.tanggal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(r.tanggal).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
            jenis: r.jenisLabel || 'Serangan Hama',
            lokasi: r.sektor || 'Sektor A',
            pelapor: r.pelapor || 'Petugas Lapangan',
            inisial: (r.pelapor || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase(),
            status: r.status || 'Terbuka',
        }));
    }, [reports]);

    // Dipakai baik untuk tabel di layar (dari data yang sudah termuat)
    // maupun untuk export -- supaya file Excel/PDF yang dihasilkan
    // konsisten dengan tab/kategori/pencarian yang sedang aktif di layar.
    const applyClientFilters = (data) => {
        let result = data;
        if (activeTab === 'Terbuka') result = result.filter((d) => d.status === 'Kritis' || d.status === 'Terbuka' || d.status === 'Menunggu');
        else if (activeTab === 'Sedang Diproses') result = result.filter((d) => d.status === 'Sedang Diproses' || d.status === 'Diproses');
        else if (activeTab === 'Selesai') result = result.filter((d) => d.status === 'Selesai' || d.status === 'Ditutup');

        if (selectedCategory) {
            result = result.filter((d) => d.jenis.toLowerCase().includes(selectedCategory.toLowerCase()));
        }

        if (query) {
            result = result.filter(
                (d) =>
                    d.id.toLowerCase().includes(query) ||
                    d.lokasi.toLowerCase().includes(query) ||
                    d.jenis.toLowerCase().includes(query) ||
                    d.pelapor.toLowerCase().includes(query)
            );
        }
        return result;
    };

    const filtered = useMemo(() => applyClientFilters(daftarLaporan), [daftarLaporan, activeTab, selectedCategory, query]);

    // Pakai summary.open dari backend (akurat untuk SELURUH laporan) --
    // bukan cuma dihitung dari `reports` yang termuat di halaman ini, yang
    // dibatasi pagination dan bisa saja tidak mencerminkan total sebenarnya.
    const openCount = summary?.open ?? daftarLaporan.filter((d) => d.status === 'Kritis' || d.status === 'Terbuka' || d.status === 'Menunggu').length;

    // ==========================================
    // EXPORT KE EXCEL / PDF
    // ==========================================
    // Ambil data laporan LENGKAP (bukan cuma halaman yang sedang termuat
    // di tabel, yang dibatasi per_page) langsung dari backend, baru
    // diterapkan filter tab/kategori/pencarian yang sama seperti di layar
    // -- supaya file yang diekspor benar-benar merepresentasikan seluruh
    // data yang cocok, bukan cuma sebagian yang kebetulan sudah dimuat.
    const fetchAllForExport = async () => {
        const res = await getLaporanApi({ per_page: 10000 });
        const rawData = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const formatted = rawData.map(formatReportItem).map((r) => ({
            id: '#' + r.id,
            rawId: r.id,
            tanggal: r.tanggal ? new Date(r.tanggal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(r.tanggal).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
            jenis: r.jenisLabel || 'Serangan Hama',
            lokasi: r.sektor || 'Sektor A',
            pelapor: r.pelapor || 'Petugas Lapangan',
            status: r.status || 'Terbuka',
            deskripsi: r.deskripsi || '-',
        }));
        return applyClientFilters(formatted);
    };

    const exportToExcel = (data) => {
        const rows = data.map((d) => ({
            'ID Laporan': d.id,
            Tanggal: d.tanggal,
            'Jenis Insiden': d.jenis,
            Lokasi: d.lokasi,
            Pelapor: d.pelapor,
            Status: d.status,
            Keterangan: d.deskripsi,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 40 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daftar Laporan');
        XLSX.writeFile(wb, `daftar-laporan-agrowatch-${Date.now()}.xlsx`);
    };

    const exportToPdf = (data) => {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(14);
        doc.setTextColor(26, 71, 42);
        doc.text('AgroWatch - Daftar Laporan Insiden', 14, 15);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}  |  Total: ${data.length} laporan  |  Filter: ${activeTab}${selectedCategory ? ' - ' + selectedCategory : ''}`, 14, 21);
        autoTable(doc, {
            startY: 26,
            head: [['ID', 'Tanggal', 'Jenis Insiden', 'Lokasi', 'Pelapor', 'Status', 'Keterangan']],
            body: data.map((d) => [d.id, d.tanggal, d.jenis, d.lokasi, d.pelapor, d.status, d.deskripsi]),
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [26, 71, 42], textColor: 255 },
            alternateRowStyles: { fillColor: [246, 248, 246] },
            columnStyles: { 6: { cellWidth: 80 } },
        });
        doc.save(`daftar-laporan-agrowatch-${Date.now()}.pdf`);
    };

    const handleExport = async (format) => {
        setExportingFormat(format);
        try {
            const data = await fetchAllForExport();
            if (format === 'excel') exportToExcel(data);
            else exportToPdf(data);
        } catch (err) {
            console.error(`Gagal mengekspor ke ${format}:`, err);
            alert('Gagal mengekspor data. Coba lagi.');
        } finally {
            setExportingFormat(null);
        }
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleTabClick = (tab) => {
        setActiveTab(tab);
        setPage(1);
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        if (val) {
            searchParams.set('q', val);
        } else {
            searchParams.delete('q');
        }
        setSearchParams(searchParams);
        setPage(1);
    };

    const clearSearch = () => {
        searchParams.delete('q');
        setSearchParams(searchParams);
    };

    const renderJenisIcon = (jenis) => <CategoryIcon name={jenis} size={14} />;

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'Kritis':
            case 'Terbuka':
            case 'Menunggu':
                return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">Terbuka</span>;
            case 'Terverifikasi':
            case 'Selesai':
            case 'Ditutup':
                return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Selesai</span>;
            case 'Sedang Diproses':
            case 'Diproses':
                return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Sedang Diproses</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{status}</span>;
        }
    };

    return (
        <Sidebar>
            <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Daftar Laporan Insiden</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Kelola dan pantau semua laporan insiden di area perkebunan tebu.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => handleExport('excel')}
                            disabled={exportingFormat !== null}
                            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-white dark:bg-gray-900 hover:bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer w-fit disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Ekspor daftar laporan (sesuai filter aktif) ke Excel"
                        >
                            {exportingFormat === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                            <span>Excel</span>
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            disabled={exportingFormat !== null}
                            className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-white dark:bg-gray-900 hover:bg-red-50 border border-red-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer w-fit disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Ekspor daftar laporan (sesuai filter aktif) ke PDF"
                        >
                            {exportingFormat === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                            <span>PDF</span>
                        </button>
                        <button
                            onClick={() => fetchReports()}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 border border-gray-200 dark:border-gray-800 px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer w-fit"
                            title="Refresh Laporan"
                        >
                            <RefreshCw size={14} className={reportsLoading ? 'animate-spin' : ''} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-4 py-2 w-full max-w-sm shadow-xs">
                    <Search size={16} className="text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        placeholder="Cari laporan, ID, atau lokasi..."
                        value={searchParams.get('q') || ''}
                        onChange={handleSearchChange}
                        className="w-full text-xs outline-none bg-transparent"
                    />
                    {query && (
                        <button onClick={clearSearch} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 cursor-pointer">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {['Semua Laporan', 'Terbuka', 'Sedang Diproses', 'Selesai'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => handleTabClick(tab)}
                                className={`relative px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${activeTab === tab
                                    ? 'bg-[#14361e] text-white font-bold shadow-xs'
                                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                                    }`}
                            >
                                {tab}
                                {/* Titik merah -- penanda masih ada laporan Terbuka/belum
                                    diproses, tetap kelihatan walau tab ini sedang tidak aktif. */}
                                {tab === 'Terbuka' && openCount > 0 && (
                                    <span
                                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-950"
                                        title={`${openCount} laporan belum diproses`}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-5 w-[1px] bg-gray-200 mx-1 hidden sm:block"></div>
                        {[
                            { name: 'Kebakaran', icon: Flame },
                            { name: 'Hama', icon: Bug },
                            { name: 'Irigasi', icon: Droplets },
                        ].map((cat) => {
                            const IconComponent = cat.icon;
                            const isSelected = selectedCategory === cat.name;
                            return (
                                <button
                                    key={cat.name}
                                    onClick={() => { setSelectedCategory(isSelected ? null : cat.name); setPage(1); }}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${isSelected
                                        ? 'bg-green-100 text-green-900 border border-green-300 font-bold'
                                        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                                        }`}
                                >
                                    <IconComponent size={13} />
                                    <span>{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/70 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                                    <th className="py-4 px-6">ID</th>
                                    <th className="py-4 px-6">Tanggal</th>
                                    <th className="py-4 px-6">Jenis</th>
                                    <th className="py-4 px-6">Lokasi</th>
                                    <th className="py-4 px-6">Pelapor</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                                {reportsLoading && pageItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400 dark:text-gray-500">
                                            <div className="w-6 h-6 border-2 border-[#14361e] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                            <span>Memuat laporan dari server...</span>
                                        </td>
                                    </tr>
                                ) : pageItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400 dark:text-gray-500">Tidak ada laporan yang cocok dengan filter.</td>
                                    </tr>
                                ) : (
                                    pageItems.map((item, idx) => (
                                        <tr key={idx} className="lift-hover hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-6 font-bold text-gray-900 dark:text-gray-100">{item.id}</td>
                                            <td className="py-4 px-6 text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.tanggal}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    {renderJenisIcon(item.jenis)}
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{item.jenis}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-gray-600 dark:text-gray-400">{item.lokasi}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-[10px]">
                                                        {item.inisial}
                                                    </div>
                                                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.pelapor}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">{renderStatusBadge(item.status)}</td>
                                            <td className="py-4 px-6 text-center relative">
                                                <button
                                                    onClick={(e) => handleToggleMenu(e, item.rawId)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {openMenuId === item.rawId && (
                                                    <ActionMenuPortal anchorRect={menuAnchorRect} onClose={closeMenu}>
                                                        <button
                                                            onClick={() => { navigate(`/manajemen/laporan/${item.rawId}`); closeMenu(); }}
                                                            className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 text-gray-700 dark:text-gray-300 font-medium border-b border-gray-100 dark:border-gray-800 cursor-pointer"
                                                        >
                                                            Detail Laporan
                                                        </button>
                                                        <button
                                                            onClick={() => { navigate('/manajemen/map'); closeMenu(); }}
                                                            className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 text-gray-700 dark:text-gray-300 cursor-pointer"
                                                        >
                                                            Lihat di Peta
                                                        </button>
                                                        <button
                                                            onClick={async () => { await updateReportStatus(item.rawId, 'Diproses'); closeMenu(); }}
                                                            className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 text-amber-700 cursor-pointer"
                                                        >
                                                            Tandai Diproses
                                                        </button>
                                                        <button
                                                            onClick={() => { closeMenu(); navigate(`/manajemen/laporan/${item.rawId}`); }}
                                                            className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 text-emerald-700 cursor-pointer"
                                                        >
                                                            Tandai Selesai
                                                        </button>
                                                    </ActionMenuPortal>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                            Menampilkan {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} sampai {Math.min(currentPage * PAGE_SIZE, filtered.length)} dari {filtered.length} laporan
                        </span>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-50 text-gray-400 dark:text-gray-500 disabled:opacity-50 cursor-pointer"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-lg font-medium flex items-center justify-center cursor-pointer ${p === currentPage ? 'bg-[#14361e] text-white font-bold shadow-xs' : 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-300'}`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-50 text-gray-700 dark:text-gray-300 disabled:opacity-50 cursor-pointer"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </Sidebar>
    );
}