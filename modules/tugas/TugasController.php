<?php
/**
 * File: app/modules/tugas/TugasController.php
 * Controller untuk semua jenis Tugas.
 */

class TugasController
{
    private $conn;
    
    public function __construct($db)
    {
        $this->conn = $db;
    }
    
    public function getCategorySummary()
    {
        try {
            $summaryData = [];
            $sql_kategori = "SELECT id_kategori, nama_kategori, nama_icon FROM kategori_layanan ORDER BY nama_kategori";
            $kategori_result = $this->conn->query($sql_kategori);
            if (!$kategori_result) throw new Exception("Gagal mengambil daftar kategori: " . $this->conn->error);
            
            $laundry_categories = [];
            while($row = $kategori_result->fetch_assoc()) {
                $laundry_categories[$row['id_kategori']] = $row;
            }

            // Menggunakan loop while yang lebih kompatibel untuk menghindari error 500
            $result = $this->conn->query("SELECT detail_layanan, status_kategori FROM tugas_laundry WHERE status != 'Selesai'");
            if (!$result) {
                throw new Exception("Gagal query tugas laundry: " . $this->conn->error);
            }
            $active_laundry_tasks = [];
            while ($row = $result->fetch_assoc()) {
                $active_laundry_tasks[] = $row;
            }

            $laundry_counts = array_fill_keys(array_keys($laundry_categories), 0);

            foreach($active_laundry_tasks as $task) {
                $details = json_decode($task['detail_layanan'], true) ?: [];
                $statuses = json_decode($task['status_kategori'], true) ?: [];
                $category_ids_in_task = array_unique(array_column($details, 'id_kategori'));
                
                foreach($category_ids_in_task as $cat_id) {
                    if (isset($laundry_counts[$cat_id]) && (!isset($statuses[$cat_id]) || $statuses[$cat_id] !== 'Selesai')) {
                        $laundry_counts[$cat_id]++;
                    }
                }
            }

            foreach ($laundry_categories as $id => $kat) {
                $summaryData[] = [
                    'id_kategori' => $id,
                    'nama' => 'Tugas ' . $kat['nama_kategori'],
                    'jumlah' => $laundry_counts[$id] ?? 0,
                    'icon' => $kat['nama_icon'] ?: 'fa-box-open'
                ];
            }
            
            $sql_luar = "SELECT COUNT(*) as jumlah FROM tugas_luar WHERE status != 'Selesai'";
            $luar_count = (int)$this->conn->query($sql_luar)->fetch_assoc()['jumlah'];
            array_unshift($summaryData, ['nama' => 'Tugas Luar', 'jumlah' => $luar_count, 'icon' => 'fa-motorcycle']);

            $sql_anjem = "SELECT COUNT(*) as jumlah FROM tugas_anjem WHERE status = 'Aktif'";
            $anjem_count = (int)$this->conn->query($sql_anjem)->fetch_assoc()['jumlah'];
            array_unshift($summaryData, ['nama' => 'Tugas Anjem', 'jumlah' => $anjem_count, 'icon' => 'fa-truck']);

            sendResponse(['summary' => $summaryData]);

        } catch (Exception $e) {
            sendError(500, 'Gagal memuat ringkasan tugas: ' . $e->getMessage());
        }
    }
    
