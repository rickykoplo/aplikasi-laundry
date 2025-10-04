/**
 * =================================================================
 * FILE FINAL (v8) UNTUK: tugas_luar.js (Alur Validasi Kode)
 * - Mengembalikan input Kode Persetujuan & Selesai di form awal.
 * - Form Persetujuan SPK sekarang memvalidasi Kode yang diinput pelanggan.
 * - Melanjutkan implementasi form Selesaikan Pengerjaan.
 * =================================================================
 */
import { callAppsScriptAPI } from './api.js';
import { showToast, showLoading, hideLoading } from './ui.js';
import { openFormModal, hideFormModal, buildDynamicForm, populateForm, openKonsumenModal, hideKonsumenModal, handleCreateKonsumen } from './modals.js';
import { compressImage } from './image-compressor.js';

// --- VARIABEL GLOBAL ---
let currentUser = null;
let allTugasLuar = [];
let currentTugasLuarId = null;
let currentTugasLuarFilter = 'Aktif';
let masterData = { karyawan: [], layanan: [] };
let selectedLayanan = [];
let newCustomerPhotos = [];
let newBeforePhotos = [];
let newAfterPhotos = [];
let signaturePad = null;

// --- FUNGSI RENDER & LIST ---
function renderPhotoGallery(title, photos) {
    if (!Array.isArray(photos) || photos.length === 0) return '';
    return `<div class="mt-2"><h6 class="text-xs font-bold text-gray-500 uppercase mb-1">${title}</h6><div class="flex flex-wrap gap-2">${photos.map(p => `<a href="${p}" target="_blank"><img src="${p}" class="w-16 h-16 object-cover rounded"></a>`).join('')}</div></div>`;
}

