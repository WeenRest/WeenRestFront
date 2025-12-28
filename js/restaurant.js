(() => {
  const qs = new URLSearchParams(window.location.search);
  const id = parseInt(qs.get('id') || '', 10);
  const API_BASE = (typeof localStorage !== 'undefined' && localStorage.getItem('apiBase'))
    || '  https://weenapp-001-site1.qtempurl.com';

  const toast = (message, type = 'info') => {
    const toastEl = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    if (!toastEl || !toastIcon || !toastMessage) return;
    toastMessage.textContent = message;
    toastIcon.innerHTML = '';
    if (type === 'success') {
      toastEl.className = 'fixed bottom-4 right-4 bg-green-50 border-green-300 rounded-lg shadow-2xl border p-4 z-50 max-w-sm transform transition-all duration-300';
      toastIcon.innerHTML = '<i class="fas fa-check-circle text-green-500 text-xl"></i>';
      toastMessage.className = 'text-sm font-semibold text-green-800';
    } else if (type === 'error') {
      toastEl.className = 'fixed bottom-4 right-4 bg-red-50 border-red-300 rounded-lg shadow-2xl border p-4 z-50 max-w-sm transform transition-all duration-300';
      toastIcon.innerHTML = '<i class="fas fa-exclamation-circle text-red-500 text-xl"></i>';
      toastMessage.className = 'text-sm font-semibold text-red-800';
    } else {
      toastEl.className = 'fixed bottom-4 right-4 bg-blue-50 border-blue-300 rounded-lg shadow-2xl border p-4 z-50 max-w-sm transform transition-all duration-300';
      toastIcon.innerHTML = '<i class="fas fa-info-circle text-blue-500 text-xl"></i>';
      toastMessage.className = 'text-sm font-semibold text-blue-800';
    }
    toastEl.classList.remove('hidden');
    setTimeout(() => { toastEl.classList.add('hidden'); }, 2500);
  };

  const resolveImageUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    return `${API_BASE}/${url}`;
  };

  const renderWorkingHours = (workingHours) => {
    const container = document.getElementById('working-hours-list');
    const section = document.getElementById('working-hours-section');
    if (!container || !section) return;

    if (!workingHours || !workingHours.days || workingHours.days.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';

    const dayNames = {
      'Monday': 'الاثنين',
      'Tuesday': 'الثلاثاء',
      'Wednesday': 'الأربعاء',
      'Thursday': 'الخميس',
      'Friday': 'الجمعة',
      'Saturday': 'السبت',
      'Sunday': 'الأحد'
    };

    container.innerHTML = workingHours.days.map(day => {
      if (day.isClosed) {
        return `
          <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <span class="font-semibold text-gray-700">${day.dayArabic || dayNames[day.day] || day.day}</span>
            <span class="text-sm text-red-600 font-medium">مغلق</span>
          </div>
        `;
      }
      const timeStr = day.startTime && day.endTime 
        ? `${day.startTime} - ${day.endTime}`
        : 'غير محدد';
      return `
        <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
          <span class="font-semibold text-gray-700">${day.dayArabic || dayNames[day.day] || day.day}</span>
          <span class="text-sm text-gray-600">${timeStr}</span>
        </div>
      `;
    }).join('');
  };

    const setHero = (data) => {
    const heroImg = document.getElementById('restaurant-image');
    const nameEl = document.getElementById('restaurant-name');
    const descEl = document.getElementById('restaurant-description');
    const visitorsEl = document.getElementById('restaurant-visitors');
    const categoryEl = document.getElementById('restaurant-category');
    const cityEl = document.getElementById('restaurant-city');
    const phoneEl = document.getElementById('restaurant-phone');
    const phoneTextEl = document.getElementById('restaurant-phone-text');

    const fallback = 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop';
    heroImg.src = resolveImageUrl(data.imageUrl) || fallback;
    heroImg.alt = data.name || '';
    nameEl.textContent = data.name || '';
    descEl.textContent = data.description || '';
    visitorsEl.textContent = data.visitors ?? 0;
    categoryEl.innerHTML = '<i class="fas fa-tag ml-1 text-gray-400"></i>' + (data.categoryName || '');
    const cities = (data.cityNames || []).filter(Boolean);
    cityEl.innerHTML = '<i class="fas fa-map-marker-alt ml-1 text-gray-400"></i>' + (cities.join('، ') || (data.city || ''));
    if (data.phoneNumber) {
      phoneEl.href = `tel:${data.phoneNumber}`;
      if (phoneTextEl) phoneTextEl.textContent = data.phoneNumber;
    } else {
      phoneEl.style.display = 'none';
    }

    // Add delivery badge - always show, but with different styles based on availability
    const deliveryBadge = document.getElementById('delivery-badge');
    const deliveryBadgeText = document.getElementById('delivery-badge-text');
    if (deliveryBadge && deliveryBadgeText) {
      // Support both camelCase and PascalCase from API
      const hasDelivery = data.hasDelivery || data.HasDelivery || false;
      deliveryBadge.style.display = 'inline-flex';
      
      if (hasDelivery) {
        // Delivery available - green badge
        deliveryBadge.className = 'inline-flex items-center bg-green-50 text-green-700 px-3 py-1 rounded-full';
        deliveryBadgeText.textContent = 'خدمة التوصيل متاحة';
      } else {
        // No delivery - gray badge
        deliveryBadge.className = 'inline-flex items-center bg-gray-100 text-gray-600 px-3 py-1 rounded-full';
        deliveryBadgeText.textContent = 'خدمة التوصيل غير متاحة';
      }
    }

    // Add OpenStreetMap link if location is available
    const mapLink = document.getElementById('restaurant-map-link');
    if (mapLink) {
      const lat = data.latitude || data.Latitude;
      const lng = data.longitude || data.Longitude;
      if (lat && lng) {
        // Create OpenStreetMap URL (يمكن أيضاً استخدام Google Maps)
        const mapsUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`;
        // أو يمكن استخدام Google Maps: `https://www.google.com/maps?q=${lat},${lng}`
        mapLink.href = mapsUrl;
        mapLink.classList.remove('hidden');
      } else {
        mapLink.classList.add('hidden');
      }
    }

    // Render working hours
    renderWorkingHours(data.workingHours);
  };

  const renderOffers = (offers) => {
    const grid = document.getElementById('offers-grid');
    if (!grid) return;
    if (!offers || offers.length === 0) {
      grid.innerHTML = '<div class="col-span-full bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-800 font-semibold">لا توجد عروض حالياً</div>';
      return;
    }
    grid.innerHTML = offers.map(o => {
      const img = resolveImageUrl(o.imageUrl) || 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=80&w=1200&auto=format&fit=crop';
      return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition">
          <img src="${img}" alt="${o.name}" class="w-full h-40 object-contain" />
          <div class="p-4">
            <h3 class="text-lg font-bold text-gray-900">${o.name}</h3>
            <p class="text-sm text-gray-600 mt-1 line-clamp-2">${o.description || ''}</p>
            <div class="mt-3 text-xs text-gray-500">
              <i class="far fa-clock ml-1"></i>
              ينتهي في ${new Date(o.expirationDate).toLocaleDateString('ar-EG')}
            </div>
          </div>
        </div>`;
    }).join('');
  };

  const renderMenus = (menus) => {
    const gallery = document.getElementById('menu-gallery');
    if (!gallery) return;
    const images = (menus || []).flatMap(m => (m.images || []));
    if (images.length === 0) {
      gallery.innerHTML = '<div class="col-span-full bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-700 font-semibold">لا توجد صور للمنيو حالياً</div>';
      return;
    }
    gallery.innerHTML = images.map((img, idx) => {
      const src = resolveImageUrl(img.imageUrl) || '';
      return `<button type="button" class="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition focus:outline-none relative cursor-pointer" data-menu-image="${idx}">
        <img src="${src}" data-full="${src}" alt="menu" class="w-full h-44 object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <i class="fas fa-expand text-white opacity-0 group-hover:opacity-100 transition-opacity text-2xl"></i>
        </div>
      </button>`;
    }).join('');

    // Bind modal open on click - more robust binding
    gallery.querySelectorAll('button[data-menu-image]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const imgEl = btn.querySelector('img[data-full]');
        if (imgEl) {
          const fullSrc = imgEl.getAttribute('data-full');
          if (fullSrc) {
            openImageModal(fullSrc);
          }
        }
      });
    });
  };

  const renderPosts = (posts) => {
    const container = document.getElementById('posts-list');
    if (!container) return;
    if (!posts || posts.length === 0) {
      container.innerHTML = '<div class="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-700 font-semibold">لا توجد منشورات حالياً</div>';
      return;
    }
    container.innerHTML = posts.map(post => {
      const description = post.description ? `<p class="text-gray-700 mb-4 leading-7">${post.description}</p>` : '';
      const mediaHtml = (post.media || []).map(media => {
        const src = resolveImageUrl(media.mediaUrl) || '';
        if (media.mediaType === 'video') {
          return `
            <div class="rounded-xl overflow-hidden">
              <video src="${src}" controls class="w-full h-auto max-h-96 object-contain bg-gray-50" preload="metadata"></video>
            </div>
          `;
        }
        return `
          <button type="button" class="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition focus:outline-none relative cursor-pointer" onclick="openImageModal('${src}')">
            <img src="${src}" alt="post media" class="w-full h-auto max-h-96 object-contain group-hover:scale-[1.02] transition-transform duration-300" />
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <i class="fas fa-expand text-white opacity-0 group-hover:opacity-100 transition-opacity text-2xl"></i>
            </div>
          </button>
        `;
      }).join('');
      return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="p-6">
            ${description}
            ${mediaHtml ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${mediaHtml}</div>` : ''}
            <div class="mt-4 text-xs text-gray-500 flex items-center">
              <i class="far fa-clock ml-1"></i>
              ${new Date(post.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  // Image modal viewer state
  let zoom = 1;
  let translateX = 0;
  let translateY = 0;
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  const modal = () => document.getElementById('image-modal');
  const stage = () => document.getElementById('image-modal-stage');
  const modalImg = () => document.getElementById('image-modal-img');

  const applyTransform = () => {
    const img = modalImg();
    if (!img) return;
    img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoom})`;
    img.style.transition = 'transform 0.1s ease-out';
  };

  const clampZoom = (z) => Math.max(0.5, Math.min(5, z));

  const openImageModal = (src) => {
    const m = modal();
    const img = modalImg();
    if (!m || !img) return;
    
    // Reset state
    zoom = 1;
    translateX = 0;
    translateY = 0;
    
    // Load image and set initial size
    img.src = src || '';
    img.onload = () => {
      // Reset transform and center image initially
      zoom = 1;
      translateX = 0;
      translateY = 0;
      applyTransform();
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    };
    
    m.classList.remove('hidden');
    document.addEventListener('keydown', onKeyDown);
  };

  const closeImageModal = () => {
    const m = modal();
    if (!m) return;
    m.classList.add('hidden');
    document.removeEventListener('keydown', onKeyDown);
    // Restore body scroll
    document.body.style.overflow = '';
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') closeImageModal();
  };

  const bindModalControls = () => {
    const m = modal();
    const st = stage();
    const img = modalImg();
    const btnIn = document.getElementById('zoom-in');
    const btnOut = document.getElementById('zoom-out');
    const btnReset = document.getElementById('zoom-reset');
    const btnClose = document.getElementById('image-modal-close');
    if (!m || !st || !img) return;

    // Buttons
    btnIn?.addEventListener('click', () => { zoom = clampZoom(zoom * 1.2); applyTransform(); });
    btnOut?.addEventListener('click', () => { zoom = clampZoom(zoom / 1.2); applyTransform(); });
    btnReset?.addEventListener('click', () => { zoom = 1; translateX = 0; translateY = 0; applyTransform(); });
    btnClose?.addEventListener('click', closeImageModal);

    // Close on backdrop (but not when clicking the image)
    m.addEventListener('click', (e) => { if (e.target === m) closeImageModal(); });

    // Wheel zoom centered around cursor
    st.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = img.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - rect.width / 2;
      const offsetY = e.clientY - rect.top - rect.height / 2;
      const oldZoom = zoom;
      zoom = clampZoom(zoom * (e.deltaY < 0 ? 1.1 : 0.9));
      const scale = zoom / oldZoom;
      translateX = (translateX * scale) + (offsetX * (scale - 1));
      translateY = (translateY * scale) + (offsetY * (scale - 1));
      applyTransform();
    }, { passive: false });

    // Double-click to zoom in/out
    st.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (zoom === 1) {
        zoom = clampZoom(2);
      } else {
        zoom = 1;
        translateX = 0;
        translateY = 0;
      }
      applyTransform();
    });

    // Drag to pan
    st.addEventListener('mousedown', (e) => {
      // Don't start panning on double-click
      if (e.detail > 1) return;
      isPanning = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      applyTransform();
    });
    window.addEventListener('mouseup', () => { isPanning = false; });
    // Touch support with double-tap zoom
    let lastTap = 0;
    st.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
          // Double tap detected
          e.preventDefault();
          if (zoom === 1) {
            zoom = clampZoom(2);
          } else {
            zoom = 1;
            translateX = 0;
            translateY = 0;
          }
          applyTransform();
          lastTap = 0;
          return;
        }
        lastTap = currentTime;
        isPanning = true;
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
      }
    }, { passive: false });
    st.addEventListener('touchmove', (e) => {
      if (!isPanning || e.touches.length !== 1) return;
      translateX = e.touches[0].clientX - startX;
      translateY = e.touches[0].clientY - startY;
      applyTransform();
    }, { passive: true });
    st.addEventListener('touchend', () => { isPanning = false; }, { passive: true });
  };

  const load = async () => {
    if (!id || Number.isNaN(id)) {
      toast('رابط غير صالح', 'error');
      setTimeout(() => window.location.replace('index.html'), 1000);
      return;
    }
    try {
      // lightweight skeletons
      document.getElementById('restaurant-name').textContent = '...';
      const res = await fetch(`${API_BASE}/api/Restaurants/${id}/public`, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('فشل تحميل بيانات المطعم');
      const payload = await res.json();
      if (!payload?.success || !payload?.data) throw new Error(payload?.message || 'حدث خطأ غير متوقع');
      const data = payload.data;
      setHero(data);
      renderOffers(data.activeOffers || []);
      renderMenus(data.menus || []);
      renderPosts(data.posts || []);
    } catch (e) {
      console.error(e);
      toast(e.message || 'تعذر تحميل البيانات', 'error');
    }
  };

  bindModalControls();
  load();
})();


