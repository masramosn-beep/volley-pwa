import { qs, qsa } from "./ui.js";
import { getTheme, setTheme, getSettings, setSettings, getPlayers, setPlayers, uid } from "./storage.js";
import { initCalendar } from "./calendar.js";
import { initAvailability } from "./availability.js";
import { initRotations } from "./rotations.js";
import { initStandings } from "./standings.js";

const state = {
  calendarView: new Date(),
  weekView: new Date(),
  selectedDate: null,
  selectedPlayerId: null,
  editingEventId: null,
  rotationDraft: null,
  actions: {},
  dom: {}
};

bindDom();
boot();

function bindDom(){
  // top
  state.dom.subtitle = qs("#subtitle");
  state.dom.installBtn = qs("#installBtn");
  state.dom.toggleThemeBtn = qs("#toggleThemeBtn");

  // pages
  state.dom.pages = {
    calendar: qs("#page-calendar"),
    availability: qs("#page-availability"),
    rotations: qs("#page-rotations"),
    standings: qs("#page-standings"),
    settings: qs("#page-settings")
  };

  // nav
  state.dom.navBtns = qsa(".navbtn");

  // calendar dom
  state.dom.calendarGrid = qs("#calendarGrid");
  state.dom.monthLabel = qs("#monthLabel");
  state.dom.prevMonthBtn = qs("#prevMonthBtn");
  state.dom.nextMonthBtn = qs("#nextMonthBtn");
  state.dom.todayBtn = qs("#todayBtn");
  state.dom.addEventBtn = qs("#addEventBtn");
  state.dom.dayEventsLabel = qs("#dayEventsLabel");
  state.dom.dayEventsList = qs("#dayEventsList");

  // event modal dom
  state.dom.eventModal = qs("#eventModal");
  state.dom.eventModalTitle = qs("#eventModalTitle");
  state.dom.closeEventModalBtn = qs("#closeEventModalBtn");
  state.dom.cancelEventBtn = qs("#cancelEventBtn");
  state.dom.saveEventBtn = qs("#saveEventBtn");
  state.dom.deleteEventBtn = qs("#deleteEventBtn");

  state.dom.eventTypeInput = qs("#eventTypeInput");
  state.dom.eventTitleInput = qs("#eventTitleInput");
  state.dom.eventDateInput = qs("#eventDateInput");
  state.dom.eventStartInput = qs("#eventStartInput");
  state.dom.eventEndInput = qs("#eventEndInput");
  state.dom.eventPlaceInput = qs("#eventPlaceInput");
  state.dom.eventNotesInput = qs("#eventNotesInput");

  // availability dom
  state.dom.prevWeekBtn = qs("#prevWeekBtn");
  state.dom.nextWeekBtn = qs("#nextWeekBtn");
  state.dom.thisWeekBtn = qs("#thisWeekBtn");
  state.dom.weekLabel = qs("#weekLabel");
  state.dom.weekRangeLabel = qs("#weekRangeLabel");
  state.dom.playerSelect = qs("#playerSelect");
  state.dom.myAvailGrid = qs("#myAvailGrid");
  state.dom.teamAvailGrid = qs("#teamAvailGrid");
  state.dom.recalcTeamBtn = qs("#recalcTeamBtn");

  // team cell modal
  state.dom.teamCellModal = qs("#teamCellModal");
  state.dom.teamCellModalTitle = qs("#teamCellModalTitle");
  state.dom.closeTeamCellModalBtn = qs("#closeTeamCellModalBtn");
  state.dom.teamAvailYes = qs("#teamAvailYes");
  state.dom.teamAvailMaybe = qs("#teamAvailMaybe");
  state.dom.teamAvailNoCount = qs("#teamAvailNoCount");

  // rotations dom
  state.dom.rotationPlayersSelect = qs("#rotationPlayersSelect");
  state.dom.rotationNameInput = qs("#rotationNameInput");
  state.dom.saveRotationBtn = qs("#saveRotationBtn");
  state.dom.rotationLoadSelect = qs("#rotationLoadSelect");
  state.dom.loadRotationBtn = qs("#loadRotationBtn");
  state.dom.clearRotationBtn = qs("#clearRotationBtn");
  state.dom.exportRotationBtn = qs("#exportRotationBtn");
  state.dom.playerPool = qs("#playerPool");
  state.dom.courtSet1 = qs("#courtSet1");
  state.dom.courtSet2 = qs("#courtSet2");

  // standings dom
  state.dom.standingsUpdatedLabel = qs("#standingsUpdatedLabel");
  state.dom.refreshStandingsBtn = qs("#refreshStandingsBtn");
  state.dom.standingsTable = qs("#standingsTable");

  // settings dom
  state.dom.myNameInput = qs("#myNameInput");
  state.dom.startHourInput = qs("#startHourInput");
  state.dom.endHourInput = qs("#endHourInput");
  state.dom.saveSettingsBtn = qs("#saveSettingsBtn");
  state.dom.playersList = qs("#playersList");
  state.dom.addPlayerBtn = qs("#addPlayerBtn");
  state.dom.blockedGrid = qs("#blockedGrid");
  state.dom.clearBlockedBtn = qs("#clearBlockedBtn");
}

