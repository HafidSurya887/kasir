const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rp=n=>'Rp'+Math.round(n).toLocaleString('id-ID');
let db,P=[],cart=[],scanning=false,stream,eid=null,ph='';
const cm=id=>$('#'+id).classList.remove('on');
function openDB(){return new Promise(r=>{const q=indexedDB.open('kasir',1);q.onupgradeneeded=()=>{q.result.createObjectStore('p',{keyPath:'id'});q.result.createObjectStore('s',{keyPath:'id'})};q.onsuccess=()=>{db=q.result;r()};q.onerror=()=>{document.body.innerHTML='<p style="padding:20px">Penyimpanan browser tidak bisa dipakai. Matikan mode privat lalu buka ulang.</p>'}})}
const all=st=>new Promise(r=>{const q=db.transaction(st).objectStore(st).getAll();q.onsuccess=()=>r(q.result)});
const put=(st,v)=>new Promise((r,j)=>{try{const t=db.transaction(st,'readwrite');t.objectStore(st).put(v);t.oncomplete=r;t.onerror=t.onabort=()=>j(t.error||new Error('db'))}catch(e){j(e)}});
const rm=id=>new Promise(r=>{const t=db.transaction('p','readwrite');t.objectStore('p').delete(id);t.oncomplete=r});
const clr=st=>new Promise(r=>{const t=db.transaction(st,'readwrite');t.objectStore(st).clear();t.oncomplete=r});
async function load(){P=(await all('p')).sort((a,b)=>a.name.localeCompare(b.name))}
function go(t){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t==t));({k:vK,p:vP,d:vD})[t]()}

/* scan kamera */
let h5=null;
async function scan(cb){
 if('BarcodeDetector' in window){
  $('#scm').classList.add('on');const v=$('#vid');
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});v.srcObject=stream;await v.play()}
  catch(e){stopScan();alert('Kamera tidak bisa dibuka. Izinkan akses kamera lalu coba lagi.');return}
  const d=new BarcodeDetector();scanning=true;
  const loop=async()=>{if(!scanning)return;try{const r=await d.detect(v);if(r.length){stopScan();cb(r[0].rawValue);return}}catch(e){}setTimeout(loop,250)};loop();
  return;
 }
 if(window.Html5Qrcode){
  $('#scm').classList.add('on');$('#vid').style.display='none';$('#rd').style.display='block';
  try{h5=new Html5Qrcode('rd');await h5.start({facingMode:'environment'},{fps:10,qrbox:{width:260,height:150}},t=>{stopScan();cb(t)},()=>{})}
  catch(e){stopScan();alert('Kamera tidak bisa dibuka. Izinkan akses kamera lalu coba lagi.')}
  return;
 }
 const c=prompt('Browser ini belum bisa scan lewat kamera. Ketik kode barcode:');if(c)cb(c.trim());
}
function stopScan(){
 scanning=false;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
 if(h5){const x=h5;h5=null;x.stop().then(()=>x.clear()).catch(()=>{})}
 $('#vid').style.display='';$('#rd').style.display='none';$('#scm').classList.remove('on');
}

