import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { parse } from "csv-parse/sync";
import path from "path";
import { fileURLToPath } from "url";
import serveStatic from "serve-static";
import {
  verifyWebhookHmac,
  shopifyGraphQL,
  PLANS,
  CREATE_SUBSCRIPTION,
  GET_ACTIVE_SUBSCRIPTIONS,
  CANCEL_SUBSCRIPTION,
} from "./shopify.js";
import { verifyRequest } from "./middleware/verify-request.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const PORT = parseInt(process.env.PORT || "3000", 10);
const IS_PROD = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(compression());
app.use(cookieParser());

// Raw body needed for webhook HMAC verification
app.use("/api/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());

// ---------------------------------------------------------------------------
// GDPR + App Webhooks
// ---------------------------------------------------------------------------
app.post("/api/webhooks/:topic", async (req, res) => {
  const hmac = req.headers["x-shopify-hmac-sha256"];
  if (!hmac || !verifyWebhookHmac(req.body.toString(), hmac, process.env.SHOPIFY_API_SECRET)) {
    return res.status(401).send("Unauthorized");
  }

  const shop = req.headers["x-shopify-shop-domain"];
  const topic = req.params.topic;

  try {
    switch (topic) {
      case "app-uninstalled":
        await prisma.merchantPlan.deleteMany({ where: { shop } });
        await prisma.session.deleteMany({ where: { shop } });
        console.log(`[webhook] app/uninstalled — cleaned up data for ${shop}`);
        break;

      case "shop-redact":
        await prisma.merchantPlan.deleteMany({ where: { shop } });
        await prisma.session.deleteMany({ where: { shop } });
        console.log(`[webhook] shop/redact — deleted all data for ${shop}`);
        break;

      case "customers-redact":
        // SafeServe does not store customer data
        console.log(`[webhook] customers/redact — no customer data stored`);
        break;

      case "customers-data-request":
        // SafeServe does not store customer data
        console.log(`[webhook] customers/data_request — no customer data stored`);
        break;

      default:
        console.log(`[webhook] Unhandled topic: ${topic}`);
    }
    res.status(200).send("OK");
  } catch (err) {
    console.error(`[webhook] Error handling ${topic}:`, err);
    res.status(500).send("Error");
  }
});

// ---------------------------------------------------------------------------
// Product API Routes
// ---------------------------------------------------------------------------

// GET /api/products — fetch all store products with metafield status
app.get("/api/products", verifyRequest, async (req, res) => {
  const { shop, accessToken } = req.shopSession;
  const cursor = req.query.cursor || null;
  const search = req.query.search || "";

  const query = `
    query GetProducts($first: Int!, $after: String, $query: String) {
      products(first: 20, after: $after, query: $query) {
        edges {
          cursor
          node {
            id
            title
            handle
            status
            featuredImage { url altText }
            metafield(namespace: "safeserve", key: "allergens") { value }
            metafieldDietary: metafield(namespace: "safeserve", key: "dietary") { value }
          }
        }
        pageInfo { hasNextPage hasPreviousPage endCursor }
      }
    }
  `;

  try {
    const result = await shopifyGraphQL(shop, accessToken, query, {
      first: 20,
      after: cursor,
      query: search || null,
    });

    const products = result.data.products.edges.map((edge) => {
      const node = edge.node;
      const allergens = node.metafield ? JSON.parse(node.metafield.value) : null;
      const dietary = node.metafieldDietary ? JSON.parse(node.metafieldDietary.value) : null;
      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        status: node.status,
        image: node.featuredImage?.url || null,
        imageAlt: node.featuredImage?.altText || "",
        allergensConfigured: !!allergens,
        allergens,
        dietaryIcons: dietary
          ? Object.entries(dietary)
              .filter(([, v]) => v)
              .map(([k]) => k)
          : [],
        cursor: edge.cursor,
      };
    });

    res.json({
      products,
      pageInfo: result.data.products.pageInfo,
    });
  } catch (err) {
    console.error("[api] GET /api/products error:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/:id — fetch single product with all safeserve metafields
app.get("/api/products/:id", verifyRequest, async (req, res) => {
  const { shop, accessToken } = req.shopSession;
  const productId = req.params.id;

  // Accept either a numeric ID or a full GID
  const gid = productId.startsWith("gid://")
    ? productId
    : `gid://shopify/Product/${productId}`;

  const query = `
    query GetProduct($id: ID!) {
      product(id: $id) {
        id
        title
        handle
        status
        featuredImage { url altText }
        metafields(namespace: "safeserve", first: 10) {
          edges {
            node { key value type }
          }
        }
      }
    }
  `;

  try {
    const result = await shopifyGraphQL(shop, accessToken, query, { id: gid });
    const product = result.data.product;
    if (!product) return res.status(404).json({ error: "Product not found" });

    const metafields = {};
    for (const edge of product.metafields.edges) {
      const { key, value, type } = edge.node;
      metafields[key] = type === "json" ? JSON.parse(value) : value;
    }

    res.json({
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      image: product.featuredImage?.url || null,
      imageAlt: product.featuredImage?.altText || "",
      allergens: metafields.allergens || null,
      dietary: metafields.dietary || null,
      nutrition: metafields.nutrition || null,
      nutrition_format: metafields.nutrition_format || "fda",
    });
  } catch (err) {
    console.error("[api] GET /api/products/:id error:", err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/products/:id — save allergen/dietary/nutrition metafields for product
app.post("/api/products/:id", verifyRequest, async (req, res) => {
  const { shop, accessToken } = req.shopSession;
  const productId = req.params.id;
  const { allergens, dietary, nutrition, nutrition_format } = req.body;

  const gid = productId.startsWith("gid://")
    ? productId
    : `gid://shopify/Product/${productId}`;

  // Check plan limits
  const merchantPlan = await prisma.merchantPlan.findUnique({ where: { shop } });
  const plan = merchantPlan?.plan || "free";
  const limit = PLANS[plan]?.productLimit || 10;

  if (limit !== Infinity) {
    const currentCount = merchantPlan?.productCount || 0;
    // Only count as new if this product didn't previously have allergen data
    const checkQuery = `
      query CheckExisting($id: ID!) {
        product(id: $id) {
          metafield(namespace: "safeserve", key: "allergens") { value }
        }
      }
    `;
    const existing = await shopifyGraphQL(shop, accessToken, checkQuery, { id: gid });
    const hadData = !!existing.data.product?.metafield;

    if (!hadData && currentCount >= limit) {
      return res.status(403).json({
        error: "Product limit reached",
        plan,
        limit,
        count: currentCount,
        upgrade: true,
      });
    }
  }

  const metafields = [];

  if (allergens) {
    metafields.push({
      ownerId: gid,
      namespace: "safeserve",
      key: "allergens",
      value: JSON.stringify(allergens),
      type: "json",
    });
  }
  if (dietary) {
    metafields.push({
      ownerId: gid,
      namespace: "safeserve",
      key: "dietary",
      value: JSON.stringify(dietary),
      type: "json",
    });
  }
  if (nutrition) {
    metafields.push({
      ownerId: gid,
      namespace: "safeserve",
      key: "nutrition",
      value: JSON.stringify(nutrition),
      type: "json",
    });
  }
  if (nutrition_format) {
    metafields.push({
      ownerId: gid,
      namespace: "safeserve",
      key: "nutrition_format",
      value: nutrition_format,
      type: "single_line_text_field",
    });
  }

  const mutation = `
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id key value }
        userErrors { field message }
      }
    }
  `;

  try {
    const result = await shopifyGraphQL(shop, accessToken, mutation, { metafields });
    const errors = result.data.metafieldsSet.userErrors;
    if (errors.length > 0) {
      return res.status(400).json({ error: "Metafield save failed", details: errors });
    }

    // Update product count for new products
    await prisma.merchantPlan.upsert({
      where: { shop },
      create: { shop, plan: "free", productCount: 1 },
      update: { productCount: { increment: allergens ? 1 : 0 } },
    });

    res.json({ success: true, metafields: result.data.metafieldsSet.metafields });
  } catch (err) {
    console.error("[api] POST /api/products/:id error:", err);
    res.status(500).json({ error: "Failed to save product metafields" });
  }
});

// ---------------------------------------------------------------------------
// CSV Import Route
// ---------------------------------------------------------------------------
app.post("/api/import/csv", verifyRequest, upload.single("file"), async (req, res) => {
  const { shop, accessToken } = req.shopSession;

  if (!req.file) {
    return res.status(400).json({ error: "No CSV file uploaded" });
  }

  try {
    const records = parse(req.file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ error: "CSV file is empty" });
    }

    // Check plan limit
    const merchantPlan = await prisma.merchantPlan.findUnique({ where: { shop } });
    const plan = merchantPlan?.plan || "free";
    const limit = PLANS[plan]?.productLimit || 10;
    const currentCount = merchantPlan?.productCount || 0;

    if (limit !== Infinity && currentCount + records.length > limit) {
      return res.status(403).json({
        error: "Import would exceed plan limit",
        plan,
        limit,
        current: currentCount,
        importing: records.length,
        upgrade: true,
      });
    }

    const EU_ALLERGENS = [
      "celery", "gluten", "crustaceans", "eggs", "fish", "lupin",
      "milk", "molluscs", "mustard", "nuts", "peanuts", "sesame", "soya", "sulphites",
    ];
    const DIETARY_OPTIONS = [
      "halal", "vegan", "vegetarian", "gluten_free", "nut_free", "dairy_free", "keto", "kosher",
    ];

    const results = { success: 0, failed: 0, errors: [] };

    for (const row of records) {
      const handle = row.handle || row.Handle || row.product_handle;
      if (!handle) {
        results.failed++;
        results.errors.push({ row, error: "Missing product handle" });
        continue;
      }

      // Look up product by handle
      const lookupQuery = `
        query FindProduct($query: String!) {
          products(first: 1, query: $query) {
            edges { node { id title } }
          }
        }
      `;
      const lookup = await shopifyGraphQL(shop, accessToken, lookupQuery, {
        query: `handle:${handle}`,
      });

      const product = lookup.data.products.edges[0]?.node;
      if (!product) {
        results.failed++;
        results.errors.push({ handle, error: "Product not found" });
        continue;
      }

      // Build allergen data from CSV columns
      const allergens = {};
      for (const key of EU_ALLERGENS) {
        const csvVal = row[key] || row[key.charAt(0).toUpperCase() + key.slice(1)];
        allergens[key] = csvVal === "true" || csvVal === "1" || csvVal === "yes";
      }

      // Build dietary data from CSV columns
      const dietary = {};
      for (const key of DIETARY_OPTIONS) {
        const csvVal = row[key] || row[key.charAt(0).toUpperCase() + key.slice(1)];
        dietary[key] = csvVal === "true" || csvVal === "1" || csvVal === "yes";
      }

      const metafields = [
        {
          ownerId: product.id,
          namespace: "safeserve",
          key: "allergens",
          value: JSON.stringify(allergens),
          type: "json",
        },
        {
          ownerId: product.id,
          namespace: "safeserve",
          key: "dietary",
          value: JSON.stringify(dietary),
          type: "json",
        },
      ];

      // If nutrition columns exist, include them
      if (row.calories || row.Calories) {
        const nutrition = {
          calories: parseFloat(row.calories || row.Calories) || 0,
          total_fat: parseFloat(row.total_fat || row["Total Fat"]) || 0,
          saturated_fat: parseFloat(row.saturated_fat || row["Saturated Fat"]) || 0,
          trans_fat: parseFloat(row.trans_fat || row["Trans Fat"]) || 0,
          cholesterol: parseFloat(row.cholesterol || row.Cholesterol) || 0,
          sodium: parseFloat(row.sodium || row.Sodium) || 0,
          total_carbohydrate: parseFloat(row.total_carbohydrate || row["Total Carbohydrate"]) || 0,
          dietary_fiber: parseFloat(row.dietary_fiber || row["Dietary Fiber"]) || 0,
          total_sugars: parseFloat(row.total_sugars || row["Total Sugars"]) || 0,
          added_sugars: parseFloat(row.added_sugars || row["Added Sugars"]) || 0,
          protein: parseFloat(row.protein || row.Protein) || 0,
          vitamin_d: parseFloat(row.vitamin_d || row["Vitamin D"]) || 0,
          calcium: parseFloat(row.calcium || row.Calcium) || 0,
          iron: parseFloat(row.iron || row.Iron) || 0,
          potassium: parseFloat(row.potassium || row.Potassium) || 0,
          serving_size: row.serving_size || row["Serving Size"] || "",
          servings_per_container: row.servings_per_container || row["Servings Per Container"] || "",
        };
        metafields.push({
          ownerId: product.id,
          namespace: "safeserve",
          key: "nutrition",
          value: JSON.stringify(nutrition),
          type: "json",
        });

        const format = row.nutrition_format || row["Nutrition Format"] || "fda";
        metafields.push({
          ownerId: product.id,
          namespace: "safeserve",
          key: "nutrition_format",
          value: format,
          type: "single_line_text_field",
        });
      }

      const mutation = `
        mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { id }
            userErrors { field message }
          }
        }
      `;

      try {
        const result = await shopifyGraphQL(shop, accessToken, mutation, { metafields });
        if (result.data.metafieldsSet.userErrors.length > 0) {
          results.failed++;
          results.errors.push({ handle, error: result.data.metafieldsSet.userErrors });
        } else {
          results.success++;
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ handle, error: err.message });
      }
    }

    // Update product count
    if (results.success > 0) {
      await prisma.merchantPlan.upsert({
        where: { shop },
        create: { shop, plan: "free", productCount: results.success },
        update: { productCount: { increment: results.success } },
      });
    }

    res.json(results);
  } catch (err) {
    console.error("[api] POST /api/import/csv error:", err);
    res.status(500).json({ error: "CSV import failed" });
  }
});

// ---------------------------------------------------------------------------
// Billing API Routes
// ---------------------------------------------------------------------------

// GET /api/billing/status — get current subscription status
app.get("/api/billing/status", verifyRequest, async (req, res) => {
  const { shop, accessToken } = req.shopSession;

  try {
    const result = await shopifyGraphQL(shop, accessToken, GET_ACTIVE_SUBSCRIPTIONS);
    const subscriptions = result.data.currentAppInstallation.activeSubscriptions;

    const merchantPlan = await prisma.merchantPlan.findUnique({ where: { shop } });
    const plan = merchantPlan?.plan || "free";
    const productCount = merchantPlan?.productCount || 0;
    const planDetails = PLANS[plan];

    res.json({
      plan,
      productCount,
      productLimit: planDetails.productLimit === Infinity ? "unlimited" : planDetails.productLimit,
      price: planDetails.price,
      subscriptions,
    });
  } catch (err) {
    console.error("[api] GET /api/billing/status error:", err);
    res.status(500).json({ error: "Failed to fetch billing status" });
  }
});

// POST /api/billing/subscribe — create subscription for chosen plan
app.post("/api/billing/subscribe", verifyRequest, async (req, res) => {
  const { shop, accessToken } = req.shopSession;
  const { plan } = req.body;

  if (!plan || !PLANS[plan] || plan === "free") {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const planDetails = PLANS[plan];
  const returnUrl = `${process.env.SHOPIFY_APP_URL}/api/billing/callback?shop=${shop}&plan=${plan}`;

  try {
    const result = await shopifyGraphQL(shop, accessToken, CREATE_SUBSCRIPTION, {
      name: `SafeServe ${planDetails.name}`,
      returnUrl,
      test: !IS_PROD,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: planDetails.price, currencyCode: "USD" },
              interval: "EVERY_30_DAYS",
            },
          },
        },
      ],
    });

    const { confirmationUrl, userErrors } = result.data.appSubscriptionCreate;
    if (userErrors.length > 0) {
      return res.status(400).json({ error: "Subscription creation failed", details: userErrors });
    }

    res.json({ confirmationUrl });
  } catch (err) {
    console.error("[api] POST /api/billing/subscribe error:", err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

// GET /api/billing/callback — handle return from Shopify billing confirmation
app.get("/api/billing/callback", async (req, res) => {
  const { shop, plan, charge_id } = req.query;

  if (charge_id && plan && shop) {
    await prisma.merchantPlan.upsert({
      where: { shop },
      create: { shop, plan, subscriptionId: charge_id },
      update: { plan, subscriptionId: charge_id },
    });
  }

  res.redirect(`/?shop=${shop}`);
});

// POST /api/billing/cancel — cancel subscription
app.post("/api/billing/cancel", verifyRequest, async (req, res) => {
  const { shop, accessToken } = req.shopSession;

  try {
    const merchantPlan = await prisma.merchantPlan.findUnique({ where: { shop } });
    if (!merchantPlan?.subscriptionId) {
      return res.status(400).json({ error: "No active subscription to cancel" });
    }

    const result = await shopifyGraphQL(shop, accessToken, CANCEL_SUBSCRIPTION, {
      id: `gid://shopify/AppSubscription/${merchantPlan.subscriptionId}`,
    });

    const { userErrors } = result.data.appSubscriptionCancel;
    if (userErrors.length > 0) {
      return res.status(400).json({ error: "Cancellation failed", details: userErrors });
    }

    await prisma.merchantPlan.update({
      where: { shop },
      data: { plan: "free", subscriptionId: null },
    });

    res.json({ success: true, plan: "free" });
  } catch (err) {
    console.error("[api] POST /api/billing/cancel error:", err);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// ---------------------------------------------------------------------------
// Static / Frontend Serving
// ---------------------------------------------------------------------------
if (IS_PROD) {
  app.use(serveStatic(path.join(__dirname, "frontend", "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
  });
}

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`SafeServe backend running on port ${PORT}`);
});
