const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const today = new Date().toISOString().slice(0,10);
$("#issue-date").value = today;
let chain = [];
let certificates = [];
let latestMining = null;
let miningCancelled = false;

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,"0")).join("");
}
function canonical(obj) { return JSON.stringify(obj); }
function blockPayload(block) {
  return canonical({index:block.index, timestamp:block.timestamp, data:block.data, previousHash:block.previousHash, nonce:block.nonce});
}
async function calculateHash(block) { return sha256(blockPayload(block)); }
async function createBlock(data, previousHash, nonce=0, mined=false, difficulty=0) {
  const block = {index:chain.length, timestamp:new Date().toISOString(), data, previousHash, nonce, mined, difficulty, hash:""};
  block.hash = await calculateHash(block);
  return block;
}
function escapeHTML(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function shortHash(h) { return h ? h.slice(0,12)+"…"+h.slice(-8) : "—"; }
function initials(name) { return String(name||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase(); }
function showToast(msg) { const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove("show"),2600); }
function statusClass(status) { return status==="Invalid" ? "invalid" : status==="Pending mining" ? "pending" : ""; }

async function init() {
  const seed = [
    {student:"Aarav Mehta",course:"Blockchain Fundamentals",id:"CERT-2026-001",date:"2026-01-12",institution:"SR University (Demo)",note:"Demo certificate"},
    {student:"Priya Sharma",course:"Web Development",id:"CERT-2026-002",date:"2026-02-04",institution:"SR University (Demo)",note:"Demo certificate"},
    {student:"Rohan Kumar",course:"Cybersecurity Essentials",id:"CERT-2026-003",date:"2026-03-18",institution:"SR University (Demo)",note:"Demo certificate"}
  ];
  chain = [{index:0,timestamp:"2026-01-01T00:00:00.000Z",data:{type:"Genesis",message:"CertiChain demo registry initialized"},previousHash:"0",nonce:0,mined:true,difficulty:0,hash:""}];
  chain[0].hash = await calculateHash(chain[0]);
  for (const item of seed) {
    const cert = {...item, createdAt:new Date(item.date+"T12:00:00").toISOString(), status:"Valid", blockIndex:chain.length};
    const block = await createBlock({type:"CertificateIssued",certificate:cert},chain[chain.length-1].hash,0,false,0);
    cert.hash = await sha256(canonical({student:cert.student,course:cert.course,id:cert.id,date:cert.date,institution:cert.institution,note:cert.note}));
    block.data.certificate.hash = cert.hash;
    block.hash = await calculateHash(block);
    chain.push(block); certificates.push(cert);
  }
  renderAll();
}
function go(view) {
  $$(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+view));
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const titles={overview:"Overview",certificates:"Certificates",issue:"Issue certificate",blockchain:"Blockchain explorer",mining:"Proof of Work",learn:"Learn blockchain"};
  $("#page-title").textContent=titles[view]||"Overview"; $("#crumb").textContent=(titles[view]||"Overview").toUpperCase();
  window.scrollTo({top:0,behavior:"smooth"});
  if(view==="mining") refreshMineSelect();
}
$$("[data-view]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.view)));
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));

