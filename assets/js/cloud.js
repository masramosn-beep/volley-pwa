import { firebaseConfig } from "./firebase-config.js";
import { loadLocalAccess, clearLocalAccess } from "./auth.js";
import {
  getSettings, setSettings,
  getPlayers, setPlayers,
  getEvents, setEvents,
  getAvailability, setAvailability,
  getRotations, setRotations
} from "./storage.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let db;
let started = false;
let unsub = [];

async function verifyTeamPassword(teamId, passHash){
  const secRef = doc(db, "teams", teamId, "meta", "security");
  const snap = await getDoc(secRef);
  if(!snap.exists()) return false;
  return snap.data().passHash === passHash;
}

async function seedIfMissing(teamId){
  const checks = [
    ["teamShared", ()=> {
      const s = getSettings();
      return { startHour: s.startHour, endHour: s.endHour, blocked: s.blocked || {} };
    }],
    ["players", ()=> getPlayers()],
    ["events", ()=> getEvents()],
    ["availability", ()=> getAvailability()],
    ["rotations", ()=> getRotations()]
  ];

  for(const [type, getPayload] of checks){
    const ref = doc(db, "teams", teamId, "snapshots", type);
    const snap = await getDoc(ref);
    if(!snap.exists()){
      await setDoc(ref, { payload: getPayload(), updatedAt: serverTimestamp() }, { merge:true });
    }
  }
}

function watch(state, teamId){
  const listen = (type, applyFn, afterFn) => {
    const ref = doc(db, "teams", teamId, "snapshots", type);
    unsub.push(onSnapshot(ref, (snap)=>{
      if(!snap.exists()) return;
      const remote = snap.data().payload;
      if(remote == null) return;

      window.__cloudApplying = true;
      try{ applyFn(remote); }
      finally{ window.__cloudApplying = false; }

      if(afterFn) afterFn();
    }));
  };

  listen("players", (p)=> setPlayers(p), ()=> state.actions?.renderAvailability?.());
  listen("events", (e)=> setEvents(e), ()=> state.actions?.renderCalendar?.());
  listen("availability", (a)=> setAvailability(a), ()=> state.actions?.renderAvailability?.());
  listen("rotations", (r)=> setRotations(r), ()=> {});

  listen("teamShared", (remote)=>{
    const local = getSettings();
    local.startHour = remote.startHour ?? local.startHour;
    local.endHour = remote.endHour ?? local.endHour;
    local.blocked = remote.blocked ?? local.blocked;
    setSettings(local);
  }, ()=>{
    state.actions?.renderAvailability?.();
    state.actions?.renderCalendar?.();
    state.renderBlockedGrid?.();
  });
}

export async function initCloud(state){
  if(started) return;

  const access = loadLocalAccess();
  if(!access?.teamId || !access?.passHash) return;

  const teamId = access.teamId;

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  db = getFirestore(app);

  await signInAnonymously(auth);

  const ok = await verifyTeamPassword(teamId, access.passHash);
  if(!ok){
    clearLocalAccess();
    throw new Error("PASSWORD_INVALID");
  }

  started = true;

  window.__cloudPush = async (type, payload) => {
    const ref = doc(db, "teams", teamId, "snapshots", type);
    await setDoc(ref, { payload, updatedAt: serverTimestamp() }, { merge:true });
  };

  watch(state, teamId);
  await seedIfMissing(teamId);
}

export function stopCloud(){
  unsub.forEach(fn=>{ try{ fn(); }catch{} });
  unsub = [];
  started = false;
  delete window.__cloudPush;
}
