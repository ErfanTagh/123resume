import { z } from "zod";

export const cvFormSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    professionalTitle: z.string().optional(),
    profileImage: z.string().optional(),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional().or(z.literal("")),
    github: z.string().optional().or(z.literal("")),
    website: z.string().optional().or(z.literal("")),
    summary: z.string().optional(),
    interests: z.array(
      z.object({
        interest: z.string().optional(),
      })
    ).optional(),
  }),
  workExperience: z.array(
    z.object({
      position: z.string().optional(),
      company: z.string().optional(),
      location: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      description: z.string().optional(),
      responsibilities: z.array(
        z.object({
          responsibility: z.string().optional(),
        })
      ).optional(),
      technologies: z.array(
        z.object({
          technology: z.string().optional(),
        })
      ).optional(),
      competencies: z.array(
        z.object({
          competency: z.string().optional(),
        })
      ).optional(),
      link: z.string().optional().or(z.literal("")),
    })
  ).optional(),
  education: z.array(
    z.object({
      degree: z.string().optional(),
      institution: z.string().optional(),
      location: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      field: z.string().optional(),
      keyCourses: z.array(
        z.object({
          course: z.string().optional(),
        })
      ).optional(),
      descriptions: z.array(
        z.object({
          description: z.string().optional(),
        })
      ).optional(),
      link: z.string().optional().or(z.literal("")),
    })
  ).optional(),
  projects: z.array(
    z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      highlights: z.array(
        z.object({
          highlight: z.string().optional(),
        })
      ).optional(),
      technologies: z.array(
        z.object({
          technology: z.string().optional(),  // 🔧 Changed to optional
        })
      ).optional(),  // 🔧 Made array optional
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      link: z.string().optional().or(z.literal("")),
    })
  ).optional(),
  certificates: z.array(
    z.object({
      name: z.string().optional(),
      organization: z.string().optional(),
      issueDate: z.string().optional(),
      expirationDate: z.string().optional(),
      credentialId: z.string().optional(),
      url: z.string().optional().or(z.literal("")),
    })
  ).optional(),
  languages: z.array(
    z.object({
      language: z.string().optional(),  // 🔧 Changed to optional
      proficiency: z.string().optional(),  // 🔧 Changed to optional
    })
  ).optional(),  // 🔧 Made array optional
  skills: z.array(
    z.object({
      skill: z.string().optional(),  // 🔧 Changed to optional
    })
  ).optional(),  // 🔧 Made array optional
  skillGroups: z.array(
    z.object({
      name: z.string().optional(),
      skills: z.array(
        z.object({
          skill: z.string().optional(),
        }),
      ).optional(),
    }),
  ).optional(),
  sectionOrder: z.array(z.string()).optional(),
  template: z
    .enum(["modern", "classic", "minimal", "creative", "latex", "starRover", "slateCopper", "prism"])
    .default("modern"),
  styling: z.object({
    // ISO code of the language this resume's content is written in. Set by the AI
    // translator so templates can render section headings in that language,
    // independent of the app UI language. Stored inside styling to round-trip
    // through the existing DictField without extra backend plumbing.
    resumeLanguage: z.string().optional(),
    fontFamily: z.string().optional(),
    fontSize: z.enum(["small", "medium", "large"]).optional(),
    titleColor: z.string().optional(),
    titleBold: z.boolean().optional(),
    headingColor: z.string().optional(),
    headingBold: z.boolean().optional(),
    textColor: z.string().optional(),
    linkColor: z.string().optional(),
    sectionStyling: z.record(z.object({
      titleColor: z.string().optional(),
      titleSize: z.enum(["small", "medium", "large"]).optional(),
      bodyColor: z.string().optional(),
      bodySize: z.enum(["small", "medium", "large"]).optional(),
    })).optional(),
  }).optional(),
});
export type CVFormData = z.infer<typeof cvFormSchema>;

export type CVTemplate =
  | "modern"
  | "classic"
  | "minimal"
  | "creative"
  | "latex"
  | "starRover"
  | "slateCopper"
  | "prism";