function renderTugasLuarList(objects) {
    const container = document.getElementById('tugas-luar-list-container');
    if (!container) return;
    if (!objects || objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-6 rounded-lg shadow text-center text-gray-500"><i class="fas fa-check-circle text-3xl text-green-500 mb-2"></i><p>Tidak ada tugas di kategori ini.</p></div>`;
        return;
    }

    const renderDetailItem = (icon, title, content) => {
    if (!content || content.trim() === '') return '';
    return `
        <div class="flex items-start text-sm">
            <i class="fas ${icon} fa-fw w-4 mr-2 text-gray-400 pt-1"></i>
            <div class="flex-grow">
                <strong class="font-semibold text-gray-600">${title}:</strong>
                <span class="ml-1 text-gray-800">${content}</span>
            </div>
        </div>`;
};
    const renderNoteSection = (title, content) => {
        if (!content || content.trim() === '') return '';
        return `<div class="mt-2"><h6 class="text-xs font-bold text-gray-500 uppercase">${title}</h6><p class="text-sm italic bg-gray-100 p-2 rounded">${content.replace(/\n/g, '<br>')}</p></div>`;
    };

    const renderPhotoGallery = (title, photos) => {
        const photoArray = Array.isArray(photos) ? photos : [];
        if (photoArray.length === 0) return '';
        return `<div class="mt-2"><h6 class="text-xs font-bold text-gray-500 uppercase">${title}</h6><div class="flex flex-wrap gap-2 mt-1">${photoArray.map(p => `<a href="${p}" target="_blank" onclick="event.stopPropagation()"><img src="${p}" class="w-16 h-16 object-cover rounded border"></a>`).join('')}</div></div>`;
    };
    
  const renderSignature = (title, base64) => {
        try {
            // Handle null/undefined
            if (!base64) return '';
            
            // Handle array (ambil elemen pertama)
            let imageData = base64;
            if (Array.isArray(base64)) {
                if (base64.length === 0) return '';
                imageData = base64[0];
            }
            
            // Handle object
            if (typeof imageData === 'object' && imageData !== null) {
                imageData = imageData.data || imageData.value || imageData.signature || '';
            }
            
            // Pastikan string
            if (typeof imageData !== 'string') {
                console.warn(`Tanda tangan "${title}" bukan string:`, typeof imageData, imageData);
                return '';
            }
            
            // Trim whitespace
            imageData = imageData.trim();
            if (imageData === '') return '';
            
            // Validasi format data URI
            if (imageData.startsWith('data:image')) {
                return `<div class="mt-2"><h6 class="text-xs font-bold text-gray-500 uppercase">${title}</h6><img src="${imageData}" class="border rounded-md mt-1 w-full max-w-xs bg-white"></div>`;
            }
            
            return '';
        } catch (error) {
            console.error(`Error rendering signature "${title}":`, error, base64);
            return '';
        }
    };

    container.innerHTML = objects.map(tugas => {
        const id = tugas.id_tugas_luar;
        const statusMap = { 'Aktif': { text: 'Aktif', color: 'bg-blue-100 text-blue-800', borderColor: 'border-blue-500' }, 'Survey': { text: 'Persetujuan', color: 'bg-yellow-100 text-yellow-800', borderColor: 'border-yellow-500' }, 'Dikerjakan': { text: 'Dikerjakan', color: 'bg-orange-100 text-orange-800', borderColor: 'border-orange-500' }, 'Selesai': { text: 'Selesai', color: 'bg-green-100 text-green-800', borderColor: 'border-green-500' }};
        const currentStatus = statusMap[tugas.status] || { text: tugas.status, color: 'bg-gray-100 text-gray-800', borderColor: 'border-gray-400' };
        
        let timDisplay = '-';
try {
    const timIds = JSON.parse(tugas.tim_pengerjaan || '[]');
    if (Array.isArray(timIds) && timIds.length > 0) {
        // Cocokkan setiap ID dengan nama lengkap dari masterData
        timDisplay = timIds.map(id => {
            const karyawan = masterData.karyawan.find(k => k.id_karyawan === id);
            return karyawan ? karyawan.nama_lengkap : id; // Tampilkan ID jika nama tidak ditemukan
        }).join(', ');
    }
} catch (e) {
    timDisplay = tugas.tim_pengerjaan || '-';
}
        
        const tglPengerjaan = tugas.tanggal_pengerjaan ? new Date(tugas.tanggal_pengerjaan + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum diatur';
        const jamMulai = tugas.jam_mulai ? tugas.jam_mulai.substring(0, 5) : '';
        const waButton = tugas.no_telp ? `<a href="https://wa.me/${tugas.no_telp.replace(/\D/g, '')}" target="_blank" onclick="event.stopPropagation()" class="text-green-500 hover:text-green-700 ml-2 text-lg"><i class="fab fa-whatsapp"></i></a>` : '';
        const mapLink = tugas.link_peta ? `<a href="${tugas.link_peta}" target="_blank" onclick="event.stopPropagation()" class="text-blue-500 hover:underline text-xs ml-2"><i class="fas fa-map-marked-alt mr-1"></i> Peta</a>` : '';
        const idHtml = `<p class="text-xs text-gray-400 font-mono"><a href="#" class="view-tugas-luar-details text-blue-600 hover:underline" data-id="${id}">ID: ${id}</a></p>`;

        let actionButton = '';
        if (tugas.status === 'Aktif') {
            actionButton = `<button class="btn-success w-full btn-mulai-survey" data-id="${id}"><i class="fas fa-ruler-combined mr-2"></i>Mulai Survei</button>`;
        } else if (tugas.status === 'Survey') {
            actionButton = `<button class="btn-warning w-full btn-minta-persetujuan" data-id="${id}"><i class="fas fa-file-signature mr-2"></i>Minta Persetujuan</button>`;
        } else if (tugas.status === 'Dikerjakan') {
            actionButton = `<button class="btn-primary w-full btn-selesaikan-pengerjaan" data-id="${id}"><i class="fas fa-flag-checkered mr-2"></i>Selesaikan Pengerjaan</button>`;
        } else {
             actionButton = `<div class="text-center text-sm font-semibold text-green-600 p-2 bg-green-50 rounded-md"><i class="fas fa-check-circle"></i> Tugas Selesai</div>`;
        }

        const detailRencana = JSON.parse(tugas.rencana_pekerjaan || '[]');
        const detailAktual = JSON.parse(tugas.detail_layanan_aktual || '[]');

        return `<div class="bg-white p-4 rounded-lg shadow-md border-l-4 ${currentStatus.borderColor}">
            <div class="flex justify-between items-start">
                <div>
    <h5 class="font-bold text-lg text-gray-800">${tugas.nama_pelanggan}</h5>
    
    <p class="text-xs text-gray-500">ID Konsumen: ${tugas.id_konsumen || 'N/A'}</p>

    ${idHtml}
</div>
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${currentStatus.color}">${currentStatus.text}</span>
            </div>
            <div class="mt-3 pt-3 border-t text-sm text-gray-700 space-y-2">
                <p class="flex items-center"><i class="fas fa-map-marker-alt fa-fw w-4 mr-2 text-gray-400"></i> ${tugas.alamat || 'Alamat tidak ada'} ${mapLink}</p>
                <p class="flex items-center"><i class="fas fa-phone fa-fw w-4 mr-2 text-gray-400"></i> ${tugas.no_telp || '-'} ${waButton}</p>
                ${renderDetailItem('fa-calendar-alt', 'Jadwal', `${tglPengerjaan}, Jam ${jamMulai}`)}
                ${renderDetailItem('fa-users-cog', 'Tim', timDisplay)}
            </div>
            <div class="mt-3 space-y-1">
                <details>
                    <summary class="text-xs text-blue-600 font-semibold cursor-pointer">Lihat Rencana & Catatan</summary>
                    <div class="p-2 border-t mt-1">
                        ${detailAktual.length > 0 ? `<h6 class="text-xs font-bold text-gray-500 uppercase">Pekerjaan Final</h6><ul class="list-disc list-inside text-sm mb-2">${detailAktual.map(item => `<li>${item.jumlah}x ${item.layanan}</li>`).join('')}</ul>` : ''}
                        ${detailRencana.length > 0 && detailAktual.length === 0 ? `<h6 class="text-xs font-bold text-gray-500 uppercase">Rencana Awal</h6><ul class="list-disc list-inside text-sm">${detailRencana.map(item => `<li>${item.jumlah}x ${item.layanan}</li>`).join('')}</ul>` : ''}
                        ${renderNoteSection('Catatan Pelanggan', tugas.catatan_pelanggan)}
                        ${renderNoteSection('Catatan Survei', tugas.catatan_survei)}
                        ${renderNoteSection('Catatan Hasil', tugas.catatan_hasil)}
                    </div>
                </details>
                <details>
                    <summary class="text-xs text-blue-600 font-semibold cursor-pointer">Lihat Galeri Foto</summary>
                    <div class="p-2 border-t mt-1">
                        ${renderPhotoGallery('Foto dari Pelanggan', tugas.foto_dari_pelanggan)}
                        ${renderPhotoGallery('Foto Before', tugas.foto_before)}
                        ${renderPhotoGallery('Foto After', tugas.foto_after)}
                    </div>
                </details>
                <details>
                    <summary class="text-xs text-blue-600 font-semibold cursor-pointer">Lihat Tanda Tangan</summary>
                    <div class="p-2 border-t mt-1">
                        ${renderSignature('Tanda Tangan Persetujuan', tugas.tanda_tangan_persetujuan)}
                        ${renderSignature('Tanda Tangan Selesai', tugas.tanda_tangan_selesai)}
                    </div>
                </details>
            </div>
            <div class="mt-4 pt-3 border-t flex items-center space-x-2">
                ${actionButton}
                ${currentUser.role === 'owner' ? `<button class="btn-action-danger flex-shrink-0 text-xs btn-delete-tugas-luar" data-id="${id}"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        </div>`;
    }).join('');
    attachTugasLuarActionListeners();
}

function attachTugasLuarActionListeners() {
    document.querySelectorAll('.btn-edit-tugas-luar').forEach(btn => btn.addEventListener('click', e => handleEditTugasLuar(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-delete-tugas-luar').forEach(btn => btn.addEventListener('click', e => handleDeleteTugasLuar(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-mulai-survey').forEach(btn => btn.addEventListener('click', e => handleMulaiSurvey(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-minta-persetujuan').forEach(btn => btn.addEventListener('click', e => handlePersetujuanSPK(e.currentTarget.dataset.id)));
    document.querySelectorAll('.btn-selesaikan-pengerjaan').forEach(btn => btn.addEventListener('click', e => handleSelesaikanPengerjaan(e.currentTarget.dataset.id)));
    
    // Listener baru untuk link detail
    document.querySelectorAll('.view-tugas-luar-details').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            handleViewTugasLuarDetails(e.currentTarget.dataset.id);
        });
    });
}

async function handleViewTugasLuarDetails(id) {
    const tugas = allTugasLuar.find(t => t.id_tugas_luar === id);
    if (!tugas) return showToast('error', 'Data tugas tidak ditemukan');

    const renderSignature = (base64, title) => {
        if (!base64 || !base64.startsWith('data:image')) return '';
        return `<div><h5 class="font-bold mb-1">${title}</h5><img src="${base64}" class="border rounded-md w-full max-w-sm bg-white"></div>`;
    };

    const modalContent = `
        <div class="space-y-6 text-sm">
            <div>
                <h4 class="font-bold text-base mb-2 border-b pb-1">Detail Tugas ${id}</h4>
                <p><strong>ID Transaksi:</strong> ${tugas.id_transaksi_referensi || 'N/A'}</p>
                <p><strong>Pelanggan:</strong> ${tugas.nama_pelanggan}</p>
                <p><strong>Alamat:</strong> ${tugas.alamat}</p>
                <p><strong>Status:</strong> <span class="font-semibold">${tugas.status}</span></p>
            </div>
            <div class="space-y-4">
                ${renderSignature(tugas.tanda_tangan_persetujuan, 'Tanda Tangan Persetujuan')}
                ${renderSignature(tugas.tanda_tangan_selesai, 'Tanda Tangan Selesai')}
            </div>
            <div>
                 <h4 class="font-bold text-base mb-2 border-b pb-1">Galeri Foto</h4>
                 <div class="space-y-3">
                    ${renderPhotoGallery('Dari Pelanggan', tugas.foto_dari_pelanggan)}
                    ${renderPhotoGallery('Before', tugas.foto_before)}
                    ${renderPhotoGallery('After', tugas.foto_after)}
                 </div>
            </div>
        </div>`;
    
    buildDynamicForm(modalContent);
    openFormModal(`Detail Tugas Luar`, null); 
    
    const submitBtn = document.getElementById('formModalSubmitButton');
    if(submitBtn) submitBtn.classList.add('hidden');
}

async function loadAndRenderList() {
    document.querySelectorAll('#tugas-luar-tabs .tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentTugasLuarFilter));
    const container = document.getElementById('tugas-luar-list-container');
    container.innerHTML = `<div class="text-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div></div>`;
    try {
        await loadMasterData();
        const res = await callAppsScriptAPI('getTugasList', { dataSheetName: 'Tugas Luar', filter: currentTugasLuarFilter });
        allTugasLuar = res.response.objects;
        renderTugasLuarList(allTugasLuar);
    } catch (e) { showToast('error', `Gagal memuat tugas luar: ${e.message}`); container.innerHTML = `<p class="text-center text-red-500">Gagal memuat data.</p>`; }
}

// --- FUNGSI-FUNGSI FORM AWAL---

async function loadMasterData() {
    if (masterData.karyawan.length > 0 && masterData.layanan.length > 0) return;
    try { const res = await callAppsScriptAPI('getTugasLuarOptions', {}); masterData = res.response; } catch (e) { showToast('error', 'Gagal memuat data master untuk form.'); masterData = { karyawan: [], layanan: [] }; }
}

function getTugasLuarFormConfig() {
    const karyawanCheckboxes = masterData.karyawan.map(k => `<label class="flex items-center space-x-2"><input type="checkbox" name="tim_pengerjaan" value="${k.id_karyawan}" class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span>${k.nama_lengkap}</span></label>`).join('');
    return `<div class="space-y-4"><input type="hidden" id="id_konsumen" name="id_konsumen"><div class="p-3 bg-gray-50 border rounded-lg"><h4 class="font-bold text-gray-800 mb-2 block">Data Pelanggan *</h4><div class="flex gap-2 mb-2"><input type="text" id="nama_pelanggan" name="nama_pelanggan" class="input-text w-full bg-gray-200" readonly placeholder="Pilih atau buat baru..."><button type="button" id="btn-pilih-konsumen" class="btn-primary flex-shrink-0">Pilih</button></div><input type="text" id="no_telp" name="no_telp" class="input-text w-full mb-2" placeholder="No. Telpon"><textarea id="alamat" name="alamat" class="input-text w-full mb-2" rows="2" placeholder="Alamat"></textarea><input type="text" id="link_peta" name="link_peta" class="input-text w-full" placeholder="Link Peta (Google Maps)"><textarea id="catatan_pelanggan" name="catatan_pelanggan" class="input-text w-full mt-2" rows="2" placeholder="Catatan dari Pelanggan (opsional)"></textarea></div><div class="p-3 bg-gray-50 border rounded-lg"><label class="font-semibold text-gray-800 mb-2 block">Tim yang Bertugas</label><div class="grid grid-cols-2 gap-2">${karyawanCheckboxes}</div></div><div class="p-3 bg-blue-50 border border-blue-200 rounded-lg"><h4 class="font-semibold mb-2 text-gray-800">Rencana Pekerjaan</h4><div class="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-2 items-end"><div class="sm:col-span-2"><label for="layanan_select" class="block text-sm font-medium text-gray-700">Layanan</label><select id="layanan_select" class="input-text w-full mt-1">${masterData.layanan.map(l => `<option value="${l.id_layanan}" data-harga="${l.harga}">${l.layanan}</option>`).join('')}</select></div><div><label for="layanan_harga" class="block text-sm font-medium text-gray-700">Harga Satuan</label><input type="number" id="layanan_harga" class="input-text w-full mt-1"></div><div><label for="layanan_jumlah" class="block text-sm font-medium text-gray-700">Jumlah</label><input type="number" id="layanan_jumlah" value="1" min="1" class="input-text w-full mt-1"></div></div><button type="button" id="btn-add-layanan" class="btn-primary w-full mt-2">Tambahkan Layanan</button><div id="selected-layanan-container" class="mt-3"></div></div><div id="tugas-luar-total-container" class="p-3 border-t mt-4 font-semibold text-lg text-right"></div><div><label for="biaya_transportasi" class="font-semibold text-gray-800">Biaya Transportasi</label><input type="number" id="biaya_transportasi" name="biaya_transportasi" class="input-text w-full mt-1" value="0"></div><div class="grid grid-cols-2 gap-4"><div><label for="tanggal_pengerjaan" class="font-semibold text-gray-800">Tgl Pengerjaan *</label><input type="date" id="tanggal_pengerjaan" name="tanggal_pengerjaan" class="input-text w-full mt-1" required></div><div><label for="jam_mulai" class="font-semibold text-gray-800">Jam Mulai *</label><input type="time" id="jam_mulai" name="jam_mulai" class="input-text w-full mt-1" required></div><div><label for="kode_persetujuan" class="font-semibold text-gray-800">Kode Persetujuan</label><input type="text" id="kode_persetujuan" name="kode_persetujuan" class="input-text w-full mt-1"></div><div><label for="kode_selesai" class="font-semibold text-gray-800">Kode Selesai</label><input type="text" id="kode_selesai" name="kode_selesai" class="input-text w-full mt-1"></div></div><div><label for="foto_dari_pelanggan_input" class="font-semibold text-gray-800">Foto dari Pelanggan (Opsional)</label><input type="file" id="foto_dari_pelanggan_input" class="input-text w-full mt-1" multiple accept="image/*"><div id="image-preview-container" class="mt-2 flex flex-wrap gap-2"></div></div></div>`;
}

function calculateTugasLuarTotal() {
    const totalContainer = document.getElementById('tugas-luar-total-container');
    if (!totalContainer) return;
    const subtotalLayanan = selectedLayanan.reduce((total, item) => total + (parseInt(item.harga) * item.jumlah), 0);
    const biayaTransport = parseInt(document.getElementById('biaya_transportasi').value) || 0;
    const grandTotal = subtotalLayanan + biayaTransport;
    totalContainer.innerHTML = `Estimasi Biaya: Rp ${grandTotal.toLocaleString('id-ID')}`;
}

function setupFormEventListeners() {
    document.getElementById('btn-pilih-konsumen').addEventListener('click', () => {
        openKonsumenModal(
            (selected) => { 
                populateForm({ id_konsumen: selected.id_konsumen, nama_pelanggan: selected.nama_konsumen, no_telp: selected.no_telpon, alamat: selected.alamat, link_peta: selected.peta_lokasi });
                hideKonsumenModal();
            },
            () => { 
                // --- PERBAIKAN ALUR "TAMBAH KONSUMEN BARU" ---
                hideKonsumenModal(); // 1. Tutup modal daftar konsumen

                // 2. Panggil fungsi untuk membuat konsumen. Fungsi ini akan MENGGANTI ISI form yang sedang terbuka
                handleCreateKonsumen((newKonsumen) => {
                    // 3. Ini adalah callback yang berjalan SETELAH konsumen baru berhasil disimpan.
                    //    Saat ini, form 'Tambah Konsumen' masih terlihat.

                    // 4. Kita akan ganti kembali isinya menjadi form 'Tugas Luar'
                    buildDynamicForm(getTugasLuarFormConfig());
                    
                    // 5. Aktifkan kembali semua tombol di form 'Tugas Luar'
                    setupFormEventListeners();
                    
                    // 6. Isi form 'Tugas Luar' dengan data konsumen yang baru dibuat
                    populateForm({ 
                        id_konsumen: newKonsumen.id_konsumen, 
                        nama_pelanggan: newKonsumen.nama_konsumen, 
                        no_telp: newKonsumen.no_telpon, 
                        alamat: newKonsumen.alamat, 
                    });
                    
                    // 7. Kembalikan judul dan tombol Simpan ke fungsi 'Tugas Luar'
                    document.getElementById('formModalLabel').textContent = 'Tambah Tugas Luar Baru';
                    const submitBtn = document.getElementById('formModalSubmitButton');
                    const newSubmitBtn = submitBtn.cloneNode(true); // Buat salinan tombol
                    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn); // Ganti tombol lama untuk hapus listener
                    newSubmitBtn.addEventListener('click', handleFormSubmitTugasLuar); // Tambahkan listener yang benar
                });
            }
        );
    });

    const layananSelect = document.getElementById('layanan_select');
    const hargaInput = document.getElementById('layanan_harga');
    const jumlahInput = document.getElementById('layanan_jumlah');
    
    layananSelect.addEventListener('change', () => {
        const selectedOption = layananSelect.options[layananSelect.selectedIndex];
        hargaInput.value = selectedOption.dataset.harga || 0;
        jumlahInput.value = 1; // Reset jumlah
    });
    layananSelect.dispatchEvent(new Event('change'));

    document.getElementById('btn-add-layanan').addEventListener('click', () => {
        const layananId = layananSelect.value;
        const jumlah = parseInt(jumlahInput.value) || 1;
        const harga = parseInt(hargaInput.value) || 0;
        const layananData = masterData.layanan.find(l => l.id_layanan == layananId);
        if (layananData) {
            if (!selectedLayanan.some(l => l.id_layanan == layananId)) {
                selectedLayanan.push({ ...layananData, harga: harga, jumlah: jumlah });
                updateSelectedLayananList();
            } else {
                showToast('error', 'Layanan sudah ditambahkan.');
            }
        }
    });
    
    document.getElementById('biaya_transportasi').addEventListener('input', calculateTugasLuarTotal);
    
    document.getElementById('foto_dari_pelanggan_input').addEventListener('change', async (event) => {
        newCustomerPhotos = [];
        const files = event.target.files;
        const previewContainer = document.getElementById('image-preview-container');
        if (!files.length || !previewContainer) return;
        previewContainer.innerHTML = '<p class="text-sm w-full text-gray-500">Mengompres...</p>';
        try {
            const compressed = await Promise.all(Array.from(files).map(file => compressImage(file)));
            previewContainer.innerHTML = '';
            newCustomerPhotos = compressed;
            compressed.forEach(imgData => {
                const img = document.createElement('img');
                img.src = `data:image/jpeg;base64,${imgData.base64}`;
                img.className = 'w-16 h-16 object-cover rounded';
                previewContainer.appendChild(img);
            });
        } catch (err) {
            previewContainer.innerHTML = '<p class="text-sm text-red-500">Gagal.</p>';
        }
    });
}

function updateSelectedLayananList() {
    const container = document.getElementById('selected-layanan-container');
    if (!container) return; if (selectedLayanan.length === 0) { container.innerHTML = ''; calculateTugasLuarTotal(); return; }
    container.innerHTML = `<table class="w-full text-sm mt-2"><thead><tr class="border-b"><th class="text-left p-1">Layanan</th><th class="text-center p-1">Jml</th><th class="text-right p-1">Total</th><th></th></tr></thead><tbody>${selectedLayanan.map((item, index) => `
        <tr class="border-b"><td class="p-1">${item.layanan}</td><td class="text-center p-1">${item.jumlah}</td><td class="text-right p-1">Rp ${(item.harga * item.jumlah).toLocaleString('id-ID')}</td><td class="text-center p-1"><button type="button" class="text-red-500 remove-layanan-btn text-lg" data-index="${index}">&times;</button></td></tr>`).join('')}</tbody></table>`;
    document.querySelectorAll('.remove-layanan-btn').forEach(btn => btn.addEventListener('click', e => { selectedLayanan.splice(e.currentTarget.dataset.index, 1); updateSelectedLayananList(); }));
    calculateTugasLuarTotal();
}


// --- FUNGSI HANDLER AKSI (CREATE, EDIT, DELETE AWAL) ---

async function handleCreateTugasLuar() {
    currentTugasLuarId = null; selectedLayanan = []; newCustomerPhotos = [];
    await loadMasterData();
    buildDynamicForm(getTugasLuarFormConfig());
    setupFormEventListeners();
    openFormModal('Tambah Tugas Luar Baru', handleFormSubmitTugasLuar);
}

async function handleEditTugasLuar(id) {
    showToast('info', 'Fungsi edit dinonaktifkan sementara untuk alur kerja baru.');
}

function handleDeleteTugasLuar(id) {
    swal({ title: "Anda Yakin?", text: "Tugas ini akan dihapus secara permanen.", icon: "warning", buttons: ["Batal", "Ya, Hapus"], dangerMode: true, }).then(async (willDelete) => {
        if (willDelete) { try { await callAppsScriptAPI('deleteTugasLuar', { id: id }); showToast('success', 'Tugas berhasil dihapus.'); loadAndRenderList(); } catch (err) { showToast('error', err.message); } }
    });
}

async function handleFormSubmitTugasLuar() {
    const form = document.getElementById('dynamic-form');
    const formData = {};
    const formDataInstance = new FormData(form);
    formDataInstance.forEach((value, key) => { if (key === 'tim_pengerjaan') { if (!formData[key]) formData[key] = []; formData[key].push(value); } else { formData[key] = value; }});
    if (!formData.nama_pelanggan || !formData.tanggal_pengerjaan) return showToast('error', 'Nama Pelanggan dan Tanggal wajib diisi.');
    formData.rencana_pekerjaan = selectedLayanan;
    showLoading();
    try {
        if (newCustomerPhotos.length > 0) {
            const folderId = currentTugasLuarId || `TGL-NEW-${Date.now()}`;
            const uploadPromises = newCustomerPhotos.map(photo => callAppsScriptAPI('uploadImage', { base64: photo.base64, folderId: folderId, type: 'tugas_luar_customer' }));
            const uploadResults = await Promise.all(uploadPromises);
            formData.foto_dari_pelanggan = uploadResults.map(res => res.response.url);
        } else { formData.foto_dari_pelanggan = []; }
        await callAppsScriptAPI('submitTugasLuar', { formData, id: currentTugasLuarId, loggedInUser: currentUser });
        showToast('success', 'Tugas Luar berhasil disimpan.');
        hideFormModal();
        loadAndRenderList();
    } catch(err) { showToast('error', err.message); } finally { hideLoading(); }
}

// --- FUNGSI ALUR KERJA BARU ---

async function handleMulaiSurvey(id) {
    currentTugasLuarId = id;
    newBeforePhotos = [];
    showLoading();
    try {
        const res = await callAppsScriptAPI('getTugasLuarById', { id });
        const tugas = res.response.record;
        hideLoading();

        // Ambil data layanan awal dari `rencana_pekerjaan` atau `detail_layanan_aktual` jika sudah disurvei
        const layananAwal = JSON.parse(tugas.detail_layanan_aktual || tugas.rencana_pekerjaan || '[]');
        
        buildDynamicForm(buildSurveyFormHTML(tugas, layananAwal));
        setupSurveyFormEventListeners(layananAwal, tugas);

        // --- PERBAIKAN ADA DI BARIS INI ---
        // Sekarang kita juga mengirimkan `tugas.biaya_transportasi` ke dalam fungsi
        openFormModal('Laporan Survei & Konfirmasi Pekerjaan', () => handleTampilkanPenawaran(id, tugas.biaya_transportasi));

    } catch(e) { 
        hideLoading(); 
        showToast('error', `Gagal memuat data tugas: ${e.message}`); 
    }
}


function buildSurveyFormHTML(tugas, layananAwal) {
    // PERBAIKAN LAYOUT (grid-cols-4) DAN TOTAL PER BARIS
    const layananDirencanakanHTML = layananAwal.map((item, index) => `
        <div class="p-2 border-b grid grid-cols-4 gap-2 items-center survey-item-row">
            <div>
                <p class="font-semibold text-sm">${item.layanan}</p>
                <p class="text-xs text-gray-500">@ Rp ${parseInt(item.harga).toLocaleString('id-ID')}</p>
            </div>
            <input type="number" value="${item.jumlah}" class="input-text text-center survey-item-jumlah" data-index="${index}" data-harga="${item.harga}">
            <p class="text-sm font-semibold text-right survey-item-total">Rp ${(item.jumlah * item.harga).toLocaleString('id-ID')}</p>
            <button type="button" class="text-red-500 text-xl survey-btn-hapus-layanan" data-index="${index}">&times;</button>
        </div>
    `).join('');
    const transport = parseInt(tugas.biaya_transportasi || '0');
    return `<div class="space-y-4"><div><h4 class="font-bold">Pekerjaan Direncanakan</h4><div id="survey-direncanakan-container">${layananDirencanakanHTML}</div></div><div class="p-3 bg-gray-50 rounded-lg border"><h4 class="font-bold">Pekerjaan Tambahan</h4><div class="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end mt-2"><div class="sm:col-span-2"><label class="text-xs">Layanan</label><select id="survey-layanan-baru" class="input-text w-full">${masterData.layanan.map(l => `<option value="${l.id_layanan}" data-harga="${l.harga}">${l.layanan}</option>`).join('')}</select></div><div><label class="text-xs">Harga</label><input type="number" id="survey-harga-baru" class="input-text w-full"></div><div><label class="text-xs">Jumlah</label><input type="number" id="survey-jumlah-baru" value="1" class="input-text w-full"></div></div><button type="button" id="survey-btn-tambah-layanan" class="btn-primary text-sm w-full mt-2">Tambah Pekerjaan Lain</button></div><div><h4 class="font-bold">Catatan Kondisi Barang</h4><div class="flex gap-2"><input type="text" id="survey-catatan-input" class="input-text w-full" placeholder="Contoh: Noda tinta di sisi kanan"><button type="button" id="survey-btn-tambah-catatan" class="btn-secondary">Tambah</button></div><ul id="survey-catatan-list" class="list-disc list-inside mt-2 text-sm text-gray-700"></ul></div><div><h4 class="font-bold">Foto Before (Wajib)</h4><input type="file" id="survey-foto-before" class="input-text w-full" multiple required><div id="survey-foto-preview" class="flex flex-wrap gap-2 mt-2"></div></div><div class="border-t pt-2 mt-2 space-y-1 text-right"><div class="text-sm">Biaya Transportasi: <span class="font-semibold">Rp ${transport.toLocaleString('id-ID')}</span></div><div id="survey-total-biaya" class="font-bold text-xl"></div></div></div>`;
}

function setupSurveyFormEventListeners(layananAwal, tugas) {
    let layananAktual = JSON.parse(JSON.stringify(layananAwal)); // Deep copy
    let catatanSurvei = [];
    const transport = parseInt(tugas.biaya_transportasi || '0');
    
    const updateTotal = () => {
        const subtotal = layananAktual.reduce((acc, item) => acc + (item.harga * item.jumlah), 0);
        // PERBAIKAN: Tambahkan biaya transport ke total
        const grandTotal = subtotal + transport;
        document.getElementById('survey-total-biaya').innerHTML = `Total Biaya: <span class="text-blue-600">Rp ${grandTotal.toLocaleString('id-ID')}</span>`;
    };

    const renderLayanan = () => {
        const container = document.getElementById('survey-direncanakan-container');
        // PERBAIKAN LAYOUT: Samakan strukturnya dengan 4 kolom
        container.innerHTML = layananAktual.map((item, index) => `
            <div class="p-2 border-b grid grid-cols-4 gap-2 items-center survey-item-row">
                <div><p class="font-semibold text-sm">${item.layanan}</p><p class="text-xs text-gray-500">@ Rp ${parseInt(item.harga).toLocaleString('id-ID')}</p></div>
                <input type="number" value="${item.jumlah}" class="input-text text-center survey-item-jumlah" data-index="${index}" data-harga="${item.harga}">
                <p class="text-sm font-semibold text-right survey-item-total">Rp ${(item.jumlah * item.harga).toLocaleString('id-ID')}</p>
                <button type="button" class="text-red-500 text-xl survey-btn-hapus-layanan" data-index="${index}">&times;</button>
            </div>`).join('');
        updateTotal();
        attachItemListeners();
    };

    const attachItemListeners = () => {
        document.querySelectorAll('.survey-item-jumlah').forEach(input => {
            // PERBAIKAN: Gunakan event 'input' untuk kalkulasi real-time
            input.addEventListener('input', (e) => {
                const index = e.target.dataset.index;
                const newJumlah = parseInt(e.target.value) || 0;
                const harga = parseInt(e.target.dataset.harga) || 0;
                if (newJumlah >= 0) {
                    layananAktual[index].jumlah = newJumlah;
                    // PERBAIKAN: Update total per baris secara langsung
                    const totalElement = e.target.parentElement.querySelector('.survey-item-total');
                    if (totalElement) {
                        totalElement.textContent = `Rp ${(newJumlah * harga).toLocaleString('id-ID')}`;
                    }
                    updateTotal();
                }
            });
        });
        document.querySelectorAll('.survey-btn-hapus-layanan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                layananAktual.splice(e.target.dataset.index, 1);
                renderLayanan();
            });
        });
    };

    const layananBaruSelect = document.getElementById('survey-layanan-baru');
    const hargaBaruInput = document.getElementById('survey-harga-baru');
    layananBaruSelect.addEventListener('change', () => {
        const selectedOption = layananBaruSelect.options[layananBaruSelect.selectedIndex];
        hargaBaruInput.value = selectedOption.dataset.harga || 0;
    });
    layananBaruSelect.dispatchEvent(new Event('change'));

    document.getElementById('survey-btn-tambah-layanan').addEventListener('click', () => {
        const jumlah = parseInt(document.getElementById('survey-jumlah-baru').value) || 1;
        const harga = parseInt(hargaBaruInput.value) || 0;
        const layananData = masterData.layanan.find(l => l.id_layanan == layananBaruSelect.value);
        if (layananData) {
            layananAktual.push({ ...layananData, harga, jumlah });
            renderLayanan();
        }
    });

    const catatanList = document.getElementById('survey-catatan-list');
    document.getElementById('survey-btn-tambah-catatan').addEventListener('click', () => {
        const input = document.getElementById('survey-catatan-input');
        if (input.value.trim()) {
            catatanSurvei.push(input.value.trim());
            catatanList.innerHTML = catatanSurvei.map(c => `<li>${c}</li>`).join('');
            input.value = '';
        }
    });

    document.getElementById('survey-foto-before').addEventListener('change', async (e) => {
        newBeforePhotos = []; const files = e.target.files, preview = document.getElementById('survey-foto-preview'); if (!files.length) return;
        preview.innerHTML = '<p class="text-xs">Mengompres...</p>';
        try { const compressed = await Promise.all(Array.from(files).map(f => compressImage(f))); newBeforePhotos = compressed; preview.innerHTML = compressed.map(c => `<img src="data:image/jpeg;base64,${c.base64}" class="w-16 h-16 rounded object-cover">`).join(''); } catch(err) { preview.innerHTML = '<p class="text-xs text-red-500">Gagal</p>'; }
    });

    updateTotal();
    attachItemListeners();
}

