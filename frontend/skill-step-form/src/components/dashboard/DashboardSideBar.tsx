import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  CircleDollarSign,
  Info,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
} from "lucide-react";
import {
  AppSideRail,
  appSideRailItemActiveClass,
  appSideRailItemClass,
} from "@/components/AppSideRail";
import { useLanguage } from "@/contexts/LanguageContext";
import { useResumesSidebar } from "@/contexts/ResumesSidebarContext";
import { cn } from "@/lib/utils";

const SITE_NAV_ITEMS = [
  {
    to: "/dashboard",
    icon: LayoutDashboard,
    labelKey: "navigation.dashboard",
    fallback: "Dashboard",
  },
  {
    to: "/templates",
    icon: LayoutTemplate,
    labelKey: "footer.templates",
    fallback: "Templates",
  },
  {
    to: "/pricing",
    icon: CircleDollarSign,
    labelKey: "footer.pricing",
    fallback: "Pricing",
  },
  {
    to: "/blog",
    icon: BookOpen,
    labelKey: "footer.blog",
    fallback: "Blog",
  },
  {
    to: "/about",
    icon: Info,
    labelKey: "footer.aboutUs",
    fallback: "About Us",
  },
  {
    to: "/contact",
    icon: Mail,
    labelKey: "footer.contact",
    fallback: "Contact",
  },
] as const;

export function DashboardSideBar() {
  const { t } = useLanguage();
  const { collapsed } = useResumesSidebar();
  const location = useLocation();

  return (
    <AppSideRail label={t("landing.seoNavAria") || "Site navigation"}>
      {SITE_NAV_ITEMS.map(({ to, icon: Icon, labelKey, fallback }) => {
        const label = t(labelKey) || fallback;
        const isActive =
          to === "/dashboard"
            ? location.pathname === "/dashboard"
            : location.pathname === to || location.pathname.startsWith(`${to}/`);

        return (
          <Link
            key={to}
            to={to}
            title={label}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            tabIndex={collapsed ? -1 : undefined}
            className={cn(
              appSideRailItemClass,
              isActive && appSideRailItemActiveClass,
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate whitespace-nowrap">{label}</span>
          </Link>
        );
      })}
    </AppSideRail>
  );
}
