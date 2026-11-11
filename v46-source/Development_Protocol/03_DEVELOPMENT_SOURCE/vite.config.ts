import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const KB=1024
const MB=KB*KB
const bytes=(value:string|Uint8Array)=>typeof value==='string'?new TextEncoder().encode(value).byteLength:value.byteLength
function bundleMetrics():Plugin{
  return {
    name:'plmr-bundle-metrics',
    generateBundle(_options,bundle){
      const chunks=Object.values(bundle).filter((item:any)=>item.type==='chunk').map((item:any)=>({
        file:item.fileName,
        bytes:bytes(item.code),
        kib:Number((bytes(item.code)/KB).toFixed(1)),
        entry:Boolean(item.isEntry),
        dynamicEntry:Boolean(item.isDynamicEntry),
        imports:item.imports,
        dynamicImports:item.dynamicImports,
      })).sort((a,b)=>b.bytes-a.bytes)
      const assets=Object.values(bundle).filter((item:any)=>item.type==='asset').map((item:any)=>({
        file:item.fileName,bytes:bytes(item.source),
      })).sort((a,b)=>b.bytes-a.bytes)
      const initialFiles=new Set<string>()
      const visit=(file:string)=>{if(initialFiles.has(file))return;const chunk=chunks.find(c=>c.file===file);if(!chunk)return;initialFiles.add(file);chunk.imports.forEach(visit)}
      chunks.filter(c=>c.entry).forEach(c=>visit(c.file))
      const initialBytes=chunks.filter(c=>initialFiles.has(c.file)).reduce((n,c)=>n+c.bytes,0)
      const eagerProduct=Array.from(initialFiles).find(file=>/product-(giyotin|surme)-/.test(file))
      if(eagerProduct)this.error(`PLMR product module entered the initial static graph: ${eagerProduct}`)
      const report={release:'PLMR_FinalProcess_v46',generatedAt:new Date().toISOString(),budgets:{initialEntryRawBytes:5*MB},summary:{initialEntryRawBytes:initialBytes,initialFiles:Array.from(initialFiles),totalChunkBytes:chunks.reduce((n,c)=>n+c.bytes,0),chunkCount:chunks.length,assetCount:assets.length},chunks,assets}
      this.emitFile({type:'asset',fileName:'bundle-report.json',source:JSON.stringify(report,null,2)+'\n'})
      if(initialBytes>5*MB)this.warn(`PLMR initial entry raw JS ${Math.round(initialBytes/KB)} KiB exceeds the V26 5 MiB guardrail.`)
    }
  }
}

export default defineConfig({
  base:'./',
  plugins:[react(),bundleMetrics()],
  build:{
    sourcemap:false,
    rollupOptions:{
      output:{
        // Keep eagerly used domain/store dependencies out of lazy product chunks.
        onlyExplicitManualChunks:true,
        chunkFileNames:chunk=>/production/i.test(chunk.name)?'runtime/production/[name]-[hash].js':'assets/[name]-[hash].js',
        manualChunks(id){
          const p=id.replace(/\\/g,'/')
          if(p.includes('/node_modules/react/')||p.includes('/node_modules/react-dom/')||p.includes('/node_modules/scheduler/'))return 'vendor-react'
          if(p.includes('/components/GiyotinProductionPage')||p.includes('/engines/productionAdapter'))return 'product-giyotin-production'
          if(p.includes('/data/v49MaterialSeed'))return 'material-master-data'
          if(p.includes('/components/GiyotinDrawingPreview')||p.includes('/components/GiyotinPreviewMarkup'))return 'product-giyotin-preview'
          if(p.includes('/components/SurmeDrawingPreview')||p.includes('/components/SurmePreviewMarkup'))return 'product-surme-preview'
        }
      }
    }
  }
})
