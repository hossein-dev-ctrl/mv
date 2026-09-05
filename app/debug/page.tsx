import { getSession } from "@/lib/auth";

export default async function DebugPage() {
  const session = await getSession();

  return <pre>{JSON.stringify(session, null, 2)}</pre>;
}
