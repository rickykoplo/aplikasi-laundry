/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK MODAL DAN FORM DINAMIS
 */
import { callAppsScriptAPI } from './api.js';
import { showToast } from './ui.js';

let allKonsumenObjects = []; // Simpan data konsumen di sini

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (show) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        } else {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }
}

function initializeModalToggles() {
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.fixed.inset-0');
            if (modal) {
                toggleModal(modal.id, false);
            }
        });
    });
}

export function initializeModals() {
    initializeModalToggles();
    const galleryModal = document.getElementById('imageGalleryModal');
    if (galleryModal) {
        galleryModal.addEventListener('click', (e) => {
            if (e.target.id === 'imageGalleryModal' || e.target.classList.contains('gallery-close-btn')) {
                toggleModal('imageGalleryModal', false);
            }
        });
    }
}

export function openFormModal(title, submitHandler) {
    document.getElementById('formModalLabel').textContent = title;
    
    const submitBtn = document.getElementById('formModalSubmitButton');
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    newSubmitBtn.addEventListener('click', submitHandler);
    
    document.getElementById('existing-photos-container').innerHTML = '';
    document.getElementById('image-preview-container').innerHTML = '';
	// document.getElementById('estimasi-info').classList.add('hidden'); // This line is no longer needed
	
    toggleModal('formModal', true);
}

export function hideFormModal() { toggleModal('formModal', false); }

export function buildDynamicForm(formConfig) {
    const form = document.getElementById('dynamic-form');
    if (!form) return;

    if (typeof formConfig === 'string') {
        form.innerHTML = formConfig;
        return;
    }

    if (Array.isArray(formConfig)) {
        let html = '<div class="space-y-4">';
        formConfig.forEach(field => {
            const required = field.required ? '<span class="text-red-500">*</span>' : '';
            const readonly = field.readonly ? 'readonly' : '';
            const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
            
            // PERBAIKAN: Penambahan kondisi untuk 'customHtml'
            if (field.type === 'customHtml') {
                html += field.html; // Langsung sisipkan HTML yang diberikan
                return; // Lanjutkan ke field berikutnya
            }
			if (field.type === 'hidden') {
    // Jika tipenya hidden, buat inputnya saja tanpa label dan div
    html += `<input type="hidden" name="${field.name}" id="${field.name || field.name}" value="${field.value || ''}">`; // <-- PERBAIKAN DI SINI
    return; // Lanjutkan ke field berikutnya
    }
            html += `<div><label for="${field.name}" class="block text-sm font-medium text-gray-700 mb-1">${field.label} ${required}</label>`;
            
            if (field.type === 'textarea') {
                html += `<textarea name="${field.name}" id="${field.name}" class="input-text w-full" rows="3" ${readonly}>${field.value || ''}</textarea>`;
            } else if (field.type === 'dropdown') {
                html += `<select name="${field.name}" id="${field.name}" class="input-text w-full">`;
                 // Tambahkan opsi default jika ada
                if (field.placeholder) {
                    html += `<option value="">${field.placeholder}</option>`;
                }
                (field.options || []).forEach(opt => {
                    const value = typeof opt === 'object' ? opt.value : opt;
                    const text = typeof opt === 'object' ? opt.text : opt;
                    const selected = field.value == value ? 'selected' : '';
                    html += `<option value="${value}" ${selected}>${text}</option>`;
                });
                html += `</select>`;
            } else {
                 html += `<input type="${field.type || 'text'}" name="${field.name}" id="${field.name}" class="input-text w-full" value="${field.value || ''}" ${placeholder} ${readonly}>`;
            }
            html += '</div>';
        });
        html += '</div>';
        form.innerHTML = html;
    }
}

export function populateForm(data, formId = 'dynamic-form') {
    const form = document.getElementById(formId);
    if (!form) return;

    for (const key in data) {
        const value = data[key];
        const inputs = form.querySelectorAll(`[name="${key}"]`);
        
        inputs.forEach(input => {
            if (input.type === 'file') return;
            
            if (input.type === 'checkbox') {
                input.checked = !!value && value !== '0' && value.toLowerCase() !== 'tidak';
            } else {
                // Ini akan mengisi value untuk semua input lain, termasuk yang tersembunyi
                input.value = value || '';
            }
        });
    }
}

// --- FUNGSI SPESIFIK UNTUK MODAL KONSUMEN ---
export function openKonsumenModal(onSelectCallback, onCreateNewCallback, initialList = null) {
    const duplicateInfo = document.getElementById('duplicate-konsumen-info');
    if (duplicateInfo) duplicateInfo.classList.add('hidden'); // Selalu sembunyikan pesan di awal

    const setupModal = (konsumenList) => {
        allKonsumenObjects = konsumenList; // Simpan daftar saat ini
        buildKonsumenList(konsumenList, onSelectCallback);

        document.getElementById('filter-konsumen').oninput = () => {
            const searchTerm = document.getElementById('filter-konsumen').value.toLowerCase();
            const filtered = allKonsumenObjects.filter(k => 
                (k.nama_konsumen || '').toLowerCase().includes(searchTerm) ||
                (k.no_telpon && k.no_telpon.includes(searchTerm))
            );
            buildKonsumenList(filtered, onSelectCallback);
        };

        const btnTambahBaru = document.getElementById('btn-tambah-konsumen-baru');
        const newBtn = btnTambahBaru.cloneNode(true);
        btnTambahBaru.parentNode.replaceChild(newBtn, btnTambahBaru);
        newBtn.addEventListener('click', () => {
            if (onCreateNewCallback && typeof onCreateNewCallback === 'function') {
                onCreateNewCallback();
            }
        });

        toggleModal('konsumenModal', true);
    };

    if (initialList) {
        // --- INI ADALAH ALUR UNTUK MENAMPILKAN DUPLIKAT ---
        if (duplicateInfo) {
            duplicateInfo.innerHTML = `Nomor telepon sudah terdaftar. Apakah ini salah satu dari pelanggan berikut?`;
            duplicateInfo.classList.remove('hidden');
        }
        setupModal(initialList);
    } else {
        // --- INI ADALAH ALUR NORMAL ---
        callAppsScriptAPI('getKonsumenList', {}).then(res => {
            setupModal(res.response.objects);
        }).catch(err => {
            showToast('error', `Gagal memuat data konsumen: ${err.message}`);
        });
    }
}

