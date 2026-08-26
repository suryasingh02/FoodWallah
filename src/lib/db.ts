import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { orderEvents } from "@/lib/order-events";

export type MenuItem = {
  id: number;
  vendor_id: string | null;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: number;
  max_per_customer: number;
  max_per_day: number;
  ordered_today?: number;
};

type DatabaseGlobal = typeof globalThis & {
  restaurantDatabase?: Database.Database;
};

const databaseDirectory = process.env.SQLITE_DIR || path.join(process.cwd(), "data");
const databasePath = path.join(databaseDirectory, "restaurant.db");
const globalWithDatabase = globalThis as DatabaseGlobal;

function createDatabase() {
  fs.mkdirSync(databaseDirectory, { recursive: true });

  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      addresses_json TEXT,
      pickup_selected INTEGER DEFAULT 0,
      restaurant_open INTEGER DEFAULT 1,
      role TEXT DEFAULT 'customer',
      shop_name TEXT
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id TEXT,
      name TEXT,
      description TEXT,
      price REAL,
      category TEXT,
      image_url TEXT,
      is_available INTEGER DEFAULT 1,
      max_per_customer INTEGER DEFAULT 5,
      max_per_day INTEGER DEFAULT 50
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      items_json TEXT,
      total_amount REAL,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'pending',
      fulfillment_type TEXT DEFAULT 'delivery',
      vendor_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    database.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name")) {
      throw error;
    }
  }

  for (const column of ["email", "address"]) {
    try {
      database.exec(`ALTER TABLE users ADD COLUMN ${column} TEXT`);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes(`duplicate column name: ${column}`)) {
        throw error;
      }
    }
  }

  for (const [column, definition] of [["addresses_json", "TEXT"], ["pickup_selected", "INTEGER DEFAULT 0"]]) {
    try {
      database.exec(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes(`duplicate column name: ${column}`)) {
        throw error;
      }
    }
  }

  try {
    database.exec("ALTER TABLE users ADD COLUMN restaurant_open INTEGER DEFAULT 1");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name: restaurant_open")) throw error;
  }

  try {
    database.exec("ALTER TABLE menu_items ADD COLUMN vendor_id TEXT");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name: vendor_id")) throw error;
  }

  for (const [column, definition] of [["payment_status", "TEXT DEFAULT 'pending'"], ["fulfillment_type", "TEXT DEFAULT 'delivery'"]]) {
    try {
      database.exec(`ALTER TABLE orders ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes(`duplicate column name: ${column}`)) {
        throw error;
      }
    }
  }

  try {
    database.exec("ALTER TABLE orders ADD COLUMN vendor_id TEXT");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name: vendor_id")) throw error;
  }

  for (const [column, definition] of [["max_per_customer", "INTEGER DEFAULT 5"], ["max_per_day", "INTEGER DEFAULT 50"]]) {
    try {
      database.exec(`ALTER TABLE menu_items ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes(`duplicate column name: ${column}`)) throw error;
    }
  }

  try {
    database.exec("ALTER TABLE menu_items ADD COLUMN vendor_id TEXT");
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("duplicate column name: vendor_id")) throw error;
  }

  const menuCount = database.prepare("SELECT COUNT(*) AS count FROM menu_items").get() as { count: number };

  if (menuCount.count === 0) {
    const insertMenuItem = database.prepare(`
      INSERT INTO menu_items (name, description, price, category, image_url)
      VALUES (@name, @description, @price, @category, @image_url)
    `);
    const seedMenu = database.transaction(() => {
      [
        ["Paneer Tikka", "Charred cottage cheese, peppers, and a smoky house marinade.", 249, "Starters", "/images/paneer-tikka.jpg"],
        ["Butter Chicken Combo", "Creamy tomato curry with tender chicken and fragrant spices.", 329, "Main Course", "/images/butter-chicken.jpg"],
        ["Garlic Naan", "Clay-oven baked naan finished with garlic, butter, and herbs.", 60, "Breads", "/images/garlic-naan.jpg"],
        ["Dal Makhani", "Slow-cooked black lentils with butter and a gentle smoky finish.", 210, "Main Course", "/images/dal-makhani.jpg"],
        ["Gulab Jamun", "Soft milk dumplings soaked in warm cardamom sugar syrup.", 80, "Desserts & Drinks", "/images/gulab-jamun.jpg"],
      ].forEach(([name, description, price, category, image_url]) => {
        insertMenuItem.run({ name, description, price, category, image_url });
      });
    });

    seedMenu();
  }

  return database;
}

