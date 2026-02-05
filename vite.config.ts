import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api/transport': {
        target: 'https://opendata.transport.vic.gov.au',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/transport/, '/dataset/6d36dfd9-8693-4552-8a03-05eb29a391fd/resource/afa7b823-0c8b-47a1-bc40-ada565f684c7/download/public_transport_stops.geojson'),
        secure: true,
        headers: {
          'Accept': 'application/json',
        }
      }
    }
  }
})
