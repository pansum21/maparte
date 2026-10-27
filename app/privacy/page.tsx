export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-gray-300">
      <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
      <p className="mb-4">Last Updated: October 2026. MapArte respects your privacy and ensures your location search queries are never sold to third parties.</p>
      
      <h2 className="text-xl font-semibold text-white mt-6 mb-2">1. Information We Collect</h2>
      <p className="mb-4">We collect minimal information necessary to deliver our services: map location preferences, email addresses provided for order delivery, and anonymous analytics via Google Analytics to optimize site performance.</p>

      <h2 className="text-xl font-semibold text-white mt-6 mb-2">2. Payment Processing</h2>
      <p className="mb-4">We do not store your credit card or sensitive financial information. All cross-border transactions are securely handled by <strong>Dodo Payments</strong> (Merchant of Record) in compliance with PCI-DSS standards.</p>

      <h2 className="text-xl font-semibold text-white mt-6 mb-2">3. Cookies & Analytics</h2>
      <p>We use standard cookies for site functionality and aggregated traffic measurement (Google Search Console, Bing Webmaster, Pinterest tag). You can manage cookie preferences via your browser settings.</p>
    </div>
  );
}
