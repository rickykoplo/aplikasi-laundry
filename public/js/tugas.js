/**
 * =================================================================
 * FILE FINAL UNTUK: tugas.js (VERSI PERBAIKAN TOTAL)
 * - Tampilan proses per layanan yang bisa di-klik (collapsible)
 * - Status layanan selesai (dicoret & abu-abu)
 * - Perbaikan cache dan sinkronisasi UI
 * =================================================================
 */

import { callAppsScriptAPI } from './api.js';
import { showToast, showLoading, hideLoading } from './ui.js';
import { openFormModal, hideFormModal, buildDynamicForm, populateForm, openKonsumenModal, hideKonsumenModal, handleCreateKonsumen } from './modals.js';
import { compressImage } from './image-compressor.js';

// Variabel Global
let currentUser = null;
let currentDataSheetName = '';
let currentKategoriId = null;
let allTaskObjects = [];
let masterData = { kategori: [] };
let currentAnjemFilter = 'Jemput';
let currentLaundryFilter = 'Aktif';
let currentAnjemId = null;
let newPhotos = [];
let currentAnjemExistingPhotos = [];
let cachedTaskDetails = {};

// --- Helper Functions ---
function formatWaktu(waktu) {
    if (!waktu) return '-';
    try {
        return new Date(waktu).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
    } catch { return waktu; }
}
function ensureObject(data) {
    if (typeof data === 'string') {
        try { return JSON.parse(data || '{}'); } catch (e) { return {}; }
    }
    return data || {};
}
function ensureArray(data) {
    if (typeof data === 'string') {
        try { 
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }
    return Array.isArray(data) ? data : [];
}
function renderAnjemPhotoGallery(title, photosRaw, classNames = 'w-16 h-16') {
    const photos = Array.isArray(photosRaw) ? photosRaw : [];
    if (!photos || photos.length === 0) return '';
    return `<div class="mt-2"><h6 class="text-xs font-bold text-gray-500 uppercase mb-1">${title}</h6><div class="flex flex-wrap gap-2">${photos.map(photo => `<a href="${photo}" target="_blank" onclick="event.stopPropagation()"><img src="${photo}" class="${classNames} object-cover rounded-md cursor-pointer hover:scale-110 transition-transform" alt="Thumbnail"></a>`).join('')}</div></div>`;
}
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// --- Handler Tugas ANJEM (Tidak ada perubahan) ---
function setupAnjemPhotoUploader() {
    const fileInput = document.getElementById('foto_tugas_input');
    const previewContainer = document.getElementById('image-preview-container-tugas');
    if (!fileInput || !previewContainer) return;
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    newFileInput.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files.length) return;
        previewContainer.innerHTML = '<p class="text-sm w-full text-gray-500">Mengompres gambar...</p>';
        newPhotos = [];
        try {
            const compressedImages = await Promise.all(Array.from(files).map(file => compressImage(file)));
            previewContainer.innerHTML = '';
            compressedImages.forEach(imgData => {
                newPhotos.push(imgData);
                const imgElement = document.createElement('img');
                imgElement.src = `data:image/jpeg;base64,${imgData.base64}`;
                imgElement.className = 'w-20 h-20 object-cover rounded';
                previewContainer.appendChild(imgElement);
            });
        } catch (err) {
            previewContainer.innerHTML = '<p class="text-sm text-red-500">Gagal memproses gambar.</p>';
        }
    });
}
function renderAnjemList(tasks) {
    const container = document.getElementById('tugas-list-container');
    if (!container) return;
    if (!tasks || tasks.length === 0) {
        container.innerHTML = `<div class="bg-white p-6 rounded-lg shadow text-center text-gray-500"><i class="fas fa-check-circle text-3xl text-green-500 mb-2"></i><p>Tidak ada tugas di kategori ini.</p></div>`;
        return;
    }
    const parseJenisCucian = (jsonString, idTugasRef) => {
        if (idTugasRef && idTugasRef.startsWith('MANUAL')) {
            const tipe = idTugasRef === 'MANUAL_JEMPUT' ? 'Jemput' : 'Antar';
            return `<p class="text-xs text-gray-500 italic">Tugas ${tipe} Manual.</p>`;
        }
        if (!jsonString) return '<p class="text-xs text-gray-500 italic">Detail tidak tersedia.</p>';
        try {
            const layananList = JSON.parse(jsonString);
            if (Array.isArray(layananList) && layananList.length > 0) {
                return `<ul class="list-disc list-inside text-xs text-gray-600">${layananList.map(l => `<li>${l.jumlah || ''} ${l.satuan || ''} - ${l.nama_layanan || 'N/A'}</li>`).join('')}</ul>`;
            }
        } catch (e) { return `<p class="text-xs text-gray-700">${jsonString}</p>`; }
        return '';
    };
    container.innerHTML = tasks.map(tugas => {
        const id = tugas.id_perintah;
        const isJemput = !tugas.id_tugas_referensi || tugas.id_tugas_referensi === 'MANUAL_JEMPUT';
        const statusMap = { 'Aktif': { text: isJemput ? 'Menunggu Jemput' : 'Siap Antar', color: 'bg-yellow-100 text-yellow-800' }, 'terjemput': { text: 'Terjemput', color: 'bg-blue-100 text-blue-800' }, 'terantar': { text: 'Terantar', color: 'bg-green-100 text-green-800' }, 'Selesai': { text: 'Selesai', color: 'bg-gray-200 text-gray-800' }};
        const currentStatus = statusMap[tugas.status] || { text: tugas.status, color: 'bg-gray-100 text-gray-800' };
        const tglJemput = tugas.tanggal_jemput ? new Date(tugas.tanggal_jemput + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Belum diatur';
        const jamJemput = tugas.jam_jemput ? tugas.jam_jemput.substring(0, 5) : '';
        const waLink = tugas.no_telp_pelanggan ? `https://wa.me/${tugas.no_telp_pelanggan.replace(/\D/g, '')}` : '#';
        const waButton = tugas.no_telp_pelanggan ? `<a href="${waLink}" target="_blank" onclick="event.stopPropagation()"><i class="fab fa-whatsapp"></i></a>` : '';
        const linkPetaHtml = tugas.link_peta ? `<a href="${tugas.link_peta}" target="_blank" onclick="event.stopPropagation()" class="text-blue-500 hover:underline ml-2 flex items-center text-xs"><i class="fas fa-map-marked-alt mr-1"></i> Buka Peta</a>` : '';
        const isManual = tugas.id_tugas_referensi && tugas.id_tugas_referensi.startsWith('MANUAL');
        let allFotoProses = [];
        try {
            const fotoProsesData = ensureObject(tugas.foto_proses);
            if (Array.isArray(fotoProsesData)) allFotoProses = fotoProsesData;
            else if (typeof fotoProsesData === 'object' && fotoProsesData !== null) allFotoProses = Object.values(fotoProsesData).flat();
        } catch(e) {}
        const fotoTugasUtama = isManual ? tugas.foto_tugas : tugas.foto_barang;
        const catatanSelesaiHtml = (tugas.status === 'terjemput' || tugas.status === 'terantar') && tugas.catatan_selesai ? `<div class="flex items-start mt-2"><i class="fas fa-clipboard-check w-4 mr-1 text-green-500 mt-1"></i> <div><h6 class="text-xs font-bold text-gray-500">Catatan Penyelesaian:</h6><p class="text-xs text-green-700 font-semibold">${tugas.catatan_selesai}</p></div></div>` : '';
        return `
            <div class="bg-white p-4 rounded-lg shadow-md border-l-4 ${isJemput ? 'border-blue-500' : 'border-green-500'}">
                <div class="flex justify-between items-start">
                    <div><h5 class="font-bold text-lg text-gray-800">${tugas.nama_pelanggan}</h5><p class="text-xs text-gray-400 font-mono">ID: ${id}</p><p class="text-xs text-gray-400">Dibuat oleh: ${tugas.pembuat || 'Sistem'}</p></div>
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${currentStatus.color}">${currentStatus.text}</span>
                </div>
                <div class="mt-3 pt-3 border-t text-sm text-gray-700 space-y-2">
                    <p class="flex items-center"><i class="fas fa-map-marker-alt w-4 mr-1 text-gray-400"></i> ${tugas.alamat || 'Alamat tidak ada'} ${linkPetaHtml}</p>
                    <p class="flex items-center"><i class="fas fa-phone w-4 mr-1 text-gray-400"></i> ${tugas.no_telp_pelanggan || '-'} ${waButton}</p>
                    <p><i class="fas fa-calendar-alt w-4 mr-1 text-gray-400"></i> ${tglJemput} ${jamJemput}</p>
                    <div><h6 class="text-xs font-bold text-gray-500">Jenis Cucian:</h6>${parseJenisCucian(tugas.jenis_cucian, tugas.id_tugas_referensi)}</div>
                    <div><h6 class="text-xs font-bold text-gray-500">Keterangan:</h6><p class="text-xs">${tugas.keterangan || 'Tidak ada'}</p></div>
                    ${catatanSelesaiHtml}
                    ${renderAnjemPhotoGallery('Foto Barang/Tugas', fotoTugasUtama)}
                    ${renderAnjemPhotoGallery('Foto Proses Pengerjaan', allFotoProses)}
                    ${renderAnjemPhotoGallery('Foto Bukti Selesai', tugas.foto_bukti)}
                </div>
                <div class="flex justify-between items-center mt-4 pt-3 border-t">
                    <div>${currentUser.role === 'owner' ? `<button class="btn-action-primary text-xs btn-edit-anjem" data-id="${id}"><i class="fas fa-edit"></i></button><button class="btn-action-danger text-xs btn-delete-anjem" data-id="${id}"><i class="fas fa-trash"></i></button>` : ''}</div>
                    ${tugas.status === 'Aktif' ? `<button class="btn-action-success btn-selesaikan-anjem" data-id="${id}" data-ref-id="${tugas.id_tugas_referensi || ''}" data-status-bayar="${tugas.status_bayar || 'Belum Lunas'}" data-total-biaya="${tugas.total_biaya || 0}" data-jumlah-bayar="${tugas.jumlah_bayar || 0}"><i class="fas fa-check mr-2"></i>Selesaikan ${isJemput ? 'Jemput' : 'Antar'}</button>` : ''}
                </div>
            </div>`;
    }).join('');
    document.querySelectorAll('.btn-edit-anjem').forEach(b => b.addEventListener('click', e => handleEditAnjem(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-delete-anjem').forEach(b => b.addEventListener('click', e => handleDeleteAnjem(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-selesaikan-anjem').forEach(b => b.addEventListener('click', e => {
        const ds = e.currentTarget.dataset;
        handleSelesaikanAnjem(ds.id, ds.refId, ds.statusBayar, ds.totalBiaya, ds.jumlahBayar);
    }));
}
async function loadAndRenderAnjemList() {
    const container = document.getElementById('tugas-list-container');
    container.innerHTML = `<div class="text-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div></div>`;
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentAnjemFilter));
    try {
        const res = await callAppsScriptAPI('getTugasList', { 
            dataSheetName: 'Tugas Anjem',
            filter: currentAnjemFilter 
        });
        const jemputCount = res.response.jemputCount || 0;
        const antarCount = res.response.antarCount || 0;
        const jemputBubble = document.getElementById('jemput-count');
        const antarBubble = document.getElementById('antar-count');
        if (jemputBubble) {
            jemputBubble.textContent = jemputCount;
            jemputBubble.classList.toggle('show', jemputCount > 0);
        }
        if (antarBubble) {
            antarBubble.textContent = antarCount;
            antarBubble.classList.toggle('show', antarCount > 0);
        }
        renderAnjemList(res.response.objects);
    } catch (e) {
        showToast('error', `Gagal memuat tugas: ${e.message}`);
    }
}
function setupKonsumenPicker() {
    const pilihButton = document.getElementById('btn-pilih-konsumen');
    if (!pilihButton) return; 
    const anjemModalTitle = currentAnjemId ? 'Edit Tugas Anjem' : 'Tambah Tugas Anjem Baru';
    pilihButton.addEventListener('click', () => {
        openKonsumenModal(
            (selectedKonsumen) => {
                populateForm({
                    id_konsumen: selectedKonsumen.id_konsumen,
                    nama_pelanggan: selectedKonsumen.nama_konsumen,
                    alamat: selectedKonsumen.alamat,
                    no_telp_pelanggan: selectedKonsumen.no_telpon,
                    link_peta: selectedKonsumen.peta_lokasi
                });
                hideKonsumenModal();
            },
            () => {
                hideFormModal();
                handleCreateKonsumen((newKonsumen) => {
                    buildDynamicForm(getAnjemFormConfig());
                    populateForm({
                        id_konsumen: newKonsumen.id_konsumen,
                        nama_pelanggan: newKonsumen.nama_konsumen,
                        alamat: newKonsumen.alamat,
                        no_telp_pelanggan: newKonsumen.no_telpon,
                        link_peta: newKonsumen.peta_lokasi
                    });
                    openFormModal(anjemModalTitle, handleFormSubmitAnjem);
                    setupKonsumenPicker(); 
                });
            }
        );
    });
}
function handleCreateAnjem() {
    currentAnjemId = null;
    newPhotos = [];
    currentAnjemExistingPhotos = [];
    buildDynamicForm(getAnjemFormConfig());
    openFormModal('Tambah Tugas Anjem Baru', handleFormSubmitAnjem);
    setupKonsumenPicker();
    setupAnjemPhotoUploader();
}
async function handleEditAnjem(id) {
    currentAnjemId = id;
    newPhotos = [];
    try {
        const res = await callAppsScriptAPI('getTugasDetail', { id_tugas: id, tipe_tugas: 'Tugas Anjem' });
        const tugas = res.response.tugas;
        currentAnjemExistingPhotos = Array.isArray(tugas.foto_tugas) ? tugas.foto_tugas : [];
        tugas.tipe_tugas_anjem = (tugas.id_tugas_referensi && tugas.id_tugas_referensi.startsWith('MANUAL')) ? 'Antar' : 'Jemput';
        let jenisCucianTampil = '';
        if (tugas.jenis_cucian) {
            try {
                const layananList = JSON.parse(tugas.jenis_cucian);
                if (Array.isArray(layananList)) {
                    jenisCucianTampil = layananList.map(l => `${l.jumlah || ''} ${l.satuan || ''} - ${l.nama_layanan || 'N/A'}`).join('\n');
                } else {
                    jenisCucianTampil = tugas.jenis_cucian;
                }
            } catch (e) {
                jenisCucianTampil = tugas.jenis_cucian;
            }
        }
        buildDynamicForm(getAnjemFormConfig());
        populateForm(tugas);
        const previewContainer = document.getElementById('image-preview-container-tugas');
        if (previewContainer && currentAnjemExistingPhotos.length > 0) {
            previewContainer.innerHTML = currentAnjemExistingPhotos.map(photoUrl => `<img src="${photoUrl}" class="w-20 h-20 object-cover rounded">`).join('');
        }
        const displayField = document.querySelector('[name="jenis_cucian_display"]');
        if(displayField) displayField.value = jenisCucianTampil;
        const tipeSelect = document.querySelector('[name="tipe_tugas_anjem"]');
        if (tipeSelect) tipeSelect.disabled = true;
        openFormModal('Edit Tugas Anjem', handleFormSubmitAnjem);
        setupKonsumenPicker();
        setupAnjemPhotoUploader();
    } catch(e) {
        showToast('error', `Gagal memuat data: ${e.message}`);
    }
}
async function handleFormSubmitAnjem() {
    const form = document.getElementById('dynamic-form');
    const formData = {};
    new FormData(form).forEach((value, key) => { formData[key] = value; });
    if (!formData.nama_pelanggan || !formData.alamat || !formData.tanggal_jemput || !formData.jam_jemput) {
        return showToast('error', 'Semua kolom wajib (Nama, Alamat, Tanggal, Jam) harus diisi.');
    }
    try {
        let uploadedPhotoUrls = [];
        if (newPhotos.length > 0) {
            const folderId = currentAnjemId || `NEW-${Date.now()}`;
            const uploadPromises = newPhotos.map(photo => callAppsScriptAPI('uploadImage', { 
                base64: photo.base64, 
                folderId: folderId,
                type: 'tugas'
            }));
            const uploadResults = await Promise.all(uploadPromises);
            uploadedPhotoUrls = uploadResults.map(res => res.response.url);
            formData.foto_tugas = uploadedPhotoUrls;
        } else if (currentAnjemId) {
            formData.foto_tugas = currentAnjemExistingPhotos;
        } else {
            formData.foto_tugas = [];
        }
        await callAppsScriptAPI('submitAnjemTask', { formData, id: currentAnjemId, loggedInUser: currentUser });
        showToast('success', 'Tugas Anjem berhasil disimpan.');
        hideFormModal();
        loadAndRenderAnjemList();
    } catch(err) {
        showToast('error', err.message);
    }
}
function handleDeleteAnjem(id) {
    swal({
        title: "Anda yakin?",
        text: "Tugas anjem ini akan dihapus permanen.",
        icon: "warning",
        buttons: ["Batal", "Ya, Hapus!"],
        dangerMode: true,
    }).then(async (willDelete) => {
        if (willDelete) {
            try {
                await callAppsScriptAPI('deleteTugas', { id_tugas: id, tipe_tugas: 'Tugas Anjem' });
                showToast('success', 'Tugas berhasil dihapus.');
                loadAndRenderAnjemList();
            } catch (err) {
                showToast('error', err.message);
            }
        }
    });
}

function handleSelesaikanAnjem(id, refId, statusBayar, totalBiaya, jumlahBayar) {
    const isJemput = !refId || refId === 'MANUAL_JEMPUT';
    const isManualAntar = refId === 'MANUAL_ANTAR';
    const sisaBayar = parseFloat(totalBiaya || 0) - parseFloat(jumlahBayar || 0);
    let localNewPhotos = [];
    const setupPhotoHandler = (containerId) => {
        const fileInput = document.getElementById(containerId);
        if (!fileInput) return;
        const previewContainer = fileInput.nextElementSibling;
        if (!previewContainer) return;
        const newFileInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newFileInput, fileInput);
        newFileInput.addEventListener('change', async (event) => {
            const files = event.target.files;
            if (!files.length) return;
            previewContainer.innerHTML = '<p class="text-sm w-full text-gray-500">Mengompres gambar...</p>';
            localNewPhotos = [];
            try {
                const compressedImages = await Promise.all(Array.from(files).map(file => compressImage(file)));
                previewContainer.innerHTML = '';
                compressedImages.forEach(imgData => {
                    localNewPhotos.push(imgData);
                    const imgElement = document.createElement('img');
                    imgElement.src = `data:image/jpeg;base64,${imgData.base64}`;
                    imgElement.className = 'w-20 h-20 object-cover rounded';
                    previewContainer.appendChild(imgElement);
                });
            } catch (err) {
                console.error('Error compressing images:', err);
                previewContainer.innerHTML = '<p class="text-sm text-red-500">Gagal memproses gambar.</p>';
            }
        });
    };
    const uploadAndFinish = async (payload) => {
        showLoading();
        try {
            if (localNewPhotos.length > 0) {
                const uploadPromises = localNewPhotos.map(photo => callAppsScriptAPI('uploadImage', {
                    base64: photo.base64, 
                    folderId: id, 
                    type: 'bukti_anjem'
                }));
                const uploadResults = await Promise.all(uploadPromises);
                payload.foto_urls = uploadResults.map(res => res.response.url);
            } else {
                payload.foto_urls = [];
            }
            payload.loggedInUser = currentUser?.namaLengkap || currentUser?.username || 'Unknown User';
            await callAppsScriptAPI('selesaikanTugasAntar', payload);
            showToast('success', `Tugas ${isJemput ? 'penjemputan' : 'pengantaran'} berhasil diselesaikan.`);
            hideFormModal();
            loadAndRenderAnjemList();
        } catch (err) {
            console.error('Error finishing task:', err);
            showToast('error', `Gagal menyimpan: ${err.message}`);
        } finally {
            hideLoading();
        }
    };
    if (isJemput || isManualAntar) {
        const formHtml = `
            <div class="space-y-4">
                <div>
                    <label for="catatan_selesai" class="block text-sm font-medium text-gray-700 mb-1">Catatan Selesai (Opsional)</label>
                    <textarea id="catatan_selesai" class="input-text w-full" rows="2" placeholder="cth: dititip ke satpam, diterima oleh Ibu..."></textarea>
                </div>
                <div>
                    <label for="foto_bukti_anjem" class="block text-sm font-medium text-gray-700 mb-1">Upload Foto Bukti <span class="text-red-500">*</span></label>
                    <input type="file" id="foto_bukti_anjem" class="input-text w-full" required multiple accept="image/*">
                    <div class="mt-2 flex flex-wrap gap-2 border rounded-md p-2 bg-gray-50 min-h-[80px]"></div>
                </div>
            </div>`;
        buildDynamicForm(formHtml);
        setupPhotoHandler('foto_bukti_anjem');
        openFormModal(`Selesaikan Proses ${isJemput ? 'Jemput' : 'Antar'}`, () => {
            if (localNewPhotos.length === 0) {
                return showToast('error', 'Foto bukti wajib diisi.');
            }
            const catatan = document.getElementById('catatan_selesai')?.value || '';
            uploadAndFinish({ id_tugas: id, catatan_selesai: catatan });
        });
        return;
    }
    swal({
        title: "Konfirmasi Pembayaran",
        text: `Tagihan ini statusnya ${statusBayar || 'Belum Lunas'}. Apakah pelanggan akan melakukan pembayaran sekarang?`,
        icon: "warning",
        buttons: {
            cancel: "Batal",
            tidakBayar: { text: "Tidak Bayar Sekarang", value: "tidakBayar" },
            bayar: { text: "Bayar di Tempat", value: "bayar" },
        },
    }).then((value) => {
        if (!value) return;
        let formHtml = '';
        let modalTitle = '';
        const baseFormHtml = `
            <div class="mb-4">
                <label for="foto_bukti_anjem" class="block text-sm font-medium text-gray-700 mb-1">Upload Foto Bukti Pengantaran <span class="text-red-500">*</span></label>
                <input type="file" id="foto_bukti_anjem" class="input-text w-full" required multiple accept="image/*">
                <div id="image-preview-container" class="mt-2 flex flex-wrap gap-2 border rounded-md p-2 bg-gray-50 min-h-[80px]"></div>
            </div>`;
        
        // --- PERUBAHAN DIMULAI DI SINI ---
        if (value === "bayar") {
            modalTitle = "Proses Pembayaran & Pengantaran";
            formHtml = `
                <div class="p-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p class="text-sm text-gray-600">Total Tagihan: Rp ${parseInt(totalBiaya || 0).toLocaleString('id-ID')}</p>
                    <p class="font-bold text-blue-700">Sisa Bayar: Rp ${sisaBayar.toLocaleString('id-ID')}</p>
                </div>
                <div class="mb-4">
                    <label for="jumlah_bayar_aktual" class="block text-sm font-medium text-gray-700 mb-1">Jumlah Bayar Aktual <span class="text-red-500">*</span></label>
                    <input type="number" id="jumlah_bayar_aktual" class="input-text w-full" value="${Math.max(0, sisaBayar)}" min="0">
                </div>
                <div class="mb-4">
                    <label for="catatan_pembayaran" class="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
                    <input type="text" id="catatan_pembayaran" class="input-text w-full" placeholder="cth: Bayar tunai, via transfer, dll">
                </div>
            ` + baseFormHtml;
        } else { // Ini adalah alur "Tidak Bayar Sekarang"
            modalTitle = "Selesaikan Pengantaran (Tanpa Bayar)";
            formHtml = `
                <div class="mb-4">
                    <label for="catatan_selesai" class="block text-sm font-medium text-gray-700 mb-1">Catatan Selesai (Opsional)</label>
                    <textarea id="catatan_selesai" class="input-text w-full" rows="2" placeholder="cth: dititipkan ke satpam, janji bayar besok"></textarea>
                </div>
            ` + baseFormHtml;
        }

        buildDynamicForm(formHtml);
        setupPhotoHandler('foto_bukti_anjem');

        const handleSubmit = () => {
            if (localNewPhotos.length === 0) {
                return showToast('error', 'Foto bukti wajib diisi.');
            }
            const payload = { id_tugas: id };
            if (value === 'bayar') {
                const jumlahBayarEl = document.getElementById('jumlah_bayar_aktual');
                const jumlahBayar = jumlahBayarEl ? jumlahBayarEl.value : '';
                if (!jumlahBayar || parseFloat(jumlahBayar) < 0) {
                    return showToast('error', 'Jumlah bayar aktual harus diisi dan tidak boleh negatif.');
                }
                payload.jumlah_bayar_aktual = jumlahBayar;
                payload.catatan_pembayaran = document.getElementById('catatan_pembayaran')?.value || '';
            } else {
                // Ambil nilai dari catatan yang baru ditambahkan
                payload.catatan_selesai = document.getElementById('catatan_selesai')?.value || '';
            }
            uploadAndFinish(payload);
        };
        // --- AKHIR PERUBAHAN ---
        openFormModal(modalTitle, handleSubmit);
    });
}

