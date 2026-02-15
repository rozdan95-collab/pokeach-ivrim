
(() => {
const KEY="daniel_word_notes_draft_v1";   // local drafts
const PUBLISHED_URL="annotations.json";   // committed to GitHub Pages

 const BASE = new URL('.', window.location.href).href;
const withBase = (p) => (p.startsWith('http') ? p : BASE + p.replace(/^\.?\//,''));
   //

  const img=document.getElementById("pageImg");
  const wrap=document.getElementById("pageWrap");
  const tooltip=document.getElementById("tooltip");
  const pageNumEl=document.getElementById("pageNum");
  const pageInput=document.getElementById("pageInput");
  const btnGo=document.getElementById("btnGo");
  const btnCopyLink=document.getElementById("btnCopyLink");
  const btnPrev=document.getElementById("btnPrev");
  const btnNext=document.getElementById("btnNext");
  const btnNotes=document.getElementById("btnNotes");
  const btnExport=document.getElementById("btnExport");
  const btnImport=document.getElementById("btnImport");
  const fileImport=document.getElementById("fileImport");
  const btnClearDraft=document.getElementById("btnClear");
  const sidebar=document.getElementById("sidebar");
  const notesRoot=document.getElementById("notesRoot");
  const btnCloseSidebar=document.getElementById("btnCloseSidebar");

  const esc=s=>(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const nowIso=()=>new Date().toISOString();

  const url = new URL(window.location.href);
  const EDIT_MODE = url.searchParams.get("edit")==="1"; // only you use this
  const badge = document.getElementById("modeBadge");
  badge.textContent = EDIT_MODE ? "מצב עריכה (edit=1)" : "מצב קריאה";
  badge.style.background = EDIT_MODE ? "#fff3cd" : "#eef6ff";
  badge.style.border = "1px solid #ddd";

  let META=null;
  let currentPage=1;
  let wordEls=[];
  let publishedNotes=[]; // loaded from annotations.json

  function loadDraft(){
    try{ return JSON.parse(localStorage.getItem(KEY)||"[]"); }catch(e){ return []; }
  }
  function saveDraft(arr){ localStorage.setItem(KEY, JSON.stringify(arr)); }

  function mergedNotes(){
    // Merge published + draft (draft overrides matching page+word_index)
    const pub = publishedNotes || [];
    const draft = loadDraft();
    const m = new Map();
    pub.forEach(n=>m.set(`${n.page}:${n.word_index}`, n));
    draft.forEach(n=>m.set(`${n.page}:${n.word_index}`, n));
    return Array.from(m.values());
  }

  function setDraftFromArray(arr){
    // store as draft
    const cleaned = (Array.isArray(arr)?arr:[])
      .filter(x=>x && typeof x.page==="number" && typeof x.word_index==="number" && typeof x.note==="string")
      .map(x=>({
        id: x.id || crypto.randomUUID(),
        page: x.page,
        word_index: x.word_index,
        word: String(x.word||""),
        note: String(x.note||"").trim(),
        created_at: x.created_at || nowIso(),
        updated_at: nowIso()
      }))
      .filter(x=>x.note);
    saveDraft(cleaned);
  }

  function toggleSidebar(show){ sidebar.style.display = show ? "block" : "none"; }

  function renderSidebar(){
    const notes = mergedNotes();
    notesRoot.innerHTML="";
    if(notes.length===0){
      notesRoot.innerHTML="<div style='color:#666'>אין עדיין הערות. במצב עריכה: לחץ על מילה כדי להוסיף פירוש.</div>";
      return;
    }
    notes.slice().sort((a,b)=> (b.page-a.page) || (b.word_index-a.word_index)).forEach(n=>{
      const d=document.createElement("div");
      d.className="note";
      d.innerHTML = `
        <div class="sel">עמוד ${n.page} — ״${esc(n.word)}״</div>
        <div class="txt">${esc(n.note)}</div>
        <div class="meta">
          <span>${new Date(n.updated_at).toLocaleString("he-IL")}</span>
          <span style="display:flex;gap:6px;flex-wrap:wrap">
            <button data-act="goto" data-id="${n.id}">קפוץ</button>
            ${EDIT_MODE ? `<button data-act="edit" data-id="${n.id}">ערוך</button><button data-act="del" data-id="${n.id}">מחק</button>` : ``}
          </span>
        </div>
      `;
      notesRoot.appendChild(d);
    });
  }

  function getNote(page, idx){
    const notes = mergedNotes();
    return notes.find(n=>n.page===page && n.word_index===idx) || null;
  }

  function applyMarks(){
    const notes = mergedNotes();
    const byIdx = new Map();
    notes.filter(n=>n.page===currentPage).forEach(n=>byIdx.set(n.word_index, n));
    wordEls.forEach((el, idx)=>{
      if(byIdx.has(idx)) el.classList.add("marked");
      else el.classList.remove("marked");
    });
  }

  function hideTooltip(){ tooltip.style.display="none"; }
  function showTooltip(clientX, clientY, title, text){
    tooltip.innerHTML = `<div class="t">${esc(title)}</div><div class="x">${esc(text)}</div>`;
    tooltip.style.display="block";
    const rect = wrap.getBoundingClientRect();
    const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    let left = clientX + 12;
    let top  = clientY + 12;
    const vx = window.innerWidth, vy = window.innerHeight;
    if(left + tw > vx - 12) left = vx - tw - 12;
    if(top + th > vy - 12) top = vy - th - 12;
    tooltip.style.left = (left - rect.left + wrap.scrollLeft) + "px";
    tooltip.style.top  = (top  - rect.top  + wrap.scrollTop ) + "px";
  }

  async function loadMeta(){
   const res = await fetch(withBase("meta.json"), {cache:"no-store"});
    META = await res.json();
    document.getElementById("pageCount").textContent = META.page_count;
    pageInput.max = META.page_count;
  
async function loadPublished(){
  try{
    const res = await fetch(withBase(PUBLISHED_URL), {cache:"no-store"});
    if(!res.ok) throw new Error("no published");
    const arr = await res.json();
    publishedNotes = Array.isArray(arr) ? arr : [];
    document.getElementById("pubStatus").textContent = `נטענו ${publishedNotes.length} הערות מהאתר`;
  }catch(e){
    publishedNotes = [];
    document.getElementById("pubStatus").textContent = "אין annotations.json (או לא נטען).";
  }
}

 

  function clearWords(){
    wordEls.forEach(el=>el.remove());
    wordEls=[];
  }

  async function renderPage(n){
    currentPage = Math.max(1, Math.min(META.page_count, n));
    pageNumEl.textContent = currentPage;
    pageInput.value = currentPage;
    // keep ?page= in the address (without reload), preserve other params like edit=1
    try{
      const u = new URL(window.location.href);
      u.searchParams.set("page", String(currentPage));
      history.replaceState(null, "", u.toString());
    }catch(e){}

const p = META.pages[currentPage-1];
img.src = withBase(p.img);

    


    await new Promise(resolve=>{
      if(img.complete) return resolve();
      img.onload=()=>resolve();
      img.onerror=()=>resolve();
    });

    const wordsRes = await fetch(withBase(p.words), {cache:"no-store"});

    const payload = await wordsRes.json();

    clearWords();

    const dispW = img.clientWidth;
    const scale = dispW / payload.w;
    wrap.style.width = dispW + "px";
    wrap.style.height = (payload.h * scale) + "px";

    payload.words.forEach((w, idx)=>{
      const el=document.createElement("span");
      el.className="word";
      el.style.left = (w.x*scale) + "px";
      el.style.top  = (w.y*scale) + "px";
      el.style.width= (w.w*scale) + "px";
      el.style.height=(w.h*scale) + "px";
      el.dataset.idx = idx;
      el.dataset.t = w.t;
      wrap.appendChild(el);
      wordEls.push(el);

      el.addEventListener("mouseenter", (e)=>{
        const note = getNote(currentPage, idx);
        if(!note) return;
        showTooltip(e.clientX, e.clientY, `עמוד ${note.page} — ${note.word}`, note.note);
      });
      el.addEventListener("mouseleave", hideTooltip);

      if(EDIT_MODE){
        el.addEventListener("click", ()=>{
          const note = getNote(currentPage, idx);
          const currentText = note ? note.note : "";
          const input = prompt(`הוסף/ערוך פירוש למילה:\n"${w.t}"`, currentText);
          if(input===null) return;
          const txt = input.trim();

          // update draft ONLY (published stays as baseline)
          const draft = loadDraft();
          const key = `${currentPage}:${idx}`;
          const map = new Map(draft.map(n=>[`${n.page}:${n.word_index}`, n]));
          if(!txt){
            map.delete(key);
          }else{
            const existing = map.get(key);
          const newId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now()+"-"+Math.random().toString(16).slice(2));
const base = existing || {id: newId, created_at: nowIso()};

            map.set(key, {
              ...base,
              page: currentPage,
              word_index: idx,
              word: w.t,
              note: txt,
              updated_at: nowIso()
            });
          }
          saveDraft(Array.from(map.values()));
          applyMarks();
          renderSidebar();
        });
      }
    });

    applyMarks();
    hideTooltip();
  }

  function go(){ renderPage(parseInt(pageInput.value,10) || 1); }
  btnGo.addEventListener("click", go);
  pageInput.addEventListener("keydown", e=>{ if(e.key==="Enter") go(); });
  btnPrev.addEventListener("click", ()=>renderPage(currentPage-1));
  btnNext.addEventListener("click", ()=>renderPage(currentPage+1));

  btnCopyLink && btnCopyLink.addEventListener("click", async ()=>{
    try{
      const u = new URL(window.location.href);
      u.searchParams.set("page", String(currentPage));
      // keep edit param if present (manager links can include it)
      const link = u.toString();
      await navigator.clipboard.writeText(link);
      alert("הקישור הועתק:\n" + link);
    }catch(e){
      alert("לא הצלחתי להעתיק ללוח. הקישור הוא:\n" + window.location.href);
    }
  });


  btnNotes.addEventListener("click", ()=>{ renderSidebar(); toggleSidebar(true); });
  btnCloseSidebar.addEventListener("click", ()=>toggleSidebar(false));

  btnExport.addEventListener("click", ()=>{
    const notes = mergedNotes();
    const blob = new Blob([JSON.stringify(notes, null, 2)], {type:"application/json;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "annotations.json";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 800);
  });

  btnImport.addEventListener("click", ()=>fileImport.click());
  fileImport.addEventListener("change", (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{
      try{
        const arr = JSON.parse(r.result);
        if(!Array.isArray(arr)) throw new Error("bad");
        setDraftFromArray(arr);
        applyMarks();
        renderSidebar();
        toggleSidebar(true);
        alert("הערות יובאו כטיוטה בדפדפן. כדי לפרסם: לחץ “ייצא (annotations.json)” והעלה ל‑GitHub.");
      }catch(err){
        alert("קובץ JSON לא תקין.");
      }
    };
    r.readAsText(f, "utf-8");
    fileImport.value="";
  });

  btnClearDraft.addEventListener("click", ()=>{
    if(!confirm("למחוק רק את הטיוטה המקומית בדפדפן? (ההערות שפורסמו באתר לא יימחקו)")) return;
    localStorage.removeItem(KEY);
    applyMarks();
    renderSidebar();
  });

  // sidebar actions
  notesRoot.addEventListener("click", (e)=>{
    const b=e.target.closest("button");
    if(!b) return;
    const act=b.dataset.act;
    const id=b.dataset.id;
    const notes = mergedNotes();
    const n = notes.find(x=>x.id===id);
    if(!n) return;

    if(act==="goto"){ renderPage(n.page).then(()=>toggleSidebar(false)); return; }

    if(!EDIT_MODE) return;

    if(act==="edit"){
      const txt = prompt(`ערוך פירוש למילה:\n"${n.word}" (עמוד ${n.page})`, n.note);
      if(txt===null) return;
      const draft = loadDraft();
      const map = new Map(draft.map(x=>[`${x.page}:${x.word_index}`, x]));
      map.set(`${n.page}:${n.word_index}`, {...n, note: txt.trim(), updated_at: nowIso()});
      saveDraft(Array.from(map.values()));
      applyMarks(); renderSidebar();
    }
    if(act==="del"){
      const draft = loadDraft();
      const filtered = draft.filter(x=>!(x.page===n.page && x.word_index===n.word_index));
      saveDraft(filtered);
      applyMarks(); renderSidebar();
    }
  });
   // init
  (async ()=>{
    await loadMeta();
    await loadPublished();

    // In read mode: hide import/clear buttons to reduce confusion
    if(!EDIT_MODE){
      document.getElementById("editHint").textContent =
        "כדי לערוך הערות: הוסף ‎?edit=1‎ לכתובת (רק למנהל).";
      document.getElementById("btnImport").style.display="none";
      document.getElementById("btnClear").style.display="none";
    }else{
      document.getElementById("editHint").textContent =
        "מצב עריכה פעיל. העריכות נשמרות כטיוטה בדפדפן עד שתייצא ותעלה ל-GitHub.";
    }

    // open directly on ?page=N if provided
    let initial = 1;
    try{
      const u = new URL(window.location.href);
      const p = parseInt(u.searchParams.get("page") || "1", 10);
      if(p && p >= 1) initial = p;
    }catch(e){}

    await renderPage(initial);
  })();
})();
   // init
  (async () => {
    await loadMeta();
    await loadPublished();

    // In read mode: hide import/clear buttons to reduce confusion
    if (!EDIT_MODE) {
      document.getElementById("editHint").textContent =
        "כדי לערוך הערות: הוסף ‎?edit=1‎ לכתובת (רק למנהל).";
      document.getElementById("btnImport").style.display = "none";
      document.getElementById("btnClear").style.display = "none";
    } else {
      document.getElementById("editHint").textContent =
        "מצב עריכה פעיל. העריכות נשמרות כטיוטה בדפדפן עד שתייצא ותעלה ל-GitHub.";
    }

    // open directly on ?page=N if provided
    let initial = 1;
    try {
      const u = new URL(window.location.href);
      const p = parseInt(u.searchParams.get("page") || "1", 10);
      if (p && p >= 1) initial = p;
    } catch (e) {}

 
    await renderPage(initial);
  })();
})();
