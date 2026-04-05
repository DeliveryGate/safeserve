import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  Banner,
  Button,
  EmptyState,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Spinner,
  Box,
} from "@shopify/polaris";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState(null);

  const shop = new URLSearchParams(window.location.search).get("shop") || "";

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch(`/api/billing/status?shop=${shop}`);
      if (!res.ok) throw new Error("Failed to load billing status");
      setBilling(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  if (loading) {
    return (
      <Page title="SafeServe">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="800">
                <InlineStack align="center"><Spinner size="large" /></InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="SafeServe">
        <Layout>
          <Layout.Section>
            <Banner tone="critical">{error}</Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const { plan, productCount, productLimit } = billing;
  const hasProducts = productCount > 0;

  if (!hasProducts) {
    return (
      <Page title="SafeServe">
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Welcome to SafeServe"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                action={{
                  content: "Add allergen data",
                  onAction: () => navigate(`/products?shop=${shop}`),
                }}
                secondaryAction={{
                  content: "Import CSV",
                  onAction: () => navigate(`/import?shop=${shop}`),
                }}
              >
                <p>
                  Add allergen and dietary information to your products to comply
                  with UK Natasha's Law and EU Regulation 1169/2011.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title="SafeServe">
      <Layout>
        {plan === "free" && productCount >= 8 && (
          <Layout.Section>
            <Banner
              title="Approaching free plan limit"
              tone="warning"
              action={{
                content: "Upgrade plan",
                onAction: () => navigate(`/settings?shop=${shop}`),
              }}
            >
              <p>
                You have configured {productCount} of {productLimit} products on
                the free plan. Upgrade to add more.
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Products Configured</Text>
              <Text variant="headingXl" as="p">{productCount}</Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Product Limit</Text>
              <Text variant="headingXl" as="p">
                {productLimit === "unlimited" ? "Unlimited" : productLimit}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Current Plan</Text>
              <InlineStack gap="200" blockAlign="center">
                <Text variant="headingXl" as="p">
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </Text>
                <Badge tone={plan === "pro" ? "success" : plan === "starter" ? "info" : undefined}>
                  {plan === "free" ? "$0" : `$${billing.price}/mo`}
                </Badge>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Quick Actions</Text>
              <InlineStack gap="300">
                <Button onClick={() => navigate(`/products?shop=${shop}`)}>
                  Add allergen data
                </Button>
                <Button onClick={() => navigate(`/import?shop=${shop}`)}>
                  Import CSV
                </Button>
                <Button onClick={() => navigate(`/products?shop=${shop}`)}>
                  View all products
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
