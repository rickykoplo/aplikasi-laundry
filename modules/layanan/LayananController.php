<?php
/**
 * File: app/modules/layanan/LayananController.php
 * Controller untuk modul Layanan, Kategori, dan Kecepatan.
 */

require_once __DIR__ . '/LayananModel.php';

class LayananController
{
    private $conn;
    private $model;

    public function __construct($db)
    {
        $this->conn = $db;
        $this->model = new LayananModel($this->conn);
    }

    public function getLayananOptions()
    {
        try {
            $data = $this->model->getLayananOptions();
            sendResponse($data);
        } catch (Exception $e) {
            sendError(500, "Gagal mengambil opsi layanan: " . $e->getMessage());
        }
    }

    public function getLayananList()
    {
        try {
            $layanan = $this->model->getLayananList();
            sendResponse(['objects' => $layanan]);
        } catch (Exception $e) {
            sendError(500, "Gagal memuat daftar layanan: " . $e->getMessage());
        }
    }

    public function getLayananById($data) {
        try {
            $record = $this->model->getLayananById($data['id']);
            sendResponse(['record' => $record]);
        } catch (Exception $e) {
            sendError(500, "Gagal mengambil data layanan: " . $e->getMessage());
        }
    }

    public function submitLayanan($data)
    {
        try {
            $this->model->submitLayanan($data);
            sendResponse(['message' => 'Layanan berhasil disimpan.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menyimpan layanan: " . $e->getMessage());
        }
    }
    
    public function deleteLayanan($data)
    {
        try {
            $this->model->deleteLayanan($data['id']);
            sendResponse(['message' => 'Layanan berhasil dihapus.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menghapus layanan: " . $e->getMessage());
        }
    }

    public function duplicateLayanan($data) {
        try {
            $this->model->duplicateLayanan($data);
            sendResponse(['message' => 'Layanan berhasil diduplikasi.']);
        } catch (Exception $e) {
            sendError(500, "Gagal duplikasi layanan: " . $e->getMessage());
        }
    }

    public function getKategoriList()
    {
        try {
            $kategori = $this->model->getKategoriList();
            sendResponse(['objects' => $kategori]);
        } catch (Exception $e) {
            sendError(500, "Gagal memuat daftar kategori: " . $e->getMessage());
        }
    }
    
    public function getKategoriById($data) {
        try {
            $record = $this->model->getKategoriById($data['id']);
            sendResponse(['record' => $record]);
        } catch (Exception $e) {
            sendError(500, "Gagal mengambil data kategori: " . $e->getMessage());
        }
    }

    public function submitKategori($data)
    {
        try {
            $this->model->submitKategori($data);
            sendResponse(['message' => 'Kategori berhasil disimpan.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menyimpan kategori: " . $e->getMessage());
        }
    }
    
    public function deleteKategori($data)
    {
        try {
            $this->model->deleteKategori($data['id']);
            sendResponse(['message' => 'Kategori berhasil dihapus.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menghapus kategori: " . $e->getMessage());
        }
    }

    public function getKecepatanList()
    {
        try {
            $kecepatan = $this->model->getKecepatanList();
            sendResponse(['objects' => $kecepatan]);
        } catch (Exception $e) {
            sendError(500, "Gagal memuat daftar kecepatan: " . $e->getMessage());
        }
    }

    public function getKecepatanById($data) {
        try {
            $record = $this->model->getKecepatanById($data['id']);
            sendResponse(['record' => $record]);
        } catch (Exception $e) {
            sendError(500, "Gagal mengambil data kecepatan: " . $e->getMessage());
        }
    }

    public function submitKecepatan($data)
    {
        try {
            $this->model->submitKecepatan($data);
            sendResponse(['message' => 'Data kecepatan berhasil disimpan.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menyimpan kecepatan: " . $e->getMessage());
        }
    }
    
     public function deleteKecepatan($data)
    {
        try {
            $this->model->deleteKecepatan($data['id']);
            sendResponse(['message' => 'Kecepatan berhasil dihapus.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menghapus kecepatan: " . $e->getMessage());
        }
    }
    
    // --- Logika Manajemen Proses Kerja ---
    
    public function getProsesKerjaList()
    {
        try {
            $proses = $this->model->getProsesKerjaList();
            sendResponse(['objects' => $proses]);
        } catch (Exception $e) {
            sendError(500, "Gagal memuat daftar proses kerja: " . $e->getMessage());
        }
    }
    
    public function submitProsesKerja($data)
    {
        try {
            $this->model->submitProsesKerja($data);
            sendResponse(['message' => 'Data proses berhasil disimpan.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menyimpan proses: " . $e->getMessage());
        }
    }
    
    public function getProsesKerjaById($data)
    {
        try {
            $record = $this->model->getProsesKerjaById($data['id']);
            sendResponse(['record' => $record]);
        } catch (Exception $e) {
            sendError(500, "Gagal mengambil data proses: " . $e->getMessage());
        }
    }
    
    public function deleteProsesKerja($data)
    {
        try {
            $this->model->deleteProsesKerja($data['id']);
            sendResponse(['message' => 'Proses berhasil dihapus.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menghapus proses: " . $e->getMessage());
        }
    }
}
