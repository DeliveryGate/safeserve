/**
 * SafeServe — Test Data Seed Script
 * Version: 1.0.0
 * Owner: SaltCore Group Limited
 * April 2026
 *
 * Adds sample allergen, dietary and nutrition metafields to the first 3
 * products in the dev store so that the SafeServe theme extension blocks
 * can be tested visually without manual data entry.
 *
 * Usage:
 *   node scripts/seed-test-data.js
 *
 * Required environment variables (.env):
 *   SHOPIFY_STORE_DOMAIN   (e.g. your-store.myshopify.com)
 *   SHOPIFY_ACCESS_TOKEN   (offline access token from OAuth)
 */

'use strict';

const https = require('https');
require('dotenv').config();

// ============================================================
// Config
// ============================================================

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2026-01';

if (!STORE_DOMAIN || !ACCESS_TOKEN) {
  console.error('ERROR: SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN must be set in .env');
  process.exit(1);
}

// ============================================================
// Sample data for 3 products
// ============================================================

const SAMPLE_DATA = [
  {
    // Product 1: A bread product — contains gluten, eggs, milk
    label: 'Sourdough Bread',
    allergens: {
      celery: false,
      gluten: true,
      crustaceans: false,
      eggs: true,
      fish: false,
      lupin: false,
      milk: true,
      molluscs: false,
      mustard: false,
      nuts: false,
      peanuts: false,
      sesame: true,
      soya: false,
      sulphites: false,
    },
    dietary: {
      vegan: false,
      vegetarian: true,
      halal: true,
      kosher: false,
      gluten_free: false,
      nut_free: true,
      dairy_free: false,
      keto: false,
    },
    nutrition: {
      serving_size: '1 slice (45g)',
      servings_per_container: 16,
      calories: 120,
      total_fat: 1.5,
      total_fat_dv: 2,
      saturated_fat: 0,
      saturated_fat_dv: 0,
      trans_fat: 0,
      cholesterol: 0,
      cholesterol_dv: 0,
      sodium: 230,
      sodium_dv: 10,
      total_carbohydrate: 23,
      total_carbohydrate_dv: 8,
      dietary_fiber: 1,
      dietary_fiber_dv: 4,
      total_sugars: 2,
      added_sugars: 1,
      added_sugars_dv: 2,
      protein: 4,
      vitamin_d: 0,
      vitamin_d_dv: 0,
      calcium: 20,
      calcium_dv: 2,
      iron: 1.4,
      iron_dv: 8,
      potassium: 60,
      potassium_dv: 2,
      // EU fields
      energy_kj: 502,
      energy_kcal: 120,
      salt: 0.58,
    },
    nutrition_format: 'fda',
  },
  {
    // Product 2: A vegan salad — allergen-free, plant-based
    label: 'Garden Salad',
    allergens: {
      celery: false,
      gluten: false,
      crustaceans: false,
      eggs: false,
      fish: false,
      lupin: false,
      milk: false,
      molluscs: false,
      mustard: false,
      nuts: false,
      peanuts: false,
      sesame: false,
      soya: false,
      sulphites: false,
    },
    dietary: {
      vegan: true,
      vegetarian: true,
      halal: true,
      kosher: true,
      gluten_free: true,
      nut_free: true,
      dairy_free: true,
      keto: false,
    },
    nutrition: {
      serving_size: '100g',
      calories: 35,
      total_fat: 0.3,
      total_fat_dv: 0,
      saturated_fat: 0,
      saturated_fat_dv: 0,
      trans_fat: 0,
      cholesterol: 0,
      cholesterol_dv: 0,
      sodium: 28,
      sodium_dv: 1,
      total_carbohydrate: 7,
      total_carbohydrate_dv: 3,
      dietary_fiber: 2.2,
      dietary_fiber_dv: 8,
      total_sugars: 3.5,
      added_sugars: 0,
      added_sugars_dv: 0,
      protein: 1.8,
      // EU fields
      energy_kj: 147,
      energy_kcal: 35,
      salt: 0.07,
    },
    nutrition_format: 'eu',
  },
  {
    // Product 3: A seafood pasta — contains multiple allergens
    label: 'Prawn Linguine',
    allergens: {
      celery: false,
      gluten: true,
      crustaceans: true,
      eggs: false,
      fish: false,
      lupin: false,
      milk: false,
      molluscs: false,
      mustard: false,
      nuts: false,
      peanuts: false,
      sesame: false,
      soya: false,
      sulphites: true,
    },
    dietary: {
      vegan: false,
      vegetarian: false,
      halal: false,
      kosher: false,
      gluten_free: false,
      nut_free: true,
      dairy_free: true,
      keto: false,
    },
    nutrition: {
      serving_size: '1 portion (280g)',
      servings_per_container: 1,
      calories: 420,
      total_fat: 12,
      total_fat_dv: 15,
      saturated_fat: 2,
      saturated_fat_dv: 10,
      trans_fat: 0,
      cholesterol: 140,
      cholesterol_dv: 47,
      sodium: 680,
      sodium_dv: 30,
      total_carbohydrate: 52,
      total_carbohydrate_dv: 19,
      dietary_fiber: 3,
      dietary_fiber_dv: 11,
      total_sugars: 4,
      added_sugars: 0,
      added_sugars_dv: 0,
      protein: 28,
      iron: 2.5,
      iron_dv: 14,
      // EU fields
      energy_kj: 1758,
      energy_kcal: 420,
      salt: 1.73,
    },
    nutrition_format: 'fda',
  },
];