function certBlock(cert) { return chain.find(b=>b.data?.certificate?.id===cert.id); }
function renderAll() { renderStats(); renderRecent(); renderCertificates(); renderChainMini(); renderBlocks(); refreshMineSelect(); }
function renderStats() {
  $("#stat-certs").textContent=certificates.length;
  $("#stat-blocks").textContent=chain.length;
  $("#explorer-block-count").textContent=`${chain.length} block${chain.length===1?"":"s"} linked together`;
}
function personCell(cert) { return `<div class="person"><span class="person-avatar">${escapeHTML(initials(cert.student))}</span><span><strong>${escapeHTML(cert.student)}</strong><small>${escapeHTML(cert.course)}</small></span></div>`; }
function renderRecent() {
  $("#recent-table").innerHTML=certificates.slice(-4).reverse().map(c=>`<tr><td>${personCell(c)}</td><td><span class="id-code">${escapeHTML(c.id)}</span></td><td><span class="status ${statusClass(c.status)}">${escapeHTML(c.status)}</span></td></tr>`).join("");
}
function renderCertificates() {
  const q=($("#cert-search")?.value||"").toLowerCase();
  const list=certificates.filter(c=>[c.student,c.course,c.id,c.institution].some(v=>String(v).toLowerCase().includes(q)));
  $("#cert-table").innerHTML=list.map(c=>`<tr><td>${personCell(c)}</td><td>${escapeHTML(c.course)}</td><td><span class="id-code">${escapeHTML(c.id)}</span></td><td>${escapeHTML(c.date)}</td><td><span class="status ${statusClass(c.status)}">${escapeHTML(c.status)}</span></td><td><button class="action-link" data-verify="${escapeHTML(c.id)}">Verify →</button></td></tr>`).join("");
  $("#empty-state").classList.toggle("hidden",list.length>0); $("#cert-count").textContent=`${list.length} record${list.length===1?"":"s"}`;
  $$("[data-verify]").forEach(b=>b.addEventListener("click",()=>verifyCertificate(b.dataset.verify)));
}
$("#cert-search").addEventListener("input",renderCertificates);
function renderChainMini() {
  $("#chain-mini").innerHTML=chain.slice(-3).reverse().map(b=>`<div class="mini-block"><div class="mini-hex">⬡</div><div><strong>Block #${b.index} · ${b.index===0?"Genesis":escapeHTML(b.data?.certificate?.id||"Registry update")}</strong><small>${shortHash(b.hash)}</small></div></div>`).join("");
}
function renderBlocks() {
  $("#block-list").innerHTML=[...chain].reverse().map(b=>{
    const d=b.data||{}, cert=d.certificate;
    return `<article class="block-card"><div class="block-head"><div class="block-title"><div class="block-number">#${b.index}</div><div><strong>${b.index===0?"Genesis Block":escapeHTML(cert?.id||d.type||"Block")}</strong><small>${new Date(b.timestamp).toLocaleString()} · ${b.mined?"Mined":"Not mined"}</small></div></div><span class="status ${b.mined?"":"pending"}">${b.mined?"Confirmed":"Unmined"}</span></div><div class="block-grid"><div class="block-field"><label>BLOCK HASH</label><code>${escapeHTML(b.hash)}</code></div><div class="block-field"><label>PREVIOUS HASH</label><code>${escapeHTML(b.previousHash)}</code></div><div class="block-field"><label>NONCE</label><code>${b.nonce}</code></div><div class="block-field"><label>DIFFICULTY</label><code>${b.difficulty?`${b.difficulty} leading zero(s)`:"Not mined"}</code></div></div><div class="block-data"><strong>Stored data:</strong> ${b.index===0?escapeHTML(d.message):`Certificate for ${escapeHTML(cert?.student||"Unknown")} · ${escapeHTML(cert?.course||"")}`}</div></article>`;
  }).join("");
}
async function validateChain() {
  for(let i=0;i<chain.length;i++){
    const b=chain[i], calculated=await calculateHash(b);
    if(calculated!==b.hash) return {valid:false,index:i,reason:"Block data does not match its stored hash."};
    if(i>0 && b.previousHash!==chain[i-1].hash) return {valid:false,index:i,reason:"Previous-hash link does not match the previous block."};
    if(b.mined && b.difficulty>0 && !b.hash.startsWith("0".repeat(b.difficulty))) return {valid:false,index:i,reason:"Mined block does not meet its proof-of-work rule."};
  }
  return {valid:true};
}
function showValidation(target,result) {
  const el=$(target); el.className="inline-result "+(result.valid?"success":"error");
  el.textContent=result.valid?`✓ Chain is valid. All ${chain.length} block hashes and previous-hash links match.`:`✕ Validation failed at Block #${result.index}: ${result.reason}`;
  $("#stat-integrity").textContent=result.valid?"Valid":"Invalid"; $("#health-badge").textContent=result.valid?"● Healthy":"● Issue detected"; $("#health-badge").style.background=result.valid?"#e5f8f0":"#fff0f2"; $("#health-badge").style.color=result.valid?"#16966a":"#c13c50";
}
$("#validate-overview").addEventListener("click",async()=>showValidation("#overview-validation",await validateChain()));
$("#validate-chain").addEventListener("click",async()=>{const r=await validateChain();showValidation("#chain-result",r);renderBlocks();});
async function verifyCertificate(id) {
  const c=certificates.find(x=>x.id===id);
  $("#verify-modal").classList.remove("hidden");
  $("#modal-title").textContent=c?"Certificate record found":"Certificate not found";
  $("#modal-subtitle").textContent=c?"Review the record and its integrity check.":"No certificate with that ID exists in this demo registry.";
  if(!c){$("#modal-check").textContent="!";$("#modal-details").innerHTML="";$("#modal-result").className="verification-result bad";$("#modal-result").textContent="Verification failed: certificate ID is not registered.";return;}
  const expected=await sha256(canonical({student:c.student,course:c.course,id:c.id,date:c.date,institution:c.institution,note:c.note}));
  const block=certBlock(c), hashOk=expected===c.hash, blockOk=!!block && block.data.certificate.hash===c.hash;
  const chainCheck=await validateChain(), valid=hashOk&&blockOk&&chainCheck.valid;
  $("#modal-details").innerHTML=[["Student",c.student],["Course",c.course],["Certificate ID",c.id],["Institution",c.institution],["Issue date",c.date],["Block",`#${c.blockIndex}`],["Certificate hash",shortHash(c.hash)]].map(([k,v])=>`<div class="detail-row"><span>${escapeHTML(k)}</span><span>${escapeHTML(v)}</span></div>`).join("");
  $("#modal-result").className="verification-result "+(valid?"":"bad");
  $("#modal-result").textContent=valid?"✓ Integrity checks passed: the certificate record matches its stored hash and the chain links validate.":"✕ A hash or chain validation check failed. Review the blockchain explorer.";
  $("#modal-done").textContent="Done";
}
$("#close-modal").addEventListener("click",()=>$("#verify-modal").classList.add("hidden"));
$("#modal-done").addEventListener("click",()=>$("#verify-modal").classList.add("hidden"));
$("#verify-modal").addEventListener("click",e=>{if(e.target.id==="verify-modal")$("#verify-modal").classList.add("hidden");});

