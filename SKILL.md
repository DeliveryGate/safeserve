**Version:** 1.1 | **Date:** 4 April 2026 | **Status:** Active

# SKILL: Shopify App Development
# Version: 1.0.0
# Stack: Next.js / TypeScript / Railway / Shopify CLI
# Last verified: April 2026
# API versions: 2026-01 (stable) | 2026-04 (RC - use for metaobjects)
# Owner: SaltCore Group Limited

---

## MISSION

Build, test, and submit production-ready Shopify apps autonomously.
Every app targets Built for Shopify certification from day one.
No manual coding required from the operator after skill invocation.

---

## PART 1: SHOPIFY PLATFORM KNOWLEDGE

### 1.1 PREREQUISITES — VERIFY BEFORE EVERY BUILD

```bash
# Check CLI version — must be 3.85.3 or higher
shopify version

# Install/upgrade if needed
npm install -g @shopify/cli@latest

# Verify Node.js — must be v18 or higher
node --version

# Authenticate with Partner account
shopify auth login
```

### 1.2 THE FOUR APP TYPES — CHOOSE CORRECTLY

#### TYPE A: Theme App Extension
- Renders blocks inside merchant storefront themes
- NO backend server required for simple apps
- Files: extensions/[name]/blocks/*.liquid + assets/
- Language: Liquid + CSS + vanilla JS only (no React)
- Data storage: Shopify metafields
- API 2026-04: app-owned metaobjects need NO access scopes
- Use for: product page badges, allergen labels, nutrition facts, collection filters
- Used by: App 1 (Allergen and Dietary Compliance)

#### TYPE B: Checkout UI Extension
- Renders inside Shopify checkout using React components
- Uses @shopify/ui-extensions-react — NO custom React components allowed
- Must use Shopify's sandboxed component library ONLY
- Functions must complete within 5ms — keep logic minimal
- CRITICAL: Information/shipping/payment steps = Shopify Plus stores ONLY
- Thank You + Order Status pages = ALL plans except Starter
- New dev stores have checkout and customer account UI extensions enabled by default
- Files: extensions/[name]/src/index.tsx
- Used by: App 2 (Checkout Controller)

#### TYPE C: Shopify Functions
- Custom backend logic running on Shopify's infrastructure
- Languages: JavaScript/TypeScript compiled to Wasm or Rust
- Use for: discount logic, shipping rules, payment customisation
- Must execute in under 5ms
- Works on all plans for discount/cart functions
- Used by: App 2 (Checkout Controller) for volume discount logic

#### TYPE D: Admin App (Embedded)
- Full React app embedded in Shopify Admin via App Bridge
- Requires backend server — use Railway + Next.js
- Uses Polaris component library for ALL UI
- Files: web/frontend/ (React) + web/ (Node/Next.js backend)
- Use for: dashboards, bulk operations, complex configuration
- Used by: App 3 (AI Blog Generator) and App 4 (Social Auto-Poster)

---

### 1.3 SCAFFOLDING COMMANDS

```bash
# Create new app (run in projects directory)
shopify app init

# Add a Theme App Extension
shopify app generate extension
# Select: Theme app extension

# Add a Checkout UI Extension
shopify app generate extension
# Select: Checkout UI extension

# Add a Shopify Function
shopify app generate extension
# Select: Discount function

# Start local development server
shopify app dev

# Deploy extensions to Shopify
shopify app deploy
```

---

### 1.4 DIRECTORY STRUCTURE — STANDARD PATTERN

```
my-shopify-app/
├── shopify.app.toml
├── package.json
├── web/
│   ├── frontend/
│   │   ├── pages/
│   │   └── components/
│   ├── index.js
│   └── shopify.js
├── extensions/
│   ├── theme-block/
│   │   ├── shopify.extension.toml
│   │   ├── blocks/
│   │   └── assets/
│   ├── checkout-ui/
│   │   ├── shopify.extension.toml
│   │   └── src/
│   │       └── index.tsx
│   └── discount-function/
│       ├── shopify.extension.toml
│       └── src/
│           └── index.ts
└── prisma/
    └── schema.prisma
```

---

### 1.5 shopify.app.toml — CRITICAL CONFIGURATION

```toml
name = "App Name"
client_id = "YOUR_CLIENT_ID"
application_url = "https://your-app.railway.app"
embedded = true

[access_scopes]
scopes = "read_products,write_products,read_metafields,write_metafields"

[auth]
redirect_urls = [
  "https://your-app.railway.app/api/auth/callback"
]

[webhooks]
api_version = "2026-01"

  [[webhooks.subscriptions]]
  topics = ["app/uninstalled"]
  uri = "/api/webhooks/app-uninstalled"

[build]
automatically_update_urls_on_dev = true
dev_store_url = "your-dev-store.myshopify.com"
```

---

### 1.6 POLARIS UI — MANDATORY FOR ALL ADMIN SCREENS

Every admin screen MUST use Shopify Polaris. Shopify rejects apps with custom UI in admin.

```bash
npm install @shopify/polaris @shopify/app-bridge-react
```

```tsx
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';

export default function App() {
  return (
    <AppProvider i18n={enTranslations}>
      {/* Your app content */}
    </AppProvider>
  );
}

