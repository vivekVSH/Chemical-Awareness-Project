/* ChemAware Extended
   - Local list of products (chemicals or household items)
   - If we don't have 30+ local items, fetch supplemental ones from DummyJSON
     (https://dummyjson.com/products) and use them to populate images/descriptions.
   - Features: search, eco filter, sort, favorites (localStorage), compare,
     details modal, pagination.
*/

/* ---------------------------
   Configuration & constants
   --------------------------- */
const DUMMY_PRODUCTS_API = 'https://dummyjson.com/products'; // returns 30 items by default. Good for demo. :contentReference[oaicite:1]{index=1}
const ITEMS_PER_PAGE = 12;

/* ---------------------------
   Local product database (seed)
   Keep at least ~20 local entries; we'll augment to 30+ by fetching
   from DummyJSON when needed.
   Each item: { id, name, usage, effects, safety, eco (bool), hazard (1-5), source: 'local'|'api', image, description }
*/
const localProducts = [
  { id: 'p-01', name: 'Ammonia', usage: 'Glass cleaners, fertilizers', effects: 'Irritates skin, eyes, lungs on prolonged exposure', safety: 'Use gloves & ventilate', eco: false, hazard: 4, source: 'local' },
  { id: 'p-02', name: 'Bleach (Sodium Hypochlorite)', usage: 'Disinfectant, whitening', effects: 'Corrosive fumes when mixed', safety: 'Never mix with ammonia or acids', eco: false, hazard: 5, source: 'local' },
  { id: 'p-03', name: 'Vinegar (Acetic Acid)', usage: 'Cleaner, food preservative', effects: 'Mildly acidic', safety: 'Avoid eyes; safe for many tasks', eco: true, hazard: 1, source: 'local' },
  { id: 'p-04', name: 'Baking Soda (Sodium Bicarbonate)', usage: 'Deodorizer, mild abrasive', effects: 'Generally safe', safety: 'Avoid aluminum surfaces', eco: true, hazard: 1, source: 'local' },
  { id: 'p-05', name: 'Phthalates', usage: 'Plasticizer in cosmetics / perfumes', effects: 'Linked to hormonal disruption', safety: 'Choose phthalate-free', eco: false, hazard: 4, source: 'local' },
  { id: 'p-06', name: 'Parabens', usage: 'Preservatives in cosmetics', effects: 'Possible endocrine disruptor', safety: 'Use paraben-free cosmetics', eco: false, hazard: 3, source: 'local' },
  { id: 'p-07', name: 'Sodium Lauryl Sulfate (SLS)', usage: 'Detergents, shampoos', effects: 'Can irritate skin/eyes', safety: 'Rinse thoroughly, prefer SLES-free if sensitive', eco: false, hazard: 3, source: 'local' },
  { id: 'p-08', name: 'Formaldehyde', usage: 'Preservative in some products', effects: 'Carcinogenic in high exposures', safety: 'Avoid products listing it', eco: false, hazard: 5, source: 'local' },
  { id: 'p-09', name: 'Triclosan', usage: 'Antibacterial soaps', effects: 'May harm aquatic life; resistance concerns', safety: 'Prefer triclosan-free', eco: false, hazard: 4, source: 'local' },
  { id: 'p-10', name: 'Ethanol', usage: 'Sanitizers and cleaners', effects: 'Flammable, drying to skin', safety: 'Keep away from open flames; moisturize hands', eco: true, hazard: 2, source: 'local' },
  { id: 'p-11', name: 'Isopropyl Alcohol', usage: 'Disinfectant, solvent', effects: 'Irritating; flammable', safety: 'Use with ventilation', eco: true, hazard: 2, source: 'local' },
  { id: 'p-12', name: 'Sodium Hydroxide (Lye)', usage: 'Drain cleaners', effects: 'Highly corrosive', safety: 'Use PPE; follow instructions', eco: false, hazard: 5, source: 'local' },
  { id: 'p-13', name: 'Hydrogen Peroxide', usage: 'Cleaners, antiseptic', effects: 'Irritant in concentrated forms', safety: 'Use proper dilution', eco: true, hazard: 2, source: 'local' },
  { id: 'p-14', name: 'Toluene', usage: 'Paint thinners, adhesives', effects: 'Neurotoxic at high exposure', safety: 'Use respirator & ventilate', eco: false, hazard: 4, source: 'local' },
  { id: 'p-15', name: 'Acetone', usage: 'Nail polish remover, solvent', effects: 'Irritates eyes/skin; flammable', safety: 'Use in ventilated area', eco: false, hazard: 3, source: 'local' },
  { id: 'p-16', name: 'Sodium Nitrite', usage: 'Food preservative (processed meats)', effects: 'In large amounts can be harmful', safety: 'Limit processed meats', eco: false, hazard: 3, source: 'local' },
  { id: 'p-17', name: 'Carbon Monoxide', usage: 'Byproduct of incomplete combustion (not a product per se)', effects: 'Deadly at high exposure', safety: 'Install CO detector', eco: false, hazard: 5, source: 'local' },
  { id: 'p-18', name: 'Benzene', usage: 'Industrial solvent; present in some emissions', effects: 'Carcinogenic', safety: 'Avoid occupational exposure', eco: false, hazard: 5, source: 'local' },
  { id: 'p-19', name: 'Sunscreen Oxybenzone', usage: 'Some sunscreens', effects: 'Possible endocrine disruption; aquatic toxicity', safety: 'Use reef-safe sunscreens', eco: false, hazard: 3, source: 'local' },
  { id: 'p-20', name: 'Lead (trace)', usage: 'Old paints, pipes', effects: 'Neurotoxin', safety: 'Test older homes, mitigate', eco: false, hazard: 5, source: 'local' }
  // (we have 20 local entries; we'll fetch to reach 30+)
];

