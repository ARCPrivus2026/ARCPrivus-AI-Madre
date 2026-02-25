document.addEventListener("DOMContentLoaded", () => {

  const chatList = document.getElementById("chatList");
  const messages = document.getElementById("messages");
  const emptyState = document.getElementById("emptyState");

  const activeName = document.getElementById("activeName");
  const activeSub = document.getElementById("activeSub");

  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");

  const btnMenu = document.getElementById("btnMenu");
  const menuDropdown = document.getElementById("menuDropdown");

  const searchInput = document.getElementById("searchInput");
  const chips = document.querySelectorAll(".chip");

  // ======================
  // DATOS DEMO
  // ======================

  let chats = [
    { id: "c1", name: "Natalia", type: "contact", last: "¿Listo el diseño 2.0?", time: "19:55", unread: 2, online: true, messages: [
      { from:"them", text:"¿Listo el diseño 2.0?", time:"19:55", checks:"" }
    ]},
    { id: "c2", name: "Grupo ARC Privus", type: "group", last: "Revisar logo y fondo", time: "18:40", unread: 0, online: false, messages: [
      { from:"them", text:"Revisar logo y fondo", time:"18:40", checks:"" }
    ]},
    { id: "c3", name: "Asistente (IA)", type: "contact", last: "Pregúntame lo que quieras.", time: "17:10", unread: 0, online: true, messages: [
      { from:"them", text:"Pregúntame lo que quieras.", time:"17:10", checks:"" }
    ]},
  ];

  let activeChatId = null;
  let activeFilter = "all";

  // ======================
  // UTILIDADES
  // ======================

  function escapeHtml(str){
    return str.replace(/[&<>"']/g, m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#039;"
    })[m]);
  }

  function nowTime(){
    const now = new Date();
    const hh = String(now.getHours()).padStart(2,"0");
    const mm = String(now.getMinutes()).padStart(2,"0");
    return `${hh}:${mm}`;
  }

  // ======================
  // RENDER CHAT LIST
  // ======================

  function renderChatList(){

    const q = (searchInput.value || "").toLowerCase().trim();

    let filtered = chats.filter(c => c.name.toLowerCase().includes(q));

    if (activeFilter === "unread") filtered = filtered.filter(c => c.unread > 0);
    if (activeFilter === "groups") filtered = filtered.filter(c => c.type === "group");

    chatList.innerHTML = filtered.map(c => {

      const isActive = c.id === activeChatId;

      return `
        <div class="chat-item ${isActive ? "active" : ""}" data-id="${c.id}">
          <div class="avatar"></div>
          <div class="chat-meta">
            <div class="chat-name">${escapeHtml(c.name)}</div>
            <div class="chat-last">${escapeHtml(c.last)}</div>
          </div>
          <div class="chat-right">
            <div class="chat-time">${escapeHtml(c.time)}</div>
            ${c.unread > 0 ? `<div class="badge">${c.unread}</div>` : ``}
          </div>
        </div>
      `;
    }).join("");

    chatList.querySelectorAll(".chat-item").forEach(item => {
      item.addEventListener("click", () => openChat(item.dataset.id));
    });
  }

  // ======================
  // ABRIR CHAT
  // ======================

  function openChat(chatId){

    activeChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    chat.unread = 0;

    activeName.textContent = chat.name;
    activeSub.textContent = chat.online ? "En línea" : "Visto recientemente";

    emptyState.style.display = "none";

    renderMessages(chat);
    renderChatList();
    messages.scrollTop = messages.scrollHeight;
  }

  // ======================
  // RENDER MENSAJES
  // ======================

  function renderMessages(chat){

    const html = chat.messages.map(m => {

      const checks = m.from === "me"
        ? `<span class="checks">${m.checks || "✓✓"}</span>`
        : "";

      return `
        <div class="bubble ${m.from === "me" ? "me" : "them"}">
          <div>${escapeHtml(m.text)}</div>
          <div class="meta">
            <span>${escapeHtml(m.time)}</span>
            ${checks}
          </div>
        </div>
      `;
    }).join("");

    messages.innerHTML = html;
  }

  // ======================
  // ENVIAR MENSAJE
  // ======================

  async function sendMessage(){

    if (!activeChatId) return;

    const txt = messageInput.value.trim();
    if (!txt) return;

    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    const time = nowTime();

    // Agregar mensaje del usuario
    chat.messages.push({
      from:"me",
      text: txt,
      time,
      checks:"✓✓"
    });

    chat.last = txt;
    chat.time = time;

    messageInput.value = "";

    renderMessages(chat);
    renderChatList();
    messages.scrollTop = messages.scrollHeight;

    // ======================
    // SOLO SI ES IA
    // ======================

    if (chat.name === "Asistente (IA)") {

      try {

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ message: txt })
        });

        const data = await response.json();

        const replyTime = nowTime();

        chat.messages.push({
          from:"them",
          text: data.reply || "Sin respuesta.",
          time: replyTime
        });

        chat.last = data.reply || "Sin respuesta.";
        chat.time = replyTime;

        renderMessages(chat);
        renderChatList();
        messages.scrollTop = messages.scrollHeight;

      } catch (err) {
        console.error("Error IA:", err);
      }
    }
  }

  // ======================
  // EVENTOS
  // ======================

  sendBtn.addEventListener("click", sendMessage);

  messageInput.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });

  chips.forEach(ch => ch.addEventListener("click", () => {
    chips.forEach(x => x.classList.remove("active"));
    ch.classList.add("active");
    activeFilter = ch.dataset.filter;
    renderChatList();
  }));

  searchInput.addEventListener("input", renderChatList);

  btnMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    menuDropdown.hidden = !menuDropdown.hidden;
  });

  document.addEventListener("click", () => menuDropdown.hidden = true);

  // ======================
  // INIT
  // ======================

  renderChatList();

});