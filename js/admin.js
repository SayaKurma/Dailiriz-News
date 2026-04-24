import { db, auth, formatDateID } from './firebase-config.js';
import { checkAuth, logoutAdmin } from './auth.js';
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, getDoc, where
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

let currentUser = null;
let currentEditId = null;
let analyticsChartInstance = null;

export async function initAdminPanel() {
  currentUser = await checkAuth(true);
  if (!currentUser) return;
  const nameEl = document.getElementById('admin-name');
  const emailEl = document.getElementById('admin-email');
  const nameHeader = document.getElementById('admin-name-header');
  if (nameEl) nameEl.textContent = currentUser.email?.split('@')[0] || 'Admin';
  if (emailEl) emailEl.textContent = currentUser.email || 'admin@dailiriz.id';
  if (nameHeader) nameHeader.textContent = currentUser.email?.split('@')[0] || 'Admin Utama';
  await loadDashboardStats();
  await loadArticlesToTable();
  await loadModerationList();
  await loadUsersList();
  setupEventListeners();
}

async function loadDashboardStats() {
  try {
    const snapshot = await getDocs(collection(db, "articles"));
    const articles = [];
    snapshot.forEach(doc => articles.push({ id: doc.id, ...doc.data() }));
    const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
    const publishedCount = articles.filter(a => a.status === 'published').length;
    const draftCount = articles.filter(a => a.status === 'draft').length;
    const viewsEl = document.getElementById('stat-total-views');
    const articlesEl = document.getElementById('stat-articles-count');
    const draftEl = document.getElementById('stat-draft-count');
    const articleBadge = document.getElementById('article-count-badge');
    if (viewsEl) viewsEl.textContent = totalViews.toLocaleString();
    if (articlesEl) articlesEl.textContent = publishedCount;
    if (draftEl) draftEl.textContent = draftCount;
    if (articleBadge) articleBadge.textContent = publishedCount;

    const chartCtx = document.getElementById('analyticsChart');
    if (chartCtx) {
      if (analyticsChartInstance) analyticsChartInstance.destroy();
      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString('id-ID', { weekday: 'short' });
      });
      analyticsChartInstance = new Chart(chartCtx, {
        type: 'line',
        data: {
          labels: last7Days,
          datasets: [{
            label: 'Tayangan',
            data: Array.from({length: 7}, () => Math.floor(Math.random() * 4000) + 1000),
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220,38,38,0.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { display: false },
            tooltip: { 
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              padding: 12,
              titleFont: { size: 13 },
              bodyFont: { size: 12 }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
              ticks: { 
                font: { size: 11 },
                callback: (val) => val >= 1000 ? `${val/1000}k` : val
              }
            },
            x: {
              grid: { display: false },
              ticks: { font: { size: 11 } }
            }
          }
        }
      });
    }
    const recentComments = document.getElementById('recent-comments');
    if (recentComments) {
      recentComments.innerHTML = '<div class="text-center text-slate-500 py-4">Belum ada komentar</div>';
    }
  } catch (error) { console.error('Error loading stats:', error); }
}

function getArticleDisplayData(article) {
  return {
    title: escapeHtml(article.title),
    category: escapeHtml(article.category || 'Umum'),
    author: escapeHtml(article.author || 'Admin'),
    date: formatDateID(article.createdAt),
    views: (article.views || 0).toLocaleString('id-ID'),
    status: article.status,
    statusText: { published: 'Terbit', draft: 'Draft', archived: 'Arsip', pending: 'Menunggu' }[article.status] || 'Draft',
    statusClass: { published: 'status-published', draft: 'status-draft', archived: 'status-archive', pending: 'status-pending' }[article.status] || 'status-draft'
  };
}