/* ---------------------------
   App state
   --------------------------- */
let products = []; // merged list (local + fetched)
let filtered = [];
let page = 1;
let favorites = new Set(JSON.parse(localStorage.getItem('chem_favs')||'[]'));
let compareSet = new Set();

/* ---------------------------
   DOM refs
   --------------------------- */
const productList = document.getElementById('productList');
const searchEl = document.getElementById('search');
const ecoFilterEl = document.getElementById('ecoFilter');
const sortSelect = document.getElementById('sortSelect');
const favCountEl = document.getElementById('favCount');
const showFavoritesBtn = document.getElementById('showFavoritesBtn');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalBody = document.getElementById('modalBody');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const compareTray = document.getElementById('compareTray');
const compareList = document.getElementById('compareList');
const compareBtn = document.getElementById('compareBtn');
const clearCompare = document.getElementById('clearCompare');
const doCompare = document.getElementById('doCompare');

/* ---------------------------
   Utility helpers
   --------------------------- */
const uid = (p) => `${p.source}-${p.id}`;
function saveFavs(){ localStorage.setItem('chem_favs', JSON.stringify([...favorites])); favCountEl.textContent = favorites.size; }
function clamp(n, a,b){return Math.max(a,Math.min(b,n));}

/* ---------------------------
   Fetch supplemental products from DummyJSON (if local < 30)
   We'll map DummyJSON fields to our product model.
   --------------------------- */
async function fetchSupplemental(){
  try{
    const res = await fetch(DUMMY_PRODUCTS_API);
    if(!res.ok) throw new Error('Failed fetch');
    const json = await res.json();
    const apiProducts = json.products || [];
    // map each to our model; give IDs prefixed to avoid collisions
    const mapped = apiProducts.map((p, idx) => ({
      id: `api-${p.id}`,
      name: p.title,
      usage: p.category || p.brand || 'Various household uses',
      effects: p.description || 'See product label for safety details',
      safety: 'Follow label instructions. Keep away from children.',
      eco: Math.random() > 0.6, // random-ish demo flag
      hazard: Math.floor(Math.random()*5)+1,
      source: 'api',
      image: (p.images && p.images[0]) || '',
      description: p.description || ''
    }));
    return mapped;
  }catch(e){
    console.warn('API fetch failed',e);
    return [];
  }
}

/* ---------------------------
   Initialize app: merge local products + fetched until >=30
   --------------------------- */
async function init(){
  // attach listeners
  searchEl.addEventListener('input', onControlsChange);
  ecoFilterEl.addEventListener('change', onControlsChange);
  sortSelect.addEventListener('change', onControlsChange);
  prevPage.addEventListener('click', ()=>{ page = Math.max(1,page-1); render(); });
  nextPage.addEventListener('click', ()=>{ page++; render(); });
  showFavoritesBtn.addEventListener('click', showFavorites);
  modalClose.addEventListener('click', ()=> modal.style.display='none');
  window.addEventListener('click', (e)=> { if(e.target===modal) modal.style.display='none'; });
  compareBtn.addEventListener('click', ()=> { compareTray.classList.toggle('hidden'); renderCompareTray(); });
  clearCompare.addEventListener('click', ()=>{ compareSet.clear(); renderCompareTray(); render(); });
  doCompare.addEventListener('click', showComparison);

  // start with local
  products = localProducts.map(p => ({...p}));
  // ensure each has uid-compatible id & maybe placeholder image
  products.forEach(p=>{
    if(!p.image) p.image = `https://picsum.photos/seed/${encodeURIComponent(p.name)}/400/300`;
    if(!p.description) p.description = p.usage + ' — ' + (p.effects || '');
  });

  // if we have less than 30, fetch supplemental products
  if(products.length < 30){
    const fetched = await fetchSupplemental();
    // only take as many as needed to push to 32 items
    const need = Math.max(0, 32 - products.length);
    const toAdd = fetched.slice(0, need);
    // ensure images exist
    toAdd.forEach(p=>{ if(!p.image) p.image=`https://picsum.photos/seed/api-${p.id}/400/300`; });
    products = products.concat(toAdd);
  }

  // add unique uid and normalize
  products = products.map((p, i)=>({ ...p, uid: uid(p) }));

  // initial render
  saveFavs();
  render();
}

