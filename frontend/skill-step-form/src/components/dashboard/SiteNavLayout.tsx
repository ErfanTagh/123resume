import { Outlet } from "react-router-dom";
import { DashboardSideBar } from "@/components/dashboard/DashboardSideBar";

/** Persistent site side rail for Dashboard + Templates/Pricing/Blog/About/Contact. */
export function SiteNavLayout() {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="flex flex-row items-start">
        <DashboardSideBar />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
