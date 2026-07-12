"use client";

import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

import { useCurrentTheme } from "@/hooks/use-current-theme";

export default function SignUpPage() {
  const currentTheme = useCurrentTheme();

  return (
    <SignUp
      appearance={{
        elements: {
          cardBox: "border! border-border! shadow-none! rounded-xl!",
          card: "bg-card!",
        },
        baseTheme: currentTheme === "dark" ? dark : undefined,
      }}
    />
  );
}
