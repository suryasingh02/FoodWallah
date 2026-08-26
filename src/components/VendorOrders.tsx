"use client";

import { CheckCircle2, ClipboardCheck, Clock3, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

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

const formatPrice = new Intl.NumberFormat("en-IN", { currency: "INR", maximumFractionDigits: 0, style: "currency" });
const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const statusSteps = ["received", "processing", "dispatched", "fulfilled"] as const;
const statusLabel = (status: string) => status === "pending" ? "Received" : `${status[0].toUpperCase()}${status.slice(1)}`;

export function VendorOrders() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    setIsLoading(true);
    const response = await fetch("/api/vendor/orders");
    if (response.ok) setOrders((await response.json()).orders as VendorOrder[]);
    setIsLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(loadOrders, 0);
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
    <main className="vendor-orders-page">
      <header className="vendor-orders-header">
        <div>
          <p className="eyebrow">Vendor console · Orders</p>
          <h1>All orders</h1>
          <p>Review incoming orders and confirm payments against your UPI app.</p>
        </div>
        <button className="vendor-refresh" aria-label="Refresh orders" onClick={loadOrders} type="button"><RefreshCw aria-hidden="true" size={18} /></button>
      </header>
      {message ? <p className="vendor-message" role="status">{message}</p> : null}
      {isLoading ? <p className="vendor-empty">Loading orders...</p> : orders.length > 0 ? (
        <section className="vendor-orders-list" aria-label="Vendor orders">
          {orders.map((order) => {
            let items: { name: string; quantity: number }[] = [];
            try { items = JSON.parse(order.items_json) as { name: string; quantity: number }[]; } catch { items = []; }
            const isConfirmed = order.payment_status === "confirmed";
            return (
              <article className="vendor-order-card" key={order.id}>
                <div className="vendor-order-top"><div><p className="item-category">{formatDate(order.created_at)}</p><h3>#{order.id.replace(/^#/, "")}</h3></div><strong>{formatPrice.format(order.total_amount)}</strong></div>
                <div className="vendor-order-meta"><span>{order.customer_name || "Customer"}</span><span><MapPin aria-hidden="true" size={14} /> {order.fulfillment_type === "pickup" ? "Pickup" : "Delivery"}</span></div>
                <p className="vendor-order-items">{items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}</p>
                <div className="vendor-order-footer">
                  <span className={`vendor-payment-status ${isConfirmed ? "is-confirmed" : ""}`}>{isConfirmed ? <CheckCircle2 aria-hidden="true" size={14} /> : <Clock3 aria-hidden="true" size={14} />} Payment {isConfirmed ? "Confirmed" : "Pending"}</span>
                  {!isConfirmed ? <button className="vendor-confirm-button" onClick={() => confirmPayment(order.id)} type="button"><ClipboardCheck aria-hidden="true" size={15} /> Confirm payment</button> : null}
                </div>
                <div className={`vendor-status-row ${order.status === "fulfilled" ? "is-fulfilled" : ""}`}>
                  <span>Order status: <strong>{statusLabel(order.status)}</strong></span>
                  {statusSteps.indexOf((order.status === "pending" ? "received" : order.status) as typeof statusSteps[number]) < statusSteps.length - 1 ? (
                    <button className="vendor-status-button" disabled={order.status === "pending" && !isConfirmed} onClick={() => advanceStatus(order)} type="button">
                      Move to {statusLabel(statusSteps[statusSteps.indexOf((order.status === "pending" ? "received" : order.status) as typeof statusSteps[number]) + 1])}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : <p className="vendor-empty">No customer orders yet.</p>}
    </main>
  );
}
