"use client";

import {
  BookMarked,
  CheckSquare,
  FileUp,
  FolderOpen,
  CalendarDays,
  MessagesSquare,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  {
    title: "Day plan",
    href: "/day-plan",
    icon: CalendarDays,
    isActive: (pathname: string) => pathname.startsWith("/day-plan"),
  },
  {
    title: "Todos",
    href: "/todos",
    icon: CheckSquare,
    isActive: (pathname: string) => pathname.startsWith("/todos"),
  },
  {
    title: "Later reads",
    href: "/later-reads",
    icon: BookMarked,
    isActive: (pathname: string) => pathname.startsWith("/later-reads"),
  },
  {
    title: "Threads",
    href: "/threads",
    icon: MessagesSquare,
    isActive: (pathname: string) => pathname.startsWith("/threads"),
  },
  {
    title: "Matters",
    href: "/matter",
    icon: FolderOpen,
    isActive: (pathname: string) => pathname.startsWith("/matter"),
  },
  {
    title: "Import",
    href: "/import",
    icon: FileUp,
    isActive: (pathname: string) => pathname.startsWith("/import"),
  },
] as const;

function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={item.isActive(pathname)}
                tooltip={item.title}
                render={<Link href={item.href} />}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function SidebarNavFallback() {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                tooltip={item.title}
                render={<Link href={item.href} />}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/day-plan" />}
              className="hover:bg-transparent active:bg-transparent"
            >
              <Image
                alt="Life management"
                src="/logo-with-text.svg"
                width={200}
                height={35}
                className="group-data-[collapsible=icon]:hidden"
                priority
              />
              <Image
                alt="Life management"
                src="/logo.svg"
                width={35}
                height={35}
                className="hidden group-data-[collapsible=icon]:block"
                priority
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <Suspense fallback={<SidebarNavFallback />}>
          <SidebarNav />
        </Suspense>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

export default function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "20rem",
            "--sidebar-width-mobile": "20rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
