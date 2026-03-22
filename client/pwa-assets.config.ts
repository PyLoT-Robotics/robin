import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'
import type { Preset } from '@vite-pwa/assets-generator/presets'

const customPreset: Partial<Preset> = {
  maskable: {
    ...minimal2023Preset.maskable,
    padding: 0
  },
  apple: {
    ...minimal2023Preset.apple,
    padding: 0
  },
  transparent: {
    ...minimal2023Preset.transparent,
    padding: 0
  }
}
const preset: Preset = {
  ...minimal2023Preset,
  ...customPreset
}

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: preset,
  images: ['public/logo.png']
})
