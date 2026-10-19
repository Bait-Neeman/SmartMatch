import { useEffect, useState } from "react";
import { getMyProfile } from "../services/profile.service.js";

// The signed-in user's silhouette. Gender lives on the profile, not the session.
export default function useMyGender() {
  const [gender, setGender] = useState("");

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
