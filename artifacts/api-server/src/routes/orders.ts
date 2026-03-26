import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return {
    id: o.id,
    userId: o.userId,
    restaurantId: o.restaurantId,
    restaurantName: o.restaurantName,
    status: o.status,
    totalAmount: o.totalAmount,
    deliveryFee: o.deliveryFee,
    deliveryAddress: o.deliveryAddress,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

function formatOrderItem(i: typeof orderItemsTable.$inferSelect) {
  return {
    id: i.id,
    orderId: i.orderId,
    menuItemId: i.menuItemId,
    name: i.name,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    imageUrl: i.imageUrl,
  };
}

router.get("/", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, userId)).orderBy(ordersTable.createdAt);
    res.json(orders.map(formatOrder).reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, restaurantId, deliveryAddress, deliveryFee, items, restaurantName } = req.body;
    const subtotal = items.reduce((sum: number, item: { unitPrice: number; quantity: number }) => sum + item.unitPrice * item.quantity, 0);
    const totalAmount = subtotal + (deliveryFee || 0);
    const orderId = genId();
    const now = new Date();

    const [order] = await db
      .insert(ordersTable)
      .values({
        id: orderId,
        userId,
        restaurantId,
        restaurantName: restaurantName || "Restaurant",
        status: "pending",
        totalAmount,
        deliveryFee: deliveryFee || 0,
        deliveryAddress,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const orderItems = items.map((item: { menuItemId: string; name: string; quantity: number; unitPrice: number; imageUrl?: string }) => ({
      id: genId(),
      orderId,
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      imageUrl: item.imageUrl || null,
    }));

    await db.insert(orderItemsTable).values(orderItems);

    res.status(201).json(formatOrder(order));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id)).limit(1);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, req.params.id));
    res.json({ ...formatOrder(order), items: items.map(formatOrderItem) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const [order] = await db
      .update(ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(ordersTable.id, req.params.id))
      .returning();
    res.json(formatOrder(order));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
