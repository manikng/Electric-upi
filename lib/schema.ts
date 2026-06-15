import { pgTable, uuid, text, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// 1. Users Table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique().notNull(),
  fullName: text("full_name"),
  city: text("city"),
  trustScore: integer("trust_score").default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 2. Chargers Table
export const chargers = pgTable("chargers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  hostId: uuid("host_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  area: text("area"),                          // neighbourhood / locality
  pincode: text("pincode"),                    // 6-digit India pincode
  state: text("state"),                        // Indian state
  pricePerKwh: decimal("price_per_kwh", { precision: 6, scale: 2 }).notNull(),
  chargerType: text("charger_type"),           // AC Charger | DC Fast Charger | Level 1 (Slow)
  powerKw: decimal("power_kw", { precision: 6, scale: 2 }), // kW output
  plugType: text("plug_type"),                 // Type 2 | CCS2 | CHAdeMO | GB/T | Bharat AC-001 | 3-Pin
  availableFrom: text("available_from"),       // HH:MM 24hr
  availableTo: text("available_to"),           // HH:MM 24hr
  amenities: text("amenities"),               // JSON array stringified
  vehicleSegments: text("vehicle_segments"),  // JSON array e.g. ["2-Wheeler","4-Wheeler"]
  imageUrl: text("image_url"),                // Supabase Storage public URL
  description: text("description"),
  status: text("status").default("pending"),  // pending | active | inactive
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 3. Bookings Table
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  chargerId: uuid("charger_id").references(() => chargers.id, { onDelete: "cascade" }).notNull(),
  driverId: uuid("driver_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: text("status").default("pending_host_accept"),
  // pending_host_accept → awaiting_driver_arrival → verified → charging → completed
  // legacy secretCode fields (kept for backward compatibility)
  secretCode: text("secret_code"),
  codeExpiresAt: timestamp("code_expires_at", { withTimezone: true }),
  codeUsed: boolean("code_used").default(false),
  // Mutual nonce handshake fields
  nonce: text("nonce"),
  nonceExpiresAt: timestamp("nonce_expires_at", { withTimezone: true }),
  nonceUsed: boolean("nonce_used").default(false),
  hostConfirmed: boolean("host_confirmed").default(false),
  driverConfirmed: boolean("driver_confirmed").default(false),
  nonceGeneratedAt: timestamp("nonce_generated_at", { withTimezone: true }),
  nonceGeneratedBy: uuid("nonce_generated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  energyKwh: decimal("energy_kwh", { precision: 8, scale: 3 }),
});

// Relations for easier queries
export const usersRelations = relations(users, ({ many }) => ({
  chargers: many(chargers),
  bookings: many(bookings),
}));

export const chargersRelations = relations(chargers, ({ one, many }) => ({
  host: one(users, {
    fields: [chargers.hostId],
    references: [users.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  charger: one(chargers, {
    fields: [bookings.chargerId],
    references: [chargers.id],
  }),
  driver: one(users, {
    fields: [bookings.driverId],
    references: [users.id],
  }),
}));
