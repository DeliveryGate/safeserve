import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  DropZone,
  DataTable,
  Button,
  Banner,
  Text,
  BlockStack,
  InlineStack,
  ProgressBar,
  Box,
  Link,
} from "@shopify/polaris";

const SAMPLE_CSV = `handle,celery,gluten,crustaceans,eggs,fish,lupin,milk,molluscs,mustard,nuts,peanuts,sesame,soya,sulphites,halal,vegan,vegetarian,gluten_free,nut_free,dairy_free,keto,kosher,calories,total_fat,saturated_fat,trans_fat,cholesterol,sodium,total_carbohydrate,dietary_fiber,total_sugars,added_sugars,protein,serving_size,nutrition_format
sourdough-bread,false,true,false,true,false,false,true,false,false,false,false,true,false,false,true,false,true,false,true,false,false,false,250,3,1,0,10,400,48,2,5,2,8,1 slice (45g),fda
garden-salad,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,true,true,true,true,true,true,true,85,4,0.5,0,0,120,10,3,5,0,3,1 bowl (200g),eu`;

export default function ImportCSV() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDrop = useCallback((_dropFiles, acceptedFiles) => {
    const accepted = acceptedFiles[0];
    if (!accepted) return;

    setFile(accepted);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setError("CSV must have a header row and at least one data row");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1, 6).map((line) =>
        line.split(",").map((cell) => cell.trim())
      );

      setPreview({ headers, rows, totalRows: lines.length - 1 });
    };
    reader.readAsText(accepted);
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setProgress(30);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setProgress(60);
      const res = await fetch(`/api/import/csv?shop=${shop}`, {
        method: "POST",
        body: formData,
      });
      setProgress(90);
      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade) {
          setError(
            `Import would exceed your ${data.plan} plan limit of ${data.limit} products. ` +
            `You currently have ${data.current} configured and are trying to import ${data.importing}. ` +
            `Please upgrade your plan.`
          );
        } else {
          setError(data.error || "Import failed");
        }
      } else {
        setResult(data);
      }
      setProgress(100);
    } catch (err) {
      setError("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "safeserve-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Page
      title="Import CSV"
      backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Upload allergen data</Text>
              <Text variant="bodyMd" tone="subdued">
                Upload a CSV file with product handles and allergen/dietary/nutrition data.
                Products are matched by their handle (URL slug).
              </Text>
              <Button onClick={downloadSample}>Download sample CSV template</Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <DropZone
              accept=".csv,text/csv"
              type="file"
              onDrop={handleDrop}
              allowMultiple={false}
            >
              {file ? (
                <Box padding="400">
                  <BlockStack gap="200">
                    <Text variant="bodyMd" fontWeight="bold">{file.name}</Text>
                    <Text variant="bodySm" tone="subdued">
                      {(file.size / 1024).toFixed(1)} KB
                      {preview && ` — ${preview.totalRows} products found`}
                    </Text>
                  </BlockStack>
                </Box>
              ) : (
                <DropZone.FileUpload actionHint="Accepts .csv files" />
              )}
            </DropZone>
          </Card>
        </Layout.Section>

        {preview && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Preview (first {Math.min(5, preview.rows.length)} of {preview.totalRows} rows)
                </Text>
                <Box overflowX="scroll">
                  <DataTable
                    columnContentTypes={preview.headers.map(() => "text")}
                    headings={preview.headers.slice(0, 8).concat(
                      preview.headers.length > 8 ? [`+${preview.headers.length - 8} more`] : []
                    )}
                    rows={preview.rows.map((row) =>
                      row.slice(0, 8).concat(
                        row.length > 8 ? ["..."] : []
                      )
                    )}
                  />
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {importing && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="bodyMd">Importing products...</Text>
                <ProgressBar progress={progress} size="small" />
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {error && (
          <Layout.Section>
            <Banner tone="critical" title="Import error">
              <p>{error}</p>
              {error.includes("upgrade") && (
                <Box paddingBlockStart="200">
                  <Button onClick={() => navigate(`/settings?shop=${shop}`)}>
                    Upgrade plan
                  </Button>
                </Box>
              )}
            </Banner>
          </Layout.Section>
        )}

        {result && (
          <Layout.Section>
            <Banner
              title="Import complete"
              tone={result.failed > 0 ? "warning" : "success"}
            >
              <p>
                {result.success} products imported successfully.
                {result.failed > 0 && ` ${result.failed} failed.`}
              </p>
              {result.errors.length > 0 && (
                <ul>
                  {result.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err.handle || "unknown"}: {typeof err.error === "string" ? err.error : JSON.stringify(err.error)}</li>
                  ))}
                </ul>
              )}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <InlineStack align="end" gap="300">
            <Button onClick={() => navigate(`/products?shop=${shop}`)}>
              View products
            </Button>
            <Button
              variant="primary"
              disabled={!file || importing}
              loading={importing}
              onClick={handleImport}
            >
              Import {preview ? `${preview.totalRows} products` : ""}
            </Button>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
