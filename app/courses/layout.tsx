import PanelShell from "@/components/panel/panel-shell";

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell area="courses">{children}</PanelShell>;
}
