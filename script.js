// 상태: 참가자 객체 { name, phone }
let participants = [];

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

const inputName = document.getElementById('inputName');
const inputPhone = document.getElementById('inputPhone');
const addBtn = document.getElementById('addBtn');

const bulkInput = document.getElementById('bulkInput');
const bulkApplyBtn = document.getElementById('bulkApplyBtn');
const bulkResult = document.getElementById('bulkResult');

const participantList = document.getElementById('participantList');
const countText = document.getElementById('countText');
const resultText = document.getElementById('resultText');

// 유틸
const normalize = a => {
  const twoPI = Math.PI * 2;
  a %= twoPI;
  return a < 0 ? a + twoPI : a;
};
const colorAt = (i, n) => `hsl(${Math.round((360/n)*i)} 70% 50%)`;
function normalizePhone(p){ return (p||"").replace(/\D+/g,""); }
function existsByPhone(p){
  const np = normalizePhone(p);
  return participants.some(x => normalizePhone(x.phone) === np);
}
function existsByName(n){
  const nn = (n||"").trim();
  return participants.some(x => x.name === nn);
}

// LocalStorage 저장/불러오기
function saveParticipants(){
  localStorage.setItem("rouletteParticipants", JSON.stringify(participants));
}
function loadParticipants(){
  const saved = localStorage.getItem("rouletteParticipants");
  if(saved){ participants = JSON.parse(saved); }
}

// 리스트 렌더링
function renderList(){
  participantList.innerHTML = "";
  participants.forEach((p,i)=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${p.name}</strong>
        <span class="badge">· ${p.phone}</span>
      </div>
      <button data-i="${i}" class="editBtn">수정</button>
      <button data-i="${i}" class="delBtn">삭제</button>
    `;
    participantList.appendChild(li);
  });
  countText.textContent = participants.length;
  saveParticipants(); // 렌더링할 때마다 저장
}

// 룰렛 그리기
function drawWheel(){
  const w = canvas.width, h = canvas.height;
  const cx = w/2, cy = h/2;
  const r = Math.min(cx, cy) - 10;
  ctx.clearRect(0,0,w,h);

  if(participants.length===0){
    ctx.fillStyle='#222a36';
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#9aa3b2';
    ctx.font='bold 28px system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('참가자를 추가하세요',cx,cy);
    return;
  }

  const slice=(Math.PI*2)/participants.length;
  for(let i=0;i<participants.length;i++){
    const start=angle+i*slice;
    const end=start+slice;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,start,end); ctx.closePath();
    ctx.fillStyle=colorAt(i,participants.length); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=2; ctx.stroke();

    const mid=start+slice/2;
    const tx=cx+Math.cos(mid)*(r*0.65);
    const ty=cy+Math.sin(mid)*(r*0.65);
    ctx.save(); ctx.translate(tx,ty); ctx.rotate(mid+Math.PI/2);
    ctx.fillStyle='#fff'; ctx.font='600 20px system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const label=participants[i].name.length>12?participants[i].name.slice(0,11)+'…':participants[i].name;
    ctx.fillText(label,0,0);
    ctx.restore();
  }

  ctx.beginPath(); ctx.arc(cx,cy,r*0.08,0,Math.PI*2);
  ctx.fillStyle='#e6eefc'; ctx.fill();
}

// 승자 계산
function announceWinner(){
  if(participants.length===0){ resultText.textContent=''; return; }
  const slice=(Math.PI*2)/participants.length;
  const pointerAngle=-Math.PI/2;
  const a=normalize(pointerAngle-angle);
  let index=Math.floor(a/slice);
  if(index>=participants.length) index=participants.length-1;
  const p=participants[index];
  resultText.textContent=`결과: ${p.name} (${p.phone})`;
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
  const name=inputName.value.trim();
  const phone=normalizePhone(inputPhone.value);
  if(!name||!phone){
    alert('이름과 전화번호를 모두 입력하세요.');
    return;
  }
  if(existsByPhone(phone) || existsByName(name)){
    alert('중복되는 내용이 있습니다.');
    return;
  }
  participants.push({name,phone});
  inputName.value=''; inputPhone.value='';
  renderList(); drawWheel();
});

inputPhone.addEventListener('input', () => {
  inputPhone.value = inputPhone.value.replace(/\D/g, ''); // 숫자가 아닌 문자 제거
});

// 이벤트: 대량 적용
bulkApplyBtn.addEventListener('click',()=>{
  const lines=bulkInput.value.split('\n');
  let added=0, skipped=0;
  for(const line of lines){
    const s=line.trim(); if(!s) continue;
    const [nameRaw,phoneRaw]=s.split(',').map(x=>(x||'').trim());
    const name=nameRaw; const phone=normalizePhone(phoneRaw);
    if(!name||!phone){ skipped++; continue; }
    if(existsByPhone(phone) || existsByName(name)){
      skipped++;
      continue;
    }
    participants.push({name,phone}); added++;
  }
  if(skipped>0){
    alert('중복되는 내용이 있습니다.');
  }
  bulkInput.value='';
  renderList(); drawWheel();
});

// 삭제/수정 버튼
participantList.addEventListener('click',(e)=>{
  const i=e.target.dataset.i;
  if(i===undefined) return;
  if(e.target.classList.contains('delBtn')){
    participants.splice(Number(i),1);
    renderList(); drawWheel();
  } else if(e.target.classList.contains('editBtn')){
    const p=participants[Number(i)];
    const name=prompt('이름 수정',p.name);
    if(name===null) return;
    const phone=prompt('전화번호 수정 (숫자만)',p.phone);
    if(phone===null) return;
    const np=normalizePhone(phone);
    if(!name||!np) return;
    const dup=participants.some((x,idx)=>
      idx!==Number(i) && (normalizePhone(x.phone)===np || x.name===name)
    );
    if(dup){
      alert('중복되는 내용이 있습니다.');
      return;
    }
    participants[Number(i)]={name,phone:np};
    renderList(); drawWheel();
  }
});

// 기타 이벤트
shuffleBtn.addEventListener('click',()=>{
  for(let i=participants.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [participants[i],participants[j]]=[participants[j],participants[i]];
  }
  renderList(); drawWheel();
});
clearBtn.addEventListener('click',()=>{
  if(!confirm('전체 삭제하시겠습니까?')) return;
  participants=[]; renderList(); drawWheel();
});
spinBtn.addEventListener('click',()=>{
  if(participants.length===0) return;
  spinning=true;
  spinVel=0.35+Math.random()*0.55;
  resultText.textContent='돌리는 중...';
});
resetBtn.addEventListener('click',()=>{
  spinning=false; spinVel=0;
  resultText.textContent='';
});

// 초기화
loadParticipants();   // 저장된 참가자 불러오기
renderList();
drawWheel();
tick();
