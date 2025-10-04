/**
 * File: app/public/js/ui.js
 * Berisi fungsi utilitas untuk memanipulasi UI, seperti notifikasi.
 */

export function showToast(type, message) {
    const toastId = "toast_" + Math.random().toString(36).substring(2);
    const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";
    const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-triangle";
    const toastHTML = `<div id="${toastId}" class="flex items-center w-full max-w-xs p-4 space-x-4 text-white ${bgColor} rounded-lg shadow" role="alert"><i class="fas ${icon}"></i><div class="pl-4 text-sm font-normal">${message}</div></div>`;
    const container = document.getElementById('toastContainer');
    container.insertAdjacentHTML('beforeend', toastHTML);
    setTimeout(() => { document.getElementById(toastId)?.remove(); }, 4000);
}

export function showLoading() { document.getElementById('loadingOverlay')?.classList.remove('hidden'); }
export function hideLoading() { document.getElementById('loadingOverlay')?.classList.add('hidden'); }
export function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.getElementById(pageId)?.classList.remove('hidden');
}

export function initializeUI(user) {
    const userMenuButton = document.getElementById('user-menu-button');
    const userMenu = document.getElementById('user-menu');
    userMenuButton.addEventListener('click', (e) => { e.stopPropagation(); userMenu.classList.toggle('hidden'); });
    document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target) && !userMenuButton.contains(e.target)) userMenu.classList.add('hidden');
    });
    document.querySelectorAll('.logout-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            swal({ title: "Konfirmasi Logout", text: "Apakah Anda yakin ingin keluar?", icon: "warning", buttons: ["Batal", "Ya, Logout"], dangerMode: true })
            .then((willLogout) => {
                if (willLogout) {
                    localStorage.removeItem('familyLaundryUser');
                    window.location.hash = ''; window.location.reload();
                }
            });
        });
    });
}

export function waitForElements(selectorArray, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const interval = 100; let elapsedTime = 0;
        const check = () => {
            const elements = selectorArray.map(selector => document.getElementById(selector));
            if (elements.every(el => el !== null)) resolve(elements);
            else if (elapsedTime >= timeout) reject(new Error(`Timeout: Elemen tidak ditemukan - ${selectorArray.filter(s => !document.getElementById(s)).join(', ')}`));
            else { elapsedTime += interval; setTimeout(check, interval); }
        };
        check();
    });
}
/**
 * Memperbarui ikon pengguna di header dengan foto profil jika tersedia.
 * @param {Object} user - Objek pengguna yang sedang login.
 */
export function updateUserIcon(user) {
    const userIconContainer = document.getElementById('user-initial');
    if (!userIconContainer) return;

    const defaultIcon = '<i class="fas fa-user-circle text-2xl"></i>';

    if (user && user.foto_profil) {
        // Jika ada URL foto, ganti dengan elemen gambar
        userIconContainer.innerHTML = `<img src="${user.foto_profil}" alt="Foto Profil" class="w-full h-full rounded-full object-cover">`;
    } else {
        // Jika tidak ada, gunakan ikon default
        userIconContainer.innerHTML = defaultIcon;
    }
}