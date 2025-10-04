/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN DATA KONSUMEN (OWNER ONLY)
 */
import { callAppsScriptAPI } from './api.js';
import { showToast } from './ui.js';
import { openFormModal, hideFormModal, buildDynamicForm, populateForm } from './modals.js';

let currentUser = null;
let currentKonsumenId = null;

function renderKonsumenList(objects) {
    const container = document.getElementById('konsumen-list-container');
    if (!container) return;
    if (objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center">Belum ada data konsumen.</div>`;
        return;
    }

    container.innerHTML = objects.map(item => {
        const isB2B = item.tipe_konsumen === 'B2B';
        const badge = isB2B ? `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">B2B</span>` : `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Perorangan</span>`;

        return `
        <div class="bg-white p-4 rounded-lg shadow">
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-2">
                        <h5 class="font-bold text-gray-800">${item.nama_konsumen}</h5>
                        ${badge}
                    </div>
                    ${isB2B ? `<p class="text-sm font-semibold text-gray-600">${item.nama_perusahaan || ''}</p>` : ''}
                    <p class="text-sm text-gray-600">${item.no_telpon || 'No. telp tidak ada'}</p>
                    <p class="text-xs text-gray-500">${item.alamat || 'Alamat tidak ada'}</p>
                </div>
                <div class="flex flex-col space-y-2">
                    <button class="btn-action-primary btn-edit-konsumen" data-id="${item.id_konsumen}">Edit</button>
                    <button class="btn-action-danger btn-delete-konsumen" data-id="${item.id_konsumen}">Hapus</button>
                </div>
            </div>
        </div>
    `}).join('');
    
    document.querySelectorAll('.btn-edit-konsumen').forEach(b => b.addEventListener('click', (e) => handleEditKonsumen(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-delete-konsumen').forEach(b => b.addEventListener('click', (e) => handleDeleteKonsumen(e.currentTarget.dataset.id)));
}

async function loadAndRenderList() {
    try {
        const res = await callAppsScriptAPI('getASRead', { dataSheetName: 'Data Konsumen' });
        renderKonsumenList(res.response.objects);
    } catch (e) {
        showToast('error', `Gagal memuat data konsumen: ${e.message}`);
    }
}

function getKonsumenFormConfig(isEdit = false) {
    const formHtml = `
        <div class="space-y-4">
            <div>
                <label class="font-semibold">Tipe Konsumen</label>
                <select id="tipe_konsumen" name="tipe_konsumen" class="input-text w-full mt-1">
                    <option value="B2C">Perorangan</option>
                    <option value="B2B">Bisnis (B2B)</option>
                </select>
            </div>
            <div id="nama_perusahaan_container" class="hidden">
                <label class="font-semibold">Nama Perusahaan/Hotel/Kost</label>
                <input type="text" id="nama_perusahaan" name="nama_perusahaan" class="input-text w-full mt-1">
            </div>
            <div><label class="font-semibold">Nama Kontak/PIC</label><input type="text" name="nama_konsumen" class="input-text w-full mt-1" required></div>
            <div><label class="font-semibold">No. Telpon</label><input type="text" name="no_telpon" class="input-text w-full mt-1" required></div>
            <div><label class="font-semibold">Password Login (untuk B2B)</label><input type="text" name="password" class="input-text w-full mt-1" placeholder="${isEdit ? '(Biarkan kosong jika tidak berubah)' : ''}"></div>
            <div><label class="font-semibold">Alamat</label><textarea name="alamat" class="input-text w-full mt-1" rows="2"></textarea></div>
            <div><label class="font-semibold">Link Peta</label><input type="text" name="peta_lokasi" class="input-text w-full mt-1"></div>
            <div><label class="font-semibold">Catatan</label><textarea name="catatan" class="input-text w-full mt-1" rows="2"></textarea></div>
        </div>
    `;
    return formHtml;
}

function setupFormLogic() {
    const tipeSelect = document.getElementById('tipe_konsumen');
    const perusahaanContainer = document.getElementById('nama_perusahaan_container');
    
    function togglePerusahaanField() {
        perusahaanContainer.classList.toggle('hidden', tipeSelect.value !== 'B2B');
    }

    tipeSelect.addEventListener('change', togglePerusahaanField);
    togglePerusahaanField(); // Initial check
}

function handleCreateKonsumen() {
    currentKonsumenId = null;
    buildDynamicForm(getKonsumenFormConfig(false));
    setupFormLogic();
    openFormModal('Tambah Konsumen Baru', handleFormSubmit);
}

async function handleEditKonsumen(id) {
    currentKonsumenId = id;
    try {
        const res = await callAppsScriptAPI('getRecordById', { dataSheetName: 'Data Konsumen', id });
        buildDynamicForm(getKonsumenFormConfig(true));
        populateForm(res.response.record);
        setupFormLogic();
        openFormModal('Edit Data Konsumen', handleFormSubmit);
    } catch (e) {
        showToast('error', `Gagal mengambil data: ${e.message}`);
    }
}

function handleDeleteKonsumen(id) {
    swal({
        title: "Anda yakin?",
        text: `Data konsumen ini akan dihapus permanen.`,
        icon: "warning",
        buttons: ["Batal", "Ya, Hapus!"],
        dangerMode: true,
    }).then(async (willDelete) => {
        if (willDelete) {
            try {
                await callAppsScriptAPI('deleteRow', { dataSheetName: 'Data Konsumen', id });
                showToast('success', 'Data berhasil dihapus.');
                loadAndRenderList();
            } catch (err) {
                showToast('error', err.message);
            }
        }
    });
}

async function handleFormSubmit() {
    const form = document.getElementById('dynamic-form');
    const formData = {};
    new FormData(form).forEach((value, key) => { formData[key] = value; });
    
    try {
        await callAppsScriptAPI('submitKonsumenAdmin', { formData, id: currentKonsumenId });
        showToast('success', 'Data konsumen berhasil disimpan.');
        hideFormModal();
        loadAndRenderList();
    } catch (err) {
        showToast('error', err.message);
    }
}

export async function initializeKonsumenPage(user) {
    currentUser = user;
    const content = document.getElementById('page-content-container');
    content.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-800">Manajemen Konsumen</h2>
            <button id="btn-tambah-konsumen" class="btn-primary">Tambah Konsumen</button>
        </div>
        <div id="konsumen-list-container" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    `;
    
    document.getElementById('btn-tambah-konsumen').addEventListener('click', handleCreateKonsumen);
    loadAndRenderList();
}