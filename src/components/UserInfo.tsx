interface UserInfoProps {
  me: { name: string | null; email: string | null };
}

export function UserInfo({ me }: UserInfoProps) {
  return (
    <div style={{ marginTop: 12 }}>
      Connected as <b>{me.name ?? "Unknown"}</b> {me.email ? `(${me.email})` : ""}
    </div>
  );
}
