"use client";

import { Minus, Plus } from "lucide-react";
import { useCart } from "@/components/CartContext";

type MenuItemCardProps = {
  category: string;
  description: string;
  imageUrl: string;
  imageLabel: string;
  isAvailable: boolean;
  isRestaurantOpen: boolean;
  maxPerCustomer: number;
  maxPerDay: number;
  orderedToday: number;
  initials: string;
  name: string;
  price: number;
  vendorId?: string;
};

const formatPrice = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 0,
  style: "currency",
});

export function MenuItemCard({ category, description, imageUrl, imageLabel, initials, isAvailable, isRestaurantOpen, maxPerCustomer, maxPerDay, name, orderedToday, price, vendorId }: MenuItemCardProps) {
  const { addItem, decreaseItem, getQuantity } = useCart();
  const quantity = getQuantity(name);
  const reachedLimit = quantity >= maxPerCustomer || orderedToday + quantity >= maxPerDay;

  return (
    <article className="menu-item">
      <div
        className={`item-image item-image-${initials.toLowerCase()}`}
        aria-label={imageLabel}
        role="img"
        style={{ backgroundImage: `url(${imageUrl})` }}
      >
        <span>{initials}</span>
      </div>
      <div className="item-details">
        <div className="item-heading">
          <div>
            <p className="item-category">{category}</p>
            <h3>{name}</h3>
          </div>
          <strong>{formatPrice.format(price)}</strong>
        </div>
        <p className="item-description">{description}</p>
        {quantity === 0 ? (
          <button className="add-button" disabled={!isRestaurantOpen || !isAvailable || reachedLimit} onClick={() => addItem({ name, price, vendorId })} type="button">
            <Plus aria-hidden="true" size={16} strokeWidth={2.5} />
            {!isRestaurantOpen ? "Closed" : !isAvailable ? "Out of stock" : reachedLimit ? "Item reached max limit" : "Add"}
          </button>
        ) : (
          <div className="quantity-control" aria-label={`Quantity of ${name}`}>
            <button aria-label={`Remove one ${name}`} onClick={() => decreaseItem(name)} type="button">
              <Minus aria-hidden="true" size={15} strokeWidth={2.5} />
            </button>
            <span aria-live="polite">{quantity}</span>
            <button aria-label={`Add one ${name}`} disabled={!isRestaurantOpen || !isAvailable || reachedLimit} onClick={() => addItem({ name, price, vendorId })} type="button">
              <Plus aria-hidden="true" size={15} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}