import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Button,
  TextField,
  Pagination,
  Spinner,
  Banner,
  Thumbnail,
  InlineStack,
  Box,
} from "@shopify/polaris";

export default function Products() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageInfo, setPageInfo] = useState(null);
  const [cursors, setCursors] = useState([null]);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(
    async (cursor = null) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ shop });
        if (cursor) params.set("cursor", cursor);
        if (search) params.set("search", search);

        const res = await fetch(`/api/products?${params}`);
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        setProducts(data.products);
        setPageInfo(data.pageInfo);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [shop, search]
  );

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleNext = () => {
    if (pageInfo?.hasNextPage) {
      const newCursors = [...cursors, pageInfo.endCursor];
      setCursors(newCursors);
      setCurrentPage(currentPage + 1);
      fetchProducts(pageInfo.endCursor);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      fetchProducts(cursors[newPage]);
    }
  };

  const extractNumericId = (gid) => gid.replace("gid://shopify/Product/", "");

  const rows = products.map((p) => [
    <InlineStack gap="300" blockAlign="center" key={p.id}>
      <Thumbnail source={p.image || ""} alt={p.imageAlt || p.title} size="small" />
      <span>{p.title}</span>
    </InlineStack>,
    p.allergensConfigured ? (
      <Badge tone="success">Configured</Badge>
    ) : (
      <Badge tone="critical">Missing data</Badge>
    ),
    p.dietaryIcons.length > 0 ? (
      <InlineStack gap="100">
        {p.dietaryIcons.map((icon) => (
          <Badge key={icon} tone="info">
            {icon.replace("_", "-")}
          </Badge>
        ))}
      </InlineStack>
    ) : (
      "—"
    ),
    <Button
      key={p.id}
      size="slim"
      onClick={() => navigate(`/products/${extractNumericId(p.id)}?shop=${shop}`)}
    >
      Edit
    </Button>,
  ]);

  return (
    <Page
      title="Products"
      backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}
      primaryAction={{
        content: "Import CSV",
        onAction: () => navigate(`/import?shop=${shop}`),
      }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical">{error}</Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <Box paddingBlockEnd="400">
              <TextField
                label="Search products"
                value={search}
                onChange={setSearch}
                placeholder="Search by product name..."
                clearButton
                onClearButtonClick={() => setSearch("")}
                autoComplete="off"
              />
            </Box>

            {loading ? (
              <Box padding="800">
                <InlineStack align="center"><Spinner size="large" /></InlineStack>
              </Box>
            ) : (
              <>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["Product", "Allergens", "Dietary", "Actions"]}
                  rows={rows}
                  verticalAlign="middle"
                />
                <Box paddingBlockStart="400">
                  <InlineStack align="center">
                    <Pagination
                      hasPrevious={currentPage > 0}
                      hasNext={pageInfo?.hasNextPage || false}
                      onPrevious={handlePrevious}
                      onNext={handleNext}
                    />
                  </InlineStack>
                </Box>
              </>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
