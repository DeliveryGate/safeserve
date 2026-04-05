import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  Select,
  ChoiceList,
  Toast,
  Frame,
  Spinner,
  Banner,
  Text,
  Thumbnail,
  BlockStack,
  InlineStack,
  Box,
  Divider,
} from "@shopify/polaris";

const EU_ALLERGENS = [
  "celery", "gluten", "crustaceans", "eggs", "fish", "lupin",
  "milk", "molluscs", "mustard", "nuts", "peanuts", "sesame", "soya", "sulphites",
];

const DIETARY_OPTIONS = [
  "halal", "kosher", "vegan", "vegetarian",
  "gluten_free", "nut_free", "dairy_free", "keto",
];

const NUTRITION_FIELDS_FDA = [
  { key: "serving_size", label: "Serving Size", type: "text" },
  { key: "servings_per_container", label: "Servings Per Container", type: "text" },
  { key: "calories", label: "Calories", type: "number" },
  { key: "total_fat", label: "Total Fat (g)", type: "number" },
  { key: "saturated_fat", label: "Saturated Fat (g)", type: "number" },
  { key: "trans_fat", label: "Trans Fat (g)", type: "number" },
  { key: "cholesterol", label: "Cholesterol (mg)", type: "number" },
  { key: "sodium", label: "Sodium (mg)", type: "number" },
  { key: "total_carbohydrate", label: "Total Carbohydrate (g)", type: "number" },
  { key: "dietary_fiber", label: "Dietary Fiber (g)", type: "number" },
  { key: "total_sugars", label: "Total Sugars (g)", type: "number" },
  { key: "added_sugars", label: "Added Sugars (g)", type: "number" },
  { key: "protein", label: "Protein (g)", type: "number" },
  { key: "vitamin_d", label: "Vitamin D (mcg)", type: "number" },
  { key: "calcium", label: "Calcium (mg)", type: "number" },
  { key: "iron", label: "Iron (mg)", type: "number" },
  { key: "potassium", label: "Potassium (mg)", type: "number" },
];

const NUTRITION_FIELDS_EU = [
  { key: "serving_size", label: "Serving Size", type: "text" },
  { key: "energy_kj", label: "Energy (kJ per 100g)", type: "number" },
  { key: "energy_kcal", label: "Energy (kcal per 100g)", type: "number" },
  { key: "total_fat", label: "Fat (g per 100g)", type: "number" },
  { key: "saturated_fat", label: "Saturates (g per 100g)", type: "number" },
  { key: "total_carbohydrate", label: "Carbohydrate (g per 100g)", type: "number" },
  { key: "total_sugars", label: "Sugars (g per 100g)", type: "number" },
  { key: "dietary_fiber", label: "Fibre (g per 100g)", type: "number" },
  { key: "protein", label: "Protein (g per 100g)", type: "number" },
  { key: "salt", label: "Salt (g per 100g)", type: "number" },
];

function formatLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [allergens, setAllergens] = useState({});
  const [dietary, setDietary] = useState({});
  const [nutrition, setNutrition] = useState({});
  const [nutritionFormat, setNutritionFormat] = useState("fda");
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);
  const [error, setError] = useState(null);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${id}?shop=${shop}`);
      if (!res.ok) throw new Error("Failed to load product");
      const data = await res.json();
      setProduct(data);
      setAllergens(data.allergens || Object.fromEntries(EU_ALLERGENS.map((a) => [a, false])));
      setDietary(data.dietary || Object.fromEntries(DIETARY_OPTIONS.map((d) => [d, false])));
      setNutrition(data.nutrition || {});
      setNutritionFormat(data.nutrition_format || "fda");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, shop]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allergens,
          dietary,
          nutrition,
          nutrition_format: nutritionFormat,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade) {
          setToastMessage(`Product limit reached (${data.limit} on ${data.plan} plan). Upgrade to add more.`);
        } else {
          setToastMessage(data.error || "Failed to save");
        }
        setToastError(true);
      } else {
        setToastMessage("Allergen data saved successfully");
        setToastError(false);
      }
      setToastActive(true);
    } catch (err) {
      setToastMessage("Save failed: " + err.message);
      setToastError(true);
      setToastActive(true);
    } finally {
      setSaving(false);
    }
  };

  const toggleAllergen = (key) => {
    setAllergens((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDietary = (key) => {
    setDietary((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateNutrition = (key, value) => {
    setNutrition((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Frame>
        <Page title="Loading...">
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
      </Frame>
    );
  }

  if (error) {
    return (
      <Frame>
        <Page title="Error">
          <Layout>
            <Layout.Section>
              <Banner tone="critical">{error}</Banner>
            </Layout.Section>
          </Layout>
        </Page>
      </Frame>
    );
  }

  const nutritionFields = nutritionFormat === "eu" ? NUTRITION_FIELDS_EU : NUTRITION_FIELDS_FDA;

  return (
    <Frame>
      <Page
        title={product.title}
        backAction={{
          content: "Products",
          onAction: () => navigate(`/products?shop=${shop}`),
        }}
        primaryAction={{
          content: "Save",
          loading: saving,
          onAction: handleSave,
        }}
      >
        <Layout>
          {/* Product header */}
          <Layout.Section>
            <Card>
              <InlineStack gap="400" blockAlign="center">
                {product.image && (
                  <Thumbnail source={product.image} alt={product.imageAlt || product.title} size="large" />
                )}
                <BlockStack gap="100">
                  <Text variant="headingLg" as="h2">{product.title}</Text>
                  <Text variant="bodyMd" tone="subdued">{product.handle}</Text>
                </BlockStack>
              </InlineStack>
            </Card>
          </Layout.Section>

          {/* Allergen checkboxes */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Allergen Information</Text>
                <Text variant="bodySm" tone="subdued">
                  Select allergens present in this product (14 EU regulated allergens)
                </Text>
                <ChoiceList
                  allowMultiple
                  title="Allergens present"
                  choices={EU_ALLERGENS.map((a) => ({
                    label: formatLabel(a),
                    value: a,
                  }))}
                  selected={Object.entries(allergens)
                    .filter(([, v]) => v)
                    .map(([k]) => k)}
                  onChange={(selected) => {
                    const updated = {};
                    EU_ALLERGENS.forEach((a) => {
                      updated[a] = selected.includes(a);
                    });
                    setAllergens(updated);
                  }}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Dietary badges */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Dietary Certifications</Text>
                <ChoiceList
                  allowMultiple
                  title="Dietary certifications"
                  choices={DIETARY_OPTIONS.map((d) => ({
                    label: formatLabel(d),
                    value: d,
                  }))}
                  selected={Object.entries(dietary)
                    .filter(([, v]) => v)
                    .map(([k]) => k)}
                  onChange={(selected) => {
                    const updated = {};
                    DIETARY_OPTIONS.forEach((d) => {
                      updated[d] = selected.includes(d);
                    });
                    setDietary(updated);
                  }}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Nutrition facts */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Nutrition Facts</Text>
                <Select
                  label="Nutrition label format"
                  options={[
                    { label: "FDA (US)", value: "fda" },
                    { label: "EU", value: "eu" },
                  ]}
                  value={nutritionFormat}
                  onChange={setNutritionFormat}
                />
                <Divider />
                {nutritionFields.map((field) => (
                  <TextField
                    key={field.key}
                    label={field.label}
                    type={field.type === "number" ? "number" : "text"}
                    value={String(nutrition[field.key] || "")}
                    onChange={(val) =>
                      updateNutrition(
                        field.key,
                        field.type === "number" ? parseFloat(val) || 0 : val
                      )
                    }
                    autoComplete="off"
                  />
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Save button */}
          <Layout.Section>
            <InlineStack align="end">
              <Button variant="primary" loading={saving} onClick={handleSave}>
                Save allergen data
              </Button>
            </InlineStack>
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
