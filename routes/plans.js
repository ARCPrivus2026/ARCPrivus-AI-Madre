import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    ok: true,
    plans: [
      {
        name: "ARC Básico",
        price: 0
      },
      {
        name: "ARC Premium",
        price: 10
      }
    ]
  });
});

export default router;