    public function getList($data)
{
    try {
        $dataSheetName = $data['dataSheetName'] ?? '';
        if (empty($dataSheetName)) throw new Exception('dataSheetName tidak boleh kosong');
        
        $kategori_nama = str_ireplace('Tugas ', '', $dataSheetName);
        $filter = $data['filter'] ?? 'Aktif';
        $result = null;
        
        if (strcasecmp($kategori_nama, 'Anjem') == 0) {
            $jemputCount = 0;
            $antarCount = 0;
            $jemput_count_res = $this->conn->query("SELECT COUNT(*) as total FROM tugas_anjem WHERE status = 'Aktif' AND (id_tugas_referensi IS NULL OR id_tugas_referensi = 'MANUAL_JEMPUT')");
            $jemputCount = $jemput_count_res->fetch_assoc()['total'] ?? 0;
            $antar_count_res = $this->conn->query("SELECT COUNT(*) as total FROM tugas_anjem WHERE status = 'Aktif' AND (id_tugas_referensi IS NOT NULL AND id_tugas_referensi != 'MANUAL_JEMPUT')");
            $antarCount = $antar_count_res->fetch_assoc()['total'] ?? 0;
            
            $base_query = "
                SELECT 
                    ta.*,
                    COALESCE(t.total_biaya, 0) as total_biaya,
                    COALESCE(t.status_bayar, '') as status_bayar,
                    COALESCE(t.jumlah_bayar, 0) as jumlah_bayar,
                    COALESCE(t.foto_barang, '[]') as foto_barang,
                    COALESCE(tl.foto_proses, '[]') as foto_proses,
                    tl.waktu_selesai as waktu_laundry_selesai
                FROM tugas_anjem ta
                LEFT JOIN transaksi t ON ta.id_tugas_referensi = t.id_transaksi
                LEFT JOIN tugas_laundry tl ON t.id_transaksi = tl.id_transaksi_referensi
            ";

            switch ($filter) {
                case 'Jemput': 
                    $sql = $base_query . " WHERE ta.status = 'Aktif' AND (ta.id_tugas_referensi IS NULL OR ta.id_tugas_referensi = 'MANUAL_JEMPUT') ORDER BY ta.tanggal_jemput ASC, ta.jam_jemput ASC"; 
                    break;
                case 'Antar': 
                    $sql = $base_query . " WHERE ta.status = 'Aktif' AND (ta.id_tugas_referensi IS NOT NULL AND ta.id_tugas_referensi != 'MANUAL_JEMPUT') ORDER BY ta.tanggal_jemput ASC, ta.jam_jemput ASC, waktu_laundry_selesai ASC"; 
                    break;
                case 'Selesai': 
                    $sql = $base_query . " WHERE ta.status IN ('terjemput', 'terantar', 'Selesai') ORDER BY ta.waktu_selesai ASC"; 
                    break;
                default: 
                    $sql = $base_query . " ORDER BY ta.tanggal_jemput ASC, ta.jam_jemput ASC"; 
                    break;
            }
            $result = $this->conn->query($sql);
            
            $objects = [];
            while ($row = $result->fetch_assoc()) { $objects[] = $row; }
            sendResponse(['objects' => $objects, 'jemputCount' => $jemputCount, 'antarCount' => $antarCount]);
            return;

        } else if ($dataSheetName === 'Tugas Luar') { // <-- KONDISI DIUBAH MENJADI LEBIH SPESIFIK
            $status_luar_filter = ($filter === 'Selesai') ? "= 'Selesai'" : "!= 'Selesai'";
            $sql = "SELECT *, id_tugas_luar as id_tugas FROM tugas_luar WHERE status {$status_luar_filter} ORDER BY tanggal_pengerjaan ASC, jam_mulai ASC";
            $result = $this->conn->query($sql);
            
        } else { // Untuk semua tugas laundry lainnya (Kiloan, Satuan, dll)
            $stmt_kat = $this->conn->prepare("SELECT id_kategori FROM kategori_layanan WHERE nama_kategori = ?");
            $stmt_kat->bind_param("s", $kategori_nama);
            $stmt_kat->execute();
            $kategori = $stmt_kat->get_result()->fetch_assoc();

            if ($kategori) {
                $id_kategori = $kategori['id_kategori'];
                $status_filter_val = ($filter === 'Selesai') ? 'Selesai' : 'Aktif';
                $sql = "SELECT * FROM tugas_laundry WHERE status = ? AND detail_layanan LIKE ? ORDER BY id_tugas ASC";
                $search_pattern = '%"id_kategori":' . $id_kategori . '%';

                $stmt_tugas = $this->conn->prepare($sql);
                $stmt_tugas->bind_param("ss", $status_filter_val, $search_pattern);
                $stmt_tugas->execute();
                $result = $stmt_tugas->get_result();
            } else {
                 throw new Exception('Tipe tugas tidak valid: ' . htmlspecialchars($dataSheetName));
            }
        }
        
        if ($result === false) {
            throw new Exception('Database query error: ' . $this->conn->error);
        }
        
        $objects = [];
        $foto_barang_cache = [];
        while ($row = $result->fetch_assoc()) {
            if (!isset($row['foto_barang']) && isset($row['id_transaksi_referensi'])) {
                $ref_id = $row['id_transaksi_referensi'];
                if (!isset($foto_barang_cache[$ref_id])) {
                    $stmt_foto = $this->conn->prepare("SELECT foto_barang FROM transaksi WHERE id_transaksi = ?");
                    $stmt_foto->bind_param("s", $ref_id);
                    $stmt_foto->execute();
                    $foto_res = $stmt_foto->get_result()->fetch_assoc();
                    $foto_barang_cache[$ref_id] = $foto_res['foto_barang'] ?? '[]';
                }
                $row['foto_barang'] = $foto_barang_cache[$ref_id];
            }
            if (function_exists('normalizePhotoFields')) {
                normalizePhotoFields($row);
            }
            $objects[] = $row;
        }

        sendResponse(['objects' => $objects]);

    } catch (Exception $e) {
        sendError(500, 'Gagal memuat daftar tugas: ' . $e->getMessage());
    }
}
    
