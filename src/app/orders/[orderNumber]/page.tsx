"use client";

import { ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type OrderItem = { name: string; price: number; quantity: number };
type Order = {
  createdAt?: string;
  fulfillmentStatus?: string;
  grandTotal: number;
  items: OrderItem[];
  orderNumber: string;
  paymentStatus?: string;
};

const formatPrice = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 0,
  style: "currency",
});

const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "Date unavailable";
const statusLabel = (status?: string) => status === "pending" || status === "received" ? "Received" : status ? `${status[0].toUpperCase()}${status.slice(1)}` : "Received";

export default function OrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requestedOrder = decodeURIComponent(params.orderNumber);
      const savedOrders = window.localStorage.getItem("juniper-stone-orders");
      const savedOrder = window.localStorage.getItem("juniper-stone-order");

      try {
        const orders = savedOrders ? JSON.parse(savedOrders) as Order[] : savedOrder ? [JSON.parse(savedOrder) as Order] : [];
        const localOrder = orders.find((item) => item.orderNumber === requestedOrder) ?? null;
        setOrder(localOrder);

        if (localOrder) {
          fetch(`/api/orders?id=${encodeURIComponent(requestedOrder)}`, { cache: "no-store" })
            .then(async (response) => response.ok ? response.json() as Promise<{ order: { status: string; payment_status: string } }> : null)
            .then((result) => {
              if (result) setOrder({ ...localOrder, fulfillmentStatus: statusLabel(result.order.status), paymentStatus: result.order.payment_status === "confirmed" ? "Payment confirmed" : "Payment confirmation pending" });
            });
        }
      } catch {
        setOrder(null);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [params.orderNumber]);

  useEffect(() => {
    const requestedOrder = decodeURIComponent(params.orderNumber);
    const events = new EventSource(`/api/orders/stream?id=${encodeURIComponent(requestedOrder)}`);
    const updateOrder = () => {
      fetch(`/api/orders?id=${encodeURIComponent(requestedOrder)}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() as Promise<{ order: { status: string; payment_status: string } }> : null)
        .then((result) => result && setOrder((currentOrder) => currentOrder ? { ...currentOrder, fulfillmentStatus: statusLabel(result.order.status), paymentStatus: result.order.payment_status === "confirmed" ? "Payment confirmed" : "Payment confirmation pending" } : currentOrder));
    };
    events.addEventListener("order-updated", updateOrder);
    return () => { events.removeEventListener("order-updated", updateOrder); events.close(); };
  }, [params.orderNumber]);

  return (
    <main className="orders-page">
      <Link className="back-link" href="/orders">
        <ArrowLeft aria-hidden="true" size={17} />
        All orders
      </Link>
      {order ? (
        <>
          <header className="orders-header">
            <p className="eyebrow">Order details · {formatDate(order.createdAt)}</p>
            <h1>{order.orderNumber}</h1>
            <p>Your order status and item summary.</p>
          </header>
          <section className="tracking-panel" aria-labelledby="tracking-title">
            <div className="tracking-order-heading">
              <div>
                <p className="item-category">Order total</p>
                <h2 id="tracking-title">{formatPrice.format(order.grandTotal)}</h2>
              </div>
            </div>
            <div className={`tracking-status ${order.paymentStatus === "Payment confirmed" ? "is-payment-confirmed" : ""}`}>
              <CheckCircle2 aria-hidden="true" size={20} />
              <span><strong>{order.paymentStatus ?? "Payment confirmation received"}</strong><small>Thank you for confirming your payment.</small></span>
            </div>
            <div className={`tracking-status ${order.fulfillmentStatus?.toLowerCase() === "fulfilled" ? "is-fulfilled" : ""}`}>
              <Clock3 aria-hidden="true" size={20} />
              <span><strong>{order.fulfillmentStatus ?? "Order received"}</strong><small>Our kitchen team will start preparing it shortly.</small></span>
            </div>
            <div className="order-detail-items">
              <h3>Items</h3>
              {order.items.map((item) => (
                <div className="order-detail-item" key={item.name}>
                  <span>{item.quantity} × {item.name}</span>
                  <strong>{formatPrice.format(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="no-orders">
          <h2>Order not found</h2>
          <p>This order is no longer available on this device.</p>
          <Link className="primary-button" href="/orders">View all orders</Link>
        </div>
      )}
    </main>
  );
}
