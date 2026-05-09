// server.js
// ARC Privus AI Madre - Plataforma de Mensajería con MySQL


import express from "express";
import dotenv from "dotenv";
dotenv.config();
import http from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import cors from "cors";
import db from "./config/db.js"; // conexión centralizada


// Rutas
import chatRoutes from "./routes/chat.js";
import userRoutes from "./routes/users.js";
import planRoutes from "./routes/plans.js";
import aiRoutes from "./routes/ai.js";
import mediaRoutes from "./routes/media.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Rutas principales
app.use("/api/chat", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/media", mediaRoutes);

// Socket.io para mensajería en tiempo real
io.on("connection", (socket) => {
  console.log("🔌 Usuario conectado:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`📡 Usuario ${socket.id} se unió a la sala ${roomId}`);
  });

  socket.on("sendMessage", async ({ roomId, userId, message }) => {
    await db.query(
      "INSERT INTO messages (room_id, user_id, content, created_at) VALUES (?, ?, ?, NOW())",
      [roomId, userId, message]
    );
    io.to(roomId).emit("newMessage", { userId, message, timestamp: new Date() });
  });

  socket.on("disconnect", () => {
    console.log("❌ Usuario desconectado:", socket.id);
  });
});

// Arranque del servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 ARC Privus AI Madre corriendo en http://localhost:${PORT}`);
});
