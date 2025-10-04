/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN PENGATURAN PROSES
 */
import { callAppsScriptAPI } from './api.js';
import { showToast, waitForElements, showLoading, hideLoading } from './ui.js';

let allCategories = [];
let allProcesses = [];
let categoryProcessMap = {};

function renderSettings() {
    const container = document.getElementById('settings-container');
    if (!container) return;

    let html = '';
    
    // Tautan ke halaman manajemen Proses Kerja
    html += `
        <div class="bg-white p-4 rounded-lg shadow mb-6">
            <h3 class="font-bold text-lg text-gray-800 mb-2">Kelola Proses Kerja</h3>
            <p class="text-sm text-gray-600 mb-3">Tambahkan, edit, atau hapus proses seperti "Pencucian" atau "Pengeringan".</p>
            <a href="#proses-kerja" class="btn-primary inline-block">Buka Manajemen Proses</a>
        </div>
    `;

    // Formulir untuk mengatur kaitan Kategori dengan Proses
    html += `
        <h3 class="font-bold text-lg text-gray-800 mb-3">Atur Proses untuk Setiap Kategori</h3>
    `;

    allCategories.forEach(category => {
        const assignedProcesses = categoryProcessMap[category.id_kategori] || [];

        html += `
            <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="font-bold text-lg text-gray-800 mb-3">${category.nama_kategori}</h3>
                <div class="space-y-2">
        `;
        
        allProcesses.forEach(process => {
            const isChecked = assignedProcesses.some(p => p.id_proses === process.id_proses);
            html += `
                <label class="flex items-center">
                    <input type="checkbox" 
                           class="h-4 w-4 text-blue-600 border-gray-300 rounded process-checkbox" 
                           data-category-id="${category.id_kategori}" 
                           value="${process.id_proses}"
                           ${isChecked ? 'checked' : ''}>
                    <span class="ml-2 text-gray-700">${process.nama_proses}</span>
                </label>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += `<div class="mt-6 flex justify-end">
                <button id="btn-save-settings" class="btn-primary">Simpan Semua Perubahan</button>
             </div>`;

    container.innerHTML = html;

    document.getElementById('btn-save-settings').addEventListener('click', handleSaveSettings);
}

async function handleSaveSettings() {
    showLoading();
    const payload = {};

    document.querySelectorAll('.process-checkbox').forEach(checkbox => {
        const categoryId = checkbox.dataset.categoryId;
        const processId = checkbox.value;

        if (!payload[categoryId]) {
            payload[categoryId] = [];
        }

    if (checkbox.checked) {
        payload[categoryId].push(processId);
    }
});

try {
    await callAppsScriptAPI('saveProsesKerja', { settings: payload });
    showToast('success', 'Pengaturan berhasil disimpan.');
} catch (err) {
    showToast('error', `Gagal menyimpan: ${err.message}`);
} finally {
    hideLoading();
}
}

async function loadAndRenderSettings() {
    const container = document.getElementById('settings-container');
    container.innerHTML = `<div class="text-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div></div>`;
    
    try {
        const res = await callAppsScriptAPI('getSettingsData', {});
        const data = res.response;

        allCategories = data.categories || [];
        allProcesses = data.processes || [];
        categoryProcessMap = data.categoryProcessMap || {};
        
        renderSettings();

    } catch (e) {
        console.error("Gagal memuat pengaturan:", e);
        showToast('error', `Gagal memuat pengaturan: ${e.message}`);
        container.innerHTML = `<div class="bg-red-100 text-red-700 p-4 rounded-lg">Gagal memuat data pengaturan dari server.</div>`;
    }
}

export async function initializeSettingsPage(user) {
    try {
        await waitForElements(['settings-container']);
        loadAndRenderSettings();
    } catch (err) {
        console.error("Gagal inisialisasi halaman pengaturan:", err);
    }
}