async function handleTampilkanPenawaran(id, biayaTransportAwal) { // <-- PERBAIKAN ADA DI SINI
    const layananAktual = [];
    document.querySelectorAll('.survey-item-row').forEach(row => {
        const jumlahInput = row.querySelector('.survey-item-jumlah');
        const jumlah = parseInt(jumlahInput.value);
        if (jumlah > 0) {
            const index = jumlahInput.dataset.index;
            const harga = parseInt(jumlahInput.dataset.harga);
            const nama = row.querySelector('.font-semibold').textContent;
            const layananData = masterData.layanan.find(l => l.layanan === nama);
            
            if (layananData) {
                layananAktual.push({ 
                    ...layananData, // Salin semua data asli (termasuk id_layanan)
                    layanan: nama, 
                    jumlah, 
                    harga 
                });
            }
        }
    });
    
    if (newBeforePhotos.length === 0) {
        return showToast('error', 'Foto Before wajib diisi.');
    }

    const subtotal = layananAktual.reduce((acc, item) => acc + (item.harga * item.jumlah), 0);
    const biayaFinal = subtotal + parseInt(biayaTransportAwal || '0');
    const catatanSurvei = Array.from(document.querySelectorAll('#survey-catatan-list li')).map(li => li.textContent).join('\n');
    
    showLoading();
    try {
        const uploadPromises = newBeforePhotos.map(photo => callAppsScriptAPI('uploadImage', { base64: photo.base64, folderId: id, type: 'before' }));
        const uploadResults = await Promise.all(uploadPromises);
        const fotoBeforeUrls = uploadResults.map(res => res.response.url);

        const payload = { 
            id, 
            layanan_aktual: layananAktual, 
            catatan_survei: catatanSurvei, 
            biaya_final: biayaFinal, 
            foto_before: fotoBeforeUrls 
        };
        await callAppsScriptAPI('mulaiSurveyTugasLuar', payload);
        
        showToast('success', 'Hasil survei berhasil disimpan.');
        
        // Langsung lanjut ke form persetujuan tanpa menutup modal
        const tugasUpdated = {
            ...allTugasLuar.find(t => t.id_tugas_luar === id),
            detail_layanan_aktual: JSON.stringify(layananAktual),
            catatan_survei: catatanSurvei,
            biaya_final: biayaFinal
        };
        handlePersetujuanSPK(id, tugasUpdated); // Panggil fungsi persetujuan

    } catch(e) {
        showToast('error', `Gagal menyimpan survei: ${e.message}`);
    } finally {
        hideLoading();
    }
}