/* ---------------------------
   Render functions
   --------------------------- */
function onControlsChange(){ page = 1; render(); }

function applyFilters(){
  const q = (searchEl.value || '').trim().toLowerCase();
  const ecoOnly = ecoFilterEl.checked;

  filtered = products.filter(p=>{
    if(ecoOnly && !p.eco) return false;
    if(!q) return true;
    return (p.name && p.name.toLowerCase().includes(q)) ||
           (p.description && p.description.toLowerCase().includes(q)) ||
           (p.usage && p.usage.toLowerCase().includes(q));
  });

  // sorting
  const sort = sortSelect.value;
  if(sort === 'name') filtered.sort((a,b)=> a.name.localeCompare(b.name));
  else if(sort === 'hazard') filtered.sort((a,b)=> (b.hazard||0) - (a.hazard||0));
  else if(sort === 'source') filtered.sort((a,b)=> a.source.localeCompare(b.source));
}

function render(){
  applyFilters();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  page = clamp(page, 1, totalPages);

  const start = (page-1)*ITEMS_PER_PAGE;
  const visible = filtered.slice(start, start + ITEMS_PER_PAGE);

  productList.innerHTML = '';

  visible.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="top">
        <div class="thumb"><img src="${p.image}" alt="${p.name}" loading="lazy" /></div>
        <div style="flex:1">
          <div class="title">${p.name}</div>
          <div class="meta">${p.usage} • ${p.source === 'local' ? 'Local DB' : 'DummyAPI'}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <div class="badge">${p.eco ? 'Eco' : 'Use with caution'}</div>
          <div style="font-size:12px;color:var(--muted)">Hazard: ${p.hazard || 'N/A'}</div>
        </div>
      </div>
      <div class="desc">${escapeHtml(p.description || p.effects || '')}</div>
      <div class="actions">
        <button class="ghost" data-action="details" data-uid="${p.uid}">Details</button>
        <button class="primary" data-action="fav" data-uid="${p.uid}">
          ${favorites.has(p.uid) ? '★ Favorited' : '☆ Favorite'}
        </button>
      </div>
    `;
    productList.appendChild(card);
  });

  // page info
  pageInfo.textContent = `Page ${page} / ${Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))}`;
  // prev/next enable
  prevPage.disabled = page <= 1;
  nextPage.disabled = (page * ITEMS_PER_PAGE) >= filtered.length;

  // wire actions
  productList.querySelectorAll('button').forEach(btn=>{
    const action = btn.dataset.action;
    const uid = btn.dataset.uid;
    if(action === 'details'){
      btn.addEventListener('click', ()=> showDetails(uid));
    } else if(action === 'fav'){
      btn.addEventListener('click', ()=> toggleFav(uid));
    }
  });

  renderCompareTray();
}

/* ---------------------------
   Details modal
   --------------------------- */
function showDetails(uid){
  const p = products.find(x=>x.uid===uid);
  if(!p) return;
  modalBody.innerHTML = `
    <div class="modal-thumb"><img src="${p.image}" alt="${escapeHtml(p.name)}" /></div>
    <div class="modal-info">
      <h2>${escapeHtml(p.name)}</h2>
      <p><strong>Usage:</strong> ${escapeHtml(p.usage)}</p>
      <p><strong>Hazard level:</strong> ${p.hazard || 'N/A'} / 5</p>
      <p style="margin-top:8px"><strong>Effects & concerns:</strong><br/> ${escapeHtml(p.effects || p.description || 'Not specified')}</p>
      <p style="margin-top:8px"><strong>Safety tips:</strong><br/> ${escapeHtml(p.safety)}</p>
      <p style="margin-top:8px"><strong>Eco:</strong> ${p.eco ? 'Yes — more environmentally friendly' : 'No — use with caution'}</p>
      <p style="margin-top:8px;color:var(--muted)"><small>Source: ${p.source}</small></p>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button id="favModalBtn" class="ghost">${favorites.has(uid) ? '★ Favorited' : '☆ Favorite'}</button>
        <button id="compareToggle" class="primary">${compareSet.has(uid) ? 'Remove from compare' : 'Add to compare'}</button>
      </div>
    </div>
  `;
  document.getElementById('favModalBtn').addEventListener('click', ()=> toggleFav(uid));
  document.getElementById('compareToggle').addEventListener('click', ()=> {
    if(compareSet.has(uid)) compareSet.delete(uid); else {
      if(compareSet.size>=2){ alert('You can compare up to 2 items only'); return;}
      compareSet.add(uid);
    }
    renderCompareTray(); render();
    // keep modal open
  });

  modal.style.display = 'flex';
}

/* ---------------------------
   Favorites
   --------------------------- */
function toggleFav(uid){
  if(favorites.has(uid)) favorites.delete(uid); else favorites.add(uid);
  saveFavs();
  render();
}
function showFavorites(){
  // quick filter for favorites
  const favList = products.filter(p=>favorites.has(p.uid));
  if(favList.length===0){ alert('No favorites yet — click ☆ on any card to favorite'); return; }
  // render modal with favorites listing
  modalBody.innerHTML = favList.map(p=>`
    <div style="display:flex;gap:12px;align-items:center;padding:8px;border-bottom:1px solid #f3f4f6">
      <div style="width:64px;height:64px;overflow:hidden;border-radius:8px"><img style="width:100%;height:100%;object-fit:cover" src="${p.image}" /></div>
      <div style="flex:1">
        <div style="font-weight:700">${escapeHtml(p.name)}</div>
        <div style="color:var(--muted);font-size:13px">${escapeHtml(p.usage)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="ghost" data-uid="${p.uid}" data-action="details">Details</button>
        <button class="ghost" data-uid="${p.uid}" data-action="unfav">Remove</button>
      </div>
    </div>
  `).join('');
  // wire buttons inside modal
  modal.style.display='flex';
  modal.querySelectorAll('button[data-action]').forEach(b=>{
    b.addEventListener('click', e=>{
      const uid = e.currentTarget.dataset.uid;
      if(e.currentTarget.dataset.action==='details') { modal.style.display='none'; showDetails(uid); }
      else if(e.currentTarget.dataset.action==='unfav') { favorites.delete(uid); saveFavs(); showFavorites(); render(); }
    });
  });
}

/* ---------------------------
   Compare tray
   --------------------------- */
function renderCompareTray(){
  favCountEl.textContent = favorites.size;
  compareList.innerHTML = '';
  const sel = [...compareSet].map(uid => products.find(p=>p.uid===uid)).filter(Boolean);
  if(sel.length===0){
    compareList.innerHTML = '<div style="color:var(--muted)">No items selected</div>';
    return;
  }
  sel.forEach(p=>{
    const div = document.createElement('div');
    div.className='compare-item';
    div.innerHTML = `<div style="width:48px;height:48px;overflow:hidden;border-radius:8px"><img src="${p.image}" style="width:100%;height:100%;object-fit:cover"></div><div style="flex:1">${escapeHtml(p.name)}</div><div><button class="ghost" data-uid="${p.uid}">Remove</button></div>`;
    compareList.appendChild(div);
    div.querySelector('button').addEventListener('click', ()=>{ compareSet.delete(p.uid); renderCompareTray(); render(); });
  });
}

/* ---------------------------
   Show comparison modal (side-by-side)
   --------------------------- */
function showComparison(){
  const sel = [...compareSet].map(uid => products.find(p=>p.uid===uid)).filter(Boolean);
  if(sel.length < 2){ alert('Select two items to compare'); return; }
  const [a,b] = sel;
  modalBody.innerHTML = `
    <div style="display:flex;gap:18px;flex-wrap:wrap">
      <div style="flex:1;min-width:240px">
        <div style="font-weight:700">${escapeHtml(a.name)}</div>
        <img style="width:100%;height:180px;object-fit:cover;border-radius:8px;margin:8px 0" src="${a.image}" />
        <p><strong>Usage:</strong> ${escapeHtml(a.usage)}</p>
        <p><strong>Hazard:</strong> ${a.hazard || 'N/A'}</p>
        <p><strong>Eco:</strong> ${a.eco ? 'Yes' : 'No'}</p>
      </div>
      <div style="flex:1;min-width:240px">
        <div style="font-weight:700">${escapeHtml(b.name)}</div>
        <img style="width:100%;height:180px;object-fit:cover;border-radius:8px;margin:8px 0" src="${b.image}" />
        <p><strong>Usage:</strong> ${escapeHtml(b.usage)}</p>
        <p><strong>Hazard:</strong> ${b.hazard || 'N/A'}</p>
        <p><strong>Eco:</strong> ${b.eco ? 'Yes' : 'No'}</p>
      </div>
    </div>
  `;
  modal.style.display='flex';
}

/* ---------------------------
   Helpers
   --------------------------- */
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------------------------
   Init app
   --------------------------- */
init();
