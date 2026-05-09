const btn = document.getElementById("registerBtn");
const msg = document.getElementById("msg");

btn.onclick = async () => {

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const accept = document.getElementById("accept").checked;

  if (!name || !email || !accept) {
    msg.textContent = "Completa los datos y acepta términos";
    return;
  }

  try {

    const res = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email })
    });

    const data = await res.json();

    if (data.success) {

      // guardar usuario local
      localStorage.setItem("arcUser", name);
      localStorage.setItem("arcEmail", email);

      msg.textContent = "Registro exitoso";

      setTimeout(() => {
        window.location.href = "/messenger/v2/";
      }, 1500);

    } else {
      msg.textContent = data.error;
    }

  } catch (err) {

    msg.textContent = "Error de conexión";

  }

};