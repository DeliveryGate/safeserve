import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  Button,
  Badge,
  Toast,
  Frame,
  Text,
  BlockStack,
  InlineStack,
  ProgressBar,
  Banner,
  Divider,
  Box,
} from "@shopify/polaris";

const PLANS = {
  free: {
    name: "Free",
    price: 0,
    productLimit: 10,
    features: ["10 products", "All badge types", "Nutrition labels", "No credit card required"],
  },
  starter: {
    name: "Starter",
    price: 9.99,
    productLimit: 100,
    features: ["100 products", "All features", "CSV import", "Email support"],
  },
  pro: {
    name: "Pro",
    price: 19.99,
    productLimit: Infinity,
    features: ["Unlimited products", "All features", "CSV import", "Priority support"],
  },
};

export default function Settings() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";

  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch(`/api/billing/status?shop=${shop}`);
      if (!res.ok) throw new Error("Failed to load billing");
      setBilling(await res.json());
    } catch (err) {
      setToastMessage(err.message);
      setToastError(true);
      setToastActive(true);
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleSubscribe = async (plan) => {
    setSubscribing(plan);
    try {
      const res = await fetch(`/api/billing/subscribe?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Subscription failed");

      if (data.confirmationUrl) {
        window.top.location.href = data.confirmationUrl;
      }
    } catch (err) {
      setToastMessage(err.message);
      setToastError(true);
      setToastActive(true);
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/billing/cancel?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancellation failed");

      setToastMessage("Subscription cancelled. You are now on the Free plan.");
      setToastError(false);
      setToastActive(true);
      fetchBilling();
    } catch (err) {
      setToastMessage(err.message);
      setToastError(true);
      setToastActive(true);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Frame>
        <Page title="Settings">
          <Layout>
            <Layout.Section>
              <Card>
                <Box padding="800">
                  <InlineStack align="center">
                    <Text variant="bodyMd">Loading...</Text>
                  </InlineStack>
                </Box>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </Frame>
    );
  }

  const currentPlan = billing?.plan || "free";
  const productCount = billing?.productCount || 0;
  const productLimit = billing?.productLimit;
  const limitNum = productLimit === "unlimited" ? Infinity : productLimit;
  const usagePercent = limitNum === Infinity ? 0 : Math.round((productCount / limitNum) * 100);

  return (
    <Frame>
      <Page
        title="Settings"
        backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}
      >
        <Layout>
          {/* Current Plan */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="headingMd" as="h2">Current Plan</Text>
                  <Badge tone={currentPlan === "pro" ? "success" : currentPlan === "starter" ? "info" : undefined}>
                    {PLANS[currentPlan]?.name || "Free"}
                  </Badge>
                </InlineStack>

                <BlockStack gap="200">
                  <Text variant="bodyMd">
                    Products configured: {productCount} / {productLimit === "unlimited" ? "Unlimited" : productLimit}
                  </Text>
                  {limitNum !== Infinity && (
                    <ProgressBar progress={usagePercent} size="small" tone={usagePercent > 80 ? "critical" : undefined} />
                  )}
                </BlockStack>

                {currentPlan !== "free" && (
                  <Box>
                    <Button
                      tone="critical"
                      variant="plain"
                      loading={cancelling}
                      onClick={handleCancel}
                    >
                      Cancel subscription
                    </Button>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Plan Cards */}
          <Layout.Section>
            <Text variant="headingMd" as="h2">Available Plans</Text>
          </Layout.Section>

          {Object.entries(PLANS).map(([key, plan]) => (
            <Layout.Section variant="oneThird" key={key}>
              <Card>
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="headingMd" as="h3">{plan.name}</Text>
                    {key === currentPlan && <Badge tone="success">Current</Badge>}
                  </InlineStack>

                  <Text variant="headingXl" as="p">
                    {plan.price === 0 ? "Free" : `$${plan.price}/mo`}
                  </Text>

                  <BlockStack gap="100">
                    {plan.features.map((f) => (
                      <Text variant="bodyMd" key={f}>
                        {f}
                      </Text>
                    ))}
                  </BlockStack>

                  {key !== "free" && key !== currentPlan && (
                    <Button
                      variant="primary"
                      loading={subscribing === key}
                      onClick={() => handleSubscribe(key)}
                    >
                      {currentPlan === "free" ? "Upgrade" : key === "pro" ? "Upgrade" : "Downgrade"} to {plan.name}
                    </Button>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          ))}

          {/* Support */}
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Support</Text>
                <Text variant="bodyMd">
                  Need help? Contact us at support@safeserve.saltcore.co.uk
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {toastActive && (
          <Toast
            content={toastMessage}
            error={toastError}
            onDismiss={() => setToastActive(false)}
          />
        )}
      </Page>
    </Frame>
  );
}
