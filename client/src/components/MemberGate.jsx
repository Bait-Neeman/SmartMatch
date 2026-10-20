import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import { getCurrentUser } from "../services/auth.service.js";
import { getSession, identityComplete, needsCredentialSetup, rememberUser } from "../utils/session.js";
import { FormSkeleton } from "./common/PageSkeleton.jsx";

export default function MemberGate({ children }) {
  const location = useLocation();
  const { isAdmin, user } = getSession();
  const [state, setState] = useState(() => {
    if (isAdmin) return "ready";
    if (!identityComplete(user) || user?.credentialSetupRequired) return "checking";
    return "ready";
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

  const current = getSession().user;
  if (needsCredentialSetup(current) && location.pathname !== "/account-setup") {
    return <Navigate to="/account-setup" replace />;
  }
  if (location.pathname === "/account-setup" && !current?.credentialSetupRequired) {
    const next = localStorage.getItem("onboarding");
    const target = next && next !== "/account-setup" && next !== "/identity" ? next : "/home";
    return <Navigate to={target} replace />;
  }

  const done = identityComplete(current);
  if (!done && location.pathname !== "/identity" && location.pathname !== "/account-setup") {
    return <Navigate to="/identity" replace />;
  }
  if (done && location.pathname === "/identity") {
    const next = localStorage.getItem("onboarding");
    const target = next && next !== "/identity" ? next : "/home";
    return <Navigate to={target} replace />;
  }
  return children;
}
