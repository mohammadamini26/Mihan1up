const crypto=require("crypto");
const {getStore}=require("@netlify/blobs");
const secret=()=>process.env.SESSION_SECRET||"change-session-secret";
const sign=v=>crypto.createHmac("sha256",secret()).update(v).digest("hex");
function readCookie(headers){const c=headers.cookie||"",m=c.match(/(?:^|;\s*)mihan1_session=([^;]+)/);if(!m)return null;const [v,s]=m[1].split(".");if(!v||!s)return null;const good=sign(v);return s===good?v:null}
function session(headers){const v=readCookie(headers);if(!v)return null;try{return JSON.parse(Buffer.from(v,"base64url").toString())}catch{return null}}
function makeSession(role,username){const v=Buffer.from(JSON.stringify({role,username,iat:Date.now()})).toString("base64url");return `${v}.${sign(v)}`}
async function admins(){const s=getStore("mihan1-auth");return await s.get("admins",{type:"json"})||[]}
exports.handler=async e=>{
 const s=await getStore("mihan1-auth");
 const current=session(e.headers);
 if(e.httpMethod==="GET") return {statusCode:200,headers:{"content-type":"application/json"},body:JSON.stringify({authenticated:!!current,role:current?.role||null,username:current?.username||null})};
 if(e.httpMethod==="DELETE") return {statusCode:200,headers:{"Set-Cookie":"mihan1_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax","content-type":"application/json"},body:'{"ok":true}'};
 if(e.httpMethod!=="POST")return {statusCode:405,body:"method not allowed"};
 let b={};try{b=JSON.parse(e.body||"{}")}catch{}
 if(b.action==="owner-login"){
  if(b.password!==process.env.OWNER_PASSWORD)return {statusCode:401,headers:{"content-type":"application/json"},body:JSON.stringify({error:"رمز مالک نادرست است"})};
  const v=makeSession("owner","owner");
  return {statusCode:200,headers:{"Set-Cookie":`mihan1_session=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`,"content-type":"application/json"},body:JSON.stringify({ok:true,role:"owner"})};
 }
 if(b.action==="admin-login"){
  const list=await admins();
  const a=list.find(x=>x.username===b.username&&x.password===b.password&&x.enabled!==false);
  if(!a)return {statusCode:401,headers:{"content-type":"application/json"},body:JSON.stringify({error:"نام کاربری یا رمز نادرست است"})};
  const v=makeSession("admin",a.username);
  return {statusCode:200,headers:{"Set-Cookie":`mihan1_session=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`,"content-type":"application/json"},body:JSON.stringify({ok:true,role:"admin",username:a.username})};
 }
 if(b.action==="list-admins"){
  if(!current||current.role!=="owner")return {statusCode:403,body:"forbidden"};
  return {statusCode:200,headers:{"content-type":"application/json"},body:JSON.stringify(await admins())};
 }
 if(b.action==="add-admin"){
  if(!current||current.role!=="owner")return {statusCode:403,body:"forbidden"};
  if(!b.username||!b.password)return {statusCode:400,body:"نام کاربری و رمز لازم است"};
  const list=await admins();
  if(list.some(x=>x.username===b.username))return {statusCode:409,body:"این نام کاربری وجود دارد"};
  list.push({username:String(b.username).slice(0,50),password:String(b.password).slice(0,200),enabled:true,createdAt:Date.now()});
  await s.setJSON("admins",list);
  return {statusCode:200,headers:{"content-type":"application/json"},body:'{"ok":true}'};
 }
 if(b.action==="remove-admin"){
  if(!current||current.role!=="owner")return {statusCode:403,body:"forbidden"};
  let list=await admins(); list=list.filter(x=>x.username!==b.username); await s.setJSON("admins",list);
  return {statusCode:200,headers:{"content-type":"application/json"},body:'{"ok":true}'};
 }
 if(b.action==="toggle-admin"){
  if(!current||current.role!=="owner")return {statusCode:403,body:"forbidden"};
  const list=await admins(),a=list.find(x=>x.username===b.username);if(!a)return {statusCode:404,body:"not found"};a.enabled=b.enabled!==false;await s.setJSON("admins",list);
  return {statusCode:200,headers:{"content-type":"application/json"},body:'{"ok":true}'};
 }
 return {statusCode:400,body:"unknown action"};
};
