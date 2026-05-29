import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Legacy route — job matching lives on the Resumes page as a tab. */
export default function JobMatching() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/resumes?tab=job-matching", { replace: true });
  }, [navigate]);

  return null;
}
