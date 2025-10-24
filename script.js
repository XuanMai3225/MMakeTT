document.addEventListener('DOMContentLoaded', () => { 
  const displayArea = document.getElementById('displayArea');
  const tabs = document.querySelectorAll('.tab');
  const searchInput = document.getElementById('searchInput');
  const voiceBtn = document.getElementById('voiceSearch');
  const langSelect = document.getElementById('languageSelect');
  const mainArea = document.querySelector('.main'); // reference to main area so we can hide/show it

  // --------------------------- TRANSLATIONS ---------------------------
  const translations = {
    "en-US": {
      "sidebar.contents":"Contents","sidebar.order":"Order Management","sidebar.product":"Product Management","sidebar.marketing":"Marketing Channels","sidebar.customer":"Customer Service","sidebar.finance":"Finance","sidebar.store":"Store Management",
      "header.title":"Sales Channel","header.account":"Account","tabs.product":"Product","tabs.active":"Active","tabs.hidden":"Hidden","tabs.outofstock":"Out Of Stock","tabs.lastupdated":"Last Updated Date",
      "search.placeholder":"Search products...","actions.save":"Save","actions.hide":"Hide","actions.unhide":"Unhide","actions.delete":"Delete","addcard.text":"Add Product",
      "product.image":"Product Image","product.name":"Enter Product Name","product.code":"Enter Product Code","product.price":"Enter Price","product.inventory":"Inventory",
      "nocontent":"No content for this tab yet.","status.active":"Active","status.hidden":"Hidden","status.outofstock":"Out Of Stock","overlay.soldout":"Sold Out"
    },
    "vi-VN": {
      "sidebar.contents":"Nội dung","sidebar.order":"Quản lý đơn hàng","sidebar.product":"Quản lý sản phẩm","sidebar.marketing":"Kênh marketing","sidebar.customer":"Chăm sóc khách hàng","sidebar.finance":"Tài chính","sidebar.store":"Quản lý cửa hàng",
      "header.title":"Kênh bán hàng","header.account":"Tài khoản","tabs.product":"Sản phẩm","tabs.active":"Đang bán","tabs.hidden":"Đã ẩn","tabs.outofstock":"Hết hàng","tabs.lastupdated":"Ngày cập nhật",
      "search.placeholder":"Tìm sản phẩm...","actions.save":"Lưu","actions.hide":"Ẩn","actions.unhide":"Hiện","actions.delete":"Xóa","addcard.text":"Thêm sản phẩm",
      "product.image":"Hình ảnh","product.name":"Nhập tên sản phẩm","product.code":"Nhập mã sản phẩm","product.price":"Nhập giá","product.inventory":"Tồn kho",
      "nocontent":"Chưa có nội dung cho thẻ này.","status.active":"Đang bán","status.hidden":"Đã ẩn","status.outofstock":"Hết hàng","overlay.soldout":"Hết hàng"
    }
  };

  // --------------------------- DATA ---------------------------
  let products = [];
  let activeProducts = [];
  let hiddenProducts = [];
  let outOfStockProducts = [];
  let idCounter = 1;

  // initial sample data
  activeProducts.push({ id: idCounter++, name: "Sample A", code: "A001", price: "120", inventory: "3", lastUpdated: new Date(), status: "active" });
  outOfStockProducts.push({ id: idCounter++, name: "Sample B", code: "B001", price: "250", inventory: "0", lastUpdated: new Date(Date.now()-86400000), status: "outofstock", prevStatus: "active" });
  hiddenProducts.push({ id: idCounter++, name: "Sample C", code: "C001", price: "90", inventory: "5", lastUpdated: new Date(Date.now()-3600*1000), status: "hidden" });

  let currentTab = 'products';
  let currentLang = localStorage.getItem("lang") || 'en-US';
  if (langSelect) langSelect.value = currentLang;

  // --------------------------- HELPERS ---------------------------
  function newProductObj() { return { id:idCounter++, name:'', code:'', price:'', inventory:'', lastUpdated: new Date(), status: 'draft' }; }
  function escapeHtml(str=''){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function formatDate(date){ return new Date(date).toLocaleString(currentLang,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}); }

  function removeFromAll(productId) {
    [products, activeProducts, hiddenProducts, outOfStockProducts].forEach(list => {
      const idx = list.findIndex(p => p.id === productId);
      if (idx !== -1) list.splice(idx, 1);
    });
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

  // --------------------------- RENDER ---------------------------
  function renderList(baseList, options = {}) {
    const { filter = '', showAdd = false } = options;
    displayArea.innerHTML = '';
    const t = translations[currentLang] || translations['en-US'];
    const keyword = (filter || '').trim().toLowerCase();

    let toShow;
    if (currentTab === 'lastupdated') {
      toShow = [...activeProducts, ...hiddenProducts, ...products, ...outOfStockProducts].sort((a,b)=> new Date(b.lastUpdated)-new Date(a.lastUpdated));
    } else {
      toShow = baseList.filter(p=>!keyword||(p.name||'').toLowerCase().includes(keyword)||(p.code||'').toLowerCase().includes(keyword));
    }

    toShow.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card' + (product.status === 'outofstock' ? ' soldout' : '');
      card.dataset.id = product.id;
      const overlayHtml = product.status === 'outofstock' ? `<div class="sold-overlay">${t["overlay.soldout"]}</div>` : '';

      card.innerHTML = `
        <div class="image-box">${t["product.image"]}${overlayHtml}</div>
        <input class="inp-name" placeholder="${t["product.name"]}" value="${escapeHtml(product.name)}" />
        <input class="inp-code" placeholder="${t["product.code"]}" value="${escapeHtml(product.code)}" />
        <input class="inp-price" placeholder="${t["product.price"]}" value="${escapeHtml(product.price)}" />
        <input class="inp-inv" placeholder="${t["product.inventory"]}" value="${escapeHtml(product.inventory)}" />
        ${ currentTab === 'lastupdated' ? `<div class="product-status">${t[`status.${product.status}`] || product.status}</div>` : '' }
        <div class="last-updated">${formatDate(product.lastUpdated)}</div>
        <div class="actions">
          ${currentTab!=='lastupdated' && baseList===products?`<button class="save">${t["actions.save"]}</button>`:''}
          ${ baseList===hiddenProducts?`<button class="unhide">${t["actions.unhide"]}</button>`:(currentTab!=='lastupdated' && baseList!==outOfStockProducts?`<button class="hide">${t["actions.hide"]}</button>`:'') }
          ${currentTab!=='lastupdated'?`<button class="delete">${t["actions.delete"]}</button>`:''}
        </div>
      `;

      card.querySelector('.inp-name')?.addEventListener('input', e=>{ product.name=e.target.value; product.lastUpdated=new Date(); });
      card.querySelector('.inp-code')?.addEventListener('input', e=>{ product.code=e.target.value; product.lastUpdated=new Date(); });
      card.querySelector('.inp-price')?.addEventListener('input', e=>{ product.price=e.target.value; product.lastUpdated=new Date(); });

      card.querySelector('.inp-inv')?.addEventListener('input', (e) => {
        product.inventory = e.target.value;
        product.lastUpdated = new Date();

        if (product.inventory === '' || Number(product.inventory) === 0) {
          if (product.status !== 'outofstock') { moveToOutOfStock(product); return; }
        } else {
          if (product.status === 'outofstock') { restoreFromOutOfStock(product); return; }
        }

        const lu = card.querySelector('.last-updated');
        if (lu) lu.textContent = formatDate(product.lastUpdated);
      });

      card.querySelector('.delete')?.addEventListener('click', ()=>{ removeFromAll(product.id); refreshView(); });
      card.querySelector('.hide')?.addEventListener('click', ()=> {
        const idx = activeProducts.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          const obj = activeProducts.splice(idx,1)[0];
          obj.status='hidden'; obj.lastUpdated=new Date();
          hiddenProducts.push(obj);
          refreshView();
        }
      });

      card.querySelector('.unhide')?.addEventListener('click', ()=> {
        const idx = hiddenProducts.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          const obj = hiddenProducts.splice(idx,1)[0];
          obj.status='active'; obj.lastUpdated=new Date();
          activeProducts.push(obj);
          refreshView();
        }
      });

      card.querySelector('.save')?.addEventListener('click', ()=> {
        if (baseList === products) {
          const idx = products.findIndex(p => p.id === product.id);
          if (idx !== -1) {
            const obj = products.splice(idx,1)[0];
            obj.lastUpdated=new Date(); obj.status='active';
            activeProducts.push(obj);
            currentTab='active';
            document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
            document.querySelector('.tab[data-tab="active"]')?.classList.add('active');
            refreshView();
          }
        }
      });

      displayArea.appendChild(card);
    });

    if (showAdd && currentTab==='products') {
      const addCard = document.createElement('div'); 
      addCard.className='add-card';
      addCard.innerHTML = `<span>+</span><div>${t["addcard.text"]}</div>`;
      addCard.addEventListener('click', ()=>{ products.push(newProductObj()); refreshView(); });
      displayArea.appendChild(addCard);
    }
  }

  // --------------------------- VIEW ---------------------------
  function refreshView(){
    const t = translations[currentLang] || translations['en-US'];
    if (currentTab === 'products') renderList(products, { filter: searchInput.value, showAdd: true });
    else if (currentTab === 'active') renderList(activeProducts, { filter: searchInput.value });
    else if (currentTab === 'hidden') renderList(hiddenProducts, { filter: searchInput.value });
    else if (currentTab === 'outofstock') renderList(outOfStockProducts, { filter: searchInput.value });
    else if (currentTab === 'lastupdated') renderList([], { filter: searchInput.value });
    else displayArea.innerHTML = `<div style="padding:18px;color:#666">${t["nocontent"]}</div>`;
    applyTranslations();
    initSidebarArrows(); // ensure arrows re-initialized after DOM updates
  }

  // --------------------------- TABS ---------------------------
  tabs.forEach(tab=>{ 
    tab.addEventListener('click', ()=> {
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab || 'products';
      searchInput.value = '';
      refreshView();
    }); 
  });

  // --------------------------- SEARCH + VOICE ---------------------------
  searchInput.addEventListener('input', ()=> refreshView());

  if('webkitSpeechRecognition' in window || 'SpeechRecognition' in window){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous=false; recognition.interimResults=false;

    voiceBtn.addEventListener('click', ()=> {
      recognition.lang = currentLang;
      recognition.start();
      voiceBtn.classList.add('listening');
    });

    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      searchInput.value = transcript;
      refreshView();
    };

    recognition.onend = () => {
      voiceBtn.classList.remove('listening');
    };
  }

  // --------------------------- LANGUAGE ---------------------------
  function applyTranslations(){
    const t = translations[currentLang] || translations['en-US'];
    document.querySelectorAll("[data-i18n]").forEach(el=> {
      const key = el.getAttribute("data-i18n");
      if (t[key]) el.textContent = t[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{
      const key = el.getAttribute("data-i18n-placeholder");
      if (t[key]) el.setAttribute("placeholder", t[key]);
    });
  }

  if (langSelect) {
    langSelect.addEventListener('change', ()=> {
      currentLang = langSelect.value;
      localStorage.setItem("lang", currentLang);
      refreshView();
    });
  }

  // ---------------------------
  // SIDEBAR ARROWS + TOGGLE MAIN AREA
  // ---------------------------
  function initSidebarArrows(){
    try {
      const sidebarButtons = document.querySelectorAll('.sidebar button');
      if (!sidebarButtons.length) return;

      // create arrow span for each if missing (we use .side-arrow for JS-managed arrow)
      sidebarButtons.forEach(btn => {
        if (!btn.querySelector('.side-arrow')) {
          const span = document.createElement('span');
          span.className = 'side-arrow';
          span.innerHTML = '&#9650;'; // ▲ by default (closed)
          span.style.float = 'right';
          span.style.marginLeft = '8px';
          span.style.fontSize = '16px';
          btn.appendChild(span);
        }
      });

      // attach click handlers (overwrite onclick to ensure stable behavior)
      sidebarButtons.forEach(btn => {
        btn.onclick = () => {
          const isActive = btn.classList.contains('side-open');

          // close all
          sidebarButtons.forEach(b => {
            b.classList.remove('side-open');
            const sa = b.querySelector('.side-arrow');
            if (sa) sa.innerHTML = '&#9650;'; // up
          });

          // open clicked if it wasn't active
          if (!isActive) {
            btn.classList.add('side-open');
            const sa = btn.querySelector('.side-arrow');
            if (sa) sa.innerHTML = '&#9660;'; // down
          }

          // Toggle main area visibility ONLY for specific sidebar items
          // Use the data-i18n key to avoid issues with translation text differences.
          const key = btn.getAttribute('data-i18n') || '';
          const openKeys = ['sidebar.product', 'sidebar.order'];
          const wasOpening = !isActive; // if we just opened it
          if (openKeys.includes(key)) {
            // if we opened a Product or Order item -> show main; if we closed it -> hide main
            if (wasOpening) mainArea.style.display = 'flex';
            else mainArea.style.display = 'none';
          } else {
            // if a different sidebar button was opened, hide the main area (per your earlier request)
            if (wasOpening) mainArea.style.display = 'none';
            // if closed (clicked active item), hide main too
            if (!wasOpening) mainArea.style.display = 'none';
          }
        };
      });
    } catch (e) {
      console.error('Sidebar arrow init error:', e);
    }
  }

  // --------------------------- INITIALIZE ---------------------------
  // ensure main visible by default
  if (mainArea) mainArea.style.display = 'flex';
  refreshView();
  initSidebarArrows();
});


















