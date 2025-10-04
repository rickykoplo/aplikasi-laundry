/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN MANAJEMEN PROSES KERJA
 */
import { callAppsScriptAPI } from './api.js';
import { showToast, waitForElements } from './ui.js';
import { openFormModal, hideFormModal, buildDynamicForm, populateForm } from './modals.js';

let allProcesses = [];
let currentProcessId = null;

function renderProsesList(objects) {
    const container = document.getElementById('proses-kerja-list-container');
    if (!container) return;

    if (objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center">Belum ada data proses.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${objects.map(item => `
                <div class="bg-white p-4 rounded-lg shadow">
                    <div class="flex justify-between items-center">
                        <div>
                            <h5 class="font-bold text-gray-800">${item.nama_proses}</h5>
                            <p class="text-sm text-gray-500">Urutan: ${item.urutan}</p>
                        </div>
                        <div class="flex space-x-2">
                            <button class="btn-action-primary btn-edit-proses" data-id="${item.id}">Edit</button>
                            <button class="btn-action-danger btn-delete-proses" data-id="${item.id}">Hapus</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    document.querySelectorAll('.btn-edit-proses').forEach(b => b.addEventListener('click', (e) => handleEditProses(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-delete-proses').forEach(b => b.addEventListener('click', (e) => handleDeleteProses(e.currentTarget.dataset.id)));
}

async function loadAndRenderList() {
    try {
        const res = await callAppsScriptAPI('getProsesKerjaList', {});
        allProcesses = res.response.objects;
        renderProsesList(allProcesses);
    } catch (e) {
        showToast('error', `Gagal memuat data proses: ${e.message}`);
    }
}

function getProsesFormConfig() {
    return [
        { name: 'nama_proses', label: 'Nama Proses', type: 'text', required: true },
        { name: 'urutan', label: 'Urutan', type: 'number', required: true, value: 0 },
    ];
}

function handleCreateProses() {
    currentProcessId = null;
    buildDynamicForm(getProsesFormConfig());
    openFormModal('Tambah Proses Baru', handleFormSubmit);
}

async function handleEditProses(id) {
    currentProcessId = id;
    try {
        const res = await callAppsScriptAPI('getProsesKerjaById', { id: id });
        buildDynamicForm(getProsesFormConfig());
        populateForm(res.response.record);
        openFormModal('Edit Proses', handleFormSubmit);
    } catch (e) {
        showToast('error', `Gagal mengambil data: ${e.message}`);
    }
}

function handleDeleteProses(id) {
    swal({
        title: "Anda yakin?",
        text: `Data ini akan dihapus permanen.`,
        icon: "warning",
        buttons: ["Batal", "Ya, Hapus!"],
        dangerMode: true,
    }).then(async (willDelete) => {
        if (willDelete) {
            try {
                await callAppsScriptAPI('deleteProsesKerja', { id: id });
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

    if (!formData.nama_proses) {
        return showToast('error', 'Nama Proses wajib diisi.');
    }
    
    try {
        await callAppsScriptAPI('submitProsesKerja', { formData, id: currentProcessId });
        showToast('success', 'Data proses berhasil disimpan.');
        hideFormModal();
        loadAndRenderList();
    } catch (err) {
        showToast('error', err.message);
    }
}

export async function initializeProsesKerjaPage(user) {
    document.getElementById('btn-tambah-proses').addEventListener('click', handleCreateProses);
    loadAndRenderList();
}
