import { callAppsScriptAPI } from './api.js';
import { showToast } from './ui.js';
import { openFormModal, hideFormModal, buildDynamicForm, populateForm } from './modals.js';

let currentShiftId = null;

function renderShiftList(objects) {
    const container = document.getElementById('shift-list-container');
    if (!objects || objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center">Belum ada data shift.</div>`;
        return;
    }
    container.innerHTML = objects.map(shift => `
        <div class="bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <div>
                <h5 class="font-bold text-lg text-gray-800">${shift.nama_shift}</h5>
                <p class="text-sm text-gray-600">Jam Kerja: ${shift.jam_masuk} - ${shift.jam_pulang}</p>
            </div>
            <div class="flex space-x-2">
                <button class="btn-action-primary btn-edit-shift" data-id="${shift.id_shift}">Edit</button>
                <button class="btn-action-danger btn-delete-shift" data-id="${shift.id_shift}">Hapus</button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.btn-edit-shift').forEach(b => b.addEventListener('click', (e) => handleEditShift(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-delete-shift').forEach(b => b.addEventListener('click', (e) => handleDeleteShift(e.currentTarget.dataset.id)));
}

async function loadAndRenderList() {
    try {
        const res = await callAppsScriptAPI('getShiftList', {});
        renderShiftList(res.response.objects);
    } catch (e) {
        showToast('error', `Gagal memuat data shift: ${e.message}`);
    }
}

function getShiftFormConfig() {
    return [
        { name: 'nama_shift', label: 'Nama Shift', type: 'text', required: true, placeholder: 'cth: Shift Pagi' },
        { name: 'jam_masuk', label: 'Jam Masuk', type: 'time', required: true },
        { name: 'jam_pulang', label: 'Jam Pulang', type: 'time', required: true },
    ];
}

function handleCreateShift() {
    currentShiftId = null;
    buildDynamicForm(getShiftFormConfig());
    openFormModal('Tambah Shift Baru', handleFormSubmit);
}

async function handleEditShift(id) {
    currentShiftId = id;
    try {
        const res = await callAppsScriptAPI('getShiftById', { id });
        buildDynamicForm(getShiftFormConfig());
        populateForm(res.response.record);
        openFormModal('Edit Data Shift', handleFormSubmit);
    } catch (e) {
        showToast('error', `Gagal mengambil data: ${e.message}`);
    }
}

function handleDeleteShift(id) {
    swal({
        title: "Anda yakin?",
        text: "Shift ini akan dihapus permanen.",
        icon: "warning",
        buttons: ["Batal", "Ya, Hapus!"],
        dangerMode: true,
    }).then(async (willDelete) => {
        if (willDelete) {
            try {
                await callAppsScriptAPI('deleteShift', { id });
                showToast('success', 'Shift berhasil dihapus.');
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

    if (!formData.nama_shift || !formData.jam_masuk || !formData.jam_pulang) {
        return showToast('error', 'Semua field wajib diisi.');
    }
    try {
        await callAppsScriptAPI('submitShift', { formData, id: currentShiftId });
        showToast('success', 'Data shift berhasil disimpan.');
        hideFormModal();
        loadAndRenderList();
    } catch (err) {
        showToast('error', err.message);
    }
}

export async function initializeShiftPage(user) {
    document.getElementById('btn-tambah-shift').addEventListener('click', handleCreateShift);
    loadAndRenderList();
}