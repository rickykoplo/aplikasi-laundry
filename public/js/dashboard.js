import { callAppsScriptAPI } from './api.js';
import { showToast } from './ui.js';
// 1. TAMBAHKAN IMPORT BARIS INI
import { setupDynamicUI } from './main.js';

/**
 * Mengupdate elemen UI di dashboard dengan data yang diterima.
 * @param {string} id - ID elemen HTML.
 * @param {string|number} value - Nilai yang akan ditampilkan.
 */
function updateDashboardValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Mengatur sapaan selamat datang berdasarkan waktu.
 */
/**
 * Mengatur sapaan selamat datang berdasarkan waktu dan nama pengguna.
 */
function setGreeting(user) {
    const greetingElement = document.getElementById('dashboard-greeting');
    if (!greetingElement) return;

    const hour = new Date().getHours();
    let greetingText = 'Selamat Datang';
    if (hour >= 4 && hour < 11) {
        greetingText = 'Selamat Pagi';
    } else if (hour >= 11 && hour < 15) {
        greetingText = 'Selamat Siang';
    } else if (hour >= 15 && hour < 19) {
        greetingText = 'Selamat Sore';
    } else {
        greetingText = 'Selamat Malam';
    }

    // Ambil nama depan pengguna dan tambahkan ke sapaan
    if (user && user.namaLengkap) {
        const firstName = user.namaLengkap.split(' ')[0];
        greetingElement.textContent = `${greetingText}, ${firstName}!`;
    } else {
        greetingElement.textContent = `${greetingText}!`;
    }
}
/**
 * Menampilkan tanggal hari ini.
 */
function setCurrentDate() {
    const dateElement = document.getElementById('dashboard-date');
    if (!dateElement) return;

    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = today.toLocaleDateString('id-ID', options);
}

/**
 * Berkomunikasi dengan Service Worker untuk mendapatkan dan menampilkan versi aplikasi.
 */
function displayAppVersion() {
    const versionElement = document.getElementById('app-version');
    if (!versionElement) return;

    // Pastikan Service Worker sudah aktif dan mengontrol halaman
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        
        // Siapkan listener untuk menerima balasan dari Service Worker
        messageChannel.port1.onmessage = function(event) {
            if (event.data && event.data.version) {
                // Ekstrak nomor versi dari nama cache
                const fullCacheName = event.data.version;
                const version = fullCacheName.split('-').pop(); // Mengambil bagian terakhir, cth: "v1.1.18"
                versionElement.textContent = `Versi: ${version}`;
            }
        };

        // Kirim pesan ke Service Worker dan berikan port untuk membalas
        navigator.serviceWorker.controller.postMessage({ action: 'GET_VERSION' }, [messageChannel.port2]);
    } else {
        versionElement.textContent = 'Versi: (SW tidak aktif)';
    }
}

/**
 * Fungsi inisialisasi utama untuk halaman dashboard.
 * @param {Object} user - Objek pengguna yang sedang login.
 */
export async function initializeDashboardPage(user) {
    // Setup elemen statis terlebih dahulu
    setGreeting(user);
    setCurrentDate();
	displayAppVersion();
    
    // 2. PANGGIL FUNGSINYA DI SINI
    setupDynamicUI(user);
    
    // Panggil API untuk mendapatkan data dinamis
    try {
        const res = await callAppsScriptAPI('getDashboardSummary', {});
        const summary = res.response.summary;

        if (summary) {
            updateDashboardValue('dashboard-anjem-aktif', summary.anjem_aktif);
            updateDashboardValue('dashboard-tugas-luar-aktif', summary.tugas_luar_aktif);
            updateDashboardValue('dashboard-laundry-aktif', summary.laundry_aktif);
            updateDashboardValue('dashboard-transaksi-aktif', summary.transaksi_aktif);
            updateDashboardValue('dashboard-karyawan-masuk', summary.karyawan_masuk);
        }
    } catch (e) {
        console.error("Gagal memuat data dashboard:", e);
        showToast('error', 'Gagal memuat data ringkasan.');
        // Set nilai ke "X" jika gagal memuat
        updateDashboardValue('dashboard-anjem-aktif', 'X');
        updateDashboardValue('dashboard-tugas-luar-aktif', 'X');
        updateDashboardValue('dashboard-laundry-aktif', 'X');
        updateDashboardValue('dashboard-transaksi-aktif', 'X');
        updateDashboardValue('dashboard-karyawan-masuk', 'X');
    }
}