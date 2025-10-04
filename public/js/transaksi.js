/**
 * =================================================================
 * FILE FINAL UNTUK: transaksi.js (VERSI DENGAN PENCARIAN & LAYOUT BARU)
 * - Menambahkan tombol "Cari Layanan" untuk mempermudah pemilihan.
 * - Memindahkan info "Estimasi Selesai" ke posisi yang lebih logis.
 * - Memperbaiki bug icon loading pada progres pengerjaan.
 * - Memformat ulang tampilan Catatan Penyelesaian.
 * - Menambahkan helper escapeHtml.
 * =================================================================
 */
import { callAppsScriptAPI } from './api.js';
import { showToast, waitForElements, showLoading, hideLoading } from './ui.js';
import { 
    openFormModal, 
    hideFormModal, 
    buildDynamicForm, 
    populateForm,
    openKonsumenModal,
    hideKonsumenModal,
    buildKonsumenList,
    handleCreateKonsumen,
    openImageGalleryModal
} from './modals.js';
import { compressImage } from './image-compressor.js';

let currentUser = null;
let allTransactionObjects = [];
let allKonsumenObjects = [];
let currentTransactionId = null;
let currentStatusFilter = 'Aktif';

let masterData = { layanan: [], kecepatan: [], outlets: [], kategori: [] };
let selectedLayanan = [];
let newPhotos = [];

// ==========================================================================
// FUNGSI HELPER ESCAPE HTML
// ==========================================================================
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================
   Helper parsing & utilities
   ============================ */
function ensureObject(data) {
    if (typeof data === 'string') {
        try { 
            return JSON.parse(data || '{}'); 
        } catch (e) { 
            return {}; 
        }
    }
    return data || {};
}

function ensureArray(input) {
    if (!input && input !== 0) return [];
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
        try {
            const parsed = JSON.parse(input);
            if (Array.isArray(parsed)) return parsed;
            return [parsed];
        } catch (err) {
            return input.trim() ? [input] : [];
        }
    }
    if (typeof input === 'object') return [input];
    return [];
}

function formatWaktuSafe(waktu) {
    if (!waktu) return '-';
    try {
        return new Date(waktu).toLocaleString('id-ID', { day: 'numeric', month: 'short', year:'2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
    } catch {
        return waktu;
    }
}

// ==========================================================================
// --- FUNGSI BARU: Logika Pencarian Layanan ---
// ==========================================================================

/**
 * Membuka modal untuk mencari layanan.
 */
function openLayananSearchModal() {
    // Save current form state before overwriting it
    const mainFormElement = document.getElementById('dynamic-form');
    const currentFormData = {};
    if (mainFormElement) {
        new FormData(mainFormElement).forEach((value, key) => {
            currentFormData[key] = value;
        });
    }

    // Buat HTML untuk modal pencarian
    let modalHtml = `
        <div class="space-y-4">
            <input type="search" id="layanan-search-input" class="input-text w-full" placeholder="Ketik untuk mencari nama layanan...">
            <div id="layanan-search-results" class="max-h-64 overflow-y-auto border rounded-md"></div>
        </div>
    `;
    
    // Buka modal dengan fungsi Simpan yang kosong untuk sementara
    buildDynamicForm(modalHtml);
    openFormModal('Cari Layanan', () => {}); 

    const searchInput = document.getElementById('layanan-search-input');
    const resultsContainer = document.getElementById('layanan-search-results');

    const renderResults = (filter = '') => {
        const filteredLayanan = masterData.layanan.filter(l => 
            l.nama_layanan.toLowerCase().includes(filter.toLowerCase())
        );

        if (filteredLayanan.length === 0) {
            resultsContainer.innerHTML = `<p class="p-4 text-center text-gray-500">Layanan tidak ditemukan.</p>`;
            return;
        }

        resultsContainer.innerHTML = filteredLayanan.map(l => `
            <div class="p-3 border-b hover:bg-gray-100 cursor-pointer layanan-search-item" data-layanan-id="${l.id_layanan}">
                <p class="font-semibold">${escapeHtml(l.nama_layanan)}</p>
                <p class="text-sm text-gray-600">${escapeHtml(masterData.kategori.find(k => k.id_kategori == l.id_kategori)?.nama_kategori || '')}</p>
            </div>
        `).join('');
        
        document.querySelectorAll('.layanan-search-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const layananId = e.currentTarget.dataset.layananId;
                const selected = masterData.layanan.find(l => l.id_layanan == layananId);
                if (selected) {
                    // 1. Rebuild the original main transaction form.
                    buildDynamicForm(getTransaksiFormConfig());
                    
                    // 2. Restore the previously entered data (konsumen, outlet, etc.).
                    populateForm(currentFormData);

                    // 3. Re-attach all event listeners to the restored form.
                    setupFormEventListeners();
                    
                    // 4. Re-render the list of selected services from the global array.
                    updateSelectedLayananList();

                    // 5. Now that the form is restored, select the new service.
                    selectLayananAndCategory(selected.id_layanan, selected.id_kategori);
                    
                    // 6. Restore the original modal title.
                    const originalTitle = currentTransactionId ? `Edit Transaksi ${currentTransactionId}` : 'Tambah Transaksi Baru';
                    document.getElementById('formModalLabel').textContent = originalTitle;

                    // --- THIS IS THE FIX ---
                    // 7. Re-attach the correct submit handler to the save button.
                    const submitBtn = document.getElementById('formModalSubmitButton');
                    const newSubmitBtn = submitBtn.cloneNode(true);
                    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
                    newSubmitBtn.addEventListener('click', handleFormSubmit);
                }
            });
        });
    };
    
    searchInput.addEventListener('input', (e) => renderResults(e.target.value));
    renderResults();
}

/**
 * Mengisi form transaksi setelah layanan dipilih dari modal pencarian.
 * @param {string} layananId - ID layanan yang dipilih.
 * @param {string} kategoriId - ID kategori dari layanan yang dipilih.
 */
function selectLayananAndCategory(layananId, kategoriId) {
    const kategoriFilter = document.getElementById('kategori_filter');
    const layananSelect = document.getElementById('layanan_select');

    // 1. Pilih kategori yang benar
    kategoriFilter.value = kategoriId;
    
    // 2. Trigger event 'change' agar dropdown layanan terisi secara otomatis
    // Ini penting untuk menjalankan logika yang sudah ada di `setupFormEventListeners`
    kategoriFilter.dispatchEvent(new Event('change'));

    // 3. Setelah dropdown layanan terisi, pilih layanan yang benar
    layananSelect.value = layananId;

    // 4. Trigger event 'change' pada dropdown layanan agar info harga/min order di-update
    layananSelect.dispatchEvent(new Event('change'));
}


