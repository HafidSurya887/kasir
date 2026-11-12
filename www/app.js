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
const nz=p=>{if(!p.codes)p.codes=p.barcode?[p.barcode]:[];return p};
async function load(){P=(await all('p')).map(nz).sort((a,b)=>a.name.localeCompare(b.name))}
function go(t){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t==t));({h:vH,k:vK,p:vP})[t]()}

/* scan kamera */
let h5=null;
const BF=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
let lc='',lt=0;
function hit(c,cb){const n=Date.now(),d=c==lc&&n-lt<1200;lc=c;lt=n;if(!d)cb(c)}
async function scan(cb,keep){
 lc='';if(!keep)$('#si').textContent='Arahkan kamera ke barcode';
 if('BarcodeDetector' in window){
  $('#scm').classList.add('on');const v=$('#vid');
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});v.srcObject=stream;await v.play()}
  catch(e){stopScan();alert('Kamera tidak bisa dibuka. Izinkan akses kamera lalu coba lagi.');return}
  let fm=BF;try{const sf=await BarcodeDetector.getSupportedFormats();fm=BF.filter(x=>sf.includes(x));if(!fm.length)fm=null}catch(e){}
  const d=new BarcodeDetector(fm?{formats:fm}:undefined);scanning=true;
  const loop=async()=>{if(!scanning)return;try{const r=await d.detect(v);if(r.length){if(keep)hit(r[0].rawValue,cb);else{stopScan();cb(r[0].rawValue);return}}}catch(e){}setTimeout(loop,250)};loop();
  return;
 }
 if(window.Html5Qrcode){
  $('#scm').classList.add('on');$('#vid').style.display='none';$('#rd').style.display='block';
  try{h5=new Html5Qrcode('rd',{formatsToSupport:[0,1,2,3,4,5,6,7,8,9].length&&window.Html5QrcodeSupportedFormats?['EAN_13','EAN_8','UPC_A','UPC_E','CODE_128','CODE_39','ITF'].map(k=>Html5QrcodeSupportedFormats[k]):undefined});await h5.start({facingMode:'environment'},{fps:10,qrbox:{width:260,height:150}},t=>{if(keep)hit(t,cb);else{stopScan();cb(t)}},()=>{})}
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
 const l=P.filter(p=>p.name.toLowerCase().includes(q)||p.codes.some(c=>c.toLowerCase()==q)).slice(0,30);
 $('#pl').innerHTML=l.length?l.map(p=>`<div class="card" onclick="pick(${p.id})"><img src="${p.photo}"><div class="i"><b>${esc(p.name)}</b><span class="pr">${rp(p.price)}</span> <span class="s">/ ${p.unit} · stok ${p.stock}</span></div></div>`).join(''):'<p class="s">Belum ada produk. Tambah dulu di tab Produk.</p>';
}
function scanBuy(){$('#si').textContent=cart.length?cart.length+' item · '+rp(total()):'Arahkan ke barcode';scan(scanAdd,true)}
function scanAdd(code){
 const p=P.find(x=>x.codes.includes(code));
 if(!p){stopScan();unk(code);return}
 const c=cart.find(x=>x.id==p.id),n=(c?c.qty:0)+1;
 if(n>p.stock){toast('Stok '+p.name+' tidak cukup',true);return}
 if(c)c.qty=n;else cart.push({id:p.id,qty:1});
 ct();toast(p.name+' · jumlah '+n);$('#si').textContent=cart.length+' item · '+rp(total());
 try{navigator.vibrate&&navigator.vibrate(60)}catch(e){}
}
let uc='';
function unk(code){
 uc=code;
 $('#pm').innerHTML=`<div class="box"><h3 style="margin-top:0">Kode belum terdaftar</h3><p class="s">Kode <b>${esc(code)}</b> belum ada. Apakah barang ini sama dengan produk yang sudah ada?</p><input id="uq" placeholder="Cari produk yang sama..." oninput="ul()"><div id="ul"></div><button class="btn" style="width:100%;margin-top:6px" onclick="cm('pm');formP(null,uc)">Bukan, ini produk baru</button><button class="btn g" style="width:100%;margin-top:8px" onclick="cm('pm')">Batal</button></div>`;
 $('#pm').classList.add('on');ul();
}
function ul(){
 const q=($('#uq').value||'').toLowerCase(),sp=p=>Math.max(0,...p.codes.map(c=>{let i=0;while(i<c.length&&c[i]==uc[i])i++;return i})),l=P.filter(p=>p.name.toLowerCase().includes(q)).sort((a,b)=>sp(b)-sp(a)).slice(0,20);
 $('#ul').innerHTML=l.map(p=>`<div class="card" onclick="lk(${p.id})"><img src="${p.photo}"><div class="i"><b>${esc(p.name)}</b><span class="s">${sp(p)>=7?'Mirip (awal kode sama) · ':''}Ini produk yang sama</span></div></div>`).join('')||'<p class="s">Tidak ada produk cocok.</p>';
}
async function lk(id){
 const p=P.find(x=>x.id==id);if(!p)return;
 if(!p.codes.includes(uc))p.codes.push(uc);
 await put('p',p);await load();cm('pm');scanAdd(uc);
}
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
 const f=gp(),L=[['T',(f.toko||'STRUK PENJUALAN').toUpperCase()]];if(f.alamat)L.push(['T',f.alamat]);if(f.hp)L.push(['T',f.hp]);L.push(['T',new Date(s.id).toLocaleString('id-ID')],['-']);
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
 $('main').innerHTML=`<div class="row"><input id="pq" placeholder="Cari produk atau kode..." oninput="pg()"><button class="btn" style="flex:0 0 auto;margin-bottom:8px" onclick="formP()">+ Tambah</button></div><div class="s" id="pc" style="margin:0 2px 10px"></div><div class="grid" id="pg"></div>`;pg()
}
function pg(){
 const q=($('#pq').value||'').toLowerCase(),l=P.filter(p=>p.name.toLowerCase().includes(q)||p.codes.some(c=>c.toLowerCase().includes(q)));
 $('#pc').textContent=P.length+' produk'+(q?' · '+l.length+' cocok':'');
 $('#pg').innerHTML=l.map(p=>`<div class="pc"><img src="${p.photo}"><b>${esc(p.name)}</b><span class="pr">${rp(p.price)}</span><span class="bg ${p.stock<=0?'x':p.stock<=5?'w':''}">${p.stock<=0?'Habis':'Stok '+p.stock+' '+p.unit}</span><div class="row"><button class="btn g" onclick="formP(${p.id})">Ubah</button><button class="btn r" onclick="hapus(${p.id})">Hapus</button></div></div>`).join('')||'<p class="s">Belum ada produk.</p>';
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
let fc=[];
function formP(id,code){
 const p=id?P.find(x=>x.id==id):{};if(id&&!p)return;eid=id||null;ph=p.photo||'';fc=[...(p.codes||[])];if(code)fc.push(code);
 $('#fm').innerHTML=`<div class="box"><h3 style="margin-top:0">${id?'Ubah':'Tambah'} produk</h3><img id="pv" src="${ph}" style="width:100%;max-height:170px;object-fit:contain;display:${ph?'block':'none'}"><label class="s">Foto barang (wajib)</label><input type="file" accept="image/*" onchange="pf(this)"><input id="fn" maxlength="60" placeholder="Nama produk" value="${esc(p.name||'')}"><div class="row"><input id="fh" type="number" inputmode="numeric" min="0" placeholder="Harga" value="${p.price??''}"><input id="fs" type="number" inputmode="decimal" step="any" min="0" placeholder="Stok" value="${p.stock??''}"></div><select id="fu">${['pcs','bungkus','kg','liter','pak'].map(u=>`<option ${p.unit==u?'selected':''}>${u}</option>`).join('')}</select><label class="s">Kode barcode (boleh lebih dari satu)</label><div id="cc" class="chips"></div><input id="fb" placeholder="Ketik kode barcode"><div class="row"><button class="btn g" onclick="addc($('#fb').value)">+ Tambah</button><button class="btn g" onclick="scan(addc)">Scan</button><button class="btn g" onclick="addc('K'+Date.now())">Buat kode</button></div><div id="fe" class="err"></div><div class="row"><button class="btn g" onclick="cm('fm')">Batal</button><button class="btn" id="fsv" onclick="save()">Simpan produk</button></div></div>`;
$('#fm').classList.add('on');rc();
}
function rc(){$('#cc').innerHTML=fc.map((c,i)=>`<span class="chip">${esc(c)}<b onclick="fc.splice(${i},1);rc()">×</b></span>`).join('')||'<span class="s">Belum ada kode</span>'}
function addc(c){
 c=(c||'').replace(/\s+/g,'');if(!c)return;
 const x=P.find(x=>x.codes.includes(c)&&x.id!=eid);
 if(x)return ferr('Kode ini sudah dipakai produk "'+x.name+'".');
 if(!fc.includes(c))fc.push(c);$('#fb').value='';ferr('');rc();
}
async function save(){
 if(saving)return;
 document.querySelectorAll('#fm input,#fm select').forEach(e=>{e.style.borderColor=''});ferr('');
 const n=$('#fn').value.trim().replace(/\s+/g,' '),hs=$('#fh').value.trim(),ss=$('#fs').value.trim(),u=$('#fu').value;
 const h=Number(hs),s=Number(ss);
 if(!ph)return ferr('Foto barang wajib ada. Pilih atau ambil foto dulu.');
 if(!n)return ferr('Nama produk belum diisi.','fn');
 if(hs===''||!isFinite(h)||h<0)return ferr('Harga harus berupa angka 0 atau lebih.','fh');
 if(h>1e9)return ferr('Harga terlalu besar.','fh');
 if(ss===''||!isFinite(s)||s<0)return ferr('Stok harus berupa angka 0 atau lebih.','fs');
 if(['pcs','bungkus','pak'].includes(u)&&!Number.isInteger(s))return ferr('Stok '+u+' harus bilangan bulat, tanpa koma.','fs');
 const pend=$('#fb').value.replace(/\s+/g,'');if(pend){addc(pend);if($('#fe').textContent)return}
 const dn=P.find(x=>x.name.toLowerCase()==n.toLowerCase()&&x.id!=eid);
 if(dn)return ferr('Nama "'+n+'" sudah ada. Tambahkan ukuran atau varian supaya beda.','fn');
 saving=true;const btn=$('#fsv');btn.disabled=true;btn.textContent='Menyimpan...';
 try{
  await put('p',{id:eid||Date.now(),name:n,price:h,stock:s,unit:u,codes:fc.slice(),photo:ph});
  cm('fm');await load();vP();toast('Produk tersimpan');
 }catch(e){ferr(e&&e.name=='QuotaExceededError'?'Gagal menyimpan: penyimpanan HP penuh.':'Gagal menyimpan. Coba lagi.')}
 finally{saving=false;btn.disabled=false;btn.textContent='Simpan produk'}
}

/* beranda, profil, menu */
let per=1;
const gp=()=>{try{return JSON.parse(localStorage.getItem('prof'))||{}}catch(e){return{}}};
function hdr(){const p=gp();$('#hd').innerHTML=`<span class="av">${p.foto?`<img src="${p.foto}">`:esc((p.toko||'K')[0].toUpperCase())}</span><div><b>${esc(p.toko||'Kasir')}</b><span class="s">${p.nama?'Halo, '+esc(p.nama):'Atur profil di menu ⋮'}</span></div>`}
async function vH(){
 const S=await all('s'),d0=new Date().setHours(0,0,0,0),fr=d0-(per-1)*864e5,L=S.filter(s=>s.id>=fr),rev=L.reduce((a,s)=>a+s.total,0),n=L.length,qty=L.reduce((a,s)=>a+s.items.reduce((b,i)=>b+i.q,0),0);
 const T={};L.forEach(s=>s.items.forEach(i=>{const t=T[i.n]||(T[i.n]={q:0});t.q+=i.q}));
 const top=Object.entries(T).sort((a,b)=>b[1].q-a[1].q).slice(0,5),mx=top.length?top[0][1].q:1;
 const nb=per==1?24:per,B=Array(nb).fill(0);L.forEach(s=>{B[per==1?new Date(s.id).getHours():Math.min(nb-1,Math.floor((s.id-fr)/864e5))]++});
 const bm=Math.max(1,...B),low=P.filter(p=>p.stock<=5);
 $('main').innerHTML=`<div class="seg">${[[1,'Hari ini'],[7,'7 hari'],[30,'30 hari']].map(([v,t])=>`<button class="${v==per?'on':''}" onclick="per=${v};vH()">${t}</button>`).join('')}</div>
 <div class="stats"><div class="st hi"><span>Total penjualan</span><b>${rp(rev)}</b></div><div class="st"><span>Transaksi</span><b>${n}</b></div><div class="st"><span>Barang terjual</span><b>${Math.round(qty*100)/100}</b></div><div class="st hi" style="background:#fff;color:var(--ink)"><span>Rata-rata per transaksi</span><b>${rp(n?rev/n:0)}</b></div></div>
 <h3>Traffic pembeli ${per==1?'per jam':'per hari'}</h3><div class="bars">${B.map(v=>`<i style="height:${Math.max(4,v/bm*100)}%"></i>`).join('')}</div><div class="s ax"><span>${per==1?'00.00':'Awal'}</span><span>${n&&per==1?'Tersibuk '+B.indexOf(bm)+'.00':''}</span><span>${per==1?'23.00':'Hari ini'}</span></div>
 <h3>Produk terlaris</h3>${top.map(([nm,t],i)=>{const p=P.find(x=>x.name==nm);return`<div class="tp"><em>${i+1}</em>${p?`<img src="${p.photo}">`:''}<div class="i"><b>${esc(nm)}</b><span class="s">${Math.round(t.q*100)/100} terjual</span><div class="tb"><i style="width:${t.q/mx*100}%"></i></div></div></div>`}).join('')||'<p class="s">Belum ada penjualan pada periode ini.</p>'}
 ${low.length?`<h3>Stok menipis</h3>`+low.map(p=>`<div class="tp"><img src="${p.photo}"><div class="i"><b>${esc(p.name)}</b><span class="s">${p.stock<=0?'Habis':'Sisa '+p.stock+' '+p.unit}</span></div></div>`).join(''):''}`;
}
function menu(){const d=$('#dd');if(d.classList.toggle('on'))d.innerHTML=[['Profil toko','prof()'],['Riwayat transaksi','hist()'],['Backup data','exp()'],['Pulihkan data',"$('#imf').click()"],['Tentang aplikasi',"alert('Kasir v2 · data tersimpan di HP ini, rutin backup lewat menu.')"]].map(([t,f])=>`<button onclick="$('#dd').classList.remove('on');${f}">${t}</button>`).join('')}
document.addEventListener('click',e=>{if(!e.target.closest('#dd,#mn'))$('#dd').classList.remove('on')});
let pph='';
function prof(){
 const p=gp();pph=p.foto||'';
 $('#pm').innerHTML=`<div class="box"><h3 style="margin-top:0">Profil toko</h3><div style="text-align:center"><span class="av big" id="pav">${pph?`<img src="${pph}">`:'＋'}</span><label class="btn g" style="display:inline-block;margin-bottom:12px">Pilih foto<input type="file" accept="image/*" hidden onchange="pfp(this)"></label></div><label class="s">Nama pemilik</label><input id="pn" value="${esc(p.nama||'')}"><label class="s">Nama toko</label><input id="pt" value="${esc(p.toko||'')}"><label class="s">Alamat</label><input id="pa" value="${esc(p.alamat||'')}"><label class="s">No. telepon</label><input id="ph" type="tel" value="${esc(p.hp||'')}"><div class="row"><button class="btn g" onclick="cm('pm')">Batal</button><button class="btn" onclick="psv()">Simpan</button></div></div>`;
 $('#pm').classList.add('on');
}
async function pfp(el){const f=el.files[0];if(!f)return;try{pph=await img(f);$('#pav').innerHTML=`<img src="${pph}">`}catch(e){toast('Foto tidak bisa dibaca',true)}}
function psv(){
 try{localStorage.setItem('prof',JSON.stringify({nama:$('#pn').value.trim(),toko:$('#pt').value.trim(),alamat:$('#pa').value.trim(),hp:$('#ph').value.trim(),foto:pph}))}catch(e){return toast('Gagal menyimpan profil',true)}
 hdr();cm('pm');toast('Profil tersimpan');
}
async function hist(){
 const S=(await all('s')).sort((a,b)=>b.id-a.id).slice(0,40);
 $('#pm').innerHTML=`<div class="box"><h3 style="margin-top:0">Riwayat transaksi</h3>${S.map(s=>`<div class="card" onclick="sv(${s.id})"><div class="i"><b>${rp(s.total)}</b><span class="s">${new Date(s.id).toLocaleString('id-ID')} · ${s.items.length} jenis barang</span></div></div>`).join('')||'<p class="s">Belum ada transaksi.</p>'}<button class="btn g" style="width:100%" onclick="cm('pm')">Tutup</button></div>`;
 $('#pm').classList.add('on');
}
async function sv(id){struk((await all('s')).find(s=>s.id==id))}
async function exp(){const b=new Blob([JSON.stringify({p:P,s:await all('s'),prof:gp()})],{type:'application/json'});dl(URL.createObjectURL(b),'backup-kasir.json')}
async function imp(el){
 const f=el.files[0];if(!f||!confirm('Timpa semua data dengan backup ini?'))return;
 try{const d=JSON.parse(await f.text());await clr('p');await clr('s');for(const p of d.p)await put('p',p);for(const s of d.s)await put('s',s);if(d.prof)localStorage.setItem('prof',JSON.stringify(d.prof));await load();hdr();go('h');alert('Impor berhasil')}
 catch(e){alert('File backup tidak valid')}
}
openDB().then(load).then(()=>{hdr();go('h')});
window.addEventListener('unhandledrejection',e=>{const r=e.reason;toast('Error: '+((r&&(r.message||r.name))||r),true)});
window.addEventListener('error',e=>{if(/ResizeObserver/.test(e.message||''))return;toast('Error: '+(e.message||'tidak diketahui')+' (baris '+(e.lineno||'?')+')',true)});
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{})}catch(e){}
