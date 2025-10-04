<?php
/**
 * Model untuk pengaturan aplikasi (kategori, proses, outlet)
 */

class SettingsModel
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * Ambil semua data yang dibutuhkan untuk halaman pengaturan.
     * Menggabungkan data dari beberapa tabel.
     */
    public function getProcessSettingsData()
    {
        $settingsData = [];
        $settingsData['categories'] = $this->getCategories();
        $settingsData['processes'] = $this->getProcesses();
        $settingsData['categoryProcessMap'] = $this->getCategoryProcessMap();
        return $settingsData;
    }

    private function getCategories()
    {
        $data = [];
        $result = $this->conn->query("SELECT id_kategori, nama_kategori FROM kategori_layanan ORDER BY nama_kategori ASC");
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        return $data;
    }

    private function getProcesses()
    {
        $data = [];
        $result = $this->conn->query("SELECT id AS id_proses, nama_proses FROM proses_kerja ORDER BY urutan ASC");
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        return $data;
    }
    
    private function getCategoryProcessMap()
    {
        $map = [];
        $result = $this->conn->query("SELECT id_kategori, id_proses FROM kategori_proses_kerja");
        while($row = $result->fetch_assoc()) {
            if (!isset($map[$row['id_kategori']])) {
                $map[$row['id_kategori']] = [];
            }
            // Mengubah format menjadi array asosiatif untuk konsistensi
            $map[$row['id_kategori']][] = ['id_proses' => $row['id_proses']];
        }
        return $map;
    }

    public function saveProcessSettings($data)
    {
        $payload = $data['settings'];
        $this->conn->begin_transaction();
        try {
            // Hapus semua pemetaan lama
            $this->conn->query("DELETE FROM kategori_proses_kerja");
            
            // Masukkan pemetaan baru
            $stmt = $this->conn->prepare("INSERT INTO kategori_proses_kerja (id_kategori, id_proses) VALUES (?, ?)");
            foreach ($payload as $categoryId => $processIds) {
                // Pastikan processIds adalah array
                if (!is_array($processIds)) {
                    continue;
                }
                foreach ($processIds as $processId) {
                    $stmt->bind_param("ii", $categoryId, $processId);
                    $stmt->execute();
                }
            }

            $this->conn->commit();
        } catch (Exception $e) {
            $this->conn->rollback();
            throw new Exception("Gagal menyimpan pengaturan: " . $e->getMessage());
        }
    }
}