/* tab kasir */
function vK(){
 $('main').innerHTML=`<div class="row"><input id="q" placeholder="Cari produk..." oninput="pl()"><button class="btn" style="flex:0 0 auto;margin-bottom:8px" onclick="scanBuy()">Scan</button></div><div id="pl"></div><h3>Keranjang</h3><div id="ct"></div>`;pl();ct();
}
function pl(){
 const q=($('#q')?$('#q').value:'').toLowerCase();
 const l=P.filter(p=>p.name.toLowerCase().includes(q)||p.barcode==q).slice(0,30);
 $('#pl').innerHTML=l.length?l.map(p=>`<div class="card" onclick="pick(${p.id})"><img src="${p.photo}"><div class="i"><b>${esc(p.name)}</b><span class="pr">${rp(p.price)}</span> <span class="s">/ ${p.unit} · stok ${p.stock}</span></div></div>`).join(''):'<p class="s">Belum ada produk. Tambah dulu di tab Produk.</p>';
}
function scanBuy(){scan(code=>{const p=P.find(x=>x.barcode==code);if(p)pick(p.id);else alert('Barcode '+code+' belum terdaftar. Tambahkan di tab Produk.')})}
function pick(id){
 const p=P.find(x=>x.id==id);if(!p)return;
 $('#pm').innerHTML=`<div class="box"><div class="card" style="padding:0"><img style="width:84px;height:84px" src="${p.photo}"><div class="i"><b>${esc(p.name)}</b><div class="pr">${rp(p.price)} / ${p.unit}</div><div class="s">Stok: ${p.stock} ${p.unit}</div></div></div><label class="s">Jumlah (${p.unit})</label><input id="qty" type="number" step="any" min="0" value="1" inputmode="decimal"><div class="row"><button class="btn g" onclick="cm('pm')">Batal</button><button class="btn" onclick="add(${p.id})">Masukkan keranjang</button></div></div>`;
 $('#pm').classList.add('on');
}
function add(id){
 const p=P.find(x=>x.id==id),q=+$('#qty').value;if(!(q>0))return;
 const c=cart.find(x=>x.id==id),tot=(c?c.qty:0)+q;
 if(tot>p.stock)return alert('Stok '+p.name+' hanya '+p.stock+' '+p.unit);
 if(c)c.qty=tot;else cart.push({id,qty:q});
 cm('pm');ct();
}
const total=()=>cart.reduce((a,c)=>a+c.qty*P.find(p=>p.id==c.id).price,0);
function cq(i,v){
 v=+v;if(!(v>0)){cart.splice(i,1)}else{const p=P.find(x=>x.id==cart[i].id);if(v>p.stock){alert('Stok hanya '+p.stock);v=p.stock}cart[i].qty=v}ct();
}
function ct(){
 const e=$('#ct');if(!e)return;
 if(!cart.length){e.innerHTML='<p class="s">Keranjang kosong. Scan barcode atau pilih produk di atas.</p>';return}
 e.innerHTML=cart.map((c,i)=>{const p=P.find(x=>x.id==c.id);return`<div class="card"><div class="i"><b>${esc(p.name)}</b><span class="s">${rp(p.price)} x <input type="number" step="any" value="${c.qty}" style="width:76px;padding:4px;margin:0" onchange="cq(${i},this.value)"> ${p.unit} = <b style="display:inline" class="pr">${rp(c.qty*p.price)}</b></span></div><button class="btn r" onclick="cart.splice(${i},1);ct()">Hapus</button></div>`}).join('')
 +`<div class="tot">Total ${rp(total())}</div><input id="uang" type="number" inputmode="numeric" placeholder="Uang diterima" oninput="kb()"><div id="kb" class="s" style="margin-bottom:8px"></div><button class="btn" style="width:100%" onclick="bayar()">Bayar dan buat struk</button>`;
}
function kb(){const u=+$('#uang').value||0,t=total();$('#kb').textContent=u?(u>=t?'Kembalian '+rp(u-t):'Kurang '+rp(t-u)):''}
async function bayar(){
 if(!cart.length)return;const t=total(),u=+$('#uang').value||0;
 if(u<t)return alert('Uang diterima kurang dari total');
 for(const c of cart){const p=P.find(x=>x.id==c.id);if(c.qty>p.stock)return alert('Stok '+p.name+' tidak cukup')}
 const items=[];
 for(const c of cart){const p=P.find(x=>x.id==c.id);items.push({n:p.name,q:c.qty,u:p.unit,h:p.price});p.stock=Math.round((p.stock-c.qty)*1000)/1000;await put('p',p)}
 const s={id:Date.now(),items,total:t,bayar:u,kembali:u-t};
 await put('s',s);cart=[];await load();pl();ct();struk(s);
}
function struk(s){
 const L=[['T','STRUK PENJUALAN'],['T',new Date(s.id).toLocaleString('id-ID')],['-']];
 s.items.forEach(i=>{L.push(['L',i.n]);L.push(['R',i.q+' '+i.u+' x '+rp(i.h),rp(i.q*i.h)])});
 L.push(['-'],['R','TOTAL',rp(s.total)],['R','BAYAR',rp(s.bayar)],['R','KEMBALI',rp(s.kembali)],['-'],['T','Terima kasih']);
 const c=document.createElement('canvas');c.width=480;c.height=50+L.length*30;
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#000';x.font='19px monospace';
 L.forEach((l,i)=>{const y=40+i*30;
  if(l[0]=='-'){x.textAlign='left';x.fillText('-'.repeat(38),16,y)}
  else if(l[0]=='T'){x.textAlign='center';x.fillText(l[1],240,y)}
  else if(l[0]=='L'){x.textAlign='left';x.fillText(l[1],16,y)}
  else{x.textAlign='left';x.fillText(l[1],16,y);x.textAlign='right';x.fillText(l[2],464,y)}});
 const url=c.toDataURL('image/png');
 $('#sm').innerHTML=`<div class="box"><img src="${url}" style="width:100%;border:1px solid var(--line)"><div class="row" style="margin-top:10px"><button class="btn g" onclick="cm('sm')">Tutup</button><button class="btn" onclick="dl('${url}','struk-${s.id}.png')">Simpan gambar</button></div></div>`;
 $('#sm').classList.add('on');
}
async function dl(u,n){
 const C=window.Capacitor;
 if(C&&C.isNativePlatform&&C.isNativePlatform()&&C.Plugins&&C.Plugins.Filesystem&&C.Plugins.Share){
  try{
   const b=await(await fetch(u)).blob();
   const d=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(b)});
   const w=await C.Plugins.Filesystem.writeFile({path:n,data:d,directory:'CACHE'});
   await C.Plugins.Share.share({title:n,url:w.uri});
  }catch(e){toast('Gagal menyimpan file',true)}
  return;
 }
 const a=document.createElement('a');a.href=u;a.download=n;a.click();
}

