const {getStore}=require("@netlify/blobs");
exports.handler=async e=>{
 const key=e.queryStringParameters?.key;
 if(!key||key.includes(".."))return {statusCode:400,body:"bad key"};
 const store=await getStore("mihan1-content");
 const data=await store.get(key);
 if(data===null)return {statusCode:404,body:"not found"};
 const meta=await store.getMetadata(key);
 return {statusCode:200,isBase64Encoded:true,headers:{"content-type":meta?.metadata?.contentType||"application/octet-stream","cache-control":"public, max-age=31536000, immutable"},body:Buffer.from(data).toString("base64")};
};
