import { pgTable, uuid, text, decimal, integer, timestamp, boolean, geometry, jsonb  } from "drizzle-orm/pg-core";
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
  location: geometry("location", { type: "point", mode: "xy", srid: 4326 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  site_type: text("site_type").default("home"), // home | commercial | public
});

// 3. Public Charging Sites (EV PCS data from govt sources)
export const chargingSites = pgTable("charging_sites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cpoName: text("cpo_name").notNull(), // CPO Name
  ownership: text("ownership").notNull(), // Govt/Private
  state: text("state").notNull(),
  district: text("district").notNull(),
  cityVillage: text("city_village").notNull(),
  location: text("location").notNull(), // address text
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  location_geom:geometry("location_geom", { type: "point", mode: "xy", srid: 4326 }),
  source: text("source"), // source PDF or file
  rawSource: jsonb("raw_source"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// 4. Site Connector Profiles — one row per connector-type profile per site
export const siteConnectorProfiles = pgTable("site_connector_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: uuid("site_id").references(() => chargingSites.id, { onDelete: "cascade" }).notNull(),
  connectorType: text("connector_type").notNull(), // Types of Chargers Installed/ Connector
  chargerRatingKw: decimal("charger_rating_kw", { precision: 6, scale: 2 }), // Charger Rating
  connectorRatingKw: decimal("connector_rating_kw", { precision: 6, scale: 2 }), // Connector Rating
  connectorCount: integer("connector_count"), // No. of Connector
   rawSource: jsonb("raw_source"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// 5. Bookings Table
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  chargerId: uuid("charger_id").references(() => chargers.id, { onDelete: "cascade" }).notNull(),
  driverId: uuid("driver_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: text("status").default("pending_host_accept"), // pending_host_accept → awaiting_driver_arrival → active → charging → completed
  // legacy secretCode fields (kept for backward compatibility)
  secretCode: text("secret_code"),
  codeExpiresAt: timestamp("code_expires_at", { withTimezone: true }),
  codeUsed: boolean("code_used").default(false),
  // 10-minute hold timer: booking auto-expires if host doesn't accept
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
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
  // Billing (session completed → draft → finalized)
  billingStatus: text("billing_status").default("draft"), // draft | finalized
  energySource: text("energy_source"), // auto | manual
  autoEnergyKwh: decimal("auto_energy_kwh", { precision: 8, scale: 3 }),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }),
  billingFinalizedAt: timestamp("billing_finalized_at", { withTimezone: true }),
});

// 6. Payments Table
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending | simulated_paid | failed
  providerRef: text("provider_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

// Relations for easier queries
export const usersRelations = relations(users, ({ many }) => ({
  chargers: many(chargers),
  bookings: many(bookings),
}));
export const chargersRelations = relations(chargers, ({ one, many }) => ({
  host: one(users, { fields: [chargers.hostId], references: [users.id] }),
  bookings: many(bookings),
}));
export const chargingSitesRelations = relations(chargingSites, ({ many }) => ({
  connectorProfiles: many(siteConnectorProfiles),
}));
export const siteConnectorProfilesRelations = relations(siteConnectorProfiles, ({ one }) => ({
  site: one(chargingSites, { fields: [siteConnectorProfiles.siteId], references: [chargingSites.id] }),
}));
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  charger: one(chargers, { fields: [bookings.chargerId], references: [chargers.id] }),
  driver: one(users, { fields: [bookings.driverId], references: [users.id] }),
  payments: many(payments),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));



