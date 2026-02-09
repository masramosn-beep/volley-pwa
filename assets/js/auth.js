// assets/js/auth.js

export async function sha256Hex(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

export function saveLocalAccess(teamId, passHash){
  localStorage.setItem("volley.access.v1", JSON.stringify({ teamId, passHash }));
}

export function loadLocalAccess(){
  try{
    return JSON.parse(localStorage.getItem("volley.access.v1") || "null");
  }catch{
    return null;
  }
}

export function clearLocalAccess(){
  localStorage.removeItem("volley.access.v1");
}
