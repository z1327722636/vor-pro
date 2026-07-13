import path from 'path'
import { defineConfig } from '@tarojs/cli'

export default defineConfig(async (merge) => {
  const baseConfig = {
    projectName: 'vor-pro-miniprogram',
    date: '2026-07-13',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    framework: 'react',
    compiler: 'webpack5',
    alias: {
      '@': path.resolve(__dirname, '..', 'src')
    },
    defineConstants: {
      'process.env.TARO_APP_API_BASE_URL': JSON.stringify(process.env.TARO_APP_API_BASE_URL || 'http://localhost:8000/api')
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {}
        }
      }
    },
    h5: {}
  }

  if (process.env.NODE_ENV === 'production') {
    return merge({}, baseConfig, {})
  }

  return merge({}, baseConfig, {})
})
