import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function AuthPage() {
  return (
    <main className="auth-page">
      <Link className="back-link" href="/">
        <ArrowLeft aria-hidden="true" size={17} />
        Menu
      </Link>
      <header className="auth-header">
        <p className="eyebrow">Bharat Burger · Noida</p>
        <h1>Your table,<br />your account.</h1>
        <p>Sign in to keep your details close, or create an account for your next order.</p>
      </header>
      <AuthForm />
    </main>
  );
}