interface ErrorBannerProps {
  error: string;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  return (
    <div style={{ marginTop: 12, padding: 12, border: "1px solid #f3c2c2", borderRadius: 8 }}>
      <b>Error:</b> {error}
    </div>
  );
}