// --- BAGIAN ALUR PERSETUJUAN SPK ---

async function handlePersetujuanSPK(id) {
    currentTugasLuarId = id;
    showLoading();
    try {
        const res = await callAppsScriptAPI('getTugasLuarById', { id });
        const tugas = res.response.record;
        hideLoading();
        buildDynamicForm(buildApprovalFormHTML(tugas));
        const canvas = document.getElementById('signature-canvas');
        signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgb(255, 255, 255)' });
        document.getElementById('clear-signature-btn').addEventListener('click', () => signaturePad.clear());
        openFormModal('Persetujuan Surat Perintah Kerja', () => handleSubmitPersetujuan(tugas));
    } catch (e) { hideLoading(); showToast('error', `Gagal memuat data persetujuan: ${e.message}`); }
}

function buildApprovalFormHTML(tugas) {
    const layananAktual = JSON.parse(tugas.detail_layanan_aktual || '[]');
    const transport = parseInt(tugas.biaya_transportasi || '0');
    const totalFinal = parseFloat(tugas.biaya_final || '0');

    return `
        <div class="space-y-4">
            <div>
                <h4 class="font-bold mb-1">Detail Pekerjaan & Rincian Biaya</h4>
                <table class="w-full text-sm">
                    <thead><tr class="border-b"><th class="text-left font-semibold p-1">Layanan</th><th class="text-center font-semibold p-1">Jml</th><th class="text-right font-semibold p-1">Total</th></tr></thead>
                    <tbody>
                        ${layananAktual.map(item => `<tr><td class="p-1">${item.layanan}</td><td class="text-center p-1">${item.jumlah}</td><td class="text-right p-1">Rp ${(item.harga * item.jumlah).toLocaleString('id-ID')}</td></tr>`).join('')}
                        <tr><td class="p-1" colspan="2">Biaya Transportasi</td><td class="text-right p-1">Rp ${transport.toLocaleString('id-ID')}</td></tr>
                    </tbody>
                    <tfoot><tr class="border-t-2 font-bold"><td class="p-1" colspan="2">Total Biaya Final</td><td class="text-right p-1">Rp ${totalFinal.toLocaleString('id-ID')}</td></tr></tfoot>
                </table>
            </div>
            <div><h4 class="font-bold mb-1">Catatan Survei</h4><p class="text-sm text-gray-600 italic">${tugas.catatan_survei || 'Tidak ada catatan.'}</p></div>
            <div><label class="flex items-center"><input type="checkbox" id="tos-agree" class="h-4 w-4 text-blue-600 border-gray-300 rounded"><span class="ml-2 text-sm text-gray-700">Pelanggan telah membaca dan menyetujui <a href="#" class="text-blue-600">Syarat & Ketentuan</a>.</span></label></div>
            <div><h4 class="font-bold mb-1">Tanda Tangan Pelanggan</h4><div class="border rounded-md"><canvas id="signature-canvas" class="w-full h-32"></canvas></div><button type="button" id="clear-signature-btn" class="text-xs text-blue-600 mt-1">Hapus Tanda Tangan</button></div>
             <div><label for="form_kode_persetujuan_input" class="font-bold mb-1 block">Kode Persetujuan</label><input type="text" id="form_kode_persetujuan_input" placeholder="Masukkan kode dari pelanggan" class="input-text w-full"></div>
        </div>
    `;
}