function getAnjemFormConfig() {
    return [
        {
            type: 'customHtml',
            html: `
                <input type="hidden" id="id_konsumen" name="id_konsumen">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Pelanggan</label>
                    <div class="flex gap-2">
                        <input type="text" id="nama_pelanggan" name="nama_pelanggan" class="input-text w-full bg-gray-200" readonly placeholder="Pilih pelanggan...">
                        <button type="button" id="btn-pilih-konsumen" class="btn-primary flex-shrink-0">Pilih</button>
                    </div>
                </div>
            `
        },
        { name: 'tipe_tugas_anjem', label: 'Jenis Tugas', type: 'dropdown', options: ['Jemput', 'Antar'], required: true, placeholder: 'Pilih Jenis Tugas' },
        { name: 'alamat', label: 'Alamat', type: 'textarea', required: true },
        { name: 'no_telp_pelanggan', label: 'No. Telpon', type: 'text' },
        { name: 'link_peta', label: 'Link Peta (Google Maps)', type: 'text' },
        { name: 'tanggal_jemput', label: 'Tanggal', type: 'date', required: true },
        { name: 'jam_jemput', label: 'Jam', type: 'time', required: true },
        { name: 'jenis_cucian_display', label: 'Jenis Cucian (Otomatis dari Transaksi)', type: 'textarea', readonly: true },
        { name: 'keterangan', label: 'Keterangan Tambahan (Manual)', type: 'textarea', placeholder: 'cth: Titip di pos satpam, rumah warna hijau...' },
		{ name: 'foto_tugas', label: 'Foto Barang (Opsional)', type: 'customHtml', html: `
            <div>
                <label for="foto_tugas_input" class="block text-sm font-medium text-gray-700 mb-1">Foto Barang (Opsional)</label>
                <input type="file" id="foto_tugas_input" class="input-text w-full" multiple accept="image/*">
                <div id="image-preview-container-tugas" class="mt-2 flex flex-wrap gap-2 border rounded-md p-2 bg-gray-50 min-h-[80px]"></div>
            </div>
        `}
    ];
}


