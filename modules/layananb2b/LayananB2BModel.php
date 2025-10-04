<?php
class LayananB2BModel {
    private $conn;
    public function __construct($db) { $this->conn = $db; }

    public function getAllByKonsumen($id_konsumen) {
        $stmt = $this->conn->prepare("SELECT * FROM layanan_b2b WHERE id_konsumen = ? ORDER BY nama_layanan ASC");
        $stmt->bind_param("s", $id_konsumen);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        return $data;
    }

    public function getById($id) {
        $stmt = $this->conn->prepare("SELECT * FROM layanan_b2b WHERE id_layanan_b2b = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function submit($data) {
        $formData = $data['formData'];
        $id = $data['id'] ?? null;
        if (empty($formData['id_konsumen']) || empty($formData['nama_layanan']) || empty($formData['harga'])) {
            throw new Exception("Klien B2B, Nama Layanan, dan Harga wajib diisi.");
        }

        if ($id) {
            $stmt = $this->conn->prepare("UPDATE layanan_b2b SET id_konsumen=?, nama_layanan=?, satuan=?, harga=?, catatan=? WHERE id_layanan_b2b=?");
            $stmt->bind_param("sssisi", $formData['id_konsumen'], $formData['nama_layanan'], $formData['satuan'], $formData['harga'], $formData['catatan'], $id);
        } else {
            $stmt = $this->conn->prepare("INSERT INTO layanan_b2b (id_konsumen, nama_layanan, satuan, harga, catatan) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("sssis", $formData['id_konsumen'], $formData['nama_layanan'], $formData['satuan'], $formData['harga'], $formData['catatan']);
        }
        if (!$stmt->execute()) {
            throw new Exception("Gagal menyimpan layanan B2B: " . $stmt->error);
        }
    }

    public function delete($id) {
        $stmt = $this->conn->prepare("DELETE FROM layanan_b2b WHERE id_layanan_b2b = ?");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus layanan B2B: " . $stmt->error);
        }
    }
}
?>