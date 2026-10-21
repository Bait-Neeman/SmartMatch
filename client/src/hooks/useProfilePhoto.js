import { useCallback, useEffect, useRef, useState } from "react";
import { getImageFileError, isAppFileUrl } from "../utils/files.js";
import { readPhotoCrop } from "../utils/photoCrop.js";
import { fetchFileBlob } from "../utils/protectedFile.js";

const OPEN_FAILED = "לא הצלחנו לפתוח את הקובץ";

export default function useProfilePhoto({ savedUrl = "", savedCrop = null, onSaveExisting, onSaveNew }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [pendingCrop, setPendingCrop] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef("");

  const replacePreview = useCallback((next) => {
    if (previewRef.current && previewRef.current !== next) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next || "";
    setPreviewUrl(previewRef.current);
  }, []);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const closeDialog = useCallback(() => {
    setDialog((current) => {
      if (current?.revoke && current.src && current.src !== previewRef.current) URL.revokeObjectURL(current.src);
      return null;
    });
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setPendingCrop(null);
    setError("");
    replacePreview("");
    closeDialog();
  }, [closeDialog, replacePreview]);

  const onPickFile = useCallback((event) => {
    const next = event.target.files?.[0] || null;
    event.target.value = "";
    if (!next) return;
    const problem = getImageFileError(next);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    const src = URL.createObjectURL(next);
    setDialog({ src, file: next, initialCrop: null, mode: "new", revoke: true });
  }, []);

  const openEditor = useCallback(async () => {
    setError("");
    if (file && previewUrl) {
      setDialog({ src: previewUrl, file, initialCrop: pendingCrop, mode: "new", revoke: false });
      return;
    }
    if (!savedUrl) return;
    if (!isAppFileUrl(savedUrl)) {
      setDialog({ src: savedUrl, initialCrop: readPhotoCrop(savedCrop), mode: "existing", revoke: false });
      return;
    }
    setBusy(true);
    try {
      const blob = await fetchFileBlob(savedUrl);
      const src = URL.createObjectURL(blob);
      setDialog({ src, initialCrop: readPhotoCrop(savedCrop), mode: "existing", revoke: true });
    } catch (err) {
      setError(err?.message || OPEN_FAILED);
    } finally {
      setBusy(false);
    }
  }, [file, pendingCrop, previewUrl, savedCrop, savedUrl]);

  const saveDialog = useCallback(
    async (crop) => {
      if (!dialog) return;
      if (dialog.mode === "new" && onSaveNew) {
        setBusy(true);
        setError("");
        try {
          await onSaveNew(dialog.file, crop);
          if (dialog.revoke && dialog.src) URL.revokeObjectURL(dialog.src);
          setDialog(null);
        } catch (err) {
          setError(err?.message || OPEN_FAILED);
        } finally {
          setBusy(false);
        }
        return;
      }
      if (dialog.mode === "new") {
        setFile(dialog.file);
        setPendingCrop(crop);
        replacePreview(dialog.src);
        setDialog(null);
        return;
      }
      setBusy(true);
      setError("");
      try {
        await onSaveExisting?.(crop);
        if (dialog.revoke && dialog.src) URL.revokeObjectURL(dialog.src);
        setDialog(null);
      } catch (err) {
        setError(err?.message || OPEN_FAILED);
      } finally {
        setBusy(false);
      }
    },
    [dialog, onSaveExisting, onSaveNew, replacePreview]
  );

  const appendTo = useCallback(
    (formData) => {
      if (!file || !pendingCrop) return;
      formData.append("image", file);
      formData.append("photoCrop", JSON.stringify(pendingCrop));
    },
    [file, pendingCrop]
  );

  const shownSrc = previewUrl || savedUrl || "";
  const shownCrop = previewUrl ? pendingCrop : readPhotoCrop(savedCrop);

  return {
    file,
    shownSrc,
    shownCrop,
    error,
    setError,
    dialog,
    busy,
    onPickFile,
    openEditor,
    closeDialog,
    saveDialog,
    reset,
    appendTo,
  };
}
