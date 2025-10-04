/**
 * FILE UTAMA APLIKASI
 * Mengelola state global, navigasi, dan inisialisasi.
 */

import { callAppsScriptAPI } from './api.js';
import { showToast, showPage, initializeUI, updateUserIcon } from './ui.js';
import { initializeModals } from './modals.js';

let currentUser = null;

// Konfigurasi untuk setiap 'halaman' dalam aplikasi
// Ganti seluruh objek pageConfig Anda dengan ini
const pageConfig = {
    'dashboard': {
        module: './dashboard.js',
        initializer: 'initializeDashboardPage',
        title: 'Dasbor Utama',
        html: `
            <div class="mb-6">
                <h1 id="dashboard-greeting" class="text-3xl font-bold text-gray-800">Selamat Malam!</h1>
                <p id="dashboard-date" class="text-gray-500">Memuat tanggal...</p>
                <p id="app-version" class="text-xs text-gray-400 mt-1"></p>
            </div>
            <div>
                <h2 class="text-xl font-semibold text-gray-700 mb-4">Ringkasan Hari Ini</h2>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <a href="#tugas-anjem" class="dashboard-card-horizontal justify-between">
                        <div class="flex items-center">
                            <i class="fas fa-truck text-2xl text-blue-500"></i>
                            <p class="font-semibold text-gray-700 ml-4">Tugas Anjem</p>
                        </div>
                        <p class="text-2xl font-bold text-gray-800" id="dashboard-anjem-aktif">...</p>
                    </a>
                    <a href="#tugas-luar" class="dashboard-card-horizontal justify-between">
                        <div class="flex items-center">
                            <i class="fas fa-motorcycle text-2xl text-orange-500"></i>
                            <p class="font-semibold text-gray-700 ml-4">Tugas Luar</p>
                        </div>
                        <p class="text-2xl font-bold text-gray-800" id="dashboard-tugas-luar-aktif">...</p>
                    </a>
                </div>

                <div class="grid grid-cols-3 gap-3">
                    <a href="#menu-tugas" class="dashboard-card">
                        <i class="fas fa-box-open text-2xl text-green-500 mb-2"></i>
                        <p class="text-3xl font-bold text-gray-800" id="dashboard-laundry-aktif">...</p>
                        <p class="text-xs font-semibold text-gray-600 mt-1">Tugas Laundry</p>
                    </a>
                    <a href="#transaksi" class="dashboard-card">
                        <i class="fas fa-cash-register text-2xl text-red-500 mb-2"></i>
                        <p class="text-3xl font-bold text-gray-800" id="dashboard-transaksi-aktif">...</p>
                        <p class="text-xs font-semibold text-gray-600 mt-1">Transaksi Aktif</p>
                    </a>
                    <div class="dashboard-card">
                        <i class="fas fa-users text-2xl text-teal-500 mb-2"></i>
                        <p class="text-3xl font-bold text-gray-800" id="dashboard-karyawan-masuk">...</p>
                        <p class="text-xs font-semibold text-gray-600 mt-1">Karyawan Masuk</p>
                    </div>
                </div>
            </div>
            <div class="mt-6">
                <h2 class="text-xl font-semibold text-gray-700 mb-4">Akses Cepat</h2>
                <div class="grid grid-cols-3 sm:grid-cols-5 gap-3" id="quick-access-container">
                    <a href="#transaksi" id="qa-buat-transaksi" class="quick-access-card"><i class="fas fa-plus-circle text-2xl"></i><span class="font-semibold text-sm mt-2">Buat Transaksi</span></a>
                    <a href="#absensi" id="qa-absensi" class="quick-access-card"><i class="fas fa-fingerprint text-2xl"></i><span class="font-semibold text-sm mt-2">Absensi</span></a>
                </div>
            </div>
        `
    },
	
	'verifikasi-b2b': {
    module: './verifikasi_b2b.js',
    initializer: 'initializeVerifikasiB2BPage',
    title: 'Verifikasi Klien B2B',
    group: 'admin',
    html: `
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Verifikasi Klien B2B</h2>
        <div id="verifikasi-list-container" class="space-y-4"></div>
    `
},
	
    'ringkasan-harian': {
        module: './ringkasan_harian.js',
        initializer: 'initializeRingkasanPage',
        title: 'Ringkasan Harian',
        html: `
            <div class="space-y-6">
                <div>
                    <h2 class="text-xl font-bold text-gray-800 mb-2">Statistik Hari Ini</h2>
                    <div id="stats-container" class="grid grid-cols-2 md:grid-cols-3 gap-4">
                        </div>
                </div>
                <div>
                    <div id="summary-tabs" class="flex items-center space-x-2 mb-4 overflow-x-auto pb-2 border-b">
                        </div>
                    <div id="summary-list-container">
                        </div>
                </div>
            </div>
        `
    },
	
    'menu-tugas': {
        module: './tugas.js',
        initializer: 'initializeTugasPage',
        title: 'Pilih Kategori Tugas',
        html: `<div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="category-list-container"></div>`
    },
    'tugas-luar': {
    module: './tugas_luar.js',
    initializer: 'initializeTugasLuarPage',
    title: 'Tugas Luar',
    group: 'tugas',
    html: `
         <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
            <div>
                <h2 class="text-2xl font-bold text-gray-800">Tugas Luar</h2>
                <p class="text-sm text-gray-500">Kelola dan pantau semua tugas di luar workshop.</p>
            </div>
            <div id="dynamic-button"></div>
        </div>
        
        <div id="tugas-luar-tabs" class="flex items-center space-x-2 mb-4 overflow-x-auto pb-2 border-b">
            <button class="tab-button" data-filter="Aktif">Aktif</button>
            <button class="tab-button" data-filter="Selesai">Selesai</button>
        </div>
        <div id="tugas-luar-list-container" class="space-y-4"></div>
    `
},
    'transaksi': {
        module: './transaksi.js',
        initializer: 'initializeTransaksiPage',
        title: 'Transaksi',
        html: `
            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                <div id="dynamic-button">
                     <button id="btn-tambah-transaksi" class="btn-primary">Tambah</button>
                </div>
                <div class="w-full sm:w-auto">
                     <input type="search" id="filter-transaksi" class="input-text w-full" placeholder="Cari ID atau nama...">
                </div>
            </div>
            <div id="transaksi-status-tabs" class="flex items-center space-x-2 mb-4 overflow-x-auto pb-2">
            </div>
            <div id="transaksi-list-container" class="space-y-4"></div>
        `
    },
     'absensi': {
        module: './absensi.js',
        initializer: 'initializeAbsensiPage',
        title: 'Absensi',
        html: `
            <div class="max-w-md mx-auto">
                 <div class="bg-white p-6 rounded-lg shadow">
                    <h2 id="absensi-tanggal" class="text-center text-xl font-semibold text-gray-700 mb-4">...</h2>
                    <div id="absensi-status-message" class="hidden p-3 mb-4 text-center rounded-lg"></div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="text-center">
                            <p class="text-sm text-gray-500">Absen Masuk</p>
                            <p id="absen-masuk-status" class="text-lg font-bold text-green-600">--:--:--</p>
                        </div>
                        <div class="text-center">
                            <p class="text-sm text-gray-500">Absen Keluar</p>
                            <p id="absen-keluar-status" class="text-lg font-bold text-red-600">--:--:--</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <button id="btn-absen-masuk" class="btn-primary">Masuk</button>
                        <button id="btn-absen-keluar" class="btn-danger">Keluar</button>
                    </div>
                 </div>
                 <div class="bg-white p-4 rounded-lg shadow mt-4 text-center">
                     <p class="text-sm text-gray-600 mb-2">Jika tidak masuk, pilih salah satu:</p>
                     <div class="flex justify-center gap-4">
                        <button id="btn-absen-izin" class="btn-warning">Izin</button>
                        <button id="btn-absen-sakit" class="btn-warning">Sakit</button>
                     </div>
                 </div>
                 <div id="absensi-footer-info" class="mt-4 text-center text-sm text-gray-500 bg-yellow-100 p-3 rounded-lg"></div>
            </div>
        `
    },
    'laporan': {
        title: 'Pilih Jenis Laporan',
        html: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href="#laporan-pendapatan" class="menu-card">
                    <i class="fas fa-dollar-sign text-3xl text-green-500"></i>
                    <span class="mt-2 font-semibold">Laporan Pendapatan</span>
                </a>
                <a href="#laporan-absensi" class="menu-card">
                    <i class="fas fa-user-check text-3xl text-blue-500"></i>
                    <span class="mt-2 font-semibold">Laporan Absensi</span>
                </a>
            </div>
        `
    },
    'laporan-pendapatan': {
        module: './laporan.js',
        initializer: 'initializeLaporanPendapatanPage',
        title: 'Laporan Pendapatan',
        html: `
            <div class="bg-white p-4 rounded-lg shadow">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                        <label for="report-start-date" class="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                        <input type="date" id="report-start-date" class="input-text w-full mt-1">
                    </div>
                    <div>
                        <label for="report-end-date" class="block text-sm font-medium text-gray-700">Tanggal Selesai</label>
                        <input type="date" id="report-end-date" class="input-text w-full mt-1">
                    </div>
                    <button id="generate-report-btn" class="btn-primary w-full sm:w-auto">Tampilkan</button>
                </div>
            </div>
            <div id="report-results-container" class="mt-4"></div>
        `
    },
    'laporan-absensi': {
        module: './laporan_absensi.js',
        initializer: 'initializeLaporanAbsensiPage',
        title: 'Laporan Absensi',
        html: `
            <div class="bg-white p-4 rounded-lg shadow">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label for="report-start-date" class="block text-sm font-medium text-gray-700">Tgl Mulai</label>
                        <input type="date" id="report-start-date" class="input-text w-full mt-1">
                    </div>
                    <div>
                        <label for="report-end-date" class="block text-sm font-medium text-gray-700">Tgl Selesai</label>
                        <input type="date" id="report-end-date" class="input-text w-full mt-1">
                    </div>
                    <div id="report-employee-container" class="hidden">
                        <label for="report-employee" class="block text-sm font-medium text-gray-700">Karyawan</label>
                        <select id="report-employee" class="input-text w-full mt-1"></select>
                    </div>
                    <button id="generate-report-btn" class="btn-primary w-full">Tampilkan</button>
                </div>
            </div>
            <div id="report-absensi-results" class="mt-4"></div>
        `
    },
    'profil': {
        module: './profil.js',
        initializer: 'initializeProfilPage',
        title: 'Profil Saya',
        html: `
            <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
                <div class="flex flex-col items-center mb-6">
                    <img id="profile-picture-preview" src="" alt="Foto Profil" class="w-24 h-24 rounded-full object-cover mb-4 bg-gray-200">
                    <label for="profile-picture-input" class="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 px-4 rounded-lg">
                        Ganti Foto
                    </label>
                    <input type="file" id="profile-picture-input" class="hidden" accept="image/*">
                </div>
                <div class="space-y-4">
                    <div>
                        <label for="profileUsername" class="block text-sm font-medium text-gray-700">ID Karyawan</label>
                        <input type="text" id="profileUsername" class="input-text w-full mt-1 bg-gray-100" readonly>
                    </div>
                    <div>
                        <label for="profileNamaLengkap" class="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                        <input type="text" id="profileNamaLengkap" class="input-text w-full mt-1">
                    </div>
                    <div>
                        <label for="profileAlamat" class="block text-sm font-medium text-gray-700">Alamat</label>
                        <textarea id="profileAlamat" rows="3" class="input-text w-full mt-1"></textarea>
                    </div>
                    <div>
                        <label for="profileNewPassword" class="block text-sm font-medium text-gray-700">Password Baru (opsional)</label>
                        <input type="password" id="profileNewPassword" class="input-text w-full mt-1" placeholder="Isi untuk mengubah password">
                    </div>
                    <button id="btn-update-profile" class="btn-primary w-full">Simpan Perubahan</button>
                </div>
            </div>
        `
    },
    'admin': {
        title: 'Menu Admin',
        html: `
            <div class="grid grid-cols-2 gap-4">
                <a href="#karyawan" class="menu-card">
                    <i class="fas fa-user-tie text-3xl text-gray-600"></i>
                    <span class="mt-2 font-semibold">Data Karyawan</span>
                </a>
                <a href="#outlet" class="menu-card">
                    <i class="fas fa-store text-3xl text-gray-600"></i>
                    <span class="mt-2 font-semibold">Data Outlet</span>
                </a>
                <a href="#data-konsumen" class="menu-card">
                    <i class="fas fa-users text-3xl text-gray-600"></i>
                    <span class="mt-2 font-semibold">Data Konsumen</span>
                </a>
                 <a href="#pengaturan-admin" class="menu-card">
                    <i class="fas fa-cogs text-3xl text-gray-600"></i>
                    <span class="mt-2 font-semibold">Pengaturan</span>
                </a>
                <a href="#konfirmasi-setoran" class="menu-card">
                    <i class="fas fa-hand-holding-usd text-3xl text-green-600"></i>
                    <span class="mt-2 font-semibold">Setoran Kas Kurir</span>
                </a>
				'<a href="#verifikasi-b2b" class="menu-card bg-yellow-50 text-yellow-800"> Verifikasi B2B </a>'
            </div>
        `
    },
    'konfirmasi-setoran': {
        module: './setoran_kas.js',
        initializer: 'initializeSetoranKasPage',
        title: 'Konfirmasi Setoran Kas',
        group: 'admin',
        html: `
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Setoran Kas Kurir</h2>
                    <p class="text-sm text-gray-500">Konfirmasi uang tunai yang diterima dari kurir.</p>
                </div>
            </div>
            <div id="setoran-kas-container" class="space-y-6"></div>
        `
    },
    'pengaturan-admin': {
        title: 'Pengaturan',
        group: 'admin',
        html: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href="#data-layanan" class="menu-card">
                    <i class="fas fa-box-open text-3xl text-blue-500"></i>
                    <span class="mt-2 font-semibold">Data Layanan</span>
                </a>
				<a href="#layanan-b2b" class="menu-card">
    				<i class="fas fa-building text-3xl text-indigo-500"></i>
   					 <span class="mt-2 font-semibold">Layanan B2B</span>
				</a>
                <a href="#data-kecepatan" class="menu-card">
                    <i class="fas fa-shipping-fast text-3xl text-purple-500"></i>
                    <span class="mt-2 font-semibold">Kecepatan Layanan</span>
                </a>
                <a href="#data-kategori" class="menu-card">
                    <i class="fas fa-tags text-3xl text-yellow-500"></i>
                    <span class="mt-2 font-semibold">Kategori Layanan</span>
                </a>
                 <a href="#settings" class="menu-card">
                    <i class="fas fa-tasks text-3xl text-indigo-500"></i>
                    <span class="mt-2 font-semibold">Pengaturan Proses</span>
                </a>
				<a href="#manajemen-shift" class="menu-card">
   					 <i class="fas fa-clock text-3xl text-cyan-500"></i>
   					 <span class="mt-2 font-semibold">Manajemen Shift</span>
				</a>
            </div>
        `
    },
    'karyawan': {
        module: './karyawan.js',
        initializer: 'initializeKaryawanPage',
        title: 'Data Karyawan',
        group: 'admin',
        html: `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">Manajemen Karyawan</h2>
                <div id="dynamic-button"></div>
            </div>
            <div id="karyawan-list-container" class="space-y-4"></div>
        `
    },
    'outlet': {
        module: './outlet.js',
        initializer: 'initializeOutletPage',
        title: 'Data Outlet',
        group: 'admin',
        html: `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">Manajemen Outlet</h2>
                <div id="dynamic-button"></div>
            </div>
            <div id="outlet-list-container" class="space-y-4"></div>
        `
    },
    'data-konsumen': {
        module: './konsumen.js',
        initializer: 'initializeKonsumenPage',
        title: 'Data Konsumen',
        group: 'admin',
        html: `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">Manajemen Konsumen</h2>
            </div>
            <div id="konsumen-list-container" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
        `
    },
    'data-layanan': {
        module: './layanan.js',
        initializer: 'initializeLayananPage',
        title: 'Data Layanan',
        group: 'admin',
        html: `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">Manajemen Layanan</h2>
                <div id="dynamic-button"></div>
            </div>
            <div id="layanan-list-container"></div>
        `
    },
    'data-kecepatan': {
        module: './kecepatan.js',
        initializer: 'initializeKecepatanPage',
        title: 'Kecepatan Layanan',
        group: 'admin',
        html: `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">Manajemen Kecepatan</h2>
                <div id="dynamic-button"></div>
            </div>
            <div id="kecepatan-list-container"></div>
        `
    },
    'data-kategori': {
        module: './kategori.js',
        initializer: 'initializeKategoriPage',
        title: 'Kategori Layanan',
        group: 'admin',
        html: `
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">Manajemen Kategori</h2>
                <div id="dynamic-button"></div>
            </div>
            <div id="kategori-list-container"></div>
        `
    },
	
	'layanan-b2b': {
    module: './layanan_b2b.js',
    initializer: 'initializeLayananB2BPage',
    title: 'Manajemen Layanan B2B',
    group: 'admin',
    html: `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-800">Layanan B2B</h2>
        </div>
        <div class="mb-4">
            <label for="konsumen-b2b-select" class="block text-sm font-medium text-gray-700 mb-1">Pilih Klien untuk Dikelola Layanannya:</label>
            <select id="konsumen-b2b-select" class="input-text w-full"></select>
        </div>
        <div class="flex justify-end mb-4">
            <button id="btn-tambah-layanan-b2b" class="btn-primary" disabled>Tambah Layanan</button>
        </div>
        <div id="layanan-b2b-list-container" class="space-y-4"></div>
    `
},
	
    'settings': {
        module: './settings.js',
        initializer: 'initializeSettingsPage',
        title: 'Pengaturan Proses',
        group: 'admin',
        html: `
             <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">Pengaturan Proses Kerja</h2>
            </div>
            <div id="settings-container" class="space-y-6"></div>
        `
    },
	'manajemen-shift': {
    module: './shift.js',
    initializer: 'initializeShiftPage',
    title: 'Manajemen Shift',
    group: 'admin',
    html: `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-800">Manajemen Shift</h2>
            <button id="btn-tambah-shift" class="btn-primary">Tambah Shift</button>
        </div>
        <div id="shift-list-container" class="space-y-4"></div>
    `
},
	
    'proses-kerja': {
        module: './proses_kerja.js',
        initializer: 'initializeProsesKerjaPage',
        title: 'Manajemen Proses Kerja',
        group: 'admin',
        html: `
             <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-800">Manajemen Proses Kerja</h2>
                 <button id="btn-tambah-proses" class="btn-primary">Tambah Proses</button>
            </div>
            <div id="proses-kerja-list-container"></div>
        `
    }
};