async function handleSubmitPersetujuan(tugas) {
    const id = tugas.id_tugas_luar;
    const kodeAsli = tugas.kode_persetujuan;
    const kodeInput = document.getElementById('form_kode_persetujuan_input').value;

    if (!document.getElementById('tos-agree').checked) return showToast('error', 'Centang "Syarat & Ketentuan" untuk melanjutkan.');
    if (signaturePad.isEmpty()) return showToast('error', 'Tanda tangan pelanggan wajib diisi.');
    if (!kodeInput) return showToast('error', 'Kode Persetujuan wajib diisi.');
    if (kodeInput !== kodeAsli) return showToast('error', 'Kode Persetujuan salah!');
    
    const signatureData = signaturePad.toDataURL('image/png');
    showLoading();
    try {
        const payload = { id: id, tanda_tangan: signatureData, kode_persetujuan: kodeInput };
        await callAppsScriptAPI('setujuiSpkTugasLuar', payload);
        showToast('success', 'Pekerjaan disetujui dan dimulai!');
        hideFormModal();
        loadAndRenderList();
    } catch(e) { showToast('error', `Gagal menyimpan persetujuan: ${e.message}`); } finally { hideLoading(); }
}

async function handleSelesaikanPengerjaan(id) {
    currentTugasLuarId = id;
    newAfterPhotos = [];
    showLoading();
    try {
        const res = await callAppsScriptAPI('getTugasLuarById', { id });
        const tugas = res.response.record;
        hideLoading();
        buildDynamicForm(buildCompletionFormHTML(tugas));
        const canvas = document.getElementById('completion-signature-canvas');
        signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgb(255, 255, 255)' });
        document.getElementById('clear-completion-signature-btn').addEventListener('click', () => signaturePad.clear());
        setupCompletionFormEventListeners();
        openFormModal('Konfirmasi Penyelesaian Pekerjaan', () => handleSubmitPenyelesaian(tugas));
    } catch (e) { hideLoading(); showToast('error', `Gagal memuat data penyelesaian: ${e.message}`); }
}

