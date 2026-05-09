import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Ruta media ARC Privus activa"
  });
});

export default router;