/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN KATEGORI LAYANAN (OWNER ONLY)
 */
import { callAppsScriptAPI } from './api.js';
import { showToast } from './ui.js';
import { openFormModal, hideFormModal, buildDynamicForm, populateForm } from './modals.js';

let currentUser = null;
let currentKategoriId = null;

function renderKategoriList(objects) {
    const container = document.getElementById('kategori-list-container');
    if (!container) return;
    if (objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center">Belum ada data kategori.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${objects.map(item => `
                <div class="bg-white p-4 rounded-lg shadow">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center">
                           <i class="fas ${item.nama_icon || 'fa-box-open'} text-xl text-gray-400 mr-3"></i>
                           <h5 class="font-bold text-gray-800">${item.nama_kategori}</h5>
                        </div>
                        <div class="flex space-x-2">
                            <button class="btn-action-primary btn-edit-kategori" data-id="${item.id_kategori}">Edit</button>
                            <button class="btn-action-danger btn-delete-kategori" data-id="${item.id_kategori}">Hapus</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>`;
    
    document.querySelectorAll('.btn-edit-kategori').forEach(b => b.addEventListener('click', (e) => handleEditKategori(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-delete-kategori').forEach(b => b.addEventListener('click', (e) => handleDeleteKategori(e.currentTarget.dataset.id)));
}

async function loadAndRenderList() {
    try {
        const res = await callAppsScriptAPI('getASRead', { dataSheetName: 'Data Kategori' });
        renderKategoriList(res.response.objects);
    } catch (e) {
        showToast('error', `Gagal memuat data: ${e.message}`);
    }
}

function getKategoriFormConfig() {
    return [
        { name: 'nama_kategori', label: 'Nama Kategori', type: 'text', required: true, placeholder: 'cth: Pakaian, Sepatu' },
        { name: 'nama_icon', label: 'Nama Ikon Font Awesome', type: 'text', placeholder: 'cth: fa-tshirt, fa-shoe-prints' },
    ];
}

function handleCreateKategori() {
    currentKategoriId = null;
    buildDynamicForm(getKategoriFormConfig());
    openFormModal('Tambah Kategori Baru', handleFormSubmit);
}

async function handleEditKategori(id) {
    currentKategoriId = id;
    try {
        const res = await callAppsScriptAPI('getRecordById', { dataSheetName: 'Data Kategori', id });
        buildDynamicForm(getKategoriFormConfig());
        populateForm(res.response.record);
        openFormModal('Edit Kategori', handleFormSubmit);
    } catch (e) {
        showToast('error', `Gagal mengambil data: ${e.message}`);
    }
}

function handleDeleteKategori(id) {
    swal({
        title: "Anda yakin?",
        text: `Data ini akan dihapus permanen.`,
        icon: "warning",
        buttons: ["Batal", "Ya, Hapus!"],
        dangerMode: true,
    }).then(async (willDelete) => {
        if (willDelete) {
            try {
                await callAppsScriptAPI('deleteRow', { dataSheetName: 'Data Kategori', id: id });
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

    if (!formData.nama_kategori) {
        return showToast('error', 'Nama Kategori wajib diisi.');
    }
    
    try {
        const res = await callAppsScriptAPI('submitKategori', { formData, id: currentKategoriId });
        showToast('success', res.response.message);
        hideFormModal();
        loadAndRenderList();
    } catch (err) {
        showToast('error', err.message);
    }
}

export async function initializeKategoriPage(user) {
    currentUser = user;
    const content = document.getElementById('page-content-container');
    content.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-800">Manajemen Kategori</h2>
            <button id="btn-tambah-kategori" class="btn-primary">Tambah</button>
        </div>
        <div id="kategori-list-container"></div>
    `;
    
    document.getElementById('btn-tambah-kategori').addEventListener('click', handleCreateKategori);
    loadAndRenderList();
}
