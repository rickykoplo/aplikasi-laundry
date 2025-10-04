<?php
class AbsensiModel {
    private $conn;
    public function __construct($db) { $this->conn = $db; }

    public function checkAbsensiStatus($username) {
        $today = date('Y-m-d');
        $stmt = $this->conn->prepare("SELECT * FROM absensi WHERE id_karyawan = ? AND tanggal = ?");
        $stmt->bind_param("ss", $username, $today);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }
    public function submitAbsen($data) {
        $today = date('Y-m-d');
        $now = date('H:i:s');
        $existing = $this->checkAbsensiStatus($data['username']);

        if ($data['type'] === 'Masuk') {
            if ($existing) return ['success' => false, 'message' => 'Anda sudah absen masuk hari ini.'];
            $stmt = $this->conn->prepare("INSERT INTO absensi (tanggal, jam_masuk, status, id_karyawan, nama_lengkap) VALUES (?, ?, 'Hadir', ?, ?)");
            $stmt->bind_param("ssss", $today, $now, $data['username'], $data['namaLengkap']);
        } else {
            if (!$existing) return ['success' => false, 'message' => 'Anda belum absen masuk hari ini.'];
            $stmt = $this->conn->prepare("UPDATE absensi SET jam_keluar = ? WHERE id_absensi = ?");
            $stmt->bind_param("si", $now, $existing['id_absensi']);
        }
        return ['success' => $stmt->execute(), 'message' => 'Absensi ' . $data['type'] . ' berhasil direkam.'];
    }
    public function submitIzinSakit($data) {
        if (empty($data['keterangan'])) return ['success' => false, 'message' => 'Keterangan tidak boleh kosong.'];
        $today = date('Y-m-d');
        if ($this->checkAbsensiStatus($data['username'])) return ['success' => false, 'message' => 'Anda sudah memiliki catatan absensi hari ini.'];
        
        $stmt = $this->conn->prepare("INSERT INTO absensi (tanggal, status, id_karyawan, nama_lengkap, keterangan) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sssss", $today, $data['type'], $data['username'], $data['namaLengkap'], $data['keterangan']);
        return ['success' => $stmt->execute(), 'message' => 'Catatan ' . $data['type'] . ' berhasil disimpan.'];
    }
}
