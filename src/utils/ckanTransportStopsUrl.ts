export type CkanResource = {
  name?: string;
  format?: string;
  url?: string;
};

export type CkanPackageShowResponse = {
  success?: boolean;
  error?: unknown;
  result?: {
    resources?: CkanResource[];
  };
};

export function transportStopsDownloadUrlFromPackageShow(
  body: unknown,
): string {
  const response = body as CkanPackageShowResponse;
  if (!response.success) {
    throw new Error(
      `CKAN package_show failed: ${JSON.stringify(response.error ?? body)}`,
    );
  }

  const resource = (response.result?.resources ?? []).find(
    (entry) =>
      entry.format?.toUpperCase() === "GEOJSON" &&
      /public transport stops/i.test(entry.name ?? ""),
  );

  if (!resource?.url) {
    throw new Error(
      "No GeoJSON resource named Public Transport Stops in CKAN package",
    );
  }

  return resource.url;
}