const bottomMenuLinks = [
    { hash: '#dashboard', icon: 'fas fa-home', text: 'Dasbor' },
    { hash: '#menu-tugas', icon: 'fas fa-clipboard-list', text: 'Tugas', group: 'tugas' },
    { hash: '#transaksi', icon: 'fas fa-cash-register', text: 'Transaksi' },
    { hash: '#laporan', icon: 'fas fa-chart-pie', text: 'Laporan', group: 'laporan' },
];

async function loadContentByHash() {
    let hash = window.location.hash.substring(1) || 'dashboard';
    let config = pageConfig[hash];

    if (!config && hash.startsWith('tugas-')) {
        const hashParts = hash.split('/');
        const sheetNamePart = hashParts[0];
        const kategoriId = hashParts[1] || null;

        const categorySlug = sheetNamePart.substring(6);
        const categoryName = categorySlug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
            
        const fullTitle = `Tugas ${categoryName}`;

        config = {
            module: './tugas.js',
            initializer: 'initializeTugasPage',
            params: [sheetNamePart, kategoriId], // PERBAIKAN: Kirim parameter secara terpisah
            title: fullTitle,
            group: 'tugas',
            html: `
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800">${fullTitle}</h2>
                         <p class="text-sm text-gray-500">Kelola dan pantau tugas kategori ${categoryName}</p>
                    </div>
                     <a href="#menu-tugas" class="text-blue-600 hover:underline">
                        <i class="fas fa-arrow-left mr-2"></i>Kembali
                     </a>
                </div>
                <div class="mb-4">
                     <input type="search" id="filter-search" class="input-text w-full" placeholder="Cari nama pelanggan...">
                </div>
                <div id="tugas-list-container" class="space-y-4"></div>
            `
        };
    }

    if (!config) {
        window.location.hash = 'dashboard';
        return;
    }
    
    document.getElementById('page-title').textContent = config.title || 'Family Laundry';
    
    document.querySelectorAll('.bottom-nav-link').forEach(link => {
        const linkHash = link.getAttribute('href');
        const linkGroup = link.dataset.group;
        const configGroup = config.group;

        if (linkHash === `#${hash}` || (linkGroup && hash.startsWith(linkGroup)) || (linkGroup && configGroup && linkGroup === configGroup)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    const contentContainer = document.getElementById('page-content-container');
    contentContainer.innerHTML = config.html || '<div class="text-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div></div>';
    
    if (config.module && config.initializer) {
        try {
            const pageModule = await import(config.module);
            if (typeof pageModule[config.initializer] === 'function') {
                 await pageModule[config.initializer](currentUser, ...(config.params || []));
            } else {
                console.error(`Gagal: Inisialisasi '${config.initializer}' bukan fungsi di modul '${config.module}'.`);
            }
        } catch (error) {
            console.error(`Gagal memuat atau menginisialisasi modul untuk #${hash}:`, error);
            showToast('error', 'Gagal memuat halaman.');
        }
    }
}

export function setupDynamicUI(user) {
    if (user.role.toLowerCase() === 'owner') {
        const quickAccessContainer = document.getElementById('quick-access-container');
        
        // --- PERBAIKAN DI SINI ---
        // Cek dulu apakah tombol untuk owner sudah ada atau belum
        if (quickAccessContainer && !document.getElementById('qa-tambah-tugas-luar')) {
            // Jika belum ada, baru tambahkan
            quickAccessContainer.innerHTML += `
                <a href="#tugas-luar" id="qa-tambah-tugas-luar" class="quick-access-card"><i class="fas fa-plus-circle text-2xl"></i><span class="font-semibold text-lg">Tugas Luar</span></a>
                <a href="#laporan" id="qa-lihat-laporan" class="quick-access-card"><i class="fas fa-chart-line text-2xl"></i><span class="font-semibold text-lg">Lihat Laporan</span></a>
                <a href="#ringkasan-harian" class="quick-access-card bg-blue-50 text-blue-800 col-span-2"><i class="fas fa-calendar-day text-2xl"></i><span class="font-semibold text-lg">Ringkasan Harian</span></a>
            `;
        }
    }
}
	
function renderBottomMenu() {
    const bottomMenuContainer = document.getElementById('bottom-nav-menu');
    let finalMenuLinks = [...bottomMenuLinks];

    if (currentUser?.role?.toLowerCase() === 'owner') {
        finalMenuLinks.push({ hash: '#admin', icon: 'fas fa-user-shield', text: 'Admin', group: 'admin' });
    }

    bottomMenuContainer.innerHTML = finalMenuLinks.map(link => `
        <a href="${link.hash}" class="bottom-nav-link" data-group="${link.group || ''}">
            <i class="${link.icon}"></i>
            <span class="text-xs mt-1">${link.text}</span>
        </a>
    `).join('');
}

function initializeApp(user) {
    currentUser = user;
    window.currentUser = user; // Biarkan ini untuk debugging sementara
    showPage('app-content');
    initializeUI(user);
	updateUserIcon(user);
    initializeModals();
    renderBottomMenu();
    // 2. HAPUS BARIS DI BAWAH INI
    // setupDynamicUI(user); 

    const currentHash = window.location.hash;
    if (!currentHash || currentHash === '#') {
        window.location.hash = 'dashboard';
    }
    loadContentByHash(); 
    
    window.addEventListener('hashchange', loadContentByHash);
    
    window.addEventListener('userUpdated', (e) => {
    currentUser = e.detail;
    window.currentUser = e.detail;
    updateUserIcon(e.detail); // <-- TAMBAHKAN BARIS INI
});
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) return showToast("error", "ID & password harus diisi.");
    
    callAppsScriptAPI('login', { username, password })
        .then(res => {
            if (res.response?.userData) {
                localStorage.setItem('familyLaundryUser', JSON.stringify(res.response.userData));
                initializeApp(res.response.userData);
            }
        })
        .catch(err => {
            showToast('error', err.message);
        });
}

document.addEventListener('DOMContentLoaded', () => {
    showPage('login-page');

    const storedUser = localStorage.getItem('familyLaundryUser');
    if (storedUser) {
        try {
            initializeApp(JSON.parse(storedUser));
        } catch(e) {
            localStorage.removeItem('familyLaundryUser');
        }
    }

    document.getElementById('login-form').addEventListener('submit', handleLogin);
});


