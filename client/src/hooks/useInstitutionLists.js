import { useEffect, useState } from "react";
import { getInstitutions } from "../services/institution.service.js";

export default function useInstitutionLists() {
  const [yeshivas, setYeshivas] = useState([]);
  const [seminars, setSeminars] = useState([]);
  const [professions, setProfessions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    getInstitutions()
      .then((data) => {
        if (ignore) return;
        setYeshivas(Array.isArray(data?.yeshivas) ? data.yeshivas : []);
        setSeminars(Array.isArray(data?.seminars) ? data.seminars : []);
        setProfessions(Array.isArray(data?.professions) ? data.professions : []);
      })
      .catch(() => {
        if (!ignore) setError("לא הצלחנו לטעון את הרשימות");
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { yeshivas, seminars, professions, error };
}
