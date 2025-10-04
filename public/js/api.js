/**
 * FILE INI BERISI SEMUA FUNGSI UNTUK BERKOMUNIKASI DENGAN API BACKEND (api.php)
 */
import { showLoading, hideLoading, showToast } from './ui.js';

// PERBAIKAN: Menggunakan jalur absolut dengan HTTPS yang benar
const API_URL = "/api.php"; // Tanda / di awal berarti mulai dari root domain

/**
 * Mengirim permintaan ke backend API.
 * @param {string} action - Aksi yang akan dipanggil di backend.
 * @param {Object} payload - Data yang akan dikirim.
 * @returns {Promise<Object>} - Hasil dari API.
 */
export async function callAppsScriptAPI(action, payload) {
    showLoading();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: action, payload: payload }),
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' }
        });
        
        // --- PERBAIKAN UTAMA DIMULAI DI SINI ---
        if (!response.ok) { // response.ok bernilai false untuk status 4xx dan 5xx
            let serverMessage = `Server error (${response.status}): ${response.statusText}`;
            try {
                // Coba ambil pesan error yang lebih spesifik dari JSON yang dikirim server
                const errorResult = await response.json();
                if (errorResult && errorResult.message) {
                    serverMessage = errorResult.message;
                }
            } catch (e) {
                // Biarkan serverMessage default jika response error bukan JSON
                console.error("Could not parse error response as JSON.", e);
            }
            hideLoading();
            throw new Error(serverMessage); // Lemparkan error dengan pesan dari server
        }
        // --- PERBAIKAN SELESAI ---
        
        // Kode di bawah ini hanya berjalan jika response.ok adalah true (status 2xx)
        let result;
        try {
            result = await response.json();
            console.log("✅ Data JSON berhasil diterima:", result);
        } catch (jsonError) {
            console.error("❌ Gagal parsing JSON:", jsonError);
            hideLoading();
            throw new Error("Respons dari server bukan format JSON yang valid.");
        }
        
        hideLoading();
        
        if (result.success === false) {
            throw new Error(result.message || "Operasi di server gagal.");
        }
        
        return result;
        
    } catch (error) {
        hideLoading();
        console.error("❌ Detail Error di callAppsScriptAPI:", error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error("Koneksi ke server gagal. Periksa jaringan Anda atau coba lagi nanti.");
        } else if (error.message.includes('Failed to fetch')) {
            throw new Error("Tidak dapat mengakses server. Periksa koneksi internet Anda.");
        }
        
        throw error;
    }
}


/**
 * FUNGSI HELPER: Test koneksi ke API
 * Gunakan untuk debugging koneksi
 */
export async function testAPIConnection() {
    try {
        console.log("🔍 Testing API connection...");
        const result = await callAppsScriptAPI('test', {});
        console.log("✅ API connection successful:", result);
        return true;
    } catch (error) {
        console.error("❌ API connection failed:", error.message);
        return false;
    }
}

/**
 * FUNGSI HELPER: Retry API call dengan backoff
 * @param {string} action 
 * @param {Object} payload 
 * @param {number} maxRetries 
 * @returns {Promise<Object>}
 */
export async function callAPIWithRetry(action, payload, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Attempt ${attempt}/${maxRetries} for action: ${action}`);
            return await callAppsScriptAPI(action, payload);
        } catch (error) {
            lastError = error;
            console.warn(`❌ Attempt ${attempt} failed:`, error.message);
            
            if (attempt < maxRetries) {
                // Wait before retry (exponential backoff)
                const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    throw lastError;
}