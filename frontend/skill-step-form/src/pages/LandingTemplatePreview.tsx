import { CVFormData } from "@/components/cv-form/types";
import { ModernTemplate } from "@/components/cv-form/templates/ModernTemplate";
import { ClassicTemplate } from "@/components/cv-form/templates/ClassicTemplate";
import { CreativeTemplate } from "@/components/cv-form/templates/CreativeTemplate";
import { MinimalTemplate } from "@/components/cv-form/templates/MinimalTemplate";
import { LatexTemplate } from "@/components/cv-form/templates/LatexTemplate";
import { StarRoverTemplate } from "@/components/cv-form/templates/StarRoverTemplate";
import { SlateCopperTemplate } from "@/components/cv-form/templates/SlateCopperTemplate";
import { PrismTemplate } from "@/components/cv-form/templates/PrismTemplate";
import { withResumeSectionsSortedForDisplay } from "@/lib/resumeDisplaySort";

// Helper function to get profile image based on template (rotate through 4 images)
const getProfileImageForTemplate = (templateName: string): string => {
  const imageMap: Record<string, string> = {
    modern: "/resume-sample-1-optimized.jpg",
    classic: "/resume-sample-2-optimized.jpg",
    creative: "/resume-sample-3-optimized.jpg",
    minimal: "/resume-sample-4-optimized.jpg",
    latex: "/resume-sample-1-optimized.jpg",
    starRover: "/resume-sample-2-optimized.jpg",
    slateCopper: "/resume-sample-3-optimized.jpg",
    prism: "/resume-sample-4-optimized.jpg",
  };
  return imageMap[templateName] || "/resume-sample-1-optimized.jpg";
};

