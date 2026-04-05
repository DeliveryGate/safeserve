import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";

import Dashboard from "./pages/index.jsx";
import Products from "./pages/products.jsx";
import ProductEditor from "./pages/products/[id].jsx";
import ImportCSV from "./pages/import.jsx";
import Settings from "./pages/settings.jsx";

function App() {
  return (
    <AppProvider i18n={enTranslations}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductEditor />} />
          <Route path="/import" element={<ImportCSV />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
