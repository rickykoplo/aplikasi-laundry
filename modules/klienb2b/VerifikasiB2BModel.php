<?php
class VerifikasiB2BModel {
    private $conn;
    public function __construct($db) { $this->conn = $db; }

    public function getPendingUsers() {
        $sql = "SELECT p.id_pengguna, p.nama_lengkap, p.no_telpon, p.jabatan, p.terdaftar_pada, c.nama_perusahaan 
                FROM pengguna_b2b p
                LEFT JOIN konsumen c ON p.id_konsumen = c.id_konsumen
                WHERE p.status_akun = 'pending' ORDER BY p.terdaftar_pada DESC";
        $result = $this->conn->query($sql);
        $data = [];
        while($row = $result->fetch_assoc()){
            $data[] = $row;
        }
        return $data;
    }

    public function updateUserStatus($id_pengguna, $new_status) {
        $stmt = $this->conn->prepare("UPDATE pengguna_b2b SET status_akun = ? WHERE id_pengguna = ?");
        $stmt->bind_param("si", $new_status, $id_pengguna);
        return $stmt->execute();
    }
}
?>