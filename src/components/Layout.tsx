import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { AppTour } from "@/components/AppTour";
import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar hidden on mobile */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center border-b border-border sticky top-0 z-50 bg-background">
            <SidebarTrigger className="ml-2 hidden md:flex" />
            <span data-tour="brand" className="ml-3 text-xs font-bold tracking-tight text-brand">
              Fare<span className="text-brand-accent">RX</span>
            </span>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="max-w-[960px] mx-auto px-4 md:px-6 py-6 md:py-9 pb-32 md:pb-16">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <MobileTabBar />
      <AppTour />
    </SidebarProvider>
    </SidebarProvider>
  );
}
