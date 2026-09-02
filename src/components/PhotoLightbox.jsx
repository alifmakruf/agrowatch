import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';

/**
 * Lightbox foto full-size yang bisa dipakai ulang di halaman manapun yang
 * menampilkan foto laporan (Bukti Foto, Dokumentasi Terkini, preview Form,
 * popup Peta, dst). SEBELUMNYA foto-foto ini cuma bisa dilihat terpotong
 * sesuai ukuran card-nya (object-cover) tanpa cara untuk melihat versi
 * aslinya secara utuh.
 *
 * Pemakaian:
 *   const [lightboxSrc, setLightboxSrc] = useState(null);
 *   <img onClick={() => setLightboxSrc(url)} className="cursor-zoom-in" ... />
 *   <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
 */
export default function PhotoLightbox({ src, alt = 'Foto', onClose }) {
    useEffect(() => {
        if (!src) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        // Kunci scroll body selagi lightbox terbuka
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [src, onClose]);

    if (!src) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 cursor-pointer transition-colors z-10"
                title="Tutup (Esc)"
            >
                <X size={20} />
            </button>
            <a
                href={src}
                download
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 cursor-pointer transition-colors z-10"
                title="Unduh foto"
            >
                <Download size={20} />
            </a>
            <img
                src={src}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl select-none"
            />
        </div>,
        document.body
    );
}
