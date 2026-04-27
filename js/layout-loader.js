export async function loadLayout(isSPA = false) {
  try {
    if (!document.getElementById('layout-header')) {
      console.warn('⚠️ #layout-header not found, creating placeholder...');
      const placeholder = document.createElement('div');
      placeholder.id = 'layout-header';
      document.body.insertBefore(placeholder, document.body.firstChild);
    }
    if (!document.getElementById('layout-footer')) {
      console.warn('⚠️ #layout-footer not found, creating placeholder...');
      const placeholder = document.createElement('div');
      placeholder.id = 'layout-footer';
      document.body.appendChild(placeholder);
    }

    const [headerRes, footerRes] = await Promise.all([
      fetch('./components/header.html'),
      fetch('./components/footer.html')
    ]);

    if (!headerRes.ok) throw new Error(`Header: ${headerRes.status} ${headerRes.statusText}`);
    if (!footerRes.ok) throw new Error(`Footer: ${footerRes.status} ${footerRes.statusText}`);

    const headerHtml = await headerRes.text();
    const footerHtml = await footerRes.text();

    document.getElementById('layout-header').innerHTML = headerHtml;
    document.getElementById('layout-footer').innerHTML = footerHtml;

    if (typeof lucide !== 'undefined') {
      setTimeout(() => lucide.createIcons(), 50);
    }
    
    initLayoutLogic();
    
    if (isSPA && typeof window.initSearchLogic === 'function') {
      setTimeout(() => window.initSearchLogic(), 100);
    }
    
    console.log('✅ Layout loaded successfully');
  } catch (err) {
    console.error('❌ Layout Loader Error:', err);
    const headerEl = document.getElementById('layout-header');
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="bg-red-50 text-red-600 p-4 text-center text-sm">
          ⚠️ Gagal memuat header: ${err.message}<br>
          <button onclick="window.location.reload()" class="underline mt-2">Muat Ulang</button>
        </div>`;
    }
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => loadLayout(false));
} else {
  loadLayout(false);
}