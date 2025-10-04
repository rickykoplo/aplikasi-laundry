/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN LAPORAN ABSENSI (VERSI FINAL LENGKAP)
 */
import { callAppsScriptAPI } from './api.js';
import { showToast, waitForElements } from './ui.js';

let currentUser = null;
let allKaryawan = [];
let allAbsensi = [];

// Fungsi untuk mengisi filter
function setupFilters() {
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    endDateInput.value = today.toISOString().split('T')[0];
    startDateInput.value = sevenDaysAgo.toISOString().split('T')[0];
}

// Fungsi untuk menangani generate laporan
async function handleGenerateReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const employeeSelect = document.getElementById('report-employee');
    const selectedEmployee = (currentUser.role.toLowerCase() === 'owner' && employeeSelect) ? employeeSelect.value : currentUser.namaLengkap;
    const resultsContainer = document.getElementById('report-absensi-results');

    if (!startDate || !endDate) {
        return showToast('error', 'Silakan pilih tanggal mulai dan tanggal selesai.');
    }

    resultsContainer.innerHTML = `<div class="text-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div><p class="mt-2 text-gray-500">Memuat laporan...</p></div>`;

    try {
        const res = await callAppsScriptAPI('getAbsensiReport', { startDate, endDate, employee: selectedEmployee });
        
        allKaryawan = res.response.reportData.karyawanData || [];
        allAbsensi = res.response.reportData.absensiData || [];
        
        displayReportResults();
    } catch (err) {
        console.error("Error saat membuat laporan absensi:", err);
        resultsContainer.innerHTML = `<div class="bg-red-100 text-red-700 p-4 rounded-lg">Gagal membuat laporan: ${err.message}</div>`;
    }
}

