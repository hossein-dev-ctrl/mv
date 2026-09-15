import PanelShell from "@/components/panel/panel-shell";

export default function PaymentsLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell area="payments">{children}</PanelShell>;
}
