export function toUtcIsoTimestamp(value: Date | string = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `builtAt must be a valid UTC timestamp, got: ${String(value)}`,
    );
  }
  return date.toISOString();
}

export function isValidBuiltAt(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function readBuiltAt(data: unknown): string | null {
  if (typeof data !== "object" || data === null || !("builtAt" in data)) {
    return null;
  }
  const builtAt = (data as { builtAt: unknown }).builtAt;
  return isValidBuiltAt(builtAt) ? builtAt : null;
}

export function assignBuiltAt(
  data: Record<string, unknown>,
  builtAt: Date | string = new Date(),
): string {
  const iso = toUtcIsoTimestamp(builtAt);
  data.builtAt = iso;
  return iso;
}

export function formatBuiltAt(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function renderSourceAsOf(
  container: HTMLElement,
  builtAt: string | null,
): void {
  container.replaceChildren();
  if (!isValidBuiltAt(builtAt)) {
    return;
  }

  const time = document.createElement("time");
  time.dateTime = builtAt;
  time.textContent = formatBuiltAt(builtAt);
  container.append(
    document.createTextNode(" (as of "),
    time,
    document.createTextNode(")"),
  );
}