async function boot(){
  // theme
  applyTheme(getTheme());
  state.dom.toggleThemeBtn.addEventListener("click", ()=>{
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  });

  // install prompt
  setupInstall();

  // init modules
  initCalendar(state);
  initAvailability(state);
  initRotations(state);
  await initStandings(state);

  // wiring
  wireCalendarButtons();
  wireAvailabilityButtons();
  wireModals();
  wireRouting();
  wireSettings();

  // service worker
  registerSW();

  // initial route
  routeTo(location.hash || "#calendar");
}

function applyTheme(t){
  document.documentElement.setAttribute("data-theme", t);
}

function setupInstall(){
  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    state.dom.installBtn.style.display = "inline-flex";
  });

  state.dom.installBtn.addEventListener("click", async ()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    state.dom.installBtn.style.display = "none";
  });
}

function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./service-worker.js");
}

function wireRouting(){
  state.dom.navBtns.forEach(btn=>{
    btn.addEventListener("click", ()=> routeTo(btn.dataset.route));
  });
  window.addEventListener("hashchange", ()=> routeTo(location.hash));
}

function routeTo(hash){
  const route = (hash || "#calendar").replace("#","");
  const pages = state.dom.pages;

  Object.entries(pages).forEach(([k, el])=>{
    el.classList.toggle("hidden", k !== route);
  });

  state.dom.navBtns.forEach(b=> b.classList.toggle("active", b.dataset.route === `#${route}`));

  const title = pages[route]?.dataset?.title || "Volley";
  state.dom.subtitle.textContent = title;

  // render on enter
  if(route === "calendar") state.actions.renderCalendar?.();
  if(route === "availability") state.actions.renderAvailability?.();
  if(route === "standings") state.actions.renderStandings?.();
  if(route === "settings"){
    renderSettings();
    state.renderBlockedGrid?.();
  }

  location.hash = `#${route}`;
}

function wireCalendarButtons(){
  state.dom.prevMonthBtn.addEventListener("click", ()=>{
    const d = new Date(state.calendarView);
    d.setMonth(d.getMonth()-1);
    state.calendarView = d;
    state.actions.renderCalendar?.();
  });
  state.dom.nextMonthBtn.addEventListener("click", ()=>{
    const d = new Date(state.calendarView);
    d.setMonth(d.getMonth()+1);
    state.calendarView = d;
    state.actions.renderCalendar?.();
  });
  state.dom.todayBtn.addEventListener("click", ()=>{
    state.calendarView = new Date();
    state.selectedDate = new Date().toISOString().slice(0,10);
    state.actions.renderCalendar?.();
  });
  state.dom.addEventBtn.addEventListener("click", ()=> state.openEventModal(null));
}

