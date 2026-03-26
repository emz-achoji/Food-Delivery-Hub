import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, restaurantsTable, usersTable } from "@workspace/db/schema";
import { eq, gte, sql } from "drizzle-orm";

const router = Router();

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

router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [allOrders, allRestaurants, allUsers, pendingOrders, todayOrders] = await Promise.all([
      db.select().from(ordersTable),
      db.select().from(restaurantsTable),
      db.select().from(usersTable),
      db.select().from(ordersTable).where(eq(ordersTable.status, "pending")),
      db.select().from(ordersTable).where(gte(ordersTable.createdAt, today)),
    ]);

    const totalRevenue = allOrders
      .filter(o => o.status === "delivered")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const todayRevenue = todayOrders
      .filter(o => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({
      totalOrders: allOrders.length,
      totalRevenue,
      totalRestaurants: allRestaurants.length,
      totalUsers: allUsers.length,
      pendingOrders: pendingOrders.length,
      todayOrders: todayOrders.length,
      todayRevenue,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const { status } = req.query as { status?: string };

    let orders;
    if (status) {
      orders = await db.select().from(ordersTable).where(eq(ordersTable.status, status)).orderBy(ordersTable.createdAt);
    } else {
      orders = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
    }

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
        const user = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
        return {
          ...formatOrder(order),
          items: items.map(formatOrderItem),
          userName: user[0]?.name || "Unknown",
          userEmail: user[0]?.email || "",
        };
      })
    );

    res.json(ordersWithItems.reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
