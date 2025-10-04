/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN KECEPATAN LAYANAN (OWNER ONLY)
 */
import { callAppsScriptAPI } from './api.js';
import { showToast } from './ui.js';
import { openFormModal, hideFormModal, buildDynamicForm, populateForm } from './modals.js';

let currentUser = null;
let currentKecepatanId = null;

function renderKecepatanList(objects) {
    const container = document.getElementById('kecepatan-list-container');
    if (!container) return;
    if (objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center">Belum ada data kecepatan layanan.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${objects.map(item => `
                <div class="bg-white p-4 rounded-lg shadow">
                    <div class="flex justify-between items-start">
                        <div>
                            <h5 class="font-bold text-gray-800">${item.nama_kecepatan}</h5>
                            <p class="text-sm text-blue-600">Biaya Tambahan: ${item.tambahan_harga_persen}%</p>
                            <p class="text-xs text-gray-500">Pengurang Waktu: ${item.pengurang_jam_proses} jam</p>
                        </div>
                        <div class="flex flex-col space-y-2">
                            <button class="btn-action-primary btn-edit-kecepatan" data-id="${item.id_kecepatan}">Edit</button>
                            <button class="btn-action-danger btn-delete-kecepatan" data-id="${item.id_kecepatan}">Hapus</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>`;
    
    document.querySelectorAll('.btn-edit-kecepatan').forEach(b => b.addEventListener('click', (e) => handleEditKecepatan(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-delete-kecepatan').forEach(b => b.addEventListener('click', (e) => handleDeleteKecepatan(e.currentTarget.dataset.id)));
}

async function loadAndRenderList() {
    try {
        const res = await callAppsScriptAPI('getASRead', { dataSheetName: 'Data Kecepatan Layanan' });
        renderKecepatanList(res.response.objects);
    } catch (e) {
        showToast('error', `Gagal memuat data: ${e.message}`);
    }
}

function getKecepatanFormConfig() {
    return [
        { name: 'nama_kecepatan', label: 'Nama Kecepatan', type: 'text', required: true, placeholder: 'cth: Express, Kilat' },
        { name: 'tambahan_harga_persen', label: 'Biaya Tambahan (%)', type: 'number', required: true, value: 0 },
        { name: 'pengurang_jam_proses', label: 'Pengurangan Waktu Proses (Jam)', type: 'number', required: true, value: 0 },
    ];
}

function handleCreateKecepatan() {
    currentKecepatanId = null;
    buildDynamicForm(getKecepatanFormConfig());
    openFormModal('Tambah Kecepatan Layanan', handleFormSubmit);
}

async function handleEditKecepatan(id) {
    currentKecepatanId = id;
    try {
        const res = await callAppsScriptAPI('getRecordById', { dataSheetName: 'Data Kecepatan Layanan', id });
        buildDynamicForm(getKecepatanFormConfig());
        populateForm(res.response.record);
        openFormModal('Edit Kecepatan Layanan', handleFormSubmit);
    } catch (e) {
        showToast('error', `Gagal mengambil data: ${e.message}`);
    }
}

function handleDeleteKecepatan(id) {
    swal({
        title: "Anda yakin?",
        text: `Data ini akan dihapus permanen.`,
        icon: "warning",
        buttons: ["Batal", "Ya, Hapus!"],
        dangerMode: true,
    }).then(async (willDelete) => {
        if (willDelete) {
            try {
                await callAppsScriptAPI('deleteRow', { dataSheetName: 'Data Kecepatan Layanan', id: id });
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

    if (!formData.nama_kecepatan) {
        return showToast('error', 'Nama Kecepatan wajib diisi.');
    }
    
    try {
        const res = await callAppsScriptAPI('submitKecepatan', { formData, id: currentKecepatanId });
        showToast('success', res.response.message);
        hideFormModal();
        loadAndRenderList();
    } catch (err) {
        showToast('error', err.message);
    }
}

export async function initializeKecepatanPage(user) {
    currentUser = user;
    const content = document.getElementById('page-content-container');
    content.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-800">Manajemen Kecepatan</h2>
            <button id="btn-tambah-kecepatan" class="btn-primary">Tambah</button>
        </div>
        <div id="kecepatan-list-container"></div>
    `;
    
    document.getElementById('btn-tambah-kecepatan').addEventListener('click', handleCreateKecepatan);
    loadAndRenderList();
}