/* tab produk */
function vP(){
 $('main').innerHTML=`<button class="btn" style="width:100%;margin-bottom:10px" onclick="form()">Tambah produk</button>`+(P.length?P.map(p=>`<div class="card"><img src="${p.photo}"><div class="i"><b>${esc(p.name)}</b><span class="pr">${rp(p.price)}</span> <span class="s">/ ${p.unit} · stok ${p.stock}</span><div class="s">${p.barcode?'Barcode '+esc(p.barcode):'Tanpa barcode'}</div></div><div><button class="btn g" style="padding:8px 10px" onclick="form(${p.id})">Ubah</button><button class="btn r" style="margin-top:6px" onclick="hapus(${p.id})">Hapus</button></div></div>`).join(''):'<p class="s">Belum ada produk. Tekan Tambah produk untuk memulai.</p>');
}
async function hapus(id){if(confirm('Hapus produk ini?')){await rm(id);cart=cart.filter(c=>c.id!=id);await load();vP();toast('Produk dihapus')}}
function toast(m,bad){const t=$('#toast');t.textContent=m;t.className='on'+(bad?' bad':'');clearTimeout(t._h);t._h=setTimeout(()=>{t.className=''},3200)}
function ferr(m,id){const e=$('#fe');if(e)e.textContent=m;if(id){const x=$('#'+id);if(x){x.style.borderColor='var(--bad)';x.focus()}}}
function img(f){return new Promise((res,rej)=>{const u=URL.createObjectURL(f),i=new Image();
 i.onload=()=>{try{const k=Math.min(1,320/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(i.width*k));c.height=Math.max(1,Math.round(i.height*k));c.getContext('2d').drawImage(i,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.7))}catch(e){rej(e)}finally{URL.revokeObjectURL(u)}};
 i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('format'))};i.src=u})}
