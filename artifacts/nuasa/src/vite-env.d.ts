/// <reference types="vite/client" />

// Allow TypeScript to import uppercase-extension image files (e.g. .JPG)
declare module '*.JPG' {
  const src: string;
  export default src;
}
