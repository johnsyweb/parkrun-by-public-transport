export function joinBaseUrlPath(baseUrl: string, pagePath: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const pathSegment = pagePath === "/" ? "" : pagePath.replace(/^\/+/, "");
  return pathSegment ? `${base}/${pathSegment}` : `${base}/`;
}
