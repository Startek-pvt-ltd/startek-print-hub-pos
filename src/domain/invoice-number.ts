export function formatInvoiceNumber(prefix: string, sequence: bigint) {
  if (sequence < BigInt(1)) throw new Error("Invoice sequence must be positive");
  return `${prefix}-${sequence.toString().padStart(6, "0")}`;
}

export async function allocateInvoiceNumber(prefix: string, incrementCounter: () => Promise<bigint>) {
  const nextValueAfterIncrement = await incrementCounter();
  return formatInvoiceNumber(prefix, nextValueAfterIncrement - BigInt(1));
}