async function pf(el){
 const f=el.files[0];if(!f)return;
 if(!f.type.startsWith('image/')){ferr('File harus berupa gambar.');el.value='';return}
 try{ph=await img(f);const v=$('#pv');v.src=ph;v.style.display='block';ferr('')}
 catch(e){ph='';$('#pv').style.display='none';el.value='';ferr('Foto tidak bisa dibaca. Coba foto lain atau ambil ulang dengan kamera.')}
}
let saving=false;
function form(id){
 const p=id?P.find(x=>x.id==id):{};if(id&&!p)return;eid=id||null;ph=p.photo||'';
 $('#fm').innerHTML=`<div class="box"><h3 style="margin-top:0">${id?'Ubah':'Tambah'} produk</h3><img id="pv" src="${ph}" style="width:100%;max-height:170px;object-fit:contain;display:${ph?'block':'none'}"><label class="s">Foto barang (wajib)</label><input type="file" accept="image/*" onchange="pf(this)"><input id="fn" maxlength="60" placeholder="Nama produk" value="${esc(p.name||'')}"><div class="row"><input id="fh" type="number" inputmode="numeric" min="0" placeholder="Harga" value="${p.price??''}"><input id="fs" type="number" inputmode="decimal" step="any" min="0" placeholder="Stok" value="${p.stock??''}"></div><select id="fu">${['pcs','bungkus','kg','liter','pak'].map(u=>`<option ${p.unit==u?'selected':''}>${u}</option>`).join('')}</select><input id="fb" placeholder="Barcode (kosongkan jika tidak ada)" value="${esc(p.barcode||'')}"><div class="row"><button class="btn g" onclick="scan(c=>{$('#fb').value=c})">Scan barcode</button><button class="btn g" onclick="$('#fb').value='K'+Date.now()">Buat kode</button></div><div id="fe" class="err"></div><div class="row"><button class="btn g" onclick="cm('fm')">Batal</button><button class="btn" id="fsv" onclick="save()">Simpan produk</button></div></div>`;
 $('#fm').classList.add('on');
}
async function save(){
 if(saving)return;
 document.querySelectorAll('#fm input,#fm select').forEach(e=>{e.style.borderColor=''});ferr('');
 const n=$('#fn').value.trim().replace(/\s+/g,' '),hs=$('#fh').value.trim(),ss=$('#fs').value.trim(),u=$('#fu').value,b=$('#fb').value.replace(/\s+/g,'');
 const h=Number(hs),s=Number(ss);
 if(!ph)return ferr('Foto barang wajib ada. Pilih atau ambil foto dulu.');
 if(!n)return ferr('Nama produk belum diisi.','fn');
 if(hs===''||!isFinite(h)||h<0)return ferr('Harga harus berupa angka 0 atau lebih.','fh');
 if(h>1e9)return ferr('Harga terlalu besar.','fh');
 if(ss===''||!isFinite(s)||s<0)return ferr('Stok harus berupa angka 0 atau lebih.','fs');
 if(['pcs','bungkus','pak'].includes(u)&&!Number.isInteger(s))return ferr('Stok '+u+' harus bilangan bulat, tanpa koma.','fs');
 const db1=b&&P.find(x=>x.barcode==b&&x.id!=eid);
 if(db1)return ferr('Barcode ini sudah dipakai produk "'+db1.name+'".','fb');
 const dn=P.find(x=>x.name.toLowerCase()==n.toLowerCase()&&x.id!=eid);
 if(dn)return ferr('Nama "'+n+'" sudah ada. Tambahkan ukuran atau varian supaya beda.','fn');
 saving=true;const btn=$('#fsv');btn.disabled=true;btn.textContent='Menyimpan...';
 try{
  await put('p',{id:eid||Date.now(),name:n,price:h,stock:s,unit:u,barcode:b,photo:ph});
  cm('fm');await load();vP();toast('Produk tersimpan');
 }catch(e){ferr(e&&e.name=='QuotaExceededError'?'Gagal menyimpan: penyimpanan HP penuh.':'Gagal menyimpan. Coba lagi.')}
 finally{saving=false;btn.disabled=false;btn.textContent='Simpan produk'}
}

/* tab data */
async function vD(){
 const S=await all('s'),t0=new Date().setHours(0,0,0,0),td=S.filter(s=>s.id>=t0),low=P.filter(p=>p.stock<=5);
 $('main').innerHTML=`<div class="card"><div class="i"><b>Hari ini</b><span class="s">${td.length} transaksi, total ${rp(td.reduce((a,s)=>a+s.total,0))}</span></div></div><div class="card"><div class="i"><b>Stok menipis (5 atau kurang)</b><span class="s">${low.length?low.map(p=>esc(p.name)+' ('+p.stock+')').join(', '):'Semua stok aman'}</span></div></div><button class="btn" style="width:100%;margin-bottom:10px" onclick="exp()">Ekspor backup</button><label class="s">Impor backup (menimpa semua data saat ini)</label><input type="file" accept=".json" onchange="imp(this)"><p class="s">Data tersimpan di HP ini. Kalau aplikasi dihapus atau data browser dibersihkan, data hilang, jadi ekspor backup secara rutin.</p>`;
}
async function exp(){const b=new Blob([JSON.stringify({p:P,s:await all('s')})],{type:'application/json'});dl(URL.createObjectURL(b),'backup-kasir.json')}
async function imp(el){
 const f=el.files[0];if(!f||!confirm('Timpa semua data dengan backup ini?'))return;
 try{const d=JSON.parse(await f.text());await clr('p');await clr('s');for(const p of d.p)await put('p',p);for(const s of d.s)await put('s',s);await load();go('d');alert('Impor berhasil')}
 catch(e){alert('File backup tidak valid')}
}
openDB().then(load).then(()=>go('k'));
window.addEventListener('unhandledrejection',()=>toast('Terjadi kesalahan, coba lagi',true));
window.addEventListener('error',()=>toast('Terjadi kesalahan, coba lagi',true));
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