export const db = globalWithDatabase.restaurantDatabase ?? createDatabase();
globalWithDatabase.restaurantDatabase = db;

export function getMenu(vendorId?: string): MenuItem[] {
  return getAllMenu(vendorId).filter((item) => item.is_available === 1);
}

export function getAllMenu(vendorId?: string): MenuItem[] {
  const items = db.prepare(`SELECT id, vendor_id, name, description, price, category, image_url, is_available, max_per_customer, max_per_day FROM menu_items ${vendorId ? "WHERE vendor_id = ? OR vendor_id IS NULL" : ""} ORDER BY id`).all(...(vendorId ? [vendorId] : [])) as MenuItem[];
  const orders = db.prepare("SELECT items_json FROM orders WHERE date(created_at) = date('now', 'localtime')").all() as { items_json: string }[];
  const orderedToday = new Map<string, number>();

  orders.forEach(({ items_json }) => {
    try {
      (JSON.parse(items_json) as { name: string; quantity: number }[]).forEach((item) => {
        orderedToday.set(item.name, (orderedToday.get(item.name) ?? 0) + item.quantity);
      });
    } catch {
      // Ignore malformed legacy order payloads.
    }
  });

  return items.map((item) => ({ ...item, ordered_today: orderedToday.get(item.name) ?? 0 }));
}