$("#issue-form").addEventListener("reset",()=>setTimeout(()=>{$("#issue-date").value=today;$("#institution").value="SR University (Demo)";$("#issue-message").textContent="";$("#issue-message").className="inline-result";},0));
$("#issue-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const student=$("#student-name").value.trim(),course=$("#course-name").value.trim(),id=$("#certificate-id").value.trim(),date=$("#issue-date").value,institution=$("#institution").value.trim(),note=$("#certificate-note").value.trim();
  const msg=$("#issue-message");
  if(certificates.some(c=>c.id.toLowerCase()===id.toLowerCase())){msg.className="inline-result error";msg.textContent="That certificate ID already exists. Please use a unique ID.";return;}
  const cert={student,course,id,date,institution,note,status:"Pending mining",blockIndex:chain.length,createdAt:new Date().toISOString()};
  cert.hash=await sha256(canonical({student,course,id,date,institution,note}));
  const block={index:chain.length,timestamp:new Date().toISOString(),data:{type:"CertificateIssued",certificate:cert},previousHash:chain[chain.length-1].hash,nonce:0,mined:false,difficulty:0,hash:""};
  block.hash=await calculateHash(block);
  chain.push(block);certificates.push(cert);
  msg.className="inline-result success";msg.textContent=`Certificate ${id} created. Its block is #${block.index}. Mine it in the Proof of Work section to demonstrate mining.`;
  $("#issue-form").reset();renderAll();showToast("Certificate added to the simulated chain.");setTimeout(()=>go("blockchain"),800);
});

function refreshMineSelect() {
  const select=$("#mine-select");if(!select)return;
  const current=select.value;
  select.innerHTML=chain.filter(b=>b.index>0).map(b=>`<option value="${b.index}">Block #${b.index} — ${escapeHTML(b.data?.certificate?.id||"Certificate")}${b.mined?" (mined)":""}</option>`).join("");
  if([...select.options].some(o=>o.value===current))select.value=current;
}
$("#difficulty").addEventListener("change",()=>{$("#prefix-preview").textContent="0".repeat(Number($("#difficulty").value));});
$("#mine-button").addEventListener("click",async()=>{
  const index=Number($("#mine-select").value),b=chain[index],difficulty=Number($("#difficulty").value);
  if(!b){showToast("Issue a certificate first.");return;}
  const button=$("#mine-button");button.disabled=true;button.textContent="Mining…";$("#mine-progress").classList.remove("hidden");$("#mine-result").className="inline-result";$("#mine-result").textContent="";
  $("#progress-fill").style.width="0%";$("#mine-percent").textContent="0%";$("#mine-status").textContent="Searching for a valid nonce…";
  const started=performance.now(),target="0".repeat(difficulty),maxAttempts=250000;let found=false,nonce=0,hash="";
  for(nonce=0;nonce<maxAttempts;nonce++){
    b.nonce=nonce;b.difficulty=difficulty;b.mined=false;
    hash=await calculateHash(b);
    if(hash.startsWith(target)){found=true;break;}
    if(nonce%350===0){
      $("#progress-fill").style.width=`${Math.min(95,nonce/maxAttempts*100)}%`;
      $("#mine-percent").textContent=nonce.toLocaleString()+" tries";
      $("#mine-status").textContent=`Testing nonce ${nonce.toLocaleString()}…`;
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }
  const elapsed=performance.now()-started;
  if(found){
    b.nonce=nonce;b.hash=hash;b.mined=true;b.difficulty=difficulty;
    const cert=b.data?.certificate;
    if(cert){const c=certificates.find(x=>x.id===cert.id);if(c)c.status="Valid";}
    latestMining={nonce,attempts:nonce+1,time:elapsed,hash};
    $("#progress-fill").style.width="100%";$("#mine-percent").textContent="Solution found";$("#mine-status").textContent="Proof of Work complete";
    $("#mine-result").className="inline-result success";$("#mine-result").textContent=`✓ Valid nonce found. Hash starts with ${target}. Block #${index} is now marked as mined in this demo.`;
    $("#result-nonce").textContent=nonce.toLocaleString();$("#result-attempts").textContent=(nonce+1).toLocaleString();$("#result-time").textContent=elapsed<1000?`${Math.round(elapsed)} ms`:`${(elapsed/1000).toFixed(2)} s`;$("#result-hash").textContent=hash;
    showToast(`Block #${index} mined successfully.`);
  }else{
    b.mined=false;$("#mine-result").className="inline-result error";$("#mine-result").textContent="No solution found within the attempt limit. Try a lower difficulty.";$("#mine-status").textContent="Attempt limit reached";
  }
  button.disabled=false;button.textContent="⚒ Mine again";renderAll();
});
init();
