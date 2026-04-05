# SafeServe — Allergen and Dietary Labels

Shopify app that adds allergen warning badges, nutrition fact labels (FDA/EU), and dietary certification icons to product pages. Enables collection filtering by dietary requirement.

Solves UK Natasha's Law and EU Regulation 1169/2011 compliance for food merchants.

## Architecture

- **Theme App Extension** (`extensions/safeserve-block/`) — Liquid blocks for product pages and collection filters
- **Admin Dashboard** (`web/frontend/`) — React + Polaris UI for managing allergen data
- **Backend API** (`web/index.js`) — Express server with Shopify API integration
- **Database** — PostgreSQL via Prisma ORM

## Prerequisites

- Node.js 18+
- Shopify CLI 3.85.3+
- PostgreSQL database (Railway provides this)
- Shopify Partner account

## Local Development

```bash
# Install dependencies
npm install
cd web && npm install && cd ..

# Set up environment
cp .env.example .env
# Fill in your Shopify API credentials and DATABASE_URL

# Generate Prisma client and push schema
npx prisma generate --schema=prisma/schema.prisma
npx prisma db push --schema=prisma/schema.prisma

# Create metafield definitions on dev store
npm run setup-metafields

# Seed test data (optional)
npm run seed

# Start development server
shopify app dev
```

## Railway Deployment

1. Create a new Railway project
2. Add a PostgreSQL service
3. Connect your GitHub repository
4. Set environment variables (see below)
5. Railway auto-deploys from main branch

## Environment Variables

```
SHOPIFY_API_KEY=           # From Shopify Partner Dashboard
SHOPIFY_API_SECRET=        # From Shopify Partner Dashboard
SCOPES=read_products,write_products,read_metafields,write_metafields
SHOPIFY_APP_URL=https://safeserve.railway.app
DATABASE_URL=postgresql://  # Railway Postgres connection string
SHOPIFY_STORE_DOMAIN=your-dev-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=       # For setup scripts only
NODE_ENV=production
PORT=3000
```

## Billing Plans

| Plan | Price | Products | Features |
|------|-------|----------|----------|
| Free | $0 | 10 | All badge types, nutrition labels |
| Starter | $9.99/mo | 100 | All features, CSV import |
| Pro | $19.99/mo | Unlimited | All features, priority support |

## Testing on Dev Store

1. Run `shopify app dev` to start local development
2. Open your dev store admin
3. Go to **Online Store > Themes > Customize**
4. Navigate to a product page template
5. Add the **SafeServe Allergen Labels** app blocks:
   - **Allergen Badge** — shows allergen warnings and safe badges
   - **Nutrition Label** — shows FDA or EU nutrition facts panel
6. Navigate to a collection page template
7. Add the **Dietary Filter** block for collection filtering

## Session 2 Checklist (What Was Built)

- [x] Prisma schema (Session + MerchantPlan models)
- [x] Express backend with API routes
- [x] Product list with metafield status
- [x] Product allergen/dietary/nutrition editor
- [x] CSV bulk import with validation
- [x] Billing API (Free/Starter/Pro plans)
- [x] GDPR webhook handlers (all 4 mandatory)
- [x] Admin dashboard with Polaris components
- [x] Settings page with plan management
- [x] Railway deployment config

## App Store Listing

**Name:** SafeServe — Allergen & Dietary Labels

**Tagline:** Allergen badges, nutrition labels, and dietary icons for food merchants. Natasha's Law compliant.

**Description:**
SafeServe adds professional allergen warning badges, FDA and EU nutrition fact labels, and dietary certification icons to your Shopify product pages. Built for food merchants who need to comply with UK Natasha's Law and EU Regulation 1169/2011.

**Key Benefits:**
- Allergen compliance badges for all 14 EU regulated allergens — avoid fines and protect customers
- FDA and EU nutrition labels that render perfectly on desktop and mobile — no design work needed
- Dietary filter on collection pages (Vegan, Halal, Gluten-Free, etc.) — help customers find safe products fast

**Screenshot Descriptions:**
1. Product page showing allergen badges and dietary icons on Dawn theme (1600x900)
2. Admin dashboard — product list with allergen configuration status (1600x900)
3. Product allergen editor — checkbox interface with all 14 EU allergens (1600x900)
4. FDA-style nutrition facts label on product page (1600x900)
5. Collection page with dietary filter bar active (1600x900)
