import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export type UserRole = "customer" | "vendor";

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  addresses: string[];
  phone: string | null;
  pickupSelected: boolean;
  restaurantOpen: boolean;
  role: UserRole;
  shop_name: string | null;
};

type StoredUser = Omit<AuthUser, "addresses" | "pickupSelected" | "restaurantOpen"> & {
  addresses_json: string | null;
  password_hash: string;
  pickup_selected: number;
  restaurant_open: number;
};

const SESSION_COOKIE = "juniper-stone-session";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "juniper-stone-development-secret";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");

  if (!salt || !key) return false;

  const expected = Buffer.from(key, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signSession(user: AuthUser) {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function readSession(value: string): AuthUser | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as AuthUser;
  } catch {
    return null;
  }
}

export function createUser(name: string, password: string, role: UserRole, email = "", address = "", phone = "", shopName = "") {
  const identifier = email.trim().toLowerCase() || phone.trim();

  if (!identifier) {
    throw new Error("An email address or mobile number is required to create a user.");
  }

  const user: AuthUser = {
    address: address.trim() || null,
    addresses: address.trim() ? [address.trim()] : [],
    email: email.trim() || null,
    id: identifier,
    name: name.trim(),
    phone: phone.trim() || null,
    pickupSelected: false,
    restaurantOpen: true,
    role,
    shop_name: role === "vendor" ? shopName.trim() || null : null,
  };
  db.prepare("INSERT INTO users (id, name, phone, email, address, addresses_json, pickup_selected, restaurant_open, role, shop_name, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(user.id, user.name, user.phone, user.email, user.address, JSON.stringify(user.addresses), 0, 1, user.role, user.shop_name, hashPassword(password));
  return user;
}

export function authenticateUser(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = db.prepare("SELECT id, name, phone, email, address, addresses_json, pickup_selected, restaurant_open, role, shop_name, password_hash FROM users WHERE lower(email) = ? OR phone = ?")
    .get(normalizedIdentifier, identifier.trim()) as StoredUser | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) return null;

  let addresses: string[] = [];
  try {
    addresses = user.addresses_json ? JSON.parse(user.addresses_json) as string[] : [];
  } catch {
    addresses = [];
  }

  if (user.address && !addresses.includes(user.address)) addresses.unshift(user.address);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    address: user.address,
    addresses,
    phone: user.phone,
    pickupSelected: Boolean(user.pickup_selected),
    restaurantOpen: Boolean(user.restaurant_open),
    role: user.role,
    shop_name: user.shop_name,
  };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  return session ? readSession(session) : null;
}

export function setSession(user: AuthUser) {
  return { name: SESSION_COOKIE, value: signSession(user) };
}

export function deleteUser(id: string) {
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function createPasswordResetToken(email: string) {
  const user = db.prepare("SELECT id, name, email FROM users WHERE lower(email) = lower(?)").get(email.trim()) as { id: string; name: string; email: string } | undefined;
  if (!user) return null;

  const token = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at <= CURRENT_TIMESTAMP").run(user.id);
  db.prepare("INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 minutes'))")
    .run(hashResetToken(token), user.id);
  return { email: user.email, name: user.name, token };
}

export function resetPassword(token: string, password: string) {
  const reset = db.prepare("SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP")
    .get(hashResetToken(token)) as { user_id: string } | undefined;
  if (!reset) return false;

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), reset.user_id);
  db.prepare("UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ?").run(hashResetToken(token));
  return true;
}

export function updateUserAddress(id: string, address: string | null, pickupSelected = false) {
  const existing = db.prepare("SELECT addresses_json FROM users WHERE id = ?").get(id) as { addresses_json: string | null } | undefined;
  let addresses: string[] = [];
  try {
    addresses = existing?.addresses_json ? JSON.parse(existing.addresses_json) as string[] : [];
  } catch {
    addresses = [];
  }

  if (address && !addresses.includes(address.trim())) addresses = [address.trim(), ...addresses];
  db.prepare("UPDATE users SET address = ?, addresses_json = ?, pickup_selected = ? WHERE id = ?")
    .run(address?.trim() || null, JSON.stringify(addresses), pickupSelected ? 1 : 0, id);
  const user = db.prepare("SELECT id, name, phone, email, address, addresses_json, pickup_selected, restaurant_open, role, shop_name FROM users WHERE id = ?")
    .get(id) as AuthUser & { addresses_json: string | null; pickup_selected: number; restaurant_open: number };
  return {
    ...user,
    addresses: user.addresses_json ? JSON.parse(user.addresses_json) as string[] : [],
    pickupSelected: Boolean(user.pickup_selected),
    restaurantOpen: Boolean(user.restaurant_open),
  };
}

export function updateVendorProfile(id: string, name: string, email: string, phone: string, shopName: string) {
  db.prepare("UPDATE users SET name = ?, email = ?, phone = ?, shop_name = ? WHERE id = ? AND role = 'vendor'")
    .run(name.trim(), email.trim().toLowerCase() || null, phone.trim() || null, shopName.trim() || null, id);
  const user = db.prepare("SELECT id, name, phone, email, address, addresses_json, pickup_selected, restaurant_open, role, shop_name FROM users WHERE id = ?")
    .get(id) as AuthUser & { addresses_json: string | null; pickup_selected: number; restaurant_open: number };
  return {
    ...user,
    addresses: user.addresses_json ? JSON.parse(user.addresses_json) as string[] : [],
    pickupSelected: Boolean(user.pickup_selected),
    restaurantOpen: Boolean(user.restaurant_open),
  };
}

export { SESSION_COOKIE };