    public function getDetail($data)
    {
        try {
            if (empty($data['id_tugas']) || empty($data['tipe_tugas'])) throw new Exception('ID dan tipe tugas harus diisi');
            $detail = $this->_getTugasData($data['id_tugas'], $data['tipe_tugas']);
            
            // PERBAIKAN: Memastikan kolom foto pada data detail juga diubah menjadi array,
            // sama seperti pada daftar tugas.
            if (isset($detail['tugas']) && function_exists('normalizePhotoFields')) {
                normalizePhotoFields($detail['tugas']);
            }

            sendResponse($detail);
        } catch (Exception $e) {
            sendError(500, 'Gagal memuat detail tugas: ' . $e->getMessage());
        }
    }

    private function _getTugasData($id_tugas, $tipe_tugas)
    {
        $kategori_nama = str_ireplace('Tugas ', '', $tipe_tugas);
        
        $table_name = 'tugas_laundry';
        $id_column = 'id_tugas';
        if (strcasecmp($kategori_nama, 'Anjem') == 0) {
            $table_name = 'tugas_anjem';
            $id_column = 'id_perintah';
        } else if (strcasecmp($kategori_nama, 'Luar') == 0) {
            $table_name = 'tugas_luar';
            $id_column = 'id_tugas_luar';
        }

        $stmt_tugas = $this->conn->prepare("SELECT * FROM {$table_name} WHERE {$id_column} = ?");
        $stmt_tugas->bind_param('s', $id_tugas);
        $stmt_tugas->execute();
        $result = $stmt_tugas->get_result();
        if ($result->num_rows === 0) throw new Exception('Tugas tidak ditemukan');
        $tugas = $result->fetch_assoc();
        
        $id_kategori_view = null;
        if (!in_array(strtolower($kategori_nama), ['anjem', 'luar'])) {
            $stmt_kat = $this->conn->prepare("SELECT id_kategori FROM kategori_layanan WHERE nama_kategori = ?");
            $stmt_kat->bind_param("s", $kategori_nama);
            $stmt_kat->execute();
            $kategori_result = $stmt_kat->get_result()->fetch_assoc();
            if ($kategori_result) {
                $id_kategori_view = $kategori_result['id_kategori'];
            }
        }

        $proses_kerja = [];
        if ($id_kategori_view) {
            $sql_proses = "SELECT pk.id as id_proses, pk.nama_proses FROM proses_kerja pk JOIN kategori_proses_kerja kpk ON pk.id = kpk.id_proses WHERE kpk.id_kategori = ? ORDER BY pk.urutan";
            $stmt_proses = $this->conn->prepare($sql_proses);
            $stmt_proses->bind_param('i', $id_kategori_view);
            $stmt_proses->execute();
            $result_proses = $stmt_proses->get_result();
            while ($row = $result_proses->fetch_assoc()) $proses_kerja[] = $row;
        }
        return ['tugas' => $tugas, 'proses_kerja' => $proses_kerja, 'id_kategori_view' => $id_kategori_view];
    }
    