export function hideKonsumenModal() { toggleModal('konsumenModal', false); }

export function buildKonsumenList(konsumenList, onSelectCallback) {
    const listContainer = document.getElementById('konsumen-list-container');
    const duplicateInfo = document.getElementById('duplicate-konsumen-info');
    if(duplicateInfo) duplicateInfo.classList.add('hidden');

    if (!konsumenList || konsumenList.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-gray-500">Tidak ada konsumen yang cocok.</p>`;
        return;
    }

    listContainer.innerHTML = konsumenList.map(k => `
        <div class="p-3 border-b hover:bg-gray-100 cursor-pointer konsumen-item" data-id="${k.id_konsumen}">
            <p class="font-semibold">${k.nama_konsumen}</p>
            <p class="text-sm text-gray-600">${k.no_telpon || 'No. Telp tidak ada'}</p>
        </div>
    `).join('');
    
    listContainer.querySelectorAll('.konsumen-item').forEach(item => {
        item.addEventListener('click', () => {
            const selectedId = item.dataset.id;
            const selectedKonsumen = allKonsumenObjects.find(k => k.id_konsumen === selectedId);
            if (onSelectCallback && typeof onSelectCallback === 'function') {
                onSelectCallback(selectedKonsumen);
            }
        });
    });
}

function getKonsumenFormConfig() {
     return `
        <div class="space-y-4">
            <div>
                <label for="nama_konsumen" class="block text-sm font-medium text-gray-700 mb-1">Nama Konsumen <span class="text-red-500">*</span></label>
                <input type="text" id="nama_konsumen" name="nama_konsumen" class="input-text w-full">
            </div>
            <div>
                <label for="no_telpon" class="block text-sm font-medium text-gray-700 mb-1">No. Telepon <span class="text-red-500">*</span></label>
                <input type="text" id="no_telpon" name="no_telpon" class="input-text w-full" placeholder="cth: 08123456789">
            </div>
            <div>
                <label for="alamat" class="block text-sm font-medium text-gray-700 mb-1">Alamat <span class="text-red-500">*</span></label>
                <textarea id="alamat" name="alamat" class="input-text w-full" rows="3"></textarea>
            </div>
            <div>
                <label for="peta_lokasi" class="block text-sm font-medium text-gray-700 mb-1">Link Peta (Google Maps)</label>
                <input type="text" id="peta_lokasi" name="peta_lokasi" class="input-text w-full" placeholder="https://maps.app.goo.gl/...">
            </div>
            <div>
                <label for="catatan" class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea id="catatan" name="catatan" class="input-text w-full" rows="2"></textarea>
            </div>
        </div>
     `;
}

async function handleSaveKonsumen(callbackOnSuccess) {
    const form = document.getElementById('dynamic-form');
    const formData = {};
    new FormData(form).forEach((value, key) => { formData[key] = value; });

    if (!formData.nama_konsumen || !formData.no_telpon) {
        return showToast('error', 'Nama konsumen dan No. Telepon wajib diisi.');
    }
    
    let noTelpon = (formData.no_telpon || '').replace(/\D/g, '');
    if (noTelpon.startsWith('08')) {
        noTelpon = '628' + noTelpon.substring(2);
    }
    formData.no_telpon = noTelpon;

    try {
        const res = await callAppsScriptAPI('submitKonsumen', { formData });
        showToast('success', 'Konsumen baru berhasil disimpan.');
        if (callbackOnSuccess) callbackOnSuccess(res.response.newKonsumen);
    } catch (err) {
        if (err.message && err.message.startsWith('DUPLICATE_PHONE::')) {
            const duplicates = JSON.parse(err.message.replace('DUPLICATE_PHONE::', ''));
            
            hideFormModal(); // Tutup form tambah konsumen
            
            // Panggil openKonsumenModal dengan memberikan daftar duplikat secara langsung
            openKonsumenModal(
                (selected) => { // Fungsi jika pengguna memilih salah satu duplikat
                    hideKonsumenModal();
                    window.dispatchEvent(new CustomEvent('konsumenSelectedFromDuplicate', { detail: selected }));
                },
                null, // Kita tidak perlu callback "buat baru" di sini, karena alurnya sudah jelas
                duplicates // Ini adalah daftar konsumen duplikat yang akan ditampilkan
            );
            
        } else {
            showToast('error', err.message);
        }
    }
}

export function handleCreateKonsumen(callbackOnSuccess) {
    buildDynamicForm(getKonsumenFormConfig());
    openFormModal('Tambah Konsumen Baru', () => handleSaveKonsumen(callbackOnSuccess));
}

export function openImageGalleryModal(images) {
    const galleryContent = document.getElementById('gallery-content');
    if (!galleryContent) return;

    galleryContent.innerHTML = images.map(src => `<img src="${src}" class="w-full h-auto rounded-lg mb-2">`).join('');
    toggleModal('imageGalleryModal', true);
}

