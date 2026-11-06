import { createRoot } from "react-dom/client";
import HomepagePreview from "./HomepagePreview";

const root = document.getElementById("homepage-preview-root");

if (!root) {
  throw new Error("Homepage preview root element is missing.");
}

createRoot(root).render(<HomepagePreview />);
