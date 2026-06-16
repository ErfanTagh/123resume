import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Plus, List } from 'lucide-react';
import { SEO } from '@/components/SEO';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <>
      <SEO
        title="Dashboard - 123Resume"
        description="Manage your resumes and create new professional CVs."
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            {t('pages.dashboard.welcomeBack')}, {user?.first_name || user?.username}! 👋
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('pages.dashboard.subtitle')}
          </p>
        </div>

        <nav
          className="mb-10 flex flex-wrap justify-center gap-x-5 gap-y-2 border-b border-border/60 pb-8 text-sm text-muted-foreground"
          aria-label={t('landing.seoNavAria')}
        >
          <Link to="/templates" className="hover:text-primary hover:underline">
            {t('footer.templates')}
          </Link>
          <Link to="/pricing" className="hover:text-primary hover:underline">
            {t('footer.pricing')}
          </Link>
          <Link to="/blog" className="hover:text-primary hover:underline">
            {t('footer.blog')}
          </Link>
          <Link to="/about" className="hover:text-primary hover:underline">
            {t('footer.aboutUs')}
          </Link>
          <Link to="/contact" className="hover:text-primary hover:underline">
            {t('footer.contact')}
          </Link>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/create/start')}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{t('pages.dashboard.createNewResume')}</h2>
                <p className="text-muted-foreground">
                  {t('pages.dashboard.createNewResumeDesc')}
                </p>
              </div>
              <Button className="w-full">{t('pages.dashboard.getStarted')}</Button>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/resumes')}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <List className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{t('pages.dashboard.myResumesTitle')}</h2>
                <p className="text-muted-foreground">
                  {t('pages.dashboard.myResumesDesc')}
                </p>
              </div>
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                {t('pages.dashboard.viewAll')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
      </div>
    </>
  );
};

export default Index;
