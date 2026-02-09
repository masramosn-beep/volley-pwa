import { el, startOfWeekMonday, addDays, isoDate, hourLabel } from "./ui.js";
import { getSettings, setSettings, getPlayers, getAvailability, setAvailability } from "./storage.js";

const S = {
  EMPTY: 0,
  YES: 1,
  MAYBE: 2,
  NO: 3
};

export function initAvailability(state){
  function renderAll(){
    renderPlayerSelects();
    renderMyGrid();
    renderTeamGrid();
  }

  function renderPlayerSelects(){
    const players = getPlayers();
    const sel = state.dom.playerSelect;
    const sel2 = state.dom.rotationPlayersSelect;

    sel.innerHTML = "";
    sel2.innerHTML = "";

    players.forEach(p=>{
      sel.appendChild(el("option",{value:p.id},[p.name]));
      sel2.appendChild(el("option",{value:p.id},[p.name]));
    });

    if(!state.selectedPlayerId){
      state.selectedPlayerId = players[0]?.id || null;
    }
    sel.value = state.selectedPlayerId;

    sel.onchange = ()=>{
      state.selectedPlayerId = sel.value;
      renderMyGrid();
    };
  }

  function weekInfo(){
    const ws = startOfWeekMonday(state.weekView);
    const we = addDays(ws, 6);
    state.dom.weekLabel.textContent = `Semana ${isoDate(ws)}`;
    state.dom.weekRangeLabel.textContent = `${isoDate(ws)} → ${isoDate(we)}`;
    return { ws, we };
  }

  function isBlocked(dayIdx, hour){
    const settings = getSettings();
    const b = settings.blocked || {};
    return !!(b[String(dayIdx)] && b[String(dayIdx)][String(hour)]);
  }

  function getSlot(playerId, weekStartISO, dayIdx, hour){
    const all = getAvailability();
    return all?.[weekStartISO]?.[playerId]?.[dayIdx]?.[hour] ?? S.EMPTY;
  }

  function setSlot(playerId, weekStartISO, dayIdx, hour, val){
    const all = getAvailability();
    all[weekStartISO] ||= {};
    all[weekStartISO][playerId] ||= {};
    all[weekStartISO][playerId][dayIdx] ||= {};
    all[weekStartISO][playerId][dayIdx][hour] = val;
    setAvailability(all);
  }

  function nextState(cur){
    if(cur===S.EMPTY) return S.YES;
    if(cur===S.YES) return S.MAYBE;
    if(cur===S.MAYBE) return S.NO;
    return S.EMPTY;
  }

  function renderMyGrid(){
    const settings = getSettings();
    const startH = settings.startHour;
    const endH = settings.endHour;
    const { ws } = weekInfo();

    const weekStartISO = isoDate(ws);
    const wrap = state.dom.myAvailGrid;
    wrap.innerHTML = "";

    const heads = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
    const cols = 8; // corner + 7 days
    const rows = (endH - startH) + 1; // header + hours

    const grid = el("div",{class:"avgrid", style:`grid-template-columns: 90px repeat(7, 110px); grid-template-rows: 38px repeat(${endH-startH}, 38px);`});

    // header row
    grid.appendChild(el("div",{class:"corner head"},["Hora"]));
    for(let d=0; d<7; d++){
      const date = isoDate(addDays(ws, d));
      grid.appendChild(el("div",{class:"avhead head"},[`${heads[d]}\n${date.slice(5)}`]));
    }

    for(let h=startH; h<endH; h++){
      grid.appendChild(el("div",{class:"rowhead"},[hourLabel(h)]));
      for(let d=0; d<7; d++){
        const blocked = isBlocked(d, h);
        const cur = blocked ? null : getSlot(state.selectedPlayerId, weekStartISO, d, h);
        const cls = blocked ? "avcell blocked" : `avcell s${cur}`;
        const cell = el("div",{class:cls});

        if(!blocked){
          cell.textContent = (cur===S.YES) ? "✓" : (cur===S.MAYBE) ? "!" : (cur===S.NO) ? "×" : "";
          cell.addEventListener("click", (ev)=>{
            const current = getSlot(state.selectedPlayerId, weekStartISO, d, h);
            const v = ev.shiftKey ? S.NO : nextState(current);
            setSlot(state.selectedPlayerId, weekStartISO, d, h, v);
            renderMyGrid();
            // refresco suave del resumen
            renderTeamGrid();
          });
        }
        grid.appendChild(cell);
      }
    }

    wrap.appendChild(grid);
  }

  function renderTeamGrid(){
    const settings = getSettings();
    const startH = settings.startHour;
    const endH = settings.endHour;
    const { ws } = weekInfo();
    const weekStartISO = isoDate(ws);
    const players = getPlayers();

    const heads = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
    const wrap = state.dom.teamAvailGrid;
    wrap.innerHTML = "";

    const grid = el("div",{class:"avgrid", style:`grid-template-columns: 90px repeat(7, 110px); grid-template-rows: 38px repeat(${endH-startH}, 38px);`});

    grid.appendChild(el("div",{class:"corner head"},["Hora"]));
    for(let d=0; d<7; d++){
      const date = isoDate(addDays(ws, d));
      grid.appendChild(el("div",{class:"avhead head"},[`${heads[d]}\n${date.slice(5)}`]));
    }

    for(let h=startH; h<endH; h++){
      grid.appendChild(el("div",{class:"rowhead"},[hourLabel(h)]));
      for(let d=0; d<7; d++){
        const blocked = isBlocked(d, h);
        const cell = el("div",{class: blocked ? "avcell blocked" : "avcell s0"});

        if(blocked){
          grid.appendChild(cell);
          continue;
        }

        const detail = calcCell(players, weekStartISO, d, h);
        const count = detail.yes.length + detail.maybe.length;
        cell.textContent = String(count);

        if(count >= 6) cell.classList.add("good");

        cell.addEventListener("click", ()=>{
          state.openTeamCellModal({
            dayIndex: d,
            hour: h,
            weekStartISO,
            heads,
            ws,
            detail
          });
        });

        grid.appendChild(cell);
      }
    }

    wrap.appendChild(grid);
  }

  function calcCell(players, weekStartISO, d, h){
    const yes = [];
    const maybe = [];
    let noCount = 0;

    for(const p of players){
      const v = getSlot(p.id, weekStartISO, d, h);
      if(v === S.YES) yes.push(p.name);
      else if(v === S.MAYBE) maybe.push(p.name);
      else if(v === S.NO) noCount++;
    }
    return { yes, maybe, noCount };
  }

  // team modal
  state.openTeamCellModal = ({ dayIndex, hour, weekStartISO, heads, ws, detail })=>{
    const dayDate = isoDate(addDays(ws, dayIndex));
    state.dom.teamCellModalTitle.textContent = `${heads[dayIndex]} ${dayDate} · ${hourLabel(hour)}`;
    state.dom.teamAvailYes.innerHTML = "";
    state.dom.teamAvailMaybe.innerHTML = "";
    detail.yes.forEach(n=> state.dom.teamAvailYes.appendChild(el("div",{class:"item"},[el("div",{class:"meta"},[el("b",{},[n])])])) );
    detail.maybe.forEach(n=> state.dom.teamAvailMaybe.appendChild(el("div",{class:"item"},[el("div",{class:"meta"},[el("b",{},[n])])])) );
    state.dom.teamAvailNoCount.textContent = `No disponibles: ${detail.noCount}`;
    state.dom.teamCellModal.classList.remove("hidden");
  };

  state.closeTeamCellModal = ()=> state.dom.teamCellModal.classList.add("hidden");

  // blocked editor grid (in settings)
  state.renderBlockedGrid = ()=>{
    const settings = getSettings();
    const startH = settings.startHour;
    const endH = settings.endHour;

    const wrap = state.dom.blockedGrid;
    wrap.innerHTML = "";

    const heads = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
    const grid = el("div",{class:"avgrid", style:`grid-template-columns: 90px repeat(7, 110px); grid-template-rows: 38px repeat(${endH-startH}, 38px);`});

    grid.appendChild(el("div",{class:"corner head"},["Hora"]));
    for(let d=0; d<7; d++){
      grid.appendChild(el("div",{class:"avhead head"},[heads[d]]));
    }

    for(let h=startH; h<endH; h++){
      grid.appendChild(el("div",{class:"rowhead"},[hourLabel(h)]));
      for(let d=0; d<7; d++){
        const b = settings.blocked || {};
        const on = !!(b[String(d)] && b[String(d)][String(h)]);
        const cell = el("div",{class: on ? "avcell blocked" : "avcell s0"});
        cell.textContent = on ? "⛔" : "";
        cell.addEventListener("click", ()=>{
          const s = getSettings();
          s.blocked ||= {};
          s.blocked[String(d)] ||= {};
          if(s.blocked[String(d)][String(h)]) delete s.blocked[String(d)][String(h)];
          else s.blocked[String(d)][String(h)] = true;
          setSettings(s);
          state.renderBlockedGrid();
          // refrescar disponibilidad
          renderMyGrid();
          renderTeamGrid();
        });
        grid.appendChild(cell);
      }
    }

    wrap.appendChild(grid);
  };

  state.actions.renderAvailability = renderAll;

  // initial render
  renderAll();
}
