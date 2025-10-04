<?php
/**
 * File: app/modules/outlet/OutletController.php
 * Controller untuk modul Outlet.
 */

require_once __DIR__ . '/OutletModel.php';

class OutletController
{
    private $conn;
    private $model;

    public function __construct($db)
    {
        $this->conn = $db;
        $this->model = new OutletModel($this->conn);
    }

    public function getAll()
    {
        try {
            $outlets = $this->model->getAll();
            // Memastikan data dikirim dalam format { "objects": [...] }
            sendResponse(['objects' => $outlets]);
        } catch (Exception $e) {
            sendError(500, "Gagal mengambil data outlet: " . $e->getMessage());
        }
    }
    
    public function getById($data)
    {
        try {
            $outlet = $this->model->getById($data['id']);
            sendResponse(['record' => $outlet]);
        } catch (Exception $e) {
            sendError(500, "Gagal mengambil data outlet: " . $e->getMessage());
        }
    }

    public function submit($data)
    {
        try {
            $this->model->submit($data);
            sendResponse(['message' => 'Data outlet berhasil disimpan.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menyimpan data outlet: " . $e->getMessage());
        }
    }

    public function delete($data)
    {
        try {
            $this->model->delete($data['id']);
            sendResponse(['message' => 'Data outlet berhasil dihapus.']);
        } catch (Exception $e) {
            sendError(500, "Gagal menghapus outlet: " . $e->getMessage());
        }
    }
}

