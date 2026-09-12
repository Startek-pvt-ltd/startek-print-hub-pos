export function consumeAutoprintUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.searchParams.get("autoprint") !== "1") return null;
  parsed.searchParams.delete("autoprint");
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
