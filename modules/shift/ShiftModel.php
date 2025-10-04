<?php
class ShiftModel {
    private $conn;
    public function __construct($db) { $this->conn = $db; }

    public function getAll() {
        $result = $this->conn->query("SELECT * FROM master_shift ORDER BY nama_shift ASC");
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    public function getById($id) {
        $stmt = $this->conn->prepare("SELECT * FROM master_shift WHERE id_shift = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function submit($data) {
        $formData = $data['formData'];
        $id = $data['id'] ?? null;
        if (empty($formData['nama_shift']) || empty($formData['jam_masuk']) || empty($formData['jam_pulang'])) {
            throw new Exception("Semua field wajib diisi.");
        }

        if ($id) {
            $stmt = $this->conn->prepare("UPDATE master_shift SET nama_shift=?, jam_masuk=?, jam_pulang=? WHERE id_shift=?");
            $stmt->bind_param("sssi", $formData['nama_shift'], $formData['jam_masuk'], $formData['jam_pulang'], $id);
        } else {
            $stmt = $this->conn->prepare("INSERT INTO master_shift (nama_shift, jam_masuk, jam_pulang) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $formData['nama_shift'], $formData['jam_masuk'], $formData['jam_pulang']);
        }
        if (!$stmt->execute()) {
            throw new Exception("Gagal menyimpan data shift: " . $stmt->error);
        }
    }

    public function delete($id) {
        $stmt = $this->conn->prepare("DELETE FROM master_shift WHERE id_shift = ?");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus shift: " . $stmt->error);
        }
    }
}
?>