function createArticleRow(article) {
  const d = getArticleDisplayData(article);
  const tr = document.createElement('tr');
  tr.className = 'hover:bg-slate-50 transition-colors group';
  tr.innerHTML = `
    <td class="px-4 md:px-6 py-3 md:py-4">
      <p class="font-semibold text-slate-800 truncate max-w-[200px] md:max-w-xs" title="${d.title}">${d.title}</p>
      <p class="text-xs text-slate-400 mt-1">${d.views} tayangan</p>
    </td>
    <td class="px-4 md:px-6 py-3 md:py-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">${d.category}</span></td>
    <td class="px-4 md:px-6 py-3 md:py-4 text-sm text-slate-600">${d.author}</td>
    <td class="px-4 md:px-6 py-3 md:py-4 text-sm text-slate-500">${d.date}</td>
    <td class="px-4 md:px-6 py-3 md:py-4"><span class="status-badge ${d.statusClass}">${d.statusText}</span></td>
    <td class="px-4 md:px-6 py-3 md:py-4 text-center"><div class="flex justify-center space-x-2"><button class="p-1.5 hover:bg-red-100 text-red-600 rounded transition edit-article-btn" data-id="${article.id}"><i data-lucide="edit" class="w-4 h-4"></i></button><button class="p-1.5 hover:bg-red-50 text-red-600 rounded transition delete-article-btn" data-id="${article.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></td>
  `;
  return tr;
}

function createArticleMobileCard(article) {
  const d = getArticleDisplayData(article);
  const div = document.createElement('div');
  div.className = 'table-card-mobile';
  div.innerHTML = `
    <div class="table-card-header"><div class="flex justify-between items-start"><h4 class="font-semibold text-slate-800 text-sm truncate flex-1 pr-2" title="${d.title}">${d.title}</h4><span class="status-badge ${d.statusClass} flex-shrink-0">${d.statusText}</span></div></div>
    <div class="table-card-body"><div class="table-card-row"><span class="table-card-label">Kategori</span><span class="table-card-value">${d.category}</span></div><div class="table-card-row"><span class="table-card-label">Penulis</span><span class="table-card-value">${d.author}</span></div><div class="table-card-row"><span class="table-card-label">Tanggal</span><span class="table-card-value">${d.date}</span></div><div class="table-card-row"><span class="table-card-label">Tayangan</span><span class="table-card-value">${d.views}</span></div><div class="pt-3 flex justify-between"><button class="flex-1 mr-2 bg-slate-100 text-slate-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 edit-article-btn" data-id="${article.id}"><i data-lucide="edit" class="w-3 h-3"></i> Edit</button><button class="flex-1 ml-2 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 delete-article-btn" data-id="${article.id}"><i data-lucide="trash-2" class="w-3 h-3"></i> Hapus</button></div></div>
  `;
  return div;
}

