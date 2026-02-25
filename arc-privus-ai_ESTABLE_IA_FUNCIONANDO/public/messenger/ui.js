export function setStatus(txt){
  const el = document.getElementById("statusText");
  if(el) el.textContent = txt;
}

export function setBrandSub(txt){
  const el = document.getElementById("brandSub");
  if(el) el.textContent = txt;
}

export function clearChat(chatEl){
  chatEl.innerHTML = "";
}

export function addMessage(chatEl, who, text, opts = {}){
  const row = document.createElement("div");
  row.className = "msgRow " + (who === "user" ? "user" : "ai");

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if(opts.image){
    const p = document.createElement("div");
    p.textContent = text || "";
    p.style.marginBottom = "8px";
    bubble.appendChild(p);

    const img = document.createElement("img");
    img.src = opts.image;
    img.style.maxWidth = "320px";
    img.style.borderRadius = "14px";
    img.style.border = "1px solid rgba(255,255,255,.10)";
    img.style.display = "block";
    bubble.appendChild(img);
  }else{
    bubble.textContent = text;
  }

  row.appendChild(bubble);

  // meta / ticks
  if(who === "user"){
    const metaRow = document.createElement("div");
    metaRow.className = "metaRow";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = hora();

    const ticks = document.createElement("div");
    ticks.className = "ticks";
    ticks.textContent = opts.ticks || "✓";

    metaRow.appendChild(meta);
    metaRow.appendChild(ticks);

    bubble.appendChild(metaRow);
    row.dataset.isUser = "1";
  }

  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
  return row;
}

export function markLastUserSeen(chatEl, seen){
  const rows = Array.from(chatEl.querySelectorAll(".msgRow"));
  const lastUser = [...rows].reverse().find(r => r.dataset.isUser === "1");
  if(!lastUser) return;

  const ticks = lastUser.querySelector(".ticks");
  if(!ticks) return;

  ticks.textContent = seen ? "✓✓" : "✓";
  ticks.classList.toggle("seen", !!seen);
}

function hora(){
  const d = new Date();
  let h = d.getHours();
  let m = d.getMinutes();
  if(m < 10) m = "0" + m;
  return `${h}:${m}`;
}