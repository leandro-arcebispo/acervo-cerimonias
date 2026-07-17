"use client";

import { useRouter } from "next/navigation";

export default function VoltarButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
    >
      ← Voltar
    </button>
  );
}
