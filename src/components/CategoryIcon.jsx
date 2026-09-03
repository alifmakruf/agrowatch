import React from 'react';
import {
    Flame,
    Bug,
    CloudRain,
    Sprout,
    Droplets,
    AlertTriangle,
    ShieldAlert,
    Sun,
    WifiOff,
} from 'lucide-react';

export function getCategoryConfig(categoryName = '') {
    const name = String(categoryName || '').toLowerCase();

    if (name.includes('bakar') || name.includes('api') || name.includes('flame')) {
        return {
            Icon: Flame,
            label: categoryName || 'Kebakaran',
            color: 'text-orange-500',
            bgColor: 'bg-orange-50 dark:bg-orange-950/30',
            borderColor: 'border-orange-200 dark:border-orange-800',
            badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
        };
    }

    if (name.includes('hama') || name.includes('ulat') || name.includes('wereng') || name.includes('belalang') || name.includes('bug')) {
        return {
            Icon: Bug,
            label: categoryName || 'Serangan Hama',
            color: 'text-red-500',
            bgColor: 'bg-red-50 dark:bg-red-950/30',
            borderColor: 'border-red-200 dark:border-red-800',
            badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
        };
    }

    if (name.includes('banjir') || name.includes('genang') || name.includes('hujan') || name.includes('air') || name.includes('rain')) {
        return {
            Icon: CloudRain,
            label: categoryName || 'Banjir / Genangan',
            color: 'text-blue-500',
            bgColor: 'bg-blue-50 dark:bg-blue-950/30',
            borderColor: 'border-blue-200 dark:border-blue-800',
            badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        };
    }

    if (name.includes('penyakit') || name.includes('jamur') || name.includes('busuk') || name.includes('tanaman')) {
        return {
            Icon: Sprout,
            label: categoryName || 'Penyakit Tanaman',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
            badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        };
    }

    if (name.includes('irigasi') || name.includes('pipa') || name.includes('saluran')) {
        return {
            Icon: Droplets,
            label: categoryName || 'Kerusakan Irigasi',
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
            borderColor: 'border-cyan-200 dark:border-cyan-800',
            badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
        };
    }

    if (name.includes('kering') || name.includes('kemarau') || name.includes('panas')) {
        return {
            Icon: Sun,
            label: categoryName || 'Kekeringan',
            color: 'text-amber-500',
            bgColor: 'bg-amber-50 dark:bg-amber-950/30',
            borderColor: 'border-amber-200 dark:border-amber-800',
            badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        };
    }

    if (name.includes('sensor') || name.includes('offline') || name.includes('iot')) {
        return {
            Icon: WifiOff,
            label: categoryName || 'Sensor Offline',
            color: 'text-slate-500',
            bgColor: 'bg-slate-50 dark:bg-slate-900',
            borderColor: 'border-slate-200 dark:border-slate-800',
            badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        };
    }

    if (name.includes('curi') || name.includes('maling') || name.includes('aman')) {
        return {
            Icon: ShieldAlert,
            label: categoryName || 'Keamanan',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50 dark:bg-purple-950/30',
            borderColor: 'border-purple-200 dark:border-purple-800',
            badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
        };
    }

    return {
        Icon: AlertTriangle,
        label: categoryName || 'Insiden Lapangan',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    };
}

export default function CategoryIcon({
    name,
    size = 18,
    className = '',
    withBackground = false,
    showLabel = false,
    labelClassName = 'text-xs font-semibold',
}) {
    const config = getCategoryConfig(name);
    const { Icon, color, bgColor, borderColor, label } = config;

    if (withBackground) {
        return (
            <div className={`inline-flex items-center gap-2 ${className}`}>
                <div className={`p-2 rounded-xl ${bgColor} ${borderColor} border flex items-center justify-center shrink-0`}>
                    <Icon size={size} className={color} />
                </div>
                {showLabel && <span className={labelClassName}>{name || label}</span>}
            </div>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <Icon size={size} className={color} />
            {showLabel && <span className={labelClassName}>{name || label}</span>}
        </span>
    );
}
