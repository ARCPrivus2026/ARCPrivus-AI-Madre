"use strict";

const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const router = express.Router();

const HF_API_KEY = process.env.HF_API_KEY;

router.post("/", async (req, res) => {
  try {

    const userMessage = req.body.message;

    if (!userMessage) {
      return res.json({ reply: "Mensaje vacío" });
    }

  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + HF_API_KEY
  },
  body: JSON.stringify({
    model: "meta-llama/Meta-Llama-3-8B-Instruct",
    messages: [
      {
        role: "system",
        content: "Eres ARC Privus AI Madre, una inteligencia artificial avanzada, profesional, clara y amable. Siempre ayudas con precisión."
      },
      {
        role: "user",
        content: userMessage
      }
    ],
    temperature: 0.7
  })
});