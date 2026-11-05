// IFDSP website server — single file. Node 18+. Payments are suspended in this release.
const express=require("express"),crypto=require("crypto"),fs=require("fs"),path=require("path");
try{for(const l of fs.readFileSync(path.join(__dirname,".env"),"utf8").split("\n")){const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2]}}catch{}
const{PORT=3000,SESSION_SECRET,ADMIN_EMAIL,ADMIN_PASSWORD,NODE_ENV}=process.env;
if(!SESSION_SECRET||SESSION_SECRET.length<24){console.error("Set SESSION_SECRET (24+ characters) in .env");process.exit(1)}
const DIR=process.env.DATA_DIR||path.join(__dirname,"data"),UP=path.join(DIR,"uploads");fs.mkdirSync(UP,{recursive:true});
const DBF=path.join(DIR,"db.json");
const db=fs.existsSync(DBF)?JSON.parse(fs.readFileSync(DBF,"utf8")):{users:[],apps:[],audit:[],n:0,m:0,fees:{"Distinguished Fellow":{USD:"1000"},"Fellow":{USD:"850"},"Senior Member":{USD:"500"},"Full Member":{USD:"300"},"Doctoral Scholar Member":{USD:"200"},"Associate Member":{USD:"150"},"Corporate/Institutional Member":{USD:"5500"},"Life Member":{USD:"3000"}}};
const CATS=["Distinguished Fellow","Fellow","Senior Member","Full Member","Doctoral Scholar Member","Associate Member","Corporate/Institutional Member","Life Member"]; // Honorary Fellow is nomination-only
const save=()=>{fs.writeFileSync(DBF+".tmp",JSON.stringify(db));fs.renameSync(DBF+".tmp",DBF)};
const log=(u,t)=>{db.audit.unshift(new Date().toISOString()+" — "+(u?u.email:"system")+": "+t);db.audit.length=Math.min(db.audit.length,500)};
const hash=(p,s=crypto.randomBytes(16).toString("hex"))=>s+":"+crypto.scryptSync(p,s,64).toString("hex");
const same=(a,b)=>a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
const check=(p,h)=>{const[s]=h.split(":");return same(hash(p,s),h)};
if(ADMIN_EMAIL&&ADMIN_PASSWORD&&!db.users.some(u=>u.email===ADMIN_EMAIL.toLowerCase())){db.users.push({id:crypto.randomUUID(),name:"Administrator",email:ADMIN_EMAIL.toLowerCase(),role:"admin",pw:hash(ADMIN_PASSWORD)});log(null,"admin account created");save()}
const sign=v=>v+"."+crypto.createHmac("sha256",SESSION_SECRET).update(v).digest("hex");
const who=req=>{const c=(req.headers.cookie||"").split(/;\s*/).find(x=>x.startsWith("s="));if(!c)return;const t=decodeURIComponent(c.slice(2)),v=t.slice(0,t.lastIndexOf("."));if(!same(sign(v),t))return;const[id,exp]=v.split(":");return+exp>Date.now()?db.users.find(u=>u.id===id):undefined};
const login=(res,u)=>res.setHeader("Set-Cookie","s="+encodeURIComponent(sign(u.id+":"+(Date.now()+7*864e5)))+"; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800"+(NODE_ENV==="production"?"; Secure":""));
const hits=new Map(),limited=ip=>{const n=Date.now(),a=(hits.get(ip)||[]).filter(t=>n-t<9e5);a.push(n);hits.set(ip,a);return a.length>20};
const view=(a,adm)=>{const{notes,owner,docs,...r}=a;return{...r,owner,docs:docs.map(d=>({id:d.id,name:d.name})),files:docs.map(d=>d.name),...(adm?{notes}:{notes:[]})}};
const EXT=/\.(pdf|jpe?g|png|docx?)$/i,E=/^\S+@\S+\.\S+$/,s=(x,n=500)=>String(x??"").slice(0,n);
const app=express();app.disable("x-powered-by");
app.use((q,r,n)=>{r.setHeader("X-Content-Type-Options","nosniff");r.setHeader("X-Frame-Options","DENY");r.setHeader("Referrer-Policy","same-origin");n()});
app.use(express.json({limit:"40mb"}));
const need=(q,r,adm)=>{const u=who(q);if(!u||(adm&&u.role!=="admin")){r.status(u?403:401).json({error:u?"Not allowed":"Please log in"});return}return u};
app.post("/api/register",(q,r)=>{if(limited(q.ip))return r.status(429).json({error:"Too many attempts"});const{name,email,password}=q.body||{},em=s(email,200).toLowerCase();
if(!name||!E.test(em)||s(password,200).length<10)return r.status(400).json({error:"Name, valid email and a password of 10+ characters are required"});
if(db.users.some(u=>u.email===em))return r.status(409).json({error:"An account with this email already exists"});
const u={id:crypto.randomUUID(),name:s(name,120),email:em,role:"applicant",pw:hash(password)};db.users.push(u);log(u,"registered");save();login(r,u);r.json({ok:1})});
app.post("/api/login",(q,r)=>{if(limited(q.ip))return r.status(429).json({error:"Too many attempts"});const u=db.users.find(x=>x.email===s(q.body?.email,200).toLowerCase());
if(!u||!check(s(q.body?.password,200),u.pw))return r.status(401).json({error:"Incorrect email or password"});login(r,u);r.json({ok:1})});
app.post("/api/logout",(q,r)=>{r.setHeader("Set-Cookie","s=; Max-Age=0; Path=/");r.json({ok:1})});
app.get("/api/state",(q,r)=>{const u=who(q),adm=u&&u.role==="admin";r.json({user:u&&{id:u.id,name:u.name,email:u.email,role:u.role},apps:u?db.apps.filter(a=>adm||a.owner===u.id).map(a=>view(a,adm)):[],fees:db.fees,audit:adm?db.audit.slice(0,100):[],payFirst:false})});
app.post("/api/apps",(q,r)=>{const u=need(q,r);if(!u)return;const b=q.body||{};
if(!CATS.includes(b.cat))return r.status(400).json({error:"Choose a valid category (Honorary Fellowship is by nomination)"});
if(!b.name||!E.test(b.email||""))return r.status(400).json({error:"Name and valid email are required"});
const docs=[];for(const f of(b.docs||[]).slice(0,5)){if(!EXT.test(f.name||""))return r.status(400).json({error:"Allowed files: PDF, JPG, PNG, DOC, DOCX"});const buf=Buffer.from(f.data||"","base64");if(buf.length>5*1024*1024)return r.status(400).json({error:"Each file must be under 5 MB"});const id=crypto.randomUUID();fs.writeFileSync(path.join(UP,id),buf);docs.push({id,name:path.basename(s(f.name,120))})}
const id="IFDSP-"+new Date().getFullYear()+"-"+String(++db.n).padStart(4,"0");
const a={id,owner:u.id,cat:b.cat,name:s(b.name,120),email:s(b.email,200),country:s(b.country,80),qual:s(b.qual),inst:s(b.inst),role:s(b.role),bio:s(b.bio,2000),docs,status:"Under review",pay:"suspended",receipt:null,msgs:[],notes:[],createdAt:new Date().toISOString()};
db.apps.push(a);log(u,"submitted "+id);save();r.json(view(a))});
app.post("/api/apps/:id/respond",(q,r)=>{const u=need(q,r);if(!u)return;const a=db.apps.find(x=>x.id===q.params.id&&x.owner===u.id);if(!a||a.status!=="Information required")return r.status(400).json({error:"Nothing to respond to"});
a.notes.push("Applicant: "+s(q.body?.text,2000));a.status="Under review";log(u,"responded on "+a.id);save();r.json({ok:1})});
app.post("/api/admin/apps/:id/decide",(q,r)=>{const u=need(q,r,1);if(!u)return;const a=db.apps.find(x=>x.id===q.params.id),{status,message}=q.body||{};
if(!a||!["Approved","Rejected","Information required"].includes(status))return r.status(400).json({error:"Invalid request"});if(status!=="Approved"&&!message)return r.status(400).json({error:"A message is required"});
a.status=status;if(message)a.msgs.push(s(message,2000));if(status==="Approved"&&!a.mid)a.mid="M-"+(10000+ ++db.m);log(u,status+" "+a.id);save();r.json({ok:1})});
app.post("/api/admin/fees",(q,r)=>{const u=need(q,r,1);if(!u)return;const{category,currency,value}=q.body||{};if(!CATS.includes(category)||!["USD","NGN"].includes(currency)||(value!==""&&!(+value>=0)))return r.status(400).json({error:"Invalid fee"});
const o=db.fees[category]||{};log(u,`fee ${category} ${currency}: ${o[currency]||"unset"} -> ${value||"unset"}`);db.fees[category]={...o,[currency]:String(value)};save();r.json({ok:1})});
app.get("/api/files/:id",(q,r)=>{const u=need(q,r);if(!u)return;const a=db.apps.find(x=>x.docs.some(d=>d.id===q.params.id));if(!a||(u.role!=="admin"&&a.owner!==u.id))return r.sendStatus(404);
const d=a.docs.find(d=>d.id===q.params.id);log(u,"opened file "+d.name+" of "+a.id);r.download(path.join(UP,d.id),d.name)});
app.get("/api/verify/:mid",(q,r)=>{const a=db.apps.find(x=>x.status==="Approved"&&x.mid&&x.mid.toLowerCase()===q.params.mid.toLowerCase());r.json(a?{found:true,name:a.name,cat:a.cat}:{found:false})});
app.use("/api",(q,r)=>r.status(404).json({error:"Not found"}));
app.use(express.static(path.join(__dirname,"public")));
app.listen(PORT,()=>console.log("IFDSP site running on port "+PORT));
