<?php
class KaryawanModel {
    private $conn;
    public function __construct($db) { $this->conn = $db; }

    public function getAllKaryawan() {
        // Mengambil semua data karyawan untuk ditampilkan di daftar
        $result = $this->conn->query("SELECT * FROM karyawan ORDER BY nama_lengkap ASC");
        $karyawan = [];
        while($row = $result->fetch_assoc()){
            $karyawan[] = $row;
        }
        return $karyawan;
    }

    public function getKaryawanById($id) {
        $stmt = $this->conn->prepare("SELECT * FROM karyawan WHERE id_karyawan = ?");
        $stmt->bind_param("s", $id);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }
    
    public function createKaryawan($data) {
        // Saat membuat karyawan baru, selalu hash password
        $hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);
        
        $stmt = $this->conn->prepare(
            "INSERT INTO karyawan (
                id_karyawan, nama_lengkap, password, alamat, no_telp, foto_profil, role, id_outlet, id_shift,
                hari_libur, tanggal_masuk, status_karyawan, gaji_pokok, tipe_gaji, 
                uang_makan, uang_kerajinan, uang_transport, nama_bank, no_rekening
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("ssssssiiisssisiiiss", 
            $data['id_karyawan'], $data['nama_lengkap'], $hashed_password, $data['alamat'], $data['no_telp'], 
            $data['foto_profil'], $data['role'], $data['id_outlet'], $data['id_shift'], $data['hari_libur'], 
            $data['tanggal_masuk'], $data['status_karyawan'], $data['gaji_pokok'], $data['tipe_gaji'], 
            $data['uang_makan'], $data['uang_kerajinan'], $data['uang_transport'], $data['nama_bank'], $data['no_rekening']
        );
        return $stmt->execute();
    }

    public function updateKaryawan($id, $data) {
        // --- PERBAIKAN UTAMA ADA DI SINI ---
        $sql = "UPDATE karyawan SET 
                    nama_lengkap=?, alamat=?, no_telp=?, foto_profil=?, role=?, id_outlet=?, id_shift=?, hari_libur=?, 
                    tanggal_masuk=?, status_karyawan=?, gaji_pokok=?, tipe_gaji=?, 
                    uang_makan=?, uang_kerajinan=?, uang_transport=?, nama_bank=?, no_rekening=?";
        
        $types = "sssssiisssisiiiss";
        $params = [
            $data['nama_lengkap'], $data['alamat'], $data['no_telp'], $data['foto_profil'], $data['role'], 
            $data['id_outlet'], $data['id_shift'], $data['hari_libur'], $data['tanggal_masuk'], 
            $data['status_karyawan'], $data['gaji_pokok'], $data['tipe_gaji'], $data['uang_makan'], 
            $data['uang_kerajinan'], $data['uang_transport'], $data['nama_bank'], $data['no_rekening']
        ];

        // Jika ada password baru yang diisi, hash password tersebut
        if (!empty($data['password'])) {
            $hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);
            $sql .= ", password=?";
            $types .= "s";
            $params[] = $hashed_password;
        }

        $sql .= " WHERE id_karyawan=?";
        $types .= "s";
        $params[] = $id;

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare statement failed: " . $this->conn->error);
        }
        $stmt->bind_param($types, ...$params);
        return $stmt->execute();
    }

    public function deleteKaryawan($id) {
        // Menggunakan soft delete (mengubah status, bukan menghapus permanen)
        $stmt = $this->conn->prepare("UPDATE karyawan SET status_karyawan = 'Resign' WHERE id_karyawan = ?");
        $stmt->bind_param("s", $id);
        return $stmt->execute();
    }
}
?>