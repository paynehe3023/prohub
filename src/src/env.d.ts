declare module '@tabler/icons-vue' {
  import type { DefineComponent } from 'vue'

  type IconComponent = DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

  export const IconDownload: IconComponent
  export const IconPhoto: IconComponent
  export const IconBox: IconComponent
  export const IconSun: IconComponent
  export const IconMoon: IconComponent
  export const IconChevronRight: IconComponent
  export const IconSearch: IconComponent
  export const IconLoader2: IconComponent
  export const IconVideo: IconComponent
  export const IconCopy: IconComponent
  export const IconCheck: IconComponent
  export const IconLink: IconComponent
  export const IconUpload: IconComponent
  export const IconScissors: IconComponent
  export const IconFileText: IconComponent
  export const IconPalette: IconComponent
  export const IconArrowsExchange: IconComponent
  export const IconCamera: IconComponent
  export const IconNetwork: IconComponent
  export const IconClipboardText: IconComponent
  export const IconAlertTriangle: IconComponent
  export const IconCoffee: IconComponent
  export const IconTools: IconComponent
  export const IconArrowLeft: IconComponent
  export const IconSparkles: IconComponent
  export const IconBrandGithub: IconComponent
  export const IconMoodEmpty: IconComponent
  export const IconShieldCheck: IconComponent
  export const IconBolt: IconComponent
  export const IconDeviceMobile: IconComponent
}

declare module 'piexifjs' {
  const ImageIFD: Record<string, number>
  const ExifIFD: Record<string, number>
  const GPSIFD: Record<string, number>
  function load(dataUrl: string): Record<string, any>
  function dump(exifObj: Record<string, any>): string
  function insert(exifBytes: string, jpegDataUrl: string): string
  function remove(jpegDataUrl: string): string
  export { ImageIFD, ExifIFD, GPSIFD, load, dump, insert, remove }
  const piexif: { ImageIFD: typeof ImageIFD; ExifIFD: typeof ExifIFD; GPSIFD: typeof GPSIFD; load: typeof load; dump: typeof dump; insert: typeof insert; remove: typeof remove }
  export default piexif
}