// ===================================================================================
// FUNGSI TUGAS LAUNDRY (KILOAN, SATUAN, DLL)
// ===================================================================================

function renderList(objects) {
    const container = document.getElementById('tugas-list-container');
    if (!objects || !container) return;

    if (objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center text-gray-500">Belum ada tugas di tab ini.</div>`;
        return;
    }
    
    container.innerHTML = objects.map(task => {
        const id = task.id_tugas;
        const statusColor = task.status?.toLowerCase().includes('selesai') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        
        let detailLayananHtml = 'Tidak ada detail layanan.';
        const semuaLayanan = ensureArray(task.detail_layanan);

        if (semuaLayanan.length > 0) {
            const layananDiKategoriIni = semuaLayanan.filter(l => l.id_kategori == currentKategoriId);
            
            if (layananDiKategoriIni.length > 0) {
                detailLayananHtml = `<table class="w-full text-sm mt-2">
                    <tbody>
                        ${layananDiKategoriIni.map((l) => {
                            const originalIndex = semuaLayanan.findIndex(sl => sl === l);
                            const isSelesai = l.status === 'Selesai';
                            
                            // PERBAIKAN: Tambahkan statusClass untuk teks
                            const statusClass = isSelesai ? 'text-gray-400 line-through' : '';
                            const clickableClass = 'font-semibold text-blue-700 hover:underline';

                            const layananRow = `
                                <tr class="border-b">
                                    <td class="p-2 cursor-pointer layanan-toggle-btn" data-id="${id}" data-index="${originalIndex}">
                                        <p class="${isSelesai ? statusClass : clickableClass} flex items-center">
                                            <i class="fas fa-chevron-down fa-xs mr-2 transition-transform"></i>
                                            ${l.nama_layanan}
                                        </p>
                                        <p class="text-xs ${isSelesai ? statusClass : 'text-gray-600'} ml-5">${l.jumlah} ${l.satuan}</p>
                                    </td>
                                    <td class="p-2 text-right">
                                        ${!isSelesai && task.status !== 'Selesai' ? `<button class="btn-action-success text-xs btn-selesaikan-layanan" data-id="${id}" data-index="${originalIndex}">Selesaikan</button>` : `<span class="text-xs text-green-600 font-semibold"><i class="fas fa-check-circle"></i> Selesai</span>`}
                                    </td>
                                </tr>
                            `;
                            
                            const detailRow = `
                                <tr class="detail-proses-row hidden" id="detail-layanan-${id}-${originalIndex}">
                                    <td colspan="2" class="p-0 bg-blue-50">
                                        <div class="p-3 border-l-4 border-blue-500"></div>
                                    </td>
                                </tr>
                            `;

                            return layananRow + detailRow;
                        }).join('')}
                    </tbody>
                </table>`;
            } else {
                 detailLayananHtml = `<p class="text-center text-xs text-gray-500 p-2">Tidak ada layanan untuk kategori ini.</p>`;
            }
        }
        
        const fotoBarangDiterimaHtml = renderAnjemPhotoGallery('Foto Barang Diterima', task.foto_barang);
        const fotoData = ensureObject(task.foto_proses);
        const fotoProsesKategoriIniHtml = (fotoData && fotoData[currentKategoriId]) ? renderAnjemPhotoGallery('Foto Proses Kategori Ini', fotoData[currentKategoriId]) : '';
        const catatanData = ensureObject(task.catatan_selesai);
        const catatanKategoriIni = catatanData[currentKategoriId] ? `<div class="mt-2"><h6 class="text-xs font-bold text-gray-500 uppercase mb-1">Catatan Penyelesaian Kategori:</h6><p class="text-xs italic text-gray-700 whitespace-pre-wrap">${escapeHtml(catatanData[currentKategoriId])}</p></div>` : '';

        const collapsibleContent = (fotoBarangDiterimaHtml || fotoProsesKategoriIniHtml || catatanKategoriIni) ? `
            <details class="mt-3 text-xs">
                <summary class="cursor-pointer text-blue-600 hover:underline font-semibold">Lihat Detail Foto & Catatan</summary>
                <div class="mt-2 p-2 bg-gray-50 rounded-md border space-y-3">
                    ${fotoBarangDiterimaHtml}
                    ${fotoProsesKategoriIniHtml}
                    ${catatanKategoriIni}
                </div>
            </details>
        ` : '';

        return `
            <div class="bg-white rounded-lg shadow">
                <div class="p-4">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center space-x-4">
                            <i class="fas fa-box-open text-2xl text-gray-400"></i>
                            <div>
                                <h5 class="font-bold text-lg text-gray-800">${escapeHtml(task.nama_pelanggan) || 'Tanpa Nama'}</h5>
                                <p class="text-sm text-gray-500 font-mono">ID Tugas: ${id}</p>
                            </div>
                        </div>
                        <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${task.status || 'Aktif'}</span>
                    </div>
                    <div class="mt-2 pt-2 border-t">
                        <h6 class="text-xs font-bold text-gray-500 mb-1">LAYANAN DALAM KATEGORI INI</h6>
                        ${detailLayananHtml}
                    </div>
                    ${collapsibleContent}
                </div>
            </div>`;
    }).join('');

    document.querySelectorAll('.layanan-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const icon = e.currentTarget.querySelector('i');
            icon.classList.toggle('rotate-180');
            const taskId = e.currentTarget.dataset.id;
            const layananIndex = e.currentTarget.dataset.index;
            const detailRow = document.getElementById(`detail-layanan-${taskId}-${layananIndex}`);
            if (detailRow) {
                const isHidden = detailRow.classList.toggle('hidden');
                if (!isHidden) {
                    handleLihatProsesLayanan(taskId, layananIndex, `detail-layanan-${taskId}-${layananIndex}`);
                }
            }
        });
    });

    document.querySelectorAll('.btn-selesaikan-layanan').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const taskId = e.currentTarget.dataset.id;
            const layananIndex = e.currentTarget.dataset.index;
            const taskObject = allTaskObjects.find(t => t.id_tugas === taskId);
            if (taskObject) {
                handleSelesaikanLayanan(taskObject, layananIndex);
            }
        });
    });
}

