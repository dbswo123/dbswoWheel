let items = [];
let angle = 0;
let spinning = false;
let spinVel = 0;
const friction = 0.995;

const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const resetBtn = document.getElementById('resetBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const clearBtn = document.getElementById('clearBtn');
const inputItem = document.getElementById('inputItem');
const inputProb = document.getElementById('inputProb');
const addBtn = document.getElementById('addBtn');
const itemList = document.getElementById('itemList');
const countText = document.getElementById('countText');
const resultText = document.getElementById('resultText');

const loginScreen = document.getElementById('loginScreen');
const rouletteScreen = document.getElementById('rouletteScreen');
const loginName = document.getElementById('loginName');
const loginPhone = document.getElementById('loginPhone');
const loginBtn = document.getElementById('loginBtn');

const panelWrap = document.getElementById('panelWrap');
const toggleBtn = document.getElementById('togglePanel');

const normalize = a => {
  const twoPI = Math.PI * 2;
  a %= twoPI;
  return a < 0 ? a + twoPI : a;
};

const colorAt = (i, n) => {
  const t = n <= 1 ? 0 : i / (n - 1);
  const hueStart = 270;
  const hueEnd = 330;
  const hue = hueStart + (hueEnd - hueStart) * t;
  const sat = 55 + 8 * Math.sin(t * Math.PI);
  const light = 78 - 6 * Math.cos(t * Math.PI);
  return `hsl(${Math.round(hue)} ${Math.round(sat)}% ${Math.round(light)}%)`;
};

document.body.classList.add('login-mode');

if (loginPhone) {
  loginPhone.addEventListener('input', () => {
    loginPhone.value = loginPhone.value.replace(/\D/g, '');
  });
}

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    const name = loginName.value.trim();
    const phone = loginPhone.value.replace(/\D/g, '');
    if (!name || !phone) { alert('이름과 전화번호를 모두 입력하세요.'); return; }

    loginScreen.classList.add('login-slide-out');

    const slideDuration = 600;
    const extraDelay = 500;
    const fadeDuration = 600;

    setTimeout(() => {
      loginScreen.classList.add('hidden');
      rouletteScreen.classList.remove('hidden');
      rouletteScreen.offsetHeight;
      rouletteScreen.classList.add('fade-in');

      window.scrollTo({ top: 0, behavior: 'auto' });

      setTimeout(() => {
        document.body.classList.remove('login-mode');
      }, fadeDuration);
      try {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("phone", "`" + phone);
        fetch('https://script.google.com/macros/s/AKfycbzKeTDSq4GSEIKN33lEOnqKvd9X3zt1PvxV9CsMIJmKbEsEe8sfvAv2h4eUjPvjymzC/exec', {
          method: "POST", mode: "no-cors", body: formData
        }).catch(()=>{});
      } catch (e) {}

      localStorage.setItem('userName', name);
      localStorage.setItem('userPhone', phone);
    }, slideDuration + extraDelay);
  });
}

function saveItems() { localStorage.setItem('rouletteItems', JSON.stringify(items)); }
function loadItems() { const s = localStorage.getItem('rouletteItems'); if (s) items = JSON.parse(s); }

