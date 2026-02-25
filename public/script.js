async function sendMessage() {
  const input = document.getElementById("messageInput");
  const chat = document.getElementById("chat");

  const message = input.value.trim();
  if (!message) return;

  const userDiv = document.createElement("div");
  userDiv.className = "user-message";
  userDiv.innerText = message;
  chat.appendChild(userDiv);

  input.value = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    const aiDiv = document.createElement("div");
    aiDiv.className = "ai-message";
    aiDiv.innerText = data.reply;
    chat.appendChild(aiDiv);

  } catch (error) {
    console.error(error);
  }
}