async function handleLihatProsesLayanan(taskId, layananIndex, containerId) {
    const detailRow = document.getElementById(containerId);
    if (!detailRow) return;
    const container = detailRow.querySelector('div');
    if (!container) return;
	const taskObject = allTaskObjects.find(t => t.id_tugas === taskId);
    if (!taskObject) {
        container.innerHTML = `<p class="text-xs text-red-500">Error: Objek tugas tidak ditemukan.</p>`;
        return;
    }
    const semuaLayanan = ensureArray(taskObject.detail_layanan);
    const layananObject = semuaLayanan[layananIndex];
    const isLayananSelesai = layananObject && layananObject.status === 'Selesai';
    const isTugasSelesai = taskObject.status === 'Selesai';
    container.innerHTML = `<div class="text-center text-xs p-2">Memuat proses...</div>`;

    try {
        if (!cachedTaskDetails[taskId]) {
            const res = await callAppsScriptAPI('getTugasDetail', { id_tugas: taskId, tipe_tugas: currentDataSheetName });
            cachedTaskDetails[taskId] = res.response;
        }
        const { tugas, proses_kerja } = cachedTaskDetails[taskId];
        const logPengerjaan = ensureArray(tugas.log_pengerjaan);
        const logLayananIni = logPengerjaan.filter(log => log.layanan_index == layananIndex);
        const prosesSelesaiIds = logLayananIni.map(log => String(log.id_proses));

        let detailHtml = '';

        if (logLayananIni.length > 0) {
            detailHtml += `<div class="space-y-2 text-sm mb-4">
                <h6 class="font-semibold text-gray-700 text-xs">Riwayat Pengerjaan Layanan Ini</h6>
                <ul class="space-y-1 text-xs">${logLayananIni.map(log => `
                <li class="p-1.5 bg-white rounded border">
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-green-800">${log.nama_proses}</span>
                        <span class="text-gray-500">${formatWaktu(log.waktu_selesai)}</span>
                    </div>
                    <div class="text-gray-600 text-right">
                        <span>Oleh: ${log.dikerjakan_oleh}</span>
                    </div>
                </li>`).join('')}</ul>
            </div>`;
        }

        const prosesBelumSelesai = proses_kerja.filter(p => !prosesSelesaiIds.includes(String(p.id_proses)));
        if (!isLayananSelesai && !isTugasSelesai && prosesBelumSelesai.length > 0) {
            detailHtml += `<div class="space-y-2 text-sm">
                <h6 class="font-semibold text-gray-700 text-xs">Tandai Proses Selesai</h6>
                <div class="space-y-1" id="form-proses-${taskId}-${layananIndex}">
                    ${prosesBelumSelesai.map(proses => `
                    <label class="flex items-center p-1.5 rounded hover:bg-gray-200">
                        <input type="checkbox" class="h-4 w-4 text-blue-600 border-gray-300 rounded" value="${proses.id_proses}">
                        <span class="ml-2 text-gray-800">${proses.nama_proses}</span>
                    </label>`).join('')}
                    <button class="btn-primary text-xs mt-2 btn-simpan-proses-layanan" data-id="${taskId}" data-index="${layananIndex}">Simpan Proses</button>
                </div>
            </div>`;
        }
        
        container.innerHTML = detailHtml || '<p class="text-xs text-gray-500 italic">Tidak ada riwayat atau proses lanjutan.</p>';
        
        container.querySelector('.btn-simpan-proses-layanan')?.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const index = e.currentTarget.dataset.index;
            handleSimpanProsesLayanan(id, index);
        });

    } catch (err) {
        container.innerHTML = `<p class="text-xs text-red-500">Gagal memuat: ${err.message}</p>`;
    }
}