    /**
     * PERUBAHAN UTAMA UNTUK LOGGING PER-LAYANAN
     * Fungsi ini sekarang menerima 'layanan_index' untuk mengetahui
     * proses ini dicatat untuk layanan yang mana.
     */
    public function updateProses($data)
    {
        try {
            $id_tugas = $data['id_tugas'];
            $layanan_index = $data['layanan_index']; // <-- PARAMETER BARU
            $newly_completed_processes = $data['newly_completed_processes'];
            $loggedInUser = $data['loggedInUser'];
            
            if (!isset($layanan_index)) {
                throw new Exception("Index layanan tidak disertakan dalam permintaan.");
            }

            $this->conn->begin_transaction();

            // Ambil data tugas, terutama detail_layanan
            $stmt_get = $this->conn->prepare("SELECT detail_layanan, log_pengerjaan FROM tugas_laundry WHERE id_tugas = ? FOR UPDATE");
            $stmt_get->bind_param("s", $id_tugas);
            $stmt_get->execute();
            $task = $stmt_get->get_result()->fetch_assoc();
            
            $log_pengerjaan = json_decode($task['log_pengerjaan'], true) ?: [];
            $detail_layanan = json_decode($task['detail_layanan'], true) ?: [];
            
            // Dapatkan info layanan spesifik dari index-nya
            if (!isset($detail_layanan[$layanan_index])) {
                throw new Exception("Layanan dengan index {$layanan_index} tidak ditemukan.");
            }
            $layananSpesifik = $detail_layanan[$layanan_index];

            // Ambil nama-nama proses dari database
            $placeholders = implode(',', array_fill(0, count($newly_completed_processes), '?'));
            $stmt_get_proses_names = $this->conn->prepare("SELECT id, nama_proses FROM proses_kerja WHERE id IN ($placeholders)");
            $stmt_get_proses_names->bind_param(str_repeat('i', count($newly_completed_processes)), ...$newly_completed_processes);
            $stmt_get_proses_names->execute();
            
            $proses_results = $stmt_get_proses_names->get_result();
            $proses_map = [];
            while ($row = $proses_results->fetch_assoc()) {
                $proses_map[$row['id']] = $row['nama_proses'];
            }

            // Buat entri log untuk setiap proses yang dicentang
            foreach($newly_completed_processes as $proses_id) {
                $log_pengerjaan[] = [
                    'id_proses'     => $proses_id,
                    'nama_proses'   => $proses_map[$proses_id] ?? 'N/A',
                    'layanan_index' => $layanan_index, // <-- SIMPAN INDEX LAYANAN
                    'id_layanan'    => $layananSpesifik['id_layanan'],
                    'nama_layanan'  => $layananSpesifik['nama_layanan'],
                    'id_kategori'   => $layananSpesifik['id_kategori'],
                    'dikerjakan_oleh' => $loggedInUser,
                    'waktu_selesai' => date('Y-m-d H:i:s')
                ];
            }
            
            $log_pengerjaan_json = json_encode($log_pengerjaan);
            $stmt_update = $this->conn->prepare("UPDATE tugas_laundry SET log_pengerjaan = ?, diupdate_oleh = ? WHERE id_tugas = ?");
            $stmt_update->bind_param('sss', $log_pengerjaan_json, $loggedInUser, $id_tugas);
            if (!$stmt_update->execute()) throw new Exception("Gagal update log pengerjaan.");
            
            $this->conn->commit();
            sendResponse(['message' => 'Proses berhasil diperbarui.']);
            
        } catch (Exception $e) {
            $this->conn->rollback();
            sendError(500, 'Gagal memperbarui proses: ' . $e->getMessage());
        }
    }

    private function isTaskFullyCompleted($id_tugas) {
        $stmt = $this->conn->prepare("SELECT detail_layanan, status_kategori FROM tugas_laundry WHERE id_tugas = ?");
        $stmt->bind_param("s", $id_tugas);
        $stmt->execute();
        $task = $stmt->get_result()->fetch_assoc();
        if (!$task) return false;

        $detail_layanan = json_decode($task['detail_layanan'], true) ?: [];
        $status_kategori = json_decode($task['status_kategori'], true) ?: [];
        $all_required_cat_ids = array_unique(array_column($detail_layanan, 'id_kategori'));
        
        foreach($all_required_cat_ids as $cat_id) {
            if (!isset($status_kategori[$cat_id]) || $status_kategori[$cat_id] !== 'Selesai') {
                return false;
            }
        }
        return true;
    }
    