// Sample data for preview - realistic resume data
const createSampleData = (templateName: string): CVFormData => ({
  template: templateName as any,
  personalInfo: {
    firstName: "Alex",
    lastName: "Martinez",
    professionalTitle: "Senior Software Engineer",
    email: "alex.martinez@example.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/alexmartinez",
    github: "github.com/alexmartinez",
    summary:
      "Experienced software engineer with 8+ years building scalable web applications. Expertise in React, Node.js, and cloud architecture. Passionate about creating efficient, maintainable code and leading high-performing development teams. Strong background in full-stack development, system design, and DevOps practices.",
    profileImage: getProfileImageForTemplate(templateName),
    website: "alexmartinez.dev",
    interests: [
      { interest: "Open Source Contribution" },
      { interest: "Tech Blogging" },
      { interest: "Hiking" },
      { interest: "Photography" },
      { interest: "Reading" },
    ],
  },
  workExperience: [
    {
      position: "Senior Software Engineer",
      company: "Tech Corp",
      location: "San Francisco, CA",
      startDate: "2020-01",
      endDate: "Present",
      description:
        "Led development of scalable web applications serving millions of users. Reduced API response time by 50%. Architected microservices infrastructure handling 10M+ daily requests. Mentored team of 5 junior developers and established coding standards.",
      technologies: [
        { technology: "React" },
        { technology: "Node.js" },
        { technology: "AWS" },
        { technology: "PostgreSQL" },
        { technology: "Docker" },
        { technology: "Kubernetes" },
      ],
      competencies: [
        { competency: "Team Leadership" },
        { competency: "System Design" },
        { competency: "Agile Methodology" },
      ],
    },
    {
      position: "Software Engineer",
      company: "StartupXYZ",
      location: "Remote",
      startDate: "2018-06",
      endDate: "2019-12",
      description:
        "Built and maintained web applications using modern technologies. Improved performance by 40%. Implemented CI/CD pipelines reducing deployment time by 60%. Collaborated with cross-functional teams to deliver features on time.",
      technologies: [
        { technology: "JavaScript" },
        { technology: "Python" },
        { technology: "Django" },
        { technology: "Redis" },
        { technology: "Git" },
      ],
      competencies: [
        { competency: "Full-Stack Development" },
      ],
    },
    {
      position: "Junior Developer",
      company: "WebSolutions Inc",
      location: "New York, NY",
      startDate: "2016-07",
      endDate: "2018-05",
      description:
        "Developed responsive web applications using React and Node.js. Fixed critical bugs improving system stability. Participated in code reviews and agile development processes.",
      technologies: [
        { technology: "React" },
        { technology: "Node.js" },
        { technology: "MongoDB" },
        { technology: "Express" },
      ],
      competencies: [],
    },
    {
      position: "Intern Software Developer",
      company: "LocalTech Solutions",
      location: "Berkeley, CA",
      startDate: "2015-06",
      endDate: "2016-05",
      description:
        "Assisted in developing web features and maintaining codebase. Learned best practices in software development and contributed to team projects.",
      technologies: [
        { technology: "HTML" },
        { technology: "CSS" },
        { technology: "JavaScript" },
      ],
      competencies: [],
    },
  ],
  education: [
    {
      degree: "Bachelor of Science in Computer Science",
      institution: "University of California",
      location: "Berkeley, CA",
      startDate: "2014",
      endDate: "2018",
      field: "Computer Science",
      keyCourses: [
        { course: "Data Structures" },
        { course: "Algorithms" },
        { course: "Database Systems" },
        { course: "Operating Systems" },
        { course: "Software Engineering" },
        { course: "Machine Learning" },
      ],
    },
  ],
  projects: [
    {
      name: "E-Commerce Platform",
      description:
        "Built scalable e-commerce platform with payment integration. Handles 10K+ daily transactions. Implemented real-time inventory management and automated order processing system.",
      technologies: [
        { technology: "React" },
        { technology: "Node.js" },
        { technology: "MongoDB" },
        { technology: "Stripe API" },
        { technology: "Redis" },
      ],
      startDate: "2023-01",
      endDate: "2023-06",
      link: "",
    },
    {
      name: "Task Management API",
      description:
        "Developed RESTful API for task management system. Supports real-time collaboration features and integrates with third-party services.",
      technologies: [
        { technology: "Python" },
        { technology: "FastAPI" },
        { technology: "PostgreSQL" },
        { technology: "WebSockets" },
      ],
      startDate: "2022-03",
      endDate: "2022-08",
      link: "",
    },
    {
      name: "Mobile Fitness App",
      description:
        "Created cross-platform mobile application for fitness tracking with social features. Integrated with health APIs and implemented push notifications.",
      technologies: [
        { technology: "React Native" },
        { technology: "Firebase" },
        { technology: "Redux" },
      ],
      startDate: "2021-09",
      endDate: "2022-02",
      link: "",
    },
  ],
  certificates: [
    {
      name: "AWS Certified Developer",
      organization: "Amazon Web Services",
      issueDate: "2022-05",
      expirationDate: "",
      credentialId: "",
      url: "",
    },
    {
      name: "Google Cloud Professional",
      organization: "Google Cloud",
      issueDate: "2021-11",
      expirationDate: "",
      credentialId: "",
      url: "",
    },
    {
      name: "Certified Kubernetes Administrator",
      organization: "Cloud Native Computing Foundation",
      issueDate: "2021-08",
      expirationDate: "",
      credentialId: "",
      url: "",
    },
    {
      name: "MongoDB Certified Developer",
      organization: "MongoDB University",
      issueDate: "2020-12",
      expirationDate: "",
      credentialId: "",
      url: "",
    },
  ],
  languages: [
    { language: "English", proficiency: "Native" },
    { language: "Spanish", proficiency: "Fluent" },
    { language: "French", proficiency: "Conversational" },
  ],
  skills: [
    { skill: "JavaScript" },
    { skill: "TypeScript" },
    { skill: "React" },
    { skill: "Node.js" },
    { skill: "Python" },
    { skill: "Java" },
    { skill: "AWS" },
    { skill: "Docker" },
    { skill: "Kubernetes" },
    { skill: "PostgreSQL" },
    { skill: "MongoDB" },
    { skill: "Git" },
    { skill: "CI/CD" },
    { skill: "Microservices" },
  ],
  sectionOrder: ["summary", "workExperience", "education", "projects", "certificates", "skills", "languages", "interests"],
});

