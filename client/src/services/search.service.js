import api from "../api/axios.js";

const asText = (value) => (typeof value === "string" ? value : "");

// The server already drops hidden identity. Keep only the fields the top bar renders.
const toResult = (item) => {
  const href = asText(item?.href);
  if (!href.startsWith("/")) return null;
  const id = asText(item?.id);
  const title = asText(item?.title);
  if (!id || !title) return null;
  return {
    id,
    kind: asText(item?.kind),
    title,
    subtitle: asText(item?.subtitle),
    href,
  };
};

export const searchPeople = async (query) => {
  const response = await api.get("/search", { params: { q: query } });
  const results = Array.isArray(response.data?.results) ? response.data.results : [];
  return results.map(toResult).filter(Boolean);
};
