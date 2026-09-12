"use client";

import Image from "next/image";
import { useState } from "react";

export function ReceiptLogo() {
  const [available, setAvailable] = useState(true);

  return (
    <>
      {available ? (
        <Image
          src="/branding/startek-print-hub-receipt.png"
          alt="Startek Print Hub logo"
          width={600}
          height={510}
          priority
          onError={() => setAvailable(false)}
          className="mx-auto mb-1 h-auto w-24 object-contain"
        />
      ) : null}
      <h1 className="text-sm font-black">STARTEK PRINT HUB</h1>
    </>
  );
}
