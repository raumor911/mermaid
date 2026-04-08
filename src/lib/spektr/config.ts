const DEFAULT_SPEKTR_WORKSPACE = "MERMAID Flow Studio";

export const getSpektrWorkspaceName = () => {
  return import.meta.env.VITE_SPEKTR_WORKSPACE?.trim() || DEFAULT_SPEKTR_WORKSPACE;
};

export const getSpektrBuildLabel = () => {
  return import.meta.env.VITE_SPEKTR_BUILD?.trim() || "local";
};
