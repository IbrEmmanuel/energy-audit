"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="tt-btn tt-btn-ghost on-dark tt-signout"
    >
      <span className="tt-signout-full">Sign out</span>
      <span className="tt-signout-short">Out</span>
    </button>
  );
}
