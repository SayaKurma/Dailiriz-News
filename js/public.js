import { db, formatDateID } from './firebase-config.js';
import { collection, getDocs, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

let allArticles = [];

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) { alert(message); return; }
  const titleEl = toast.querySelector('h4');
  const msgEl = toast.querySelector('p');
  if (titleEl) titleEl.textContent = type === 'success' ? 'Berhasil!' : 'Info';
  if (msgEl) msgEl.textContent = message;
  toast.classList.remove('translate-y-24');
  setTimeout(() => toast.classList.add('translate-y-24'), 3000);
}

export async function subscribe() {
  const emailInput = document.getElementById('subscribe-email');
  if (!emailInput || !emailInput.value) {
    showToast('Masukkan email Anda terlebih dahulu', 'error');
    return;
  }
  showToast('Terima kasih telah berlangganan!');
  emailInput.value = '';
}

let globalNewsCache = null;
let cacheTimestamp = null;

async function fetchGlobalBreakingNews() {
    const CACHE_DURATION = 30 * 60 * 1000;
    if (globalNewsCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
        return globalNewsCache;
    }
    const API_KEY = 'cf49db603f5f4f7cbb8808a42e4afe2b';
    const url = `https://newsapi.org/v2/top-headlines?country=id&pageSize=5&apiKey=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const result = data.articles.filter(a => a.title && a.title.trim() !== '').map(a => a.title).slice(0, 3);
        globalNewsCache = result;
        cacheTimestamp = Date.now();
        return result;
    } catch (error) {
        console.warn('Gagal fetch external news:', error);
        return [];
    }
}

async function renderBreakingNews(articles) {
    const ticker = document.getElementById('breaking-news-ticker');
    if (!ticker) return;
    const globalNews = await fetchGlobalBreakingNews();
    const internalNews = articles.slice(0, 3).map(a => a.title);
    const allTitles = [...globalNews, ...internalNews].filter(t => t);
    if (allTitles.length === 0) {
        ticker.textContent = 'Selamat datang di Dailiriz - Berita Terkini & Terpercaya';
    } else {
        ticker.textContent = allTitles.join(' ••• ');
    }
}

export async function loadNewsData() {
  try {
    const q = query(collection(db, "articles"), where("status", "==", "published"), orderBy("createdAt", "desc"), limit(20));
    const querySnapshot = await getDocs(q);
    const articles = [];
    querySnapshot.forEach((doc) => {
      articles.push({ id: doc.id, ...doc.data() });
    });
    allArticles = articles;
    if (articles.length === 0) {
      document.getElementById('breaking-news-ticker').textContent = 'Belum ada berita. Silakan cek kembali nanti.';
      document.getElementById('featured-article').innerHTML = '<div class="bg-slate-200 h-[400px] rounded-xl flex items-center justify-center">Belum ada berita utama</div>';
      return;
    }
    await renderBreakingNews(articles);
    renderFeaturedArticle(articles[0]);
    renderPopularArticles(articles.slice(1, 5));
    renderLatestNews(articles.slice(5, 13));
  } catch (error) {
    console.error('Error loading news:', error);
    document.getElementById('breaking-news-ticker').textContent = 'Gagal memuat berita. Silakan muat ulang halaman.';
  }
}

function renderFeaturedArticle(article) {
  const container = document.getElementById('featured-article');
  if (!container || !article) return;
  container.innerHTML = `
    <div class="relative h-[400px] md:h-[500px] rounded-xl overflow-hidden shadow-xl image-hover-zoom cursor-pointer" onclick="window.location.href='article.html?id=${article.id}'">
      <img src="${article.image || 'https://via.placeholder.com/800x400'}" alt="${article.title}" class="w-full h-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
      <div class="absolute bottom-0 left-0 p-6 md:p-8 w-full">
        <span class="bg-amber-400 text-red-900 text-xs font-bold px-2 py-1 mb-3 inline-block rounded">${article.category || 'Berita'}</span>
        <h2 class="font-serif text-3xl md:text-5xl font-bold text-white leading-tight mb-3">${article.title}</h2>
        <p class="text-slate-200 text-sm md:text-base line-clamp-2 max-w-2xl">${article.description || ''}</p>
        <div class="mt-4 text-slate-400 text-xs flex items-center gap-2"><i data-lucide="clock" class="w-3 h-3"></i> ${formatDateID(article.createdAt)}</div>
      </div>
    </div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderPopularArticles(articles) {
  const container = document.getElementById('popular-articles');
  if (!container) return;
  if (articles.length === 0) {
    container.innerHTML = '<div class="text-center text-slate-500 py-4">Belum ada artikel populer</div>';
    return;
  }
  container.innerHTML = '';
  articles.forEach(article => {
    const articleElement = document.createElement('article');
    articleElement.className = 'flex gap-4 group cursor-pointer';
    articleElement.innerHTML = `
      <div class="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden image-hover-zoom"><img src="${article.image || 'https://via.placeholder.com/100x100'}" class="w-full h-full object-cover" alt="${article.category}"></div>
      <div class="flex flex-col justify-center"><span class="text-xs font-bold text-red-600 uppercase mb-1">${article.category || 'Berita'}</span><h4 class="font-serif font-bold text-lg leading-tight group-hover:text-red-700 transition">${article.title}</h4><span class="text-xs text-slate-500 mt-2">${formatDateID(article.createdAt)}</span></div>
    `;
    articleElement.addEventListener('click', () => { window.location.href = `article.html?id=${article.id}`; });
    container.appendChild(articleElement);
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderLatestNews(articles) {
  const container = document.getElementById('latest-news');
  if (!container) return;
  if (articles.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center text-slate-500 py-8">Belum ada berita terbaru</div>';
    return;
  }
  container.innerHTML = '';
  articles.forEach(article => {
    const categoryColor = {
      'Nasional': 'red', 'Ekonomi': 'blue', 'Teknologi': 'purple',
      'Gaya Hidup': 'pink', 'Opini': 'amber', 'Olahraga': 'green',
      'Internasional': 'indigo', 'Feature': 'amber', 'Cek Fakta': 'rose'
    }[article.category] || 'gray';
    const articleElement = document.createElement('article');
    articleElement.className = 'bg-white rounded-lg shadow-sm hover:shadow-lg transition duration-300 overflow-hidden group cursor-pointer';
    articleElement.innerHTML = `
      <div class="h-48 overflow-hidden"><img src="${article.image || 'https://via.placeholder.com/400x200'}" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-500" alt="${article.category}"></div>
      <div class="p-4"><span class="text-xs font-bold text-${categoryColor}-600 uppercase">${article.category || 'Berita'}</span><h4 class="font-serif font-bold text-lg mt-2 mb-2 leading-snug group-hover:text-red-700">${article.title}</h4><p class="text-slate-600 text-sm line-clamp-3">${article.description || ''}</p></div>
    `;
    articleElement.addEventListener('click', () => { window.location.href = `article.html?id=${article.id}`; });
    container.appendChild(articleElement);
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.navigateTo = function(page) {
    if (typeof window.closeMobileMenu === 'function') {
        window.closeMobileMenu();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderView(page);
};

async function renderView(page) {
  const container = document.getElementById('spa-container');
  if (!container) return;
  container.innerHTML = '';

  switch (page) {
    case 'beranda':
      await renderHomePage(container);
      break;
    case 'news':
    case 'feature':
    case 'opini':
    case 'cek-fakta':
      await renderCategoryPage(page, container);
      break;
    case 'tentang-kami':
    case 'redaksi':
    case 'pedoman-media-siber':
    case 'karir':
    case 'kontak':
    case 'kebijakan-privasi':
    case 'syarat-ketentuan':
      renderStaticPage(page, container);
      break;
    default:
      await renderHomePage(container);
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function renderHomePage(container) {
  container.innerHTML = `
    <div class="flex items-center gap-3 mb-8 bg-white p-3 rounded-lg shadow-sm border-l-4 border-red-600">
      <span class="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Terkini</span>
      <marquee class="text-sm font-medium text-slate-700" id="breaking-news-ticker"></marquee>
    </div>
    <section class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
      <div id="featured-article" class="lg:col-span-8"></div>
      <div class="lg:col-span-4 flex flex-col gap-6">
        <h3 class="font-serif text-xl font-bold border-b-2 border-red-600 pb-2 text-red-800">Terpopuler</h3>
        <div id="popular-articles"></div>
        <div class="bg-slate-100 p-6 rounded-xl border border-slate-200 mt-auto">
          <h4 class="font-serif font-bold text-lg mb-2">Buletin Harian</h4>
          <p class="text-sm text-slate-600 mb-4">Dapatkan berita terkini langsung di email Anda.</p>
          <form id="subscribe-form" class="flex flex-col gap-2">
            <input type="email" id="subscribe-email" placeholder="Email Anda" class="px-4 py-2 rounded border border-slate-300 focus:outline-none focus:border-red-500 text-sm">
            <button type="submit" class="bg-slate-900 text-white py-2 rounded font-medium hover:bg-red-700 transition text-sm">Langganan</button>
          </form>
        </div>
      </div>
    </section>
    <section>
      <div class="flex justify-between items-end mb-6 border-b border-slate-200 pb-2">
        <h3 class="font-serif text-2xl font-bold text-slate-800">Berita Terbaru</h3>
      </div>
      <div id="latest-news" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"></div>
    </section>
    <section class="mt-16 mb-12 bg-stone-100 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
      <div class="absolute top-0 left-0 text-9xl text-stone-200 font-serif opacity-50 -translate-y-8 translate-x-4">"</div>
      <div class="relative z-10 max-w-3xl mx-auto">
        <h3 class="font-serif text-2xl md:text-3xl italic text-slate-800 mb-6">"Setiap berita yang Anda baca di sini adalah janji kami untuk menjaga integritas informasi demi masyarakat yang cerdas dan berdaya."</h3>
        <div class="flex items-center justify-center gap-4">
          <img src="https://raw.githubusercontent.com/SayaKurma/Kartu-Profil/refs/heads/main/profile.jpg" class="w-12 h-12 rounded-full border-2 border-amber-400" alt="Editor">
          <div class="text-left">
            <p class="font-bold text-slate-900">Muhammad Alfaridzi</p>
            <p class="text-xs text-slate-500 uppercase tracking-wide">Pemimpin Redaksi</p>
          </div>
        </div>
      </div>
    </section>
  `;

  document.getElementById('subscribe-form').addEventListener('submit', (e) => {
    e.preventDefault();
    subscribe();
  });

  await loadNewsData();
}

async function renderCategoryPage(category, container) {
  if (allArticles.length === 0) await loadNewsData();

  const filtered = allArticles.filter(a => 
    a.category?.toLowerCase().replace(/\s+/g, '-') === category || 
    a.category?.toLowerCase().includes(category)
  );

  container.innerHTML = `
    <h2 class="font-serif text-3xl font-bold text-slate-800 mb-2 capitalize">${category.replace('-', ' ')}</h2>
    <p class="text-slate-500 mb-8">Menampilkan arsip berita untuk kategori ini.</p>
    <div id="category-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
  `;

  const grid = document.getElementById('category-grid');
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500">Belum ada artikel untuk kategori ini.</div>`;
    return;
  }

  filtered.forEach(article => {
    const card = document.createElement('article');
    card.className = 'bg-white rounded-lg shadow-sm hover:shadow-lg transition duration-300 overflow-hidden group cursor-pointer';
    card.innerHTML = `
      <div class="h-48 overflow-hidden"><img src="${article.image || 'https://via.placeholder.com/400x200'}" class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500" alt="${article.category}"></div>
      <div class="p-4">
        <span class="text-xs font-bold text-red-600 uppercase">${article.category || 'Berita'}</span>
        <h4 class="font-serif font-bold text-lg mt-2 mb-2 leading-snug group-hover:text-red-700 line-clamp-2">${article.title}</h4>
        <p class="text-slate-600 text-sm line-clamp-3">${article.description || ''}</p>
        <div class="mt-3 text-xs text-slate-400">${formatDateID(article.createdAt)}</div>
      </div>
    `;
    card.addEventListener('click', () => window.location.href = `article.html?id=${article.id}`);
    grid.appendChild(card);
  });
}

function renderStaticPage(pageName, container) {
  const title = pageName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  container.innerHTML = `
    <div class="max-w-3xl mx-auto text-center py-16">
      <i data-lucide="file-text" class="w-12 h-12 mx-auto text-slate-400 mb-4"></i>
      <h2 class="font-serif text-3xl font-bold text-slate-800 mb-4">${title}</h2>
      <p class="text-slate-600 mb-6">Halaman ini sedang dalam penyusunan konten resmi. Silakan kembali lagi nanti.</p>
      <button onclick="window.navigateTo('beranda')" class="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition">Kembali ke Beranda</button>
    </div>
  `;
}

let currentSearchCategory = 'all';

function initSearchLogic() {
    const searchBtn = document.getElementById('search-btn');
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results-list');

    if (!searchBtn || !modal || !input) {
        console.warn('Search elements not found');
        return;
    }

    searchBtn.onclick = (e) => {
        e.preventDefault();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        input.focus();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    document.getElementById('close-search')?.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        input.value = '';
        resultsContainer.innerHTML = '<p class="text-slate-400 text-sm text-center py-8">Ketik minimal 2 karakter untuk mencari...</p>';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const performSearch = () => {
        const keyword = input.value.toLowerCase().trim();

        if (keyword.length < 2) {
            resultsContainer.innerHTML = '<p class="text-slate-400 text-sm text-center py-8">Ketik minimal 2 karakter untuk mencari...</p>';
            return;
        }

        const filtered = allArticles.filter(art => {
            const matchTitle = art.title?.toLowerCase().includes(keyword);
            const matchDesc = art.description?.toLowerCase().includes(keyword);
            const matchCat = currentSearchCategory === 'all' || art.category === currentSearchCategory;
            return (matchTitle || matchDesc) && matchCat;
        });

        if (filtered.length === 0) {
            resultsContainer.innerHTML = `<p class="text-slate-400 text-sm text-center py-8">Tidak ada hasil untuk "${keyword}"</p>`;
            return;
        }

        resultsContainer.innerHTML = filtered.map(art => `
            <div class="flex gap-4 p-3 hover:bg-white/5 rounded-lg cursor-pointer border-b border-white/5 transition group" 
                 onclick="window.location.href='article.html?id=${art.id}'">
                <img src="${art.image || 'https://via.placeholder.com/64x64'}" 
                     class="w-16 h-16 object-cover rounded-lg flex-shrink-0" 
                     alt="${art.title}"
                     onerror="this.src='https://via.placeholder.com/64x64?text=No+Image'">
                <div class="flex-1 min-w-0">
                    <h4 class="text-white font-medium text-sm group-hover:text-amber-400 transition line-clamp-2">${art.title}</h4>
                    <span class="text-amber-400 text-[10px] uppercase font-bold tracking-wide">${art.category || 'Berita'}</span>
                    <p class="text-slate-400 text-xs mt-1 line-clamp-1">${art.description || ''}</p>
                </div>
            </div>
        `).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    input.addEventListener('input', debounce(performSearch, 300));

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('bg-amber-400', 'text-red-900', 'active');
                b.classList.add('border', 'border-slate-700', 'text-slate-300');
            });
            btn.classList.remove('border', 'border-slate-700', 'text-slate-300');
            btn.classList.add('bg-amber-400', 'text-red-900', 'active');

            currentSearchCategory = btn.dataset.cat;
            performSearch();
        };
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const dateElement = document.getElementById('current-date');
  if (dateElement) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = new Date().toLocaleDateString('id-ID', options);
  }

  const mobileBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('close-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-overlay');

  window.openMobileMenu = function() {
    if (!mobileMenu || !overlay) return;

    overlay.classList.remove('hidden', 'pointer-events-none');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10);

    mobileMenu.classList.remove('translate-x-full');

    document.body.classList.add('overflow-hidden');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  };

  window.closeMobileMenu = function() {
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
    if (e.key === 'Escape' && !mobileMenu?.classList.contains('translate-x-full')) {
        window.closeMobileMenu();
    }
  });

  initSearchLogic();
  window.navigateTo('beranda');
});