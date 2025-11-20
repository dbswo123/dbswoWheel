// script.js - 전체 스크립트 (룰렛 작동 중 대부분 버튼 잠금 기능 포함)

// 상태
let items = [];
let angle = 0;
let spinning = false;
let spinVel = 0;
const friction = 0.995;

// 요소
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

// 유틸
const normalize = a => {
  const twoPI = Math.PI * 2;
  a %= twoPI;
  return a < 0 ? a + twoPI : a;
};

// 연보라-연분홍 파스텔 계열 색상 함수
const colorAt = (i, n) => {
  const t = n <= 1 ? 0 : i / (n - 1);
  const hueStart = 270; // 라벤더
  const hueEnd = 330;   // 연분홍
  const hue = hueStart + (hueEnd - hueStart) * t;
  const sat = 55 + 8 * Math.sin(t * Math.PI);
  const light = 78 - 6 * Math.cos(t * Math.PI);
  return `hsl(${Math.round(hue)} ${Math.round(sat)}% ${Math.round(light)}%)`;
};

// 초기 로그인 모드
document.body.classList.add('login-mode');

// 전화번호 숫자만
if (loginPhone) {
  loginPhone.addEventListener('input', () => {
    loginPhone.value = loginPhone.value.replace(/\D/g, '');
  });
}

// 로그인 처리
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

      // trigger reflow then fade in
      rouletteScreen.offsetHeight;
      rouletteScreen.classList.add('fade-in');

      window.scrollTo({ top: 0, behavior: 'auto' });

      setTimeout(() => {
        document.body.classList.remove('login-mode');
      }, fadeDuration);

      // Optional: 전송(비동기, 실패 무시)
      try {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("phone", phone);
        fetch('https://script.google.com/macros/s/AKfycbzKeTDSq4GSEIKN33lEOnqKvd9X3zt1PvxV9CsMIJmKbEsEe8sfvAv2h4eUjPvjymzC/exec', {
          method: "POST", mode: "no-cors", body: formData
        }).catch(()=>{});
      } catch (e) {}

      localStorage.setItem('userName', name);
      localStorage.setItem('userPhone', phone);
    }, slideDuration + extraDelay);
  });
}

// 저장/불러오기
function saveItems() { localStorage.setItem('rouletteItems', JSON.stringify(items)); }
function loadItems() { const s = localStorage.getItem('rouletteItems'); if (s) items = JSON.parse(s); }

// 렌더 리스트
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

// 안전한 텍스트 이스케이프
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

// 캔버스 사이즈 보정 (고해상도 디스플레이)
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

// 룰렛 그리기
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

  // 허브
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
}

// 텍스트 줄바꿈 보조
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

// 결과 표시
function announceWinner() {
  if (items.length === 0) { resultText.textContent = ''; return; }
  const totalProb = items.reduce((s,x)=>s+x.probability,0);
  const pointerAngle = -Math.PI/2;
  const a = normalize(pointerAngle - angle);
  let acc = 0;
  for (let i=0;i<items.length;i++){
    const slice = (Math.PI*2)*(items[i].probability/totalProb);
    if (a >= acc && a < acc + slice) {
      resultText.textContent = `결과: ${items[i].item}`;
      return;
    }
    acc += slice;
  }
}

// 모든 제어 활성/비활성 관리 (초기화 버튼과 슬라이드(토글) 버튼은 예외)
function setControlsEnabled(enabled) {
  // 허용 목록: resetBtn, toggleBtn (화살표). 나머지는 비활성화
  const controls = [spinBtn, addBtn, inputItem, inputProb, shuffleBtn, clearBtn];
  controls.forEach(el => {
    if (!el) return;
    el.disabled = !enabled;
    // 시각적 포인터 제어 (disabled 이외에 필요한 경우)
    el.style.pointerEvents = enabled ? '' : 'none';
    el.setAttribute('aria-disabled', (!enabled).toString());
  });

  // 리스트 내의 수정/삭제 버튼도 제어
  const editBtns = itemList.querySelectorAll('.editBtn, .delBtn');
  editBtns.forEach(b => {
    b.disabled = !enabled;
    b.style.pointerEvents = enabled ? '' : 'none';
    b.setAttribute('aria-disabled', (!enabled).toString());
  });

  // 로그인 관련(일반적으로 비활성화)
  if (loginBtn) { loginBtn.disabled = !enabled; loginBtn.style.pointerEvents = enabled ? '' : 'none'; }
}

