<?php
/**
 * File: app/modules/transaksi/TransaksiController.php
 * Controller untuk modul Transaksi - Version Fixed
 */

class TransaksiController
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
        $this->conn->autocommit(false); // Pastikan autocommit off
    }

    // === LIST TRANSAKSI ===
     public function getList($data)
    {
        try {
            $statusFilter = $data['statusFilter'] ?? 'Aktif';
            
            // --- PERBAIKAN DIMULAI DI SINI ---
            $query = "
    SELECT 
        t.id_transaksi, t.id_konsumen, t.id_outlet, t.id_kecepatan_layanan, t.waktu_antar,
        t.waktu_ambil, t.estimasi_selesai, t.nama_pelanggan, t.no_telp_pelanggan,
        t.alamat_pelanggan, t.referensi_tugas, t.total_biaya,
        t.biaya_transport, t.diskon, t.jumlah_bayar, t.status_bayar,
        t.catatan_pembayaran, t.status_transaksi, t.diterima_oleh, t.diserahkan_oleh,
        t.penyetor_dikonfirmasi_oleh, t.waktu_setor_dikonfirmasi, t.foto_antar,
        t.foto_ambil, t.foto_barang, t.jumlah, t.jenis_tugas, t.proses_dipesan,
        t.minta_diantar, t.catatan, t.id_anjem_referensi,
        o.nama_outlet,
        
        -- PERUBAHAN UTAMA ADA DI SINI --
         COALESCE(tl.detail_layanan, t.detail_layanan) AS detail_layanan, -- INI PERBAIKANNYA
        tl.status_kategori,
        tl.foto_proses,
        tl.log_pengerjaan,
        tl.catatan_selesai
        
    FROM transaksi t
    LEFT JOIN outlet o ON t.id_outlet = o.id_outlet
    LEFT JOIN tugas_laundry tl ON t.id_transaksi = tl.id_transaksi_referensi
    WHERE t.status_transaksi = ? 
    ORDER BY t.waktu_antar ASC
";
            // --- PERBAIKAN SELESAI ---
            
            $stmt = $this->conn->prepare($query);
        if (!$stmt) throw new Exception("getList Prepare failed: " . $this->conn->error);
        
        $stmt->bind_param("s", $statusFilter);
        $stmt->execute();
        $result = $stmt->get_result();
        $objects = $result->fetch_all(MYSQLI_ASSOC);
        
        foreach ($objects as &$row) {
            if (function_exists('normalizePhotoFields')) {
                normalizePhotoFields($row);
            }
        }
        
        sendResponse(['objects' => $objects]);
        
    } catch (Exception $e) {
        error_log("TransaksiController::getList Error: " . $e->getMessage());
        sendError(500, "Gagal mengambil daftar transaksi: " . $e->getMessage());
    }
}
	
    // === GET TRANSAKSI BY ID ===
    public function getById($data)
    {
        try {
            $id = $data['id'];
            $stmt = $this->conn->prepare("SELECT * FROM transaksi WHERE id_transaksi = ?");
            if (!$stmt) throw new Exception("getById Prepare failed: " . $this->conn->error);
            
            $stmt->bind_param("s", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                sendError(404, 'Transaksi tidak ditemukan.');
                return;
            }
            
            $record = $result->fetch_assoc();
            if (function_exists('normalizePhotoFields')) {
                normalizePhotoFields($record);
            }
            sendResponse(['record' => $record]);
            
        } catch (Exception $e) {
            error_log("TransaksiController::getById Error: " . $e->getMessage());
            sendError(500, "Gagal mengambil data transaksi: " . $e->getMessage());
        }
    }

    // === GENERATE UNIQUE ID ===
    private function generateUniqueTransactionId($maxRetries = 5)
    {
        for ($i = 0; $i < $maxRetries; $i++) {
            $uniquePart = strtoupper(uniqid() . bin2hex(random_bytes(3)));
            $newId = 'TRX-' . $uniquePart;
            
            $stmt = $this->conn->prepare("SELECT id_transaksi FROM transaksi WHERE id_transaksi = ?");
            if ($stmt) {
                $stmt->bind_param("s", $newId);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($result->num_rows === 0) {
                    return $newId;
                }
            }
        }
        throw new Exception("Gagal generate ID transaksi yang unik setelah {$maxRetries} percobaan");
    }

    // === SUBMIT (INSERT / UPDATE) ===
    public function submit($data)
    {
        try {
            error_log("TransaksiController::submit - Input data: " . json_encode($data));
            
            $this->conn->begin_transaction();

            $formData = $data['formData'];
            $loggedInUserName = $data['loggedInUser']['namaLengkap'];
            $loggedInUserId = $data['loggedInUser']['username'];
            $id = $data['id'] ?? null;

            // Validasi data wajib
            if (empty($formData['nama_pelanggan'])) {
                throw new Exception("Nama pelanggan tidak boleh kosong");
            }
            if (empty($formData['id_outlet'])) {
                throw new Exception("Outlet harus dipilih");
            }

            // Ambil data dari form - PERBAIKAN 1: Pastikan variabel ini ada
            $id_konsumen = $formData['id_konsumen'] ?? null;
            $id_outlet = $formData['id_outlet'];
            $nama_pelanggan = $formData['nama_pelanggan'];
            $no_telp_pelanggan = $formData['no_telp_pelanggan'] ?? null;  // PERBAIKAN: Ambil dari form
            $alamat_pelanggan = $formData['alamat_pelanggan'] ?? null;    // PERBAIKAN: Ambil dari form

            $total_biaya     = (float)($formData['total_biaya'] ?? 0);
            $jumlah_bayar    = (float)($formData['jumlah_bayar'] ?? 0);
            $biaya_transport = (float)($formData['biaya_transport'] ?? 0);
            $diskon          = (float)($formData['diskon'] ?? 0);

            error_log("Data pelanggan: nama={$nama_pelanggan}, telp={$no_telp_pelanggan}, alamat={$alamat_pelanggan}");

            $detailLayananJson = $formData['detail_layanan'] ?? '[]';
            if (is_array($detailLayananJson)) {
                $detailLayananJson = json_encode($detailLayananJson, JSON_UNESCAPED_UNICODE);
            }

            // Handle foto_barang
            $all_photos = $formData['foto_barang'] ?? [];
            if ($id) {
                $stmtCheck = $this->conn->prepare("SELECT foto_barang FROM transaksi WHERE id_transaksi=?");
                if (!$stmtCheck) {
                    throw new Exception("Prepare check foto failed: " . $this->conn->error);
                }
                $stmtCheck->bind_param("s", $id);
                $stmtCheck->execute();
                $existing_photos = $stmtCheck->get_result()->fetch_assoc()['foto_barang'] ?? '[]';
                $existing_photos_array = json_decode($existing_photos, true) ?: [];
                $all_photos = array_merge($existing_photos_array, $all_photos);
            }
            $foto_barang_json = json_encode($all_photos, JSON_UNESCAPED_SLASHES);

            // PERBAIKAN: Handle checkbox "on" value dengan benar
            $minta_diantar = 'Tidak';
            if (isset($formData['minta_diantar']) && ($formData['minta_diantar'] === 'on' || $formData['minta_diantar'] === 'Ya' || $formData['minta_diantar'] === true)) {
                $minta_diantar = 'Ya';
            }
            error_log("Minta diantar processed: " . $minta_diantar);
            $id_kecepatan_layanan = $formData['id_kecepatan_layanan'] ?? null;
            $catatan              = $formData['catatan'] ?? null;
            
            // Hitung status bayar
            $status_bayar = 'Belum Lunas';
            if ($jumlah_bayar >= $total_biaya && $total_biaya > 0) {
                $status_bayar = 'Lunas';
            } elseif ($jumlah_bayar > 0) {
                $status_bayar = 'DP';
            }

            $estimasi_selesai = $this->calculateEstimasiSelesai($detailLayananJson, $id_kecepatan_layanan);

            if ($id) { 
                // MODE UPDATE
                error_log("MODE UPDATE untuk ID: " . $id);
                
                $this->deleteTugasByTransaksiId($id);
                
                $stmt = $this->conn->prepare("
                    UPDATE transaksi 
                    SET id_outlet=?, id_kecepatan_layanan=?, detail_layanan=?, total_biaya=?, 
                        biaya_transport=?, diskon=?, jumlah_bayar=?, status_bayar=?, foto_barang=?, 
                        estimasi_selesai=?, minta_diantar=?, catatan=? 
                    WHERE id_transaksi=?");
                if (!$stmt) throw new Exception("UPDATE Prepare failed: " . $this->conn->error);

                $stmt->bind_param(
                    "iisdddsssssss", 
                    $id_outlet, $id_kecepatan_layanan, $detailLayananJson, 
                    $total_biaya, $biaya_transport, $diskon, $jumlah_bayar, $status_bayar, 
                    $foto_barang_json, $estimasi_selesai, $minta_diantar, $catatan, $id
                );
                
                if (!$stmt->execute()) {
                    throw new Exception("Gagal update transaksi: " . $stmt->error);
                }
                
                error_log("UPDATE affected rows: " . $stmt->affected_rows);
                
            } else { 
                // MODE INSERT
                error_log("MODE INSERT");
                
                $newId = $this->generateUniqueTransactionId();
                error_log("Generated ID: " . $newId);
                
                $stmt = $this->conn->prepare("
                    INSERT INTO transaksi (
                        id_transaksi, id_konsumen, id_outlet, id_kecepatan_layanan, waktu_antar,
                        estimasi_selesai, nama_pelanggan, no_telp_pelanggan, alamat_pelanggan,
                        detail_layanan, total_biaya, biaya_transport, diskon, jumlah_bayar, status_bayar,
                        status_transaksi, diterima_oleh, foto_barang, minta_diantar, catatan
                    ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aktif', ?, ?, ?, ?)");

                if (!$stmt) {
                    throw new Exception("INSERT Prepare failed: " . $this->conn->error);
                }

                error_log("INSERT bind parameters: ID={$newId}, konsumen={$id_konsumen}, outlet={$id_outlet}");

                $stmt->bind_param(
                    "ssiisssssddddsssss",
                    $newId, 
                    $id_konsumen, 
                    $id_outlet, 
                    $id_kecepatan_layanan,
                    $estimasi_selesai, 
                    $nama_pelanggan, 
                    $no_telp_pelanggan,          // PERBAIKAN: Variabel sudah benar
                    $alamat_pelanggan,           // PERBAIKAN: Variabel sudah benar
                    $detailLayananJson, 
                    $total_biaya, 
                    $biaya_transport,
                    $diskon, 
                    $jumlah_bayar, 
                    $status_bayar, 
                    $loggedInUserName, 
                    $foto_barang_json, 
                    $minta_diantar, 
                    $catatan
                );

                if (!$stmt->execute()) {
                    error_log("INSERT GAGAL - Error: " . $stmt->error);
                    throw new Exception("Gagal insert transaksi: " . $stmt->error);
                }
                
                $affected_rows = $stmt->affected_rows;
                error_log("INSERT affected rows: " . $affected_rows);
                
                if ($affected_rows == 0) {
                    throw new Exception("INSERT berhasil execute tapi tidak ada baris yang terpengaruh");
                }
                
                $id = $newId;
            }

            // Update konsumen jika ada
            if (!empty($id_konsumen)) {
                $stmt_konsumen = $this->conn->prepare("UPDATE konsumen SET terakhir_laundry = NOW() WHERE id_konsumen = ?");
                if ($stmt_konsumen) {
                    $stmt_konsumen->bind_param("s", $id_konsumen);
                    $stmt_konsumen->execute();
                    error_log("Update konsumen affected rows: " . $stmt_konsumen->affected_rows);
                }
            }
            
            // Create tasks - PERBAIKAN 2: Error handling yang ketat
            error_log("Creating tasks untuk transaksi: " . $id);
            $this->createOrUpdateTasks($id, $detailLayananJson, $formData, $minta_diantar, $loggedInUserId);

            $this->conn->commit();
            error_log("COMMIT BERHASIL untuk transaksi: " . $id);
            
            sendResponse(['message' => 'Transaksi berhasil disimpan.', 'id_transaksi' => $id]);

        } catch (Exception $e) {
            $this->conn->rollback();
            error_log("TransaksiController::submit ROLLBACK - Error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            sendError(500, "Gagal menyimpan transaksi: " . $e->getMessage());
        }
    }

    // === SUBMIT PENGAMBILAN ===
    public function submitPengambilan($data)
{
    try {
        $this->conn->begin_transaction();

        $id = $data['id'];
        $loggedInUser = $data['loggedInUser']['namaLengkap'];
        $jumlah_bayar_baru = (float)($data['jumlah_bayar'] ?? 0);
        $catatan_pembayaran_tambahan = $data['catatan_pembayaran'] ?? '';
        $foto_urls = $data['foto_ambil'] ?? [];

        // Ambil data transaksi saat ini
        $stmt_get = $this->conn->prepare("SELECT total_biaya, jumlah_bayar, foto_ambil, catatan_pembayaran FROM transaksi WHERE id_transaksi = ? FOR UPDATE");
        $stmt_get->bind_param("s", $id);
        $stmt_get->execute();
        $transaksi = $stmt_get->get_result()->fetch_assoc();
        if (!$transaksi) throw new Exception("Transaksi tidak ditemukan.");

        // Gabungkan foto baru dengan yang lama
        $existing_photos = json_decode($transaksi['foto_ambil'] ?? '[]', true) ?: [];
        $all_photos = array_merge($existing_photos, $foto_urls);
        $foto_ambil_json = json_encode($all_photos);

        // Kalkulasi pembayaran
        $total_tagihan = (float)$transaksi['total_biaya'];
        $sudah_bayar = (float)$transaksi['jumlah_bayar'];
        $total_pembayaran_final = $sudah_bayar + $jumlah_bayar_baru;

        // Tentukan status akhir
        $status_bayar_final = 'DP';
        if ($total_pembayaran_final >= $total_tagihan) {
            $status_bayar_final = 'Lunas';
        }

        // Buat catatan pembayaran baru
        $catatan_pembayaran_final = $transaksi['catatan_pembayaran'] ?? '';
        if ($jumlah_bayar_baru > 0) {
            $catatan_baru = "Bayar Rp" . number_format($jumlah_bayar_baru) . " via Kasir (" . $loggedInUser . "). " . $catatan_pembayaran_tambahan;
            $catatan_pembayaran_final .= ($catatan_pembayaran_final ? "\n" : '') . $catatan_baru;
        }

        // Update transaksi menjadi SELESAI
        $stmt_update = $this->conn->prepare(
            "UPDATE transaksi SET 
                waktu_ambil=NOW(), status_transaksi='Selesai', diserahkan_oleh=?, 
                foto_ambil=?, jumlah_bayar=?, status_bayar=?, catatan_pembayaran=? 
            WHERE id_transaksi=?"
        );
        $stmt_update->bind_param(
            "ssdsss", 
            $loggedInUser, 
            $foto_ambil_json, 
            $total_pembayaran_final, 
            $status_bayar_final, 
            $catatan_pembayaran_final, 
            $id
        );
        
        if (!$stmt_update->execute()) throw new Exception("Gagal update pengambilan: " . $stmt_update->error);
        
        $this->conn->commit();
        sendResponse(['message' => 'Transaksi berhasil diselesaikan.']);
        
    } catch (Exception $e) {
        $this->conn->rollback();
        error_log("TransaksiController::submitPengambilan Error: " . $e->getMessage());
        sendError(500, "Gagal memproses pengambilan: " . $e->getMessage());
    }
}

    // === DELETE TRANSAKSI ===
    public function delete($data)
    {
        // --- PERBAIKAN DIMULAI DI SINI ---
        try {
            $this->conn->begin_transaction(); // 1. Mulai transaksi

            $idTransaksi = $data['id'];
            $this->deleteTugasByTransaksiId($idTransaksi);

            $stmt = $this->conn->prepare("UPDATE transaksi SET status_transaksi = 'Dihapus' WHERE id_transaksi = ?");
            if (!$stmt) {
                throw new Exception("Prepare statement gagal: " . $this->conn->error);
            }
            $stmt->bind_param("s", $idTransaksi);
            
            if (!$stmt->execute()) {
                throw new Exception("Eksekusi statement gagal: " . $stmt->error);
            }

            $this->conn->commit(); // 2. Simpan perubahan secara permanen jika semua berhasil

            sendResponse(['message' => 'Transaksi dan tugas terkait berhasil dihapus.']);
            
        } catch (Exception $e) {
            $this->conn->rollback(); // 3. Batalkan semua perubahan jika ada error

            error_log("TransaksiController::delete Error: " . $e->getMessage());
            sendError(500, "Gagal menghapus transaksi: " . $e->getMessage());
        }
        // --- PERBAIKAN SELESAI DI SINI ---
    }

    // === HELPER FUNCTIONS ===
    private function deleteTugasByTransaksiId($idTransaksi)
    {
        $tables = [
            'tugas_laundry' => 'id_transaksi_referensi',
            'tugas_anjem' => 'id_tugas_referensi',
            'tugas_luar' => 'id_transaksi_referensi'
        ];
        
        foreach ($tables as $table => $column) {
            $stmt = $this->conn->prepare("DELETE FROM {$table} WHERE {$column} = ?");
            if ($stmt) {
                $stmt->bind_param("s", $idTransaksi);
                $stmt->execute();
                error_log("Deleted from {$table}: " . $stmt->affected_rows . " rows");
            }
        }
    }

    // PERBAIKAN 2: Error handling yang ketat - jangan tangkap exception internal
    
	private function createOrUpdateTasks($id_transaksi, $detailLayananJson, $transaksiData, $minta_diantar, $loggedInUserId) { 
    error_log("=== START createOrUpdateTasks ===");
    error_log("ID Transaksi: " . $id_transaksi);
    
    $layananDipesan = json_decode($detailLayananJson, true) ?: [];
    if (empty($layananDipesan)) {
        error_log("Tidak ada layanan yang dipesan, skip create tasks");
        return;
    }

    // Logika disederhanakan: Hapus pengecekan outdoor/laundry.
    // Jika ada layanan valid, kita anggap ada tugas yang perlu dibuat.
    $apakahAdaTugasYangDikerjakan = false;

    $layananModelPath = __DIR__ . '/../layanan/LayananModel.php';
    if (!file_exists($layananModelPath)) {
        throw new Exception("File LayananModel.php tidak ditemukan di: " . $layananModelPath);
    }
    require_once $layananModelPath;
    if (!class_exists('LayananModel')) {
        throw new Exception("Class LayananModel tidak ditemukan setelah require file");
    }
    $layananModel = new LayananModel($this->conn);

    $enrichedLayanan = [];
    foreach($layananDipesan as $item) {
        $layananInfo = $layananModel->getLayananById($item['id_layanan']);
        if ($layananInfo) {
            $item['id_kategori'] = $layananInfo['id_kategori'];
            $enrichedLayanan[] = $item;
            $apakahAdaTugasYangDikerjakan = true; // Cukup tandai bahwa ada tugas
        } else {
            error_log("WARNING: Layanan info tidak ditemukan untuk ID: " . $item['id_layanan']);
        }
    }
    $enrichedLayananJson = json_encode($enrichedLayanan);
    error_log("Enriched layanan JSON: " . $enrichedLayananJson);

    // Jika ada layanan valid yang ditambahkan, buat record di tugas_laundry.
    if ($apakahAdaTugasYangDikerjakan) {
        error_log("Creating laundry task...");
        $newId = $this->generateUniqueTaskId('TUG');
        error_log("Generated task ID: " . $newId);
        
        $stmt_laundry = $this->conn->prepare(
            "INSERT INTO tugas_laundry (id_tugas, id_transaksi_referensi, nama_pelanggan, detail_layanan, status, dibuat_oleh, minta_diantar, log_pengerjaan, foto_proses) VALUES (?, ?, ?, ?, 'Aktif', ?, ?, ?, ?)"
        );

        if (!$stmt_laundry) {
            throw new Exception("Prepare tugas_laundry failed: " . $this->conn->error);
        }

        $logPengerjaanKosong = '[]';
        $fotoProsesKosong = '[]';

        $stmt_laundry->bind_param(
            "ssssssss",
            $newId, 
            $id_transaksi, 
            $transaksiData['nama_pelanggan'], 
            $enrichedLayananJson, 
            $loggedInUserId, 
            $minta_diantar, 
            $logPengerjaanKosong,
            $fotoProsesKosong
        );
        
        if (!$stmt_laundry->execute()) {
            error_log("Execute tugas_laundry FAILED - Error: " . $stmt_laundry->error);
            throw new Exception("Gagal membuat tugas laundry: " . $stmt_laundry->error);
        }
        
        error_log("Berhasil buat tugas laundry: " . $newId . " (affected rows: " . $stmt_laundry->affected_rows . ")");
    }

    if ($minta_diantar === 'Ya') {
        error_log("Creating anjem task...");
        $newAnjemId = $this->generateUniqueTaskId('ANJ');
        $status_anjem = $apakahAdaTugasYangDikerjakan ? 'Menunggu Selesai' : 'Aktif';
        error_log("Status anjem: " . $status_anjem);
        
        $stmt_anjem = $this->conn->prepare("INSERT INTO tugas_anjem (id_perintah, id_konsumen, id_tugas_referensi, nama_pelanggan, alamat, no_telp_pelanggan, jenis_cucian, status, pembuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        if (!$stmt_anjem) {
            throw new Exception("Prepare tugas_anjem failed: " . $this->conn->error);
        }
        
        $stmt_anjem->bind_param(
            "sssssssss", 
            $newAnjemId, 
            $transaksiData['id_konsumen'],
            $id_transaksi, 
            $transaksiData['nama_pelanggan'], 
            $transaksiData['alamat_pelanggan'], 
            $transaksiData['no_telp_pelanggan'], 
            $enrichedLayananJson, 
            $status_anjem, 
            $loggedInUserId
        );
        
        if (!$stmt_anjem->execute()) {
            error_log("Execute tugas_anjem FAILED - Error: " . $stmt_anjem->error);
            throw new Exception("Gagal membuat tugas antar: " . $stmt_anjem->error);
        }
        
        error_log("Berhasil buat tugas anjem: " . $newAnjemId . " (affected rows: " . $stmt_anjem->affected_rows . ")");
    }
    
    error_log("=== END createOrUpdateTasks ===");
}

    private function generateUniqueTaskId($prefix, $maxRetries = 5)
    {
        for ($i = 0; $i < $maxRetries; $i++) {
            $uniquePart = strtoupper(uniqid() . bin2hex(random_bytes(3)));
            $newId = $prefix . '-' . $uniquePart;
            
            $table = '';
            $column = '';
            switch ($prefix) {
                case 'TUG':
                    $table = 'tugas_laundry';
                    $column = 'id_tugas';
                    break;
                case 'ANJ':
                    $table = 'tugas_anjem';
                    $column = 'id_perintah';
                    break;
                default:
                    throw new Exception("Unknown task prefix: {$prefix}");
            }
            
            $stmt = $this->conn->prepare("SELECT {$column} FROM {$table} WHERE {$column} = ?");
            if ($stmt) {
                $stmt->bind_param("s", $newId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows === 0) {
                    return $newId;
                }
            }
        }
        
        throw new Exception("Gagal generate ID tugas yang unik setelah {$maxRetries} percobaan");
    }

    private function calculateEstimasiSelesai($detailLayananJson, $id_kecepatan)
    {
        try {
            $layananDipesan = json_decode($detailLayananJson, true);
            if (empty($layananDipesan)) return null;

            $ids = array_map(fn($item) => (string)$item['id_layanan'], $layananDipesan);
            if (empty($ids)) return null;

            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $types = str_repeat('s', count($ids));

            $stmtLayanan = $this->conn->prepare("SELECT durasi_hari, durasi_jam FROM layanan WHERE id_layanan IN ($placeholders)");
            $stmtLayanan->bind_param($types, ...$ids);
            $stmtLayanan->execute();
            $durasis = $stmtLayanan->get_result()->fetch_all(MYSQLI_ASSOC);

            $maxDurasiJam = 0;
            foreach ($durasis as $durasi) {
                $totalJam = ($durasi['durasi_hari'] * 24) + ($durasi['durasi_jam'] ?? 0);
                if ($totalJam > $maxDurasiJam) $maxDurasiJam = $totalJam;
            }

            $finalDurasiJam = $maxDurasiJam;
            if ($id_kecepatan) {
                $stmtKecepatan = $this->conn->prepare("SELECT pengurang_jam_proses FROM kecepatan_layanan WHERE id_kecepatan = ?");
                $stmtKecepatan->bind_param("i", $id_kecepatan);
                $stmtKecepatan->execute();
                $result = $stmtKecepatan->get_result()->fetch_assoc();
                $durasiTetap = $result['pengurang_jam_proses'] ?? 0;

                if ($durasiTetap > 0) {
                    $finalDurasiJam = $durasiTetap;
                }
            }

            $estimasi = new DateTime();
            $estimasi->add(new DateInterval("PT{$finalDurasiJam}H"));
            return $estimasi->format('Y-m-d H:i:s');
            
        } catch (Exception $e) {
            error_log("TransaksiController::calculateEstimasiSelesai Error: " . $e->getMessage());
            return null;
        }
    }
}
?>