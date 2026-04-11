export function dataLoadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Failed to load data. Please check your internet connection.";
  }

  const msg = error.message;

  if (
    msg.includes("invalid JSON") ||
    msg.includes("empty response body") ||
    msg.includes("expected GeoJSON") ||
    msg.includes("Failed to fetch parkrun-events") ||
    msg.includes("Failed to fetch transport stops")
  ) {
    return (
      "The timetable or stop data could not be read. " +
      "Try refreshing the page. If it keeps happening, use “Clear cache” below or clear site data for this site and reload."
    );
  }

  return "Failed to load data. Please check your internet connection.";
}
