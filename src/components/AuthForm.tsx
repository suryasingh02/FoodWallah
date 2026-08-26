"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type AuthMode = "signin" | "signup";
type UserRole = "customer" | "vendor";

type SignedInUser = {
  addresses: string[];
  address: string | null;
  email: string | null;
  name: string;
  phone: string | null;
  pickupSelected: boolean;
  role: UserRole;
  shop_name: string | null;
};

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [role, setRole] = useState<UserRole>("customer");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isChangingAddress, setIsChangingAddress] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [user, setUser] = useState<SignedInUser | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const response = await fetch("/api/auth/session");
      const result = await response.json() as { user?: SignedInUser | null };
      setUser(result.user ?? null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const response = await fetch(`/api/auth/${mode}`, {
      body: JSON.stringify({ address, email, identifier: name, name, password, phone, role, shopName }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json() as { error?: string; user?: SignedInUser };

    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result.error ?? "Something went wrong. Please try again.");
      return;
    }

    setUser(result.user ?? null);
    const nextPath = new URLSearchParams(window.location.search).get("next") || "/";
    router.push(nextPath.startsWith("/") ? nextPath : "/");
    router.refresh();
  };

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    setMessage("");
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) return;

    const response = await fetch("/api/auth/delete", { method: "DELETE" });
    if (!response.ok) {
      setMessage("We could not delete your account. Please try again.");
      return;
    }

    setUser(null);
    setMode("signup");
    setMessage("Your account has been deleted.");
  };

  const saveAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingAddress(true);
    setMessage("");
    const response = await fetch("/api/auth/profile", {
      body: JSON.stringify({ address }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const result = await response.json() as { error?: string; user?: SignedInUser };
    setIsSavingAddress(false);

    if (!response.ok) {
      setMessage(result.error ?? "Please enter a valid delivery address.");
      return;
    }

    setUser(result.user ?? null);
    setIsAddingAddress(false);
    setMessage("Delivery address saved.");
  };

  const selectAddress = async (selectedAddress: string | null, pickup = false) => {
    setIsSavingAddress(true);
    setMessage("");
    const response = await fetch("/api/auth/profile", {
      body: JSON.stringify(pickup ? { pickup: true } : { address: selectedAddress }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const result = await response.json() as { error?: string; user?: SignedInUser };
    setIsSavingAddress(false);

    if (!response.ok) {
      setMessage(result.error ?? "We could not update your delivery preference.");
      return;
    }

    setUser(result.user ?? null);
    setAddress(selectedAddress ?? "");
    setIsChangingAddress(false);
    setIsAddingAddress(false);
    const nextPath = new URLSearchParams(window.location.search).get("next");
    if (nextPath?.startsWith("/")) router.push(nextPath);
  };

  if (user) {
    const savedAddresses = Array.isArray(user.addresses)
      ? user.addresses
      : user.address
        ? [user.address]
        : [];

    return (
      <section className="profile-panel" aria-labelledby="profile-title">
        <p className="eyebrow">{user.role === "vendor" ? "Food vendor account" : "Customer account"}</p>
        <h2 id="profile-title">Hi {user.name}</h2>
        <dl className="profile-details">
          <div><dt>Name</dt><dd>{user.name}</dd></div>
          <div><dt>Email</dt><dd>{user.email || "Not added yet"}</dd></div>
          <div><dt>Mobile</dt><dd>{user.phone || "Not added yet"}</dd></div>
          <div className="profile-address-row">
            <dt>Address</dt>
            <dd>
              <span>{user.pickupSelected ? "Pickup from store" : user.address || "Not added yet"}</span>
              <button className="change-address-button" onClick={() => setIsChangingAddress((current) => !current)} type="button">
                {isChangingAddress ? "Close options" : "Change address"}
              </button>
            </dd>
          </div>
          {user.shop_name ? <div><dt>Restaurant or stall</dt><dd>{user.shop_name}</dd></div> : null}
          <div><dt>Account type</dt><dd>{user.role === "vendor" ? "Food vendor" : "Customer"}</dd></div>
        </dl>
        {!user.address && !user.pickupSelected ? (
          <form className="profile-address-form" onSubmit={saveAddress}>
            <label htmlFor="profile-address">Add delivery address</label>
            <input id="profile-address" onChange={(event) => setAddress(event.target.value)} placeholder="House, street, area, Noida" required value={address} />
            <button className="signout-button" disabled={isSavingAddress} type="submit">
              {isSavingAddress ? "Saving..." : "Save address"}
            </button>
          </form>
        ) : null}
        {isChangingAddress ? (
          <div className="address-options">
            {savedAddresses.map((savedAddress) => (
              <button className={user.address === savedAddress && !user.pickupSelected ? "selected" : ""} disabled={isSavingAddress} key={savedAddress} onClick={() => selectAddress(savedAddress)} type="button">
                {savedAddress}
              </button>
            ))}
            <button className={user.pickupSelected ? "selected" : ""} disabled={isSavingAddress} onClick={() => selectAddress(null, true)} type="button">
              Pickup from store
            </button>
            <button className="add-address-option" onClick={() => setIsAddingAddress((current) => !current)} type="button">
              {isAddingAddress ? "Close new address form" : "+ Add new address"}
            </button>
            {isAddingAddress ? (
              <form className="profile-address-form address-option-form" onSubmit={saveAddress}>
                <label htmlFor="new-profile-address">New delivery address</label>
                <input id="new-profile-address" onChange={(event) => setAddress(event.target.value)} placeholder="House, street, area, Noida" required value={address} />
                <button className="signout-button" disabled={isSavingAddress} type="submit">
                  {isSavingAddress ? "Saving..." : "Save and use this address"}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
        <div className="profile-actions">
          <button className="signout-button" onClick={signOut} type="button">Sign out</button>
          <button className="delete-account-button" onClick={deleteAccount} type="button">Delete account</button>
        </div>
      </section>
    );
  }

  return (
    <div className="auth-form-wrap">
      <div className="auth-switcher" aria-label="Authentication mode">
        <button className={mode === "signin" ? "is-active" : ""} onClick={() => setMode("signin")} type="button">Sign in</button>
        <button className={mode === "signup" ? "is-active" : ""} onClick={() => setMode("signup")} type="button">Create account</button>
      </div>

      <div className="auth-socials">
        <button onClick={() => setMessage("Google sign-in needs OAuth credentials in the app environment.")} type="button">Continue with Google</button>
        <button onClick={() => setMessage("Facebook sign-in needs OAuth credentials in the app environment.")} type="button">Continue with Facebook</button>
      </div>
      <div className="auth-divider"><span>or use your account</span></div>

      <form className="auth-form" onSubmit={submit}>
        {mode === "signin" ? (
          <>
            <label htmlFor="identifier">Email or mobile</label>
            <input id="identifier" onChange={(event) => setName(event.target.value)} required value={name} />
          </>
        ) : null}
        {mode === "signup" ? (
          <>
            <label htmlFor="username">Name</label>
            <input id="username" onChange={(event) => setName(event.target.value)} required value={name} />
          </>
        ) : null}
        <label htmlFor="password">Password</label>
        <input id="password" minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />

        {mode === "signup" ? (
          <>
            <label htmlFor="email">Email address (optional)</label>
            <input id="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
            <label htmlFor="phone">Mobile number</label>
            <input id="phone" onChange={(event) => setPhone(event.target.value)} required type="tel" value={phone} />
            <label htmlFor="address">Address</label>
            <input id="address" onChange={(event) => setAddress(event.target.value)} value={address} />
            <label htmlFor="role">Account type</label>
            <select id="role" onChange={(event) => setRole(event.target.value as UserRole)} value={role}>
              <option value="customer">Customer</option>
              <option value="vendor">Food vendor</option>
            </select>
            {role === "vendor" ? (
              <>
                <label htmlFor="shop-name">Restaurant or stall name</label>
                <input id="shop-name" onChange={(event) => setShopName(event.target.value)} required value={shopName} />
              </>
            ) : null}
          </>
        ) : null}

        {message ? <p className="auth-message" role="alert">{message}</p> : null}
        <button className="checkout-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}