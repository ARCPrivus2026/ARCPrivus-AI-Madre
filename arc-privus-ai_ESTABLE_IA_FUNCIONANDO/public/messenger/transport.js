export async function apiChat(message) {

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Error IA");
  }

  return data.reply;
}