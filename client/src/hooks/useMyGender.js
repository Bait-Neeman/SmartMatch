import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getMyProfile } from "../services/profile.service.js";
import { toSafeFileUrl } from "../utils/files.js";
import { readPhotoCrop } from "../utils/photoCrop.js";
import { getSession } from "../utils/session.js";

const sessionGender = () => {
  const value = getSession().user?.gender;
  return value === "male" || value === "female" ? value : "";
};

// Gender, photo, and crop for the signed-in member. Gender can exist before a profile.
export function useMyPortrait() {
  const { pathname } = useLocation();
  const [portrait, setPortrait] = useState({ gender: sessionGender(), image: "", photoCrop: null });

  useEffect(() => {
    let ignore = false;

    const load = () => {
      getMyProfile()
        .then((data) => {
          if (ignore) return;
          const profile = data?.profile;
          const value = profile?.gender;
          setPortrait({
            gender: value === "male" || value === "female" ? value : sessionGender(),
            image: toSafeFileUrl(profile?.image),
            photoCrop: readPhotoCrop(profile?.photoCrop),
          });
        })
        .catch(() => {});
    };

    load();
    window.addEventListener("portrait-changed", load);
    return () => {
      ignore = true;
      window.removeEventListener("portrait-changed", load);
    };
  }, [pathname]);

  return portrait;
}

export default function useMyGender() {
  return useMyPortrait().gender;
}
