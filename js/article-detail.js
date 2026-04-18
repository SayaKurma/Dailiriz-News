import { db, formatDateID } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs, limit, addDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

let currentArticle = null;

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) { alert(message); return; }
  const msgEl = document.getElementById('toast-message');
  if (msgEl) msgEl.textContent = message;
  toast.classList.remove('translate-y-24');
  setTimeout(() => toast.classList.add('translate-y-24'), 3000);
}

function updateMetaTags(article) {
  const desc = article.description || article.content?.substring(0, 150) || '';
  const metaDesc = document.getElementById('meta-description');
  const ogTitle = document.getElementById('og-title');
  const ogDesc = document.getElementById('og-description');
  const ogImage = document.getElementById('og-image');
  const ogUrl = document.getElementById('og-url');
  if (metaDesc) metaDesc.content = desc;
  if (ogTitle) ogTitle.content = article.title;
  if (ogDesc) ogDesc.content = desc;
  if (ogImage) ogImage.content = article.image || '';
  if (ogUrl) ogUrl.content = window.location.href;
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "description": desc,
    "image": article.image,
    "datePublished": article.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
    "author": { "@type": "Person", "name": article.author || "Redaksi Dailiriz" },
    "publisher": { "@type": "Organization", "name": "Dailiriz", "logo": { "@type": "ImageObject", "url": "https://dailiriz.vercel.app/logo.png" } }
  };
  const schemaEl = document.getElementById('article-schema');
  if (schemaEl) schemaEl.textContent = JSON.stringify(schema);
}

async function loadArticle() {
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  if (!articleId) { window.location.href = 'index.html'; return; }
  try {
    const docRef = doc(db, "articles", articleId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      document.body.innerHTML = '<div class="container mx-auto py-20 text-center"><h1 class="text-2xl font-bold">Artikel tidak ditemukan</h1><a href="index.html" class="text-red-600 mt-4 inline-block">← Kembali ke Beranda</a></div>';
      return;
    }
    currentArticle = { id: docSnap.id, ...docSnap.data() };
    document.title = `${currentArticle.title} | Dailiriz`;
    const categoryEl = document.getElementById('article-category');
    const badgeEl = document.getElementById('article-category-badge');
    const titleEl = document.getElementById('article-title');
    const authorEl = document.getElementById('article-author');
    const dateEl = document.getElementById('article-date');
    const imageEl = document.getElementById('article-image');
    if (categoryEl) categoryEl.textContent = currentArticle.category || 'Berita';
    if (badgeEl) badgeEl.textContent = currentArticle.category || 'Berita';
    if (titleEl) titleEl.textContent = currentArticle.title;
    if (authorEl) authorEl.textContent = currentArticle.author || 'Redaksi Dailiriz';
    if (dateEl) dateEl.textContent = formatDateID(currentArticle.createdAt);
    if (imageEl) {
      imageEl.src = currentArticle.image || 'https://via.placeholder.com/800x400';
      imageEl.alt = currentArticle.title;
    }
    const contentEl = document.getElementById('article-content');
    if (contentEl && currentArticle.content) {
      const paragraphs = currentArticle.content.split('\n\n').filter(p => p.trim());
      contentEl.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p.trim())}</p>`).join('');
    }
    updateMetaTags(currentArticle);
    await loadRelatedArticles(currentArticle.category, currentArticle.id);
    await loadComments(articleId);
  } catch (error) {
    console.error('Error loading article:', error);
    window.location.href = 'index.html';
  }
}

async function loadRelatedArticles(category, currentId) {
  const container = document.getElementById('related-articles');
  if (!container) return;
  try {
    const q = query(collection(db, "articles"), where("category", "==", category), where("status", "==", "published"), limit(4));
    const snapshot = await getDocs(q);
    container.innerHTML = '';
    let count = 0;
    snapshot.forEach(docSnap => {
      if (docSnap.id === currentId || count >= 3) return;
      const article = { id: docSnap.id, ...docSnap.data() };
      const card = document.createElement('article');
      card.className = 'bg-white rounded-lg shadow-sm hover:shadow-lg transition duration-300 overflow-hidden group cursor-pointer';
      card.innerHTML = `<div class="h-40 md:h-48 overflow-hidden"><img src="${article.image || 'https://via.placeholder.com/400x200'}" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-500" alt="${article.title}"></div><div class="p-3 md:p-4"><span class="text-xs font-bold text-red-600 uppercase">${article.category}</span><h4 class="font-serif font-bold text-base md:text-lg mt-1 md:mt-2 mb-1 md:mb-2 leading-snug group-hover:text-red-700 line-clamp-2">${article.title}</h4><p class="text-slate-600 text-xs md:text-sm line-clamp-2 md:line-clamp-3">${article.description || ''}</p></div>`;
      card.addEventListener('click', () => { window.location.href = `article.html?id=${article.id}`; });
      container.appendChild(card);
      count++;
    });
    if (container.children.length === 0) container.innerHTML = '<div class="col-span-full text-center text-slate-500 py-8">Tidak ada artikel terkait</div>';
  } catch (error) {
    console.error('Error loading related articles:', error);
  }
}