function wireAvailabilityButtons(){
  state.dom.prevWeekBtn.addEventListener("click", ()=>{
    const d = new Date(state.weekView);
    d.setDate(d.getDate()-7);
    state.weekView = d;
    state.actions.renderAvailability?.();
  });
  state.dom.nextWeekBtn.addEventListener("click", ()=>{
    const d = new Date(state.weekView);
    d.setDate(d.getDate()+7);
    state.weekView = d;
    state.actions.renderAvailability?.();
  });
  state.dom.thisWeekBtn.addEventListener("click", ()=>{
    state.weekView = new Date();
    state.actions.renderAvailability?.();
  });
  state.dom.recalcTeamBtn.addEventListener("click", ()=> state.actions.renderAvailability?.());
}

function wireModals(){
  // event modal
  state.dom.closeEventModalBtn.addEventListener("click", state.closeEventModal);
  state.dom.cancelEventBtn.addEventListener("click", state.closeEventModal);
  state.dom.saveEventBtn.addEventListener("click", state.saveEventFromModal);
  state.dom.deleteEventBtn.addEventListener("click", state.deleteEventFromModal);

  // click outside to close (basic)
  state.dom.eventModal.addEventListener("click", (e)=>{
    if(e.target === state.dom.eventModal) state.closeEventModal();
  });

  // team modal
  state.dom.closeTeamCellModalBtn.addEventListener("click", state.closeTeamCellModal);
  state.dom.teamCellModal.addEventListener("click", (e)=>{
    if(e.target === state.dom.teamCellModal) state.closeTeamCellModal();
  });
}

function wireSettings(){
  state.dom.saveSettingsBtn.addEventListener("click", ()=>{
    const s = getSettings();
    s.myName = state.dom.myNameInput.value.trim() || "Yo";
    s.startHour = Number(state.dom.startHourInput.value);
    s.endHour = Number(state.dom.endHourInput.value);
    if(!(s.startHour>=0 && s.startHour<=23 && s.endHour>=1 && s.endHour<=24 && s.endHour>s.startHour)){
      return alert("Horas inválidas. Ej: inicio 8, fin 23.");
    }
    setSettings(s);
    alert("Ajustes guardados.");
    // refrescar grids
    state.actions.renderAvailability?.();
    state.actions.renderCalendar?.();
    state.renderBlockedGrid?.();
  });

  state.dom.addPlayerBtn.addEventListener("click", ()=>{
    const name = prompt("Nombre del jugador:");
    if(!name) return;
    const p = getPlayers();
    p.push({ id: uid("p"), name: name.trim() });
    setPlayers(p);
    renderSettings();
    state.actions.renderAvailability?.();
  });

  state.dom.clearBlockedBtn.addEventListener("click", ()=>{
    const s = getSettings();
    s.blocked = {};
    setSettings(s);
    state.renderBlockedGrid?.();
    state.actions.renderAvailability?.();
  });
}

function renderSettings(){
  const s = getSettings();
  state.dom.myNameInput.value = s.myName || "";
  state.dom.startHourInput.value = s.startHour;
  state.dom.endHourInput.value = s.endHour;

  const list = state.dom.playersList;
  list.innerHTML = "";

  const players = getPlayers();
  players.forEach((p, idx)=>{
    const row = document.createElement("div");
    row.className = "item";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<b>${escapeHTML(p.name)}</b><span>${p.id}</span>`;

    const actions = document.createElement("div");
    actions.className = "row gap";

    const edit = document.createElement("button");
    edit.className = "btn";
    edit.textContent = "Editar";
    edit.onclick = ()=>{
      const name = prompt("Nuevo nombre:", p.name);
      if(!name) return;
      players[idx].name = name.trim();
      setPlayers(players);
      renderSettings();
      state.actions.renderAvailability?.();
    };

    const del = document.createElement("button");
    del.className = "btn danger";
    del.textContent = "Borrar";
    del.onclick = ()=>{
      if(!confirm(`¿Borrar a ${p.name}?`)) return;
      players.splice(idx,1);
      setPlayers(players);
      renderSettings();
      state.actions.renderAvailability?.();
    };

    actions.append(edit, del);
    row.append(meta, actions);
    list.appendChild(row);
  });

  // repintar selects dependientes
  state.actions.renderAvailability?.();
}

function escapeHTML(s){
  return String(s).replace(/[<>&"]/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "\"":"&quot;" }[c]));
}
