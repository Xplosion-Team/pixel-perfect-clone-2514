import { BarChart3, DollarSign, Scale, Calculator } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const tabs = [
  { title: "Budget", url: "/", icon: BarChart3 },
  { title: "Cash Flow", url: "/cash-flow", icon: DollarSign },
  { title: "Formation", url: "/formation", icon: Scale },
  { title: "Economics", url: "/economics", icon: Calculator },
];

export function MobileTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-stretch">
        {tabs.map((tab) => (
          <NavLink
            key={tab.url}
            to={tab.url}
            end
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-foreground-muted transition-colors"
            activeClassName="text-brand"
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px] font-semibold tracking-wide">{tab.title}</span>
          </NavLink>
        ))}
      </div>
      {/* Safe area padding for notched devices */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