     public function selesaikanKategoriTugas($data) {
        try {
            $id_tugas = $data['id_tugas'];
            $id_kategori = $data['id_kategori_view'];
            $loggedInUser = $data['loggedInUser'];
            $foto_urls_baru = $data['foto_urls'] ?? [];
            $catatan_baru = $data['catatan_selesai'] ?? null;

            $this->conn->begin_transaction();
            
            // 1. Ambil data lama, termasuk catatan_selesai dan foto_proses
            $stmt_get = $this->conn->prepare("SELECT status_kategori, log_pengerjaan, foto_proses, catatan_selesai, detail_layanan FROM tugas_laundry WHERE id_tugas = ? FOR UPDATE");
            $stmt_get->bind_param("s", $id_tugas);
            $stmt_get->execute();
            $task = $stmt_get->get_result()->fetch_assoc();

            $status_kategori = json_decode($task['status_kategori'], true) ?: [];
            $log_pengerjaan = json_decode($task['log_pengerjaan'], true) ?: [];
            
            // 2. Ubah foto dan catatan menjadi struktur Peta (Map)
            $foto_map = json_decode($task['foto_proses'], true) ?: [];
            if (!is_array($foto_map) || (isset($foto_map[0]) && !is_array($foto_map[0]))) { // Deteksi format lama/salah
                $foto_map = []; // Reset jika format salah
            }

            $catatan_map = json_decode($task['catatan_selesai'], true) ?: [];
            if (!is_array($catatan_map)) {
                $catatan_map = []; // Reset jika format salah
            }
            
            $status_kategori[$id_kategori] = 'Selesai';
            
            // 3. Gabungkan foto baru ke dalam map untuk kategori yang spesifik
            $foto_kategori_lama = $foto_map[$id_kategori] ?? [];
            $foto_map[$id_kategori] = array_values(array_unique(array_merge($foto_kategori_lama, $foto_urls_baru)));
            $all_photos_json = json_encode($foto_map);

            // 4. Tambahkan/update catatan untuk kategori yang spesifik
            if (isset($catatan_baru) && !empty($catatan_baru)) {
                $catatan_map[$id_kategori] = $catatan_baru;
            }
            $all_catatan_json = json_encode($catatan_map);

            // Otomatis lengkapi proses yang belum di-log
            $stmt_req = $this->conn->prepare("SELECT pk.id as id_proses, pk.nama_proses FROM kategori_proses_kerja kpk JOIN proses_kerja pk ON kpk.id_proses = pk.id WHERE kpk.id_kategori = ?");
            $stmt_req->bind_param("i", $id_kategori);
            $stmt_req->execute();
            $required_processes_result = $stmt_req->get_result();
            
            $required_processes = [];
            while ($row = $required_processes_result->fetch_assoc()) {
                $required_processes[] = $row;
            }
            
            $logged_processes = [];
            foreach ($log_pengerjaan as $log) {
                if ($log['id_kategori'] == $id_kategori) {
                    $logged_processes[] = $log['id_proses'];
                }
            }
            
            $detail_layanan = json_decode($task['detail_layanan'], true) ?: [];
            $layanan_di_kategori_ini = [];
            foreach ($detail_layanan as $l) {
                if ($l['id_kategori'] == $id_kategori) {
                    $layanan_di_kategori_ini[] = $l;
                }
            }

            foreach($required_processes as $proses) {
                if (!in_array($proses['id_proses'], $logged_processes)) {
                    foreach ($layanan_di_kategori_ini as $layanan) { // Log untuk setiap layanan dalam kategori
                        $log_pengerjaan[] = [
                            'id_proses' => $proses['id_proses'],
                            'nama_proses' => $proses['nama_proses'],
                            'id_layanan' => $layanan['id_layanan'],
                            'nama_layanan' => $layanan['nama_layanan'],
                            'id_kategori' => $id_kategori,
                            'dikerjakan_oleh' => $loggedInUser,
                            'waktu_selesai' => date('Y-m-d H:i:s')
                        ];
                    }
                }
            }
            
            // 5. Update database dengan JSON yang sudah terstruktur
            $stmt_update = $this->conn->prepare("UPDATE tugas_laundry SET status_kategori = ?, log_pengerjaan = ?, diupdate_oleh = ?, foto_proses = ?, catatan_selesai = ? WHERE id_tugas = ?");
            $stmt_update->bind_param('ssssss', json_encode($status_kategori), json_encode($log_pengerjaan), $loggedInUser, $all_photos_json, $all_catatan_json, $id_tugas);
            if (!$stmt_update->execute()) throw new Exception("Gagal update status kategori.");

            if ($this->isTaskFullyCompleted($id_tugas)) {
                $stmt_complete = $this->conn->prepare("UPDATE tugas_laundry SET status = 'Selesai', waktu_selesai = NOW() WHERE id_tugas = ?");
                $stmt_complete->bind_param("s", $id_tugas);
                $stmt_complete->execute();
                $this->checkAndActivateDeliveryTask($id_tugas);
            }

            $this->conn->commit();
            sendResponse(['message' => 'Kategori tugas berhasil diselesaikan.']);

        } catch (Exception $e) {
            $this->conn->rollback();
            sendError(500, "Gagal menyelesaikan kategori: " . $e->getMessage());
        }
    }
    
    private function checkAndActivateDeliveryTask($id_tugas_laundry) {
    $stmt_get_ref = $this->conn->prepare("SELECT id_transaksi_referensi FROM tugas_laundry WHERE id_tugas = ?");
    $stmt_get_ref->bind_param("s", $id_tugas_laundry);
    $stmt_get_ref->execute();
    $result = $stmt_get_ref->get_result()->fetch_assoc();
    if (!$result) return;
    $id_transaksi = $result['id_transaksi_referensi'];

    // PERUBAHAN: Tambahkan SET tanggal_jemput dan jam_jemput dengan waktu saat ini
    $stmt_activate = $this->conn->prepare(
        "UPDATE tugas_anjem 
         SET 
            status = 'Aktif', 
            tanggal_jemput = CURDATE(), 
            jam_jemput = CURTIME() 
         WHERE id_tugas_referensi = ? AND status = 'Menunggu Selesai'"
    );
    $stmt_activate->bind_param("s", $id_transaksi);
    $stmt_activate->execute();
}

