/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN DATA OUTLET (OWNER ONLY)
 */
import { callAppsScriptAPI } from './api.js';
import { showToast, waitForElements } from './ui.js';
import { openFormModal, hideFormModal, buildDynamicForm, populateForm } from './modals.js';

let currentUser = null;
let allOutletObjects = [];
let currentOutletId = null;

function renderOutletList(objects) {
    const container = document.getElementById('outlet-list-container');
    if (!container) return;
    
    // Fallback jika objects tidak valid
    if (!objects || objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center">Belum ada data outlet.</div>`;
        return;
    }

    container.innerHTML = objects.map(outlet => {
        return `
            <div class="bg-white p-4 rounded-lg shadow">
                <div class="flex justify-between items-start">
                    <div>
                        <h5 class="font-bold text-lg text-gray-800">${outlet.nama_outlet || '...'}</h5>
                        <p class="text-sm text-gray-500">ID Outlet: ${outlet.id_outlet}</p>
                        <p class="text-sm text-gray-500">Telpon: ${outlet.telpon_outlet || '-'}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="btn-action-primary btn-edit-outlet" data-id="${outlet.id_outlet}">Edit</button>
                        <button class="btn-action-danger btn-delete-outlet" data-id="${outlet.id_outlet}">Hapus</button>
                    </div>
                </div>
                <p class="text-sm text-gray-700 mt-2"><strong>Alamat:</strong> ${outlet.alamat_outlet || '-'}</p>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.btn-edit-outlet').forEach(b => b.addEventListener('click', (e) => handleEditOutlet(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-delete-outlet').forEach(b => b.addEventListener('click', (e) => handleDeleteOutlet(e.currentTarget.dataset.id)));
}

async function loadAndRenderList() {
    try {
        // PERBAIKAN: Menggunakan aksi generik yang sudah terbukti
        const res = await callAppsScriptAPI('getASRead', { dataSheetName: 'Data Outlet' });
        // PERBAIKAN: Memastikan kita membaca dari res.response.objects
        allOutletObjects = res.response.objects || [];
        renderOutletList(allOutletObjects);
    } catch (e) {
        showToast('error', `Gagal memuat data outlet: ${e.message}`);
        console.error("Error di loadAndRenderList (outlet.js):", e);
    }
}

function getOutletFormConfig() {
    return [
        { name: 'nama_outlet', label: 'Nama Outlet', required: true },
        { name: 'alamat_outlet', label: 'Alamat', type: 'textarea' },
        { name: 'telpon_outlet', label: 'No. Telpon', type: 'text', placeholder: 'cth: 08123456789' },
    ];
}

function handleCreateOutlet() {
    currentOutletId = null;
    buildDynamicForm(getOutletFormConfig());
    openFormModal('Tambah Outlet Baru', handleFormSubmit);
}

async function handleEditOutlet(id) {
    currentOutletId = id;
    try {
        const res = await callAppsScriptAPI('getRecordById', { dataSheetName: 'Data Outlet', id });
        if (!res.response.record) {
            showToast('error', 'Data outlet tidak ditemukan.');
            return;
        }
        buildDynamicForm(getOutletFormConfig());
        populateForm(res.response.record);
        openFormModal('Edit Data Outlet', handleFormSubmit);
    } catch (e) {
        showToast('error', `Gagal mengambil data: ${e.message}`);
    }
}

function handleDeleteOutlet(id) {
    swal({
        title: "Anda yakin?",
        text: `Data outlet akan dihapus permanen.`,
        icon: "warning",
        buttons: ["Batal", "Ya, Hapus!"],
        dangerMode: true,
    }).then(async (willDelete) => {
        if (willDelete) {
            try {
                await callAppsScriptAPI('deleteRow', { dataSheetName: 'Data Outlet', id: id });
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

    if (!formData.nama_outlet) {
        showToast('error', 'Nama outlet wajib diisi.');
        return;
    }

    try {
        // PERBAIKAN: Menggunakan aksi yang lebih konsisten
        await callAppsScriptAPI('submitOutlet', { formData, id: currentOutletId });
        showToast('success', 'Data outlet berhasil disimpan.');
        hideFormModal();
        loadAndRenderList();
    } catch (err) {
        showToast('error', err.message);
    }
}

export async function initializeOutletPage(user) {
    currentUser = user;
    try {
        const [dynamicButton] = await waitForElements(['dynamic-button']);
        dynamicButton.innerHTML = `<button id="btn-tambah-outlet" class="btn-primary">Tambah</button>`;
        dynamicButton.querySelector('#btn-tambah-outlet').addEventListener('click', handleCreateOutlet);
        loadAndRenderList();
    } catch (err) {
        console.error("Gagal inisialisasi halaman outlet:", err);
    }
}
