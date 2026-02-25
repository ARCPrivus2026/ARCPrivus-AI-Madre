import express from "express";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/api/chat", (req, res) => {
  const { message } = req.body;

  res.json({
    reply: ARC recibió tu mensaje: "${message}"
  });
});

app.listen(PORT, () => {
  console.log(Servidor corriendo en http://localhost:${PORT});
});