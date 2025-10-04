import { callAppsScriptAPI } from './api.js';
import { showToast } from './ui.js';

function renderList(objects) {
    const container = document.getElementById('verifikasi-list-container');
    if (!objects || objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center text-gray-500">Tidak ada pendaftar baru yang menunggu persetujuan.</div>`;
        return;
    }
    container.innerHTML = objects.map(user => `
        <div class="bg-white p-4 rounded-lg shadow">
            <div class="flex justify-between items-start">
                <div>
                    <h5 class="font-bold text-lg text-gray-800">${user.nama_lengkap}</h5>
                    <p class="text-sm font-semibold text-blue-600">${user.nama_perusahaan || 'Perusahaan tidak diisi'}</p>
                    <p class="text-sm text-gray-600">${user.jabatan || 'Jabatan tidak diisi'}</p>
                    <p class="text-sm text-gray-500">${user.no_telpon}</p>
                </div>
                <div class="flex flex-col space-y-2">
                    <button class="btn-action-success btn-approve" data-id="${user.id_pengguna}">Setujui</button>
                    <button class="btn-action-danger btn-reject" data-id="${user.id_pengguna}">Tolak</button>
                </div>
            </div>
            <p class="text-xs text-gray-400 mt-2 border-t pt-2">Mendaftar pada: ${new Date(user.terdaftar_pada).toLocaleString('id-ID')}</p>
        </div>
    `).join('');

    document.querySelectorAll('.btn-approve').forEach(b => b.addEventListener('click', e => handleAction('approve', e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-reject').forEach(b => b.addEventListener('click', e => handleAction('reject', e.currentTarget.dataset.id)));
}

async function handleAction(action, id) {
    const actionText = action === 'approve' ? 'menyetujui' : 'menolak';
    const confirmed = await swal({
        title: `Anda yakin ingin ${actionText} pengguna ini?`,
        icon: "warning",
        buttons: ["Batal", "Ya, Lanjutkan"],
    });
    if (confirmed) {
        try {
            const apiAction = action === 'approve' ? 'approveB2BUser' : 'rejectB2BUser';
            await callAppsScriptAPI(apiAction, { id });
            showToast('success', `Pengguna berhasil di-${actionText}.`);
            loadAndRenderList();
        } catch (e) {
            showToast('error', e.message);
        }
    }
}

async function loadAndRenderList() {
    try {
        const res = await callAppsScriptAPI('getPendingB2BList', {});
        renderList(res.response.objects);
    } catch (e) {
        showToast('error', `Gagal memuat daftar: ${e.message}`);
    }
}

export function initializeVerifikasiB2BPage(user) {
    loadAndRenderList();
}