    public function deleteTugas($data)
    {
        try {
            if (empty($data['id_tugas']) || empty($data['tipe_tugas'])) throw new Exception('ID tugas atau tipe tugas tidak ada.');
            
            $sql = "";
            $kategori_nama = str_ireplace('Tugas ', '', $data['tipe_tugas']);
            switch (true) {
                case (strcasecmp($kategori_nama, 'Anjem') == 0):
                    $sql = "DELETE FROM tugas_anjem WHERE id_perintah = ?"; 
                    break;
                default: 
                    $sql = "DELETE FROM tugas_laundry WHERE id_tugas = ?"; 
                    break;
            }
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param('s', $data['id_tugas']);
            if (!$stmt->execute()) throw new Exception('Gagal menghapus tugas: ' . $stmt->error);
            
            sendResponse(['message' => 'Tugas berhasil dihapus.']);
            
        } catch (Exception $e) {
            sendError(500, 'Gagal menghapus tugas: ' . $e->getMessage());
        }
    }

    public function submitAnjemTask($data)
    {
        try {
            $formData = $data['formData'];
            $id = $data['id'] ?? null;
            $loggedInUserId = $data['loggedInUser']['username'];

            if (empty($formData['nama_pelanggan']) || empty($formData['alamat'])) {
                throw new Exception("Nama pelanggan dan alamat wajib diisi.");
            }
            
            $tipe = $formData['tipe_tugas_anjem'] ?? 'Jemput';
            $ref_id = ($tipe === 'Antar') ? 'MANUAL_ANTAR' : 'MANUAL_JEMPUT';
            $id_konsumen = $formData['id_konsumen'] ?? null;
            $keterangan = $formData['keterangan'] ?? null;
            
            // Ambil daftar foto final dari frontend dan konversi ke JSON
            $final_photos = $formData['foto_tugas'] ?? [];
            $final_photos_json = json_encode($final_photos);

            if ($id) { // Update
                $stmt = $this->conn->prepare("
                    UPDATE tugas_anjem 
                    SET 
                        id_konsumen=?, nama_pelanggan=?, alamat=?, no_telp_pelanggan=?, 
                        link_peta=?, tanggal_jemput=?, jam_jemput=?, keterangan=?, 
                        diupdate_oleh=?, foto_tugas=? 
                    WHERE id_perintah=?"
                );
                $stmt->bind_param(
                    "sssssssssss", 
                    $id_konsumen, 
                    $formData['nama_pelanggan'], 
                    $formData['alamat'], 
                    $formData['no_telp_pelanggan'], 
                    $formData['link_peta'], 
                    $formData['tanggal_jemput'], 
                    $formData['jam_jemput'], 
                    $keterangan, 
                    $loggedInUserId, 
                    $final_photos_json, 
                    $id
                );

            } else { // Insert
                $newId = generateRandomId('ANJ');
                $stmt = $this->conn->prepare("INSERT INTO tugas_anjem (id_perintah, id_konsumen, nama_pelanggan, alamat, no_telp_pelanggan, link_peta, tanggal_jemput, jam_jemput, keterangan, status, id_tugas_referensi, pembuat, foto_tugas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aktif', ?, ?, ?)");
                $stmt->bind_param("ssssssssssss", $newId, $id_konsumen, $formData['nama_pelanggan'], $formData['alamat'], $formData['no_telp_pelanggan'], $formData['link_peta'], $formData['tanggal_jemput'], $formData['jam_jemput'], $keterangan, $ref_id, $loggedInUserId, $final_photos_json);
            }
            
            if (!$stmt->execute()) {
                throw new Exception("Gagal menyimpan tugas anjem: " . $stmt->error);
            }
            sendResponse(['message' => 'Tugas Anjem berhasil disimpan.']);

        } catch (Exception $e) {
            sendError(500, $e->getMessage());
        }
    }

