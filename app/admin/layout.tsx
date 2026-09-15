import PanelShell from "@/components/panel/panel-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell area="admin">{children}</PanelShell>;
}
