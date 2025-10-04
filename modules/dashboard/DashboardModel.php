<?php
/**
 * File: app/modules/dashboard/DashboardModel.php
 * Model untuk mengambil data ringkasan dasbor.
 */

class DashboardModel {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getDashboardSummary() {
        $today = date('Y-m-d');
        $summary = [];
        $summary['transaksiAktif'] = $this->conn->query("SELECT COUNT(*) FROM transaksi WHERE status_transaksi = 'Aktif'")->fetch_row()[0] ?? 0;
        $summary['karyawanMasuk'] = $this->conn->query("SELECT COUNT(DISTINCT id_karyawan) FROM absensi WHERE tanggal = '$today' AND status = 'Hadir'")->fetch_row()[0] ?? 0;
        
        // PERBAIKAN: Menggabungkan tugas kiloan dan satuan menjadi tugas laundry
        $queryTugasLaundry = "SELECT COUNT(*) FROM tugas_laundry WHERE status != 'Selesai'";
        $summary['tugasLaundryAktif'] = $this->conn->query($queryTugasLaundry)->fetch_row()[0] ?? 0;
        
        $summary['tugasAnjemAktif'] = $this->conn->query("SELECT COUNT(*) FROM tugas_anjem WHERE status NOT IN ('Selesai', 'terantar', 'terjemput')")->fetch_row()[0] ?? 0;
        $summary['tugasLuarAktif'] = $this->conn->query("SELECT COUNT(*) FROM tugas_luar WHERE status != 'Selesai'")->fetch_row()[0] ?? 0;
        
        return $summary;
    }
}