function renderList() {
  itemList.innerHTML = '';
  items.forEach((p, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(p.item)}</strong>
        <span class="badge">· ${p.probability}%</span>
      </div>
      <button data-i="${i}" class="editBtn">수정</button>
      <button data-i="${i}" class="delBtn">삭제</button>
    `;
    itemList.appendChild(li);
  });
  countText.textContent = items.length;
  saveItems();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
window.addEventListener('resize', () => {
  if (canvas) {
    resizeCanvas();
    drawWheel();
  }
});

function drawWheel() {
  if (!canvas) return;
  resizeCanvas();
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  const cx = w / 2, cy = h / 2;
  const r = Math.min(cx, cy) - 10;
  ctx.clearRect(0, 0, w, h);

  if (items.length === 0) {
    ctx.fillStyle = '#222a36';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9aa3b2';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('상품을 추가하세요', cx, cy);
    return;
  }

  const totalProb = items.reduce((sum, x) => sum + x.probability, 0);
  let start = angle;

  for (let i = 0; i < items.length; i++) {
    const slice = (Math.PI * 2) * (items[i].probability / totalProb);
    const end = start + slice;

    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end); ctx.closePath();
    ctx.fillStyle = colorAt(i, items.length); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1.5; ctx.stroke();

    const mid = start + slice / 2;
    const tx = cx + Math.cos(mid) * (r * 0.62);
    const ty = cy + Math.sin(mid) * (r * 0.62);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(12, Math.round(r / 10))}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    wrapText(ctx, items[i].item, 0, 0, r * 0.45, Math.round(r / 8));
    ctx.restore();

    start = end;
  }
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line + (line ? ' ' : '') + words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      lines.push(line);
      line = words[n];
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  const totalH = lines.length * lineHeight;
  const startY = y - totalH / 2 + lineHeight / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}

function announceWinner() {
  if (items.length === 0) { 
    resultText.textContent = ''; 
    return; 
  }
  const totalProb = items.reduce((s,x)=>s+x.probability,0);
  const pointerAngle = -Math.PI/2;
  const a = normalize(pointerAngle - angle);
  let acc = 0;
  for (let i=0;i<items.length;i++){
    const slice = (Math.PI*2)*(items[i].probability/totalProb);
    if (a >= acc && a < acc + slice) {
      resultText.textContent = `결과: ${items[i].item}`;
      try {
        const audio = new Audio('Sound/Soundeffect.mp3');
        audio.play().catch(err => console.warn('사운드 재생 실패:', err));
      } catch(e) {
        console.warn('오디오 객체 생성 실패:', e);
      }

      return;
    }
    acc += slice;
  }
}

function setControlsEnabled(enabled) {
  const controls = [spinBtn, addBtn, inputItem, inputProb, shuffleBtn, clearBtn];
  controls.forEach(el => {
    if (!el) return;
    el.disabled = !enabled;
    el.style.pointerEvents = enabled ? '' : 'none';
    el.setAttribute('aria-disabled', (!enabled).toString());
  });
  const editBtns = itemList.querySelectorAll('.editBtn, .delBtn');
  editBtns.forEach(b => {
    b.disabled = !enabled;
    b.style.pointerEvents = enabled ? '' : 'none';
    b.setAttribute('aria-disabled', (!enabled).toString());
  });
  if (loginBtn) { loginBtn.disabled = !enabled; loginBtn.style.pointerEvents = enabled ? '' : 'none'; }
}

function tick() {
  if (spinning) {
    angle += spinVel;
    spinVel *= friction;
    if (spinVel < 0.002) {
      spinning = false; spinVel = 0;
      angle = normalize(angle);
      announceWinner();
      setControlsEnabled(true);
    }
  }
  drawWheel();
  requestAnimationFrame(tick);
}

if (addBtn) {
  addBtn.addEventListener('click', () => {
    const item = inputItem.value.trim();
    const prob = parseInt(inputProb.value, 10);
    if (!item || !prob || prob <= 0) { alert('상품명과 확률을 올바르게 입력하세요.'); return; }
    if (items.some(x => x.item === item)) { alert('중복되는 내용이 있습니다.'); return; }
    items.push({ item, probability: prob });
    inputItem.value = ''; inputProb.value = '';
    renderList(); drawWheel();
  });
}

if (itemList) {
  itemList.addEventListener('click', (e) => {
    const i = e.target.dataset.i;
    if (i === undefined) return;
    if (e.target.classList.contains('delBtn')) {
      items.splice(Number(i), 1);
      renderList(); drawWheel();
    } else if (e.target.classList.contains('editBtn')) {
      const p = items[Number(i)];
      const newItem = prompt('상품명 수정', p.item); if (newItem === null) return;
      const newProb = parseInt(prompt('확률 수정 (%)', p.probability), 10);
      if (!newItem || !newProb || newProb <= 0) return;
      const dup = items.some((x, idx) => idx !== Number(i) && x.item === newItem);
      if (dup) { alert('중복되는 내용이 있습니다.'); return; }
      items[Number(i)] = { item: newItem, probability: newProb };
      renderList(); drawWheel();
    }
  });
}

if (shuffleBtn) {
  shuffleBtn.addEventListener('click', () => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    renderList(); drawWheel();
  });
}
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (!confirm('전체 삭제하시겠습니까?')) return;
    items = [];
    renderList(); drawWheel();
  });
}

if (spinBtn) {
  spinBtn.addEventListener('click', () => {
    if (items.length === 0) return;
    spinning = true;
    spinVel = 0.35 + Math.random() * 0.55;
    resultText.textContent = '돌리는 중...';
    setControlsEnabled(false);
  });
}
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    spinning = false;
    spinVel = 0;
    resultText.textContent = '';
    setControlsEnabled(true);
  });
}

function getArrowVisible() {
  const root = getComputedStyle(document.documentElement);
  const v = parseFloat(root.getPropertyValue('--arrow-visible').trim());
  return isNaN(v) ? 52 : v;
}

function preventDefault(e){ e.preventDefault(); }

function slideDown(collapsed) {
  if (!panelWrap || !toggleBtn) return;

  if (collapsed) {
    const rect = panelWrap.getBoundingClientRect();
    const translateY = Math.max(0, Math.round(rect.height - 40));

    panelWrap.style.transform = `translateY(${translateY}px)`;
    panelWrap.classList.add('collapse-down');

    panelWrap.style.pointerEvents = 'none';
    toggleBtn.style.pointerEvents = 'auto';

    document.body.classList.add('panel-is-collapsed');
    document.body.classList.add('panel-collapsed');
  } else {
    panelWrap.style.transform = '';
    panelWrap.classList.remove('collapse-down');

    panelWrap.style.pointerEvents = '';
    toggleBtn.style.pointerEvents = '';

    document.body.classList.remove('panel-is-collapsed');
    document.body.classList.remove('panel-collapsed');
  }
}

if (toggleBtn && panelWrap) {
  toggleBtn.addEventListener('click', () => {
  const collapsed = !panelWrap.classList.contains('collapse-down');
  slideDown(collapsed);
  toggleBtn.textContent = collapsed ? '▲' : '▼';
});

  window.addEventListener('resize', () => {
    if (panelWrap.classList.contains('collapse-down')) {
      slideRight(true);
    }
  });
}

loadItems();
renderList();
drawWheel();
tick();
setControlsEnabled(true);