async function handleSimpanProsesLayanan(taskId, layananIndex) {
    const form = document.getElementById(`form-proses-${taskId}-${layananIndex}`);
    if (!form) return;
    
    const checkboxes = form.querySelectorAll('input[type="checkbox"]:checked');
    const newlyCompleted = Array.from(checkboxes).map(cb => cb.value);

    if (newlyCompleted.length === 0) return showToast('error', 'Tidak ada proses baru yang dipilih.');

    showLoading();
    try {
        await callAppsScriptAPI('updateTugasProses', {
            id_tugas: taskId,
            layanan_index: layananIndex,
            newly_completed_processes: newlyCompleted,
            loggedInUser: currentUser.namaLengkap
        });
        showToast('success', 'Status pengerjaan berhasil disimpan.');
        
        delete cachedTaskDetails[taskId];
        
        handleLihatProsesLayanan(taskId, layananIndex, `detail-layanan-${taskId}-${layananIndex}`);
    } catch(err) {
        showToast('error', `Gagal menyimpan: ${err.message}`);
    } finally {
        hideLoading();
    }
}

function handleSelesaikanLayanan(task, layananIndex) {
    const semuaLayanan = ensureArray(task.detail_layanan);
    const layanan = semuaLayanan[layananIndex];

    if (!layanan) return showToast('error', 'Data layanan tidak ditemukan.');

    const fotoBarangHtml = Array.isArray(task.foto_barang) && task.foto_barang.length > 0 
        ? `<div class="mb-4">
             <h6 class="text-sm font-semibold text-gray-700 mb-2">Foto Barang Diterima:</h6>
             <div class="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50">
               ${task.foto_barang.map(url => `<img src="${url}" class="w-16 h-16 object-cover rounded">`).join('')}
             </div>
           </div>`
        : '';
    
    const formHtml = `
        <div class="space-y-4">
            ${fotoBarangHtml}
            <div>
                <label for="catatan_selesai" class="block text-sm font-medium text-gray-700 mb-1">Catatan Selesai (Opsional)</label>
                <textarea id="catatan_selesai" class="input-text w-full" rows="2" placeholder="Contoh: Ada noda yang tidak hilang, dll."></textarea>
            </div>
            <div>
                <label for="foto_penyelesaian" class="block text-sm font-medium text-gray-700 mb-1">Upload Foto Bukti Proses (Opsional)</label>
                <input type="file" id="foto_penyelesaian" class="input-text w-full" multiple accept="image/*">
                <div id="image-preview-container" class="mt-2 flex flex-wrap gap-2 border rounded-md p-2 bg-gray-50 min-h-[80px]"></div>
            </div>
        </div>
    `;
    
    let localNewPhotos = [];
    buildDynamicForm(formHtml);
    
    document.getElementById('foto_penyelesaian').addEventListener('change', async (event) => {
        const files = event.target.files;
        const previewContainer = document.getElementById('image-preview-container');
        if (!files.length) return;
        previewContainer.innerHTML = '<p class="text-sm w-full text-gray-500">Mengompres gambar...</p>';
        localNewPhotos = [];
        try {
            const compressedImages = await Promise.all(Array.from(files).map(file => compressImage(file)));
            previewContainer.innerHTML = '';
            compressedImages.forEach(imgData => {
                localNewPhotos.push(imgData);
                const imgElement = document.createElement('img');
                imgElement.src = `data:image/jpeg;base64,${imgData.base64}`;
                imgElement.className = 'w-16 h-16 object-cover rounded';
                previewContainer.appendChild(imgElement);
            });
        } catch (err) {
            previewContainer.innerHTML = '<p class="text-sm text-red-500">Gagal mengompres gambar.</p>';
        }
    });
    
    const handleSubmit = async () => {
        showLoading();
        let uploadedUrls = [];
        const catatan = document.getElementById('catatan_selesai').value;
        
        try {
            if (localNewPhotos.length > 0) {
                const uploadPromises = localNewPhotos.map(photo => callAppsScriptAPI('uploadImage', { 
                    base64: photo.base64, 
                    folderId: task.id_tugas,
                    type: 'proses' 
                }));
                const uploadResults = await Promise.all(uploadPromises);
                uploadedUrls = uploadResults.map(res => res.response.url);
            }
            
            await callAppsScriptAPI('selesaikanLayananTugas', { 
                id_tugas: task.id_tugas,
                layanan_index: layananIndex,
                loggedInUser: currentUser.namaLengkap,
                foto_urls: uploadedUrls,
                catatan_selesai: catatan
            });
            
            hideFormModal();
            showToast('success', `Layanan "${layanan.nama_layanan}" berhasil diselesaikan.`);
            loadAndRenderList();
            
        } catch (err) {
            showToast('error', `Gagal: ${err.message}`);
        } finally {
            hideLoading();
        }
    };
    
    openFormModal(`Selesaikan: ${layanan.nama_layanan}`, handleSubmit);
}

