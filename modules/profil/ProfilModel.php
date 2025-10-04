<?php
class ProfilModel {
    private $conn;
    public function __construct($db) { $this->conn = $db; }

    public function updateProfile($data) {
        // --- PERBAIKAN DIMULAI DI SINI ---
        
        // Siapkan variabel dasar
        $sql_parts = ["nama_lengkap = ?", "alamat = ?"];
        $types = "ss";
        $params = [$data['namaLengkap'], $data['alamat']];

        // Tambahkan password jika diisi
        if (!empty($data['newPassword'])) {
            $sql_parts[] = "password = ?";
            $types .= "s";
            $params[] = $data['newPassword'];
        }

        // Tambahkan foto profil jika ada URL baru
        if (isset($data['foto_profil'])) {
            $sql_parts[] = "foto_profil = ?";
            $types .= "s";
            $params[] = $data['foto_profil'];
        }

        // Gabungkan query
        $sql = "UPDATE karyawan SET " . implode(", ", $sql_parts) . " WHERE id_karyawan = ?";
        $types .= "s";
        $params[] = $data['username'];

        // Eksekusi
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        return $stmt->execute();
        
        // --- AKHIR PERBAIKAN ---
    }
}