async function loadArticlesToTable() {
  const tbody = document.getElementById('articles-tbody');
  const mobileContainer = document.getElementById('articles-mobile-cards');
  const dashboardTbody = document.getElementById('dashboard-articles-tbody');
  const dashboardMobile = document.getElementById('dashboard-mobile-cards');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Memuat data......</td></tr>';
  try {
    const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-500">Belum ada artikel</td></tr>';
      if (mobileContainer) mobileContainer.innerHTML = '<div class="text-center py-4 text-slate-500">Belum ada artikel</div>';
      if (dashboardTbody) dashboardTbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Belum ada artikel</td></tr>';
      return;
    }
    const articles = [];
    snapshot.forEach(docSnap => { articles.push({ id: docSnap.id, ...docSnap.data() }); });
    tbody.innerHTML = '';
    articles.forEach(article => { tbody.appendChild(createArticleRow(article)); });
    if (mobileContainer) {
      mobileContainer.innerHTML = '';
      articles.forEach(article => { mobileContainer.appendChild(createArticleMobileCard(article)); });
    }
    if (dashboardTbody) {
      dashboardTbody.innerHTML = '';
      articles.slice(0, 5).forEach(article => { dashboardTbody.appendChild(createArticleRow(article)); });
    }
    if (dashboardMobile) {
      dashboardMobile.innerHTML = '';
      articles.slice(0, 5).forEach(article => { dashboardMobile.appendChild(createArticleMobileCard(article)); });
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (error) {
    console.error('Error loading articles:', error);
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-600">Gagal memuat data</td></tr>';
  }
}

async function loadModerationList() {
  const tbody = document.getElementById('moderation-tbody');
  const mobileContainer = document.getElementById('moderation-mobile-cards');
  const pendingBadge = document.getElementById('pending-badge');
  const pendingCountDiv = document.getElementById('pending-count');
  if (!tbody) return;
  try {
    const q = query(collection(db, "articles"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const pendingArticles = [];
    snapshot.forEach(docSnap => { pendingArticles.push({ id: docSnap.id, ...docSnap.data() }); });
    if (pendingBadge) pendingBadge.textContent = pendingArticles.length;
    if (pendingCountDiv) pendingCountDiv.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4"></i> ${pendingArticles.length} Artikel menunggu persetujuan`;
    if (pendingArticles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-500">Tidak ada artikel yang menunggu moderasi</td></tr>';
      if (mobileContainer) mobileContainer.innerHTML = '<div class="text-center py-4 text-slate-500">Tidak ada artikel yang menunggu moderasi</div>';
      return;
    }
    tbody.innerHTML = pendingArticles.map(article => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-6 py-4 max-w-md"><p class="font-semibold text-slate-800">${escapeHtml(article.title)}</p><p class="text-xs text-slate-500 mt-1 truncate">${escapeHtml(article.description || article.content?.substring(0, 100) || '')}</p></td>
        <td class="px-6 py-4">${escapeHtml(article.author || 'Anonim')}</td>
        <td class="px-6 py-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">${escapeHtml(article.category || 'Umum')}</span></td>
        <td class="px-6 py-4 text-sm text-slate-500">${formatDateID(article.createdAt)}</td>
        <td class="px-6 py-4 text-center"><button class="px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium transition-colors review-article-btn" data-id="${article.id}">Tinjau</button></td>
      </tr>
    `).join('');
    if (mobileContainer) {
      mobileContainer.innerHTML = pendingArticles.map(article => `
        <div class="table-card-mobile"><div class="table-card-header"><div class="flex justify-between items-start"><h4 class="font-semibold text-slate-800 text-sm truncate flex-1 pr-2">${escapeHtml(article.title)}</h4><span class="status-badge status-pending flex-shrink-0">Menunggu</span></div></div><div class="table-card-body"><div class="table-card-row"><span class="table-card-label">Penulis</span><span class="table-card-value">${escapeHtml(article.author || 'Anonim')}</span></div><div class="table-card-row"><span class="table-card-label">Kategori</span><span class="table-card-value">${escapeHtml(article.category || 'Umum')}</span></div><div class="table-card-row"><span class="table-card-label">Waktu Kirim</span><span class="table-card-value">${formatDateID(article.createdAt)}</span></div><div class="table-card-row"><span class="table-card-label">Cuplikan</span><span class="table-card-value text-xs">${escapeHtml(article.description || article.content?.substring(0, 100) || '')}</span></div><div class="pt-3"><button class="w-full bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 review-article-btn" data-id="${article.id}"><i data-lucide="eye" class="w-3 h-3"></i> Tinjau Artikel</button></div></div></div>
      `).join('');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (error) { console.error('Error loading moderation list:', error); }
}

async function loadUsersList() {
  const tbody = document.getElementById('users-tbody');
  const mobileContainer = document.getElementById('users-mobile-cards');
  if (!tbody) return;
  const sampleUsers = [
    { id: 1, name: "Admin Utama", email: "admin@dailiriz.id", role: "Super Admin", status: "Aktif" },
    { id: 2, name: "Siti Rahma", email: "siti@dailiriz.id", role: "Editor", status: "Aktif" },
    { id: 3, name: "Budi Santoso", email: "budi@dailiriz.id", role: "Jurnalis", status: "Cuti" },
  ];
  tbody.innerHTML = sampleUsers.map(user => {
    const roleClass = user.role === 'Super Admin' ? 'bg-purple-50 text-purple-700' : (user.role === 'Editor' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600');
    const statusClass = user.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
    return `<tr class="hover:bg-slate-50 transition-colors"><td class="px-6 py-4"><div class="flex items-center space-x-3"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random" class="w-10 h-10 rounded-full" /><div><p class="font-semibold text-slate-800">${escapeHtml(user.name)}</p><p class="text-xs text-slate-400">ID: #${user.id}</p></div></div></td><td class="px-6 py-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleClass}">${user.role}</span></td><td class="px-6 py-4 text-sm text-slate-600">${user.email}</td><td class="px-6 py-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${user.status}</span></td><td class="px-6 py-4 text-center"><button class="text-slate-400 hover:text-slate-600"><i data-lucide="more-vertical" class="w-5 h-5"></i></button></td></tr>`;
  }).join('');
  if (mobileContainer) {
    mobileContainer.innerHTML = sampleUsers.map(user => {
      const statusClass = user.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
      return `<div class="table-card-mobile"><div class="table-card-header"><div class="flex items-center space-x-3"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random" class="w-10 h-10 rounded-full" /><div><p class="font-semibold text-slate-800">${escapeHtml(user.name)}</p><p class="text-xs text-slate-400">ID: #${user.id}</p></div></div></div><div class="table-card-body"><div class="table-card-row"><span class="table-card-label">Peran</span><span class="table-card-value">${user.role}</span></div><div class="table-card-row"><span class="table-card-label">Email</span><span class="table-card-value">${user.email}</span></div><div class="table-card-row"><span class="table-card-label">Status</span><span class="table-card-value"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${user.status}</span></span></div></div></div>`;
    }).join('');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function setupEventListeners() {
  const form = document.getElementById('article-form');
  if (form) form.addEventListener('submit', async (e) => { e.preventDefault(); await handleSaveArticle(); });

  document.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-article-btn');
    if (editBtn) { const id = editBtn.dataset.id; await handleEditArticle(id); }
    const deleteBtn = e.target.closest('.delete-article-btn');
    if (deleteBtn) { const id = deleteBtn.dataset.id; await handleDeleteArticle(id); }
    const reviewBtn = e.target.closest('.review-article-btn');
    if (reviewBtn) { const id = reviewBtn.dataset.id; await showModerationDetail(id); }
  });

  const createBtn = document.getElementById('create-new-article-btn');
  if (createBtn) createBtn.addEventListener('click', () => { 
    currentEditId = null; 
    document.getElementById('article-list-view').classList.add('hidden'); 
    document.getElementById('create-article-form').classList.remove('hidden'); 
    document.getElementById('article-id').value = ''; 
    document.getElementById('article-title').value = ''; 
    document.getElementById('article-content').value = ''; 
    document.getElementById('article-status').value = 'draft'; 
    document.getElementById('form-title').textContent = 'Tulis Artikel Baru'; 
    document.getElementById('submit-btn-text').textContent = 'Terbitkan';
    document.getElementById('article-preview-panel')?.classList.add('hidden');
    setTimeout(() => initTinyMCE(), 100);
  });

  const backBtn = document.getElementById('back-to-articles-btn');
  if (backBtn) backBtn.addEventListener('click', () => { 
    document.getElementById('create-article-form').classList.add('hidden'); 
    document.getElementById('article-list-view').classList.remove('hidden'); 
    loadArticlesToTable(); 
  });

  const backModBtn = document.getElementById('back-to-moderation-btn');
  if (backModBtn) backModBtn.addEventListener('click', () => { 
    document.getElementById('moderation-detail-view').classList.add('hidden'); 
    document.getElementById('moderation-list-view').classList.remove('hidden'); 
    loadModerationList(); 
  });

  const approveBtn = document.getElementById('approve-article-btn');
  if (approveBtn) approveBtn.addEventListener('click', async () => { 
    const articleId = document.getElementById('moderation-article-id')?.value; 
    if (articleId) { 
      await updateDoc(doc(db, "articles", articleId), { status: 'published' }); 
      showToast('Artikel berhasil disetujui dan diterbitkan'); 
      document.getElementById('moderation-detail-view').classList.add('hidden'); 
      document.getElementById('moderation-list-view').classList.remove('hidden'); 
      loadModerationList(); 
      loadArticlesToTable(); 
      loadDashboardStats();
    } 
  });

  const rejectBtn = document.getElementById('reject-article-btn');
  if (rejectBtn) rejectBtn.addEventListener('click', async () => { 
    const articleId = document.getElementById('moderation-article-id')?.value; 
    if (articleId && confirm('Tolak artikel ini?')) { 
      await deleteDoc(doc(db, "articles", articleId)); 
      showToast('Artikel telah ditolak dan dihapus'); 
      document.getElementById('moderation-detail-view').classList.add('hidden'); 
      document.getElementById('moderation-list-view').classList.remove('hidden'); 
      loadModerationList(); 
      loadArticlesToTable(); 
      loadDashboardStats();
    } 
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => { if (confirm('Yakin ingin keluar?')) await logoutAdmin(); });

  const filterBtns = document.querySelectorAll('.article-filter-btn');
  filterBtns.forEach(btn => { btn.addEventListener('click', () => filterArticles(btn.dataset.filter)); });

  const titleInput = document.getElementById('article-title');
  const urlSlugSpan = document.getElementById('url-slug');
  if (titleInput && urlSlugSpan) {
    titleInput.addEventListener('input', () => {
      const slug = titleInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      urlSlugSpan.textContent = slug || 'judul-artikel';
    });
  }
}

async function filterArticles(filter) {
  const tbody = document.getElementById('articles-tbody');
  const mobileContainer = document.getElementById('articles-mobile-cards');
  if (!tbody) return;
  try {
    const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    let articles = [];
    snapshot.forEach(docSnap => { articles.push({ id: docSnap.id, ...docSnap.data() }); });
    if (filter === 'published') articles = articles.filter(a => a.status === 'published');
    else if (filter === 'draft') articles = articles.filter(a => a.status === 'draft');
    else if (filter === 'archive') articles = articles.filter(a => a.status === 'archived');
    tbody.innerHTML = '';
    articles.forEach(article => { tbody.appendChild(createArticleRow(article)); });
    if (mobileContainer) { mobileContainer.innerHTML = ''; articles.forEach(article => { mobileContainer.appendChild(createArticleMobileCard(article)); }); }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (error) { console.error('Error filtering articles:', error); }
}

async function handleSaveArticle() {
  const title = document.getElementById('article-title')?.value.trim();
  const rawContent = document.getElementById('article-content')?.value.trim() || '';
  const cleanContent = typeof DOMPurify !== 'undefined' 
    ? DOMPurify.sanitize(rawContent, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'i', 'b', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'img', 'a', 'hr', 'code', 'pre'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style']
      })
    : rawContent;
  const categoryRadio = document.querySelector('input[name="category"]:checked');
  const category = categoryRadio?.value;
  const status = document.getElementById('article-status')?.value || 'draft';
  const image = document.getElementById('article-image-url')?.value.trim() || 'https://via.placeholder.com/800x400';
  const imageCaption = document.getElementById('article-image-caption')?.value.trim() || '';

  const authorInput = document.getElementById('input-author')?.value.trim();
  const imageSourceInput = document.getElementById('input-image-source')?.value.trim();

  const description = cleanContent?.substring(0, 200).replace(/<[^>]*>/g, '') || '';
  if (!title || !cleanContent || !category) { showToast('Judul, konten, dan kategori wajib diisi', 'error'); return; }

  try {
    const finalAuthor = authorInput || currentUser?.email?.split('@')[0] || 'Admin';

    const articleData = {
      title,
      content: cleanContent,
      description,
      category,
      status,
      image,
      imageCaption,
      imageSource: imageSourceInput || '',
      author: finalAuthor,
      updatedAt: serverTimestamp(),
      views: 0
    };

    const articleId = document.getElementById('article-id')?.value;
    if (articleId) { 
      await updateDoc(doc(db, "articles", articleId), articleData); 
      showToast('Artikel berhasil diperbarui!'); 
    } else { 
      articleData.createdAt = serverTimestamp(); 
      await addDoc(collection(db, "articles"), articleData); 
      showToast('Artikel berhasil diterbitkan!'); 
    }

    document.getElementById('article-form')?.reset();
    document.getElementById('create-article-form').classList.add('hidden');
    document.getElementById('article-list-view').classList.remove('hidden');
    await loadArticlesToTable();
    await loadDashboardStats();
  } catch (error) { 
    console.error('Error saving article:', error); 
    showToast('Gagal menyimpan artikel', 'error'); 
  }
}

async function handleEditArticle(id) {
  try {
    const docRef = doc(db, "articles", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const article = { id: docSnap.id, ...docSnap.data() };
      currentEditId = id;
      document.getElementById('article-id').value = article.id;
      document.getElementById('article-title').value = article.title || '';
      document.getElementById('article-content').value = article.content || '';
      document.getElementById('article-status').value = article.status || 'draft';
      document.getElementById('article-image-url').value = article.image || '';
      document.getElementById('article-image-caption').value = article.imageCaption || '';
      document.getElementById('input-author').value = article.author || '';
      document.getElementById('input-image-source').value = article.imageSource || '';
      const categoryRadios = document.querySelectorAll('input[name="category"]');
      categoryRadios.forEach(radio => { if (radio.value === article.category) radio.checked = true; });
      document.getElementById('form-title').textContent = 'Edit Artikel';
      document.getElementById('submit-btn-text').textContent = 'Perbarui';
      document.getElementById('article-list-view').classList.add('hidden');
      document.getElementById('create-article-form').classList.remove('hidden');
      document.getElementById('article-preview-panel')?.classList.add('hidden');
      const urlSlugSpan = document.getElementById('url-slug');
      if (urlSlugSpan && article.title) {
        const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        urlSlugSpan.textContent = slug;
      }
      setTimeout(() => {
        initTinyMCE();
        const editor = tinymce.get('article-content');
        if (editor && article.content) {
          editor.setContent(article.content);
        }
      }, 100);
    }
  } catch (error) { console.error('Error loading article for edit:', error); showToast('Gagal memuat artikel', 'error'); }
}

async function handleDeleteArticle(id) {
  if (!confirm('Hapus artikel ini? Tindakan ini tidak dapat dibatalkan.')) return;
  try { await deleteDoc(doc(db, "articles", id)); showToast('Artikel berhasil dihapus'); await loadArticlesToTable(); await loadDashboardStats(); await loadModerationList(); }
  catch (error) { console.error('Error deleting article:', error); showToast('Gagal menghapus artikel', 'error'); }
}

async function showModerationDetail(articleId) {
  try {
    const docRef = doc(db, "articles", articleId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const article = { id: docSnap.id, ...docSnap.data() };
      document.getElementById('moderation-article-id').value = article.id;
      document.getElementById('detail-category').textContent = article.category || 'Umum';
      document.getElementById('detail-title').textContent = article.title || '';
      document.getElementById('detail-author').textContent = article.author || 'Anonim';
      document.getElementById('detail-date').textContent = formatDateID(article.createdAt);
      document.getElementById('detail-excerpt').textContent = article.description || article.content?.substring(0, 200)?.replace(/<[^>]*>/g, '') || '';
      const contentDiv = document.getElementById('detail-full-content');
      if (contentDiv && article.content) {
        const cleanHTML = typeof DOMPurify !== 'undefined' 
          ? DOMPurify.sanitize(article.content, {
              ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'i', 'b', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'img', 'a', 'hr', 'code', 'pre'],
              ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style']
            })
          : article.content;
        contentDiv.innerHTML = cleanHTML;
      }
      document.getElementById('moderation-list-view').classList.add('hidden');
      document.getElementById('moderation-detail-view').classList.remove('hidden');
    }
  } catch (error) { console.error('Error loading moderation detail:', error); showToast('Gagal memuat detail artikel', 'error'); }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) { alert(message); return; }
  const titleEl = toast.querySelector('h4');
  const msgEl = document.getElementById('toast-msg');
  if (titleEl) titleEl.textContent = type === 'success' ? 'Berhasil!' : 'Error';
  if (msgEl) msgEl.textContent = message;
  toast.classList.remove('translate-y-24');
  setTimeout(() => toast.classList.add('translate-y-24'), 3000);
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