/* ============================
   RENDER FUNCTIONS
   ============================ */
function renderPhotoGallery(title, photosRaw) {
    const photos = ensureArray(photosRaw);
    if (!photos || photos.length === 0) return '';
    
    return `
        <div class="mt-3 flex-1 min-w-[150px]">
            <h6 class="text-xs font-bold text-gray-500 uppercase mb-1">${title}</h6>
            <div class="flex flex-wrap gap-2">
                ${photos.map(photo => `<a href="${photo}" target="_blank"><img src="${photo}" class="w-16 h-16 object-cover rounded-md cursor-pointer hover:scale-110 transition-transform" alt="Thumbnail"></a>`).join('')}
            </div>
        </div>
    `;
}

function renderTransaksiList(objects) {
    const container = document.getElementById('transaksi-list-container');
    if (!container || !objects) return;

    if (objects.length === 0) {
        container.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center text-gray-500">Belum ada transaksi dengan status ini.</div>`;
        return;
    }

    container.innerHTML = objects.map(trx => {
        const layananList = ensureArray(trx.detail_layanan);
        const subtotalLayanan = layananList.reduce((acc, item) => acc + (parseFloat(item.harga || 0) * parseFloat(item.jumlah || 0)), 0);
        const kecepatanInfo = masterData.kecepatan.find(k => k.id_kecepatan == trx.id_kecepatan_layanan);
        const persenBiayaKecepatan = kecepatanInfo ? parseInt(kecepatanInfo.tambahan_harga_persen) || 0 : 0;
        const biayaKecepatan = subtotalLayanan * (persenBiayaKecepatan / 100);
        const biayaTransport = parseFloat(trx.biaya_transport || 0);
        const diskon = parseFloat(trx.diskon || 0);
        const jumlahBayar = parseFloat(trx.jumlah_bayar || 0);
        const totalTagihan = parseFloat(trx.total_biaya || 0);
        const sisaTagihan = totalTagihan - jumlahBayar;
        
        const statusBayarColor = trx.status_bayar === 'Lunas' ? 'bg-green-100 text-green-800' : (trx.status_bayar === 'DP' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800');
        let statusTransaksiColor = 'bg-yellow-100 text-yellow-800';
        if (trx.status_transaksi === 'Selesai') statusTransaksiColor = 'bg-blue-100 text-blue-800';
        else if (trx.status_transaksi === 'Dihapus') statusTransaksiColor = 'bg-gray-100 text-gray-800';
        
        let kekuranganBayarHtml = '';
        if (trx.status_bayar !== 'Lunas' && sisaTagihan > 0) {
            kekuranganBayarHtml = `<div class="mt-1 text-xs font-semibold text-red-600">Kurang: Rp ${sisaTagihan.toLocaleString('id-ID')}</div>`;
        }
        
        let infoAntarHtml = '';
        const sudahLunas = trx.status_bayar === 'Lunas' || trx.status_bayar === 'Lunas & Disetor';

        if (trx.minta_diantar === 'Ya' && !trx.waktu_ambil) {
            // Kondisi 1: Minta diantar, tapi belum diantar
            infoAntarHtml = `<div class="mt-1 text-xs text-blue-600 flex items-center gap-1"><i class="fas fa-truck"></i> Minta Diantar</div>`;
        } else if (trx.minta_diantar === 'Ya' && trx.waktu_ambil && !sudahLunas) {
            // Kondisi 2: Sudah diantar, tapi belum lunas
            infoAntarHtml = `<div class="mt-1 text-xs text-orange-600 flex items-center gap-1"><i class="fas fa-exclamation-circle"></i> Sudah diantar, belum lunas</div>`;
        }

        const waLink = trx.no_telp_pelanggan ? `https://wa.me/${trx.no_telp_pelanggan.replace(/\D/g, '')}` : '#';
        const waButton = trx.no_telp_pelanggan ? `<a href="${waLink}" target="_blank" onclick="event.stopPropagation()" class="text-green-500 hover:text-green-700 ml-2 text-lg"><i class="fab fa-whatsapp"></i></a>` : '';
        
        let layananDetailHtml = 'Tidak ada detail layanan.';
        if (layananList.length > 0) {
            layananDetailHtml = `
                <div class="mb-3"><h6 class="section-title">Detail Layanan</h6></div>
                <table class="w-full text-sm">
                    <thead><tr class="border-b"><th class="text-left font-semibold p-1">Layanan</th><th class="text-center font-semibold p-1">Qty</th><th class="text-right font-semibold p-1">Biaya</th></tr></thead>
                    <tbody>
                        ${layananList.map(l => {
                const subtotalItem = (l.jumlah || 0) * (l.harga || 0);
                // PERBAIKAN DI BARIS BERIKUT:
                const namaLayanan = l.nama_layanan || l.layanan; // Ambil `nama_layanan` atau `layanan`
                const satuan = l.satuan || ''; // Jika satuan tidak ada, gunakan string kosong
                return `<tr class="border-b"><td class="p-1">${escapeHtml(namaLayanan)}</td><td class="text-center p-1">${l.jumlah} ${satuan}</td><td class="text-right p-1 font-semibold">${subtotalItem.toLocaleString('id-ID')}</td></tr>`;
            }).join('')}
                    </tbody>
                </table>
            `;
        }
        
        const renderProsesStatus = (trx, detailLayanan, logPengerjaan) => { 
    
    // TAMBAHKAN BLOK IF DI BAWAH INI
    if (trx.jenis_tugas === 'Tugas Luar') {
        return `<p class="text-xs text-gray-600 p-1"><i class="fas fa-motorcycle mr-2"></i>Pengerjaan di lokasi pelanggan.</p>`;
    }
    // AKHIR BLOK TAMBAHAN
            try {
                const layanan = ensureArray(detailLayanan);
                const log = ensureArray(logPengerjaan);
                
                if (layanan.length === 0) return '<p class="text-xs text-gray-500 italic">Tidak ada detail layanan.</p>';
        
                const kategoriUnikIds = [...new Set(layanan.map(l => l.id_kategori))];
                
                return kategoriUnikIds.map(katId => {
                    const layananDiKategori = layanan.filter(l => l.id_kategori == katId);
                    const semuaLayananSelesai = layananDiKategori.length > 0 && layananDiKategori.every(l => l.status === 'Selesai');

                    const color = semuaLayananSelesai ? 'text-green-600' : 'text-yellow-600';
                    const icon = semuaLayananSelesai ? 'fa-check-circle' : 'fa-spinner';
                    const namaKategori = masterData.kategori.find(k => k.id_kategori == katId)?.nama_kategori || `Kategori ID ${katId}`;
                    
                    const logKategori = log.filter(l => l.id_kategori == katId);
                    let prosesTerakhirHtml = '';
                    if (logKategori.length > 0) {
                        logKategori.sort((a, b) => new Date(b.waktu_selesai) - new Date(a.waktu_selesai));
                        const prosesTerakhir = logKategori[0];
                        prosesTerakhirHtml = `<div class="mt-1 text-xs text-gray-500 flex items-center"><i class="fas fa-check text-green-500 mr-1.5"></i><span>Terakhir: <strong>${prosesTerakhir.nama_proses}</strong></span></div>`;
                    }
                    
                    return `<div class="py-1">
                                <span class="text-xs inline-flex items-center font-semibold ${color}">
                                    <i class="fas ${icon} ${!semuaLayananSelesai ? 'fa-spin' : ''} mr-1.5"></i> ${namaKategori}
                                </span>
                                ${prosesTerakhirHtml}
                            </div>`;
                }).join('<hr class="my-1 border-gray-200">');
            } catch (e) {
                console.error("Error parsing status proses:", e);
                return '<p class="text-xs text-red-500">Error parsing status proses.</p>';
            }
        };

        let catatanSelesaiHtml = '';
        const catatanData = ensureObject(trx.catatan_selesai);
        const catatanEntries = Object.entries(catatanData).filter(([_, catatan]) => catatan && catatan.trim());

        if (catatanEntries.length > 0) {
            catatanSelesaiHtml = catatanEntries.map(([katId, catatan]) => {
                const namaKategori = masterData.kategori.find(k => k.id_kategori == katId)?.nama_kategori || 'Catatan';
                const catatanPerLayanan = catatan.trim().split('\n').filter(line => line.trim());
                const layananNotesHtml = catatanPerLayanan.map(line => {
                    const parts = line.split(':');
                    const layananName = (parts.shift() || '').replace('-', '').trim();
                    const noteText = parts.join(':').trim();
                    return `<li><b>${escapeHtml(layananName)}:</b> ${escapeHtml(noteText)}</li>`;
                }).join('');
                return `<div>
                            <p class="font-bold">${escapeHtml(namaKategori)}:</p>
                            <ul class="list-disc list-inside ml-4 text-sm">
                                ${layananNotesHtml}
                            </ul>
                        </div>`;
            }).join('');
        }
        
        const fotoData = ensureObject(trx.foto_proses);
        const fotoEntries = Object.entries(fotoData).filter(([_, photos]) => Array.isArray(photos) && photos.length > 0);
        const fotoProsesHtml = fotoEntries.length > 0 ? fotoEntries.map(([katId, photos]) => renderPhotoGallery(`Foto Penyelesaian ${masterData.kategori.find(k => k.id_kategori == katId)?.nama_kategori || `ID ${katId}`}`, photos)).join('') : '';

        return `
            <div class="bg-white rounded-lg shadow overflow-hidden mb-4">
                <div class="p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h5 class="font-bold text-lg text-gray-800">${escapeHtml(trx.nama_pelanggan)} (${escapeHtml(trx.id_konsumen)})</h5>
                            <p class="text-sm text-gray-500 font-mono">${escapeHtml(trx.id_transaksi)}</p>
                        </div>
                        <div class="text-right flex-shrink-0 ml-2">
                           <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusTransaksiColor}">${escapeHtml(trx.status_transaksi)}</span>
                           <span class="mt-1 inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusBayarColor}">${escapeHtml(trx.status_bayar)}</span>
                           ${kekuranganBayarHtml}
                           ${infoAntarHtml} 
                        </div>
                    </div>
                    <div class="mt-3 pt-3 border-t">
                        <h6 class="text-xs font-bold text-gray-500 mb-1">PROGRES PENGERJAAN</h6>
                        ${renderProsesStatus(trx, trx.detail_layanan, trx.log_pengerjaan)}
                    </div>
                </div>
                <div class="px-4 pb-2 text-sm space-y-2 border-t">
                    <details>
                        <summary class="cursor-pointer text-blue-600 hover:underline font-semibold text-xs py-2">Lihat Nota / Rincian Biaya</summary>
                        <div class="mt-2 p-3 bg-gray-50 border rounded-md space-y-1">
                            ${layananDetailHtml}
                            <div class="pt-3 mt-3 border-t">
                                <div class="flex justify-between"><span class="text-gray-600">Biaya Layanan</span> <span>Rp ${subtotalLayanan.toLocaleString('id-ID')}</span></div>
                                <div class="flex justify-between"><span class="text-gray-600">Biaya Kecepatan (+${persenBiayaKecepatan}%)</span> <span>Rp ${biayaKecepatan.toLocaleString('id-ID')}</span></div>
                                <div class="flex justify-between"><span class="text-gray-600">Biaya Transport</span> <span>Rp ${biayaTransport.toLocaleString('id-ID')}</span></div>
                                ${diskon > 0 ? `<div class="flex justify-between text-red-500"><span class="font-semibold">Diskon</span> <span>- Rp ${diskon.toLocaleString('id-ID')}</span></div>` : ''}
                                <div class="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>TOTAL TAGIHAN</span> <span>Rp ${totalTagihan.toLocaleString('id-ID')}</span></div>
                                <div class="flex justify-between text-blue-600"><span class="font-semibold">Jumlah Bayar (DP)</span> <span>Rp ${jumlahBayar.toLocaleString('id-ID')}</span></div>
                                ${sisaTagihan > 0 ? `<div class="flex justify-between font-bold text-red-600"><span>SISA TAGIHAN</span> <span>Rp ${sisaTagihan.toLocaleString('id-ID')}</span></div>` : ''}
                                ${sisaTagihan < 0 ? `<div class="flex justify-between font-bold text-green-600"><span>KEMBALIAN</span> <span>Rp ${Math.abs(sisaTagihan).toLocaleString('id-ID')}</span></div>` : ''}
                            </div>
                        </div>
                    </details>
                     <details>
                        <summary class="cursor-pointer text-blue-600 hover:underline font-semibold text-xs py-2">Lihat Detail Lainnya</summary>
                        <div class="p-3 bg-gray-50 border rounded-md space-y-3">
                            <div><h6 class="section-title">Informasi Waktu</h6>
                                <p><strong>Diterima:</strong> ${formatWaktuSafe(trx.waktu_antar)} (oleh ${trx.diterima_oleh || 'N/A'})</p>
                                <p><strong>Estimasi Selesai:</strong> <span class="text-blue-600 font-semibold">${formatWaktuSafe(trx.estimasi_selesai)}</span></p>
                                <p><strong>Diambil:</strong> ${formatWaktuSafe(trx.waktu_ambil)} (oleh ${trx.diserahkan_oleh || 'N/A'})</p>
                            </div>
                            ${trx.catatan ? `<div><h6 class="section-title">Catatan Transaksi</h6><p class="italic text-gray-800">${escapeHtml(trx.catatan)}</p></div>` : ''}
                            ${catatanSelesaiHtml ? `<div><h6 class="section-title">Catatan Penyelesaian</h6><div class="italic text-gray-800 space-y-2">${catatanSelesaiHtml}</div></div>` : ''}
                             <div><h6 class="section-title">Pelanggan & Outlet</h6>
                                <div class="flex items-center"><strong>Telpon:</strong><span class="ml-2">${trx.no_telp_pelanggan || '-'}</span> ${waButton}</div>
                                <p><strong>Alamat:</strong> ${trx.alamat_pelanggan || '-'}</p>
                                <p><strong>Outlet:</strong> ${trx.nama_outlet || '-'}</p>
                            </div>
                        </div>
                    </details>
                    <details>
                        <summary class="cursor-pointer text-blue-600 hover:underline font-semibold text-xs py-2">Lihat Foto</summary>
                        <div class="p-3 bg-gray-50 border rounded-md flex flex-wrap gap-4">
                            ${renderPhotoGallery('Foto Barang Diterima', trx.foto_barang)}
                            ${fotoProsesHtml}
                            ${renderPhotoGallery('Foto Pengambilan', trx.foto_ambil)}
                            ${renderPhotoGallery('Foto Antar', trx.foto_antar)}
                        </div>
                    </details>
                </div>
                <div class="bg-gray-50 p-2 flex justify-end items-center space-x-2">
                    ${trx.status_transaksi === 'Aktif' ? `<button class="btn-action-success btn-proses-ambil" data-id="${trx.id_transaksi}">Selesaikan Transaksi</button>` : ''}
                    ${(currentUser.role === 'owner' && trx.status_transaksi !== 'Dihapus') ? `<button class="btn-action-primary btn-edit-transaksi" data-id="${trx.id_transaksi}">Edit</button>` : ''}
                    ${(currentUser.role === 'owner' && trx.status_transaksi !== 'Dihapus') ? `<button class="btn-action-danger btn-hapus-transaksi" data-id="${trx.id_transaksi}">Hapus</button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    attachActionListeners();
}

function updateSelectedLayananList() {
    const container = document.getElementById('selected-layanan-container');
    if (!container) return;
    if (selectedLayanan.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">Belum ada layanan yang dipilih.</p>';
    } else {
        container.innerHTML = `
            <table class="w-full text-sm">
                <thead><tr class="border-b"><th class="text-left font-semibold p-1">Layanan</th><th class="text-right font-semibold p-1">Qty</th><th class="text-right font-semibold p-1">Subtotal</th><th></th></tr></thead>
                <tbody>
                    ${selectedLayanan.map((item, index) => {
                        const itemSubtotal = item.harga * item.jumlah;
                        return `<tr class="border-b"><td class="p-1">${escapeHtml(item.nama_layanan)}</td><td class="text-right p-1">${item.jumlah} ${escapeHtml(item.satuan)}</td><td class="text-right p-1">${itemSubtotal.toLocaleString('id-ID')}</td><td class="text-center p-1"><button type="button" class="text-red-500 remove-layanan-btn text-2xl" data-index="${index}">&times;</button></td></tr>`;
                    }).join('')}
                </tbody>
            </table>`;
    }
    calculateTotal();
    document.querySelectorAll('.remove-layanan-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedLayanan.splice(e.currentTarget.dataset.index, 1);
            updateSelectedLayananList();
        });
    });
}
function calculateTotal() {
    const totalBiayaEl = document.getElementById('total-biaya-display');
    const bayarInfoEl = document.getElementById('bayar-info');
    // PERUBAHAN: Target elemen estimasi yang baru
    const estimasiInfoEl = document.getElementById('estimasi-container'); 
    if (!totalBiayaEl || !bayarInfoEl || !estimasiInfoEl) return;
    let subtotal = selectedLayanan.reduce((acc, item) => acc + (parseFloat(item.harga || 0) * parseFloat(item.jumlah || 0)), 0);
    const kecepatanEl = document.getElementById('id_kecepatan_layanan');
    const selectedKecepatan = masterData.kecepatan.find(k => k.id_kecepatan == (kecepatanEl ? kecepatanEl.value : ''));
    const persenBiaya = selectedKecepatan ? parseInt(selectedKecepatan.tambahan_harga_persen) || 0 : 0;
    const biayaTambahan = subtotal * (persenBiaya / 100);
    const biayaTransport = parseFloat(document.getElementById('biaya_transport').value) || 0;
    const diskon = parseFloat(document.getElementById('diskon').value) || 0;
    const totalAkhir = subtotal + biayaTambahan + biayaTransport - diskon;
    totalBiayaEl.innerHTML = `
        <div class="space-y-1 text-sm">
            <div class="flex justify-between"><span class="text-gray-600">Subtotal:</span> <span>Rp ${subtotal.toLocaleString('id-ID')}</span></div>
            <div class="flex justify-between"><span class="text-gray-600">Biaya Tambahan (${persenBiaya}%):</span> <span>Rp ${biayaTambahan.toLocaleString('id-ID')}</span></div>
            <div class="flex justify-between"><span class="text-gray-600">Biaya Transport:</span> <span>Rp ${biayaTransport.toLocaleString('id-ID')}</span></div>
            ${diskon > 0 ? `<div class="flex justify-between text-red-500"><span class="font-semibold">Diskon:</span> <span>- Rp ${diskon.toLocaleString('id-ID')}</span></div>` : ''}
        </div>
        <div class="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total Tagihan:</span> <span>Rp ${totalAkhir.toLocaleString('id-ID')}</span></div>
    `;
    document.getElementById('total_biaya').value = totalAkhir;
    let maxDurasiJam = 0;
    selectedLayanan.forEach(item => {
        const layananData = masterData.layanan.find(l => l.id_layanan == item.id_layanan);
        if(layananData) {
            const durasiTotal = (parseInt(layananData.durasi_hari || 0) * 24) + parseInt(layananData.durasi_jam || 0);
            if (durasiTotal > maxDurasiJam) maxDurasiJam = durasiTotal;
        }
    });
    const durasiTetap = selectedKecepatan ? parseInt(selectedKecepatan.pengurang_jam_proses || 0) : 0;
    let finalDurasiJam = (durasiTetap > 0) ? durasiTetap : maxDurasiJam;
    if (selectedLayanan.length > 0) {
        const estimasiDate = new Date();
        estimasiDate.setHours(estimasiDate.getHours() + finalDurasiJam);
        const estimasiFormatted = estimasiDate.toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'});
        estimasiInfoEl.innerHTML = `Estimasi Selesai: <span class="font-bold text-blue-600">${estimasiFormatted}</span>`;
        estimasiInfoEl.classList.remove('hidden');
    } else {
        estimasiInfoEl.classList.add('hidden');
    }
    const jumlahBayar = parseFloat(document.getElementById('jumlah_bayar').value) || 0;
    const sisa = totalAkhir - jumlahBayar;
    if (jumlahBayar > 0 && totalAkhir > 0) {
        bayarInfoEl.classList.remove('hidden');
        if (sisa > 0) bayarInfoEl.innerHTML = `Sisa Bayar: <span class="font-bold text-red-600">Rp ${sisa.toLocaleString('id-ID')}</span>`;
        else if (sisa < 0) bayarInfoEl.innerHTML = `Kembalian: <span class="font-bold text-green-600">Rp ${Math.abs(sisa).toLocaleString('id-ID')}</span>`;
        else bayarInfoEl.innerHTML = `<span class="font-bold text-green-600">Pembayaran Lunas</span>`;
    } else {
        bayarInfoEl.classList.add('hidden');
    }
}
function attachActionListeners() {
    document.querySelectorAll('.btn-proses-ambil').forEach(btn => btn.removeEventListener('click', btn._handler));
    document.querySelectorAll('.btn-edit-transaksi').forEach(btn => btn.removeEventListener('click', btn._handler));
    document.querySelectorAll('.btn-hapus-transaksi').forEach(btn => btn.removeEventListener('click', btn._handler));
    document.querySelectorAll('.btn-proses-ambil').forEach(btn => {
        const handler = (e) => handleProsesAmbil(e.currentTarget.dataset.id);
        btn._handler = handler;
        btn.addEventListener('click', handler);
    });
    document.querySelectorAll('.btn-edit-transaksi').forEach(btn => {
        const handler = (e) => handleEdit(e.currentTarget.dataset.id);
        btn._handler = handler;
        btn.addEventListener('click', handler);
    });
    document.querySelectorAll('.btn-hapus-transaksi').forEach(btn => {
        const handler = (e) => handleDelete(e.currentTarget.dataset.id);
        btn._handler = handler;
        btn.addEventListener('click', handler);
    });
}
function setupTabs() {
    const tabsContainer = document.getElementById('transaksi-status-tabs');
    let statuses = ['Aktif'];
    if (currentUser && currentUser.role.toLowerCase() === 'owner') {
        statuses = ['Aktif', 'Selesai', 'Dihapus'];
    }
    if (!tabsContainer) return;
    tabsContainer.innerHTML = statuses.map(status => `<button class="tab-button" data-status="${status}">${status}</button>`).join('');
    tabsContainer.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentStatusFilter = e.target.dataset.status;
            loadAndRenderList();
        });
    });
    updateTabStyles();
}
function updateTabStyles() {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === currentStatusFilter);
    });
}
function filterList() {
    const searchTermEl = document.getElementById('filter-transaksi');
    const searchTerm = searchTermEl ? searchTermEl.value.toLowerCase() : '';
    if (!allTransactionObjects) return;
    const filtered = allTransactionObjects.filter(trx => 
        (trx.nama_pelanggan || '').toLowerCase().includes(searchTerm) || 
        (trx.id_transaksi || '').toLowerCase().includes(searchTerm) ||
        (trx.no_telp_pelanggan || '').includes(searchTerm)
    );
    renderTransaksiList(filtered);
}
async function loadAndRenderList() {
    updateTabStyles();
    const container = document.getElementById('transaksi-list-container');
    if (container) container.innerHTML = `<div class="text-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div></div>`;
    try {
        const res = await callAppsScriptAPI('getTransaksiList', { statusFilter: currentStatusFilter });
        if (res && res.response && Array.isArray(res.response.objects)) {
            allTransactionObjects = res.response.objects;
        } else {
            allTransactionObjects = [];
        }
        filterList();
    } catch (e) {
        console.error('Gagal memuat transaksi:', e);
        showToast('error', `Gagal memuat transaksi: ${e.message}`);
    }
}
async function handleCreate(selectedKonsumen) {
    currentTransactionId = null;
    selectedLayanan = [];
    newPhotos = [];
    buildDynamicForm(getTransaksiFormConfig());
    if (selectedKonsumen) {
        populateForm({
            id_konsumen: selectedKonsumen.id_konsumen,
            nama_pelanggan: selectedKonsumen.nama_konsumen,
            no_telp_pelanggan: selectedKonsumen.no_telpon,
            alamat_pelanggan: selectedKonsumen.alamat,
        });
    }
    setupFormEventListeners();
    updateSelectedLayananList();
    openFormModal('Tambah Transaksi Baru', handleFormSubmit);
}
async function handleEdit(id) {
    currentTransactionId = id;
    newPhotos = [];
    try {
        const res = await callAppsScriptAPI('getTransaksiById', { id: id });
        const trx = res.response.record;
        if (!trx) return showToast('error', 'Transaksi tidak ditemukan.');
        try {
            selectedLayanan = JSON.parse(trx.detail_layanan || '[]');
        } catch {
            selectedLayanan = [];
        }
        buildDynamicForm(getTransaksiFormConfig(true));
        populateForm(trx);
        if (parseInt(trx.biaya_transport) > 0) {
            document.getElementById('minta_diantar').checked = true;
        }
        setupFormEventListeners();
        const existingPhotosContainer = document.getElementById('existing-photos-container');
        existingPhotosContainer.innerHTML = '<h5>Foto Barang Saat Ini:</h5>';
        let fotoBarang = [];
        if (trx.foto_barang) {
            try {
                fotoBarang = ensureArray(trx.foto_barang);
            } catch {
                fotoBarang = [trx.foto_barang];
            }
        }
        if (Array.isArray(fotoBarang) && fotoBarang.length > 0) {
            existingPhotosContainer.innerHTML += fotoBarang.map(url => `<img src="${url}" class="w-16 h-16 object-cover rounded m-1 inline-block">`).join('');
        } else {
            existingPhotosContainer.innerHTML += '<p class="text-sm text-gray-500">Tidak ada foto.</p>';
        }
        updateSelectedLayananList();
        openFormModal(`Edit Transaksi ${id}`, handleFormSubmit);
    } catch (err) {
        console.error('Gagal memuat data edit:', err);
        showToast('error', `Gagal memuat data edit: ${err.message}`);
    }
}
function handleProsesAmbil(id) {
    currentTransactionId = id;
    newPhotos = [];
    const trx = allTransactionObjects.find(t => t.id_transaksi === id);
    if (!trx) return showToast('error', 'Transaksi tidak ditemukan.');
    const sisaBayar = Math.max(0, parseFloat(trx.total_biaya) - parseFloat(trx.jumlah_bayar));
    const formHtml = `
        <div class="p-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <p>Pelanggan: <strong>${escapeHtml(trx.nama_pelanggan)}</strong></p>
            <p>Total Tagihan: <strong>Rp ${parseInt(trx.total_biaya || 0).toLocaleString('id-ID')}</strong></p>
            <p class="font-bold text-red-600">Sisa Bayar: Rp ${sisaBayar.toLocaleString('id-ID')}</p>
        </div>
        <div class="space-y-4">
            <div>
                <label for="jumlah_bayar" class="block text-sm font-medium text-gray-700 mb-1">Jumlah Pembayaran Baru</label>
                <input type="number" id="jumlah_bayar" name="jumlah_bayar" class="input-text w-full" value="${sisaBayar}" placeholder="Masukkan jumlah pembayaran">
            </div>
            <div>
                <label for="catatan_pembayaran" class="block text-sm font-medium text-gray-700 mb-1">Catatan Pembayaran (Opsional)</label>
                <input type="text" id="catatan_pembayaran" name="catatan_pembayaran" class="input-text w-full" placeholder="cth: Lunas via transfer BCA">
            </div>
            <div>
                <label for="foto_ambil" class="block text-sm font-medium text-gray-700 mb-1">Foto Bukti Ambil/Lainnya (Opsional)</label>
                <input type="file" id="foto_ambil" name="foto_ambil" class="input-text w-full" multiple>
                <div id="image-preview-container" class="mt-2 flex flex-wrap gap-2"></div>
            </div>
        </div>
    `;
    buildDynamicForm(formHtml);
    document.getElementById('foto_ambil').addEventListener('change', handleFileSelect);
    openFormModal('Selesaikan Transaksi & Pembayaran', async () => {
        const payload = {
            id: currentTransactionId,
            jumlah_bayar: document.getElementById('jumlah_bayar').value || 0,
            catatan_pembayaran: document.getElementById('catatan_pembayaran').value || '',
            loggedInUser: currentUser
        };
        if (payload.jumlah_bayar < sisaBayar && sisaBayar > 0) {
            const confirmed = await swal({
                title: "Pembayaran Kurang",
                text: "Jumlah bayar lebih kecil dari sisa tagihan. Transaksi akan tetap aktif dengan status DP. Lanjutkan?",
                icon: "warning",
                buttons: ["Batal", "Ya, Lanjutkan"],
            });
            if (!confirmed) return;
        }
        showLoading();
        try {
            if (newPhotos.length > 0) {
                const uploadPromises = newPhotos.map(photo => callAppsScriptAPI('uploadImage', { 
                    base64: photo.base64, 
                    folderId: currentTransactionId,
                    type: 'ambil' 
                }));
                const uploadResults = await Promise.all(uploadPromises);
                payload.foto_ambil = uploadResults.map(res => res.response.url);
            }
            await callAppsScriptAPI('submitPengambilan', payload);
            showToast('success', 'Transaksi berhasil diperbarui.');
            hideFormModal();
            loadAndRenderList();
        } catch (e) {
            console.error('Gagal proses ambil:', e);
            showToast('error', `Gagal menyimpan: ${e.message}`);
        } finally {
            hideLoading();
        }
    });
}
function handleDelete(id) {
    swal({
        title: "Anda Yakin?",
        text: "Transaksi akan ditandai sebagai 'Dihapus'.",
        icon: "warning",
        buttons: ["Batal", "Ya, Hapus"],
        dangerMode: true,
    }).then(async (willDelete) => {
        if (willDelete) {
            try {
                await callAppsScriptAPI('deleteTransaksi', { id: id });
                showToast('success', 'Transaksi berhasil dihapus.');
                loadAndRenderList();
            } catch (err) {
                console.error('Gagal hapus transaksi:', err);
                showToast('error', err.message);
            }
        }
    });
}
async function handleFormSubmit() {
    const form = document.getElementById('dynamic-form');
    const formData = {};
    new FormData(form).forEach((value, key) => { formData[key] = value; });
    if (selectedLayanan.length === 0) return showToast('error', 'Harap tambahkan minimal satu layanan.');
    if (!formData.id_outlet) return showToast('error', 'Harap pilih outlet.');
    if (!formData.id_konsumen) return showToast('error', 'Harap pilih konsumen.');
    formData.total_biaya = parseFloat(formData.total_biaya) || 0;
    formData.biaya_transport = parseFloat(formData.biaya_transport) || 0;
    formData.jumlah_bayar = parseFloat(formData.jumlah_bayar) || 0;
    showLoading();
    try {
        let uploadedPhotoUrls = [];
        if (newPhotos.length > 0) {
            const folderId = currentTransactionId || `NEW-${Date.now()}`;
            const uploadPromises = newPhotos.map(photo => callAppsScriptAPI('uploadImage', { 
                base64: photo.base64, 
                folderId: folderId,
                type: 'barang'
            }));
            const uploadResults = await Promise.all(uploadPromises);
            uploadedPhotoUrls = uploadResults.map(res => res.response.url);
        }
        formData.detail_layanan = JSON.stringify(selectedLayanan);
        formData.foto_barang = uploadedPhotoUrls;
        await callAppsScriptAPI('submitTransaksi', { 
            formData, 
            id: currentTransactionId, 
            loggedInUser: currentUser 
        });
        showToast('success', 'Transaksi berhasil disimpan.');
        hideFormModal();
        loadAndRenderList();
    } catch (err) {
        console.error('Gagal menyimpan transaksi:', err);
        showToast('error', `Gagal menyimpan transaksi: ${err.message}`);
    } finally {
        hideLoading();
    }
}
async function handleFileSelect(event) {
    const files = event.target.files;
    const previewContainer = document.getElementById('image-preview-container');
    if (previewContainer) previewContainer.innerHTML = '<p class="text-sm w-full text-gray-500">Mengompres gambar...</p>';
    newPhotos = [];
    try {
        const compressedImages = await Promise.all(Array.from(files).map(file => compressImage(file)));
        if (previewContainer) previewContainer.innerHTML = '';
        compressedImages.forEach(imgData => {
            newPhotos.push(imgData);
            const imgElement = document.createElement('img');
            imgElement.src = `data:image/jpeg;base64,${imgData.base64}`;
            imgElement.className = 'w-16 h-16 object-cover rounded';
            if (previewContainer) previewContainer.appendChild(imgElement);
        });
    } catch (err) {
        console.error('Gagal kompres file:', err);
        if (previewContainer) previewContainer.innerHTML = '<p class="text-sm text-red-500">Gagal mengompres gambar.</p>';
    }
}

