<?php
/**
 * File: app/modules/dashboard/DashboardController.php
 * Controller untuk modul Dashboard.
 */

class DashboardController
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * FUNGSI LAMA UNTUK DASHBOARD UTAMA
     * Mengambil data ringkasan untuk halaman dashboard utama.
     */
    public function getSummary()
    {
        try {
            $today = date('Y-m-d');
            $summary = [];

            // Query untuk setiap metrik
            $queries = [
                'anjem_aktif' => "SELECT COUNT(*) as total FROM tugas_anjem WHERE status = 'Aktif'",
                'tugas_luar_aktif' => "SELECT COUNT(*) as total FROM tugas_luar WHERE status != 'Selesai'",
                'laundry_aktif' => "SELECT COUNT(*) as total FROM tugas_laundry WHERE status = 'Aktif'",
                'transaksi_aktif' => "SELECT COUNT(*) as total FROM transaksi WHERE status_transaksi = 'Aktif'",
                'karyawan_masuk' => "SELECT COUNT(*) as total FROM absensi WHERE tanggal = '{$today}' AND status = 'Hadir'"
            ];

            foreach ($queries as $key => $sql) {
                $result = $this->conn->query($sql);
                $summary[$key] = (int)($result->fetch_assoc()['total'] ?? 0);
            }

            sendResponse(['summary' => $summary]);

        } catch (Exception $e) {
            sendError(500, "Gagal memuat ringkasan dashboard: " . $e->getMessage());
        }
    }
    
    /**
     * FUNGSI BARU UNTUK RINGKASAN HARIAN
     * Mengambil data statistik dan daftar transaksi untuk halaman ringkasan harian.
     */
    public function getDailySummary()
    {
        try {
            $today = date('Y-m-d');
            $response = [
                'stats' => [],
                'lists' => [
                    'hari_ini' => [],
                    'terlambat' => [],
                    'jatuh_tempo' => [],
                ],
            ];

            // 1. Statistik
            $omsetResult = $this->conn->query("SELECT SUM(total_biaya) as total FROM transaksi WHERE DATE(waktu_antar) = '{$today}' AND status_transaksi != 'Dihapus'");
            $response['stats']['omset_hari_ini'] = (float)($omsetResult->fetch_assoc()['total'] ?? 0);

            $kasResult = $this->conn->query("SELECT SUM(jumlah_bayar) as total FROM transaksi WHERE (status_bayar = 'Lunas' OR status_bayar = 'Tunai Diterima Kurir') AND penyetor_dikonfirmasi_oleh IS NULL AND status_transaksi != 'Dihapus'");
            $response['stats']['total_uang_kasir'] = (float)($kasResult->fetch_assoc()['total'] ?? 0);
            
            $konsumenBaruResult = $this->conn->query("SELECT COUNT(*) as total FROM konsumen WHERE DATE(terdaftar_sejak) = '{$today}'");
            $response['stats']['konsumen_baru_hari_ini'] = (int)($konsumenBaruResult->fetch_assoc()['total'] ?? 0);

            // 2. Daftar Transaksi
            $query_base = "SELECT id_transaksi, nama_pelanggan, status_transaksi, estimasi_selesai, total_biaya, status_bayar FROM transaksi";

            // Transaksi Masuk Hari Ini
            $resultHariIni = $this->conn->query("{$query_base} WHERE DATE(waktu_antar) = '{$today}' AND status_transaksi != 'Dihapus' ORDER BY waktu_antar ASC");
            while ($row = $resultHariIni->fetch_assoc()) {
                $response['lists']['hari_ini'][] = $row;
            }

            // Transaksi Terlambat
            $resultTerlambat = $this->conn->query("{$query_base} WHERE estimasi_selesai < NOW() AND status_transaksi = 'Aktif' ORDER BY estimasi_selesai ASC");
            while ($row = $resultTerlambat->fetch_assoc()) {
                $response['lists']['terlambat'][] = $row;
            }
            
            // Transaksi Jatuh Tempo Hari Ini
            $resultJatuhTempo = $this->conn->query("{$query_base} WHERE DATE(estimasi_selesai) = '{$today}' AND status_transaksi = 'Aktif' ORDER BY estimasi_selesai ASC");
            while ($row = $resultJatuhTempo->fetch_assoc()) {
                $response['lists']['jatuh_tempo'][] = $row;
            }

            sendResponse($response);

        } catch (Exception $e) {
            sendError(500, "Gagal memuat ringkasan harian: " . $e->getMessage());
        }
    }
}