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

export function initSearchLogic() {
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
            const matchCat = window.currentSearchCategory === 'all' || art.category === window.currentSearchCategory;
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

            window.currentSearchCategory = btn.dataset.cat;
            performSearch();
        };
    });
}

window.currentSearchCategory = 'all';
window.initSearchLogic = initSearchLogic;

export async function initSPA() {
  if (document.getElementById('spa-container')) {
    await loadNewsData();
    if (typeof window.navigateTo === 'function') {
      window.navigateTo('beranda');
    }
  }
}