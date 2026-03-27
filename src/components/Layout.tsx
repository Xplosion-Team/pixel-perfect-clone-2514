import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-11 flex items-center border-b border-border sticky top-0 z-50 bg-background">
            <SidebarTrigger className="ml-2" />
            <span className="ml-3 text-xs font-bold tracking-tight">
              Fare<span className="text-purple">RX</span>
            </span>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="max-w-[960px] mx-auto px-6 py-9 pb-16">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
