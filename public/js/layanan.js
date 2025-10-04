/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN DATA LAYANAN (OWNER ONLY)
 * VERSI PERBAIKAN: Menggunakan tampilan kartu, filter, dan pencarian.
 */
import { callAppsScriptAPI } from './api.js';
import { showToast, waitForElements } from './ui.js';
import { openFormModal, hideFormModal, buildDynamicForm, populateForm } from './modals.js';

let currentUser = null;
let currentLayananId = null;
let allLayanan = [];
let allKategori = [];

// --- FUNGSI RENDER UTAMA ---
function renderFilteredLayanan() {
    const container = document.getElementById('layanan-list-container');
    const filterKategori = document.getElementById('filter-kategori').value;
    const searchTerm = document.getElementById('search-layanan').value.toLowerCase();

    if (!container) return;

    let filtered = allLayanan;

    if (filterKategori) {
        filtered = filtered.filter(l => l.id_kategori == filterKategori);
    }

    if (searchTerm) {
        filtered = filtered.filter(l => 
            l.nama_layanan.toLowerCase().includes(searchTerm) ||
            l.kategori.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-1 md:col-span-2 lg:col-span-3 bg-yellow-50 text-yellow-700 p-6 rounded-lg text-center">
            <i class="fas fa-info-circle text-2xl mb-2"></i>
            <p>Tidak ada layanan yang cocok dengan kriteria pencarian.</p>
        </div>`;
        return;
    }

    container.innerHTML = filtered.map(layanan => `
        <div class="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col justify-between">
            <div>
                <div class="mb-2">
                    <span class="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">${layanan.nama_kategori || 'Tanpa Kategori'}</span>
                </div>
                <h5 class="font-bold text-lg text-gray-800 mb-1">${layanan.nama_layanan}</h5>
                <p class="text-2xl font-extrabold text-gray-900 mb-2">
                    Rp ${parseInt(layanan.harga).toLocaleString('id-ID')}
                    <span class="text-sm font-normal text-gray-500">/ ${layanan.satuan}</span>
                </p>
                <div class="text-xs text-gray-500 space-y-1">
                    <p><i class="fas fa-clock w-4 mr-1"></i>Durasi: ${layanan.durasi_hari} hari, ${layanan.durasi_jam} jam</p>
                    <p><i class="fas fa-box w-4 mr-1"></i>Min. Order: ${layanan.min_order} ${layanan.satuan}</p>
                </div>
            </div>
            <div class="flex space-x-2 mt-4 pt-3 border-t">
                <button class="btn-action-warning flex-1 text-xs" data-id="${layanan.id_layanan}" data-name="${layanan.nama_layanan}"><i class="fas fa-copy"></i></button>
                <button class="btn-action-primary flex-1 text-xs" data-id="${layanan.id_layanan}"><i class="fas fa-edit"></i></button>
                <button class="btn-action-danger flex-1 text-xs" data-id="${layanan.id_layanan}"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    // Re-attach event listeners
    container.querySelectorAll('.btn-action-warning').forEach(b => b.addEventListener('click', (e) => handleDuplicateLayanan(e.currentTarget.dataset.id, e.currentTarget.dataset.name)));
    container.querySelectorAll('.btn-action-primary').forEach(b => b.addEventListener('click', (e) => handleEditLayanan(e.currentTarget.dataset.id)));
    container.querySelectorAll('.btn-action-danger').forEach(b => b.addEventListener('click', (e) => handleDeleteLayanan(e.currentTarget.dataset.id)));
}


// --- FUNGSI LOAD DATA ---
async function loadAndRenderPage() {
    const container = document.getElementById('page-content-container');
    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h2 class="text-2xl font-bold text-gray-800">Manajemen Layanan</h2>
                <p class="text-sm text-gray-500">Kelola semua layanan yang ditawarkan.</p>
            </div>
            <button id="btn-tambah-layanan" class="btn-primary w-full md:w-auto text-sm px-5 py-3 rounded-lg">
                <i class="fas fa-plus mr-2"></i>Tambah Layanan
            </button>
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow-md mb-6 sticky top-0 z-10">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="search-layanan" class="text-sm font-medium text-gray-700">Cari Layanan</label>
                    <div class="relative mt-1">
                        <input type="search" id="search-layanan" class="input-text w-full pl-10" placeholder="Nama atau kategori...">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    </div>
                </div>
                <div>
                    <label for="filter-kategori" class="text-sm font-medium text-gray-700">Filter Kategori</label>
                    <select id="filter-kategori" class="input-text w-full mt-1">
                        <option value="">Semua Kategori</option>
                    </select>
                </div>
            </div>
        </div>

        <div id="layanan-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="col-span-1 md:col-span-2 lg:col-span-3 text-center p-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p class="text-gray-500 mt-2">Memuat data layanan...</p>
            </div>
        </div>
    `;
    
    document.getElementById('btn-tambah-layanan').addEventListener('click', handleCreateLayanan);
    document.getElementById('search-layanan').addEventListener('input', renderFilteredLayanan);
    document.getElementById('filter-kategori').addEventListener('change', renderFilteredLayanan);
    
    try {
        const [layananRes, kategoriRes] = await Promise.all([
            callAppsScriptAPI('getLayananList', {}),
            callAppsScriptAPI('getKategoriList', {})
        ]);
        
        allLayanan = layananRes.response.objects || [];
        allKategori = kategoriRes.response.objects || [];
        
        const filterDropdown = document.getElementById('filter-kategori');
        allKategori.forEach(k => {
            filterDropdown.innerHTML += `<option value="${k.id_kategori}">${k.nama_kategori}</option>`;
        });
        
        renderFilteredLayanan();

    } catch (e) {
        showToast('error', `Gagal memuat data: ${e.message}`);
        document.getElementById('layanan-list-container').innerHTML = `
            <div class="col-span-1 md:col-span-2 lg:col-span-3 bg-red-50 text-red-700 p-6 rounded-lg text-center">
                <p>Gagal memuat data layanan. Silakan coba lagi.</p>
            </div>
        `;
    }
}


// --- FUNGSI-FUNGSI AKSI (CRUD) ---

function getLayananFormConfig() {
     const kategoriOptions = allKategori.map(k => ({ value: k.id_kategori, text: k.nama_kategori }));
     return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
                <label for="nama_layanan" class="block text-sm font-medium text-gray-700 mb-1">Nama Layanan*</label>
                <input type="text" name="nama_layanan" class="input-text w-full">
            </div>
             <div>
                <label for="id_kategori" class="block text-sm font-medium text-gray-700 mb-1">Kategori*</label>
                <select name="id_kategori" class="input-text w-full">
                    <option value="">Pilih Kategori</option>
                    ${kategoriOptions.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('')}
                </select>
            </div>
            <div>
                <label for="satuan" class="block text-sm font-medium text-gray-700 mb-1">Satuan* (kg, pcs, m2, dll)</label>
                <input type="text" name="satuan" class="input-text w-full">
            </div>
            <div>
                <label for="harga" class="block text-sm font-medium text-gray-700 mb-1">Harga*</label>
                <input type="number" name="harga" class="input-text w-full">
            </div>
             <div>
                <label for="min_order" class="block text-sm font-medium text-gray-700 mb-1">Min. Order*</label>
                <input type="number" name="min_order" class="input-text w-full" value="1">
            </div>
            <div>
                <label for="durasi_hari" class="block text-sm font-medium text-gray-700 mb-1">Durasi (Hari)</label>
                <input type="number" name="durasi_hari" class="input-text w-full" value="1">
            </div>
            <div>
                <label for="durasi_jam" class="block text-sm font-medium text-gray-700 mb-1">Durasi (Jam)</label>
                <input type="number" name="durasi_jam" class="input-text w-full" value="0">
            </div>
        </div>
     `;
}

function handleCreateLayanan() {
    currentLayananId = null;
    buildDynamicForm(getLayananFormConfig());
    openFormModal('Tambah Layanan Baru', handleFormSubmit);
}

async function handleEditLayanan(id) {
    currentLayananId = id;
    try {
        const res = await callAppsScriptAPI('getRecordById', { dataSheetName: 'Data Layanan', id });
        buildDynamicForm(getLayananFormConfig());
        populateForm(res.response.record);
        openFormModal('Edit Data Layanan', handleFormSubmit);
    } catch (e) {
        showToast('error', `Gagal mengambil data: ${e.message}`);
    }
}

function handleDeleteLayanan(id) {
    swal({
        title: "Anda yakin?",
        text: `Data layanan akan dihapus permanen.`,
        icon: "warning",
        buttons: ["Batal", "Ya, Hapus!"],
        dangerMode: true,
    }).then(async (willDelete) => {
        if (willDelete) {
            try {
                await callAppsScriptAPI('deleteRow', { dataSheetName: 'Data Layanan', id: id });
                showToast('success', 'Data berhasil dihapus.');
                // Refresh list
                const layananRes = await callAppsScriptAPI('getLayananList', {});
                allLayanan = layananRes.response.objects || [];
                renderFilteredLayanan();
            } catch (err) {
                showToast('error', err.message);
            }
        }
    });
}

function handleDuplicateLayanan(id, name) {
    swal({
        text: `Masukkan nama baru untuk duplikat dari "${name}":`,
        content: "input",
        button: { text: "Duplikat", closeModal: false },
    }).then(async newName => {
        if (!newName) throw null;
        await callAppsScriptAPI('duplicateLayanan', { id: id, newName: newName });
        swal.stopLoading();
        swal.close();
        showToast('success', 'Layanan berhasil diduplikasi.');
        // Refresh list
        const layananRes = await callAppsScriptAPI('getLayananList', {});
        allLayanan = layananRes.response.objects || [];
        renderFilteredLayanan();
    }).catch(err => {
        if (err) {
            swal.stopLoading();
            showToast('error', `Gagal menduplikasi: ${err.message}`);
        } else {
            swal.close();
        }
    });
}

async function handleFormSubmit() {
    const form = document.getElementById('dynamic-form');
    const formData = {};
    new FormData(form).forEach((value, key) => { formData[key] = value; });
    
    if (!formData.nama_layanan || !formData.id_kategori || !formData.satuan || !formData.harga) {
        return showToast('error', 'Harap isi semua kolom yang wajib diisi.');
    }

    try {
        await callAppsScriptAPI('submitLayanan', { formData, id: currentLayananId });
        showToast('success', 'Data layanan berhasil disimpan.');
        hideFormModal();
        // Refresh list
        const layananRes = await callAppsScriptAPI('getLayananList', {});
        allLayanan = layananRes.response.objects || [];
        renderFilteredLayanan();
    } catch (err) {
        showToast('error', err.message);
    }
}

// --- FUNGSI INISIALISASI ---
export async function initializeLayananPage(user) {
    currentUser = user;
    await loadAndRenderPage();
}
