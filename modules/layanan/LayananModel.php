<?php
/**
 * File: app/modules/layanan/LayananModel.php
 * Model untuk modul Layanan, Kategori, dan Kecepatan.
 */

class LayananModel
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }
    
    public function getLayananOptions()
    {
        $outlets = [];
        $result = $this->conn->query("SELECT id_outlet, nama_outlet FROM outlet ORDER BY nama_outlet ASC");
        while($row = $result->fetch_assoc()) { $outlets[] = $row; }

        $layanan = [];
        $result = $this->conn->query("SELECT * FROM layanan ORDER BY nama_layanan ASC");
        while($row = $result->fetch_assoc()) { $layanan[] = $row; }

        $kecepatan = [];
        $result = $this->conn->query("SELECT * FROM kecepatan_layanan ORDER BY id_kecepatan ASC");
        while($row = $result->fetch_assoc()) { $kecepatan[] = $row; }

        $kategori = [];
        $result = $this->conn->query("SELECT * FROM kategori_layanan ORDER BY nama_kategori ASC");
        while($row = $result->fetch_assoc()) { $kategori[] = $row; }

        return ['outlets' => $outlets, 'layanan' => $layanan, 'kecepatan' => $kecepatan, 'kategori' => $kategori];
    }

    public function getLayananList()
    {
        $data = [];
        $query = "SELECT l.*, k.nama_kategori FROM layanan l LEFT JOIN kategori_layanan k ON l.id_kategori = k.id_kategori ORDER BY l.nama_layanan ASC";
        $result = $this->conn->query($query);
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        return $data;
    }
    
    public function getKategoriList()
    {
        $data = [];
        $result = $this->conn->query("SELECT * FROM kategori_layanan ORDER BY nama_kategori ASC");
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        return $data;
    }

    public function getKategoriNamaById($id)
    {
        $stmt = $this->conn->prepare("SELECT nama_kategori FROM kategori_layanan WHERE id_kategori = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        return $result ? $result['nama_kategori'] : null;
    }

    public function getKecepatanList()
    {
        $data = [];
        $result = $this->conn->query("SELECT * FROM kecepatan_layanan ORDER BY tambahan_harga_persen ASC");
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        return $data;
    }
    
    public function getLayananById($id)
    {
        $stmt = $this->conn->prepare("SELECT * FROM layanan WHERE id_layanan = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }
    
    public function getKategoriById($id)
    {
        $stmt = $this->conn->prepare("SELECT * FROM kategori_layanan WHERE id_kategori = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function getKecepatanById($id)
    {
        $stmt = $this->conn->prepare("SELECT * FROM kecepatan_layanan WHERE id_kecepatan = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function submitLayanan($data)
    {
        $formData = $data['formData'];
        $id = $data['id'] ?? null;
        if ($id) {
            $stmt = $this->conn->prepare("UPDATE layanan SET id_kategori=?, nama_layanan=?, satuan=?, harga=?, durasi_hari=?, durasi_jam=?, min_order=? WHERE id_layanan=?");
            $stmt->bind_param("issiiiii", $formData['id_kategori'], $formData['nama_layanan'], $formData['satuan'], $formData['harga'], $formData['durasi_hari'], $formData['durasi_jam'], $formData['min_order'], $id);
        } else {
            $stmt = $this->conn->prepare("INSERT INTO layanan (id_kategori, nama_layanan, satuan, harga, durasi_hari, durasi_jam, min_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("issiiii", $formData['id_kategori'], $formData['nama_layanan'], $formData['satuan'], $formData['harga'], $formData['durasi_hari'], $formData['durasi_jam'], $formData['min_order']);
        }
        if (!$stmt->execute()) {
            throw new Exception("Gagal menyimpan layanan: " . $stmt->error);
        }
    }
    
    public function deleteLayanan($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM layanan WHERE id_layanan = ?");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus layanan: " . $stmt->error);
        }
    }
    
    public function submitKategori($data)
    {
        $formData = $data['formData'];
        $id = $data['id'] ?? null;
        if ($id) {
            $stmt = $this->conn->prepare("UPDATE kategori_layanan SET nama_kategori=?, nama_icon=? WHERE id_kategori=?");
            $stmt->bind_param("ssi", $formData['nama_kategori'], $formData['nama_icon'], $id);
        } else {
            $stmt = $this->conn->prepare("INSERT INTO kategori_layanan (nama_kategori, nama_icon) VALUES (?, ?)");
            $stmt->bind_param("ss", $formData['nama_kategori'], $formData['nama_icon']);
        }
        if (!$stmt->execute()) {
            throw new Exception("Gagal menyimpan kategori: " . $stmt->error);
        }
    }

    public function deleteKategori($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM kategori_layanan WHERE id_kategori = ?");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus kategori: " . $stmt->error);
        }
    }

    public function submitKecepatan($data)
    {
        $formData = $data['formData'];
        $id = $data['id'] ?? null;
        if ($id) {
            $stmt = $this->conn->prepare("UPDATE kecepatan_layanan SET nama_kecepatan=?, pengurang_jam_proses=?, tambahan_harga_persen=? WHERE id_kecepatan=?");
            $stmt->bind_param("siii", $formData['nama_kecepatan'], $formData['pengurang_jam_proses'], $formData['tambahan_harga_persen'], $id);
        } else {
            $stmt = $this->conn->prepare("INSERT INTO kecepatan_layanan (nama_kecepatan, pengurang_jam_proses, tambahan_harga_persen) VALUES (?, ?, ?)");
            $stmt->bind_param("sii", $formData['nama_kecepatan'], $formData['pengurang_jam_proses'], $formData['tambahan_harga_persen']);
        }
        if (!$stmt->execute()) {
            throw new Exception("Gagal menyimpan kecepatan: " . $stmt->error);
        }
    }

    public function deleteKecepatan($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM kecepatan_layanan WHERE id_kecepatan = ?");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus kecepatan: " . $stmt->error);
        }
    }
    
    public function duplicateLayanan($data)
    {
        $stmt = $this->conn->prepare("INSERT INTO layanan (id_kategori, nama_layanan, satuan, harga, durasi_hari, durasi_jam, min_order) SELECT id_kategori, ?, satuan, harga, durasi_hari, durasi_jam, min_order FROM layanan WHERE id_layanan = ?");
        $stmt->bind_param("si", $data['newName'], $data['id']);
        if (!$stmt->execute()) {
            throw new Exception("Gagal duplikasi layanan: " . $stmt->error);
        }
    }
    
    // --- FUNGSI BARU UNTUK PROSES KERJA ---
    public function getProsesKerjaList()
    {
        $data = [];
        $result = $this->conn->query("SELECT * FROM proses_kerja ORDER BY urutan ASC");
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        return $data;
    }

    public function getProsesKerjaById($id)
    {
        $stmt = $this->conn->prepare("SELECT * FROM proses_kerja WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        return $stmt->get_result()->fetch_assoc();
    }

    public function submitProsesKerja($data)
    {
        $formData = $data['formData'];
        $id = $data['id'] ?? null;

        if ($id) {
            $stmt = $this->conn->prepare("UPDATE proses_kerja SET nama_proses=?, urutan=? WHERE id=?");
            $stmt->bind_param("sii", $formData['nama_proses'], $formData['urutan'], $id);
        } else {
            $stmt = $this->conn->prepare("INSERT INTO proses_kerja (nama_proses, urutan) VALUES (?, ?)");
            $stmt->bind_param("si", $formData['nama_proses'], $formData['urutan']);
        }
        if (!$stmt->execute()) {
            throw new Exception("Gagal menyimpan proses kerja: " . $stmt->error);
        }
    }

    public function deleteProsesKerja($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM proses_kerja WHERE id = ?");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus proses kerja: " . $stmt->error);
        }
    }
}