// ==========================================================================
// --- FUNGSI UTAMA: Konfigurasi Form & Event Listeners (dengan modifikasi) ---
// ==========================================================================
function getTransaksiFormConfig() {
    const outletOptions = masterData.outlets.map(o => ({ value: o.id_outlet, text: o.nama_outlet }));
    const kecepatanOptions = masterData.kecepatan.map(k => ({ value: k.id_kecepatan, text: `${k.nama_kecepatan} (+${k.tambahan_harga_persen}%)` }));
    
    // --- PERUBAHAN DI SINI ---
    return `
        <input type="hidden" id="id_konsumen" name="id_konsumen">
        <input type="hidden" id="total_biaya" name="total_biaya">
        <div class="space-y-4">
            <div>
                <label class="font-semibold text-gray-800">Nama Pelanggan</label>
                <input type="text" id="nama_pelanggan" name="nama_pelanggan" class="input-text w-full mt-1 bg-gray-200" readonly>
            </div>
            <div>
                <label for="no_telp_pelanggan" class="font-semibold text-gray-800">No. Telepon</label>
                <input type="text" id="no_telp_pelanggan" name="no_telp_pelanggan" class="input-text w-full mt-1 bg-gray-200" readonly>
            </div>
            <div>
                <label for="alamat_pelanggan" class="font-semibold text-gray-800">Alamat</label>
                <textarea id="alamat_pelanggan" name="alamat_pelanggan" class="input-text w-full mt-1 bg-gray-200" rows="2" readonly></textarea>
            </div>
            <div>
                 <label for="id_outlet" class="font-semibold text-gray-800">Outlet <span class="text-red-500">*</span></label>
                 <select id="id_outlet" name="id_outlet" class="input-text w-full mt-1">
                    <option value="">Pilih Outlet</option>
                    ${outletOptions.map(o => `<option value="${o.value}">${o.text}</option>`).join('')}
                 </select>
            </div>
            <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 class="font-semibold mb-2 text-gray-800">Tambah Layanan</h4>
                <button type="button" id="btn-search-layanan" class="btn-secondary w-full mb-3"><i class="fas fa-search mr-2"></i>Cari Semua Layanan</button>
                
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 items-end">
                    <div class="sm:col-span-3">
                        <label for="kategori_filter" class="block text-sm font-medium text-gray-700">atau, Pilih Kategori</label>
                        <select id="kategori_filter" class="input-text w-full mt-1">
                            <option value="">Pilih Kategori</option>
                            ${masterData.kategori.map(k => `<option value="${k.id_kategori}">${k.nama_kategori}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label for="layanan_select" class="block text-sm font-medium text-gray-700">Layanan</label>
                        <select id="layanan_select" class="input-text w-full mt-1" disabled></select>
                    </div>
                    <div>
                        <label for="jumlah_input" class="block text-sm font-medium text-gray-700">Jumlah</label>
                        <input type="number" id="jumlah_input" class="input-text w-full mt-1" min="1" value="1" step="0.1" disabled>
                    </div>
                    <button type="button" id="btn-add-layanan" class="btn-primary w-full sm:w-auto" disabled>Tambahkan</button>
                    <div id="layanan-info-display" class="text-xs text-gray-600 sm:col-span-3 mt-2 p-2 bg-blue-100 rounded-md"></div>
                </div>
            </div>
            <div>
                <h4 class="font-semibold mb-2 text-gray-800">Layanan Dipilih</h4>
                <div id="selected-layanan-container" class="p-2 border rounded-md bg-gray-50 min-h-[50px]"></div>
            </div>
            
            <div id="estimasi-container" class="text-center text-sm mb-3 hidden p-2 bg-blue-100 rounded-md"></div>

            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                         <label for="id_kecepatan_layanan" class="font-semibold text-gray-800">Kecepatan</label>
                         <select id="id_kecepatan_layanan" name="id_kecepatan_layanan" class="input-text w-full mt-1">
                            ${kecepatanOptions.map(k => `<option value="${k.value}">${k.text}</option>`).join('')}
                         </select>
                    </div>
                    <div class="pt-2">
                        <label for="minta_diantar" class="flex items-center">
                            <input type="checkbox" id="minta_diantar" name="minta_diantar" class="h-4 w-4 text-blue-600 border-gray-300 rounded">
                            <span class="ml-2 text-sm text-gray-700">Minta Diantar?</span>
                        </label>
                    </div>
                </div>
                <div id="biaya-transport-container" class="hidden">
                    <label for="biaya_transport" class="font-semibold text-gray-800">Biaya Transport</label>
                    <input type="number" id="biaya_transport" name="biaya_transport" class="input-text w-full mt-1" value="0">
                </div>
                <div>
                    <label for="diskon" class="font-semibold text-gray-800">Diskon (Rp)</label>
                    <input type="number" id="diskon" name="diskon" class="input-text w-full mt-1" value="0" placeholder="Masukkan jumlah diskon">
                </div>
            </div>
            <div>
                <label for="catatan" class="font-semibold text-gray-800">Catatan (Opsional)</label>
                <textarea id="catatan" name="catatan" class="input-text w-full mt-1" rows="2" placeholder="Contoh: Baju putih dipisah, jangan pakai pewangi, dll."></textarea>
            </div>
            <div class="mt-2 p-3 border-t-2">
                 <div id="total-biaya-display" class="mb-3"></div>
                 <label for="jumlah_bayar" class="font-semibold text-gray-800">Jumlah Bayar</label>
                 <input type="number" id="jumlah_bayar" name="jumlah_bayar" class="input-text w-full mt-1" placeholder="Masukkan jumlah pembayaran">
                 <div id="bayar-info" class="text-right text-sm mt-2 hidden p-2 bg-yellow-100 rounded-md"></div>
            </div>
            <div>
                <label class="font-semibold text-gray-800">Upload Foto Barang (Opsional)</label>
                <input type="file" id="foto_barang" name="foto_barang" class="input-text w-full mt-1" multiple accept="image/*">
            </div>
        </div>
    `;
}

function setupFormEventListeners() {
    // --- PERUBAHAN: Tambahkan listener untuk tombol cari ---
    const btnSearchLayanan = document.getElementById('btn-search-layanan');
    if (btnSearchLayanan) {
        btnSearchLayanan.addEventListener('click', openLayananSearchModal);
    }
    // --- Akhir Perubahan ---

    const kategoriFilter = document.getElementById('kategori_filter');
    const layananSelect = document.getElementById('layanan_select');
    const jumlahInput = document.getElementById('jumlah_input');
    const btnAddLayanan = document.getElementById('btn-add-layanan');
    const layananInfoDisplay = document.getElementById('layanan-info-display');
    kategoriFilter.addEventListener('change', () => {
        const kategoriId = kategoriFilter.value;
        layananSelect.innerHTML = '<option value="">Pilih Layanan</option>';
        layananSelect.disabled = true;
        jumlahInput.disabled = true;
        btnAddLayanan.disabled = true;
        layananInfoDisplay.innerHTML = '';
        if (kategoriId) {
            const layananFiltered = masterData.layanan.filter(l => l.id_kategori == kategoriId);
            layananFiltered.forEach(l => {
                layananSelect.innerHTML += `<option value="${l.id_layanan}">${l.nama_layanan}</option>`;
            });
            layananSelect.disabled = false;
        }
    });
    layananSelect.addEventListener('change', () => {
        const layananId = layananSelect.value;
        const selected = masterData.layanan.find(l => l.id_layanan == layananId);
        if (selected) {
            jumlahInput.min = selected.min_order;
            jumlahInput.value = selected.min_order;
            jumlahInput.disabled = false;
            btnAddLayanan.disabled = false;
            layananInfoDisplay.innerHTML = `
                Harga: <strong>Rp ${parseInt(selected.harga).toLocaleString('id-ID')} / ${selected.satuan}</strong> | 
                Min. Order: <strong>${selected.min_order} ${selected.satuan}</strong> | 
                Durasi: <strong>${selected.durasi_hari} hari, ${selected.durasi_jam} jam</strong>
            `;
        } else {
            jumlahInput.disabled = true;
            btnAddLayanan.disabled = true;
            layananInfoDisplay.innerHTML = '';
        }
    });
     btnAddLayanan.addEventListener('click', () => {
        const layananId = layananSelect.value;
        const jumlah = parseFloat(jumlahInput.value);
        const layananData = masterData.layanan.find(l => l.id_layanan == layananId);
        if (!layananData) return showToast('error', 'Layanan tidak valid.');
        if (jumlah < layananData.min_order) return showToast('error', `Jumlah minimal adalah ${layananData.min_order}.`);
        selectedLayanan.push({ 
            id_layanan: layananData.id_layanan, 
            nama_layanan: layananData.nama_layanan, 
            harga: layananData.harga, 
            satuan: layananData.satuan, 
            jumlah: jumlah,
            id_kategori: layananData.id_kategori
        });
        updateSelectedLayananList();
    });
   const idKecep = document.getElementById('id_kecepatan_layanan');
    if (idKecep) idKecep.addEventListener('change', calculateTotal);
    const mintaDiantar = document.getElementById('minta_diantar');
    if (mintaDiantar) mintaDiantar.addEventListener('change', (e) => {
        document.getElementById('biaya-transport-container').classList.toggle('hidden', !e.target.checked);
        calculateTotal();
    });
    const biayaTransportEl = document.getElementById('biaya_transport');
    if (biayaTransportEl) biayaTransportEl.addEventListener('input', calculateTotal);
    const diskonEl = document.getElementById('diskon');
    if (diskonEl) diskonEl.addEventListener('input', calculateTotal);
    const jumlahBayarEl = document.getElementById('jumlah_bayar');
    if (jumlahBayarEl) jumlahBayarEl.addEventListener('input', calculateTotal);
    const fotoBarangEl = document.getElementById('foto_barang');
    if (fotoBarangEl) fotoBarangEl.addEventListener('change', handleFileSelect);
}
export async function initializeTransaksiPage(user) {
    currentUser = user;
    try {
        const res = await callAppsScriptAPI('getLayananOptions', {});
        masterData = res.response;
        await waitForElements(['dynamic-button', 'filter-transaksi', 'transaksi-status-tabs']);
        document.getElementById('dynamic-button').innerHTML = `<button id="btn-tambah-transaksi" class="btn-primary">Tambah</button>`;
        document.getElementById('btn-tambah-transaksi').addEventListener('click', () => {
            openKonsumenModal(
                (selectedKonsumen) => {
                    hideKonsumenModal();
                    handleCreate(selectedKonsumen);
                },
                () => {
                    hideKonsumenModal();
                    handleCreateKonsumen((newKonsumen) => {
                        hideFormModal();
                        handleCreate(newKonsumen);
                    });
                }
            );
        });
        window.addEventListener('konsumenSelectedFromDuplicate', (e) => {
            handleCreate(e.detail);
        });
        const filterEl = document.getElementById('filter-transaksi');
        if (filterEl) filterEl.addEventListener('input', filterList);
        setupTabs();
        loadAndRenderList();
    } catch(e) {
        console.error("Gagal inisialisasi halaman transaksi:", e);
        showToast('error', `Gagal inisialisasi halaman transaksi: ${e.message}`);
    }
}