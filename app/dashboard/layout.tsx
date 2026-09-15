import PanelShell from "@/components/panel/panel-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell area="student">{children}</PanelShell>;
}
