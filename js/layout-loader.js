export async function loadLayout(isSPA = false) {
  try {
    const [headerRes, footerRes] = await Promise.all([
      fetch('./components/header.html'),
      fetch('./components/footer.html')
    ]);

    if (!headerRes.ok || !footerRes.ok) throw new Error('Gagal memuat komponen layout');

    const headerHtml = await headerRes.text();
    const footerHtml = await footerRes.text();

    document.getElementById('layout-header').innerHTML = headerHtml;
    document.getElementById('layout-footer').innerHTML = footerHtml;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    initLayoutLogic();
    
    if (isSPA && typeof initSearchLogic === 'function') {
      initSearchLogic();
    }
  } catch (err) {
    console.error('❌ Layout Loader Error:', err);
    document.getElementById('layout-header').innerHTML = '<div class="bg-red-50 text-red-600 p-4 text-center">Gagal memuat navigasi. Muat ulang halaman.</div>';
  }
}

function initLayoutLogic() {
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('id-ID', options);
  }

  const mobileBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('close-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-overlay');

  window.openMobileMenu = () => {
    if (!mobileMenu || !overlay) return;
    overlay.classList.remove('hidden', 'pointer-events-none');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    mobileMenu.classList.remove('translate-x-full');
    document.body.classList.add('overflow-hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  };

  window.closeMobileMenu = () => {
    if (!mobileMenu || !overlay) return;
    mobileMenu.classList.add('translate-x-full');
    overlay.classList.add('opacity-0');
    setTimeout(() => {
      overlay.classList.add('hidden', 'pointer-events-none');
      document.body.classList.remove('overflow-hidden');
    }, 300);
  };

  if (mobileBtn) mobileBtn.addEventListener('click', window.openMobileMenu);
  if (closeBtn) closeBtn.addEventListener('click', window.closeMobileMenu);
  if (overlay) overlay.addEventListener('click', window.closeMobileMenu);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mobileMenu?.classList.contains('translate-x-full')) window.closeMobileMenu();
  });

  if (!window.navigateTo) {
    window.navigateTo = (page) => {
      window.closeMobileMenu?.();
      if (page === 'beranda') window.location.href = 'index.html';
      else window.location.href = `index.html#${page}`;
    };
  }
}