// 상품 목록 상태
let items = [];

// 룰렛 회전 상태
let angle = 0;
let spinning = false;
let spinVel = 0;
const friction = 0.995;

// 요소 참조
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const resetBtn = document.getElementById('resetBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const clearBtn = document.getElementById('clearBtn');

const inputItem = document.getElementById('inputItem');
const inputProb = document.getElementById('inputProb');
const addBtn = document.getElementById('addBtn');

const bulkInput = document.getElementById('bulkInput');
const bulkApplyBtn = document.getElementById('bulkApplyBtn');
const bulkResult = document.getElementById('bulkResult');

const itemList = document.getElementById('itemList');
const countText = document.getElementById('countText');
const resultText = document.getElementById('resultText');

// 로그인 요소
const loginScreen = document.getElementById('loginScreen');
const rouletteScreen = document.getElementById('rouletteScreen');
const loginName = document.getElementById('loginName');
const loginPhone = document.getElementById('loginPhone');
const loginBtn = document.getElementById('loginBtn');

// 유틸
const normalize = a => {
  const twoPI = Math.PI * 2;
  a %= twoPI;
  return a < 0 ? a + twoPI : a;
};
const colorAt = (i, n) => `hsl(${Math.round((360 / n) * i)} 70% 50%)`;

// 페이지 로드 시 로그인 모드로 스크롤 잠금
document.body.classList.add('login-mode');

// 전화번호 숫자만 입력
loginPhone.addEventListener('input', () => {
  loginPhone.value = loginPhone.value.replace(/\D/g, '');
});

// 로그인 처리 + 화면 전환 애니메이션 + 딜레이 페이드인
loginBtn.addEventListener('click', () => {
  const name = loginName.value.trim();
  const phone = loginPhone.value.replace(/\D/g, '');

  if (!name || !phone) {
    alert('이름과 전화번호를 모두 입력하세요.');
    return;
  }

  // ---- 기존 애니메이션 처리 코드 그대로 유지 ----
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



    // ⭐⭐⭐ 구글 스프레드시트 전송 부분 추가 ⭐⭐⭐
    fetch("https://script.google.com/macros/s/AKfycbwdjHi8XeC9ShgozpBzNYDgYcKS-XepoXkapZSCJXwbiBB6jAZoN5nz1jhlOyS0kNPk/exec", {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone })
    });

    // localStorage 저장
    localStorage.setItem('userName', name);
    localStorage.setItem('userPhone', phone);

  }, slideDuration + extraDelay);
});


// 저장/불러오기
function saveItems() {
  localStorage.setItem('rouletteItems', JSON.stringify(items));
}
function loadItems() {
  const saved = localStorage.getItem('rouletteItems');
  if (saved) items = JSON.parse(saved);
}

// 리스트 렌더링
function renderList() {
  itemList.innerHTML = '';
  items.forEach((p, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${p.item}</strong>
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

// 룰렛 그리기
function drawWheel() {
  const w = canvas.width, h = canvas.height;
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
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();

    const mid = start + slice / 2;
    const tx = cx + Math.cos(mid) * (r * 0.65);
    const ty = cy + Math.sin(mid) * (r * 0.65);
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(mid + Math.PI / 2);
    ctx.fillStyle = '#fff'; ctx.font = '600 20px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(items[i].item, 0, 0);
    ctx.restore();

    start = end;
  }

  // 허브
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = '#e6eefc'; ctx.fill();
}

// 결과 표시
function announceWinner() {
  if (items.length === 0) {
    resultText.textContent = '';
    return;
  }
  const totalProb = items.reduce((sum, x) => sum + x.probability, 0);
  const pointerAngle = -Math.PI / 2; // 상단 포인터
  const a = normalize(pointerAngle - angle);

  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    const slice = (Math.PI * 2) * (items[i].probability / totalProb);
    if (a >= acc && a < acc + slice) {
      resultText.textContent = `결과: ${items[i].item}`;
      return;
    }
    acc += slice;
  }
}

// 애니메이션 루프
function tick() {
  if (spinning) {
    angle += spinVel;
    spinVel *= friction;
    if (spinVel < 0.002) {
      spinning = false; spinVel = 0;
      angle = normalize(angle);
      announceWinner();
    }
  }
  drawWheel();
  requestAnimationFrame(tick);
}

// 개별 추가
addBtn.addEventListener('click', () => {
  const item = inputItem.value.trim();
  const prob = parseInt(inputProb.value, 10);
  if (!item || !prob || prob <= 0) {
    alert('상품명과 확률을 올바르게 입력하세요.');
    return;
  }
  if (items.some(x => x.item === item)) {
    alert('중복되는 내용이 있습니다.');
    return;
  }
  items.push({ item, probability: prob });
  inputItem.value = ''; inputProb.value = '';
  renderList(); drawWheel();
});

// 대량 입력
bulkApplyBtn.addEventListener('click', () => {
  const lines = bulkInput.value.split('\n');
  let added = 0, skipped = 0;
  for (const line of lines) {
    const s = line.trim(); if (!s) continue;
    const [itemRaw, probRaw] = s.split(',').map(x => (x || '').trim());
    const item = itemRaw; const prob = parseInt(probRaw, 10);
    if (!item || !prob || prob <= 0) { skipped++; continue; }
    if (items.some(x => x.item === item)) { skipped++; continue; }
    items.push({ item, probability: prob }); added++;
  }
  if (skipped > 0) alert('중복되는 내용이 있습니다.');
  bulkResult.textContent = `추가 ${added}개, 건너뜀 ${skipped}개`;
  bulkInput.value = '';
  renderList(); drawWheel();
});

// 삭제/수정
itemList.addEventListener('click', (e) => {
  const i = e.target.dataset.i;
  if (i === undefined) return;
  if (e.target.classList.contains('delBtn')) {
    items.splice(Number(i), 1);
    renderList(); drawWheel();
  } else if (e.target.classList.contains('editBtn')) {
    const p = items[Number(i)];
    const item = prompt('상품명 수정', p.item);
    if (item === null) return;
    const prob = parseInt(prompt('확률 수정 (%)', p.probability), 10);
    if (!item || !prob || prob <= 0) return;
    const dup = items.some((x, idx) => idx !== Number(i) && x.item === item);
    if (dup) {
      alert('중복되는 내용이 있습니다.');
      return;
    }
    items[Number(i)] = { item, probability: prob };
    renderList(); drawWheel();
  }
});

// 기타 이벤트
shuffleBtn.addEventListener('click', () => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  renderList(); drawWheel();
});

clearBtn.addEventListener('click', () => {
  if (!confirm('전체 삭제하시겠습니까?')) return;
  items = [];
  renderList(); drawWheel();
});

spinBtn.addEventListener('click', () => {
  if (items.length === 0) return;
  spinning = true;
  spinVel = 0.35 + Math.random() * 0.55;
  resultText.textContent = '돌리는 중...';
});

resetBtn.addEventListener('click', () => {
  spinning = false;
  spinVel = 0;
  resultText.textContent = '';
});

// 초기화
loadItems();
renderList();
drawWheel();
tick();
