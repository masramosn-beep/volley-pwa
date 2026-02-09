import { el, isoDate, fmtMonthLabel } from "./ui.js";
import { uid, getEvents, setEvents } from "./storage.js";

export function initCalendar(state){
  const grid = state.dom.calendarGrid;
  const monthLabel = state.dom.monthLabel;

  function render(){
    grid.innerHTML = "";

    const view = new Date(state.calendarView);
    view.setDate(1);
    monthLabel.textContent = fmtMonthLabel(view);

    const firstDay = new Date(view);
    const startDayIndex = (firstDay.getDay() + 6) % 7; // Mon=0
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - startDayIndex);

    // headers
    const heads = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
    for(const h of heads) grid.appendChild(el("div",{class:"cal-head"},[h]));

    const events = getEvents();
    const byDate = groupByDate(events);

    for(let i=0;i<42;i++){
      const day = new Date(start);
      day.setDate(start.getDate()+i);
      const dISO = isoDate(day);
      const isOut = day.getMonth() !== view.getMonth();

      const box = el("div",{class:`day ${isOut?"out":""}`});
      box.appendChild(el("div",{class:"dnum"},[String(day.getDate())]));

      const evs = byDate[dISO] || [];
    
      // --- NUEVO: marcar el día según tipo de evento (prioridad partido) ---
const hasMatch = evs.some(ev => ev.type === "match");
const hasTraining = !hasMatch && evs.some(ev => ev.type === "training");

if(hasMatch) box.classList.add("match-day");
else if(hasTraining) box.classList.add("training-day");

// emoji en el número del día
if(hasMatch || hasTraining){
  const dnum = box.querySelector(".dnum");
  dnum.appendChild(el("span",{class:"day-emoji"},[hasMatch ? "🏆" : "🏐"]));
}

box.addEventListener("click", ()=>{
  state.selectedDate = dISO;
  openDaySheet(dISO);
});

      grid.appendChild(box);
    }

  
  }

  function renderDayList(){
    const label = state.dom.dayEventsLabel;
    const list = state.dom.dayEventsList;
    const dISO = state.selectedDate;

    list.innerHTML = "";
    if(!dISO){
      label.textContent = "Selecciona un día…";
      return;
    }

    const events = getEvents().filter(e=>e.date === dISO)
      .sort((a,b)=>(a.start||"").localeCompare(b.start||""));

    label.textContent = `${dISO} · ${events.length} evento(s)`;

    for(const ev of events){
      const item = el("div",{class:"item"});
      const meta = el("div",{class:"meta"},[
        el("b",{},[ev.title]),
        el("span",{},[
          `${ev.type==="match"?"Partido":"Entreno"} · ${ev.start||"--:--"}–${ev.end||"--:--"} · ${ev.place||""}`
        ]),
        ev.notes ? el("span",{},[ev.notes]) : null
      ]);
      const right = el("div",{},[
        el("span",{class:`tag pill ${ev.type}`},[ev.type==="match"?"Partido":"Entreno"])
      ]);
      item.append(meta,right);
      item.addEventListener("click", ()=> state.openEventModal(ev.id));
      list.appendChild(item);
    }
  }

  
  
  function openDaySheet(dISO){
  const modal = state.dom.dayInfoModal;
  const title = state.dom.dayInfoTitle;
  const list = state.dom.dayInfoList;

  list.innerHTML = "";

  const events = getEvents().filter(e=>e.date === dISO)
    .sort((a,b)=>(a.start||"").localeCompare(b.start||""));

  title.textContent = `${dISO} · ${events.length} evento(s)`;

  if(events.length === 0){
    list.appendChild(el("div",{class:"muted"},["No hay eventos este día."]));
  }else{
    for(const ev of events){
      const item = el("div",{class:"item"});
      const meta = el("div",{class:"meta"},[
        el("b",{},[ev.title]),
        el("span",{},[
          `${ev.type==="match"?"Partido":"Entreno"} · ${ev.start||"--:--"}–${ev.end||"--:--"} · ${ev.place||""}`
        ]),
        ev.notes ? el("span",{},[ev.notes]) : null
      ]);
      const right = el("div",{},[
        el("span",{class:`tag pill ${ev.type}`},[ev.type==="match"?"Partido":"Entreno"])
      ]);
      item.append(meta,right);
      item.addEventListener("click", ()=> state.openEventModal(ev.id));
      list.appendChild(item);
    }
  }

  modal.classList.remove("hidden");
}


  
  state.actions.renderCalendar = render;

  // modal hooks
  state.openEventModal = (eventId=null)=>{
    const modal = state.dom.eventModal;
    const title = state.dom.eventModalTitle;
    const delBtn = state.dom.deleteEventBtn;

    let ev = null;
    if(eventId){
      ev = getEvents().find(x=>x.id===eventId) || null;
      title.textContent = "Editar evento";
      delBtn.style.display = "inline-flex";
    }else{
      title.textContent = "Nuevo evento";
      delBtn.style.display = "none";
    }

    state.editingEventId = eventId;

    const nowDate = state.selectedDate || isoDate(new Date());
    state.dom.eventTypeInput.value = ev?.type || "match";
    state.dom.eventTitleInput.value = ev?.title || "";
    state.dom.eventDateInput.value = ev?.date || nowDate;
    state.dom.eventStartInput.value = ev?.start || "20:00";
    state.dom.eventEndInput.value = ev?.end || "21:30";
    state.dom.eventPlaceInput.value = ev?.place || "";
    state.dom.eventNotesInput.value = ev?.notes || "";

    modal.classList.remove("hidden");
  };

  state.closeEventModal = ()=>{
    state.dom.eventModal.classList.add("hidden");
    state.editingEventId = null;
  };

  state.saveEventFromModal = ()=>{
    const events = getEvents();
    const id = state.editingEventId || uid("ev");

    const ev = {
      id,
      type: state.dom.eventTypeInput.value,
      title: state.dom.eventTitleInput.value.trim() || "(Sin título)",
      date: state.dom.eventDateInput.value,
      start: state.dom.eventStartInput.value,
      end: state.dom.eventEndInput.value,
      place: state.dom.eventPlaceInput.value.trim(),
      notes: state.dom.eventNotesInput.value.trim()
    };

    const idx = events.findIndex(x=>x.id===id);
    if(idx>=0) events[idx]=ev; else events.push(ev);

    setEvents(events);
    state.selectedDate = ev.date;
    state.closeEventModal();
    render();
  };

  state.deleteEventFromModal = ()=>{
    if(!state.editingEventId) return;
    const events = getEvents().filter(x=>x.id!==state.editingEventId);
    setEvents(events);
    state.closeEventModal();
    render();
  };

  render();
}

function groupByDate(events){
  const out = {};
  for(const e of events){
    (out[e.date] ||= []).push(e);
  }
  return out;
}