// 애니메이션 루프에서 스핀이 끝날 때 제어 복구
function tick() {
  if (spinning) {
    angle += spinVel;
    spinVel *= friction;
    if (spinVel < 0.002) {
      spinning = false; spinVel = 0;
      angle = normalize(angle);
      announceWinner();
      // 스핀 완료 시 모든 컨트롤 복구
      setControlsEnabled(true);
    }
  }
  drawWheel();
  requestAnimationFrame(tick);
}

// 추가
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

// 삭제/수정
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

// 섞기/전체삭제
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

// 돌리기/정지
if (spinBtn) {
  spinBtn.addEventListener('click', () => {
    if (items.length === 0) return;
    spinning = true;
    spinVel = 0.35 + Math.random() * 0.55;
    resultText.textContent = '돌리는 중...';

    // 스핀 시작 시 대부분의 컨트롤 잠금 (예외: resetBtn, toggleBtn)
    setControlsEnabled(false);
  });
}
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    // 초기화 버튼은 예외로 작동 가능
    spinning = false;
    spinVel = 0;
    resultText.textContent = '';
    // 스핀 중단시 컨트롤 복구
    setControlsEnabled(true);
  });
}

/* -------------------------------
   화살표 클릭 시 패널을 오른쪽으로 슬라이드
   - 왼쪽 화살표만 화면에 남기기: 패널 너비 - arrow-visible 만큼 이동
   - 접힘 시: 스크롤 잠금 + 스크롤바 숨김 + 룰렛/버튼 확대
----------------------------------*/

// CSS 변수(--arrow-visible) 읽기
function getArrowVisible() {
  const root = getComputedStyle(document.documentElement);
  const v = parseFloat(root.getPropertyValue('--arrow-visible').trim());
  return isNaN(v) ? 52 : v;
}

function preventDefault(e){ e.preventDefault(); }

function slideRight(collapsed) {
  if (!panelWrap || !toggleBtn) return;
  const arrowVisible = getArrowVisible();

  if (collapsed) {
    const rect = panelWrap.getBoundingClientRect();
    const translateX = Math.max(0, Math.round(rect.width - arrowVisible));

    panelWrap.style.transform = `translateX(${translateX}px)`;
    panelWrap.classList.add('collapse-down');

    panelWrap.style.pointerEvents = 'none';
    toggleBtn.style.pointerEvents = 'auto';

    document.body.classList.add('panel-is-collapsed');
    document.body.classList.add('panel-collapsed');

    window.addEventListener('wheel', preventDefault, { passive: false });
    window.addEventListener('touchmove', preventDefault, { passive: false });
  } else {
    panelWrap.style.transform = '';
    panelWrap.classList.remove('collapse-down');

    panelWrap.style.pointerEvents = '';
    toggleBtn.style.pointerEvents = '';

    document.body.classList.remove('panel-is-collapsed');
    document.body.classList.remove('panel-collapsed');

    window.removeEventListener('wheel', preventDefault, { passive: false });
    window.removeEventListener('touchmove', preventDefault, { passive: false });
  }
}

// 화살표 클릭 토글
if (toggleBtn && panelWrap) {
  toggleBtn.addEventListener('click', () => {
    const collapsed = !panelWrap.classList.contains('collapse-down');
    slideRight(collapsed);
    toggleBtn.textContent = collapsed ? '◀' : '▶';
    toggleBtn.setAttribute('aria-expanded', (!collapsed).toString());
  });

  window.addEventListener('resize', () => {
    if (panelWrap.classList.contains('collapse-down')) {
      slideRight(true);
    }
  });
}

// 초기화
function init() {
  loadItems();
  renderList();
  drawWheel();
  tick();
  // 시작 시 컨트롤 활성화 상태 보장
  setControlsEnabled(true);
}
init();