// Standard imports for admin pages
import {
  Page, Layout, Card, Button, TextField,
  Banner, DataTable, Badge, EmptyState,
  Spinner, Toast, Frame
} from '@shopify/polaris';

// RULES:
// ALWAYS use Frame + Toast for notifications
// ALWAYS use Page component as top-level wrapper
// ALWAYS use Layout.Section for content areas
// NEVER use custom CSS for layout in admin
// NEVER use non-Polaris components in admin screens
```

---

### 1.7 SHOPIFY API — GRAPHQL PATTERNS

```typescript
// Reading metafields
const GET_METAFIELD = `
  query GetMetafield($namespace: String!, $key: String!) {
    shop {
      metafield(namespace: $namespace, key: $key) {
        id
        value
        type
      }
    }
  }
`;

// Writing metafields
const SET_METAFIELD = `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;
```

---

### 1.8 BILLING API — SUBSCRIPTION IMPLEMENTATION

Every paid app MUST implement Shopify's billing API.

```typescript
const CREATE_SUBSCRIPTION = `
  mutation AppSubscriptionCreate(
    $name: String!
    $lineItems: [AppSubscriptionLineItemInput!]!
    $returnUrl: URL!
    $test: Boolean
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      lineItems: $lineItems
      test: $test
    ) {
      userErrors { field message }
      confirmationUrl
      appSubscription { id status }
    }
  }
`;

const PLANS = {
  free: { name: "Free", price: 0 },
  starter: { name: "Starter", price: 9.99 },
  pro: { name: "Pro", price: 19.99 },
};

const GET_SUBSCRIPTION = `
  query {
    currentAppInstallation {
      activeSubscriptions {
        id name status
        lineItems {
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                price { amount currencyCode }
                interval
              }
            }
          }
        }
      }
    }
  }
`;
```

---

### 1.9 WEBHOOK HANDLING — MANDATORY TOPICS

```typescript
const MANDATORY_WEBHOOKS = [
  'app/uninstalled',
  'shop/redact',
  'customers/redact',
  'customers/data_request',
];

app.post('/api/webhooks/:topic', async (req, res) => {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const verified = verifyWebhook(req.body, hmac);
  if (!verified) return res.status(401).send('Unauthorized');

  switch (req.params.topic) {
    case 'app_uninstalled':
      await handleUninstall(req.headers['x-shopify-shop-domain']);
      break;
    case 'shop_redact':
      await deleteShopData(req.headers['x-shopify-shop-domain']);
      break;
  }
  res.status(200).send('OK');
});
```

---

### 1.10 RAILWAY DEPLOYMENT — STANDARD CONFIG

```bash
# Required environment variables on Railway
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=read_products,write_products,read_metafields,write_metafields
SHOPIFY_APP_URL=https://your-app.railway.app
DATABASE_URL=postgresql://
NODE_ENV=production
```

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

### 1.11 BUILT FOR SHOPIFY — CERTIFICATION REQUIREMENTS

