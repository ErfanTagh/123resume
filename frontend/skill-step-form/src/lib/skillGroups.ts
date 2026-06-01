type SkillRow = { skill?: string };
type SkillGroupRow = { name?: string; skills?: SkillRow[] };

export interface RenderableSkillGroup {
  name: string;
  skills: string[];
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Build grouped skills for template rendering.
 * Prefers explicit `skillGroups`, falls back to legacy flat `skills`.
 */
export function getRenderableSkillGroups(
  skillGroups: SkillGroupRow[] | undefined,
  skills: SkillRow[] | undefined,
  fallbackGroupName: string,
): RenderableSkillGroup[] {
  if (Array.isArray(skillGroups)) {
    const explicit = skillGroups
      .map((group) => {
        const name = clean(group?.name);
        const groupedSkills = unique((group?.skills || []).map((row) => clean(row?.skill)).filter(Boolean));
        if (!name || groupedSkills.length === 0) return null;
        return { name, skills: groupedSkills };
      })
      .filter((group): group is RenderableSkillGroup => !!group);
    if (explicit.length > 0) return explicit;
  }

  const rows = Array.isArray(skills) ? skills.map((row) => clean(row?.skill)).filter(Boolean) : [];
  if (rows.length === 0) return [];

  const groupedMap = new Map<string, string[]>();
  const ungrouped: string[] = [];

  for (const row of rows) {
    const separatorIndex = row.indexOf(":");
    if (separatorIndex > 0) {
      const groupName = row.slice(0, separatorIndex).trim();
      const groupedPart = row.slice(separatorIndex + 1).trim();
      if (groupName && groupedPart) {
        const parsedSkills = groupedPart
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        if (parsedSkills.length > 0) {
          const existing = groupedMap.get(groupName) || [];
          groupedMap.set(groupName, unique([...existing, ...parsedSkills]));
          continue;
        }
      }
    }
    ungrouped.push(row);
  }

  const groups: RenderableSkillGroup[] = Array.from(groupedMap.entries()).map(([name, values]) => ({
    name,
    skills: values,
  }));

  const left = unique(ungrouped);
  if (left.length > 0) {
    groups.push({ name: fallbackGroupName, skills: left });
  }
  return groups;
}
