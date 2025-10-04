<?php
/**
 * File: app/modules/konsumen/KonsumenModel.php
 * Model untuk modul Konsumen.
 */

class KonsumenModel
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function getAll()
    {
        $konsumen = [];
        $result = $this->conn->query("SELECT * FROM konsumen ORDER BY nama_konsumen ASC");
        while ($row = $result->fetch_assoc()) {
            $konsumen[] = $row;
        }
        return $konsumen;
    }

    public function getById($id)
    {
        $stmt = $this->conn->prepare("SELECT * FROM konsumen WHERE id_konsumen = ?");
        $stmt->bind_param("s", $id);
        $stmt->execute();
        
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    public function getByPhone($phone)
    {
        if (empty($phone)) {
            return null;
        }
        $stmt = $this->conn->prepare("SELECT * FROM konsumen WHERE no_telpon = ?");
        $stmt->bind_param("s", $phone);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    public function submit($data)
{
    $formData = $data['formData'];
    $id = $data['id'] ?? null;

    // --- BAGIAN VALIDASI LAMA (TETAP ADA) ---
    if (empty($formData['nama_konsumen'])) {
        throw new Exception("Nama konsumen wajib diisi.");
    }
    if (empty($formData['no_telpon'])) {
        throw new Exception("Nomor telepon wajib diisi.");
    }
    if (empty($formData['alamat'])) {
        throw new Exception("Alamat wajib diisi.");
    }

    // --- BAGIAN PEMBERSIHAN & CEK DUPLIKAT NO. TELPON (TETAP ADA) ---
    $phone = preg_replace('/\\D/', '', $formData['no_telpon'] ?? '');
    if (substr($phone, 0, 2) === '08') {
        $phone = '628' . substr($phone, 2);
    }
    $formData['no_telpon'] = $phone;

    if (!empty($phone)) {
        $existing = $this->getByPhone($phone);
        if ($existing && $existing['id_konsumen'] !== $id) {
            throw new Exception("DUPLICATE_PHONE::" . json_encode([$existing]));
        }
    }
    
    // --- LOGIKA BARU UNTUK B2B ---
    $tipe_konsumen = $formData['tipe_konsumen'] ?? 'B2C';
    $nama_perusahaan = ($tipe_konsumen === 'B2B') ? ($formData['nama_perusahaan'] ?? null) : null;
    $password = $formData['password'] ?? null;
    // Jika password di-hash (sangat direkomendasikan di masa depan)
    // if (!empty($password)) {
    //     $password = password_hash($password, PASSWORD_DEFAULT);
    // }

    if ($id) { // --- PROSES UPDATE ---
        $sql = "UPDATE konsumen SET nama_konsumen=?, no_telpon=?, alamat=?, peta_lokasi=?, catatan=?, tipe_konsumen=?, nama_perusahaan=?";
        $types = "ssssssss";
        $params = [
            $formData['nama_konsumen'], $formData['no_telpon'], $formData['alamat'], 
            $formData['peta_lokasi'], $formData['catatan'], $tipe_konsumen, $nama_perusahaan
        ];

        // Hanya update password jika diisi
        if (!empty($password)) {
            $sql .= ", password=?";
            $types .= "s";
            $params[] = $password;
        }

        $sql .= " WHERE id_konsumen=?";
        $types .= "s";
        $params[] = $id;

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param($types, ...$params);

    } else { // --- PROSES INSERT BARU ---
        $newId = generateRandomId('KSM');
        $stmt = $this->conn->prepare("INSERT INTO konsumen (id_konsumen, nama_konsumen, no_telpon, alamat, peta_lokasi, catatan, tipe_konsumen, nama_perusahaan, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssssss", 
            $newId, $formData['nama_konsumen'], $formData['no_telpon'], $formData['alamat'], 
            $formData['peta_lokasi'], $formData['catatan'], $tipe_konsumen, $nama_perusahaan, $password
        );
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Gagal menyimpan data konsumen: " . $stmt->error);
    }
    return $this->getById($id ?? $newId);
}
	
    public function delete($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM konsumen WHERE id_konsumen = ?");
        $stmt->bind_param("s", $id);
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus konsumen: " . $stmt->error);
        }
    }
}