async function loadComments(articleId) {
  const container = document.getElementById('comments-list');
  if (!container) return;
  try {
    const q = query(collection(db, "comments"), where("articleId", "==", articleId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      container.innerHTML = '<div class="text-center text-slate-500 py-4">Belum ada komentar. Jadilah yang pertama!</div>';
      return;
    }
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
      const comment = docSnap.data();
      const commentDiv = document.createElement('div');
      commentDiv.className = 'border-b border-slate-100 pb-4 md:pb-6';
      commentDiv.innerHTML = `<div class="flex items-start gap-3 md:gap-4"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(comment.name || 'Anonim')}&background=random" class="w-8 h-8 md:w-10 md:h-10 rounded-full"><div class="flex-1"><div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 mb-1 md:mb-2"><h4 class="font-bold text-slate-800 text-sm md:text-base">${escapeHtml(comment.name || 'Anonim')}</h4><span class="text-xs text-slate-500">${formatDateID(comment.createdAt)}</span></div><p class="text-slate-600 text-sm md:text-base">${escapeHtml(comment.content)}</p></div></div>`;
      container.appendChild(commentDiv);
    });
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}

async function submitComment() {
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  if (!articleId) return;
  const input = document.getElementById('comment-input');
  const nameInput = document.getElementById('comment-name');
  const content = input?.value.trim();
  if (!content) { showToast('Tulis komentar terlebih dahulu', 'error'); return; }
  try {
    await addDoc(collection(db, "comments"), {
      articleId: articleId,
      name: nameInput?.value.trim() || 'Pembaca Anonim',
      content: content,
      createdAt: serverTimestamp()
    });
    if (input) input.value = '';
    if (nameInput && nameInput.value.trim() === '') nameInput.value = '';
    showToast('Komentar berhasil dikirim!');
    await loadComments(articleId);
  } catch (error) {
    console.error('Error submitting comment:', error);
    showToast('Gagal mengirim komentar', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('id-ID', options);
  }
  loadArticle();
  const submitBtn = document.getElementById('submit-comment');
  if (submitBtn) submitBtn.addEventListener('click', submitComment);
  const shareBtn = document.getElementById('share-btn');
  const mobileShareBtn = document.getElementById('mobile-share-btn');
  const shareFunction = () => {
    if (navigator.share && currentArticle) {
      navigator.share({ title: currentArticle.title, text: currentArticle.description || '', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link berhasil disalin!');
    }
  };
  if (shareBtn) shareBtn.addEventListener('click', shareFunction);
  if (mobileShareBtn) mobileShareBtn.addEventListener('click', shareFunction);
  document.querySelectorAll('.share-buttons button').forEach(btn => {
    btn.addEventListener('click', function() {
      if (this.textContent.includes('Salin')) {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link berhasil disalin!');
      } else {
        showToast(`Berbagi ke ${this.textContent.trim()} (simulasi)`);
      }
    });
  });
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => { mobileMenu.classList.toggle('hidden'); });
    document.addEventListener('click', (event) => {
      if (!mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target) && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
      }
    });
  }
});