// ============================================================
// GraphQL helper
// ============================================================

function graphqlRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });

    const options = {
      hostname: STORE_DOMAIN,
      path: `/admin/api/${API_VERSION}/graphql.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Failed to parse response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ============================================================
// Query: Get first N products
// ============================================================

const GET_FIRST_PRODUCTS = `
  query GetFirstProducts($count: Int!) {
    products(first: $count) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
`;

async function getFirstProducts(count) {
  const response = await graphqlRequest(GET_FIRST_PRODUCTS, { count });

  if (response.errors) {
    throw new Error('GraphQL errors: ' + JSON.stringify(response.errors));
  }

  return response.data.products.edges.map((edge) => edge.node);
}

// ============================================================
// Mutation: Set metafields on a product
// ============================================================

const SET_METAFIELDS = `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Write all SafeServe metafields for a single product.
 * @param {string} productId - Shopify GID (e.g. gid://shopify/Product/123)
 * @param {object} sampleData - The seed data object for this product
 */
async function setSafeServeMetafields(productId, sampleData) {
  const metafields = [
    {
      ownerId: productId,
      namespace: 'safeserve',
      key: 'allergens',
      type: 'json',
      value: JSON.stringify(sampleData.allergens),
    },
    {
      ownerId: productId,
      namespace: 'safeserve',
      key: 'dietary',
      type: 'json',
      value: JSON.stringify(sampleData.dietary),
    },
    {
      ownerId: productId,
      namespace: 'safeserve',
      key: 'nutrition',
      type: 'json',
      value: JSON.stringify(sampleData.nutrition),
    },
    {
      ownerId: productId,
      namespace: 'safeserve',
      key: 'nutrition_format',
      type: 'single_line_text_field',
      value: sampleData.nutrition_format,
    },
  ];

  const response = await graphqlRequest(SET_METAFIELDS, { metafields });

  if (response.errors) {
    throw new Error('GraphQL errors: ' + JSON.stringify(response.errors));
  }

  const result = response.data.metafieldsSet;

  if (result.userErrors && result.userErrors.length > 0) {
    throw new Error(
      'metafieldsSet errors: ' + result.userErrors.map((e) => e.message).join(', ')
    );
  }

  return result.metafields;
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('\nSafeServe — Test Data Seeder');
  console.log(`Store: ${STORE_DOMAIN}`);
  console.log(`API:   ${API_VERSION}`);
  console.log('');

  // Fetch first 3 products
  console.log('Fetching first 3 products...');
  const products = await getFirstProducts(3);

  if (products.length === 0) {
    console.error('ERROR: No products found in this store. Add some products first.');
    process.exit(1);
  }

  console.log(`Found ${products.length} product(s).\n`);

  // Seed each product
  for (let i = 0; i < Math.min(products.length, SAMPLE_DATA.length); i++) {
    const product = products[i];
    const data = SAMPLE_DATA[i];

    process.stdout.write(
      `[${i + 1}/${Math.min(products.length, SAMPLE_DATA.length)}] ` +
      `"${product.title}" → seeding as "${data.label}"... `
    );

    try {
      await setSafeServeMetafields(product.id, data);
      console.log('OK');
    } catch (err) {
      console.log('FAILED');
      console.error(`  ERROR: ${err.message}`);
    }
  }

  console.log('\nSeeding complete.');
  console.log('\nTo test the SafeServe blocks:');
  console.log('  1. Run: shopify app dev');
  console.log('  2. Open your dev store theme editor');
  console.log('  3. Navigate to a product page');
  console.log('  4. Add "Allergen Badge" or "Nutrition Label" blocks');
  console.log('  5. Save and preview — the seeded data will appear immediately.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
