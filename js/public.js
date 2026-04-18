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
    renderBreakingNews(articles);
    renderFeaturedArticle(articles[0]);
    renderPopularArticles(articles.slice(1, 5));
    renderLatestNews(articles.slice(5, 13));
  } catch (error) {
    console.error('Error loading news:', error);
    document.getElementById('breaking-news-ticker').textContent = 'Gagal memuat berita. Silakan muat ulang halaman.';
  }
}

function renderBreakingNews(articles) {
  const ticker = document.getElementById('breaking-news-ticker');
  if (!ticker) return;
  const titles = articles.slice(0, 5).map(a => a.title).join(' ••• ');
  ticker.textContent = titles || 'Selamat datang di Dailiriz';
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
    const categoryColor = { 'Nasional': 'red', 'Ekonomi': 'blue', 'Teknologi': 'purple', 'Gaya Hidup': 'pink', 'Opini': 'amber', 'Olahraga': 'green', 'Internasional': 'indigo' }[article.category] || 'gray';
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

document.addEventListener('DOMContentLoaded', () => {
  const dateElement = document.getElementById('current-date');
  if (dateElement) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = new Date().toLocaleDateString('id-ID', options);
  }
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => { mobileMenu.classList.toggle('hidden'); });
    document.addEventListener('click', (event) => {
      if (!mobileMenu.contains(event.target) && !mobileBtn.contains(event.target) && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
      }
    });
  }
  loadNewsData();
  const subscribeForm = document.querySelector('#subscribe-form, form[onsubmit]');
  if (subscribeForm) {
    subscribeForm.addEventListener('submit', (e) => { e.preventDefault(); subscribe(); });
  }
});
