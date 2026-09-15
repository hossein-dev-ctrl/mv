import PanelShell from "@/components/panel/panel-shell";

export default function LessonLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell area="lesson">{children}</PanelShell>;
}