Achieving this badge gives +49% install increase within 14 days.
Target from day one on every app.

TECHNICAL REQUIREMENTS:
- Use API version 2026-01 minimum
- All admin UI uses Polaris components only
- App loads within 3 seconds on initial install
- No unnecessary API scope requests
- Handles all mandatory GDPR webhooks
- Session tokens used for authentication (not cookies)
- App Bridge 3.x or higher
- No checkout.liquid usage (deprecated August 2024)
- Checkout extensions use Shopify component library only

LISTING REQUIREMENTS:
- Clear accurate app name (no keyword stuffing)
- App icon: 1200x1200px PNG, no text, no Shopify logo
- At least 3 screenshots (1600x900px)
- Privacy policy URL (must be live)
- Support email or URL

ONBOARDING REQUIREMENTS:
- App works immediately after install with zero config
- Clear onboarding flow for first-time users
- EmptyState component used when no data exists

SUPPORT REQUIREMENTS:
- Support response within 2 business days
- Help documentation available

---

### 1.12 COMMON REJECTION REASONS — AVOID THESE

1. Requesting unnecessary scopes
2. Non-Polaris admin UI
3. Missing GDPR webhooks — all three are mandatory
4. Broken onboarding — app must work immediately after install
5. Privacy policy missing or broken link
6. App icon contains text or Shopify branding
7. Misleading app description
8. Checkout.liquid usage — deprecated, instant rejection
9. Custom components in checkout extensions
10. Session storage not implemented

---

### 1.13 APP STORE LISTING — COPY TEMPLATE

```
APP NAME: [Max 30 chars, no keyword stuffing]
TAGLINE: [One sentence, max 100 chars]

DESCRIPTION:
Para 1: What it does and the problem it solves (2-3 sentences)
Para 2: Key features as 5-7 bullet points
Para 3: Who it is for
Para 4: Getting started and support

KEY BENEFITS (3 bullets shown on listing card):
- Feature → merchant outcome
- Feature → merchant outcome
- Feature → merchant outcome

PRICING:
Free: [What's included]
$X.99/month: [Plan name] — [What's included]
$X.99/month: [Plan name] — [What's included]
```

---

## PART 2: THE FOUR APP SPECIFICATIONS

---

### APP 1: ALLERGEN AND DIETARY COMPLIANCE

App Store name: SafeServe — Allergen and Dietary Labels
Target launch: Week 1-2
Type: Theme App Extension
Plans: Free (10 products) | $9.99/month (100 products) | $19.99/month (unlimited)
Railway cost: $5/month | Running cost: $0 API costs
Gross margin: 98%

WHAT IT DOES:
Adds allergen warning badges, nutrition fact labels in FDA and EU format,
and dietary filter icons to Shopify product pages. Enables collection
filtering by dietary requirement. Solves UK Natasha's Law and EU
Regulation 1169/2011 compliance for food merchants.

TARGET MERCHANTS:
- Food and beverage Shopify stores
- UK and EU food businesses (regulatory requirement)
- Cafes, bakeries, meal prep, catering companies on Shopify
- Health food retailers

FEATURES:
1. Per-product allergen matrix (14 EU allergens)
2. Dietary icons: Vegan, Vegetarian, Gluten-Free, Halal, Kosher, Nut-Free, Dairy-Free, Keto
3. Nutrition facts label (FDA format or EU format toggle)
4. Collection page filter by dietary requirement
5. CSV bulk import
6. Admin dashboard for managing all product allergen data

EXTENSION ARCHITECTURE:
```
extensions/safeserve-block/
├── shopify.extension.toml
├── blocks/
│   ├── allergen-badge.liquid
│   ├── nutrition-label.liquid
│   └── dietary-filter.liquid
└── assets/
    ├── safeserve.css
    └── safeserve.js
```

TOML CONFIG:
```toml
api_version = "2026-01"
type = "theme_app_extension"
name = "SafeServe Allergen Labels"
```

