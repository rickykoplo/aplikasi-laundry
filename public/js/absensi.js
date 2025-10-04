/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN ABSENSI
 */

import { callAppsScriptAPI } from './api.js';
import { showToast, waitForElements, showLoading, hideLoading } from './ui.js';

let currentUser = null;
const OFFICE_COORDINATES = {
    latitude: -3.3529917,
    longitude: 114.619152
};
const MAX_DISTANCE_METERS = 500;

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius bumi dalam meter
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // dalam meter
}

function validateLocationAndProceed(callback) {
    showLoading();
    if (!navigator.geolocation) {
        hideLoading();
        showToast('error', 'Browser Anda tidak mendukung geolokasi.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            const distance = getDistance(userLat, userLon, OFFICE_COORDINATES.latitude, OFFICE_COORDINATES.longitude);

            if (distance <= MAX_DISTANCE_METERS) {
                hideLoading();
                callback();
            } else {
                hideLoading();
                showToast('error', `Anda harus berada dalam radius ${MAX_DISTANCE_METERS} meter dari kantor untuk absen.`);
            }
        },
        (error) => {
            hideLoading();
            let message = "Gagal mendapatkan lokasi Anda. ";
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message += "Harap izinkan akses lokasi.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    message += "Informasi lokasi tidak tersedia.";
                    break;
                case error.TIMEOUT:
                    message += "Waktu permintaan lokasi habis.";
                    break;
                default:
                    message += "Terjadi error tidak diketahui.";
                    break;
            }
            showToast('error', message);
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

async function handleAbsen(jenis) {
    validateLocationAndProceed(() => {
        swal({
            title: `Konfirmasi Absen ${jenis}`,
            text: `Apakah Anda yakin ingin mencatat absen ${jenis} sekarang?`,
            icon: "info",
            buttons: ["Batal", "Ya, Lanjutkan"],
        }).then(async (willProceed) => {
            if (willProceed) {
                try {
                    const res = await callAppsScriptAPI('submitAbsen', {
                        type: jenis,
                        username: currentUser.username,
                        namaLengkap: currentUser.namaLengkap
                    });
                    
                    showToast('success', res.response.message);
                    initializeAbsensiPage(currentUser);
                } catch (err) {
                    showToast('error', err.message);
                }
            }
        });
    });
}

async function handleIzinSakit(jenis) {
    swal({
        title: `Konfirmasi ${jenis}`,
        text: `Harap masukkan alasan/keterangan ${jenis.toLowerCase()} Anda hari ini:`,
        icon: "info",
        content: "input",
        buttons: ["Batal", "Kirim"],
    }).then(async (keterangan) => {
        if (keterangan === null) return;
        if (!keterangan || keterangan.trim() === "") {
            swal.stopLoading();
            swal.close();
            showToast('error', 'Keterangan tidak boleh kosong.');
            return;
        }

        try {
            const res = await callAppsScriptAPI('submitIzinSakit', {
                type: jenis,
                username: currentUser.username,
                namaLengkap: currentUser.namaLengkap,
                keterangan: keterangan
            });
            
            showToast('success', res.response.message);
            initializeAbsensiPage(currentUser);
        } catch (err) {
            showToast('error', err.message);
        }
    });
}

export async function initializeAbsensiPage(user) {
    currentUser = user;
    try {
        const [
            tanggalEl, masukStatusEl, keluarStatusEl,
            btnMasuk, btnKeluar, btnIzin, btnSakit,
            infoStatusEl, footerInfoEl
        ] = await waitForElements([
            'absensi-tanggal', 'absen-masuk-status', 'absen-keluar-status',
            'btn-absen-masuk', 'btn-absen-keluar', 'btn-absen-izin', 'btn-absen-sakit',
            'absensi-status-message', 'absensi-footer-info'
        ]);
        
        if (!currentUser || !currentUser.username) {
            throw new Error("Data pengguna tidak valid. Silakan muat ulang halaman.");
        }

        const today = new Date();
        const dayName = today.toLocaleDateString('id-ID', { weekday: 'long' });
        tanggalEl.textContent = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        // PERBAIKAN: Menampilkan pesan jadwal yang lebih baik
        if (currentUser.role.toLowerCase() === 'owner') {
             footerInfoEl.textContent = 'Sebagai Owner, jadwal kerja Anda fleksibel.';
        } else {
             footerInfoEl.textContent = `Jadwal Anda hari ini: Masuk pukul ${currentUser.jamMasukStandar || 'N/A'}. Hari libur: ${currentUser.hariLibur || 'N/A'}.`;
        }

        const res = await callAppsScriptAPI('checkAbsensiStatus', { username: currentUser.username });
        const statusAbsensi = res.response; 
        const { jam_masuk, jam_keluar, status, keterangan } = statusAbsensi || {};

        // Reset UI ke kondisi awal
        const allButtons = [btnMasuk, btnKeluar, btnIzin, btnSakit];
        allButtons.forEach(btn => btn.disabled = false);
        masukStatusEl.textContent = "--:--:--";
        keluarStatusEl.textContent = "--:--:--";
        infoStatusEl.classList.add('hidden');

        if (currentUser.role.toLowerCase() !== 'owner' && currentUser.hariLibur && currentUser.hariLibur.toLowerCase().includes(dayName.toLowerCase())) {
            infoStatusEl.innerHTML = `Hari ini adalah hari libur Anda.`;
            infoStatusEl.classList.remove('hidden');
            allButtons.forEach(btn => btn.disabled = true);
            return;
        }

        if (status === 'Hadir') {
            masukStatusEl.textContent = jam_masuk;
            btnMasuk.disabled = true;
            btnIzin.disabled = true;
            btnSakit.disabled = true;
            if (jam_keluar) {
                keluarStatusEl.textContent = jam_keluar;
                btnKeluar.disabled = true;
            } else {
                btnKeluar.disabled = false;
            }
        } else if (status === 'Izin' || status === 'Sakit') {
            infoStatusEl.innerHTML = `Anda tercatat <strong>${status}</strong> hari ini dengan keterangan: <em>"${keterangan}"</em>`;
            infoStatusEl.classList.remove('hidden');
            allButtons.forEach(btn => btn.disabled = true);
        } else {
            btnKeluar.disabled = true;
        }

        btnMasuk.onclick = () => handleAbsen('Masuk');
        btnKeluar.onclick = () => handleAbsen('Keluar');
        btnIzin.onclick = () => handleIzinSakit('Izin');
        btnSakit.onclick = () => handleIzinSakit('Sakit');

    } catch (err) {
        console.error("Error saat memuat halaman absensi:", err);
        showToast('error', `Error: ${err.message}`);
    }
}
