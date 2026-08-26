"use client";

import { ArrowLeft, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type Vendor = { name: string; email: string | null; phone: string | null; shop_name: string | null; restaurantOpen: boolean; role: "vendor" };

export function VendorProfile() {
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", shopName: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const response = await fetch("/api/auth/session");
      const result = await response.json() as { user?: Vendor | null };
      if (result.user?.role === "vendor") {
        setVendor(result.user);
        setForm({ email: result.user.email ?? "", name: result.user.name, phone: result.user.phone ?? "", shopName: result.user.shop_name ?? "" });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/auth/profile", { body: JSON.stringify(form), headers: { "Content-Type": "application/json" }, method: "PATCH" });
    const result = await response.json() as { error?: string; user?: Vendor };
    if (!response.ok) { setMessage(result.error ?? "Could not save profile."); return; }
    setVendor(result.user ?? null);
    setIsEditing(false);
    setMessage("Vendor details saved.");
  };

  const toggleRestaurant = async () => {
    if (!vendor) return;
    const response = await fetch("/api/vendor/orders", { body: JSON.stringify({ isOpen: !vendor.restaurantOpen }), headers: { "Content-Type": "application/json" }, method: "PATCH" });
    if (response.ok) setVendor({ ...vendor, restaurantOpen: !vendor.restaurantOpen });
  };

  const logout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  };

  if (!vendor) return <main className="vendor-profile-page"><p>Loading vendor profile...</p></main>;

  return (
    <main className="vendor-profile-page">
      <Link className="back-link" href="/"><ArrowLeft aria-hidden="true" size={17} /> Order desk</Link>
      <header className="vendor-profile-header"><p className="eyebrow">Vendor account</p><h1>Your details</h1><p>Manage your contact information and restaurant availability.</p></header>
      {isEditing ? (
        <form className="vendor-profile-form" onSubmit={save}>
          <label htmlFor="vendor-name">Your name</label><input id="vendor-name" onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} />
          <label htmlFor="vendor-shop">Restaurant name</label><input id="vendor-shop" onChange={(event) => setForm({ ...form, shopName: event.target.value })} required value={form.shopName} />
          <label htmlFor="vendor-email">Email</label><input id="vendor-email" onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" value={form.email} />
          <label htmlFor="vendor-phone">Mobile</label><input id="vendor-phone" onChange={(event) => setForm({ ...form, phone: event.target.value })} type="tel" value={form.phone} />
          <button className="vendor-confirm-button" type="submit"><Store aria-hidden="true" size={15} /> Save details</button>
        </form>
      ) : (
        <section className="vendor-profile-card"><div className="vendor-profile-icon"><UserRound aria-hidden="true" size={24} /></div><dl className="profile-details"><div><dt>Name</dt><dd>{vendor.name}</dd></div><div><dt>Restaurant</dt><dd>{vendor.shop_name || "Not added"}</dd></div><div><dt>Email</dt><dd>{vendor.email || "Not added"}</dd></div><div><dt>Mobile</dt><dd>{vendor.phone || "Not added"}</dd></div><div><dt>Account</dt><dd>Food vendor</dd></div></dl><button className="signout-button" onClick={() => setIsEditing(true)} type="button">Edit vendor details</button></section>
      )}
      <section className="vendor-profile-status"><div><span className={`status-dot ${vendor.restaurantOpen ? "is-open" : "is-closed"}`} aria-hidden="true" /><strong>Restaurant is {vendor.restaurantOpen ? "open" : "closed"}</strong></div><button className="signout-button" onClick={toggleRestaurant} type="button">{vendor.restaurantOpen ? "Close restaurant" : "Open restaurant"}</button></section>
      {message ? <p className="vendor-message" role="status">{message}</p> : null}
      <button className="delete-account-button vendor-logout-button" onClick={logout} type="button">Log out</button>
    </main>
  );
}