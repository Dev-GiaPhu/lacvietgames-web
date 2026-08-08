(() => {
  'use strict';
  const API=(window.APP_CONFIG?.API_BASE_URL||'').replace(/\/$/,'');
  const $=id=>document.getElementById(id);
  const states={main:{source:null,sdk:false},version:{source:null,sdk:false}};
  let storageReady=false;

  const fmtBytes=n=>{n=Number(n||0);if(n<1024)return`${n} B`;if(n<1048576)return`${(n/1024).toFixed(1)} KB`;if(n<1073741824)return`${(n/1048576).toFixed(1)} MB`;return`${(n/1073741824).toFixed(2)} GB`};
  function session(){if(window.LVGSession?.read)return window.LVGSession.read();for(const s of[localStorage,sessionStorage]){try{const raw=s.getItem('lacvietgamesStoreSession');if(raw)return JSON.parse(raw)}catch{}}return null}
  async function api(path,opt={}){const s=session();if(!s?.token)throw new Error('Bạn cần đăng nhập Publisher Center.');const r=await fetch(`${API}${path}`,{method:opt.method||'GET',headers:{'Content-Type':'application/json',Authorization:`Bearer ${s.token}`},body:opt.body?JSON.stringify(opt.body):undefined});const p=await r.json().catch(()=>null);if(!r.ok||p?.success===false)throw new Error(p?.message||'Không thể xử lý WebGL build.');return p}

  async function checkStorageStatus(){
    const el=$('webglStorageStatus');if(!el)return false;
    if(!session()?.token){storageReady=false;el.textContent='Đăng nhập để kiểm tra hệ thống lưu trữ.';el.dataset.state='pending';return false}
    el.textContent='Đang kiểm tra hệ thống lưu trữ...';el.dataset.state='pending';
    try{
      const p=await api('/api/store/webgl-uploads/status'),d=p.data||{};
      storageReady=!!(d.readyForUpload ?? (d.configured&&d.publicConfigured&&d.credentialsReachable));
      if(storageReady){el.textContent='✓ Hệ thống lưu trữ sẵn sàng.';el.dataset.state='ready'}
      else{el.textContent='⚠ Hệ thống lưu trữ hiện chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';el.dataset.state='error'}
      return storageReady;
    }catch{storageReady=false;el.textContent='⚠ Không thể kiểm tra hệ thống lưu trữ. Vui lòng thử lại sau.';el.dataset.state='error';return false}
  }

  function cleanPath(v){const p=String(v||'').replace(/\\/g,'/').replace(/^\/+/, '').split('/').filter(Boolean);if(!p.length||p.some(x=>x==='.'||x==='..'||x.includes(':')))return null;return p.join('/')}
  function stripRoot(items){
    const valid=items.filter(x=>x.path&&!x.path.startsWith('__MACOSX/')&&!x.path.endsWith('/'));
    const indexes=valid.filter(x=>x.path.toLowerCase()==='index.html'||x.path.toLowerCase().endsWith('/index.html')).sort((a,b)=>a.path.split('/').length-b.path.split('/').length);
    if(!indexes.length)throw new Error('Không tìm thấy index.html trong build Unity WebGL.');
    const index=indexes[0].path,root=index.toLowerCase()==='index.html'?'':index.slice(0,-'index.html'.length),out=[],seen=new Set();
    for(const item of valid){if(root&&!item.path.startsWith(root))continue;const p=cleanPath(root?item.path.slice(root.length):item.path);if(!p)continue;const k=p.toLowerCase();if(seen.has(k))throw new Error(`Build có file trùng đường dẫn: ${p}`);seen.add(k);out.push({...item,path:p})}
    if(!out.some(x=>x.path.toLowerCase()==='index.html'))throw new Error('index.html không nằm trong thư mục build hợp lệ.');
    if(!out.some(x=>/^Build\/.+\.loader\.js$/i.test(x.path)))throw new Error('Không tìm thấy Build/*.loader.js. Hãy chọn đúng Unity WebGL Build.');
    if(!out.some(x=>/^Build\/.+\.(wasm|data)(\.(br|gz))?$/i.test(x.path)))throw new Error('Không tìm thấy file .wasm/.data của Unity.');
    return out;
  }

  async function inflateRaw(blob,expected,path){
    const input=new Uint8Array(await blob.arrayBuffer());
    let output=null,firstError=null;
    if(typeof window.LVGInflateRaw==='function'){try{output=window.LVGInflateRaw(input)}catch(e){firstError=e}}
    if(!output&&typeof window.DecompressionStream==='function'){try{const ds=new window.DecompressionStream('deflate-raw');output=new Uint8Array(await new Response(new Blob([input]).stream().pipeThrough(ds)).arrayBuffer())}catch(e){if(!firstError)firstError=e}}
    if(!output)throw new Error(`Không giải nén được entry ZIP ${path}. ${firstError?.message||'Raw DEFLATE không được hỗ trợ.'}`);
    if(Number.isFinite(expected)&&expected>=0&&output.byteLength!==expected)throw new Error(`ZIP bị sai kích thước tại ${path}: mong đợi ${expected} byte, nhận ${output.byteLength} byte.`);
    return new Blob([output]);
  }

  async function zipSource(file){
    if(!file||!/\.zip$/i.test(file.name))throw new Error('Hãy chọn file .zip của Unity WebGL build.');
    if(file.size<22)throw new Error('File ZIP không hợp lệ.');
    const tailSize=Math.min(file.size,66000),tailStart=file.size-tailSize,tail=new Uint8Array(await file.slice(tailStart).arrayBuffer()),tv=new DataView(tail.buffer,tail.byteOffset,tail.byteLength);
    let eocd=-1;for(let i=tail.length-22;i>=0;i--){if(tv.getUint32(i,true)===0x06054b50){eocd=i;break}}
    if(eocd<0)throw new Error('Không đọc được ZIP.');
    const count=tv.getUint16(eocd+10,true),cdSize=tv.getUint32(eocd+12,true),cdOffset=tv.getUint32(eocd+16,true);
    if(count===0xffff||cdSize===0xffffffff||cdOffset===0xffffffff)throw new Error('ZIP64 chưa được hỗ trợ. Hãy chọn nguyên thư mục build.');
    if(cdOffset+cdSize>file.size)throw new Error('Central directory của ZIP bị lỗi.');
    const cd=new Uint8Array(await file.slice(cdOffset,cdOffset+cdSize).arrayBuffer()),dv=new DataView(cd.buffer,cd.byteOffset,cd.byteLength),dec=new TextDecoder('utf-8');
    let pos=0;const raw=[];
    for(let n=0;n<count;n++){
      if(pos+46>cd.length||dv.getUint32(pos,true)!==0x02014b50)throw new Error('ZIP có cấu trúc không hợp lệ.');
      const flags=dv.getUint16(pos+8,true),method=dv.getUint16(pos+10,true),compressed=dv.getUint32(pos+20,true),size=dv.getUint32(pos+24,true),nameLen=dv.getUint16(pos+28,true),extraLen=dv.getUint16(pos+30,true),commentLen=dv.getUint16(pos+32,true),localOffset=dv.getUint32(pos+42,true);
      if(flags&1)throw new Error('ZIP có mật khẩu. Hãy dùng ZIP không mã hóa.');
      if(compressed===0xffffffff||size===0xffffffff||localOffset===0xffffffff)throw new Error('ZIP64 chưa được hỗ trợ.');
      if(method!==0&&method!==8)throw new Error(`ZIP dùng phương thức nén ${method} chưa được hỗ trợ.`);
      const name=cleanPath(dec.decode(cd.slice(pos+46,pos+46+nameLen)));if(name&&!name.endsWith('/'))raw.push({path:name,size,compressed,method,localOffset});
      pos+=46+nameLen+extraLen+commentLen;
    }
    const entries=stripRoot(raw),byPath=new Map(entries.map(x=>[x.path,x]));
    async function blob(path){
      const e=byPath.get(path);if(!e)throw new Error(`Không đọc được ${path}`);
      const hb=await file.slice(e.localOffset,e.localOffset+30).arrayBuffer(),h=new DataView(hb);if(h.getUint32(0,true)!==0x04034b50)throw new Error(`Local header lỗi: ${path}`);
      const dataStart=e.localOffset+30+h.getUint16(26,true)+h.getUint16(28,true),packed=file.slice(dataStart,dataStart+e.compressed);
      if(e.method===0){if(e.size!==e.compressed)throw new Error(`ZIP Stored entry sai kích thước: ${path}`);return packed}
      return inflateRaw(packed,e.size,path);
    }
    return{name:file.name,entries,blob,total:entries.reduce((s,x)=>s+x.size,0)};
  }

  function folderSource(fileList){const files=[...fileList];if(!files.length)throw new Error('Thư mục build đang trống.');const raw=files.map(file=>({path:cleanPath(file.webkitRelativePath||file.name),size:file.size,file})).filter(x=>x.path),entries=stripRoot(raw),byPath=new Map(entries.map(x=>[x.path,x.file]));return{name:files[0].webkitRelativePath?.split('/')[0]||'Unity WebGL folder',entries,total:entries.reduce((s,x)=>s+x.size,0),blob:async path=>{const f=byPath.get(path);if(!f)throw new Error(`Không đọc được ${path}`);return f}}}
  function corePaths(entries){const p=['index.html'],add=re=>{const x=entries.find(e=>re.test(e.path));if(x)p.push(x.path)};add(/^Build\/.+\.loader\.js$/i);add(/^Build\/.+\.framework\.js(\.(br|gz))?$/i);add(/^Build\/.+\.wasm(\.(br|gz))?$/i);add(/^Build\/.+\.data(\.(br|gz))?$/i);return[...new Set(p)].slice(0,8)}
  function setInfo(kind,text,err=false){const el=$(kind==='main'?'webglBuildStatus':'versionWebglStatus');if(el){el.textContent=text;el.style.color=err?'#ff9dab':''}}
  function setProgress(kind,v){const p=$(kind==='main'?'webglUploadProgress':'versionWebglProgress');if(p){p.hidden=false;p.value=Math.max(0,Math.min(100,v||0))}}
  function showSource(kind,s){const info=$(kind==='main'?'webglBuildInfo':'versionWebglInfo');if(info)info.innerHTML=`<b>${s.name}</b><span>${s.entries.length} file · ${fmtBytes(s.total)}</span><span>✓ Build hợp lệ · chưa upload</span>`;setInfo(kind,'Build đã sẵn sàng. File sẽ được upload khi bạn gửi game.');setProgress(kind,0)}
  async function inspectSdk(path,blob,kind){if(states[kind].sdk||!/\.js$/i.test(path)||blob.size>15*1024*1024)return;try{const text=await blob.text();if(text.includes('LVG_GAMEPLAY_START')||text.includes('LVG_GameplayStart')||text.includes('LVG_GameplayEnd'))states[kind].sdk=true}catch{}}
  function xhrPut(ticket,blob,onProgress){return new Promise((resolve,reject)=>{const x=new XMLHttpRequest();x.open('PUT',ticket.uploadUrl,true);x.setRequestHeader('Content-Type',ticket.contentType||'application/octet-stream');if(ticket.contentEncoding)x.setRequestHeader('Content-Encoding',ticket.contentEncoding);if(ticket.cacheControl)x.setRequestHeader('Cache-Control',ticket.cacheControl);x.upload.onprogress=e=>{if(e.lengthComputable)onProgress(e.loaded)};x.onerror=()=>reject(new Error('Không thể kết nối hệ thống lưu trữ.'));x.onload=()=>x.status>=200&&x.status<300?resolve():reject(new Error(`Không thể upload build (${x.status}).`));x.send(blob)})}

  async function upload(kind){
    const state=states[kind],source=state.source;if(!source){const e=new Error('Hãy chọn WebGL ZIP hoặc thư mục build trước.');setInfo(kind,e.message,true);throw e}
    const button=$(kind==='main'?'uploadWebglBuild':'uploadVersionWebglBuild'),old=button?.textContent||'';if(button)button.disabled=true;state.sdk=false;
    try{
      if(button)button.textContent='Đang kiểm tra...';if(!await checkStorageStatus())throw new Error('Hệ thống lưu trữ hiện chưa sẵn sàng.');
      const version=kind==='main'?$('versionName')?.value:$('newVersionName')?.value;
      const prep=await api('/api/store/webgl-uploads/prepare',{method:'POST',body:{version:version||'1.0.0',files:source.entries.map(e=>({path:e.path,size:e.size}))}}),d=prep.data||{},tickets=d.files||[],ticketByPath=new Map(tickets.map(t=>[t.path,t]));
      let done=0,total=Math.max(1,source.total);if(button)button.textContent='Đang upload...';
      for(let i=0;i<source.entries.length;i++){
        const entry=source.entries[i],ticket=ticketByPath.get(entry.path);if(!ticket)throw new Error(`Server không cấp URL upload cho ${entry.path}`);
        setInfo(kind,`Đang chuẩn bị ${i+1}/${source.entries.length}: ${entry.path}`);const b=await source.blob(entry.path);if(b.size!==entry.size)throw new Error(`Kích thước file sau khi đọc ZIP không đúng: ${entry.path}`);await inspectSdk(entry.path,b,kind);setInfo(kind,`Đang upload ${i+1}/${source.entries.length}: ${entry.path}`);await xhrPut(ticket,b,loaded=>setProgress(kind,(done+Math.min(loaded,entry.size))*100/total));done+=entry.size;setProgress(kind,done*100/total);
      }
      if(button)button.textContent='Đang xác minh...';const complete=await api('/api/store/webgl-uploads/complete',{method:'POST',body:{buildRef:d.buildRef,corePaths:corePaths(source.entries)}}),playUrl=complete.data?.playUrl;if(!playUrl)throw new Error('Upload xong nhưng chưa tạo được Play URL.');
      const target=$(kind==='main'?'playUrl':'newVersionPlayUrl');if(target){target.value=playUrl;target.dataset.managedWebgl='1'}setProgress(kind,100);setInfo(kind,state.sdk?'✓ Upload hoàn tất · SDK LacVietGames đã được phát hiện.':'✓ Upload hoàn tất.');
      const info=$(kind==='main'?'webglBuildInfo':'versionWebglInfo');if(info)info.innerHTML=`<b>${source.name}</b><span>${source.entries.length} file · ${fmtBytes(source.total)}</span><span>✓ Upload & xác minh hoàn tất</span>`;
      return playUrl;
    }catch(e){setInfo(kind,e.message||'Upload WebGL thất bại.',true);throw e}finally{if(button){button.disabled=false;button.textContent=old}}
  }

  async function chooseZip(kind,file){try{setInfo(kind,'Đang kiểm tra ZIP...');const s=await zipSource(file);states[kind].source=s;showSource(kind,s)}catch(e){states[kind].source=null;setInfo(kind,e.message,true)}}
  function chooseFolder(fileList){try{const s=folderSource(fileList);states.main.source=s;showSource('main',s)}catch(e){states.main.source=null;setInfo('main',e.message,true)}}
  function clearMain(){states.main={source:null,sdk:false};const info=$('webglBuildInfo');if(info)info.textContent='Chưa chọn build.';const p=$('webglUploadProgress');if(p){p.hidden=true;p.value=0}setInfo('main','')}
  function clearVersion(){states.version={source:null,sdk:false};const info=$('versionWebglInfo');if(info)info.textContent='Chưa chọn build.';const p=$('versionWebglProgress');if(p){p.hidden=true;p.value=0}setInfo('version','')}
  function install(){
    $('webglZipFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)chooseZip('main',f)});
    $('webglFolderFiles')?.addEventListener('change',e=>chooseFolder(e.target.files));
    $('uploadWebglBuild')?.addEventListener('click',()=>upload('main').catch(()=>{}));
    $('versionWebglZip')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)chooseZip('version',f)});
    $('uploadVersionWebglBuild')?.addEventListener('click',()=>upload('version').catch(()=>{}));
    const zone=$('webglDropZone');if(zone){['dragenter','dragover'].forEach(t=>zone.addEventListener(t,e=>{e.preventDefault();zone.classList.add('dragging')}));['dragleave','drop'].forEach(t=>zone.addEventListener(t,e=>{e.preventDefault();zone.classList.remove('dragging')}));zone.addEventListener('drop',e=>{const f=[...e.dataTransfer.files].find(x=>/\.zip$/i.test(x.name));if(f)chooseZip('main',f);else setInfo('main','Hãy thả file .zip hoặc dùng Chọn thư mục build.',true)})}
    $('gameSubmissionForm')?.addEventListener('reset',()=>setTimeout(clearMain,0));checkStorageStatus();window.addEventListener('lvg:session-hydrated',checkStorageStatus);
  }
  window.LVGWebGlUpload={uploadMain:()=>upload('main'),uploadVersion:()=>upload('version'),hasMainSource:()=>!!states.main.source,hasVersionSource:()=>!!states.version.source,clearMain,clearVersion,checkStorageStatus};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
