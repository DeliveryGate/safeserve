import crypto from "crypto";

/**
 * Verify Shopify webhook HMAC signature.
 */
export function verifyWebhookHmac(rawBody, hmacHeader, secret) {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(hmacHeader)
  );
}

/**
 * Make an authenticated Shopify Admin GraphQL request.
 */
export async function shopifyGraphQL(shop, accessToken, query, variables = {}) {
  const response = await fetch(
    `https://${shop}/admin/api/2026-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Billing plan definitions.
 */
export const PLANS = {
  free: { name: "Free", price: 0, productLimit: 10 },
  starter: { name: "Starter", price: 9.99, productLimit: 100 },
  pro: { name: "Pro", price: 19.99, productLimit: Infinity },
};

/**
 * GraphQL: Create a Shopify app subscription.
 */
export const CREATE_SUBSCRIPTION = `
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

/**
 * GraphQL: Get current active subscription.
 */
export const GET_ACTIVE_SUBSCRIPTIONS = `
  query {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
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

/**
 * GraphQL: Cancel an app subscription.
 */
export const CANCEL_SUBSCRIPTION = `
  mutation AppSubscriptionCancel($id: ID!) {
    appSubscriptionCancel(id: $id) {
      userErrors { field message }
      appSubscription { id status }
    }
  }
`;
