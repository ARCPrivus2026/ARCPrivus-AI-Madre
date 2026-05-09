import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    ok: true,
    ai: "ARC Privus AI Madre activa"
  });
});

export default router;