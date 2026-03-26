import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { restaurantsTable } from "./restaurants";

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  restaurantId: text("restaurant_id").notNull().references(() => restaurantsTable.id),
  restaurantName: text("restaurant_name").notNull(),
  status: text("status").notNull().default("pending"),
  totalAmount: real("total_amount").notNull(),
  deliveryFee: real("delivery_fee").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  menuItemId: text("menu_item_id").notNull(),
  name: text("name").notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  imageUrl: text("image_url"),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable);
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