function buildCompletionFormHTML(tugas) {
    const totalFinal = parseFloat(tugas.biaya_final || '0');
    // NOTE: Sisa bayar yang akurat memerlukan data 'jumlah_bayar' dari transaksi terkait.
    // Untuk saat ini, kita asumsikan belum ada DP.
    const sisaBayar = totalFinal; 
    
    return `<div class="space-y-4">
        <div class="p-4 bg-blue-50 text-blue-800 rounded-lg text-center">
            <p class="text-sm">Total Tagihan Final</p>
            <p class="font-bold text-2xl">Rp ${totalFinal.toLocaleString('id-ID')}</p>
            <p class="text-sm mt-1 text-red-600 font-semibold">Sisa Bayar: Rp ${sisaBayar.toLocaleString('id-ID')}</p>
        </div>

        <div>
            <label for="jumlah_pembayaran" class="font-bold mb-1 block">
                Jumlah Pembayaran Diterima (Tunai)
            </label>
            <input type="number" id="jumlah_pembayaran" class="input-text w-full" placeholder="Isi jika pelanggan bayar tunai di tempat">
        </div>

        <div>
            <h4 class="font-bold mb-1">Catatan Hasil Pengerjaan</h4>
            <textarea id="catatan_hasil" class="input-text w-full" rows="3" placeholder="Contoh: Noda hilang, semua bersih."></textarea>
        </div>
        <div>
            <h4 class="font-bold mb-1">Foto After (Bukti Selesai)</h4>
            <input type="file" id="form-foto-after" class="input-text w-full" multiple>
            <div id="after-foto-preview" class="flex flex-wrap gap-2 mt-2"></div>
        </div>
        <div>
            <h4 class="font-bold mb-1">Tanda Tangan Pelanggan</h4>
            <div class="border rounded-md"><canvas id="completion-signature-canvas" class="w-full h-32"></canvas></div>
            <button type="button" id="clear-completion-signature-btn" class="text-xs text-blue-600 mt-1">Hapus Tanda Tangan</button>
        </div>
        <div>
            <label for="form_kode_selesai_input" class="font-bold mb-1 block">Kode Selesai</label>
            <input type="text" id="form_kode_selesai_input" placeholder="Masukkan kode selesai dari pelanggan" class="input-text w-full">
        </div>
    </div>`;
}

