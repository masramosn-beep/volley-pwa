const LS_KEYS = {
  settings: "volley.settings.v1",
  players: "volley.players.v1",
  events: "volley.events.v1",
  availability: "volley.availability.v1",
  rotations: "volley.rotations.v1",
  theme: "volley.theme.v1"
};

export function uid(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}

export function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function getSettings(){
  return loadJSON(LS_KEYS.settings, {
    myName: "Yo",
    startHour: 8,
    endHour: 23,
    // blocked[dayIndex][hour] = true
    blocked: {} // e.g. { "0": { "18": true, "19": true }, "2": { "20": true } }
  });
}

export function setSettings(s){
  saveJSON(LS_KEYS.settings, s);

  // Solo sincronizamos lo compartido (no el nombre personal)
  if(window.__cloudPush && !window.__cloudApplying){
    const teamShared = {
      startHour: s.startHour,
      endHour: s.endHour,
      blocked: s.blocked || {}
    };
    window.__cloudPush("teamShared", teamShared);
  }
}


export function getPlayers(){
  return loadJSON(LS_KEYS.players, [
    { id: "p1", name: "Tú" },
    { id: "p2", name: "Alex" },
    { id: "p3", name: "Marta" },
    { id: "p4", name: "Pau" },
    { id: "p5", name: "Núria" },
    { id: "p6", name: "Javi" },
    { id: "p7", name: "Lara" }
  ]);
}

export function setPlayers(p){
  saveJSON(LS_KEYS.players, p);
  if(window.__cloudPush && !window.__cloudApplying){
    window.__cloudPush("players", p);
  }
}


export function getEvents(){
  return loadJSON(LS_KEYS.events, [
    {
      id: "e1",
      type: "match",
      title: "Vs Redbirds",
      date: new Date().toISOString().slice(0,10),
      start: "14:00",
      end: "15:30",
      place: "Pabellón UIB",
      notes: "Quedamos 13:15"
    },
    {
      id: "e2",
      type: "training",
      title: "Entreno técnico",
      date: new Date(Date.now()+2*86400000).toISOString().slice(0,10),
      start: "20:00",
      end: "21:30",
      place: "CampusEsport",
      notes: ""
    }
  ]);
}

export function setEvents(e){
  saveJSON(LS_KEYS.events, e);
  if(window.__cloudPush && !window.__cloudApplying){
    window.__cloudPush("events", e);
  }
}


export function getAvailability(){
  // availability[weekStartISO][playerId][dayIndex][hour] = 0..3
  return loadJSON(LS_KEYS.availability, {});
}

export function setAvailability(a){
  saveJSON(LS_KEYS.availability, a);
  if(window.__cloudPush && !window.__cloudApplying){
    window.__cloudPush("availability", a);
  }
}

export function getRotations(){
  // rotations[name] = { set1:{1:pid,...6}, set2:{...}, updatedAt }
  return loadJSON(LS_KEYS.rotations, {});
}

export function setRotations(r){
  saveJSON(LS_KEYS.rotations, r);
  if(window.__cloudPush && !window.__cloudApplying){
    window.__cloudPush("rotations", r);
  }
}


export function getTheme(){
  return localStorage.getItem(LS_KEYS.theme) || "dark";
}
export function setTheme(t){
  localStorage.setItem(LS_KEYS.theme, t);
}

