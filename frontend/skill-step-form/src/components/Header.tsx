import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, User, LogOut, Settings, Sparkles, Globe, Briefcase } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg no-print">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-shrink-0">
            <img 
              src="/logoo.png" 
              alt="123Resume Logo" 
              className="h-9 w-auto sm:h-10 md:h-12 flex-shrink-0 object-contain"
            />
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9" asChild>
              <Link to="/">{t('navigation.home')}</Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9" asChild>
              <Link to="/blog">{t('navigation.blog')}</Link>
            </Button>
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                <span className="text-xs sm:text-sm font-medium text-foreground hidden md:inline whitespace-nowrap">
                  {user?.first_name || user?.username}
                </span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 flex-shrink-0">
                      <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium truncate">{user?.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/resumes')}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>{t('navigation.myResumes')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/resumes?tab=job-matching')}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      <span>{t('pages.resumes.tabs.jobMatching')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/resumes?tab=job-tracker')}>
                      <Briefcase className="mr-2 h-4 w-4" />
                      <span>{t('pages.resumes.tabs.jobTracker')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/resumes?tab=portfolio')}>
                      <Globe className="mr-2 h-4 w-4" />
                      <span>{t('pages.resumes.tabs.portfolio') || 'Portfolio Website'}</span>
                    </DropdownMenuItem>
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
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9" asChild>
                  <Link to="/login">{t('navigation.login')}</Link>
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs sm:text-sm px-2 sm:px-3 md:px-4 h-8 sm:h-9 whitespace-nowrap" asChild>
                  <Link to="/create/start">
                    <span className="hidden md:inline">{t('navigation.startBuildingFree')}</span>
                    <span className="md:hidden">{t('navigation.startFree')}</span>
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

