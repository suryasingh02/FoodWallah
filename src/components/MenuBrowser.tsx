"use client";

import { MapPin, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MenuItem } from "@/lib/db";
import { useCart } from "@/components/CartContext";
import { MenuItemCard } from "@/components/MenuItemCard";

export function MenuBrowser({ isRestaurantOpen, menuItems, vendorName }: { isRestaurantOpen: boolean; menuItems: MenuItem[]; vendorName?: string }) {
  const { itemCount } = useCart();
  const [isOpen, setIsOpen] = useState(isRestaurantOpen);
  const [liveMenuItems, setLiveMenuItems] = useState(menuItems);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = ["All", ...new Set(liveMenuItems.map((item) => item.category))];
  const visibleItems = [...(selectedCategory === "All"
    ? liveMenuItems
    : liveMenuItems.filter((item) => item.category === selectedCategory))].sort((firstItem, secondItem) => {
    if (firstItem.is_available !== secondItem.is_available) return secondItem.is_available - firstItem.is_available;
    return firstItem.name.localeCompare(secondItem.name);
  });

  useEffect(() => {
    const events = new EventSource("/api/restaurant/stream");
    const updateRestaurant = (event: MessageEvent<string>) => {
      const update = JSON.parse(event.data) as { vendorId: string; isOpen: boolean };
      const selectedVendorId = menuItems.find((item) => item.vendor_id)?.vendor_id;
      if (!selectedVendorId || update.vendorId === selectedVendorId) setIsOpen(update.isOpen);
    };

    events.addEventListener("restaurant-updated", updateRestaurant);
    return () => { events.removeEventListener("restaurant-updated", updateRestaurant); events.close(); };
  }, [isRestaurantOpen, menuItems]);

  useEffect(() => {
    const events = new EventSource("/api/restaurant/stream");
    const updateAvailability = (event: MessageEvent<string>) => {
      const update = JSON.parse(event.data) as { id: number; isAvailable: boolean; vendorId: string | null };
      const selectedVendorId = menuItems.find((item) => item.vendor_id)?.vendor_id;
      if (update.vendorId && selectedVendorId && update.vendorId !== selectedVendorId) return;
      setLiveMenuItems((currentItems) => currentItems.map((item) => item.id === update.id ? { ...item, is_available: update.isAvailable ? 1 : 0 } : item));
    };

    events.addEventListener("menu-availability-updated", updateAvailability);
    return () => { events.removeEventListener("menu-availability-updated", updateAvailability); events.close(); };
  }, [menuItems]);

  return (
    <div className="menu-page">
      <header className="menu-header">
        <div>
          <p className="eyebrow">{vendorName || "Bharat Burger"} · Noida</p>
          <h1>Made for<br />your table.</h1>
        </div>
        <div className="menu-actions">
          <Link className="icon-button icon-button-secondary" href="/auth" aria-label="Open account">
            <UserRound aria-hidden="true" size={20} />
          </Link>
          <Link className="icon-button" href="/cart" aria-label="Open cart">
            <ShoppingBag aria-hidden="true" size={21} />
            {itemCount > 0 ? <span className="cart-count">{itemCount}</span> : null}
          </Link>
        </div>
      </header>

      <div className="location-bar">
        <MapPin aria-hidden="true" size={16} />
        <span>Pickup in Sector 18, Noida</span>
      </div>
      <div className={`restaurant-status ${isOpen ? "is-open" : "is-closed"}`}>
        <span className="status-dot" aria-hidden="true" />
        {isOpen ? "Open for orders" : "Currently closed"}
      </div>

      <section className="menu-section" aria-labelledby="categories-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">From our kitchen</p>
            <h2 id="categories-title">What are you craving?</h2>
          </div>
        </div>
        <nav className="category-scroll" aria-label="Menu categories">
          {categories.map((category) => (
            <button
              className={`category-pill${selectedCategory === category ? " is-active" : ""}`}
              key={category}
              onClick={() => setSelectedCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </nav>
        <div className="menu-items" id="menu-items">
          {visibleItems.length > 0 ? visibleItems.map((item) => (
            <MenuItemCard
              category={item.category}
              description={item.description}
              imageUrl={item.image_url}
              imageLabel={`${item.name} image`}
              initials={item.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}
              isRestaurantOpen={isOpen}
              isAvailable={item.is_available === 1}
              key={item.id}
              maxPerCustomer={item.max_per_customer}
              maxPerDay={item.max_per_day}
              orderedToday={item.ordered_today ?? 0}
              vendorId={item.vendor_id ?? undefined}
              name={item.name}
              price={item.price}
            />
          )) : (
            <p className="empty-menu-message">No dishes are available in this category right now.</p>
          )}
        </div>
      </section>
    </div>
  );
}