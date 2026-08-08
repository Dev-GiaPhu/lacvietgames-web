/*
 * LacVietGames raw DEFLATE fallback.
 * Derived from fflate's raw inflate implementation (MIT License).
 * Copyright (c) 2026 Arjun Barrett.
 * Kept local to avoid third-party CDN execution on Publisher Center.
 */
(() => {
  'use strict';
  const u8 = Uint8Array, u16 = Uint16Array, i32 = Int32Array;
  const fleb = new u8([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]);
  const fdeb = new u8([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]);
  const clim = new u8([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);
  const freb = (eb,start) => {
    const b = new u16(31);
    for(let i=0;i<31;++i) b[i] = start += 1 << eb[i-1];
    const r = new i32(b[30]);
    for(let i=1;i<30;++i) for(let j=b[i];j<b[i+1];++j) r[j] = ((j-b[i])<<5)|i;
    return {b,r};
  };
  const flx = freb(fleb,2), fl = flx.b, revfl = flx.r;
  fl[28]=258; revfl[258]=28;
  const fdx = freb(fdeb,0), fd = fdx.b;
  const rev = new u16(32768);
  for(let i=0;i<32768;++i){
    let x=((i&0xAAAA)>>1)|((i&0x5555)<<1);
    x=((x&0xCCCC)>>2)|((x&0x3333)<<2);
    x=((x&0xF0F0)>>4)|((x&0x0F0F)<<4);
    rev[i]=(((x&0xFF00)>>8)|((x&0x00FF)<<8))>>1;
  }
  const hMap = (cd,mb,r) => {
    const s=cd.length,l=new u16(mb),le=new u16(mb);let i=0;
    for(;i<s;++i) if(cd[i]) ++l[cd[i]-1];
    for(i=1;i<mb;++i) le[i]=(le[i-1]+l[i-1])<<1;
    let co;
    if(r){
      co=new u16(1<<mb);const rvb=15-mb;
      for(i=0;i<s;++i) if(cd[i]){
        const sv=(i<<4)|cd[i], rr=mb-cd[i];let v=le[cd[i]-1]++<<rr;
        for(const m=v|((1<<rr)-1);v<=m;++v) co[rev[v]>>rvb]=sv;
      }
    } else {
      co=new u16(s);
      for(i=0;i<s;++i) if(cd[i]) co[i]=rev[le[cd[i]-1]++]>>(15-cd[i]);
    }
    return co;
  };
  const flt=new u8(288);for(let i=0;i<144;++i)flt[i]=8;for(let i=144;i<256;++i)flt[i]=9;for(let i=256;i<280;++i)flt[i]=7;for(let i=280;i<288;++i)flt[i]=8;
  const fdt=new u8(32);for(let i=0;i<32;++i)fdt[i]=5;
  const flrm=hMap(flt,9,1), fdrm=hMap(fdt,5,1);
  const max=a=>{let m=a[0];for(let i=1;i<a.length;++i)if(a[i]>m)m=a[i];return m;};
  const bits=(d,p,m)=>{const o=(p/8)|0;return((d[o]|(d[o+1]<<8))>>(p&7))&m;};
  const bits16=(d,p)=>{const o=(p/8)|0;return((d[o]|(d[o+1]<<8)|(d[o+2]<<16))>>(p&7));};
  const shft=p=>((p+7)/8)|0;
  const slc=(v,s,e)=>{if(s==null||s<0)s=0;if(e==null||e>v.length)e=v.length;return new u8(v.subarray(s,e));};
  const err=(msg)=>{throw new Error(msg);};

  const inflt=(dat,st,buf,dict)=>{
    const sl=dat.length,dl=dict?dict.length:0;
    if(!sl||(st.f&&!st.l))return buf||new u8(0);
    const noBuf=!buf,resize=noBuf||st.i!==2,noSt=st.i;
    if(noBuf)buf=new u8(Math.max(1,sl*3));
    const cbuf=l=>{const bl=buf.length;if(l>bl){const nbuf=new u8(Math.max(bl*2,l));nbuf.set(buf);buf=nbuf;}};
    let final=st.f||0,pos=st.p||0,bt=st.b||0,lm=st.l,dm=st.d,lbt=st.m,dbt=st.n;
    const tbts=sl*8;
    do{
      if(!lm){
        final=bits(dat,pos,1);const type=bits(dat,pos+1,3);pos+=3;
        if(!type){
          const s=shft(pos)+4,l=dat[s-4]|(dat[s-3]<<8),t=s+l;
          if(t>sl){if(noSt)err('unexpected EOF');break;}
          if(resize)cbuf(bt+l);buf.set(dat.subarray(s,t),bt);st.b=bt+=l;st.p=pos=t*8;st.f=final;continue;
        } else if(type===1){lm=flrm;dm=fdrm;lbt=9;dbt=5;}
        else if(type===2){
          const hLit=bits(dat,pos,31)+257,hcLen=bits(dat,pos+10,15)+4,tl=hLit+bits(dat,pos+5,31)+1;pos+=14;
          const ldt=new u8(tl),clt=new u8(19);
          for(let i=0;i<hcLen;++i)clt[clim[i]]=bits(dat,pos+i*3,7);
          pos+=hcLen*3;const clb=max(clt),clbmsk=(1<<clb)-1,clm=hMap(clt,clb,1);
          for(let i=0;i<tl;){
            const r=clm[bits(dat,pos,clbmsk)];pos+=r&15;const s=r>>4;
            if(s<16)ldt[i++]=s;else{let c=0,n=0;if(s===16){n=3+bits(dat,pos,3);pos+=2;c=ldt[i-1];}else if(s===17){n=3+bits(dat,pos,7);pos+=3;}else if(s===18){n=11+bits(dat,pos,127);pos+=7;}while(n--)ldt[i++]=c;}
          }
          const lt=ldt.subarray(0,hLit),dt=ldt.subarray(hLit);lbt=max(lt);dbt=max(dt);lm=hMap(lt,lbt,1);dm=hMap(dt,dbt,1);
        } else err('invalid block type');
        if(pos>tbts){if(noSt)err('unexpected EOF');break;}
      }
      if(resize)cbuf(bt+131072);
      const lms=(1<<lbt)-1,dms=(1<<dbt)-1;let lpos=pos;
      for(;;lpos=pos){
        const c=lm[bits16(dat,pos)&lms],sym=c>>4;pos+=c&15;
        if(pos>tbts){if(noSt)err('unexpected EOF');break;}
        if(!c)err('invalid length/literal');
        if(sym<256)buf[bt++]=sym;
        else if(sym===256){lpos=pos;lm=null;break;}
        else{
          let add=sym-254;
          if(sym>264){const i=sym-257,b=fleb[i];add=bits(dat,pos,(1<<b)-1)+fl[i];pos+=b;}
          const d=dm[bits16(dat,pos)&dms],dsym=d>>4;if(!d)err('invalid distance');pos+=d&15;let dt=fd[dsym];
          if(dsym>3){const b=fdeb[dsym];dt+=bits16(dat,pos)&((1<<b)-1);pos+=b;}
          if(pos>tbts){if(noSt)err('unexpected EOF');break;}
          if(resize)cbuf(bt+131072);const end=bt+add;
          if(bt<dt){const shift=dl-dt,dend=Math.min(dt,end);if(shift+bt<0)err('invalid distance');for(;bt<dend;++bt)buf[bt]=dict[shift+bt];}
          for(;bt<end;++bt)buf[bt]=buf[bt-dt];
        }
      }
      st.l=lm;st.p=lpos;st.b=bt;st.f=final;if(lm){final=1;st.m=lbt;st.d=dm;st.n=dbt;}
    }while(!final);
    return bt!==buf.length&&noBuf?slc(buf,0,bt):buf.subarray(0,bt);
  };

  window.LVGInflateRaw = data => inflt(data instanceof Uint8Array?data:new Uint8Array(data),{i:2});
})();
