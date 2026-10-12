"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function AuthPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSocialSignIn = async (
    provider: "google" | "github"
  ) => {
    try {
      setLoading(provider);
      setError(null);
      console.log("🔥 BUTTON CLICKED:", provider);

      await authClient.signIn.social({
        provider,
        callbackURL: "/dashboard",
        errorCallbackURL: "/signin?error=true",
      });

      console.log("🔥 AFTER BETTER AUTH — redirect should happen");
    } catch (err) {
      console.error("🔥 SIGN-IN ERROR:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Sign-in failed. Please try again."
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 max-w-sm mx-auto mt-20">
      <h1 className="text-xl font-semibold mb-2">Sign in to Codebase explorer</h1>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={() => handleSocialSignIn("google")}
        disabled={loading !== null}
        className="flex items-center justify-center gap-2 border rounded-lg py-2 px-4 hover:bg-gray-50 disabled:opacity-50"
      >
        {loading === "google" ? "Redirecting..." : "Continue with Google"}
      </button>

      <button
        onClick={() => handleSocialSignIn("github")}
        disabled={loading !== null}
        className="flex items-center justify-center gap-2 border rounded-lg py-2 px-4 hover:bg-gray-50 disabled:opacity-50"
      >
        {loading === "github" ? "Redirecting..." : "Continue with GitHub"}
      </button>

      <div className="flex items-center gap-2 my-2 text-gray-400 text-sm">
        <div className="flex-1 h-px bg-gray-200" />
        or
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* your existing email/password form goes here */}
    </div>
  );
}
