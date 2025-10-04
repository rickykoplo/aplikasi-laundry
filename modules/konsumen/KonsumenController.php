<?php
/**
 * File: app/modules/konsumen/KonsumenController.php
 * Controller untuk modul Konsumen.
 */
require_once __DIR__ . '/KonsumenModel.php';

class KonsumenController
{
    private $conn;
    private $model;

    public function __construct($db)
    {
        $this->conn = $db;
        $this->model = new KonsumenModel($this->conn);
    }

    public function getAll()
    {
        try {
            $konsumen = $this->model->getAll();
            sendResponse(['objects' => $konsumen]);
        } catch (Exception $e) {
            sendError(500, "Gagal memuat data konsumen: " . $e->getMessage());
        }
    }
    
    public function getById($data)
    {
        try {
            $konsumen = $this->model->getById($data['id']);
            sendResponse(['record' => $konsumen]);
        } catch (Exception $e) {
            sendError(500, "Gagal mengambil data konsumen: " . $e->getMessage());
        }
    }

    public function submit($data)
    {
        try {
            $newRecord = $this->model->submit($data);
            if ($data['id'] ?? null) {
                 sendResponse(['message' => 'Data konsumen berhasil diperbarui.']);
            } else {
                 sendResponse([
                    'message' => 'Data konsumen berhasil disimpan.',
                    'newKonsumen' => $newRecord
                ]);
            }
        } catch (Exception $e) {
            // --- PERBAIKAN DI SINI ---
            // Cek apakah pesan error adalah untuk duplikasi nomor telepon
            if (strpos($e->getMessage(), 'DUPLICATE_PHONE::') !== false) {
                 // Jika ya, kirim error 409 (Conflict) dengan data duplikatnya
                 sendError(409, $e->getMessage());
                 return; // <-- BARIS PENTING: Hentikan eksekusi di sini
            }
            
            // Jika error lain, kirim error 500 (Server Error)
            sendError(500, "Gagal menyimpan data konsumen: " . $e->getMessage());
        }
    }

    public function delete($data)
    {
        try {
            $this->model->delete($data['id']);
            sendResponse(['message' => 'Data konsumen berhasil dihapus.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menghapus konsumen: " . $e->getMessage());
        }
    }
}

