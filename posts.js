const {getStore}=require("@netlify/blobs");
const crypto=require("crypto");
const secret=()=>process.env.SESSION_SECRET||"change-session-secret";
function auth(h){const c=h.cookie||"",m=c.match(/(?:^|;\s*)mihan1_session=([^;]+)/);if(!m)return false;const [v,s]=m[1].split(".");if(!v||!s||s!==crypto.createHmac("sha256",secret()).update(v).digest("hex"))return false;try{const x=JSON.parse(Buffer.from(v,"base64url").toString());return x.role==="owner"||x.role==="admin"}catch{return false}}
async function db(){return getStore("mihan1-content")}
exports.handler=async e=>{
 const store=await db();
 if(e.httpMethod==="GET"){
  const ids=await store.get("index",{type:"json"})||[],out=[];
  for(const id of ids){const p=await store.get(id,{type:"json"});if(p)out.push(p)}
  out.sort((a,b)=>b.createdAt-a.createdAt);
  return {statusCode:200,headers:{"content-type":"application/json; charset=utf-8"},body:JSON.stringify(out)};
 }
 if(!auth(e.headers))return {statusCode:401,headers:{"content-type":"application/json"},body:JSON.stringify({error:"ابتدا وارد شوید"})};
 let b={};try{b=JSON.parse(e.body||"{}")}catch{return {statusCode:400,body:"bad json"}}
 if(e.httpMethod==="POST"){
  if(!["text","image","video"].includes(b.type)||!b.title)return {statusCode:400,body:"اطلاعات ناقص"};
  let url="";
  if(b.type!=="text"){
   if(!b.data||!b.mime)return {statusCode:400,body:"فایل انتخاب نشده است"};
   const m=String(b.data).match(/^data:[^;]+;base64,(.+)$/);
   if(!m)return {statusCode:400,body:"فایل نامعتبر است"};
   const buf=Buffer.from(m[1],"base64");
   if(buf.length>10*1024*1024)return {statusCode:413,body:"حجم فایل بیشتر از 10MB است"};
   if(b.type==="image"&&!String(b.mime).startsWith("image/"))return {statusCode:400,body:"فرمت عکس نامعتبر است"};
   if(b.type==="video"&&!String(b.mime).startsWith("video/"))return {statusCode:400,body:"فرمت ویدیو نامعتبر است"};
   const ext=(String(b.mime).split("/")[1]||"bin").replace(/[^a-z0-9]/gi,"").slice(0,8);
   const key=`media/${crypto.randomUUID()}.${ext}`;
   await store.set(key,buf,{metadata:{contentType:b.mime}});
   url=`/api/media?key=${encodeURIComponent(key)}`;
  }
  const id=crypto.randomUUID();
  const post={id,type:b.type,title:String(b.title).slice(0,200),text:String(b.text||"").slice(0,10000),url,createdAt:Date.now()};
  await store.setJSON(id,post);
  const index=await store.get("index",{type:"json"})||[];index.push(id);await store.setJSON("index",index);
  return {statusCode:200,headers:{"content-type":"application/json"},body:JSON.stringify(post)};
 }
 if(e.httpMethod==="DELETE"){
  if(!b.id)return {statusCode:400,body:"missing id"};
  const p=await store.get(b.id,{type:"json"}); if(p&&p.url){const key=p.url.split("/mihan1-content/")[1];if(key)await store.delete(key)}
  await store.delete(b.id);let ids=await store.get("index",{type:"json"})||[];await store.setJSON("index",ids.filter(x=>x!==b.id));
  return {statusCode:200,headers:{"content-type":"application/json"},body:'{"ok":true}'};
 }
 return {statusCode:405,body:"method not allowed"};
};
