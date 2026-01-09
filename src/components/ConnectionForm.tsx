interface ConnectionFormProps {
  token: string;
  onTokenChange: (token: string) => void;
  onConnect: () => void;
  loading: boolean;
}

export function ConnectionForm({ token, onTokenChange, onConnect, loading }: ConnectionFormProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConnect();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginTop: 16 }}>
      <input
        type="password"
        value={token}
        onChange={(e) => onTokenChange(e.target.value)}
        placeholder="Railway token (account token)"
        style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
      />
      <button
        type="submit"
        disabled={loading || token.trim().length === 0}
        style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc" }}
      >
        {loading ? "Loading…" : "Connect"}
      </button>
    </form>
  );
}
