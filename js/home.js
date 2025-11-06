(() => {
  const grid = document.getElementById('trending-grid');
  if (!grid) return;

  // Resolve API base URL (override by setting localStorage.apiBase)
  const API_BASE = (typeof localStorage !== 'undefined' && localStorage.getItem('apiBase'))
    || 'https://weenapp-001-site1.qtempurl.com';

  const showToastSafe = (msg, type = 'info') => {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      console[type === 'error' ? 'error' : 'log'](msg);
    }
  };

  const skeletonCard = () => {
    return `
      <div class="animate-pulse bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="h-44 bg-gray-200"></div>
        <div class="p-4 space-y-3">
          <div class="h-4 bg-gray-200 rounded w-2/3"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          <div class="h-8 bg-gray-200 rounded w-28 mt-2"></div>
        </div>
      </div>
    `;
  };

  const renderSkeletons = (count = 6) => {
    grid.innerHTML = Array.from({ length: count }).map(() => skeletonCard()).join('');
  };

  const buildCard = (r) => {
    const resolveImageUrl = (url) => {
      if (!url || typeof url !== 'string' || url.trim() === '') return null;
      // Absolute http(s)
      if (/^https?:\/\//i.test(url)) return url;
      // Starts with '/' → hosted by API static files
      if (url.startsWith('/')) return `${API_BASE}${url}`;
      // Relative like 'uploads/...'
      return `${API_BASE}/${url}`;
    };

    const imageUrl = resolveImageUrl(r.imageUrl) || 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop';
    return `
      <div class="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition duration-300">
        <div class="relative">
          <img src="${imageUrl}" alt="${r.name}" class="w-full h-52 object-contain group-hover:scale-[1.02] transition-transform duration-300" />
          <div class="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-gray-800 shadow">
            <i class="fas fa-fire text-amber-600 ml-1"></i>
            ${r.visitors} زائر
          </div>
        </div>
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-lg font-bold text-gray-900 truncate">${r.name}</h4>
          </div>
          <div class="flex items-center text-sm text-gray-500 mb-4">
            <i class="fas fa-tag ml-1 text-gray-400"></i>
            <span>${r.categoryName || ''}</span>
          </div>
          <div class="flex items-center justify-between">
            <a href="./restaurant.html?id=${r.id}" class="inline-flex items-center bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-4 py-2 rounded-full text-xs font-semibold hover:from-yellow-700 hover:to-amber-700 transition duration-300 shadow">
              عرض التفاصيل
              <i class="fas fa-arrow-left mr-2"></i>
            </a>
            <button class="inline-flex items-center text-amber-700 hover:text-amber-800 text-xs font-semibold">
              <i class="fas fa-heart ml-1"></i>
              حفظ
            </button>
          </div>
        </div>
      </div>
    `;
  };

  const renderRestaurants = (list) => {
    if (!list || list.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p class="text-amber-800 font-semibold">لا توجد مطاعم رائجة حالياً</p>
        </div>
      `;
      return;
    }
    grid.innerHTML = list.map(buildCard).join('');
  };

  const fetchTrending = async () => {
    try {
      renderSkeletons();
      const res = await fetch(`${API_BASE}/api/Restaurants/trending?take=6`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('فشل في تحميل المطاعم الرائجة');
      const payload = await res.json();
      if (!payload?.success) throw new Error(payload?.message || 'حدث خطأ غير متوقع');
      renderRestaurants(payload.data);
    } catch (err) {
      console.error(err);
      showToastSafe(err.message || 'تعذر تحميل المطاعم الرائجة', 'error');
      renderRestaurants([]);
    }
  };

  // Kick off
  fetchTrending();
})();

// Top Advertisers Slider
(() => {
  const track = document.getElementById('advertisers-track');
  if (!track) return;

  const API_BASE = (typeof localStorage !== 'undefined' && localStorage.getItem('apiBase'))
    || 'https://weenapp-001-site1.qtempurl.com';

  const showToastSafe = (msg, type = 'info') => {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      console[type === 'error' ? 'error' : 'log'](msg);
    }
  };

  const skeletonSlide = () => `
    <div class="snap-start shrink-0 w-64">
      <div class="animate-pulse bg-white/80 rounded-3xl border border-amber-100 shadow-sm overflow-hidden">
        <div class="h-40 bg-amber-100"></div>
        <div class="p-4 space-y-3">
          <div class="h-4 bg-amber-100 rounded w-2/3"></div>
          <div class="h-3 bg-amber-100 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  `;

  const renderSkeletons = (count = 6) => {
    track.innerHTML = Array.from({ length: count }).map(() => skeletonSlide()).join('');
  };

  const resolveImageUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    return `${API_BASE}/${url}`;
  };

  const slide = (item) => {
    const imageUrl = resolveImageUrl(item.imageUrl) || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop';
    return `
      <a href="./restaurant.html?id=${item.id}" class="snap-start shrink-0 w-64 focus:outline-none">
        <div class="relative group rounded-3xl p-1 bg-gradient-to-br from-amber-200 via-yellow-100 to-white shadow-sm">
          <div class="rounded-2xl overflow-hidden bg-white border border-amber-100">
            <div class="relative">
              <img src="${imageUrl}" alt="${item.name}" class="w-full h-40 object-contain group-hover:scale-[1.02] transition-transform duration-300" />
              <div class="absolute top-2 left-2 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-semibold text-amber-700 shadow">
                <i class="fas fa-megaphone ml-1 text-amber-600"></i>
                معلن مميز
              </div>
            </div>
            <div class="p-3">
              <h4 class="font-bold text-gray-900 text-sm truncate mb-1">${item.name}</h4>
              <div class="flex items-center text-[12px] text-gray-600">
                <span class="truncate"><i class="fas fa-tag ml-1 text-amber-600"></i>${item.categoryName || ''}</span>
              </div>
            </div>
          </div>
        </div>
      </a>
    `;
  };

  const render = (list) => {
    if (!list || list.length === 0) {
      track.innerHTML = `
        <div class="w-full">
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <p class="text-amber-800 font-semibold">لا يوجد معلنون حالياً</p>
          </div>
        </div>
      `;
      return;
    }
    track.innerHTML = list.map(slide).join('');
  };

  const fetchTopAdvertisers = async () => {
    try {
      renderSkeletons();
      const res = await fetch(`${API_BASE}/api/Public/top-advertisers`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('فشل في تحميل أهم المعلنين');
      const payload = await res.json();
      if (!payload?.success) throw new Error(payload?.message || 'حدث خطأ غير متوقع');
      render(payload.data || []);
    } catch (err) {
      console.error(err);
      showToastSafe(err.message || 'تعذر تحميل أهم المعلنين', 'error');
      render([]);
    }
  };

  // Drag (mouse/touch) to scroll
  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;

  const onDown = (e) => {
    isDown = true;
    startX = (e.touches ? e.touches[0].pageX : e.pageX) || 0;
    startScrollLeft = track.scrollLeft;
  };

  const onMove = (e) => {
    if (!isDown) return;
    const x = (e.touches ? e.touches[0].pageX : e.pageX) || 0;
    const walk = x - startX;
    track.scrollLeft = startScrollLeft - walk;
    if (e.cancelable) e.preventDefault();
  };

  const onUp = () => { isDown = false; };

  track.addEventListener('mousedown', onDown, { passive: true });
  track.addEventListener('mousemove', onMove, { passive: false });
  window.addEventListener('mouseup', onUp, { passive: true });
  track.addEventListener('mouseleave', onUp, { passive: true });

  track.addEventListener('touchstart', onDown, { passive: true });
  track.addEventListener('touchmove', onMove, { passive: false });
  track.addEventListener('touchend', onUp, { passive: true });

  // Kick off
  fetchTopAdvertisers();
})();

// Latest Offers Section
(() => {
  const offersGrid = document.getElementById('offers-grid');
  if (!offersGrid) return;

  // Resolve API base URL
  const API_BASE = (typeof localStorage !== 'undefined' && localStorage.getItem('apiBase'))
    || 'https://weenapp-001-site1.qtempurl.com';

  const showToastSafe = (msg, type = 'info') => {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      console[type === 'error' ? 'error' : 'log'](msg);
    }
  };

  const offerSkeletonCard = () => {
    return `
      <div class="animate-pulse bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="h-48 bg-gray-200"></div>
        <div class="p-4 space-y-3">
          <div class="h-5 bg-gray-200 rounded w-3/4"></div>
          <div class="h-3 bg-gray-200 rounded w-full"></div>
          <div class="h-3 bg-gray-200 rounded w-2/3"></div>
          <div class="h-8 bg-gray-200 rounded w-32 mt-3"></div>
        </div>
      </div>
    `;
  };

  const renderOfferSkeletons = (count = 6) => {
    offersGrid.innerHTML = Array.from({ length: count }).map(() => offerSkeletonCard()).join('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-SY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const buildOfferCard = (offer) => {
    const resolveImageUrl = (url) => {
      if (!url || typeof url !== 'string' || url.trim() === '') return null;
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith('/')) return `${API_BASE}${url}`;
      return `${API_BASE}/${url}`;
    };

    const imageUrl = resolveImageUrl(offer.imageUrl) || 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1200&auto=format&fit=crop';
    const expirationDate = formatDate(offer.expirationDate);
    const description = offer.description ? (offer.description.length > 100 ? offer.description.substring(0, 100) + '...' : offer.description) : '';

    return `
      <div class="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition duration-300">
        <div class="relative">
          <img src="${imageUrl}" alt="${offer.name}" class="w-full h-48 object-contain group-hover:scale-[1.02] transition-transform duration-300" />
          <div class="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
            <i class="fas fa-tag ml-1"></i>
            عرض خاص
          </div>
        </div>
        <div class="p-5">
          <h4 class="text-xl font-bold text-gray-900 mb-2 line-clamp-2">${offer.name}</h4>
          ${description ? `<p class="text-sm text-gray-600 mb-3 line-clamp-2">${description}</p>` : ''}
          <div class="flex items-center text-sm text-gray-500 mb-3">
            <i class="fas fa-store ml-1 text-amber-600"></i>
            <span class="truncate">${offer.restaurantName || 'مطعم'}</span>
          </div>
          <div class="flex items-center text-sm text-amber-700 mb-4">
            <i class="fas fa-calendar-alt ml-1"></i>
            <span>ينتهي في: ${expirationDate}</span>
          </div>
          <a href="./restaurant.html?id=${offer.restaurantId}" class="inline-flex items-center justify-center w-full bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:from-yellow-700 hover:to-amber-700 transition duration-300 shadow">
            عرض العرض
            <i class="fas fa-arrow-left mr-2"></i>
          </a>
        </div>
      </div>
    `;
  };

  const renderOffers = (list) => {
    if (!list || list.length === 0) {
      offersGrid.innerHTML = `
        <div class="col-span-full bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <i class="fas fa-tag text-amber-600 text-4xl mb-3"></i>
          <p class="text-amber-800 font-semibold">لا توجد عروض متاحة حالياً</p>
          <p class="text-amber-600 text-sm mt-2">تابعونا للحصول على آخر العروض</p>
        </div>
      `;
      return;
    }
    offersGrid.innerHTML = list.map(buildOfferCard).join('');
  };

  const fetchLatestOffers = async () => {
    try {
      renderOfferSkeletons();
      const res = await fetch(`${API_BASE}/api/Public/latest-offers`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('فشل في تحميل العروض');
      const payload = await res.json();
      if (!payload?.success) throw new Error(payload?.message || 'حدث خطأ غير متوقع');
      renderOffers(payload.data || []);
    } catch (err) {
      console.error(err);
      showToastSafe(err.message || 'تعذر تحميل العروض', 'error');
      renderOffers([]);
    }
  };

  // Kick off
  fetchLatestOffers();
})();


