import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import { getCurrentUser } from "../services/auth.service.js";
import { getSession, identityComplete, rememberUser } from "../utils/session.js";
import { FormSkeleton } from "./common/PageSkeleton.jsx";

export default function MemberGate({ children }) {
  const location = useLocation();
  const { isAdmin } = getSession();
  const [state, setState] = useState(() => {
    if (isAdmin) return "ready";
    return identityComplete(getSession().user) ? "ready" : "checking";
  });

  useEffect(() => {
    if (isAdmin || state !== "checking") return undefined;
    let ignore = false;
    getCurrentUser()
      .then((data) => {
        if (ignore || !data?.user) return;
        rememberUser(data.user);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setState("ready");
      });
    return () => {
      ignore = true;
    };
  }, [isAdmin, state]);

  if (isAdmin) return children;
  if (state === "checking") {
    return (
      <Box sx={{ p: 3 }}>
        <FormSkeleton />
      </Box>
    );
  }

  const done = identityComplete(getSession().user);
  if (!done && location.pathname !== "/identity") {
    return <Navigate to="/identity" replace />;
  }
  if (done && location.pathname === "/identity") {
    const next = localStorage.getItem("onboarding");
    const target = next && next !== "/identity" ? next : "/home";
    return <Navigate to={target} replace />;
  }
  return children;
}
