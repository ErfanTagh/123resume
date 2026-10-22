import { useNavigate } from 'react-router-dom';
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
      <div className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground sm:text-5xl">
              {t('pages.dashboard.welcomeBack')}, {user?.first_name || user?.username}
            </h1>
            <p className="text-lg text-muted-foreground sm:text-xl">
              {t('pages.dashboard.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card
              className="cursor-pointer p-8 transition-shadow hover:shadow-lg"
              onClick={() => navigate('/create/start')}
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="mb-2 text-2xl font-bold">{t('pages.dashboard.createNewResume')}</h2>
                  <p className="text-muted-foreground">
                    {t('pages.dashboard.createNewResumeDesc')}
                  </p>
                </div>
                <Button className="w-full">{t('pages.dashboard.getStarted')}</Button>
              </div>
            </Card>

            <Card
              className="cursor-pointer p-8 transition-shadow hover:shadow-lg"
              onClick={() => navigate('/resumes')}
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <List className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="mb-2 text-2xl font-bold">{t('pages.dashboard.myResumesTitle')}</h2>
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
