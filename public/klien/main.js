import { callAppsScriptAPI } from './api.js';
import { showToast } from './ui.js';

// --- Elemen-elemen Halaman ---
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');
const authPage = document.getElementById('auth-page');
const appPage = document.getElementById('app-page');

// --- Fungsi Tampilkan Halaman ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const pageToShow = document.getElementById(pageId);
    if (pageToShow) {
        pageToShow.style.display = 'block';
        if (pageId === 'auth-page') {
             pageToShow.style.display = 'flex';
        }
    }
}

// --- Logika Login ---
async function handleLogin(event) {
    event.preventDefault();
    const no_telpon = document.getElementById('login-notelp').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await callAppsScriptAPI('loginB2B', { no_telpon, password });
        localStorage.setItem('b2bUser', JSON.stringify(res.response.userData));
        initializeApp(res.response.userData);
    } catch (err) {
        swal("Login Gagal", err.message, "error");
    }
}

// --- Logika Registrasi ---
async function handleRegister(event) {
    event.preventDefault();
    const formData = {
        nama_perusahaan: document.getElementById('register-nama-perusahaan').value,
        nama_lengkap: document.getElementById('register-nama').value,
        jabatan: document.getElementById('register-jabatan').value,
        no_telpon: document.getElementById('register-notelp').value,
        password: document.getElementById('register-password').value,
    };

    if (!formData.nama_perusahaan.trim() || !formData.nama_lengkap.trim() || !formData.no_telpon.trim() || !formData.password.trim()) {
        return swal("Oops..", "Semua kolom wajib diisi.", "warning");
    }

    try {
        const res = await callAppsScriptAPI('registrasiB2B', { formData });
        swal({
            title: "Registrasi Berhasil!",
            text: res.response.message,
            icon: "success",
            button: "Mengerti",
        }).then(() => {
            window.location.reload(); // Kembali ke halaman login
        });
    } catch (err) {
        swal("Registrasi Gagal", err.message, "error");
    }
}

// --- Inisialisasi Aplikasi Setelah Login ---
function initializeApp(user) {
    showPage('app-page');
    document.getElementById('user-name').textContent = user.nama_lengkap.split(' ')[0];
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('b2bUser');
        window.location.reload();
    });
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const storedUser = localStorage.getItem('b2bUser');
    if (storedUser) {
        initializeApp(JSON.parse(storedUser));
    } else {
        showPage('auth-page');
    }
});

document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('register-form').addEventListener('submit', handleRegister);

document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.classList.add('hidden');
    registerContainer.classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
});