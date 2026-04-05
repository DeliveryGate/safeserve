/**
 * SafeServe — Metafield Definition Setup Script
 * Version: 1.0.0
 * Owner: SaltCore Group Limited
 * April 2026
 *
 * Creates the required metafield definitions for SafeServe on a Shopify store.
 *
 * Usage:
 *   node scripts/setup-metafields.js
 *
 * Required environment variables (.env):
 *   SHOPIFY_API_KEY
 *   SHOPIFY_API_SECRET
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
// Metafield definitions to create
// ============================================================

const METAFIELD_DEFINITIONS = [
  {
    name: 'Allergens',
    namespace: 'safeserve',
    key: 'allergens',
    type: 'json',
    description: 'JSON object with 14 EU allergen booleans (celery, gluten, crustaceans, eggs, fish, lupin, milk, molluscs, mustard, nuts, peanuts, sesame, soya, sulphites)',
    ownerType: 'PRODUCT',
  },
  {
    name: 'Dietary Info',
    namespace: 'safeserve',
    key: 'dietary',
    type: 'json',
    description: 'JSON object with dietary certification booleans (vegan, vegetarian, halal, kosher, gluten_free, nut_free, dairy_free, keto)',
    ownerType: 'PRODUCT',
  },
  {
    name: 'Nutrition Facts',
    namespace: 'safeserve',
    key: 'nutrition',
    type: 'json',
    description: 'JSON object with nutrition data (calories, total_fat, saturated_fat, trans_fat, cholesterol, sodium, total_carbohydrate, dietary_fiber, total_sugars, protein, etc.)',
    ownerType: 'PRODUCT',
  },
  {
    name: 'Nutrition Label Format',
    namespace: 'safeserve',
    key: 'nutrition_format',
    type: 'single_line_text_field',
    description: 'Label format to display: "fda" or "eu"',
    ownerType: 'PRODUCT',
    validations: [
      {
        name: 'choices',
        value: JSON.stringify(['fda', 'eu']),
      },
    ],
  },
];

// ============================================================
// GraphQL helper
// ============================================================

/**
 * Send a GraphQL request to the Shopify Admin API.
 * @param {string} query - GraphQL query or mutation string
 * @param {object} variables - GraphQL variables
 * @returns {Promise<object>} Parsed JSON response
 */
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
// Mutation: Create a single metafield definition
// ============================================================

const CREATE_METAFIELD_DEFINITION = `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        name
        namespace
        key
        type { name }
        ownerType
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

/**
 * Create a metafield definition on the store.
 * @param {object} defn - Metafield definition config
 * @returns {Promise<void>}
 */
async function createMetafieldDefinition(defn) {
  const variables = {
    definition: {
      name: defn.name,
      namespace: defn.namespace,
      key: defn.key,
      type: defn.type,
      description: defn.description,
      ownerType: defn.ownerType,
      ...(defn.validations ? { validations: defn.validations } : {}),
    },
  };

  const response = await graphqlRequest(CREATE_METAFIELD_DEFINITION, variables);

  if (response.errors) {
    throw new Error('GraphQL errors: ' + JSON.stringify(response.errors));
  }

  const result = response.data.metafieldDefinitionCreate;

  if (result.userErrors && result.userErrors.length > 0) {
    const alreadyExists = result.userErrors.some(
      (e) => e.code === 'TAKEN' || e.message.toLowerCase().includes('taken') || e.message.toLowerCase().includes('already')
    );

    if (alreadyExists) {
      console.log(`  SKIP — Definition already exists: ${defn.namespace}.${defn.key}`);
      return;
    }

    throw new Error(
      `Failed to create ${defn.namespace}.${defn.key}: ` +
      result.userErrors.map((e) => e.message).join(', ')
    );
  }

  const created = result.createdDefinition;
  console.log(`  OK   — Created: ${created.namespace}.${created.key} (${created.type.name}) on ${created.ownerType}`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('\nSafeServe — Metafield Setup');
  console.log(`Store: ${STORE_DOMAIN}`);
  console.log(`API:   ${API_VERSION}`);
  console.log('');
  console.log(`Creating ${METAFIELD_DEFINITIONS.length} metafield definitions...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const defn of METAFIELD_DEFINITIONS) {
    try {
      await createMetafieldDefinition(defn);
      successCount++;
    } catch (err) {
      console.error(`  ERROR — ${defn.namespace}.${defn.key}: ${err.message}`);
      errorCount++;
    }
  }

  console.log('');
  console.log('Setup complete.');
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors:  ${errorCount}`);

  if (errorCount > 0) {
    console.log('\nReview errors above. Re-run the script to retry failed definitions.');
    process.exit(1);
  }

  console.log('\nAll metafield definitions are ready.');
  console.log('Next step: run "node scripts/seed-test-data.js" to add sample data.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
