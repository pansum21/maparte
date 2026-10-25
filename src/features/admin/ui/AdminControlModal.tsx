import { useState, useEffect } from "react";
import {
  isAdminUser,
  setAdminMode,
  BOGO_PRO_CODE,
  MASTER_ADMIN_KEY,
} from "@/features/export/infrastructure/planTier";
import { CloseIcon, CheckIcon } from "@/shared/ui/Icons";

interface AdminControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminControlModal({
  isOpen,
  onClose,
}: AdminControlModalProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAdmin(isAdminUser());
      setCopiedLink(false);
      setCopiedCode(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleAdmin = (enabled: boolean) => {
    setAdminMode(enabled);
    setIsAdmin(enabled);
  };

  const copyAdminLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://maparte.vercel.app";
    const link = `${origin}?admin=boss`;
    void navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyBogoCode = () => {
    void navigator.clipboard.writeText(BOGO_PRO_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div
      className="export-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="export-modal admin-control-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "620px" }}
      >
        <div className="export-modal-header">
          <div>
            <h3 id="admin-modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>👑 Maparte Admin Control Center</span>
            </h3>
            <p className="download-modal-subtitle">
              Store Owner Dashboard • Bypass & Customer Tracking
            </p>
          </div>
          <button
            type="button"
            className="export-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="admin-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
          {/* Status Box */}
          <div
            style={{
              padding: "14px 16px",
              background: isAdmin ? "rgba(223, 186, 115, 0.12)" : "rgba(239, 83, 80, 0.12)",
              border: `1px solid ${isAdmin ? "#dfba73" : "#ef5350"}`,
              borderRadius: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.92rem", color: isAdmin ? "#dfba73" : "#ff8a80" }}>
                {isAdmin ? "👑 Super Admin Mode: ACTIVE" : "👤 Customer Mode: ACTIVE"}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "rgba(205, 225, 240, 0.8)" }}>
                {isAdmin
                  ? "Unlimited Ultra-HD downloads are free for you on this device."
                  : "Paywall and credit limits are currently active for testing."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleAdmin(!isAdmin)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "none",
                background: isAdmin ? "rgba(255,255,255,0.1)" : "#dfba73",
                color: isAdmin ? "#fff" : "#0b1722",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              {isAdmin ? "Switch to Customer Mode" : "Activate Admin Mode"}
            </button>
          </div>

          {/* Quick Access Credentials */}
          <div
            style={{
              background: "rgba(18, 32, 45, 0.8)",
              border: "1px solid rgba(140, 175, 200, 0.2)",
              borderRadius: "10px",
              padding: "14px",
            }}
          >
            <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#e5f1fa" }}>
              🔑 Your Admin & Customer Secret Keys
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(9, 18, 27, 0.7)", padding: "8px 12px", borderRadius: "6px" }}>
                <div>
                  <span style={{ color: "rgba(160, 185, 205, 0.7)", fontSize: "0.72rem", display: "block" }}>1-Click Admin Link (Bookmark this on your phone/PC):</span>
                  <code style={{ color: "#dfba73", fontWeight: 600 }}>?admin=boss</code>
                </div>
                <button
                  type="button"
                  onClick={copyAdminLink}
                  style={{
                    padding: "4px 10px",
                    background: "rgba(223, 186, 115, 0.2)",
                    border: "1px solid #dfba73",
                    borderRadius: "5px",
                    color: "#dfba73",
                    fontSize: "0.72rem",
                    cursor: "pointer",
                  }}
                >
                  {copiedLink ? "✓ Copied Link" : "Copy Link"}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(9, 18, 27, 0.7)", padding: "8px 12px", borderRadius: "6px" }}>
                <div>
                  <span style={{ color: "rgba(160, 185, 205, 0.7)", fontSize: "0.72rem", display: "block" }}>Master Admin Passcode (Enter in download modal):</span>
                  <code style={{ color: "#dfba73", fontWeight: 600 }}>{MASTER_ADMIN_KEY}</code>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(9, 18, 27, 0.7)", padding: "8px 12px", borderRadius: "6px" }}>
                <div>
                  <span style={{ color: "rgba(160, 185, 205, 0.7)", fontSize: "0.72rem", display: "block" }}>Customer BOGO 2nd Poster Code (Auto-shown after payment):</span>
                  <code style={{ color: "#81c784", fontWeight: 600 }}>{BOGO_PRO_CODE}</code>
                </div>
                <button
                  type="button"
                  onClick={copyBogoCode}
                  style={{
                    padding: "4px 10px",
                    background: "rgba(129, 199, 132, 0.2)",
                    border: "1px solid #81c784",
                    borderRadius: "5px",
                    color: "#81c784",
                    fontSize: "0.72rem",
                    cursor: "pointer",
                  }}
                >
                  {copiedCode ? "✓ Copied" : "Copy Code"}
                </button>
              </div>
            </div>
          </div>

          {/* Customer & Orders Tracking Guide */}
          <div
            style={{
              background: "rgba(18, 32, 45, 0.8)",
              border: "1px solid rgba(140, 175, 200, 0.2)",
              borderRadius: "10px",
              padding: "14px",
            }}
          >
            <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#e5f1fa" }}>
              📊 How to Track Customers & Sales (Orders & Revenue)
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.78rem", color: "rgba(205, 225, 240, 0.85)", lineHeight: 1.5 }}>
              <div>
                <strong style={{ color: "#dfba73" }}>1. Stripe / Payment Gateway Dashboard:</strong>
                <p style={{ margin: "2px 0 6px" }}>
                  When customers pay $4.99, their <strong>Name, Email, Country, Card Type, and Transaction Status</strong> instantly appear inside your Stripe Dashboard.
                </p>
                <a
                  href="https://dashboard.stripe.com/payments"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#dfba73", textDecoration: "underline", fontSize: "0.76rem" }}
                >
                  Open Stripe Dashboard ↗
                </a>
              </div>
              <div style={{ marginTop: "4px" }}>
                <strong style={{ color: "#dfba73" }}>2. Vercel Web Traffic & Analytics:</strong>
                <p style={{ margin: "2px 0 6px" }}>
                  See how many visitors arrive, which countries they come from, and which cities they design posters for.
                </p>
                <a
                  href="https://vercel.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#dfba73", textDecoration: "underline", fontSize: "0.76rem" }}
                >
                  Open Vercel Dashboard ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="download-modal-footer" style={{ marginTop: "16px" }}>
          <button
            type="button"
            className="tier-btn tier-btn--free"
            onClick={onClose}
            style={{ maxWidth: "200px", margin: "0 auto" }}
          >
            <CheckIcon />
            <span>Close Admin Panel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
