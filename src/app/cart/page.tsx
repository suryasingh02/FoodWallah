"use client";

import { ArrowLeft, Minus, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartContext";

const formatPrice = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  maximumFractionDigits: 0,
  style: "currency",
});

const ORDER_STORAGE_KEY = "juniper-stone-order";
const ORDERS_STORAGE_KEY = "juniper-stone-orders";
const ORDER_NUMBER_KEY = "juniper-stone-order-number";

export default function CartPage() {
  const { addItem, clearCart, decreaseItem, items } = useCart();
  const router = useRouter();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [isPickupSelected, setIsPickupSelected] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [orderError, setOrderError] = useState("");
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const gst = Math.round(subtotal * 0.05);
  const deliveryFee = 0;
  const grandTotal = subtotal + gst + deliveryFee;
  const paymentUrl = `upi://pay?${new URLSearchParams({
    am: grandTotal.toFixed(2),
    cu: "INR",
    pa: "surya.amu@okicici",
    pn: "Bharat Burger",
    tn: orderNumber ? `Order ${orderNumber}` : "Restaurant order",
  }).toString()}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedOrderNumber = window.localStorage.getItem(ORDER_NUMBER_KEY);

      if (savedOrderNumber) {
        setOrderNumber(savedOrderNumber);
        return;
      }

      const newOrderNumber = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      window.localStorage.setItem(ORDER_NUMBER_KEY, newOrderNumber);
      setOrderNumber(newOrderNumber);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const response = await fetch("/api/auth/session");
      const session = await response.json() as { user?: { address: string | null; pickupSelected: boolean } | null };
      setDeliveryAddress(session.user?.address ?? "");
      setIsPickupSelected(session.user?.pickupSelected ?? false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handlePayment = async () => {
    const sessionResponse = await fetch("/api/auth/session");
    const session = await sessionResponse.json() as { user?: { address: string | null; pickupSelected: boolean } | null };

    if (!session.user) {
      router.push("/auth?next=/cart");
      return;
    }

    if (!session.user.address && !session.user.pickupSelected) {
      router.push("/auth?next=/cart&addressRequired=1");
      return;
    }

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = paymentUrl;
      return;
    }

    setIsPaymentOpen(true);
  };

  const copyOrderNumber = async () => {
    await navigator.clipboard.writeText(orderNumber);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1800);
  };

  const confirmPayment = async () => {
    const sessionResponse = await fetch("/api/auth/session");
    const session = await sessionResponse.json() as { user?: { address: string | null; pickupSelected: boolean } | null };

    if (!session.user) {
      setIsPaymentOpen(false);
      router.push("/auth?next=/cart");
      return;
    }

    const fulfillmentType = session.user.pickupSelected ? "pickup" : "delivery";
    const vendorId = items.find((item) => item.vendorId)?.vendorId;
    const orderResponse = await fetch("/api/orders", {
      body: JSON.stringify({ fulfillmentType, items, orderNumber, totalAmount: grandTotal, vendorId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!orderResponse.ok) {
      const result = await orderResponse.json() as { error?: string };
      setOrderError(result.error ?? "This item has reached its maximum limit.");
      return;
    }

    const completedOrder = {
      createdAt: new Date().toISOString(),
      grandTotal,
      items,
      orderNumber,
      paymentStatus: "Payment pending vendor confirmation",
      fulfillmentStatus: "Order received",
    };
    const savedOrders = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    let orders = [];

    if (savedOrders) {
      try {
        orders = JSON.parse(savedOrders);
      } catch {
        orders = [];
      }
    }

    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([completedOrder, ...orders]));
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(completedOrder));
    window.localStorage.removeItem(ORDER_NUMBER_KEY);
    clearCart();
    setIsPaymentOpen(false);
    router.push("/orders");
  };

  if (items.length === 0) {
    return (
      <main className="cart-page empty-cart">
        <Link className="back-link" href="/">
          <ArrowLeft aria-hidden="true" size={17} />
          Menu
        </Link>
        <div className="empty-cart-content">
          <span className="empty-cart-mark" aria-hidden="true">+</span>
          <p className="eyebrow">Bharat Burger · Noida</p>
          <h1>Your cart is empty!</h1>
          <p>Start with something delicious from our kitchen.</p>
          <Link className="primary-button" href="/">Browse the menu</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <header className="cart-header">
        <Link className="back-link" href="/" aria-label="Back to menu">
          <ArrowLeft aria-hidden="true" size={18} />
        </Link>
        <div>
          <p className="eyebrow">Ready when you are</p>
          <h1>Your Cart</h1>
        </div>
        <span className="cart-item-count">{items.length} {items.length === 1 ? "item" : "items"}</span>
      </header>

      <section className="cart-items" aria-labelledby="cart-items-title">
        {deliveryAddress || isPickupSelected ? (
          <div className="delivery-address-banner">
            <span>{isPickupSelected ? "You will pick up this order from" : "Delivering your order here"}</span>
            <strong>{isPickupSelected ? "Bharat Burger, Sector 18, Noida" : deliveryAddress}</strong>
            <Link className="change-cart-address" href="/auth?next=/cart">
              Change address
            </Link>
          </div>
        ) : null}
        <h2 id="cart-items-title">Your selection</h2>
        {items.map((item) => (
          <article className="cart-line-item" key={item.name}>
            <div className="cart-line-copy">
              <h3>{item.name}</h3>
              <p>{formatPrice.format(item.price)} each</p>
            </div>
            <div className="cart-line-actions">
              <strong>{formatPrice.format(item.price * item.quantity)}</strong>
              <div className="quantity-control" aria-label={`Quantity of ${item.name}`}>
                <button aria-label={`Remove one ${item.name}`} onClick={() => decreaseItem(item.name)} type="button">
                  {item.quantity === 1 ? <Trash2 aria-hidden="true" size={14} /> : <Minus aria-hidden="true" size={14} />}
                </button>
                <span aria-live="polite">{item.quantity}</span>
                <button aria-label={`Add one ${item.name}`} onClick={() => addItem({ name: item.name, price: item.price })} type="button">
                  <Plus aria-hidden="true" size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="billing-panel" aria-labelledby="billing-title">
        <h2 id="billing-title">Bill details</h2>
        <div className="bill-row"><span>Subtotal</span><strong>{formatPrice.format(subtotal)}</strong></div>
        <div className="bill-row"><span>Restaurant Charges &amp; Taxes <small>5% GST</small></span><strong>{formatPrice.format(gst)}</strong></div>
        <div className="bill-row"><span>Pickup in Sector 18</span><strong>{formatPrice.format(deliveryFee)}</strong></div>
        <div className="bill-total"><span>Grand Total</span><strong>{formatPrice.format(grandTotal)}</strong></div>
      </section>

      <button className="checkout-button" onClick={handlePayment} type="button">
        Proceed to Pay via UPI / Cards
      </button>
      {orderError ? <p className="auth-message" role="alert">{orderError}</p> : null}

      {isPaymentOpen ? (
        <div className="payment-modal-backdrop" role="presentation" onClick={() => setIsPaymentOpen(false)}>
          <section
            aria-labelledby="payment-modal-title"
            aria-modal="true"
            className="payment-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button className="modal-close" aria-label="Close payment dialog" onClick={() => setIsPaymentOpen(false)} type="button">
              <X aria-hidden="true" size={18} />
            </button>
            <p className="eyebrow">Secure UPI payment</p>
            <h2 id="payment-modal-title">Scan to pay</h2>
            <div className="payment-amount">{formatPrice.format(grandTotal)}</div>
            <div className="payment-qr">
              <QRCodeSVG value={paymentUrl} size={196} bgColor="#fffdf7" fgColor="#19352d" level="M" />
            </div>
            <div className="order-number-row">
              <span>Order Number <strong>{orderNumber || "Preparing..."}</strong></span>
              <button className="copy-button" onClick={copyOrderNumber} type="button">
                {isCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="payment-note">
              <strong>⚠️ IMPORTANT:</strong> Please write your Order Number {orderNumber || "above"} in the &quot;Add a Note / Remarks&quot; field inside your UPI app (GPay/PhonePe/Paytm) before confirming the payment.
            </p>
            <p className="payment-upi">{"surya.amu@okicici"}</p>
            <button className="confirm-payment-button" onClick={confirmPayment} type="button">
              I Have Paid / Confirm Payment
            </button>
            <p className="payment-help">Open any UPI app on your phone and scan this code to complete your order.</p>
          </section>
        </div>
      ) : null}
    </main>
  );
}