    public function selesaikanTugasAntar($data)
    {
        try {
            $id_tugas = $data['id_tugas'];
            $foto_urls = $data['foto_urls'] ?? [];
            $jumlah_bayar_aktual = $data['jumlah_bayar_aktual'] ?? null;
            $catatan_pembayaran_tambahan = $data['catatan_pembayaran'] ?? null;
            $loggedInUser = $data['loggedInUser'] ?? null;
            $catatan_selesai = $data['catatan_selesai'] ?? null;

            if (empty($id_tugas) || empty($loggedInUser)) throw new Exception("ID Tugas dan info pengguna wajib diisi.");

            $this->conn->begin_transaction();

            $stmt_get_ref = $this->conn->prepare("SELECT id_tugas_referensi, foto_bukti FROM tugas_anjem WHERE id_perintah = ? FOR UPDATE");
            $stmt_get_ref->bind_param("s", $id_tugas);
            $stmt_get_ref->execute();
            $tugas = $stmt_get_ref->get_result()->fetch_assoc();
            if (!$tugas) throw new Exception("Tugas tidak ditemukan.");
            
            $id_transaksi = $tugas['id_tugas_referensi'];
            $next_status = (strpos($id_transaksi, 'MANUAL_JEMPUT') !== false || $id_transaksi == null) ? 'terjemput' : 'terantar';

            $existing_photos = json_decode($tugas['foto_bukti'] ?? '[]', true) ?: [];
            $all_photos = array_merge($existing_photos, $foto_urls);
            $foto_bukti_json = json_encode($all_photos);

            $stmt_update_anjem = $this->conn->prepare("UPDATE tugas_anjem SET status = ?, waktu_selesai = NOW(), foto_bukti = ?, catatan_selesai = ? WHERE id_perintah = ?");
            $stmt_update_anjem->bind_param("ssss", $next_status, $foto_bukti_json, $catatan_selesai, $id_tugas);
            if (!$stmt_update_anjem->execute()) throw new Exception("Gagal update tugas anjem.");
            
            if (isset($jumlah_bayar_aktual) && $id_transaksi && strpos($id_transaksi, 'MANUAL') === false) {
                
                $stmt_get_trx = $this->conn->prepare("SELECT total_biaya, jumlah_bayar, catatan_pembayaran, status_bayar FROM transaksi WHERE id_transaksi = ? FOR UPDATE");
                $stmt_get_trx->bind_param("s", $id_transaksi);
                $stmt_get_trx->execute();
                $transaksi = $stmt_get_trx->get_result()->fetch_assoc();

                if ($transaksi) {
                    $total_tagihan = (float)$transaksi['total_biaya'];
                    $sudah_bayar = (float)$transaksi['jumlah_bayar'];
                    $bayar_baru = (float)$jumlah_bayar_aktual;
                    $total_pembayaran_baru = $sudah_bayar + $bayar_baru;
                    
                    // PERUBAHAN LOGIKA: status_transaksi akan SELALU TETAP 'Aktif' di sini.
                    // Status baru akan di-set menjadi 'Selesai' oleh admin di halaman Setoran Kas.
                    $status_transaksi_baru = 'Aktif';
                    $status_bayar_baru = $transaksi['status_bayar']; 
                    
                    if ($total_pembayaran_baru >= $total_tagihan) {
                        $status_bayar_baru = 'Tunai Diterima Kurir';
                    } elseif ($total_pembayaran_baru > 0) {
                        $status_bayar_baru = 'DP';
                    }
                    
                    $catatan_pembayaran_final = $transaksi['catatan_pembayaran'] ?? '';
                    if ($bayar_baru > 0) {
                        $catatan_pembayaran_baru = "Tunai Rp" . number_format($bayar_baru) . " diterima oleh kurir " . $loggedInUser . ". " . ($catatan_pembayaran_tambahan ?? '');
                        $catatan_pembayaran_final .= ($catatan_pembayaran_final ? "\n" : '') . $catatan_pembayaran_baru;
                    }

                    // Query diubah, TIDAK lagi mengupdate status_transaksi
                    $stmt_update_trx = $this->conn->prepare(
                        "UPDATE transaksi SET 
                            jumlah_bayar = ?, status_bayar = ?, catatan_pembayaran = ?, foto_antar = ?, 
                            waktu_ambil = NOW(), diserahkan_oleh = ? 
                        WHERE id_transaksi = ?"
                    );
                    
                    $stmt_update_trx->bind_param(
                        "dsssss", 
                        $total_pembayaran_baru, 
                        $status_bayar_baru, 
                        $catatan_pembayaran_final, 
                        $foto_bukti_json, 
                        $loggedInUser, 
                        $id_transaksi
                    );
                    if (!$stmt_update_trx->execute()) throw new Exception("Gagal update transaksi: " . $stmt_update_trx->error);
                }

            } else if ($id_transaksi && strpos($id_transaksi, 'MANUAL') === false) {
                $stmt_update_trx_selesai = $this->conn->prepare(
                    "UPDATE transaksi SET foto_antar = ?, waktu_ambil = NOW(), diserahkan_oleh = ? WHERE id_transaksi = ?"
                );
                $stmt_update_trx_selesai->bind_param("sss", $foto_bukti_json, $loggedInUser, $id_transaksi);
                if (!$stmt_update_trx_selesai->execute()) throw new Exception("Gagal menyelesaikan transaksi.");
            }

            $this->conn->commit();
            sendResponse(['message' => 'Tugas pengantaran berhasil diselesaikan.']);
        } catch (Exception $e) {
            $this->conn->rollback();
            sendError(500, 'Gagal menyelesaikan tugas antar: ' . $e->getMessage());
        }
    }

