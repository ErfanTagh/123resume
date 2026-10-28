import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { jobApplicationAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const JOB_APPLICATIONS_KEY = ["job-applications"] as const;

/**
 * The user's job applications, shared by the tracker and the header streak
 * badge. Refetches when the tab regains focus, so entries Claude adds through
 * the connector show up without a reload.
 */
export function useJobApplications() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: JOB_APPLICATIONS_KEY,
    queryFn: jobApplicationAPI.getAll,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

/** Call after creating, editing or deleting an application. */
export function useRefreshJobApplications() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: JOB_APPLICATIONS_KEY }),
    [queryClient],
  );
}
