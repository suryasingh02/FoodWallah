"use client";

import { MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import type { Vendor } from "@/lib/db";

export function VendorChooser({ customerName, vendors }: { customerName?: string; vendors: Vendor[] }) {
  return (
    <main className="vendor-chooser">
      <header className="vendor-chooser-header">
        <div>
          <p className="eyebrow">Noida · Local kitchens</p>
          <h1>Hi {customerName || "there"},<br />choose your restaurant.</h1>
          <p>Pick an open kitchen below to browse its menu and place your order.</p>
        </div>
        <Link className="icon-button icon-button-secondary" href="/auth" aria-label="Open account"><UserRound aria-hidden="true" size={20} /></Link>
      </header>
      <section className="vendor-chooser-list" aria-labelledby="vendor-chooser-title">
        <div className="vendor-section-heading"><h2 id="vendor-chooser-title">Available vendors</h2><span>{vendors.length} nearby</span></div>
        {vendors.length > 0 ? vendors.map((vendor) => {
          const isOpen = Boolean(vendor.restaurant_open);
          return isOpen ? (
            <Link className="vendor-choice" href={`/menu/${encodeURIComponent(vendor.id)}`} key={vendor.id}>
              <span className="vendor-choice-icon"><MapPin aria-hidden="true" size={20} /></span>
              <span><strong>{vendor.shop_name || vendor.name}</strong><small><span className="status-dot is-open" /> Open for orders · Noida</small></span>
            </Link>
          ) : (
            <div className="vendor-choice is-disabled" key={vendor.id} aria-disabled="true">
              <span className="vendor-choice-icon"><MapPin aria-hidden="true" size={20} /></span>
              <span><strong>{vendor.shop_name || vendor.name}</strong><small><span className="status-dot" /> Currently closed</small></span>
            </div>
          );
        }) : <p className="vendor-empty">No vendors are available right now.</p>}
      </section>
    </main>
  );
}