interface LandingTemplatePreviewProps {
  templateName:
    | "modern"
    | "classic"
    | "creative"
    | "minimal"
    | "latex"
    | "starRover"
    | "slateCopper"
    | "prism";
  /** Zoom for thumbnail previews; default fits smaller cards. */
  previewScale?: number;
}

const DEFAULT_PREVIEW_SCALE = 0.4;

export const LandingTemplatePreview = ({
  templateName,
  previewScale,
}: LandingTemplatePreviewProps) => {
  // Create base sample data with template-specific profile image
  const baseSampleData = createSampleData(templateName);

  // Enhanced data specifically for LaTeX template to ensure it fills properly
  const enhancedData: CVFormData = templateName === "latex" ? {
    ...baseSampleData,
    template: templateName,
    personalInfo: {
      ...baseSampleData.personalInfo,
      profileImage: getProfileImageForTemplate(templateName), // Ensure correct image for latex template
      summary:
        "Experienced software engineer with 8+ years building scalable web applications. Expertise in React, Node.js, and cloud architecture. Passionate about creating efficient, maintainable code and leading high-performing development teams. Strong background in full-stack development, system design, and DevOps practices. Proven track record of delivering high-quality software solutions that drive business value and improve user experiences.",
    },
    workExperience: [
      ...baseSampleData.workExperience,
      {
        position: "Software Development Intern",
        company: "Innovation Labs",
        location: "Palo Alto, CA",
        startDate: "2014-06",
        endDate: "2015-05",
        description:
          "Worked on frontend development projects using modern JavaScript frameworks. Participated in code reviews and learned best practices. Contributed to open-source projects and improved code quality metrics. Developed responsive web components and assisted in maintaining legacy codebase. Collaborated with senior developers to implement new features and resolve technical issues.",
        technologies: [
          { technology: "JavaScript" },
          { technology: "HTML" },
          { technology: "CSS" },
          { technology: "jQuery" },
          { technology: "Bootstrap" },
        ],
        competencies: [
          { competency: "Frontend Development" },
        ],
      },
    ],
    projects: [
      ...baseSampleData.projects,
      {
        name: "Open Source Contribution Platform",
        description:
          "Contributed to open-source projects with 10K+ GitHub stars. Implemented new features, fixed bugs, and improved documentation. Received recognition from maintainers for quality contributions. Maintained active participation in code reviews and community discussions. Enhanced project accessibility and performance through optimized code contributions.",
        technologies: [
          { technology: "TypeScript" },
          { technology: "React" },
          { technology: "GraphQL" },
          { technology: "Jest" },
        ],
        startDate: "2023-07",
        endDate: "Present",
        link: "",
      },
      {
        name: "Real-Time Analytics Dashboard",
        description:
          "Built analytics dashboard with real-time data visualization. Integrated with multiple data sources and implemented advanced filtering and aggregation features. Improved decision-making capabilities for stakeholders. Created custom chart components and interactive data exploration tools. Optimized performance to handle large datasets efficiently.",
        technologies: [
          { technology: "Vue.js" },
          { technology: "D3.js" },
          { technology: "Python" },
          { technology: "InfluxDB" },
          { technology: "WebSockets" },
        ],
        startDate: "2022-09",
        endDate: "2023-02",
        link: "",
      },
      {
        name: "Machine Learning API Service",
        description:
          "Developed microservice for machine learning model inference with RESTful API interface. Implemented caching layer and request queuing system. Deployed containerized service on Kubernetes cluster with auto-scaling capabilities. Reduced inference latency by 60% through optimization techniques.",
        technologies: [
          { technology: "Python" },
          { technology: "FastAPI" },
          { technology: "TensorFlow" },
          { technology: "Redis" },
          { technology: "Kubernetes" },
        ],
        startDate: "2021-03",
        endDate: "2021-11",
        link: "",
      },
    ],
    certificates: [
      ...baseSampleData.certificates,
      {
        name: "React Advanced Patterns",
        organization: "React Training",
        issueDate: "2020-06",
        expirationDate: "",
        credentialId: "",
        url: "",
      },
      {
        name: "System Design Certificate",
        organization: "Tech Interview University",
        issueDate: "2020-03",
        expirationDate: "",
        credentialId: "",
        url: "",
      },
      {
        name: "Docker Certified Associate",
        organization: "Docker Inc.",
        issueDate: "2020-09",
        expirationDate: "",
        credentialId: "",
        url: "",
      },
      {
        name: "Kubernetes Administration",
        organization: "Linux Foundation",
        issueDate: "2021-01",
        expirationDate: "",
        credentialId: "",
        url: "",
      },
    ],
    education: [
      ...baseSampleData.education,
      {
        degree: "High School Diploma",
        institution: "Berkeley High School",
        location: "Berkeley, CA",
        startDate: "2010",
        endDate: "2014",
        field: "Science & Technology",
        keyCourses: [
          { course: "Advanced Mathematics" },
          { course: "Computer Science" },
          { course: "Physics" },
        ],
      },
    ],
    languages: [
      ...baseSampleData.languages,
      { language: "German", proficiency: "Basic" },
      { language: "Japanese", proficiency: "Basic" },
    ],
    skills: [
      ...baseSampleData.skills,
      { skill: "GraphQL" },
      { skill: "REST APIs" },
      { skill: "TypeScript" },
      { skill: "Vue.js" },
      { skill: "Angular" },
      { skill: "System Design" },
      { skill: "Agile" },
      { skill: "Scrum" },
      { skill: "TDD" },
      { skill: "SOLID Principles" },
      { skill: "Redis" },
      { skill: "Elasticsearch" },
      { skill: "RabbitMQ" },
      { skill: "Nginx" },
      { skill: "Jenkins" },
      { skill: "GitLab CI" },
      { skill: "Terraform" },
      { skill: "Ansible" },
      { skill: "Monitoring" },
    ],
    interests: [
      ...(baseSampleData.personalInfo.interests || []),
      { interest: "Machine Learning" },
      { interest: "DevOps" },
      { interest: "Architecture Design" },
      { interest: "Code Reviews" },
    ],
  } : baseSampleData;

  const data: CVFormData = {
    ...enhancedData,
    template: templateName,
  };
  const displayData = withResumeSectionsSortedForDisplay(data);

  // Scale factor to fit in the preview card (aspect ratio 3:4)
  // Templates are typically A4 size, so we scale down significantly
  // Increased scale to make templates appear larger
  // Minimal template needs larger scale due to its compact design
  const scale = previewScale ?? DEFAULT_PREVIEW_SCALE;

  return (
    <div
      className="w-full h-full overflow-hidden bg-white relative"
      style={{ imageRendering: "crisp-edges", backfaceVisibility: "hidden" }}
    >
      {/* Overlay to hide corner text (page numbers, alt text, etc.) */}
      <div
        className="absolute bottom-0 right-0 pointer-events-none z-10"
        style={{
          width: "25%",
          height: "20%",
          minWidth: 80,
          minHeight: 40,
          background: "linear-gradient(to top left, rgba(255,255,255,0.98) 35%, transparent)",
        }}
      />
      <div
        className="origin-top-left absolute top-0 left-0"
        style={{
          transform: `scale(${scale})`,
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          minHeight: `${100 / scale}%`,
          transformOrigin: "top left",
          willChange: "transform",
        }}
      >
        <div style={{ minHeight: '1400px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: '100%' }} data-landing-preview="" data-template={templateName}>
            {templateName === "modern" && <ModernTemplate data={displayData} />}
            {templateName === "classic" && <ClassicTemplate data={displayData} />}
            {templateName === "creative" && <CreativeTemplate data={displayData} />}
            {templateName === "minimal" && <MinimalTemplate data={displayData} />}
            {templateName === "latex" && <LatexTemplate data={displayData} />}
            {templateName === "starRover" && <StarRoverTemplate data={displayData} />}
            {templateName === "slateCopper" && <SlateCopperTemplate data={displayData} />}
            {templateName === "prism" && <PrismTemplate data={displayData} />}
          </div>
        </div>
      </div>
    </div>
  );
};