    public function selesaikanLayananTugas($data)
    {
        try {
            $id_tugas = $data['id_tugas'];
            $layanan_index = $data['layanan_index']; // Index dari layanan di dalam array JSON
            $loggedInUser = $data['loggedInUser'];
            $foto_urls_baru = $data['foto_urls'] ?? [];
            $catatan_baru = $data['catatan_selesai'] ?? null;

            if (!isset($id_tugas, $layanan_index, $loggedInUser)) {
                throw new Exception("Data tidak lengkap.");
            }

            $this->conn->begin_transaction();

            // Kunci baris untuk update yang aman
            $stmt_get = $this->conn->prepare("SELECT detail_layanan, log_pengerjaan, foto_proses, catatan_selesai FROM tugas_laundry WHERE id_tugas = ? FOR UPDATE");
            $stmt_get->bind_param("s", $id_tugas);
            $stmt_get->execute();
            $task = $stmt_get->get_result()->fetch_assoc();

            $detail_layanan = json_decode($task['detail_layanan'], true) ?: [];
            $log_pengerjaan = json_decode($task['log_pengerjaan'], true) ?: [];
            $foto_map = json_decode($task['foto_proses'], true) ?: [];
            $catatan_map = json_decode($task['catatan_selesai'], true) ?: [];
            
            // Pastikan index valid
            if (!isset($detail_layanan[$layanan_index])) {
                $this->conn->rollback();
                throw new Exception("Layanan tidak ditemukan pada tugas ini.");
            }

            // 1. Update status di dalam JSON detail_layanan
            $detail_layanan[$layanan_index]['status'] = 'Selesai';
            $layananSelesai = $detail_layanan[$layanan_index];
            
            // 2. Tambahkan Log Pengerjaan spesifik untuk layanan ini
            $log_pengerjaan[] = [
                'nama_proses' => 'Penyelesaian Layanan', // Nama proses generik
                'id_layanan' => $layananSelesai['id_layanan'],
                'nama_layanan' => $layananSelesai['nama_layanan'],
                'id_kategori' => $layananSelesai['id_kategori'],
                'dikerjakan_oleh' => $loggedInUser,
                'waktu_selesai' => date('Y-m-d H:i:s')
            ];

            // 3. Simpan foto dan catatan berdasarkan ID Kategori (agar tergabung)
            $id_kategori = $layananSelesai['id_kategori'];
            if (!empty($foto_urls_baru)) {
                $foto_kategori_lama = $foto_map[$id_kategori] ?? [];
                $foto_map[$id_kategori] = array_values(array_unique(array_merge($foto_kategori_lama, $foto_urls_baru)));
            }
            if (!empty($catatan_baru)) {
                // Tambahkan catatan baru dengan prefix nama layanan
                $catatan_map[$id_kategori] = ($catatan_map[$id_kategori] ?? '') . "\n- " . $layananSelesai['nama_layanan'] . ": " . $catatan_baru;
            }

            // Update kembali ke database
            $stmt_update = $this->conn->prepare("UPDATE tugas_laundry SET detail_layanan = ?, log_pengerjaan = ?, foto_proses = ?, catatan_selesai = ? WHERE id_tugas = ?");
            $stmt_update->bind_param('sssss', json_encode($detail_layanan), json_encode($log_pengerjaan), json_encode($foto_map), json_encode($catatan_map), $id_tugas);
            if (!$stmt_update->execute()) throw new Exception("Gagal update tugas.");

            // Cek apakah SEMUA layanan dalam tugas ini sudah selesai
            $semuaSelesai = true;
            foreach($detail_layanan as $item) {
                if (($item['status'] ?? 'Aktif') !== 'Selesai') {
                    $semuaSelesai = false;
                    break;
                }
            }

            // Jika semua layanan selesai, update status utama tugas
            if ($semuaSelesai) {
                $stmt_complete = $this->conn->prepare("UPDATE tugas_laundry SET status = 'Selesai', waktu_selesai = NOW() WHERE id_tugas = ?");
                $stmt_complete->bind_param("s", $id_tugas);
                $stmt_complete->execute();
                $this->checkAndActivateDeliveryTask($id_tugas);
            }

            $this->conn->commit();
            sendResponse(['message' => 'Layanan berhasil diselesaikan.']);
        } catch (Exception $e) {
            $this->conn->rollback();
            sendError(500, 'Gagal menyelesaikan layanan: ' . $e->getMessage());
        }
    }
    
} // <-- kurung kurawal penutup Class
?>