// Fungsi untuk menampilkan hasil laporan
function displayReportResults() {
    const resultsContainer = document.getElementById('report-absensi-results');
    const selectedEmployeeName = document.getElementById('report-employee')?.value;

    const karyawanToDisplay = selectedEmployeeName && selectedEmployeeName !== 'Semua Karyawan'
        ? allKaryawan.filter(k => k.nama_lengkap === selectedEmployeeName)
        : allKaryawan;

    if (karyawanToDisplay.length === 0) {
        resultsContainer.innerHTML = `<div class="bg-white p-4 rounded-lg shadow text-center text-gray-500">Tidak ada data karyawan untuk ditampilkan.</div>`;
        return;
    }

    let reportHtml = '<div class="space-y-4">';

    karyawanToDisplay.forEach(karyawan => {
        const absensiKaryawan = allAbsensi.filter(a => a.id_karyawan === karyawan.id_karyawan);
        
        if (absensiKaryawan.length === 0) {
            reportHtml += `
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="font-bold text-lg text-gray-800">${karyawan.nama_lengkap}</h3>
                    <div class="text-center text-sm text-gray-500 py-4 border-t mt-3">
                        Tidak ada data absensi untuk periode ini.
                    </div>
                </div>
            `;
            return;
        }

        let totalHadir = 0, totalIzin = 0, totalSakit = 0, totalTerlambat = 0, totalJamKerjaDetik = 0;
        let totalPulangCepat = 0, totalMenitLembur = 0;
        const jamMasukStandar = karyawan.jam_masuk_standar;

        absensiKaryawan.forEach(absen => {
            switch (absen.status) {
                case 'Hadir':
                    totalHadir++;
                    if (jamMasukStandar && absen.jam_masuk && absen.jam_masuk > jamMasukStandar) {
                        totalTerlambat++;
                    }
                    if (absen.jam_masuk && absen.jam_keluar) {
                        const masuk = new Date(`1970-01-01T${absen.jam_masuk}`);
                        const keluar = new Date(`1970-01-01T${absen.jam_keluar}`);
                        if (keluar > masuk) {
                            const durasiDetik = (keluar - masuk) / 1000;
                            totalJamKerjaDetik += durasiDetik;
                            
                            // Cek hanya jika jam masuk dan pulang standar sudah di-set
if (karyawan.jam_masuk_standar && karyawan.jam_keluar_standar) {
    const standarMasuk = new Date(`1970-01-01T${karyawan.jam_masuk_standar}`);
    const standarKeluar = new Date(`1970-01-01T${karyawan.jam_keluar_standar}`);
    
    // Hitung durasi kerja standar dalam detik
    let standarKerjaDetik = (standarKeluar - standarMasuk) / 1000;
    if (standarKerjaDetik < 0) { // Menangani shift malam yang melewati tengah malam
        standarKerjaDetik += 24 * 3600;
    }

    if (durasiDetik < standarKerjaDetik) {
        totalPulangCepat++;
    } else if (durasiDetik > (standarKerjaDetik + (15 * 60))) { // Toleransi lembur 15 menit
        const lemburDetik = durasiDetik - standarKerjaDetik;
        totalMenitLembur += Math.round(lemburDetik / 60);
    }
}
                        }
                    }
                    break;
                case 'Izin': totalIzin++; break;
                case 'Sakit': totalSakit++; break;
            }
        });

        const jam = Math.floor(totalJamKerjaDetik / 3600);
        const menit = Math.floor((totalJamKerjaDetik % 3600) / 60);
        const totalJamKerjaFormatted = `${jam} jam ${menit} menit`;

        const lemburJam = Math.floor(totalMenitLembur / 60);
        const lemburMenit = totalMenitLembur % 60;
        const totalLemburFormatted = `${lemburJam} jam ${lemburMenit} menit`;

        // --- PERBAIKAN UTAMA ADA DI DALAM BLOK HTML DI BAWAH INI ---
        reportHtml += `
            <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="font-bold text-lg text-gray-800">${karyawan.nama_lengkap}</h3>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 pt-3 border-t">
                    <div class="text-center"><p class="text-2xl font-bold text-green-600">${totalHadir}</p><p class="text-xs text-gray-500">Hadir</p></div>
                    <div class="text-center"><p class="text-2xl font-bold text-red-600">${totalTerlambat}</p><p class="text-xs text-gray-500">Terlambat</p></div>
                    <div class="text-center"><p class="text-2xl font-bold text-orange-500">${totalPulangCepat}</p><p class="text-xs text-gray-500">Pulang Cepat</p></div>
                    <div class="text-center"><p class="text-xl font-bold text-purple-600">${totalLemburFormatted}</p><p class="text-xs text-gray-500">Lembur</p></div>
                    <div class="text-center"><p class="text-2xl font-bold text-yellow-600">${totalIzin}</p><p class="text-xs text-gray-500">Izin</p></div>
                    <div class="text-center"><p class="text-2xl font-bold text-blue-600">${totalSakit}</p><p class="text-xs text-gray-500">Sakit</p></div>
                    <div class="text-center col-span-2">
                        <p class="text-xl font-bold text-gray-700">${totalJamKerjaFormatted}</p>
                        <p class="text-xs text-gray-500">Total Jam Kerja (Hadir)</p>
                    </div>
                </div>
                <details class="mt-3 text-xs"><summary class="cursor-pointer text-blue-600 hover:underline">Lihat Detail Harian</summary>
                    <div class="mt-2 space-y-1 pt-2 border-t">
                        ${absensiKaryawan.map(absen => {
                            const tanggal = new Date(absen.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                            const statusColor = { 'Hadir': 'bg-green-100 text-green-800', 'Izin': 'bg-yellow-100 text-yellow-800', 'Sakit': 'bg-blue-100 text-blue-800' }[absen.status] || 'bg-gray-100';
                            return `<div class="flex justify-between items-center p-1.5 rounded ${statusColor}"><span class="font-semibold">${tanggal}</span><span>${absen.jam_masuk || ''} - ${absen.jam_keluar || ''}</span><span class="font-bold">${absen.status}</span></div>`;
                        }).join('')}
                    </div>
                </details>
            </div>
        `;
    });

    reportHtml += `</div>`;
    resultsContainer.innerHTML = reportHtml;
}

// Fungsi utama inisialisasi halaman
export async function initializeLaporanAbsensiPage(user) {
    currentUser = user;
    try {
        await waitForElements([
            'report-start-date', 'report-end-date', 'generate-report-btn'
        ]);
        
        setupFilters();

        if (currentUser.role.toLowerCase() === 'owner') {
            const employeeContainer = document.getElementById('report-employee-container');
            if (employeeContainer) employeeContainer.classList.remove('hidden');
            
            const employeeSelect = document.getElementById('report-employee');
            if (employeeSelect && !employeeSelect.hasAttribute('data-loading')) {
                employeeSelect.setAttribute('data-loading', 'true');
                employeeSelect.innerHTML = '<option value="Semua Karyawan">Semua Karyawan</option>';
                
                // Tambahkan event listener untuk auto-refresh saat filter diubah
                employeeSelect.addEventListener('change', handleGenerateReport);

                callAppsScriptAPI('getAllKaryawan', {}).then(res => {
                    if (res.response && Array.isArray(res.response.objects)) {
                        res.response.objects.forEach(karyawan => {
                            const option = document.createElement('option');
                            option.value = karyawan.nama_lengkap;
                            option.textContent = karyawan.nama_lengkap;
                            employeeSelect.appendChild(option);
                        });
                    }
                }).finally(() => {
                    employeeSelect.removeAttribute('data-loading');
                });
            }
        }
        
        document.getElementById('generate-report-btn').addEventListener('click', handleGenerateReport);
        handleGenerateReport();

    } catch (err) {
        console.error("Gagal menginisialisasi halaman laporan absensi:", err);
        showToast('error', `Gagal memuat halaman: ${err.message}`);
    }
}