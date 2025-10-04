import { callAppsScriptAPI } from './api.js';
import { showToast } from './ui.js';
import { openFormModal, hideFormModal, buildDynamicForm, populateForm } from './modals.js';

let allB2BKonsumen = [];
let selectedKonsumenId = null;

function renderLayananList(objects) {
    const container = document.getElementById('layanan-b2b-list-container');
    if (!objects || objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center text-gray-500">Belum ada layanan untuk klien ini.</div>`;
        return;
    }
    container.innerHTML = objects.map(layanan => `
        <div class="bg-white p-4 rounded-lg shadow">
            <div class="flex justify-between items-start">
                <div>
                    <h5 class="font-bold text-gray-800">${layanan.nama_layanan}</h5>
                    <p class="text-2xl font-extrabold text-gray-900 mt-1">
                        Rp ${parseInt(layanan.harga).toLocaleString('id-ID')}
                        <span class="text-sm font-normal text-gray-500">/ ${layanan.satuan}</span>
                    </p>
                </div>
                <div class="flex flex-col space-y-2">
                    <button class="btn-action-primary btn-edit-layanan-b2b" data-id="${layanan.id_layanan_b2b}">Edit</button>
                    <button class="btn-action-danger btn-delete-layanan-b2b" data-id="${layanan.id_layanan_b2b}">Hapus</button>
                </div>
            </div>
            ${layanan.catatan ? `<p class="text-xs text-gray-500 italic mt-2 border-t pt-2">Catatan: ${layanan.catatan}</p>` : ''}
        </div>
    `).join('');

    document.querySelectorAll('.btn-edit-layanan-b2b').forEach(b => b.addEventListener('click', (e) => handleEdit(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-delete-layanan-b2b').forEach(b => b.addEventListener('click', (e) => handleDelete(e.currentTarget.dataset.id)));
}

async function loadAndRenderList() {
    if (!selectedKonsumenId) {
        document.getElementById('layanan-b2b-list-container').innerHTML = '';
        return;
    }
    document.getElementById('btn-tambah-layanan-b2b').disabled = false;
    try {
        const res = await callAppsScriptAPI('getLayananB2BList', { id_konsumen: selectedKonsumenId });
        renderLayananList(res.response.objects);
    } catch (e) {
        showToast('error', `Gagal memuat layanan: ${e.message}`);
    }
}

function getFormConfig() {
    return [
        { name: 'id_konsumen', type: 'hidden', value: selectedKonsumenId },
        { name: 'nama_layanan', label: 'Nama Layanan', type: 'text', required: true, placeholder: 'cth: Seragam Satpam' },
        { name: 'satuan', label: 'Satuan', type: 'text', required: true, placeholder: 'cth: pcs, stel, kg' },
        { name: 'harga', label: 'Harga (Rp)', type: 'number', required: true },
        { name: 'catatan', label: 'Catatan', type: 'textarea', placeholder: '(Opsional)' },
    ];
}

let currentLayananId = null;

function handleCreate() {
    currentLayananId = null;
    buildDynamicForm(getFormConfig());
    openFormModal('Tambah Layanan B2B Baru', handleFormSubmit);
}

async function handleEdit(id) {
    currentLayananId = id;
    try {
        const res = await callAppsScriptAPI('getLayananB2BById', { id });
        buildDynamicForm(getFormConfig());
        populateForm(res.response.record);
        openFormModal('Edit Layanan B2B', handleFormSubmit);
    } catch (e) {
        showToast('error', `Gagal mengambil data: ${e.message}`);
    }
}

function handleDelete(id) {
    swal({
        title: "Anda yakin?", text: "Layanan ini akan dihapus permanen.", icon: "warning",
        buttons: ["Batal", "Ya, Hapus!"], dangerMode: true,
    }).then(async (willDelete) => {
        if (willDelete) {
            try {
                await callAppsScriptAPI('deleteLayananB2B', { id });
                showToast('success', 'Layanan berhasil dihapus.');
                loadAndRenderList();
            } catch (err) { showToast('error', err.message); }
        }
    });
}

async function handleFormSubmit() {
    const form = document.getElementById('dynamic-form');
    const formData = {};
    new FormData(form).forEach((value, key) => { formData[key] = value; });
    try {
        await callAppsScriptAPI('submitLayananB2B', { formData, id: currentLayananId });
        showToast('success', 'Layanan B2B berhasil disimpan.');
        hideFormModal();
        loadAndRenderList();
    } catch (err) {
        showToast('error', err.message);
    }
}

export async function initializeLayananB2BPage(user) {
    document.getElementById('btn-tambah-layanan-b2b').addEventListener('click', handleCreate);
    const konsumenSelect = document.getElementById('konsumen-b2b-select');

    try {
        const res = await callAppsScriptAPI('getKonsumenList', {});
        allB2BKonsumen = res.response.objects.filter(k => k.tipe_konsumen === 'B2B');
        
        konsumenSelect.innerHTML = '<option value="">-- Pilih Klien B2B --</option>';
        allB2BKonsumen.forEach(k => {
            konsumenSelect.innerHTML += `<option value="${k.id_konsumen}">${k.nama_perusahaan || k.nama_konsumen}</option>`;
        });

        konsumenSelect.addEventListener('change', (e) => {
            selectedKonsumenId = e.target.value;
            loadAndRenderList();
        });
    } catch (e) {
        showToast('error', 'Gagal memuat daftar klien B2B.');
    }
}