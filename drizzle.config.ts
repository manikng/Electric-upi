import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  tablesFilter: [
    '!spatial_ref_sys',   // PostGIS system table — never touch
    '!geography_columns',  // PostGIS view
    '!geometry_columns',   // PostGIS view
  ],
} satisfies Config;
