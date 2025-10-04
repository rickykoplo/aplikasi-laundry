import { callAppsScriptAPI } from './api.js';
import { showToast, waitForElements, showLoading, hideLoading } from './ui.js';
import { openFormModal, hideFormModal, buildDynamicForm, populateForm } from './modals.js';
import { compressImage } from './image-compressor.js';

let currentUser = null;
let currentKaryawanId = null;
let masterData = { outlets: [], shifts: [] }; // Menyimpan data outlet & shift
let newPhoto = null;

function renderKaryawanList(objects) {
    const container = document.getElementById('karyawan-list-container');
    if (!container) return;
    if (!objects || objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center">Belum ada data.</div>`;
        return;
    }
    container.innerHTML = objects.map(karyawan => {
        const id = karyawan.id_karyawan;
        const roleBadge = karyawan.role?.toLowerCase() === 'owner' ? `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Owner</span>` : `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">Employee</span>`;
        const statusBadge = karyawan.status_karyawan === 'Aktif' ? `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Aktif</span>` : `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Resign</span>`;
        const photoUrl = karyawan.foto_profil || "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a0aec0'%3e%3cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3e%3c/svg%3e";

        // Cari nama shift berdasarkan id_shift
        const shift = masterData.shifts.find(s => s.id_shift == karyawan.id_shift);
        const shiftName = shift ? shift.nama_shift : 'Belum Diatur';

        return `
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <div class="karyawan-header p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                    <div class="flex items-center">
                        <img src="${photoUrl}" alt="Foto Profil" class="w-12 h-12 rounded-full object-cover mr-4 bg-gray-200">
                        <div>
                            <h5 class="font-bold text-lg text-gray-800">${karyawan.nama_lengkap || '...'}</h5>
                            <p class="text-sm text-gray-500">ID: ${id}</p>
                            <div class="flex gap-2 mt-1">${roleBadge} ${statusBadge}</div>
                        </div>
                    </div>
                    <i class="fas fa-chevron-down text-gray-400 transition-transform"></i>
                </div>
                <div class="karyawan-details hidden p-4 border-t border-gray-200 bg-gray-50">
                    <ul class="text-sm text-gray-700 space-y-2">
                        <li><strong>Telepon:</strong> ${karyawan.no_telp || '-'}</li>
                        <li><strong>Alamat:</strong> ${karyawan.alamat || '-'}</li>
                        <li><strong>Outlet:</strong> ${masterData.outlets.find(o => o.id_outlet == karyawan.id_outlet)?.nama_outlet || '-'}</li>
                        <li><strong>Shift Kerja:</strong> ${shiftName}</li>
                        <li><strong>Hari Libur:</strong> ${karyawan.hari_libur || '-'}</li>
                    </ul>
                    <div class="flex space-x-3 mt-4 pt-3 border-t">
                         <button class="btn-edit-karyawan flex-1 text-sm py-2 px-3 bg-blue-500 text-white rounded-md hover:bg-blue-600" data-id="${id}"><i class="fas fa-edit mr-2"></i>Edit</button>
                         <button class="btn-delete-karyawan flex-1 text-sm py-2 px-3 bg-red-500 text-white rounded-md hover:bg-red-600" data-id="${id}"><i class="fas fa-trash mr-2"></i>Hapus</button>
                    </div>
                </div>
            </div>`;
    }).join('');
    
    // Pasang listener
    document.querySelectorAll('.karyawan-header').forEach(header => {
        header.addEventListener('click', () => {
            header.nextElementSibling.classList.toggle('hidden');
            header.querySelector('i.fa-chevron-down').classList.toggle('rotate-180');
        });
    });

    document.querySelectorAll('.btn-edit-karyawan, .btn-delete-karyawan').forEach(b => {
        b.addEventListener('click', (e) => e.stopPropagation());
    });
    document.querySelectorAll('.btn-edit-karyawan').forEach(b => b.addEventListener('click', (e) => handleEditKaryawan(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-delete-karyawan').forEach(b => b.addEventListener('click', (e) => handleDeleteKaryawan(e.currentTarget.dataset.id)));
}

async function loadAndRenderList() {
    try {
        const res = await callAppsScriptAPI('getASRead', { dataSheetName: 'Data Karyawan'});
        renderKaryawanList(res.response.objects);
    } catch (e) {
        showToast('error', `Gagal memuat data karyawan: ${e.message}`);
    }
}

// PERBAIKAN: Fungsi untuk membuat konfigurasi form yang lengkap
function getKaryawanFormConfig(isEdit = false) {
    // --- PERBAIKAN DI SINI: Deklarasi shiftOptions ditambahkan ---
    const outletOptions = masterData.outlets.map(o => ({ value: o.id_outlet, text: o.nama_outlet }));
    const shiftOptions = masterData.shifts.map(s => ({ value: s.id_shift, text: s.nama_shift }));
    
    return [
        // --- INFORMASI UTAMA ---
        { name: 'id_karyawan', label: 'ID Karyawan', type: 'text', required: true, readonly: isEdit },
        { name: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', required: true },
        { name: 'password', label: isEdit ? 'Password Baru (biarkan kosong jika tidak berubah)' : 'Password', type: 'text', required: !isEdit },
        { name: 'foto_profil_input', label: 'Foto Profil', type: 'customHtml', html: `
            <div>
                <label for="foto_profil_input" class="block text-sm font-medium text-gray-700 mb-1">Foto Profil</label>
                <input type="file" id="foto_profil_input" name="foto_profil_input" class="input-text w-full" accept="image/*">
                <div id="image-preview-container" class="mt-2"></div>
            </div>
        `},
        { name: 'no_telp', label: 'No. Telepon', type: 'text' },
        { name: 'alamat', label: 'Alamat', type: 'textarea' },
        
        // --- INFORMASI PEKERJAAN ---
        { name: 'job_info_divider', type: 'customHtml', html: `<h4 class="font-semibold text-gray-800 border-t pt-4 mt-4">Informasi Pekerjaan</h4>` },
        { name: 'id_outlet', label: 'Outlet', type: 'dropdown', options: outletOptions, placeholder: 'Pilih Outlet', required: true },
        { name: 'id_shift', label: 'Shift Kerja', type: 'dropdown', options: shiftOptions, placeholder: 'Belum Diatur' },
        { name: 'role', label: 'Role', type: 'dropdown', options: ['employee', 'owner'], required: true },
        { name: 'status_karyawan', label: 'Status Karyawan', type: 'dropdown', options: ['Aktif', 'Resign'], required: true },
        { name: 'tanggal_masuk', label: 'Tanggal Masuk', type: 'date' },
        { name: 'hari_libur', label: 'Hari Libur Tetap (jika ada)', type: 'text' },

        // --- INFORMASI GAJI (Dikelompokkan) ---
        { name: 'gaji_divider', type: 'customHtml', html: `
            <details class="mt-4 border rounded-lg p-3">
                <summary class="font-semibold text-gray-800 cursor-pointer">Detail Gaji & Tunjangan</summary>
                <div class="mt-4 space-y-4 border-t pt-4">
                    <div>
                        <label for="tipe_gaji" class="block text-sm font-medium text-gray-700 mb-1">Tipe Gaji</label>
                        <select name="tipe_gaji" id="tipe_gaji" class="input-text w-full">
                            <option value="">Pilih Tipe</option>
                            <option value="Bulanan">Bulanan</option>
                            <option value="Harian">Harian</option>
                        </select>
                    </div>
                    <div>
                        <label for="gaji_pokok" class="block text-sm font-medium text-gray-700 mb-1">Gaji Pokok (Rp)</label>
                        <input type="number" name="gaji_pokok" id="gaji_pokok" class="input-text w-full" value="0">
                    </div>
                    <div>
                        <label for="uang_makan" class="block text-sm font-medium text-gray-700 mb-1">Uang Makan (Rp)</label>
                        <input type="number" name="uang_makan" id="uang_makan" class="input-text w-full" value="0">
                    </div>
                    <div>
                        <label for="uang_kerajinan" class="block text-sm font-medium text-gray-700 mb-1">Uang Kerajinan (Rp)</label>
                        <input type="number" name="uang_kerajinan" id="uang_kerajinan" class="input-text w-full" value="0">
                    </div>
                    <div>
                        <label for="uang_transport" class="block text-sm font-medium text-gray-700 mb-1">Uang Transport (Rp)</label>
                        <input type="number" name="uang_transport" id="uang_transport" class="input-text w-full" value="0">
                    </div>
                </div>
            </details>
        `},

        // --- INFORMASI BANK (Dikelompokkan) ---
        { name: 'bank_divider', type: 'customHtml', html: `
            <details class="mt-4 border rounded-lg p-3">
                <summary class="font-semibold text-gray-800 cursor-pointer">Informasi Bank</summary>
                <div class="mt-4 space-y-4 border-t pt-4">
                    <div>
                        <label for="nama_bank" class="block text-sm font-medium text-gray-700 mb-1">Nama Bank</label>
                        <input type="text" name="nama_bank" id="nama_bank" class="input-text w-full">
                    </div>
                    <div>
                        <label for="no_rekening" class="block text-sm font-medium text-gray-700 mb-1">No. Rekening</label>
                        <input type="text" name="no_rekening" id="no_rekening" class="input-text w-full">
                    </div>
                </div>
            </details>
        `},
        { name: 'foto_profil', type: 'hidden' } // Hidden field untuk menyimpan URL foto lama
    ];
}

function handleCreateKaryawan() {
    currentKaryawanId = null;
    newPhoto = null;
    buildDynamicForm(getKaryawanFormConfig(false));
    openFormModal('Tambah Karyawan Baru', handleFormSubmit);
    document.getElementById('foto_profil_input').addEventListener('change', handleFileSelect);
}

async function handleEditKaryawan(id) {
    currentKaryawanId = id;
    newPhoto = null;
    try {
        const res = await callAppsScriptAPI('getRecordById', { dataSheetName: 'Data Karyawan', id });
        buildDynamicForm(getKaryawanFormConfig(true));
        populateForm(res.response.record);
        
        // Tampilkan foto yang ada
        const previewContainer = document.getElementById('image-preview-container');
        if (res.response.record.foto_profil) {
            previewContainer.innerHTML = `<img src="${res.response.record.foto_profil}" class="w-24 h-24 rounded-full object-cover">`;
        }

        openFormModal('Edit Data Karyawan', handleFormSubmit);
        document.getElementById('foto_profil_input').addEventListener('change', handleFileSelect);
    } catch (e) {
        showToast('error', `Gagal mengambil data: ${e.message}`);
    }
}

function handleDeleteKaryawan(id) {
    swal({
        title: "Anda yakin?",
        text: `Data karyawan dengan ID "${id}" akan dihapus permanen.`,
        icon: "warning",
        buttons: ["Batal", "Ya, Hapus!"],
        dangerMode: true,
    }).then(async (willDelete) => {
        if (willDelete) {
            try {
                await callAppsScriptAPI('deleteRow', { dataSheetName: 'Data Karyawan', id: id });
                showToast('success', 'Data berhasil dihapus.');
                loadAndRenderList();
            } catch (err) {
                showToast('error', err.message);
            }
        }
    });
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const previewContainer = document.getElementById('image-preview-container');
    previewContainer.innerHTML = 'Mengompres gambar...';
    try {
        newPhoto = await compressImage(file, { maxWidth: 512, quality: 0.8 });
        previewContainer.innerHTML = `<img src="data:image/jpeg;base64,${newPhoto.base64}" class="w-24 h-24 rounded-full object-cover">`;
    } catch (err) {
        showToast('error', 'Gagal memproses gambar.');
        previewContainer.innerHTML = '';
    }
}

async function handleFormSubmit() {
    const form = document.getElementById('dynamic-form');
    const formData = {};
    new FormData(form).forEach((value, key) => { formData[key] = value; });
    
    showLoading();
    try {
        // Proses upload foto jika ada foto baru
        if (newPhoto) {
            const res = await callAppsScriptAPI('uploadImage', {
                base64: newPhoto.base64,
                folderId: formData.id_karyawan, // Menggunakan ID Karyawan sebagai nama file
                type: 'karyawan' // Tipe baru untuk routing di backend
            });
            formData.foto_profil = res.response.url; // Simpan URL baru
        }
        
        // Kirim data form ke backend
        await callAppsScriptAPI('submitKaryawan', { formData, id: currentKaryawanId });
        showToast('success', 'Data karyawan berhasil disimpan.');
        hideFormModal();
        loadAndRenderList();
    } catch (err) {
        showToast('error', err.message);
    } finally {
        hideLoading();
    }
}

export async function initializeKaryawanPage(user) {
    currentUser = user;
    try {
        // Ambil data outlet terlebih dahulu
        const res = await callAppsScriptAPI('getKaryawanOptions', {});
        masterData.outlets = res.response.outlets || [];
		masterData.shifts = res.response.shifts || [];

        const [dynamicButton] = await waitForElements(['dynamic-button']);
        dynamicButton.innerHTML = `<button id="btn-tambah-karyawan" class="btn-primary">Tambah</button>`;
        dynamicButton.querySelector('#btn-tambah-karyawan').addEventListener('click', handleCreateKaryawan);
        
        loadAndRenderList();
    } catch (err) {
        console.error("Gagal inisialisasi halaman karyawan:", err);
        showToast('error', 'Gagal memuat data master.');
    }
}