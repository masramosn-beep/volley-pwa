import { el, downloadBlob } from "./ui.js";
import { getPlayers, getRotations, setRotations } from "./storage.js";

export function initRotations(state){
  function renderPool(){
    const pool = state.dom.playerPool;
    pool.innerHTML = "";
    getPlayers().forEach(p=>{
      const chip = el("div",{class:"chip", draggable:"true"},[p.name]);
      chip.dataset.pid = p.id;
      chip.addEventListener("dragstart", (e)=>{
        e.dataTransfer.setData("text/plain", p.id);
      });
      pool.appendChild(chip);
    });
  }

  function buildCourt(container, key){
    // key: "set1" or "set2"
    const court = el("div",{class:"court"});
    const positions = {
      1:{ left:"54%", top:"72%" },
      2:{ left:"54%", top:"42%" },
      3:{ left:"54%", top:"12%" },
      4:{ left:"2%",  top:"12%" },
      5:{ left:"2%",  top:"42%" },
      6:{ left:"2%",  top:"72%" }
    };

    Object.entries(positions).forEach(([pos, css])=>{
      const box = el("div",{class:"pos", style:`left:${css.left}; top:${css.top};`});
      box.dataset.pos = pos;
      box.dataset.set = key;

      const drop = el("div",{class:"drop"},[
        el("b",{},[`Pos ${pos}`]),
        el("div",{class:"slot"})
      ]);

      box.appendChild(drop);

      box.addEventListener("dragover",(e)=>{ e.preventDefault(); box.classList.add("over"); });
      box.addEventListener("dragleave",()=> box.classList.remove("over"));
      box.addEventListener("drop",(e)=>{
        e.preventDefault();
        box.classList.remove("over");
        const pid = e.dataTransfer.getData("text/plain");
        assign(key, pos, pid);
        renderCourts();
      });

      court.appendChild(box);
    });

    container.innerHTML = "";
    container.appendChild(court);
  }

  function assign(setKey, pos, pid){
    state.rotationDraft ||= { set1:{}, set2:{} };
    state.rotationDraft[setKey][pos] = pid;
  }

  function clear(){
    state.rotationDraft = { set1:{}, set2:{} };
    renderCourts();
  }

  function renderCourts(){
    const players = getPlayers();
    const byId = Object.fromEntries(players.map(p=>[p.id,p]));

    const renderSet = (container, setKey)=>{
      container.querySelectorAll(".pos").forEach(posEl=>{
        const pos = posEl.dataset.pos;
        const slot = posEl.querySelector(".slot");
        slot.innerHTML = "";
        const pid = state.rotationDraft?.[setKey]?.[pos];
        if(pid && byId[pid]){
          const chip = el("div",{class:"chip small", draggable:"true"},[byId[pid].name]);
          chip.dataset.pid = pid;
          chip.addEventListener("dragstart",(e)=> e.dataTransfer.setData("text/plain", pid));

          // click para quitar
          chip.addEventListener("click", ()=>{
            delete state.rotationDraft[setKey][pos];
            renderCourts();
          });

          slot.appendChild(chip);
        }else{
          slot.appendChild(el("span",{class:"muted"},["(vacío)"]));
        }
      });
    };

    renderSet(state.dom.courtSet1, "set1");
    renderSet(state.dom.courtSet2, "set2");
  }

  function renderSavedList(){
    const sel = state.dom.rotationLoadSelect;
    const r = getRotations();
    const names = Object.keys(r).sort((a,b)=> a.localeCompare(b));
    sel.innerHTML = "";
    sel.appendChild(el("option",{value:""},["— Selecciona —"]));
    for(const n of names){
      sel.appendChild(el("option",{value:n},[n]));
    }
  }

  async function exportPNG(){
    // Export simple: render SVG and convert to PNG via canvas
    const players = getPlayers();
    const byId = Object.fromEntries(players.map(p=>[p.id,p.name]));

    const makeSVG = (setKey, label)=>{
      const w=820, h=520;
      const posXY = {
        1:[540,410], 2:[540,280], 3:[540,150],
        4:[280,150], 5:[280,280], 6:[280,410]
      };
      const getName = (pos)=> byId[state.rotationDraft?.[setKey]?.[pos]||""] || "";

      const texts = Object.entries(posXY).map(([pos,[x,y]])=>{
        const name = getName(pos);
        return `
          <g>
            <rect x="${x-120}" y="${y-36}" width="240" height="72" rx="18" fill="rgba(255,106,0,.10)" stroke="rgba(255,106,0,.55)" />
            <text x="${x}" y="${y-6}" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto,Arial" font-size="16" fill="#111" font-weight="900">Pos ${pos}</text>
            <text x="${x}" y="${y+18}" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto,Arial" font-size="16" fill="#111" font-weight="700">${escapeXML(name||"")}</text>
          </g>
        `;
      }).join("");

      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
          <defs>
            <linearGradient id="g" x1="0" x2="1">
              <stop offset="0" stop-color="#ff6a00"/>
              <stop offset="1" stop-color="#ffb020"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="#f6f7fb"/>
          <rect x="90" y="60" width="640" height="400" rx="26" fill="#ffffff" stroke="rgba(255,106,0,.5)" stroke-width="4"/>
          <line x1="410" y1="60" x2="410" y2="460" stroke="rgba(255,106,0,.35)" stroke-width="4"/>
          <text x="410" y="36" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto,Arial" font-size="24" fill="#111" font-weight="900">Rotación ${escapeXML(label)}</text>
          ${texts}
          <rect x="90" y="472" width="640" height="28" rx="14" fill="url(#g)"/>
        </svg>
      `;
    };

    const svg1 = makeSVG("set1","Set 1");
    const svg2 = makeSVG("set2","Set 2");

    const canvas = document.createElement("canvas");
    canvas.width = 820;
    canvas.height = 1040;
    const ctx = canvas.getContext("2d");

    await drawSVG(ctx, svg1, 0, 0);
    await drawSVG(ctx, svg2, 0, 520);

    canvas.toBlob((blob)=>{
      downloadBlob("rotaciones.png", blob);
    }, "image/png");
  }

  function saveCurrent(){
    const name = state.dom.rotationNameInput.value.trim();
    if(!name) return alert("Pon un nombre para guardar (ej. Jornada X vs Equipo Y).");

    const r = getRotations();
    r[name] = {
      set1: state.rotationDraft?.set1 || {},
      set2: state.rotationDraft?.set2 || {},
      updatedAt: new Date().toISOString()
    };
    setRotations(r);
    renderSavedList();
    alert("Guardado.");
  }

  function loadSelected(){
    const name = state.dom.rotationLoadSelect.value;
    if(!name) return;
    const r = getRotations();
    const item = r[name];
    if(!item) return;

    state.rotationDraft = {
      set1: item.set1 || {},
      set2: item.set2 || {}
    };
    renderCourts();
  }

  // init DOM
  renderPool();
  buildCourt(state.dom.courtSet1, "set1");
  buildCourt(state.dom.courtSet2, "set2");

  state.rotationDraft = { set1:{}, set2:{} };
  renderCourts();
  renderSavedList();

  // buttons
  state.dom.saveRotationBtn.addEventListener("click", saveCurrent);
  state.dom.loadRotationBtn.addEventListener("click", loadSelected);
  state.dom.clearRotationBtn.addEventListener("click", clear);
  state.dom.exportRotationBtn.addEventListener("click", exportPNG);
}

function escapeXML(s){
  return String(s).replace(/[<>&"]/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "\"":"&quot;" }[c]));
}

function drawSVG(ctx, svgText, x, y){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    const blob = new Blob([svgText], { type:"image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = ()=>{
      ctx.drawImage(img, x, y);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = (e)=>{ URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
