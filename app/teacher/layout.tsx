import PanelShell from "@/components/panel/panel-shell";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell area="teacher">{children}</PanelShell>;
}
