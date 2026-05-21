import { CVFormData } from "./types";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Lock, X } from "lucide-react";
import { ModernTemplate } from "./templates/ModernTemplate";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import { CreativeTemplate } from "./templates/CreativeTemplate";
import { LatexTemplate } from "./templates/LatexTemplate";
import { StarRoverTemplate } from "./templates/StarRoverTemplate";
import { withResumeSectionsSortedForDisplay } from "@/lib/resumeDisplaySort";

interface SignupOverlayProps {
  resumeData: CVFormData;
  onClose: () => void;
}

export const SignupOverlay = ({ resumeData, onClose }: SignupOverlayProps) => {
  const template = resumeData.template || "modern";
  const displayData = useMemo(
    () => withResumeSectionsSortedForDisplay(resumeData),
    [resumeData],
  );

  const renderTemplate = () => {
    switch (template) {
      case "classic":
        return <ClassicTemplate data={displayData} />;
      case "minimal":
        return <MinimalTemplate data={displayData} />;
      case "creative":
        return <CreativeTemplate data={displayData} />;
      case "latex":
        return <LatexTemplate data={displayData} />;
      case "starRover":
        return <StarRoverTemplate data={displayData} />;
      case "modern":
      default:
        return <ModernTemplate data={displayData} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Blurred Resume Background - Top Portion Only */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="flex items-start justify-center pt-16 px-4">
          <div className="max-w-4xl w-full relative">
            {/* Clip to show only top portion (header, name, contact, summary) with blur */}
            <div className="relative overflow-hidden rounded-lg" style={{ maxHeight: '45vh' }}>
              <Card className="overflow-hidden pointer-events-none select-none">
                <div className="blur-md opacity-60">
                  {renderTemplate()}
                </div>
              </Card>
              {/* Gradient fade at bottom to blend smoothly */}
              <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Overlay Content */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-[1px]">
        <div className="text-center p-8 space-y-6 max-w-md mx-auto relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>

          <h2 className="text-3xl font-bold text-foreground">Sign Up to Save Your Resume</h2>
          
          <p className="text-lg text-muted-foreground">
            Your resume is ready! Create a free account to save it permanently, access it anytime, and make future edits.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-base px-8 py-6">
              <Link 
                to={{
                  pathname: "/signup",
                  search: new URLSearchParams({
                    firstName: resumeData.personalInfo?.firstName || "",
                    lastName: resumeData.personalInfo?.lastName || "",
                    email: resumeData.personalInfo?.email || "",
                  }).toString()
                }}
              >
                Sign Up Free
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base px-8 py-6">
              <Link to="/login">Log In</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground pt-4">
            Your resume data has been saved locally. Sign up to access it from any device.
          </p>
        </div>
      </div>
    </div>
  );
};

