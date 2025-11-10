/// <reference types="vite/client" />
/// <reference types="@types/google.maps" />

declare module "*.css" {
  const content: string;
  export default content;
}

declare global {
  interface Window {
    google: typeof google;
  }
}