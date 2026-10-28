import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useResumesSidebar } from '@/contexts/ResumesSidebarContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, User, LogOut, Settings, Menu } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { StreakBadge } from './StreakBadge';
import { RESUMES_TABS, resumesTabHref } from '@/components/resumes/resumesTabs';
import { isSiteNavPath } from '@/components/dashboard/siteNav';

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggle } = useResumesSidebar();
  const headerRef = useRef<HTMLElement>(null);
  const showSidebarToggle =
    location.pathname.startsWith('/resumes') || isSiteNavPath(location.pathname);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const syncHeight = () => {
      document.documentElement.style.setProperty(
        '--app-header-height',
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
    };
    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg no-print"
    >
      <div className="flex w-full items-center justify-between gap-2 px-3 pb-2.5 pt-3 sm:gap-4 sm:px-6 sm:pb-3 sm:pt-4 md:px-8 md:pb-4 md:pt-5">
        {/* Brand stays put — outside the collapsing sidebar (R5). */}
        <div className="flex shrink-0 items-center gap-1.5">
          {showSidebarToggle && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggle}
              className="h-10 w-10 shrink-0 p-0 text-muted-foreground hover:text-foreground"
              aria-label={collapsed ? 'Open the menu' : 'Close the menu'}
              aria-expanded={!collapsed}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link to="/" className="flex shrink-0 items-center no-underline">
            <img
              src="/logoo.png"
              alt="123Resume Logo"
              className="h-10 w-auto shrink-0 object-contain sm:h-12 md:h-14"
            />
          </Link>
        </div>

        <nav className="flex flex-shrink-0 items-center gap-1 sm:gap-2 md:gap-4">
          {/* Phones: the logo is the home link, and without this the bar is wider than the screen */}
          <Button variant="ghost" size="sm" className="hidden h-8 px-2 text-xs text-muted-foreground hover:text-foreground sm:inline-flex sm:h-9 sm:px-3 sm:text-sm" asChild>
            <Link to="/">{t('navigation.home')}</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground sm:h-9 sm:px-3 sm:text-sm" asChild>
            <Link to="/blog">{t('navigation.blog')}</Link>
          </Button>
          <LanguageSwitcher />
          {isAuthenticated ? (
            <>
              <StreakBadge />
              <span className="hidden whitespace-nowrap text-xs font-medium text-foreground md:inline sm:text-sm">
                {user?.first_name || user?.username}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full sm:h-9 sm:w-9 md:h-10 md:w-10">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="truncate text-sm font-medium">{user?.username}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {RESUMES_TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <DropdownMenuItem
                        key={tab.id}
                        onClick={() => navigate(resumesTabHref(tab.id))}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{t(tab.labelKey) || tab.fallback}</span>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>{t('navigation.dashboard')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('navigation.profileSettings')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('navigation.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground sm:h-9 sm:px-3 sm:text-sm" asChild>
                <Link to="/login">{t('navigation.login')}</Link>
              </Button>
              <Button size="sm" className="h-8 whitespace-nowrap bg-primary px-2 text-xs hover:bg-primary/90 sm:h-9 sm:px-3 sm:text-sm md:px-4" asChild>
                <Link to="/create/start">
                  <span className="hidden md:inline">{t('navigation.startBuildingFree')}</span>
                  <span className="md:hidden">{t('navigation.startFree')}</span>
                </Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
