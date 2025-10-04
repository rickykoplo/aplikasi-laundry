/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN PROFIL
 */

import { callAppsScriptAPI } from './api.js';
import { showToast, waitForElements, showLoading, hideLoading } from './ui.js';
import { compressImage } from './image-compressor.js'; // <-- Tambahkan import ini

let currentUser = null;
let newPhoto = null; // <-- Variabel untuk foto baru
let existingPhotoUrl = null; // <-- Variabel untuk URL foto lama

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewElement = document.getElementById('profile-picture-preview');
    previewElement.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Gambar transparan sementara

    try {
        newPhoto = await compressImage(file, { maxWidth: 512, quality: 0.8 });
        previewElement.src = `data:image/jpeg;base64,${newPhoto.base64}`;
    } catch (err) {
        showToast('error', 'Gagal memproses gambar.');
        previewElement.src = existingPhotoUrl || defaultAvatar; // Kembalikan ke foto lama jika gagal
    }
}

async function handleUpdateProfile() {
    showLoading();
    try {
        const payload = {
            username: currentUser.username,
            namaLengkap: document.getElementById('profileNamaLengkap').value,
            alamat: document.getElementById('profileAlamat').value,
            newPassword: document.getElementById('profileNewPassword').value,
            foto_profil: existingPhotoUrl // Mulai dengan URL foto yang ada
        };

        if (!payload.namaLengkap) {
            hideLoading();
            return showToast('error', 'Nama Lengkap tidak boleh kosong.');
        }

        // Jika ada foto baru yang diunggah, proses upload
        if (newPhoto) {
            const res = await callAppsScriptAPI('uploadImage', {
                base64: newPhoto.base64,
                folderId: currentUser.username,
                type: 'karyawan'
            });
            payload.foto_profil = res.response.url; // Gunakan URL baru
        }
        
        // Kirim semua data (termasuk URL foto baru/lama) untuk diupdate
        await callAppsScriptAPI('updateProfile', payload);
        
        // Perbarui data pengguna di localStorage untuk sinkronisasi
        const updatedUser = { ...currentUser, namaLengkap: payload.namaLengkap, alamat: payload.alamat, foto_profil: payload.foto_profil };
        localStorage.setItem('familyLaundryUser', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
        
        hideLoading();
        showToast('success', 'Profil berhasil diperbarui.');
        document.getElementById('profileNewPassword').value = '';
        
    } catch (err) {
        hideLoading();
        console.error("Error updating profile:", err);
        showToast('error', err.message || 'Gagal menyimpan profil.');
    }
}

/**
 * Menginisialisasi Halaman Profil.
 * @param {Object} user - Objek user yang sedang login.
 */
export async function initializeProfilPage(user) {
    currentUser = user;
    newPhoto = null;
    
    // Placeholder default jika tidak ada foto
    const defaultAvatar = "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a0aec0'%3e%3cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3e%3c/svg%3e";

    try {
        await waitForElements([
            'profileUsername', 'profileNamaLengkap', 'profileAlamat', 
            'btn-update-profile', 'profile-picture-preview', 'profile-picture-input'
        ]);

        // Ambil data karyawan terbaru untuk mendapatkan URL foto profil
        const res = await callAppsScriptAPI('getRecordById', { dataSheetName: 'Data Karyawan', id: user.username });
        const latestUserData = res.response.record;
        
        existingPhotoUrl = latestUserData.foto_profil || null;
        
        document.getElementById('profile-picture-preview').src = existingPhotoUrl || defaultAvatar;
        document.getElementById('profileUsername').value = latestUserData.id_karyawan;
        document.getElementById('profileNamaLengkap').value = latestUserData.nama_lengkap;
        document.getElementById('profileAlamat').value = latestUserData.alamat || '';
        
        document.getElementById('profile-picture-input').addEventListener('change', handleFileSelect);
        
        // Ganti event listener agar tidak duplikat
        const updateButton = document.getElementById('btn-update-profile');
        updateButton.replaceWith(updateButton.cloneNode(true));
        document.getElementById('btn-update-profile').addEventListener('click', handleUpdateProfile);

    } catch (err) {
        console.error("Error loading profile:", err);
        showToast("error", err.message || "Gagal memuat form profil.");
    }
}