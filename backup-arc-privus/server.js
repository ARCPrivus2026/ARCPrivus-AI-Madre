require("dotenv").config();

/* =========================
DEPENDENCIAS
========================= */
const OpenAI = require("openai");
const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/* =========================
CONFIG
========================= */
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

/* =========================
OPENAI
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =========================
MONGODB
========================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🟢 MongoDB conectado"))
  .catch(err => console.log("🔴 Error MongoDB:", err));

/* =========================
MODELOS
========================= */
const UserSchema = new mongoose.Schema({
  user: String,
  pass: String,
  plan: { type: String, default: "free" },
  createdAt: { type: Date, default: Date.now }
});

const ChatSchema = new mongoose.Schema({
  userId: String,
  name: String,
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  userId: String,
  chatId: String,
  role: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});

const MemorySchema = new mongoose.Schema({
  userId: String,
  type: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Chat = mongoose.model("Chat", ChatSchema);
const Message = mongoose.model("Message", MessageSchema);
const Memory = mongoose.model("Memory", MemorySchema);

/* =========================
MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
FRONTEND
========================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/messenger/v2/index.html"));
});

/* =========================
REGISTER
========================= */
app.post("/api/register", async (req, res) => {
  try {
    const { user, pass } = req.body;

    if (!user || !pass) {
      return res.json({ error: "Datos incompletos" });
    }

    const exists = await User.findOne({ user });
    if (exists) return res.json({ error: "Usuario ya existe" });

    await User.create({ user, pass });

    const chat = await Chat.create({
      userId: user,
      name: "AI Madre"
    });

    await Message.create({
      userId: user,
      chatId: chat._id,
      role: "ai",
      content: "Soy AI Madre. Estoy aquí para ayudarte. ¿Qué necesitas?"
    });

    res.json({ ok: true });

  } catch (err) {
    console.log("ERROR REGISTER:", err);
    res.json({ error: "Error registro" });
  }
});

/* =========================
LOGIN
========================= */
app.post("/api/login", async (req, res) => {
  try {
    const { user, pass } = req.body;

    const u = await User.findOne({ user, pass });

    if (!u) return res.json({ error: "Credenciales incorrectas" });

    res.json({ ok: true, user });

  } catch (err) {
    res.json({ error: "Error login" });
  }
});

/* =========================
PLAN
========================= */
app.get("/api/plan", async (req, res) => {
  const { userId } = req.query;
  const u = await User.findOne({ user: userId });

  res.json({ plan: u?.plan || "free" });
});

/* =========================
CHATS
========================= */
app.get("/api/chats", async (req, res) => {
  const { userId } = req.query;

  const chats = await Chat.find({ userId });
  res.json({ chats });
});

app.post("/api/chats", async (req, res) => {
  const { userId, name } = req.body;

  const chat = await Chat.create({
    userId,
    name: name || "Nuevo Chat"
  });

  res.json({ chat });
});

/* =========================
HISTORIAL
========================= */
app.get("/api/chat/history", async (req, res) => {
  const { userId, chatId } = req.query;

  const history = await Message.find({ userId, chatId })
    .sort({ timestamp: 1 });

  res.json({ history });
});

/* =========================
IA + MEMORIA + CONTROL
========================= */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, userId, chatId } = req.body;

    if (!message) {
      return res.json({ reply: "Mensaje vacío" });
    }

    const user = await User.findOne({ user: userId });

    /* límite free */
    if (user?.plan === "free") {
      const count = await Message.countDocuments({ userId });
      if (count > 50) {
        return res.json({
          reply: "Límite gratuito alcanzado. Pásate a premium 🔥"
        });
      }
    }

    await Message.create({
      userId,
      chatId,
      role: "user",
      content: message
    });

    const history = await Message.find({ userId, chatId })
      .sort({ timestamp: -1 })
      .limit(15);

    const memory = await Memory.find({ userId }).limit(5);

    const messages = [
      {
        role: "system",
        content: `Eres AI Madre. Inteligencia estratégica, emocional y poderosa.`
      },
      ...memory.map(m => ({
        role: "system",
        content: "Memoria: " + m.content
      })),
      ...history.reverse().map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      })),
      { role: "user", content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7
    });

    const reply = completion.choices[0].message.content;

    await Message.create({
      userId,
      chatId,
      role: "ai",
      content: reply
    });

    /* guardar memoria */
    if (message.toLowerCase().includes("quiero") || message.toLowerCase().includes("voy a")) {
      await Memory.create({
        userId,
        type: "decision",
        content: message
      });
    }

    io.to(chatId).emit("message", { user: message, ai: reply });

    res.json({ reply });

  } catch (err) {
    console.log("ERROR IA:", err);
    res.json({ reply: "Error IA" });
  }
});

/* =========================
STRIPE
========================= */
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { userId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "AI Madre Premium"
            },
            unit_amount: 500
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.DOMAIN}/success.html?user=${userId}`,
      cancel_url: `${process.env.DOMAIN}/cancel.html`
    });

    res.json({ url: session.url });

  } catch (err) {
    console.log("ERROR STRIPE:", err);
    res.status(500).send("Error pago");
  }
});

app.get("/api/success", async (req, res) => {
  const { user } = req.query;

  await User.updateOne({ user }, { plan: "premium" });

  res.send("✅ Ahora eres premium");
});

/* =========================
SOCKETS
========================= */
io.on("connection", (socket) => {
  socket.on("join", (chatId) => {
    socket.join(chatId);
  });
});

/* =========================
START
========================= */
server.listen(PORT, () => {
  console.log("🚀 http://localhost:" + PORT);
});