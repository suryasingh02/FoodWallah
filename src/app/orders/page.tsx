"use client";

import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { VendorOrders } from "@/components/VendorOrders";

type OrderItem = { name: string; price: number; quantity: number };
type Order = {
  createdAt?: string;
  fulfillmentStatus?: string;
  grandTotal: number;
  items: OrderItem[];
  orderNumber: string;
};

const formatPrice = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 0,
  style: "currency",
});

const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value))
  : "Date unavailable";

const statusLabel = (status?: string) => status === "pending" || status === "received" || status === "order received" ? "Received" : status ? `${status[0].toUpperCase()}${status.slice(1)}` : "Received";

export default function OrdersPage() {
  const [isVendor, setIsVendor] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/auth/session")
        .then((response) => response.json())
        .then((result: { user?: { role?: string } | null }) => {
          setIsVendor(result.user?.role === "vendor");
          setSessionLoaded(true);
        });
      const savedOrders = window.localStorage.getItem("juniper-stone-orders");
      const savedOrder = window.localStorage.getItem("juniper-stone-order");

      try {
        if (savedOrders) {
          setOrders(JSON.parse(savedOrders) as Order[]);
        } else if (savedOrder) {
          setOrders([JSON.parse(savedOrder) as Order]);
        }
      } catch {
        setOrders([]);
      }

      fetch("/api/orders")
        .then((response) => response.ok ? response.json() as Promise<{ orders: { id: string; items_json: string; total_amount: number; status: string; payment_status: string; created_at: string }[] }> : null)
        .then((result) => {
          if (!result) return;
          setOrders(result.orders.map((databaseOrder) => {
            let items: OrderItem[] = [];
            try { items = JSON.parse(databaseOrder.items_json) as OrderItem[]; } catch { items = []; }
            return {
              createdAt: databaseOrder.created_at,
              fulfillmentStatus: databaseOrder.status,
              grandTotal: databaseOrder.total_amount,
              items,
              orderNumber: `#${databaseOrder.id}`,
            };
          }));
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!sessionLoaded || isVendor) return;

    const events = new EventSource("/api/orders/stream");
    const refreshOrders = () => {
      fetch("/api/orders", { cache: "no-store" })
        .then((response) => response.ok ? response.json() as Promise<{ orders: { id: string; items_json: string; total_amount: number; status: string; created_at: string }[] }> : null)
        .then((result) => {
          if (!result) return;
          setOrders(result.orders.map((databaseOrder) => {
            let items: OrderItem[] = [];
            try { items = JSON.parse(databaseOrder.items_json) as OrderItem[]; } catch { items = []; }
            return { createdAt: databaseOrder.created_at, fulfillmentStatus: databaseOrder.status, grandTotal: databaseOrder.total_amount, items, orderNumber: `#${databaseOrder.id}` };
          }));
        });
    };

    events.addEventListener("order-updated", refreshOrders);
    return () => { events.removeEventListener("order-updated", refreshOrders); events.close(); };
  }, [isVendor, sessionLoaded]);

  if (!sessionLoaded) return <main className="orders-page"><p className="vendor-empty">Loading orders...</p></main>;
  if (isVendor) return <VendorOrders />;

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return order.orderNumber.toLowerCase().includes(query)
      || order.items.some((item) => item.name.toLowerCase().includes(query));
  });

  return (
    <main className="orders-page">
      <Link className="back-link" href="/">
        <ArrowLeft aria-hidden="true" size={17} />
        Menu
      </Link>
      <header className="orders-header">
        <p className="eyebrow">Bharat Burger · Noida</p>
        <h1>Your Orders</h1>
        <p>Review your past orders and open any one for its full details.</p>
      </header>

      {orders.length > 0 ? (
        <>
          <div className="order-search">
            <Search aria-hidden="true" size={17} />
            <input
              aria-label="Search orders"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search order number or item"
              type="search"
              value={searchQuery}
            />
          </div>
          <section className="order-history order-history-full" aria-labelledby="order-history-title">
            <div className="order-history-heading">
              <h2 id="order-history-title">Order history</h2>
              <span>{filteredOrders.length} found</span>
            </div>
            {filteredOrders.length > 0 ? filteredOrders.map((order) => (
              <Link className="order-history-row" href={`/orders/${encodeURIComponent(order.orderNumber)}`} key={order.orderNumber}>
                <span>
                  <strong>{order.orderNumber}</strong>
                  <small>{formatDate(order.createdAt)} · {order.items.reduce((total, item) => total + item.quantity, 0)} items</small>
                </span>
                <span className="order-history-summary">
                  <strong>{formatPrice.format(order.grandTotal)}</strong>
                  <small className={`order-status-badge order-status-${(order.fulfillmentStatus ?? "received").toLowerCase()}`}>{statusLabel(order.fulfillmentStatus)}</small>
                </span>
              </Link>
            )) : <p className="empty-search">No matching orders found.</p>}
          </section>
        </>
      ) : (
        <div className="no-orders">
          <h2>No past orders yet</h2>
          <p>Once you complete an order, it will appear here with its date and order number.</p>
          <Link className="primary-button" href="/">Browse the menu</Link>
        </div>
      )}
    </main>
  );
}