export function addMenuItem(
  name: string,
  description: string,
  price: number,
  category: string,
  image_url: string,
  maxPerCustomer = 5,
  maxPerDay = 50,
  vendorId?: string,
): MenuItem {
  const result = db.prepare(`
    INSERT INTO menu_items (name, description, price, category, image_url, max_per_customer, max_per_day, vendor_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, description, price, category, image_url, maxPerCustomer, maxPerDay, vendorId ?? null);

  return db
    .prepare("SELECT id, vendor_id, name, description, price, category, image_url, is_available, max_per_customer, max_per_day FROM menu_items WHERE id = ?")
    .get(result.lastInsertRowid) as MenuItem;
}

export type VendorOrder = {
  id: string;
  customer_name: string;
  items_json: string;
  total_amount: number;
  status: string;
  payment_status: string;
  fulfillment_type: string;
  created_at: string;
};

export type Vendor = {
  id: string;
  name: string;
  shop_name: string | null;
  restaurant_open: number;
};

export function getVendors(): Vendor[] {
  return db.prepare("SELECT id, name, shop_name, restaurant_open FROM users WHERE role = 'vendor' ORDER BY shop_name, name").all() as Vendor[];
}

export function createOrder(customerId: string, items: unknown[], totalAmount: number, fulfillmentType: "pickup" | "delivery", orderNumber?: string, vendorId?: string) {
  const id = orderNumber?.replace(/^#/, "") || `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  db.prepare(`
    INSERT INTO orders (id, customer_id, items_json, total_amount, status, payment_status, fulfillment_type, vendor_id)
    VALUES (?, ?, ?, ?, 'pending', 'pending', ?, ?)
  `).run(id, customerId, JSON.stringify(items), totalAmount, fulfillmentType, vendorId ?? null);
  return id;
}

export function validateOrderLimits(items: unknown[]) {
  const menu = getAllMenu();
  const requestedItems = items as { name?: string; quantity?: number }[];

  for (const requested of requestedItems) {
    const quantity = requested.quantity ?? 0;
    const menuItem = menu.find((item) => item.name === requested.name);

    if (!menuItem || quantity <= 0) continue;
    if (quantity > menuItem.max_per_customer || (menuItem.ordered_today ?? 0) + quantity > menuItem.max_per_day) {
      return `${menuItem.name} reached max limit`;
    }
  }

  return null;
}

export function getVendorOrders(vendorId?: string): VendorOrder[] {
  return db.prepare(`
    SELECT orders.id, users.name AS customer_name, orders.items_json, orders.total_amount,
      orders.status, orders.payment_status, orders.fulfillment_type, orders.created_at
    FROM orders
    LEFT JOIN users ON users.id = orders.customer_id
    ${vendorId ? "WHERE orders.vendor_id = ? OR orders.vendor_id IS NULL" : ""}
    ORDER BY datetime(orders.created_at) DESC
  `).all(...(vendorId ? [vendorId] : [])) as VendorOrder[];
}

export function confirmOrderPayment(orderId: string) {
  const changed = db.prepare("UPDATE orders SET payment_status = 'confirmed' WHERE id = ?").run(orderId).changes > 0;
  if (changed) orderEvents.emit("order-updated", orderId);
  return changed;
}

const orderStatuses = ["received", "processing", "dispatched", "fulfilled"] as const;
export type OrderStatus = typeof orderStatuses[number];

export function advanceOrderStatus(orderId: string, nextStatus: OrderStatus) {
  const order = db.prepare("SELECT status, payment_status FROM orders WHERE id = ?").get(orderId) as { status: string; payment_status: string } | undefined;
  if (!order) return { ok: false, error: "Order not found." };
  if (nextStatus === "processing" && order.payment_status !== "confirmed") return { ok: false, error: "Confirm payment before processing this order." };

  const currentStatus = order.status === "pending" ? "received" : order.status;
  const currentIndex = orderStatuses.indexOf(currentStatus as OrderStatus);
  if (currentIndex < 0 || orderStatuses[currentIndex + 1] !== nextStatus) return { ok: false, error: "Order status can only move to the next stage." };

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(nextStatus, orderId);
  orderEvents.emit("order-updated", orderId);
  return { ok: true };
}

export function getCustomerOrder(orderId: string, customerId: string) {
  return db.prepare("SELECT id, items_json, total_amount, status, payment_status, fulfillment_type, created_at FROM orders WHERE id = ? AND customer_id = ?")
    .get(orderId, customerId) as { id: string; items_json: string; total_amount: number; status: string; payment_status: string; fulfillment_type: string; created_at: string } | undefined;
}

export function getRestaurantStatus() {
  const vendor = db.prepare("SELECT restaurant_open FROM users WHERE role = 'vendor' ORDER BY id LIMIT 1").get() as { restaurant_open: number } | undefined;
  return vendor ? Boolean(vendor.restaurant_open) : true;
}

export function updateMenuItem(id: number, name: string, description: string, price: number, category: string, image_url: string, maxPerCustomer: number, maxPerDay: number) {
  db.prepare("UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, image_url = ?, max_per_customer = ?, max_per_day = ? WHERE id = ?")
    .run(name, description, price, category, image_url, maxPerCustomer, maxPerDay, id);
}

export function deleteMenuItem(id: number) {
  db.prepare("DELETE FROM menu_items WHERE id = ?").run(id);
}

export function setMenuAvailability(id: number, isAvailable: boolean) {
  db.prepare("UPDATE menu_items SET is_available = ? WHERE id = ?").run(isAvailable ? 1 : 0, id);
}

export function setRestaurantStatus(userId: string, isOpen: boolean) {
  db.prepare("UPDATE users SET restaurant_open = ? WHERE id = ? AND role = 'vendor'").run(isOpen ? 1 : 0, userId);
}

export function getCustomerOrders(customerId: string) {
  return db.prepare("SELECT id, items_json, total_amount, status, payment_status, fulfillment_type, created_at FROM orders WHERE customer_id = ? ORDER BY datetime(created_at) DESC")
    .all(customerId) as { id: string; items_json: string; total_amount: number; status: string; payment_status: string; fulfillment_type: string; created_at: string }[];
}