async function loadAndRenderList() {
    const container = document.getElementById('tugas-list-container');
    if (!container) return;
    container.innerHTML = `<div class="text-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div></div>`;
    
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentLaundryFilter));

    try {
        const res = await callAppsScriptAPI('getTugasList', { 
            dataSheetName: currentDataSheetName,
            filter: currentLaundryFilter
        });
        cachedTaskDetails = {}; 
        allTaskObjects = res.response.objects;
        renderList(allTaskObjects);
    } catch (e) {
        console.error(`Gagal memuat ${currentDataSheetName}:`, e);
        showToast('error', `Gagal memuat Daftar Tugas: ${e.message}`);
        container.innerHTML = `<div class="bg-red-100 text-red-700 p-4 rounded-lg">Terjadi kesalahan saat mengambil data dari server.</div>`;
    }
}

export async function initializeTugasPage(user, sheetName, kategoriId) {
    currentUser = user;
    try {
        const resMaster = await callAppsScriptAPI('getLayananOptions', {});
        masterData = resMaster.response;

        const hashParts = (sheetName || '').split('/');
        const cleanSheetName = hashParts[0];
        const cleanKategoriId = hashParts[1] || kategoriId;
        
        if (!cleanSheetName) {
            currentDataSheetName = '';
            currentKategoriId = null;
            const container = document.getElementById('page-content-container');
            const resSummary = await callAppsScriptAPI('getTugasCategorySummary', {});
            const summaryData = resSummary.response?.summary;
            if (!Array.isArray(summaryData)) throw new Error("Format data ringkasan tidak valid.");
            
            const specialTasks = summaryData.filter(cat => !cat.id_kategori);
            const regularTasks = summaryData.filter(cat => cat.id_kategori);
            container.innerHTML = `<div class="mb-4"><h2 class="text-2xl font-bold text-gray-800">Daftar Kategori Tugas</h2><p class="text-sm text-gray-500">Pilih kategori untuk melihat tugas.</p></div><div class="grid grid-cols-2 gap-4 mb-6">${specialTasks.map(cat => `<a href="#tugas-${cat.nama.replace('Tugas ', '').replace(/\s/g, '-').toLowerCase()}" class="menu-card p-4"><i class="fas ${cat.icon || 'fa-box-open'} text-3xl text-blue-500 mb-2"></i><span class="font-semibold text-gray-700">${cat.nama}</span><span class="font-bold text-2xl text-gray-800">${cat.jumlah || 0}</span></a>`).join('')}</div><div class="grid grid-cols-2 md:grid-cols-3 gap-4">${regularTasks.map(cat => `<a href="#tugas-${cat.nama.replace('Tugas ', '').replace(/\s+/g, '-').toLowerCase()}/${cat.id_kategori}" data-kategori-id="${cat.id_kategori}" class="menu-card p-4"><i class="fas ${cat.icon || 'fa-box-open'} text-3xl text-blue-500 mb-2"></i><span class="font-semibold text-gray-700">${cat.nama.replace('Tugas ','')}</span><span class="font-bold text-2xl text-gray-800">${cat.jumlah || 0}</span></a>`).join('')}</div>`;
        } else {
            currentKategoriId = cleanKategoriId; 
            const categorySlug = cleanSheetName.substring(6);
            const categoryName = categorySlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            const fullTitle = `Tugas ${categoryName}`;
            currentDataSheetName = fullTitle;
            
            if (cleanSheetName === 'tugas-anjem') {
                const contentContainer = document.getElementById('page-content-container');
                let ownerButtonHtml = currentUser.role === 'owner' ? `<button id="btn-tambah-anjem" class="btn-primary w-full md:w-auto"><i class="fas fa-plus mr-2"></i>Tambah Tugas</button>` : '';
                contentContainer.innerHTML = `<div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-4"><div><h2 class="text-2xl font-bold text-gray-800">Tugas Antar Jemput</h2><p class="text-sm text-gray-500">Kelola semua tugas antar jemput.</p></div>${ownerButtonHtml}</div><div class="flex items-center space-x-2 mb-4 overflow-x-auto pb-2 border-b pt-2"><button class="tab-button relative" data-filter="Jemput">Jemput<span id="jemput-count" class="notif-bubble">0</span></button><button class="tab-button relative" data-filter="Antar">Antar<span id="antar-count" class="notif-bubble">0</span></button><button class="tab-button" data-filter="Selesai">Selesai</button></div><div id="tugas-list-container" class="space-y-4"></div>`;
                if (currentUser.role === 'owner') {
                    document.getElementById('btn-tambah-anjem').addEventListener('click', handleCreateAnjem);
                }
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.addEventListener('click', e => {
                        currentAnjemFilter = e.target.dataset.filter;
                        loadAndRenderAnjemList();
                    });
                });
                currentAnjemFilter = 'Jemput';
                loadAndRenderAnjemList();
            } else {
                const contentContainer = document.getElementById('page-content-container');
                contentContainer.innerHTML = `<div class="flex justify-between items-center mb-4"><div><h2 class="text-2xl font-bold text-gray-800">${fullTitle}</h2><p class="text-sm text-gray-500">Kelola dan pantau tugas kategori ini.</p></div><a href="#menu-tugas" class="text-blue-600 hover:underline"><i class="fas fa-arrow-left mr-2"></i>Kembali</a></div><div class="flex items-center space-x-2 mb-4 overflow-x-auto pb-2 border-b"><button class="tab-button" data-filter="Aktif">Aktif</button><button class="tab-button" data-filter="Selesai">Selesai</button></div><div id="tugas-list-container" class="space-y-4"></div>`;
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.addEventListener('click', e => {
                        currentLaundryFilter = e.target.dataset.filter;
                        loadAndRenderList();
                    });
                });
                currentLaundryFilter = 'Aktif';
                loadAndRenderList();
            }
        }
    } catch (e) {
        console.error("Gagal inisialisasi halaman tugas:", e);
        showToast('error', `Gagal inisialisasi halaman tugas: ${e.message}`);
    }
}