export interface HelpFaq {
  question: string;
  answer: string;
}

export const helpFaqs: HelpFaq[] = [
  {
    question: "How do I start a map?",
    answer: "Search for a place in the location field or enter coordinates, then adjust the map area and choose a layout. Place-name search and map tiles rely on external OpenStreetMap-based services.",
  },
  {
    question: "Can I make a map for a small town or village?",
    answer: "Yes. Search by place name or use coordinates to move the map to a specific area. Available map detail depends on the underlying map data at that location.",
  },
  {
    question: "What can I customize?",
    answer: "Choose a theme and layout, change supported map layers, select from 13 border styles, adjust line thickness and spacing, choose solid or gradient colors, add location labels and a tagline, and tune text styling.",
  },
  {
    question: "How can I preview my design on a wall?",
    answer: "Open Special Full Screen and choose Upload Wall Photo. Use Adjust Poster and Layout to position the preview. On supported phones, Open Camera requires camera permission for this site.",
  },
  {
    question: "Can I add my own markers or a walking route?",
    answer: "Yes. The Markers panel includes built-in and emoji choices and supports custom icon uploads. The Routes panel accepts GPX tracks and provides route and endpoint styling.",
  },
  {
    question: "What file formats can I download?",
    answer: "The Download panel currently offers PNG, JPG, TIFF, PDF, SVG, and ZIP bundles. Raster exports are capped at up to 300 PPI and may be lower for very large layouts or device limits. SVG can scale without pixelation, though map detail still depends on the source map data.",
  },
  {
    question: "Where can I find the file I just downloaded?",
    answer: "Check your browser’s Downloads list first. On iPhone or iPad, open Files, tap Browse, then Downloads; Safari also shows recent downloads beside its address field.",
  },
  {
    question: "What can I try if the download does not start?",
    answer: "Check the browser’s Downloads list for a blocked or failed file, make sure your device has room to save it, then try the export once more. If it still fails, tell us your browser and device and include a screenshot of any message.",
  },
  {
    question: "Why does my exported image look soft when I print it?",
    answer: "Raster output is limited to up to 300 PPI and can be lower if the device cannot render the requested canvas size. Check the actual file dimensions and effective resolution against the print size. If your print provider accepts SVG, it scales without pixelation, but it cannot add map detail missing from the source data.",
  },
  {
    question: "Can I add a GPX route, and why might it be rejected?",
    answer: "Yes. Upload a valid .gpx file under 10 MB with track points. A damaged XML file or one with no usable track points cannot be added; if the route still looks wrong, tell support what device and GPX app you used.",
  },
  {
    question: "Why does my map have fewer streets or details than another place?",
    answer: "Street and place detail comes from the map data available for that location. Some areas have more complete data than others, and MAPARTE cannot add missing streets to the source data.",
  },
  {
    question: "What should I send if an export fails or looks damaged?",
    answer: "Email support@maparte.com with a short description, the browser and device you used, the steps that led to the problem, and a screenshot of the result or error. Attach the affected exported file if you are comfortable sharing it; it may show the place printed on your map.",
  },
  {
    question: "When will support get back to me?",
    answer: "We’ll acknowledge your message within 24 hours and email you an update within 48 hours. If a visual walkthrough is the clearest way to explain a fix, we’ll include one by email.",
  },
  {
    question: "Why can’t I return a digital map?",
    answer: "MAPARTE downloads are currently free and checkout is turned off, so no payment is taken and there is no purchase to return. If an export is broken or does not match the preview, contact support and we’ll help investigate it. Any future paid product would need its own clearly stated checkout terms.",
  },
  {
    question: "Does MAPARTE use my device location automatically?",
    answer: "No. Device location is requested only when you choose the location control. If you use place search or reverse geocoding, the relevant location query is sent to the map-search service. See the Privacy Policy for details.",
  },
  {
    question: "Why is OpenStreetMap credited on the map?",
    answer: "MAPARTE uses OpenStreetMap data and map services. The credit and license link need to remain visible with the map or exported artwork.",
  },
  {
    question: "How do I prepare a design for printing?",
    answer: "Choose the intended physical dimensions before exporting. Check the selected file’s pixel dimensions and effective resolution with your print provider, and confirm their bleed, color, and paper requirements.",
  },
];