METAFIELD SCHEMA:
```
Namespace: safeserve
Keys:
  allergens (json): { "gluten": true, "nuts": false, "dairy": true }
  dietary (json): { "vegan": false, "halal": true, "gluten_free": true }
  nutrition (json): { "calories": 250, "protein": 12, "carbs": 30, "fat": 8 }
  nutrition_format (string): "fda" or "eu"
```

ALLERGEN BADGE LIQUID:
```liquid
{% assign allergens = product.metafields.safeserve.allergens.value %}
{% assign dietary = product.metafields.safeserve.dietary.value %}

{% if allergens %}
<div class="safeserve-allergens">
  <h4 class="safeserve-title">Allergen Information</h4>
  <div class="safeserve-badge-grid">
    {% if allergens.gluten %}
      <span class="safeserve-badge safeserve-badge--warning">Contains Gluten</span>
    {% else %}
      <span class="safeserve-badge safeserve-badge--safe">Gluten Free</span>
    {% endif %}
    {% if allergens.nuts %}
      <span class="safeserve-badge safeserve-badge--warning">Contains Nuts</span>
    {% else %}
      <span class="safeserve-badge safeserve-badge--safe">Nut Free</span>
    {% endif %}
    {% if allergens.dairy %}
      <span class="safeserve-badge safeserve-badge--warning">Contains Dairy</span>
    {% else %}
      <span class="safeserve-badge safeserve-badge--safe">Dairy Free</span>
    {% endif %}
  </div>
  {% if dietary.halal %}<span class="safeserve-cert">Halal Certified</span>{% endif %}
  {% if dietary.vegan %}<span class="safeserve-cert">Vegan</span>{% endif %}
</div>
{% endif %}

{% schema %}
{
  "name": "Allergen Badge",
  "target": "section",
  "settings": [
    {
      "type": "select",
      "id": "badge_style",
      "label": "Badge style",
      "options": [
        { "value": "pill", "label": "Pill" },
        { "value": "square", "label": "Square" }
      ],
      "default": "pill"
    },
    { "type": "color", "id": "warning_colour", "label": "Warning colour", "default": "#FF4444" },
    { "type": "color", "id": "safe_colour", "label": "Safe colour", "default": "#22C55E" }
  ]
}
{% endschema %}
```

SUBMISSION CHECKLIST — APP 1:
- Allergen badge renders correctly on Dawn theme
- Allergen badge renders correctly on Debut theme
- Nutrition label renders in both FDA and EU format
- Collection filter works with tagged products
- Free tier limits enforced (10 products)
- Billing upgrade prompt shown at limit
- GDPR webhooks implemented
- Privacy policy live
- Screenshots taken (1600x900)
- App icon 1200x1200 PNG no text

---

### APP 2: CHECKOUT CONTROLLER — ALL-IN-ONE

App Store name: DeliveryIQ — Date, Postcode and Delivery Fee
Target launch: Week 3-4
Type: Checkout UI Extension + Shopify Functions
Plans: Free (14-day trial) | $29.99/month
Railway cost: $10/month | Running cost: $0 API costs
Gross margin: 97%

NOTE: Full checkout customisation on information/shipping/payment steps
requires Shopify Plus. Thank You page extensions work on ALL plans.
Target: all food, florist, bakery, furniture and local delivery merchants.

WHAT IT DOES:
Replaces 4 separate apps with one unified checkout experience:
1. Delivery date picker with blocked date management
2. Postcode and zip code delivery zone validator
3. Automatic delivery fee calculation by order value
4. Volume discount progress bar

Proof of concept: Vanda's Kitchen (vandaskitchen.co.uk) uses a working
version of this logic in production. This app packages it as an
installable configurable product for all Shopify local delivery merchants.

TARGET MERCHANTS:
- Food delivery businesses
- Local delivery shops (flowers, gifts, bakeries)
- Click-and-collect businesses
- Any merchant needing delivery date and zone control

