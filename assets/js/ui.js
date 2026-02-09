export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }

export function fmtMonthLabel(d){
  return d.toLocaleDateString("es-ES", { month:"long", year:"numeric" })
    .replace(/^./, c => c.toUpperCase());
}

export function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

export function startOfWeekMonday(date){
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  d.setDate(d.getDate() - day);
  d.setHours(0,0,0,0);
  return d;
}

export function isoDate(d){
  return new Date(d).toISOString().slice(0,10);
}

export function addDays(d, n){
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function hourLabel(h){
  return `${String(h).padStart(2,"0")}:00`;
}

export function el(tag, attrs={}, children=[]){
  const e = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k === "class") e.className = v;
    else if(k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if(k === "html") e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  for(const c of children){
    if(typeof c === "string") e.appendChild(document.createTextNode(c));
    else if(c) e.appendChild(c);
  }
  return e;
}

export function downloadBlob(filename, blob){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
