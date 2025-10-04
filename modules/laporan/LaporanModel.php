<?php
/**
 * File: app/modules/laporan/LaporanModel.php
 * Model untuk mengambil data laporan. (VERSI SEDERHANA FINAL)
 */

class LaporanModel {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getRevenueReport($startDate, $endDate) {
        if (empty($startDate) || empty($endDate)) return [];
        
        $stmt = $this->conn->prepare("SELECT SUM(total_biaya), COUNT(*) FROM transaksi WHERE status_bayar = 'Lunas' AND DATE(waktu_antar) BETWEEN ? AND ?");
        $stmt->bind_param("ss", $startDate, $endDate);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_row();
        
        $totalPendapatan = $result[0] ?? 0;
        $totalTransaksiLunas = $result[1] ?? 0;
        $avgPendapatan = ($totalTransaksiLunas > 0) ? ($totalPendapatan / $totalTransaksiLunas) : 0;

        return [
            'totalPendapatan' => $totalPendapatan,
            'totalTransaksiLunas' => $totalTransaksiLunas,
            'avgPendapatan' => $avgPendapatan
        ];
    }

    public function getAbsensiReport($startDate, $endDate, $employee) {
    if (empty($startDate) || empty($endDate)) {
        return ['karyawanData' => [], 'absensiData' => []];
    }

    // 1. Ambil SEMUA data karyawan (untuk referensi jadwal di frontend)
    $karyawan_result = $this->conn->query("SELECT id_karyawan, nama_lengkap, hari_libur, jam_masuk_standar FROM karyawan ORDER BY nama_lengkap ASC");
    if ($karyawan_result === false) {
         throw new Exception("Gagal mengambil data karyawan: " . $this->conn->error);
    }
    $karyawan_list = [];
    while ($row = $karyawan_result->fetch_assoc()) {
        $karyawan_list[] = $row;
    }

    // 2. Ambil data absensi sesuai filter (menggunakan prepared statement yang aman)
    $query = "SELECT * FROM absensi WHERE tanggal BETWEEN ? AND ?";
    $params = [$startDate, $endDate];
    $types = "ss";

    if ($employee && $employee !== 'Semua Karyawan') {
        $query .= " AND nama_lengkap = ?";
        $params[] = $employee;
        $types .= "s";
    }
    $query .= " ORDER BY tanggal, nama_lengkap";
    
    $stmt = $this->conn->prepare($query);
    if ($stmt === false) {
         throw new Exception("Gagal menyiapkan query absensi: " . $this->conn->error);
    }
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    
    $result = $stmt->get_result();
    $absensi_records = [];
    while ($row = $result->fetch_assoc()) {
        $absensi_records[] = $row;
    }
    
    // 3. Kembalikan kedua set data mentah ke frontend
    return [
        'karyawanData' => $karyawan_list,
        'absensiData' => $absensi_records
    ];
}

} // <-- INI ADALAH KURUNG KURAWAL PENUTUP YANG HILANG
?>