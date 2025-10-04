<?php
/**
 * File: app/modules/outlet/OutletModel.php
 * Model untuk modul Outlet.
 */

class OutletModel
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function getAll()
    {
        $outlets = [];
        $result = $this->conn->query("SELECT * FROM outlet ORDER BY nama_outlet ASC");
        while ($row = $result->fetch_assoc()) {
            $outlets[] = $row;
        }
        return $outlets;
    }

    public function getById($id)
    {
        $stmt = $this->conn->prepare("SELECT * FROM outlet WHERE id_outlet = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    public function submit($data)
    {
        $formData = $data['formData'];
        $id = $data['id'] ?? null;

        if (empty($formData['nama_outlet'])) {
            throw new Exception("Nama outlet tidak boleh kosong.");
        }

        if ($id) {
            $stmt = $this->conn->prepare("UPDATE outlet SET nama_outlet=?, alamat_outlet=?, telpon_outlet=? WHERE id_outlet=?");
            $stmt->bind_param("sssi", $formData['nama_outlet'], $formData['alamat_outlet'], $formData['telpon_outlet'], $id);
        } else {
            $stmt = $this->conn->prepare("INSERT INTO outlet (nama_outlet, alamat_outlet, telpon_outlet) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $formData['nama_outlet'], $formData['alamat_outlet'], $formData['telpon_outlet']);
        }

        if (!$stmt->execute()) {
            throw new Exception("Gagal menyimpan data outlet: " . $stmt->error);
        }
    }

    public function delete($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM outlet WHERE id_outlet = ?");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus outlet: " . $stmt->error);
        }
    }
}

