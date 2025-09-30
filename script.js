document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const displayArea = document.getElementById('displayArea');
  const tabs = document.querySelectorAll('.tab');
  const searchInput = document.getElementById('searchInput');
  const voiceBtn = document.getElementById('voiceSearch');
  const langSelect = document.getElementById('languageSelect');

  // Translations (kept from original, added outofstock status)
  const translations = {
    "en-US": {
      "sidebar.contents":"Contents","sidebar.order":"Order Management","sidebar.product":"Product Management","sidebar.marketing":"Marketing Channels","sidebar.customer":"Customer Service","sidebar.finance":"Finance","sidebar.store":"Store Management",
      "header.title":"Sales Channel","header.account":"Account","tabs.product":"Product","tabs.active":"Active","tabs.hidden":"Hidden","tabs.outofstock":"Out Of Stock","tabs.lastupdated":"Last Updated Date",
      "search.placeholder":"Search products...","actions.save":"Save","actions.hide":"Hide","actions.unhide":"Unhide","actions.delete":"Delete","addcard.text":"Add Product",
      "product.image":"Product Image","product.name":"Enter Product Name","product.code":"Enter Product Code","product.price":"Enter Price","product.inventory":"Inventory",
      "nocontent":"No content for this tab yet.","status.active":"Active","status.hidden":"Hidden","status.outofstock":"Out Of Stock"
    },
    "vi-VN": {
      "sidebar.contents":"Nội dung","sidebar.order":"Quản lý đơn hàng","sidebar.product":"Quản lý sản phẩm","sidebar.marketing":"Kênh marketing","sidebar.customer":"Chăm sóc khách hàng","sidebar.finance":"Tài chính","sidebar.store":"Quản lý cửa hàng",
      "header.title":"Kênh bán hàng","header.account":"Tài khoản","tabs.product":"Sản phẩm","tabs.active":"Đang bán","tabs.hidden":"Đã ẩn","tabs.outofstock":"Hết hàng","tabs.lastupdated":"Ngày cập nhật",
      "search.placeholder":"Tìm sản phẩm...","actions.save":"Lưu","actions.hide":"Ẩn","actions.unhide":"Hiện","actions.delete":"Xóa","addcard.text":"Thêm sản phẩm",
      "product.image":"Hình ảnh","product.name":"Nhập tên sản phẩm","product.code":"Nhập mã sản phẩm","product.price":"Nhập giá","product.inventory":"Tồn kho",
      "nocontent":"Chưa có nội dung cho thẻ này.","status.active":"Đang bán","status.hidden":"Đã ẩn","status.outofstock":"Hết hàng"
    }
  };

  // Data lists (preserve original logic)
  let products = [];         // draft/new cards
  let activeProducts = [];   // saved & active
  let hiddenProducts = [];   // hidden
  let outOfStockProducts = [];// out of stock
  let idCounter = 1;

  // sample items so UI not empty
  activeProducts.push({ id: idCounter++, name: "Sample A", code: "A001", price: "120", inventory: "3", lastUpdated: new Date(), status: "active" });
  outOfStockProducts.push({ id: idCounter++, name: "Sample B", code: "B001", price: "250", inventory: "0", lastUpdated: new Date(Date.now()-86400000), status: "outofstock", prevStatus: "active" });
  hiddenProducts.push({ id: idCounter++, name: "Sample C", code: "C001", price: "90", inventory: "5", lastUpdated: new Date(Date.now()-3600*1000), status: "hidden" });

  let currentTab = 'products';
  let currentLang = localStorage.getItem("lang") || 'en-US';
  langSelect.value = currentLang;

  function newProductObj() {
    return { id: idCounter++, name: '', code: '', price: '', inventory: '', lastUpdated: new Date(), status: 'draft' };
  }

  function escapeHtml(str = '') {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleString(currentLang, { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }

  function removeFromAll(productId) {
    let idx;
    idx = products.findIndex(p => p.id === productId); if (idx !== -1) products.splice(idx,1);
    idx = activeProducts.findIndex(p => p.id === productId); if (idx !== -1) activeProducts.splice(idx,1);
    idx = hiddenProducts.findIndex(p => p.id === productId); if (idx !== -1) hiddenProducts.splice(idx,1);
    idx = outOfStockProducts.findIndex(p => p.id === productId); if (idx !== -1) outOfStockProducts.splice(idx,1);
  }

  function moveToOutOfStock(product) {
    removeFromAll(product.id);
    product.prevStatus = product.status || 'active';
    product.status = 'outofstock';
    product.lastUpdated = new Date();
    outOfStockProducts.push(product);
    refreshView();
  }

  function restoreFromOutOfStock(product) {
    removeFromAll(product.id);
    const prev = product.prevStatus || 'active';
    product.status = prev;
    delete product.prevStatus;
    product.lastUpdated = new Date();
    if (prev === 'active') activeProducts.push(product);
    else if (prev === 'hidden') hiddenProducts.push(product);
    else products.push(product);
    refreshView();
  }

  function renderList(baseList, options = {}) {
    const { filter = '', showAdd = false } = options;
    displayArea.innerHTML = '';
    const t = translations[currentLang];
    const keyword = (filter || '').trim().toLowerCase();

    // if lastupdated: merge all lists and sort by lastUpdated desc
    let toShow;
    if (currentTab === 'lastupdated') {
      toShow = [...activeProducts, ...hiddenProducts, ...products, ...outOfStockProducts]
               .sort((a,b)=> new Date(b.lastUpdated) - new Date(a.lastUpdated));
    } else {
      toShow = baseList.filter(p => {
        if (!keyword) return true;
        return (p.name||'').toLowerCase().includes(keyword) ||
               (p.code||'').toLowerCase().includes(keyword);
      });
    }

    toShow.forEach((product) => {
      const card = document.createElement('div');
      card.className = 'product-card' + (product.status === 'outofstock' ? ' soldout' : '');
      card.dataset.id = product.id;

      // overlay HTML for sold out (shown only when product.status === 'outofstock')
      const overlayHtml = product.status === 'outofstock' ? `<div class="sold-overlay">${currentLang === 'vi-VN' ? 'Hết hàng' : 'Sold Out'}</div>` : '';

      card.innerHTML = `
        <div class="image-box">
          ${t["product.image"]}
          ${overlayHtml}
        </div>
        <input class="inp-name" placeholder="${t['product.name']}" value="${escapeHtml(product.name)}" />
        <input class="inp-code" placeholder="${t['product.code']}" value="${escapeHtml(product.code)}" />
        <input class="inp-price" placeholder="${t['product.price']}" value="${escapeHtml(product.price)}" />
        <input class="inp-inv" placeholder="${t['product.inventory']}" value="${escapeHtml(product.inventory)}" />
        ${ currentTab === 'lastupdated' ? `<div class="product-status">${t[`status.${product.status}`] || product.status}</div>` : '' }
        <div class="last-updated">${formatDate(product.lastUpdated)}</div>
        <div class="actions">
          ${ currentTab !== 'lastupdated' && baseList === products ? `<button class="save">${t["actions.save"]}</button>` : '' }
          ${ baseList === hiddenProducts ? `<button class="unhide">${t["actions.unhide"]}</button>` : (currentTab!=='lastupdated' && baseList !== outOfStockProducts ? `<button class="hide">${t["actions.hide"]}</button>` : '' ) }
          ${ currentTab!=='lastupdated' ? `<button class="delete">${t["actions.delete"]}</button>` : '' }
        </div>
      `;

      // input listeners
      const inpName = card.querySelector('.inp-name');
      const inpCode = card.querySelector('.inp-code');
      const inpPrice = card.querySelector('.inp-price');
      const inpInv = card.querySelector('.inp-inv');

      inpName?.addEventListener('input', (e) => { product.name = e.target.value; product.lastUpdated = new Date(); });
      inpCode?.addEventListener('input', (e) => { product.code = e.target.value; product.lastUpdated = new Date(); });
      inpPrice?.addEventListener('input', (e) => { product.price = e.target.value; product.lastUpdated = new Date(); });

      inpInv?.addEventListener('input', (e) => {
        product.inventory = e.target.value;
        product.lastUpdated = new Date();

        // if inventory is 0 or empty => move to Out Of Stock
        if (product.inventory === '' || Number(product.inventory) === 0) {
          if (product.status !== 'outofstock') {
            moveToOutOfStock(product);
            return; // we've moved and refreshed
          }
        } else {
          // inventory > 0 and currently outofstock => restore
          if (product.status === 'outofstock') {
            restoreFromOutOfStock(product);
            return;
          }
        }
        // update timestamp display without full refresh to keep typing experience
        const lu = card.querySelector('.last-updated');
        if (lu) lu.textContent = formatDate(product.lastUpdated);
      });

      // actions
      card.querySelector('.delete')?.addEventListener('click', () => {
        removeFromAll(product.id);
        refreshView();
      });

      card.querySelector('.hide')?.addEventListener('click', () => {
        // hide only from activeProducts
        const idx = activeProducts.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          const obj = activeProducts.splice(idx,1)[0];
          obj.status = 'hidden'; obj.lastUpdated = new Date();
          hiddenProducts.push(obj);
          refreshView();
        }
      });

      card.querySelector('.unhide')?.addEventListener('click', () => {
        const idx = hiddenProducts.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          const obj = hiddenProducts.splice(idx,1)[0];
          obj.status = 'active'; obj.lastUpdated = new Date();
          activeProducts.push(obj);
          refreshView();
        }
      });

      card.querySelector('.save')?.addEventListener('click', () => {
        if (baseList === products) {
          const idx = products.findIndex(p => p.id === product.id);
          if (idx !== -1) {
            const obj = products.splice(idx,1)[0];
            obj.status = 'active'; obj.lastUpdated = new Date();
            activeProducts.push(obj);
            currentTab = 'active';
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            const tabEl = document.querySelector('.tab[data-tab="active"]');
            if (tabEl) tabEl.classList.add('active');
            refreshView();
          }
        }
      });

      displayArea.appendChild(card);
    });

    // Add card for adding new product only on products tab
    if (showAdd && currentTab === 'products') {
      const addCard = document.createElement('div');
      addCard.className = 'add-card';
      addCard.innerHTML = `<span>+</span><div>${t["addcard.text"]}</div>`;
      addCard.addEventListener('click', () => {
        products.push(newProductObj());
        refreshView();
      });
      displayArea.appendChild(addCard);
    }
  }

  function refreshView() {
    const t = translations[currentLang];
    if (currentTab === 'products') renderList(products, { filter: searchInput.value, showAdd: true });
    else if (currentTab === 'active') renderList(activeProducts, { filter: searchInput.value });
    else if (currentTab === 'hidden') renderList(hiddenProducts, { filter: searchInput.value });
    else if (currentTab === 'outofstock') renderList(outOfStockProducts, { filter: searchInput.value });
    else if (currentTab === 'lastupdated') renderList([], { filter: searchInput.value });
    else displayArea.innerHTML = `<div style="padding:18px;color:#666">${t["nocontent"]}</div>`;
    applyTranslations();
  }

  // tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab || 'products';
      searchInput.value = '';
      refreshView();
    });
  });

  searchInput.addEventListener('input', () => refreshView());

  // voice recognition (as in original)
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    voiceBtn.addEventListener('click', () => {
      recognition.lang = currentLang;
      recognition.start();
      voiceBtn.classList.add('listening');
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      searchInput.value = transcript;
      refreshView();
    };

    recognition.onend = () => {
      voiceBtn.classList.remove('listening');
    };
  }

  // translations
  function applyTranslations() {
    const t = translations[currentLang];
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (t[key]) el.textContent = t[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (t[key]) el.setAttribute("placeholder", t[key]);
    });
  }

  langSelect.addEventListener('change', () => {
    currentLang = langSelect.value;
    localStorage.setItem("lang", currentLang);
    refreshView();
  });

  // initial render
  refreshView();
});



