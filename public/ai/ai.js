document.addEventListener("DOMContentLoaded", () => {

    const chatBox = document.getElementById("chatBox");
    const input = document.getElementById("inputMessage");
    const btnEnviar = document.getElementById("btnEnviar");

    const userId = "usuario_web";

    function agregarMensaje(texto, tipo) {
        const div = document.createElement("div");
        div.className = "msg " + tipo;
        div.innerText = texto;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Cargar historial
    async function cargarHistorial() {
        const res = await fetch(`/api/chat/history?userId=${userId}`);
        const data = await res.json();

        data.history.forEach(msg => {
            agregarMensaje(msg.content, msg.role === "user" ? "user" : "ai");
        });
    }

    btnEnviar.addEventListener("click", async () => {

        const mensaje = input.value.trim();
        if (!mensaje) return;

        agregarMensaje(mensaje, "user");
        input.value = "";

        agregarMensaje("Pensando...", "ai");

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: mensaje,
                    userId
                })
            });

            const data = await res.json();

            chatBox.lastChild.remove(); // quitar "Pensando..."
            agregarMensaje(data.reply, "ai");

        } catch {
            agregarMensaje("Error conectando con IA", "ai");
        }
    });

    cargarHistorial();

});