// 상태: 상품 객체 { item, probability }
let items = [];

// 룰렛 회전 상태
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
const colorAt = (i, n) => `hsl(${Math.round((360/n)*i)} 70% 50%)`;

// LocalStorage 저장/불러오기
function saveItems(){
  localStorage.setItem("rouletteItems", JSON.stringify(items));
}
function loadItems(){
  const saved = localStorage.getItem("rouletteItems");
  if(saved){ items = JSON.parse(saved); }
}

// 리스트 렌더링
function renderList(){
  itemList.innerHTML = "";
  items.forEach((p,i)=>{
    const li = document.createElement("li");
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
function drawWheel(){
  const w = canvas.width, h = canvas.height;
  const cx = w/2, cy = h/2;
  const r = Math.min(cx, cy) - 10;
  ctx.clearRect(0,0,w,h);

  if(items.length===0){
    ctx.fillStyle='#222a36';
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#9aa3b2';
    ctx.font='bold 28px system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('상품을 추가하세요',cx,cy);
    return;
  }

  const totalProb = items.reduce((sum,x)=>sum+x.probability,0);
  let start = angle;

  for(let i=0;i<items.length;i++){
    const slice = (Math.PI*2) * (items[i].probability/totalProb);
    const end = start + slice;

    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,start,end); ctx.closePath();
    ctx.fillStyle=colorAt(i,items.length); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=2; ctx.stroke();

    const mid=start+slice/2;
    const tx=cx+Math.cos(mid)*(r*0.65);
    const ty=cy+Math.sin(mid)*(r*0.65);
    ctx.save(); ctx.translate(tx,ty); ctx.rotate(mid+Math.PI/2);
    ctx.fillStyle='#fff'; ctx.font='600 20px system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(items[i].item,0,0);
    ctx.restore();

    start=end;
  }

  ctx.beginPath(); ctx.arc(cx,cy,r*0.08,0,Math.PI*2);
  ctx.fillStyle='#e6eefc'; ctx.fill();
}

// 승자 계산
function announceWinner(){
  if(items.length===0){ resultText.textContent=''; return; }
  const totalProb = items.reduce((sum,x)=>sum+x.probability,0);
  const pointerAngle=-Math.PI/2;
  const a=normalize(pointerAngle-angle);

  let acc=0;
  for(let i=0;i<items.length;i++){
    const slice=(Math.PI*2)*(items[i].probability/totalProb);
    if(a>=acc && a<acc+slice){
      resultText.textContent=`결과: ${items[i].item}`;
      return;
    }
    acc+=slice;
  }
}

// 애니메이션 루프
function tick(){
  if(spinning){
    angle+=spinVel;
    spinVel*=friction;
    if(spinVel<0.002){
      spinning=false; spinVel=0;
      angle=normalize(angle);
      announceWinner();
    }
  }
  drawWheel();
  requestAnimationFrame(tick);
}

// 이벤트: 추가
addBtn.addEventListener('click',()=>{
  const item=inputItem.value.trim();
  const prob=parseInt(inputProb.value,10);
  if(!item||!prob||prob<=0){
    alert('상품명과 확률을 올바르게 입력하세요.');
    return;
  }
  if(items.some(x=>x.item===item)){
    alert('중복되는 내용이 있습니다.');
    return;
  }
  items.push({item,probability:prob});
  inputItem.value=''; inputProb.value='';
  renderList(); drawWheel();
});

// 이벤트: 대량 적용
bulkApplyBtn.addEventListener('click',()=>{
  const lines=bulkInput.value.split('\n');
  let added=0, skipped=0;
  for(const line of lines){
    const s=line.trim(); if(!s) continue;
    const [itemRaw,probRaw]=s.split(',').map(x=>(x||'').trim());
    const item=itemRaw; const prob=parseInt(probRaw,10);
    if(!item||!prob||prob<=0){ skipped++; continue; }
    if(items.some(x=>x.item===item)){ skipped++; continue; }
    items.push({item,probability:prob}); added++;
  }
  if(skipped>0){
    alert('중복되는 내용이 있습니다.');
  }
  bulkResult.textContent=`추가 ${added}개, 건너뜀 ${skipped}개`;
  bulkInput.value='';
  renderList(); drawWheel();
});

// 삭제/수정 버튼
itemList.addEventListener('click',(e)=>{
  const i=e.target.dataset.i;
  if(i===undefined) return;
  if(e.target.classList.contains('delBtn')){
    items.splice(Number(i),1);
    renderList(); drawWheel();
  } else if(e.target.classList.contains('editBtn')){
    const p=items[Number(i)];
    const item=prompt('상품명 수정',p.item);
    if(item===null) return;
    const prob=parseInt(prompt('확률 수정 (%)',p.probability),10);
    if(!item||!prob||prob<=0) return;
    const dup=items.some((x,idx)=>idx!==Number(i)&&x.item===item);
    if(dup){
      alert('중복되는 내용이 있습니다.');
      return;
    }
    items[Number(i)]={item,probability:prob};
    renderList(); drawWheel();
  }
});

// 기타 이벤트
shuffleBtn.addEventListener('click',()=>{
  for(let i=items.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [items[i],items[j]]=[items[j],items[i]];
  }
  renderList(); drawWheel();
});
clearBtn.addEventListener('click',()=>{
  if(!confirm('전체 삭제하시겠습니까?')) return;
  items=[]; renderList(); drawWheel();
});
spinBtn.addEventListener('click',()=>{
  if(items.length===0) return;
  spinning=true;
  spinVel=0.35+Math.random()*0.55;
  resultText.textContent='돌리는 중...';
});
resetBtn.addEventListener('click',()=>{
  spinning=false; spinVel=0;
  resultText.textContent='';
});

loginPhone.addEventListener('input', () => {
  loginPhone.value = loginPhone.value.replace(/\D/g, '');
});

// 로그인 이벤트
loginBtn.addEventListener('click', () => {
  const name = loginName.value.trim();
  const phone = loginPhone.value.replace(/\D/g,''); // 숫자만
  if(!name || !phone){
    alert('이름과 전화번호를 모두 입력하세요.');
    return;
  }
  // 로그인 성공 → 화면 전환
  loginScreen.style.display = 'none';
  rouletteScreen.style.display = 'grid';

  // 로그인 정보 저장(선택)
  localStorage.setItem('userName', name);
  localStorage.setItem('userPhone', phone);
});


// 초기화
loadItems();
renderList();
drawWheel();
tick();
