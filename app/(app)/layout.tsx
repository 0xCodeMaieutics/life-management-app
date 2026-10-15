import AppLayoutClient from "./layout.client";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppLayoutClient>{children}</AppLayoutClient>;
}