CHECKOUT UI EXTENSION:
```tsx
import {
  reactExtension,
  BlockStack,
  Text,
  Select,
  useSettings,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.delivery-address.render-after',
  () => <DeliveryIQExtension />
);

function DeliveryIQExtension() {
  const { blockedDates, validPostcodes, timeSlots } = useSettings();
  const [selectedDate, setSelectedDate] = useState('');
  const [postcodeValid, setPostcodeValid] = useState(null);

  const blocked = blockedDates ? blockedDates.split(',').map(d => d.trim()) : [];

  return (
    <BlockStack spacing="base">
      <Text size="medium" emphasis="bold">Delivery Details</Text>
      <PostcodeValidator validPostcodes={validPostcodes} onValidation={setPostcodeValid} />
      {postcodeValid && <DeliveryDatePicker blockedDates={blocked} onSelect={setSelectedDate} />}
      {selectedDate && <TimeSlotSelector slots={timeSlots} />}
    </BlockStack>
  );
}
```

SHOPIFY FUNCTION — VOLUME DISCOUNT:
```typescript
import type { FunctionResult, CartInput } from "@shopify/discount-app-components";

export function run(input: CartInput): FunctionResult {
  const totalQuantity = input.cart.lines.reduce((sum, line) => sum + line.quantity, 0);

  let discountPercentage = 0;
  if (totalQuantity >= 100) discountPercentage = 15;
  else if (totalQuantity >= 50) discountPercentage = 10;

  if (discountPercentage === 0) {
    return { discounts: [], discountApplicationStrategy: "FIRST" };
  }

  return {
    discounts: [{
      targets: [{ orderSubtotal: { excludedVariantIds: [] } }],
      value: { percentage: { value: discountPercentage.toString() } },
      message: `${discountPercentage}% volume discount`,
    }],
    discountApplicationStrategy: "FIRST",
  };
}
```

ADMIN CONFIGURATION SCREENS:
- Delivery Zones: valid postcodes list, minimum order value
- Blocked Dates: calendar UI for date management
- Delivery Fees: fee tiers by order value
- Time Slots: available delivery windows

SUBMISSION CHECKLIST — APP 2:
- Checkout extension renders on dev store Plus plan
- Thank You page extension renders on standard plan
- Postcode validation works correctly
- Date picker respects blocked dates from admin config
- Volume discount function applies at 50 and 100 items
- Delivery fee calculation correct at all thresholds
- Admin config page loads and saves settings
- Settings persist across sessions
- 14-day trial billing implemented
- GDPR webhooks implemented

---

### APP 3: AI BLOG AND SEO GENERATOR

App Store name: BlogFlow — AI SEO Blog Writer
Target launch: Month 2
Type: Admin App (Embedded) + Railway backend
Plans: Free (3 posts/month) | $14.99/month (50 posts) | $29.99/month (150 posts)
Railway cost: $15/month | LLM API cost: $0.001-$0.035 per post
At 500 merchants on Pro: LLM costs ~$200/month, revenue ~$15,000/month
Gross margin: 95-98%

WHAT IT DOES:
Generates SEO-optimised blog posts using the merchant's own product
catalog as context to prevent AI hallucinations mentioning competitors.
Posts write directly to Shopify's native blog engine. Merchant owns
all content with no lock-in.

KEY DIFFERENTIATORS:
1. Store-context injection — LLM only knows about this merchant's products
2. No hallucinations mentioning competitors (biggest complaint about rivals)
3. Posts go directly to Shopify blog — no external hosting lock-in
4. AEO/GEO optimised for AI search (ChatGPT, Perplexity, Google AI Overviews)
5. Transparent credit-based billing

ARCHITECTURE:
```
Railway (Next.js backend)
├── POST /api/generate-post    # Generate blog post from topic
├── POST /api/publish-post     # Write post to Shopify blog
├── GET  /api/products         # Fetch merchant products for context
└── GET  /api/analytics        # Post performance tracking

LLM Integration:
- Default: OpenAI GPT-4o-mini (~$0.001/post, low cost)
- Premium option: Claude Sonnet (~$0.035/post, higher quality)
- Context window: Merchant's top 50 products by sales

Shopify Blog API:
- Read/write to merchant's Shopify blog via Admin GraphQL API
- Auto-generate meta title and description
- Set featured image from product library
```

