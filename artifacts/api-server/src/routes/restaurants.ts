import { Router } from "express";
import { db } from "@workspace/db";
import { restaurantsTable, menuItemsTable } from "@workspace/db/schema";
import { eq, ilike, and } from "drizzle-orm";

const router = Router();

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function formatRestaurant(r: typeof restaurantsTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    imageUrl: r.imageUrl,
    rating: r.rating,
    deliveryTime: r.deliveryTime,
    deliveryFee: r.deliveryFee,
    minOrder: r.minOrder,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
  };
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

router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query as { category?: string; search?: string };

    let query = db.select().from(restaurantsTable);
    const conditions = [];
    if (category) conditions.push(eq(restaurantsTable.category, category));
    if (search) conditions.push(ilike(restaurantsTable.name, `%${search}%`));
    
    let results;
    if (conditions.length > 0) {
      results = await query.where(and(...conditions));
    } else {
      results = await query;
    }

    res.json(results.map(formatRestaurant));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.id, req.params.id)).limit(1);
    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }

    const menuItems = await db.select().from(menuItemsTable).where(eq(menuItemsTable.restaurantId, req.params.id));

    res.json({ ...formatRestaurant(restaurant), menuItems: menuItems.map(formatMenuItem) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, category, imageUrl, deliveryTime, deliveryFee, minOrder, isActive } = req.body;
    const id = genId();
    const [restaurant] = await db
      .insert(restaurantsTable)
      .values({ id, name, description, category, imageUrl, deliveryTime, deliveryFee, minOrder, isActive: isActive ?? true })
      .returning();
    res.status(201).json(formatRestaurant(restaurant));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, description, category, imageUrl, deliveryTime, deliveryFee, minOrder, isActive } = req.body;
    const [restaurant] = await db
      .update(restaurantsTable)
      .set({ name, description, category, imageUrl, deliveryTime, deliveryFee, minOrder, isActive })
      .where(eq(restaurantsTable.id, req.params.id))
      .returning();
    res.json(formatRestaurant(restaurant));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(restaurantsTable).where(eq(restaurantsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
