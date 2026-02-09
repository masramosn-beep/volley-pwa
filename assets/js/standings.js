import { el } from "./ui.js";

export async function initStandings(state){
  async function load(){
    const updated = state.dom.standingsUpdatedLabel;
    const thead = state.dom.standingsTable.querySelector("thead");
    const tbody = state.dom.standingsTable.querySelector("tbody");
    thead.innerHTML = "";
    tbody.innerHTML = "";

    try{
      const res = await fetch("./data/standings.json", { cache:"no-store" });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      updated.textContent = data.updatedAt
        ? `Última actualización: ${new Date(data.updatedAt).toLocaleString("es-ES")}`
        : "Sin timestamp";

      // headers
      const headers = data.headers || ["Pos","Equipo","Pts","PJ","PG","PP","F","C","D"];
      thead.appendChild(el("tr",{}, headers.map(h=> el("th",{},[h]))));

      // rows
      (data.rows||[]).forEach(r=>{
        const tr = el("tr");
        r.forEach((cell)=> tr.appendChild(el("td",{},[String(cell)])));
        tbody.appendChild(tr);
      });

    }catch(e){
      updated.textContent = "No se pudo cargar standings.json (offline o no existe).";
      tbody.appendChild(el("tr",{},[
        el("td",{colspan:"10"},["Error cargando clasificación."])
      ]));
    }
  }

  state.actions.renderStandings = load;
  state.dom.refreshStandingsBtn.addEventListener("click", load);
  await load();
}