CONTEXT INJECTION — PREVENT HALLUCINATIONS:
```typescript
async function buildBlogPrompt(shop: string, topic: string): Promise<string> {
  const products = await fetchTopProducts(shop, 50);
  const productContext = products.map(p =>
    `- ${p.title}: ${p.description?.slice(0, 100)}`
  ).join('\n');

  return `
You are writing a blog post for ${shop}, an online store.
Only reference these specific products — never mention competitors:
${productContext}

Write a 1000-word SEO-optimised blog post about: ${topic}

Requirements:
- Include 3-5 internal product references from the list above only
- Write a compelling meta description (155 chars max)
- Structure with H2 and H3 headings
- Optimised for AI search engines: clear, factual, well-structured
- Return JSON: { title, metaDescription, content, tags }
  `;
}
```

ADMIN UI STRUCTURE:
- Generate New Post: topic input, tone selector, word count selector, credits display
- Published Posts: data table with title, date, views, actions
- Settings: brand voice, default tone, posting schedule

SUBMISSION CHECKLIST — APP 3:
- Blog post generates without hallucinating competitor names
- Post publishes correctly to Shopify blog
- Meta description and tags set correctly
- Free tier limits enforced (3 posts/month)
- Credit counter accurate and real-time
- Upgrade prompt shown at limit
- Railway API responds within 10 seconds
- Error states shown gracefully
- GDPR webhooks implemented
- Data deletion on uninstall confirmed

---

### APP 4: SOCIAL MEDIA AUTO-POSTER

App Store name: PostPilot — Social Media Auto Post
Target launch: Month 3-4
Type: Admin App (Embedded) + Railway backend
Platforms: Instagram | Pinterest | TikTok
NOT Twitter/X — API costs $200/month minimum, not viable
Plans: Free (3 posts/week) | $14.99/month (unlimited, 3 platforms)
Railway cost: $15/month | Social API costs: $0 (all free at basic volume)
LLM caption costs: $0.01-$0.05/post
Gross margin: 95-97%

WHAT IT DOES:
Automatically posts Shopify product images to Instagram, Pinterest and
TikTok with AI-generated captions. Syncs product catalog, filters out
sold-out items automatically, and schedules posts at optimal times.

KEY DIFFERENTIATORS VS COMPETITORS:
1. Filters sold-out items automatically (biggest Outfy complaint)
2. No forced watermarks or branding on posts (Outfy does this)
3. AI captions match merchant brand voice
4. Reliable posting that actually publishes (Minta's main problem)
5. Half the price of Outfy ($14.99 vs $20 minimum)

CRITICAL API RISKS — MANAGE CAREFULLY:
- Meta Graph API deprecates versions frequently: budget 20-40hrs/year maintenance
- TikTok Content Posting API requires approval: apply early
- Twitter/X excluded entirely: API costs $200/month minimum

ARCHITECTURE:
```
Railway (Next.js backend)
├── GET  /api/products          # Sync Shopify product catalog
├── POST /api/generate-caption  # AI caption from product data
├── POST /api/schedule-post     # Queue post for publishing
├── GET  /api/queue             # View scheduled posts
└── POST /api/publish           # Cron job: publish queued posts

Social API integrations:
├── Meta Graph API v21.0        # Instagram posts
├── Pinterest API v5             # Pinterest pins
└── TikTok Content Posting API   # TikTok images

Database (Railway Postgres):
├── posts (scheduled, published, failed status)
├── social_accounts (OAuth tokens per merchant)
└── product_cache (synced Shopify products)
```

OAUTH FLOW:
```typescript
app.get('/api/auth/instagram', (req, res) => {
  const authUrl = `https://api.instagram.com/oauth/authorize?` +
    `client_id=${process.env.INSTAGRAM_APP_ID}&` +
    `redirect_uri=${process.env.INSTAGRAM_REDIRECT_URI}&` +
    `scope=instagram_basic,instagram_content_publish&` +
    `response_type=code&state=${req.query.shop}`;
  res.redirect(authUrl);
});

