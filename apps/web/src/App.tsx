import { Route, Routes } from "react-router-dom";

import { ScrollToTop } from "@/components/site/ScrollToTop";
import { SiteLayout } from "@/components/site/SiteLayout";
import { DocsPage } from "@/pages/Docs";
import { EmergencyPage } from "@/pages/Emergency";
import { HomePage } from "@/pages/Home";
import { NotFoundPage } from "@/pages/NotFound";
import { PrivacyPage } from "@/pages/Privacy";
import { SupportPage } from "@/pages/Support";
import { TermsPage } from "@/pages/Terms";

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/emergency/:token" element={<EmergencyPage />} />
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
