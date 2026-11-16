/* Direct, offline image-to-LX-D02 print; source aspect ratio is preserved. */
async function prepareImagePrint(file){
 if(!file||file.size>25*1024*1024)throw Error('Choose an image up to 25 MB.');
 if(!['image/png','image/jpeg','image/webp','image/bmp'].includes(file.type))throw Error('Choose a PNG, JPEG, WebP or BMP image.');
 const url=URL.createObjectURL(file);try{
  let img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('This image could not be opened.'));img.src=url});
  let w=img.naturalWidth,h=img.naturalHeight;if(!w||!h||w*h>80000000)throw Error('Image dimensions are too large.');
  let outHeight=Math.max(1,Math.round(384*h/w));if(outHeight>12000)throw Error('Image is too tall for one print. Crop it or choose another image.');
  // Render once at head resolution. Repeated enlargement and reduction blurs tiny glyphs.
  let c=document.createElement('canvas'),x=c.getContext('2d',{alpha:false});
  c.width=384;c.height=outHeight;x.fillStyle='white';x.fillRect(0,0,c.width,c.height);
  x.imageSmoothingEnabled=(w!==384);x.imageSmoothingQuality='high';x.drawImage(img,0,0,c.width,c.height);
  // Classify small regions, not the entire document: clean neutral text/lines get a
  // hard threshold; coloured or continuous-tone regions retain error diffusion.
  // This is a heuristic; embedded coloured text and greyscale graphics can be ambiguous.
  let data=x.getImageData(0,0,c.width,c.height).data,mask=document.createElement('canvas');
  mask.width=c.width;mask.height=c.height;let mc=mask.getContext('2d'),mi=mc.createImageData(c.width,c.height),tile=24;
  for(let ty=0;ty<c.height;ty+=tile)for(let tx=0;tx<c.width;tx+=tile){
   let tw=Math.min(tile,c.width-tx),th=Math.min(tile,c.height-ty),n=tw*th,colour=0,mid=0;
   for(let y=ty;y<ty+th;y++)for(let xx=tx;xx<tx+tw;xx++){
    let i=(y*c.width+xx)*4,r=data[i],g=data[i+1],b=data[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b),v=.299*r+.587*g+.114*b;
    if(hi-lo>32&&hi>70)colour++;if(v>35&&v<220)mid++;
   }
   let photo=colour>n*.06||mid>n*.35;
   for(let y=ty;y<ty+th;y++)for(let xx=tx;xx<tx+tw;xx++){let i=(y*c.width+xx)*4;mi.data[i]=mi.data[i+1]=mi.data[i+2]=photo?255:0;mi.data[i+3]=255}
  }
  mc.putImageData(mi,0,0);
  let preview=await prepareLXPreview(c.toDataURL('image/png'),48,mask.toDataURL('image/png'));c.width=c.height=1;return preview;
 }finally{URL.revokeObjectURL(url)}
}
async function openImagePrint(file){if(!file)return;let buttons=document.querySelectorAll('[data-print-image]');buttons.forEach(b=>b.disabled=true);let progress=document.querySelector('#pdfProgress');progress.textContent='Preparing image locally…';try{
 let preview=await prepareImagePrint(file);progress.textContent='';modal(`<div class="eyebrow">IMAGE / LX-D02 / OFFLINE</div><h2>${escapeH(file.name)}</h2><p class="hint">Photo fitted to the 384-dot print head (approximately 48 mm of a 58 mm roll), without cropping. Output is black and white; its length follows the image. Small text in images cannot be enlarged automatically.</p><div style="max-height:50vh;overflow:auto;background:#444;text-align:center"><img id="imagePrintPreview" style="max-width:100%;width:300px;display:block;margin:auto" src="${preview.data}" alt="Monochrome image print preview"></div><label>COPIES</label><input id="imagePrintCopies" type="number" min="1" max="10" value="1"><div id="lxChooser" hidden><b>SCANNING FOR LX-D02…</b><p class="hint">Turn on printer and close Funny Print on your phone.</p><div id="lxDeviceList"></div><button id="lxCancel">CANCEL SCAN</button></div><p id="lxStatus" class="hint"></p><div class="actions"><button data-close>BACK</button><button id="lxPrint" class="primary">PRINT IMAGE →</button></div>`,()=>{});document.querySelector('#lxPrint').onclick=()=>printLXDevice(preview,{copies:Math.min(10,Math.max(1,Math.floor(+document.querySelector('#imagePrintCopies').value||1)))})
 }catch(e){progress.textContent='IMAGE: '+(e.message||String(e));toast('IMAGE: '+(e.message||String(e)))}finally{buttons.forEach(b=>b.disabled=false)}}
