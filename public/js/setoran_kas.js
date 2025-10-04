/**
 * FILE INI BERISI SEMUA LOGIKA UNTUK HALAMAN KONFIRMASI SETORAN KAS
 */
import { callAppsScriptAPI } from './api.js';
import { showToast, waitForElements } from './ui.js';

let currentUser = null;

/**
 * Merender daftar setoran yang belum dikonfirmasi, dikelompokkan per kurir.
 * @param {Array} deposits - Daftar objek transaksi setoran.
 */
function renderList(deposits) {
    const container = document.getElementById('setoran-kas-container');
    if (!container) return;

    if (!deposits || deposits.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow text-center text-gray-500">
                <i class="fas fa-check-circle text-4xl text-green-500 mb-3"></i>
                <h3 class="text-lg font-semibold text-gray-800">Semua Setoran Terkonfirmasi</h3>
                <p class="mt-1">Tidak ada setoran yang menunggu untuk dikonfirmasi saat ini.</p>
            </div>`;
        return;
    }

    // Kelompokkan transaksi berdasarkan nama kurir
    const groupedByCourier = deposits.reduce((acc, trx) => {
        const courier = trx.diserahkan_oleh || 'Tidak Diketahui';
        if (!acc[courier]) {
            acc[courier] = [];
        }
        acc[courier].push(trx);
        return acc;
    }, {});

    let totalPending = 0;
    container.innerHTML = Object.entries(groupedByCourier).map(([courier, transactions]) => {
        let courierTotal = 0;
        const transactionRows = transactions.map(trx => {
            // Ekstrak jumlah uang dari catatan pembayaran
            const match = (trx.catatan_pembayaran || '').match(/Tunai Rp([\d.,]+)/);
            const amount = match ? parseInt(match[1].replace(/[^0-9]/g, '')) : 0;
            courierTotal += amount;
            
            return `
                <div class="flex justify-between items-center py-2 border-b">
                    <div>
                        <p class="text-sm font-semibold text-gray-700">${trx.nama_pelanggan}</p>
                        <p class="text-xs text-gray-500 font-mono">${trx.id_transaksi}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-bold text-gray-800">Rp ${amount.toLocaleString('id-ID')}</p>
                        <button class="btn-action-success text-xs mt-1 btn-konfirmasi-setoran" data-id="${trx.id_transaksi}">
                            <i class="fas fa-check"></i> Konfirmasi Terima
                        </button>
                    </div>
                </div>`;
        }).join('');
        
        totalPending += courierTotal;

        return `
            <div class="bg-white p-4 rounded-lg shadow">
                <div class="flex justify-between items-center mb-3 pb-3 border-b">
                    <h3 class="text-lg font-bold text-gray-800">${courier}</h3>
                    <div class="text-right">
                        <span class="text-sm text-gray-500">Total Setoran</span>
                        <p class="text-xl font-bold text-blue-600">Rp ${courierTotal.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div class="space-y-2">
                    ${transactionRows}
                </div>
            </div>`;

    }).join('');

    // Tambahkan event listener ke tombol yang baru dibuat
    document.querySelectorAll('.btn-konfirmasi-setoran').forEach(btn => {
        btn.addEventListener('click', (e) => handleConfirm(e.currentTarget.dataset.id));
    });
}

/**
 * Menangani klik pada tombol konfirmasi.
 * @param {string} transactionId - ID transaksi yang akan dikonfirmasi.
 */
function handleConfirm(transactionId) {
    swal({
        title: "Konfirmasi Penerimaan Uang?",
        text: `Anda akan mengonfirmasi bahwa uang untuk transaksi ${transactionId} telah diterima di kas.`,
        icon: "warning",
        buttons: ["Batal", "Ya, Konfirmasi!"],
        dangerMode: false,
    }).then(async (willConfirm) => {
        if (willConfirm) {
            try {
                await callAppsScriptAPI('konfirmasiSetoran', { id: transactionId, loggedInUser: currentUser });
                showToast('success', 'Setoran berhasil dikonfirmasi.');
                loadAndRenderList(); // Muat ulang daftar setelah konfirmasi
            } catch (err) {
                showToast('error', `Gagal mengonfirmasi: ${err.message}`);
            }
        }
    });
}

/**
 * Memuat data dari server dan memulai proses render.
 */
async function loadAndRenderList() {
    const container = document.getElementById('setoran-kas-container');
    container.innerHTML = `<div class="text-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div><p class="mt-2 text-gray-500">Memuat data setoran...</p></div>`;

    try {
        const res = await callAppsScriptAPI('getListSetoran', {});
        renderList(res.response.deposits);
    } catch (e) {
        showToast('error', `Gagal memuat data: ${e.message}`);
        container.innerHTML = `<div class="bg-red-100 text-red-700 p-4 rounded-lg">Gagal memuat data dari server.</div>`;
    }
}

/**
 * Fungsi inisialisasi utama untuk halaman ini.
 * @param {Object} user - Objek pengguna yang sedang login.
 */
export async function initializeSetoranKasPage(user) {
    currentUser = user;
    try {
        await waitForElements(['setoran-kas-container']);
        await loadAndRenderList();
    } catch (err) {
        console.error("Gagal menginisialisasi halaman setoran kas:", err);
    }
}