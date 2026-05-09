import express from "express";

export default function chatRoutes(db) {
  const router = express.Router();

  // Obtener mensajes de una sala
  router.get("/:roomId/messages", async (req, res) => {
    const { roomId } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM messages WHERE room_id = ? ORDER BY created_at ASC",
      [roomId]
    );
    res.json(rows);
  });

  return router;
}