app.get('/api/auth/pinterest', (req, res) => {
  const authUrl = `https://www.pinterest.com/oauth/?` +
    `client_id=${process.env.PINTEREST_APP_ID}&` +
    `redirect_uri=${process.env.PINTEREST_REDIRECT_URI}&` +
    `response_type=code&scope=boards:read,pins:write&state=${req.query.shop}`;
  res.redirect(authUrl);
});
```

CAPTION GENERATION:
```typescript
async function generateCaption(product: Product, platform: string): Promise<string> {
  const instructions = {
    instagram: 'Write 3 sentences with 5 relevant hashtags. Conversational and engaging.',
    pinterest: 'Write a descriptive title and 2-sentence description. SEO-focused.',
    tiktok: 'Write a catchy one-liner with 3 trending hashtags. Short and punchy.'
  };

  const prompt = `
Write a ${platform} caption for this product:
Name: ${product.title}
Description: ${product.description?.slice(0, 200)}
Price: ${product.price}
${instructions[platform]}
No generic phrases like "check this out" or "amazing product".
  `;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
```

SUBMISSION CHECKLIST — APP 4:
- Instagram OAuth connects and stores token securely
- Pinterest OAuth connects and stores token securely
- TikTok OAuth connects and stores token securely
- Post publishes to Instagram successfully
- Post publishes to Pinterest successfully
- Sold-out products filtered from post queue
- AI captions generate for all 3 platforms
- Scheduling works — posts publish at correct time
- Failed posts logged and merchant notified
- Token refresh handled automatically
- GDPR webhooks — tokens deleted on uninstall
- Free tier limit enforced (3 posts/week)

---

## PART 3: BUILD TO TEST TO SUBMIT PIPELINE

### STEP 1: ENVIRONMENT SETUP

```bash
mkdir [app-name] && cd [app-name]
shopify app init
npm install

# Link to GitHub remote
git remote add origin https://github.com/DeliveryGate/Shopify.git
git branch -M main

# For Admin apps — set up Railway Postgres
# Create Railway project, add Postgres, copy DATABASE_URL

cp .env.example .env
# Fill in: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, DATABASE_URL, ANTHROPIC_API_KEY

npx prisma db push
shopify app dev
# Enter dev store URL: your-dev-store.myshopify.com
```

### STEP 2: LOCAL TESTING CHECKLIST

FUNCTIONALITY:
- Core feature works end-to-end on dev store
- Free tier limits enforced correctly
- Paid tier unlocks features correctly
- Billing subscription creates successfully in test mode
- Billing upgrade and downgrade works
- App uninstall cleans up all data

UI AND UX:
- All admin screens use Polaris components only
- EmptyState shown when no data exists
- Loading states shown during API calls
- Error states handled gracefully — no blank screens
- Mobile responsive at 390px width
- Onboarding works on fresh install with zero config

SECURITY:
- Webhook signatures verified on all incoming webhooks
- Session tokens validated on every request
- No API keys exposed in frontend code
- GDPR webhook handlers functional and tested

PERFORMANCE:
- Admin page loads within 3 seconds
- Theme extension does not slow page load
- Checkout extension renders within 1 second

### STEP 3: DEPLOY

```bash
# Push backend to GitHub (Railway auto-deploys from main)
git push origin main

# Deploy Shopify extensions
shopify app deploy

# Verify in Partner Dashboard:
# App URL pointing to Railway
# Extensions deployed and active
# Webhooks registered correctly
```

### STEP 4: APP STORE LISTING ASSETS

ASSETS REQUIRED:
- App icon: 1200x1200px PNG, no text, no Shopify logo
- Screenshot 1: Admin dashboard overview (1600x900)
- Screenshot 2: Core feature in action (1600x900)
- Screenshot 3: Merchant configuration (1600x900)
- Demo video: 60-90 seconds from install to first use (recommended)

COPY REQUIRED:
- App name (max 30 chars)
- Tagline (max 100 chars)
- Full description following template in section 1.13
- 3 key benefit bullets
- Pricing tier descriptions

LEGAL REQUIRED:
- Privacy policy live at stable URL
- Support email address active

### STEP 5: SUBMISSION

1. Go to: partners.shopify.com → Apps → [Your App] → Distribution
2. Select: Shopify App Store
3. Complete listing in Partner Dashboard
4. Submit for review
5. Expected review time: 5-7 business days

AFTER APPROVAL:
- Install on Vanda's Kitchen (vandaskitchen.co.uk) as first merchant
- Leave authentic review from Vanda's Kitchen account
- Share on LinkedIn and Twitter/X
- Apply for Built for Shopify badge after reaching 5 reviews

---

## PART 4: REVENUE AND OPERATIONS

### 4.1 REVENUE PROJECTIONS (conservative)

MONTH 6 (all 4 apps live):
- Paying merchants: 40-70
- MRR: £800-£1,600
- Monthly costs: £50-80
- Net: £750-£1,500

MONTH 12:
- Paying merchants: 150-280
- MRR: £3,500-£7,000
- Monthly costs: £150-300
- Net: £3,200-£6,700

MONTH 24:
- Paying merchants: 400-700
- MRR: £10,000-£20,000
- Monthly costs: £300-700
- Net: £9,700-£19,300

WITH BUILT FOR SHOPIFY BADGE (+49% installs):
- Month 12 net: £5,100-£10,400
- Month 24 net: £14,900-£29,900

### 4.2 SHOPIFY REVENUE SHARE

First £1,000,000 lifetime revenue: 0% commission (as of June 2025)
Above £1,000,000: 15% plus 2.9% processing fee

Strategy: Launch all apps under one Partner account to maximise
the £1M 0% commission threshold across the full portfolio.

### 4.3 CROSS-PROMOTION STRATEGY

App 1 (Allergen) to App 2 (Checkout):
"You manage allergen data — also control your delivery dates with DeliveryIQ"

App 2 (Checkout) to App 3 (Blog):
"Drive more traffic to your store with SEO blog content from BlogFlow"

App 3 (Blog) to App 4 (Social):
"Automatically share your blog content to social media with PostPilot"

All apps: Common footer "More apps by SaltCore"

### 4.4 REVIEW ACQUISITION STRATEGY

Timing: Request review at the moment of first success
- App 1: After first allergen label renders on product
- App 2: After first successful order with date picker
- App 3: After first blog post published
- App 4: After first social post publishes

Method: In-app Polaris Banner component
"Loving BlogFlow? Leave us a quick review"
Link to App Store review page

Seed reviews: Install each app on Vanda's Kitchen (vandaskitchen.co.uk)
and leave an authentic review based on real usage experience.

Target: 5 reviews minimum before applying for Built for Shopify badge.

---

## PART 5: QUICK REFERENCE

### CLI COMMANDS

```bash
shopify version                    # Check CLI version (need 3.85.3+)
shopify auth login                 # Authenticate with Partners
shopify app init                   # Create new app
shopify app dev                    # Start local dev server
shopify app deploy                 # Deploy extensions to Shopify
shopify app generate extension     # Add new extension to app
shopify app info                   # Show app configuration
```

### API VERSIONS

2026-01: Current stable — use this for all apps
2026-04: Release candidate — use for app-owned metaobjects without scopes

### KEY SHOPIFY DOCS

App development:      shopify.dev/docs/apps
Checkout extensions:  shopify.dev/docs/api/checkout-ui-extensions
Shopify Functions:    shopify.dev/docs/apps/build/functions
Theme extensions:     shopify.dev/docs/apps/build/online-store
Polaris:              polaris.shopify.com
Billing API:          shopify.dev/docs/apps/build/billing
Built for Shopify:    shopify.dev/docs/apps/launch/built-for-shopify

### ENVIRONMENT VARIABLES TEMPLATE

```env
# Shopify
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=read_products,write_products,read_metafields,write_metafields
SHOPIFY_APP_URL=https://your-app.railway.app

# Database (Railway Postgres)
DATABASE_URL=postgresql://

# LLM (Apps 3 and 4)
ANTHROPIC_API_KEY=

# Social APIs (App 4)
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
PINTEREST_APP_ID=
PINTEREST_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Runtime
NODE_ENV=production
PORT=3000
```

---

END OF SKILL DOCUMENT
Version 1.0.0 | SaltCore Group Limited | April 2026
Shopify API: 2026-01 stable | CLI: 3.85.3+
