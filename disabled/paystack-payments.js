// IFDSP payment server (single file). Node 18+. Run: npm i && node server.js
const express=require("express"),crypto=require("crypto"),fs=require("fs"),path=require("path");
const KEY=process.env.PAYSTACK_SECRET_KEY,BASE=process.env.BASE_URL||"http://localhost:3000",PORT=process.env.PORT||3000;
if(!KEY){console.error("Set PAYSTACK_SECRET_KEY");process.exit(1)}
// Server-side fee table (major units). Never trust amounts from the browser. Add NGN once approved.
const FEES={"Distinguished Fellow":{USD:1000},"Fellow":{USD:850},"Senior Member":{USD:500},"Full Member":{USD:450},"Doctoral Scholar Member":{USD:350},"Associate Member":{USD:250},"Corporate/Institutional Member":{USD:5500},"Life Member":{USD:3000}}; // Honorary Fellow: nomination only, no payment
const DB=path.join(__dirname,"data.json");
const load=()=>{try{return JSON.parse(fs.readFileSync(DB,"utf8"))}catch{return{tx:{},n:0}}};
const save=d=>fs.writeFileSync(DB,JSON.stringify(d,null,2));
const ps=(p,o={})=>fetch("https://api.paystack.co"+p,{...o,headers:{Authorization:"Bearer "+KEY,"Content-Type":"application/json"}}).then(r=>r.json());
// Mark a transaction paid ONLY after Paystack verification, matching amount+currency. Idempotent.
async function settle(ref){const d=load(),t=d.tx[ref];if(!t)return{ok:false,msg:"unknown reference"};if(t.status==="success")return{ok:true,tx:t};
const v=await ps("/transaction/verify/"+encodeURIComponent(ref));
if(!v.status||!v.data)return{ok:false,msg:"verification failed"};
const x=v.data;if(x.status==="success"&&x.amount===t.amount&&x.currency===t.currency){d.n++;t.status="success";t.paidAt=new Date().toISOString();t.receipt="RCT-"+new Date().getFullYear()+"-"+String(d.n).padStart(5,"0");t.channel=x.channel;save(d);return{ok:true,tx:t}}
t.status=x.status==="success"?"review":x.status;save(d);return{ok:false,msg:"status: "+t.status}}
const app=express();
// Webhook needs the RAW body for signature check, so it is registered before express.json().
app.post("/api/paystack/webhook",express.raw({type:"*/*"}),async(req,res)=>{
const sig=req.get("x-paystack-signature")||"",h=crypto.createHmac("sha512",KEY).update(req.body).digest("hex");
if(sig.length!==h.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(h)))return res.sendStatus(401);
res.sendStatus(200);try{const e=JSON.parse(req.body);if(e.event==="charge.success")await settle(e.data.reference)}catch(err){console.error("webhook",err)}});
app.use(express.json());
app.post("/api/pay/initialize",async(req,res)=>{const{applicationId,email,category,currency="USD"}=req.body||{};
const fee=FEES[category]&&FEES[category][currency];
if(!applicationId||!/^\S+@\S+\.\S+$/.test(email||""))return res.status(400).json({error:"applicationId and valid email required"});
if(!fee)return res.status(400).json({error:"No approved fee for that category/currency"});
const d=load(),ref="IFDSP-"+crypto.randomBytes(8).toString("hex"),amount=fee*100;
d.tx[ref]={ref,applicationId,email,category,currency,amount,purpose:"Membership fee — "+category,status:"pending",createdAt:new Date().toISOString()};save(d);
const r=await ps("/transaction/initialize",{method:"POST",body:JSON.stringify({email,amount,currency,reference:ref,callback_url:BASE+"/payment/callback",metadata:{applicationId,category}})});
if(!r.status)return res.status(502).json({error:r.message||"Paystack error"});res.json({reference:ref,authorization_url:r.data.authorization_url})});
app.get("/payment/callback",async(req,res)=>{const ref=req.query.reference||req.query.trxref;const r=ref?await settle(ref):{ok:false};res.redirect("/#portal"+(r.ok?"":""))}); // browser redirect alone never marks paid; settle() verifies server-side
app.get("/api/pay/status/:ref",(req,res)=>{const t=load().tx[req.params.ref];if(!t)return res.sendStatus(404);const{ref,status,amount,currency,purpose,receipt,paidAt}=t;res.json({ref,status,amount:amount/100,currency,purpose,receipt,paidAt})});
app.use(express.static(path.join(__dirname,"public")));
app.listen(PORT,()=>console.log("IFDSP server on "+BASE));
