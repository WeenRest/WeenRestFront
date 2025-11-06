(() => {
  const API_BASE = (typeof localStorage !== 'undefined' && localStorage.getItem('apiBase')) || 'https://weenapp-001-site1.qtempurl.com';

  const grid = document.getElementById('grid');
  if (!grid) return;

  const toast = (message, type = 'info') => {
    if (typeof window.showToast === 'function') return window.showToast(message, type);
    console[type === 'error' ? 'error' : 'log'](message);
  };

  const state = {
    level: 'main', // main -> category -> restaurants
    mainCategory: null, // { id, name }
    category: null // { id, name }
  };

  const els = {
    title: document.getElementById('page-title'),
    subtitle: document.getElementById('page-subtitle'),
    breadcrumb: document.getElementById('breadcrumb'),
    breadcrumbMobile: document.getElementById('breadcrumb-mobile'),
    backBtn: document.getElementById('back-btn'),
    searchInput: document.getElementById('search-input')
  };

  const resolveImageUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    return `${API_BASE}/${url}`;
  };

  const skeletonCard = () => `
    <div class="animate-pulse bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="h-40 bg-gray-200"></div>
      <div class="p-4 space-y-3">
        <div class="h-4 bg-gray-200 rounded w-2/3"></div>
        <div class="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>`;

  const renderSkeletons = (count = 8) => {
    grid.innerHTML = Array.from({ length: count }).map(() => skeletonCard()).join('');
  };

  const buildCard = ({ title, subtitle, imageUrl, onClick, ctaText = 'فتح' }) => {
    const img = resolveImageUrl(imageUrl) || 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'group text-right bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition duration-300 focus:outline-none';
    card.innerHTML = `
      <div class="relative">
        <img src="${img}" alt="${title}" class="w-full h-44 object-contain bg-white group-hover:scale-[1.02] transition-transform duration-300" />
      </div>
      <div class="p-4">
        <h4 class="text-lg font-bold text-gray-900 truncate">${title}</h4>
        ${subtitle ? `<p class="text-sm text-gray-500 mt-1 line-clamp-1">${subtitle}</p>` : ''}
        <div class="mt-3">
          <span class="inline-flex items-center bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold">${ctaText}
            <i class="fas fa-arrow-left mr-2"></i>
          </span>
        </div>
      </div>`;
    if (typeof onClick === 'function') card.addEventListener('click', onClick);
    return card;
  };

  const updateHeaders = () => {
    if (state.level === 'main') {
      els.title.textContent = 'استكشف أصناف الطعام';
      els.subtitle.textContent = 'اختر قسماً رئيسياً للبدء';
      els.backBtn.classList.add('hidden');
    } else if (state.level === 'category') {
      els.title.textContent = state.mainCategory?.name || 'الأقسام';
      els.subtitle.textContent = 'اختر قسماً فرعياً';
      els.backBtn.classList.remove('hidden');
    } else {
      els.title.textContent = state.category?.name || 'المطاعم';
      els.subtitle.textContent = 'اختر مطعماً لعرض التفاصيل';
      els.backBtn.classList.remove('hidden');
    }

    // Breadcrumbs
    if (els.breadcrumb) {
      const parts = [
        '<button id="bc-home" class="flex items-center hover:text-amber-700"><i class="fas fa-home ml-1"></i> الرئيسية</button>',
        '<span class="mx-2">/</span>',
        '<button id="bc-places" class="hover:text-amber-700">أصناف الطعام</button>'
      ];
      if (state.mainCategory) {
        parts.push('<span class="mx-2">/</span>');
        parts.push(`<span class="text-gray-800">${state.mainCategory.name}</span>`);
      }
      if (state.category && state.level === 'restaurants') {
        parts.push('<span class="mx-2">/</span>');
        parts.push(`<span class="text-gray-800">${state.category.name}</span>`);
      }
      els.breadcrumb.innerHTML = parts.join('');
      // Rebind
      document.getElementById('bc-home')?.addEventListener('click', () => window.location.href = 'index.html');
      document.getElementById('bc-places')?.addEventListener('click', () => goTo('main'));
    }
    if (els.breadcrumbMobile) {
      const items = ['أصناف الطعام'];
      if (state.mainCategory) items.push(state.mainCategory.name);
      if (state.category && state.level === 'restaurants') items.push(state.category.name);
      els.breadcrumbMobile.textContent = items.join(' / ');
    }
  };

  const goTo = (level, payload) => {
    if (level === 'main') {
      state.level = 'main';
      state.mainCategory = null;
      state.category = null;
      updateHeaders();
      loadMainCategories();
    } else if (level === 'category') {
      state.level = 'category';
      state.mainCategory = { id: payload.id, name: payload.name };
      state.category = null;
      updateHeaders();
      loadCategories(payload.id);
    } else if (level === 'restaurants') {
      state.level = 'restaurants';
      state.category = { id: payload.id, name: payload.name };
      updateHeaders();
      loadRestaurants(payload.id);
    }
  };

  const loadMainCategories = async () => {
    try {
      renderSkeletons();
      const res = await fetch(`${API_BASE}/api/Public/main-categories?page=1&pageSize=100`, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('فشل تحميل الأقسام الرئيسية');
      const payload = await res.json();
      if (!payload?.success) throw new Error(payload?.message || 'حدث خطأ');
      const list = (payload.data || []).filter(mc => mc.isActive !== false);
      if (list.length === 0) {
        grid.innerHTML = '<div class="col-span-full bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-800 font-semibold">لا توجد أقسام رئيسية حالياً</div>';
        return;
      }
      grid.innerHTML = '';
      list.forEach(mc => {
        const card = buildCard({
          title: mc.name,
          subtitle: mc.description || '',
          imageUrl: mc.imageUrl,
          ctaText: 'عرض الأقسام',
          onClick: () => goTo('category', { id: mc.id, name: mc.name })
        });
        grid.appendChild(card);
      });
    } catch (e) {
      console.error(e);
      toast(e.message || 'تعذر تحميل الأقسام', 'error');
      grid.innerHTML = '<div class="col-span-full bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-800 font-semibold">تعذر تحميل الأقسام</div>';
    }
  };

  const loadCategories = async (mainCategoryId) => {
    try {
      renderSkeletons();
      const search = (els.searchInput?.value || '').trim();
      const url = new URL(`${API_BASE}/api/Public/categories`);
      url.searchParams.set('page', '1');
      url.searchParams.set('pageSize', '100');
      url.searchParams.set('mainCategoryId', String(mainCategoryId));
      if (search) url.searchParams.set('search', search);
      const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('فشل تحميل الأقسام');
      const payload = await res.json();
      if (!payload?.success) throw new Error(payload?.message || 'حدث خطأ');
      const list = (payload.data || []).filter(c => c.isActive !== false);
      if (list.length === 0) {
        grid.innerHTML = '<div class="col-span-full bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-800 font-semibold">لا توجد أقسام فرعية</div>';
        return;
      }
      grid.innerHTML = '';
      list.forEach(c => {
        const card = buildCard({
          title: c.name,
          subtitle: c.description || '',
          imageUrl: c.imageUrl,
          ctaText: 'عرض المطاعم',
          onClick: () => goTo('restaurants', { id: c.id, name: c.name })
        });
        grid.appendChild(card);
      });
    } catch (e) {
      console.error(e);
      toast(e.message || 'تعذر تحميل الأقسام', 'error');
      grid.innerHTML = '<div class="col-span-full bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-800 font-semibold">تعذر تحميل الأقسام</div>';
    }
  };

  const buildRestaurantCard = (r) => {
    const img = resolveImageUrl(r.imageUrl) || 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop';
    const a = document.createElement('a');
    a.href = `restaurant.html?id=${r.id}`;
    a.className = 'group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition duration-300';
    a.innerHTML = `
      <div class="relative">
        <img src="${img}" alt="${r.name}" class="w-full h-44 object-contain bg-white group-hover:scale-[1.02] transition-transform duration-300" />
      </div>
      <div class="p-4">
        <h4 class="text-lg font-bold text-gray-900 truncate">${r.name}</h4>
        <div class="flex items-center text-sm text-gray-500 mt-1">
          <i class="fas fa-tag ml-1 text-gray-400"></i>
          <span>${r.categoryName || ''}</span>
        </div>
      </div>`;
    return a;
  };

  const loadRestaurants = async (categoryId) => {
    try {
      renderSkeletons();
      const search = (els.searchInput?.value || '').trim();
      const url = new URL(`${API_BASE}/api/Public/restaurants`);
      url.searchParams.set('page', '1');
      url.searchParams.set('pageSize', '24');
      url.searchParams.set('categoryId', String(categoryId));
      if (search) url.searchParams.set('search', search);
      const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('فشل تحميل المطاعم');
      const payload = await res.json();
      if (!payload?.success) throw new Error(payload?.message || 'حدث خطأ');
      const list = payload.data || [];
      if (list.length === 0) {
        grid.innerHTML = '<div class="col-span-full bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-800 font-semibold">لا توجد مطاعم ضمن هذا القسم</div>';
        return;
      }
      grid.innerHTML = '';
      list.forEach(r => grid.appendChild(buildRestaurantCard(r)));
    } catch (e) {
      console.error(e);
      toast(e.message || 'تعذر تحميل المطاعم', 'error');
      grid.innerHTML = '<div class="col-span-full bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-800 font-semibold">تعذر تحميل المطاعم</div>';
    }
  };

  // Events
  els.backBtn?.addEventListener('click', () => {
    if (state.level === 'restaurants') {
      goTo('category', state.mainCategory);
    } else if (state.level === 'category') {
      goTo('main');
    }
  });

  els.searchInput?.addEventListener('input', () => {
    if (state.level === 'category' && state.mainCategory) {
      loadCategories(state.mainCategory.id);
    } else if (state.level === 'restaurants' && state.category) {
      loadRestaurants(state.category.id);
    }
  });

  // Init
  goTo('main');
})();


