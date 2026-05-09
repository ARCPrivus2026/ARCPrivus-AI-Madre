const socket = io();

function addMessage(text, sender) {
    const container = document.getElementById("chatContainer");

    const message = document.createElement("div");
    message.classList.add("message");

    if (sender === "user") {
        message.classList.add("user");
    } else {
        message.classList.add("bot");
    }

    message.innerText = text;
    container.appendChild(message);

    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();

    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    // indicador de IA
    const typing = document.createElement("div");
    typing.classList.add("message", "bot");
    typing.innerText = "AI Madre está pensando...";
    document.getElementById("chatContainer").appendChild(typing);

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: text,
                userId: "usuario"
            })
        });

        const data = await res.json();

        typing.remove();
        addMessage(data.reply || "Sin respuesta", "bot");

    } catch (error) {
        typing.remove();
        addMessage("Error conectando con IA Madre", "bot");
    }
}
async function generarImagen() {
    const prompt = prompt("¿Qué imagen quieres generar?");
    if (!prompt) return;

    const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    if (data.url) {
        window.open(data.url, "_blank");
    } else {
        alert("No se pudo generar la imagen");
    }
}
async function generarVideo() {
    alert("Función en desarrollo (próximamente)");
}
async function estadoIA() {
    const res = await fetch("/api/ping");
    const data = await res.json();

    alert("Estado: " + data.status);
}