require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const db = require("../database/db");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MEMORY_FILE = path.join(process.cwd(), "history.json");

// ======================
// GOOGLE LOGIN
// ======================

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "dummy",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy",
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
    },

    function (accessToken, refreshToken, profile, done) {

      const email = profile?.emails?.[0]?.value || "";
      const name = profile?.displayName || "Usuario";

      const userId = email.replace(/[^a-zA-Z0-9]/g, "_");

      const mem = loadMemory();

      if (!mem.users[userId]) {

        mem.users[userId] = {
          name,
          email,
          created: Date.now(),
          items: [],
          summary: ""
        };

        saveMemory(mem);
      }

      return done(null, { userId, email, name });

    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));


// ======================
// MEMORIA IA
// ======================

function loadMemory() {

  try {

    if (!fs.existsSync(MEMORY_FILE)) {
      return { users: {} };
    }

    const raw = fs.readFileSync(MEMORY_FILE, "utf-8");

    if (!raw.trim()) {
      return { users: {} };
    }

    return JSON.parse(raw);

  } catch (err) {

    console.error("Error cargando memoria:", err);

    return { users: {} };

  }

}

function saveMemory(mem) {

  try {

    fs.writeFileSync(
      MEMORY_FILE,
      JSON.stringify(mem, null, 2),
      "utf-8"
    );

  } catch (err) {

    console.error("Error guardando memoria:", err);

  }

}


// ======================
// IA CHAT
// ======================

router.post("/chat", async (req, res) => {

  try {

    let message = String(req.body?.message || "").trim();

    if (!message) {

      return res.json({
        ok: false,
        reply: "Mensaje vacío."
      });

    }

    // limitar tamaño de mensaje
    if (message.length > 1000) {
      message = message.substring(0, 1000);
    }

    const response = await client.chat.completions.create({

      model: process.env.OPENAI_MODEL || "gpt-4o-mini",

      messages: [

        {
          role: "system",
          content:
            "Eres ARC Privus AI Madre. Responde en español, claro, útil, directo, con tono profesional y humano."
        },

        {
          role: "user",
          content: message
        }

      ]

    });

    const reply =
      response?.choices?.[0]?.message?.content ||
      "Sin respuesta.";

    res.json({
      ok: true,
      reply
    });

  } catch (e) {

    console.error("Error IA:", e);

    res.status(500).json({
      ok: false,
      reply: "Hubo un problema procesando tu mensaje."
    });

  }

});


// ======================
// REGISTRO AUTOMÁTICO
// ======================

router.post("/register", (req, res) => {

  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim();

  if (!name) {

    return res.json({
      ok: false,
      success: false,
      error: "Falta nombre."
    });

  }

  db.get(

    "SELECT * FROM users WHERE name = ?",
    [name],

    (err, row) => {

      if (err) {

        console.error(err);

        return res.json({
          ok: false,
          success: false,
          error: "Error buscando usuario."
        });

      }

      if (row) {

        return res.json({
          ok: true,
          success: true,
          user: row
        });

      }

      const avatar = "/messenger/assets/default-avatar.png";

      db.run(

        "INSERT INTO users (name, email, avatar, status) VALUES (?, ?, ?, ?)",

        [name, email, avatar, "offline"],

        function (err) {

          if (err) {

            console.error(err);

            return res.json({
              ok: false,
              success: false,
              error: "Error registrando usuario."
            });

          }

          res.json({

            ok: true,
            success: true,

            user: {
              id: this.lastID,
              name,
              email,
              avatar,
              status: "offline"
            }

          });

        }

      );

    }

  );

});


// ======================
// LISTA DE USUARIOS
// ======================

router.get("/users", (req, res) => {

  db.all(

    "SELECT id, name, email, avatar, status FROM users ORDER BY name ASC",

    [],

    (err, rows) => {

      if (err) {

        console.error(err);

        return res.json({
          ok: false,
          users: []
        });

      }

      res.json({
        ok: true,
        users: rows
      });

    }

  );

});


// ======================
// GOOGLE LOGIN
// ======================

router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

router.get(

  "/auth/google/callback",

  passport.authenticate("google", {
    failureRedirect: "/"
  }),

  (req, res) => {

    res.send(`

      <h2>Login exitoso</h2>
      <p>Bienvenido ${req.user.name}</p>

    `);

  }

);

module.exports = router;