import { callAppsScriptAPI } from './api.js';
import { showToast } from './ui.js';

let summaryData = null;
let currentTab = 'hari_ini';

function renderStats() {
    const container = document.getElementById('stats-container');
    if (!container || !summaryData) return;

    const { stats } = summaryData;
    container.innerHTML = `
        <div class="dashboard-card p-4">
            <p class="text-sm text-gray-500">Omset Hari Ini</p>
            <p class="text-2xl font-bold text-gray-800">Rp ${stats.omset_hari_ini.toLocaleString('id-ID')}</p>
        </div>
        <div class="dashboard-card p-4">
            <p class="text-sm text-gray-500">Uang di Kasir</p>
            <p class="text-2xl font-bold text-gray-800">Rp ${stats.total_uang_kasir.toLocaleString('id-ID')}</p>
        </div>
        <div class="dashboard-card p-4">
            <p class="text-sm text-gray-500">Konsumen Baru</p>
            <p class="text-2xl font-bold text-gray-800">${stats.konsumen_baru_hari_ini}</p>
        </div>
    `;
}

function renderTabs() {
    const container = document.getElementById('summary-tabs');
    if (!container || !summaryData) return;

    const tabs = [
        { key: 'hari_ini', label: 'Masuk Hari Ini', count: summaryData.lists.hari_ini.length },
        { key: 'terlambat', label: 'Terlambat', count: summaryData.lists.terlambat.length, danger: true },
        { key: 'jatuh_tempo', label: 'Jatuh Tempo Hari Ini', count: summaryData.lists.jatuh_tempo.length }
    ];

    container.innerHTML = tabs.map(tab => `
        <button class="tab-button relative ${tab.key === currentTab ? 'active' : ''}" data-tab="${tab.key}">
            ${tab.label}
            ${tab.count > 0 ? `<span class="notif-bubble ${tab.danger ? 'danger' : ''} show">${tab.count}</span>` : ''}
        </button>
    `).join('');

    container.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTab = btn.dataset.tab;
            renderTabs();
            renderList();
        });
    });
}

function renderList() {
    const container = document.getElementById('summary-list-container');
    if (!container || !summaryData) return;

    const list = summaryData.lists[currentTab];

    if (list.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center text-gray-500">Tidak ada data untuk kategori ini.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="space-y-2">
                ${list.map(trx => `
                    <a href="#transaksi" class="block p-3 border-b hover:bg-gray-50">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="font-bold text-gray-800">${trx.nama_pelanggan}</p>
                                <p class="text-xs text-gray-500 font-mono">${trx.id_transaksi}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm font-semibold">Rp ${parseInt(trx.total_biaya).toLocaleString('id-ID')}</p>
                                <span class="text-xs px-2 py-0.5 rounded-full ${trx.status_bayar === 'Lunas' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${trx.status_bayar}</span>
                            </div>
                        </div>
                        ${currentTab !== 'hari_ini' ? `
                        <div class="mt-2 text-xs">
                            <p class="font-semibold ${currentTab === 'terlambat' ? 'text-red-600' : 'text-orange-600'}">
                                <i class="fas fa-clock mr-1"></i> Estimasi Selesai: ${new Date(trx.estimasi_selesai).toLocaleString('id-ID')}
                            </p>
                        </div>
                        ` : ''}
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}


export async function initializeRingkasanPage(user) {
    const container = document.getElementById('page-content-container');
    container.querySelector('#stats-container').innerHTML = '<p class="text-gray-500">Memuat statistik...</p>';
    container.querySelector('#summary-list-container').innerHTML = '<p class="text-gray-500">Memuat daftar transaksi...</p>';
    
    try {
        const res = await callAppsScriptAPI('getDailySummary', {});
        summaryData = res.response;
        renderStats();
        renderTabs();
        renderList();
    } catch (e) {
        showToast('error', `Gagal memuat data: ${e.message}`);
        container.innerHTML = `<div class="bg-red-100 text-red-700 p-4 rounded-lg">Terjadi kesalahan saat memuat ringkasan harian.</div>`;
    }
}