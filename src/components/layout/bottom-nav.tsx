import { ClipboardList, House, UserRound } from "lucide-react";
import Link from "next/link";

const navigation = [
  { href: "/", label: "Menu", icon: House },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/account", label: "Account", icon: UserRound },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {navigation.map(({ href, label, icon: Icon }) => (
        <Link className="bottom-nav-link" href={href} key={href}>
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}