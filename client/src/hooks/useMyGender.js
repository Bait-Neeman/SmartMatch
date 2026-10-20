import { useEffect, useState } from "react";
import { getMyProfile } from "../services/profile.service.js";
import { getSession } from "../utils/session.js";

// The signed-in user's silhouette. Gender is chosen before the profile exists.
export default function useMyGender() {
  const sessionGender = getSession().user?.gender;
  const [gender, setGender] = useState(sessionGender === "male" || sessionGender === "female" ? sessionGender : "");

  useEffect(() => {
    let ignore = false;
    getMyProfile()
      .then((data) => {
        const value = data?.profile?.gender;
        if (!ignore && (value === "male" || value === "female")) setGender(value);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  return gender;
}
