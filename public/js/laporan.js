/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN LAPORAN
 */

import { callAppsScriptAPI } from './api.js';
import { showToast, waitForElements } from './ui.js';

/**
 * Menginisialisasi Halaman Menu Laporan.
 */
export async function initializeLaporanPage(user) {
    // Fungsi ini sekarang untuk halaman menu laporan utama.
}

/**
 * Menginisialisasi Halaman Laporan Pendapatan.
 */
export async function initializeLaporanPendapatanPage(user) {
    try {
        await waitForElements([
            'report-start-date',
            'report-end-date',
            'generate-report-btn'
        ]);

        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);

        document.getElementById('report-start-date').value = sevenDaysAgo.toISOString().split('T')[0];
        document.getElementById('report-end-date').value = today.toISOString().split('T')[0];

        document.getElementById('generate-report-btn').addEventListener('click', handleGeneratePendapatanReport);
        
        handleGeneratePendapatanReport(); 

    } catch (err) {
        console.error("Gagal menginisialisasi halaman laporan:", err);
        showToast('error', 'Gagal memuat komponen halaman laporan.');
    }
}

async function handleGeneratePendapatanReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const resultsContainer = document.getElementById('report-results-container');

    if (!startDate || !endDate) {
        showToast('error', 'Silakan pilih tanggal mulai dan tanggal selesai.');
        return;
    }
    
    resultsContainer.innerHTML = `<div class="text-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div><p class="mt-2 text-gray-500">Membuat laporan...</p></div>`;

    try {
        const res = await callAppsScriptAPI('getRevenueReport', { startDate, endDate });
        if (res.response) {
            displayPendapatanReportResults(res.response);
        } else {
            throw new Error("Format respons laporan tidak valid.");
        }
    } catch (err) {
        resultsContainer.innerHTML = `<div class="bg-red-100 text-red-700 p-4 rounded-lg">Gagal membuat laporan: ${err.message}</div>`;
        console.error(err);
    }
}

function displayPendapatanReportResults(data) {
    const resultsContainer = document.getElementById('report-results-container');
    const { totalPendapatan, totalTransaksiLunas, avgPendapatan } = data;

    const formattedPendapatan = `Rp ${parseInt(totalPendapatan || 0).toLocaleString('id-ID')}`;
    const formattedAvg = `Rp ${parseInt(avgPendapatan || 0).toLocaleString('id-ID')}`;

    resultsContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white p-4 rounded-lg shadow text-center">
                <h5 class="font-medium text-gray-500">Total Pendapatan (Lunas)</h5>
                <p class="text-2xl font-bold text-green-600 mt-2">${formattedPendapatan}</p>
            </div>
            <div class="bg-white p-4 rounded-lg shadow text-center">
                <h5 class="font-medium text-gray-500">Total Transaksi Lunas</h5>
                <p class="text-2xl font-bold text-gray-800 mt-2">${totalTransaksiLunas}</p>
            </div>
            <div class="bg-white p-4 rounded-lg shadow text-center">
                <h5 class="font-medium text-gray-500">Rata-rata per Transaksi</h5>
                <p class="text-2xl font-bold text-gray-800 mt-2">${formattedAvg}</p>
            </div>
        </div>
    `;
}
