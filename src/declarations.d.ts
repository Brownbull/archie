/** Vite raw import — returns file contents as a string at build time */
declare module "*.md?raw" {
  const content: string
  export default content
}