function setupCompletionFormEventListeners() {
    document.getElementById('form-foto-after').addEventListener('change', async (e) => {
        newAfterPhotos = []; const files = e.target.files, preview = document.getElementById('after-foto-preview'); if (!files.length) return;
        preview.innerHTML = '<p class="text-xs">Mengompres...</p>';
        try { 
            const compressed = await Promise.all(Array.from(files).map(f => compressImage(f))); 
            newAfterPhotos = compressed; 
            preview.innerHTML = compressed.map(c => `<img src="data:image/jpeg;base64,${c.base64}" class="w-16 h-16 rounded object-cover">`).join('');
        } catch(err) { preview.innerHTML = '<p class="text-xs text-red-500">Gagal</p>'; }
    });
}

async function handleSubmitPenyelesaian(tugas) {
    const id = tugas.id_tugas_luar;
    const kodeAsli = tugas.kode_selesai;
    const kodeInput = document.getElementById('form_kode_selesai_input').value;
    
    if (signaturePad.isEmpty()) return showToast('error', 'Tanda tangan pelanggan wajib diisi.');
    if (!kodeInput) return showToast('error', 'Kode Selesai wajib diisi.');
    if (kodeInput !== kodeAsli) return showToast('error', 'Kode Selesai salah!');
    
    const signatureData = signaturePad.toDataURL('image/png');
    const catatanHasil = document.getElementById('catatan_hasil').value;
    const jumlahPembayaran = document.getElementById('jumlah_pembayaran').value;

    showLoading();
    try {
        const payload = { 
            id: id, 
            tanda_tangan: signatureData, 
            kode_selesai: kodeInput, 
            catatan_hasil: catatanHasil,
            jumlah_pembayaran: jumlahPembayaran || null
        };
        
        if (newAfterPhotos.length > 0) {
            const uploadPromises = newAfterPhotos.map(photo => callAppsScriptAPI('uploadImage', { base64: photo.base64, folderId: id, type: 'after' }));
            const uploadResults = await Promise.all(uploadPromises);
            payload.foto_urls = uploadResults.map(res => res.response.url);
        }

        await callAppsScriptAPI('selesaikanTugasLuar', payload);
        showToast('success', 'Tugas telah berhasil diselesaikan!');
        hideFormModal();
        loadAndRenderList();
    } catch(e) { 
        showToast('error', `Gagal menyelesaikan tugas: ${e.message}`); 
    } finally { 
        hideLoading(); 
    }
}

// --- FUNGSI INISIALISASI HALAMAN ---

export async function initializeTugasLuarPage(user) {
    currentUser = user;
    document.querySelectorAll('#tugas-luar-tabs .tab-button').forEach(btn => btn.addEventListener('click', (e) => { currentTugasLuarFilter = e.target.dataset.filter; loadAndRenderList(); }));
    if (user && user.role.toLowerCase() === 'owner') {
        const btnContainer = document.getElementById('dynamic-button');
        if(btnContainer) {
            btnContainer.innerHTML = `<button id="btn-tambah-tugas-luar" class="btn-primary">Tambah</button>`;
            document.getElementById('btn-tambah-tugas-luar').addEventListener('click', handleCreateTugasLuar);
        }
    }
    currentTugasLuarFilter = 'Aktif';
    await loadAndRenderList();
}