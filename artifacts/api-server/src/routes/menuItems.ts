import { Router } from "express";
import { db } from "@workspace/db";
import { menuItemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function formatMenuItem(m: typeof menuItemsTable.$inferSelect) {
  return {
    id: m.id,
    restaurantId: m.restaurantId,
    name: m.name,
    description: m.description,
    price: m.price,
    imageUrl: m.imageUrl,
    category: m.category,
    isAvailable: m.isAvailable,
    createdAt: m.createdAt.toISOString(),
  };
}

router.post("/", async (req, res) => {
  try {
    const { restaurantId, name, description, price, imageUrl, category, isAvailable } = req.body;
    const id = genId();
    const [item] = await db
      .insert(menuItemsTable)
      .values({ id, restaurantId, name, description, price, imageUrl, category, isAvailable: isAvailable ?? true })
      .returning();
    res.status(201).json(formatMenuItem(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { restaurantId, name, description, price, imageUrl, category, isAvailable } = req.body;
    const [item] = await db
      .update(menuItemsTable)
      .set({ restaurantId, name, description, price, imageUrl, category, isAvailable })
      .where(eq(menuItemsTable.id, req.params.id))
      .returning();
    res.json(formatMenuItem(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
