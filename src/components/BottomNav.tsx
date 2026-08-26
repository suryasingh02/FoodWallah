"use client";

import { ClipboardList, Menu, ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/CartContext";

const navigation = [
  { href: "/", label: "Menu", icon: Menu },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: ClipboardList },
];

export function BottomNav({ isVendor = false }: { isVendor?: boolean }) {
  const { itemCount } = useCart();

  const visibleNavigation = isVendor
    ? [navigation[0], navigation[2], { href: "/vendor-profile", label: "Account", icon: UserRound }]
    : navigation;

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {visibleNavigation.map(({ href, label, icon: Icon }) => (
        <Link className="bottom-nav-link" href={href} key={href}>
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
          {label === "Cart" && itemCount > 0 ? <span className="cart-badge">{itemCount}</span> : null}
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}