"use client";

import { ClipboardCheck, Clock3, MapPin, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type VendorOrder = {
  id: string;
  customer_name: string;
  items_json: string;
  total_amount: number;
  status: string;
  payment_status: string;
  fulfillment_type: string;
  created_at: string;
};

type MenuItem = { id: number; name: string; description: string; price: number; category: string; image_url: string; is_available: number; max_per_customer: number; max_per_day: number };

const formatPrice = new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 0, style: "currency" });
const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const statusSteps = ["received", "processing", "dispatched", "fulfilled"] as const;
const statusLabel = (status: string) => status === "pending" ? "Received" : `${status[0].toUpperCase()}${status.slice(1)}`;

export function VendorDashboard() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [restaurantOpen, setRestaurantOpen] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dish, setDish] = useState({ name: "", description: "", price: "", category: "", image_url: "", maxPerCustomer: "5", maxPerDay: "50" });
  const [message, setMessage] = useState("");
  const [restaurantName, setRestaurantName] = useState("Your restaurant");

  const loadOrders = async () => {
    const response = await fetch("/api/vendor/orders");
    if (response.ok) {
      const result = await response.json();
      setOrders(result.orders as VendorOrder[]);
      setRestaurantOpen(Boolean(result.restaurantOpen));
    }
    const menuResponse = await fetch("/api/vendor/menu");
    if (menuResponse.ok) setMenu((await menuResponse.json()).menu as MenuItem[]);
  };

  const toggleRestaurant = async () => {
    const response = await fetch("/api/vendor/orders", { body: JSON.stringify({ isOpen: !restaurantOpen }), headers: { "Content-Type": "application/json" }, method: "PATCH" });
    if (response.ok) setRestaurantOpen(!restaurantOpen);
  };

  const saveDish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { ...dish, id: editingId, maxPerCustomer: Number(dish.maxPerCustomer), maxPerDay: Number(dish.maxPerDay), price: Number(dish.price) };
    const response = await fetch("/api/vendor/menu", { body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }, method: editingId ? "PATCH" : "POST" });
    if (response.ok) {
      setEditingId(null);
      setDish({ name: "", description: "", price: "", category: "", image_url: "", maxPerCustomer: "5", maxPerDay: "50" });
      await loadOrders();
    }
  };

  const removeDish = async (id: number) => {
    if (!window.confirm("Delete this dish from the menu?")) return;
    await fetch("/api/vendor/menu", { body: JSON.stringify({ id }), headers: { "Content-Type": "application/json" }, method: "DELETE" });
    await loadOrders();
  };

  const toggleAvailability = async (item: MenuItem) => {
    await fetch("/api/vendor/menu", { body: JSON.stringify({ action: "availability", id: item.id, isAvailable: !item.is_available }), headers: { "Content-Type": "application/json" }, method: "PATCH" });
    await loadOrders();
  };

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const sessionResponse = await fetch("/api/auth/session");
      if (sessionResponse.ok) {
        const session = await sessionResponse.json() as { user?: { shop_name?: string | null; name?: string } | null };
        setRestaurantName(session.user?.shop_name || session.user?.name || "Your restaurant");
      }
      await loadOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const confirmPayment = async (orderId: string) => {
    const response = await fetch("/api/vendor/orders", {
      body: JSON.stringify({ orderId }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    if (response.ok) {
      setMessage(`Payment confirmed for ${orderId}.`);
      await loadOrders();
    }
  };

  const advanceStatus = async (order: VendorOrder) => {
    const currentStatus = order.status === "pending" ? "received" : order.status;
    const nextStatus = statusSteps[statusSteps.indexOf(currentStatus as typeof statusSteps[number]) + 1];
    if (!nextStatus) return;
    const response = await fetch("/api/vendor/orders", { body: JSON.stringify({ nextStatus, orderId: order.id }), headers: { "Content-Type": "application/json" }, method: "PATCH" });
    const result = await response.json() as { error?: string };
    if (response.ok) await loadOrders();
    else setMessage(result.error ?? "Could not update order status.");
  };

  return (
    <main className="vendor-page">
      <header className="vendor-header">
        <div>
          <p className="eyebrow">{restaurantName} · Vendor console</p>
          <h1>Order desk</h1>
          <p>Review incoming orders and match each payment in your UPI app.</p>
        </div>
        <button className="vendor-refresh" aria-label="Refresh orders" onClick={loadOrders} type="button"><RefreshCw aria-hidden="true" size={18} /></button>
      </header>
      {message ? <p className="vendor-message" role="status">{message}</p> : null}
      <section className="vendor-restaurant-control">
        <div><span className={`status-dot ${restaurantOpen ? "is-open" : "is-closed"}`} aria-hidden="true" /><strong>Restaurant is {restaurantOpen ? "open" : "closed"}</strong><small>{restaurantOpen ? "Customers can place orders." : "Customers can see the menu but cannot order."}</small></div>
        <button onClick={toggleRestaurant} type="button">{restaurantOpen ? "Close restaurant" : "Open restaurant"}</button>
      </section>
      <section className="vendor-orders" aria-labelledby="vendor-orders-title">
        <div className="vendor-section-heading"><h2 id="vendor-orders-title">All orders</h2><span>{orders.length} total</span></div>
        {orders.length > 0 ? orders.map((order) => {
          let items: { name: string; quantity: number }[] = [];
          try { items = JSON.parse(order.items_json) as { name: string; quantity: number }[]; } catch { items = []; }
          return (
            <article className="vendor-order-card" key={order.id}>
              <div className="vendor-order-top"><div><p className="item-category">{formatDate(order.created_at)}</p><h3>#{order.id.replace(/^#/, "")}</h3></div><strong>{formatPrice.format(order.total_amount)}</strong></div>
              <div className="vendor-order-meta"><span>{order.customer_name || "Customer"}</span><span><MapPin aria-hidden="true" size={14} /> {order.fulfillment_type === "pickup" ? "Pickup" : "Delivery"}</span></div>
              <p className="vendor-order-items">{items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}</p>
              <div className="vendor-order-footer"><span className={`vendor-payment-status ${order.payment_status === "confirmed" ? "is-confirmed" : ""}`}><Clock3 aria-hidden="true" size={14} /> Payment {order.payment_status === "confirmed" ? "Confirmed" : "Pending"}</span>{order.payment_status !== "confirmed" ? <button className="vendor-confirm-button" onClick={() => confirmPayment(order.id)} type="button"><ClipboardCheck aria-hidden="true" size={15} /> Confirm payment</button> : null}</div>
              <div className={`vendor-status-row ${order.status === "fulfilled" ? "is-fulfilled" : ""}`}><span>Order status: <strong>{statusLabel(order.status)}</strong></span>{statusSteps.indexOf((order.status === "pending" ? "received" : order.status) as typeof statusSteps[number]) < statusSteps.length - 1 ? <button className="vendor-status-button" disabled={order.status === "pending" && order.payment_status !== "confirmed"} onClick={() => advanceStatus(order)} type="button">Move to {statusLabel(statusSteps[statusSteps.indexOf((order.status === "pending" ? "received" : order.status) as typeof statusSteps[number]) + 1])}</button> : null}</div>
            </article>
          );
        }) : <p className="vendor-empty">No customer orders yet.</p>}
      </section>
      <section className="vendor-menu-management" aria-labelledby="vendor-menu-title">
        <div className="vendor-section-heading"><h2 id="vendor-menu-title">Your menu</h2><span>{menu.length} dishes</span></div>
        <form className="vendor-dish-form" onSubmit={saveDish}>
          <h3>{editingId ? "Edit dish" : "Add a dish"}</h3>
          <input aria-label="Dish name" onChange={(event) => setDish({ ...dish, name: event.target.value })} placeholder="Dish name" required value={dish.name} />
          <input aria-label="Description" onChange={(event) => setDish({ ...dish, description: event.target.value })} placeholder="Description" value={dish.description} />
          <div className="vendor-dish-fields"><input aria-label="Price" min="0" onChange={(event) => setDish({ ...dish, price: event.target.value })} placeholder="Price in ₹" required type="number" value={dish.price} /><input aria-label="Category" onChange={(event) => setDish({ ...dish, category: event.target.value })} placeholder="Category" required value={dish.category} /></div>
          <div className="vendor-dish-fields"><input aria-label="Maximum per customer" min="1" onChange={(event) => setDish({ ...dish, maxPerCustomer: event.target.value })} placeholder="Max per customer" required type="number" value={dish.maxPerCustomer} /><input aria-label="Maximum per day" min="1" onChange={(event) => setDish({ ...dish, maxPerDay: event.target.value })} placeholder="Max per day" required type="number" value={dish.maxPerDay} /></div>
          <input aria-label="Image path" onChange={(event) => setDish({ ...dish, image_url: event.target.value })} placeholder="Image path e.g. /images/dish.jpg" value={dish.image_url} />
          <button className="vendor-confirm-button" type="submit"><Plus aria-hidden="true" size={15} /> {editingId ? "Save changes" : "Add dish"}</button>
        </form>
        {menu.map((item) => <div className="vendor-menu-row" key={item.id}><div><strong>{item.name}</strong><small>{item.category} · ₹{item.price} · {item.max_per_customer} per customer · {item.max_per_day} per day</small></div><div className="vendor-menu-actions"><button onClick={() => toggleAvailability(item)} type="button">{item.is_available ? "In stock" : "Out of stock"}</button><button aria-label={`Edit ${item.name}`} onClick={() => { setEditingId(item.id); setDish({ category: item.category, description: item.description, image_url: item.image_url, name: item.name, price: String(item.price), maxPerCustomer: String(item.max_per_customer), maxPerDay: String(item.max_per_day) }); }} type="button"><Pencil aria-hidden="true" size={14} /></button><button aria-label={`Delete ${item.name}`} onClick={() => removeDish(item.id)} type="button"><Trash2 aria-hidden="true" size={14} /></button></div></div>)}
      </section>
    </main>
  );
}