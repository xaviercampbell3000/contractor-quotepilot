const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);
const SUPABASE_URL="https://dogtgadyqezwizpoaxrx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_HS9qYdWaLTjUH4J_IQJFSg_7ibKi_KE";
const supabaseClient=window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;
const db=()=>supabaseClient;
function showAuthError(message){const s=$("authStatus");if(s)s.textContent=message;}
const form=$("quoteForm");
let authMode="signup";
let currentEstimateId=null;

function getEstimate(){
  const labor=Number($("labor").value)||0,materials=Number($("materials").value)||0,other=Number($("other").value)||0,markupPct=Number($("markup").value)||0;
  const subtotal=labor+materials+other,markup=subtotal*(markupPct/100),total=subtotal+markup;
  return {business_name:$("business").value.trim(),customer_name:$("customer").value.trim(),job_type:$("job").value.trim(),estimate_number:$("number").value.trim()||"1001",labor,materials,other_costs:other,markup_percent:markupPct,markup_amount:markup,subtotal,total,scope:$("scope").value.trim()};
}
function generate(){
  const e=getEstimate();
  $("outBusiness").textContent=e.business_name||"Your Business"; $("outCustomer").textContent=e.customer_name||"Customer"; $("outJob").textContent=e.job_type||"Job estimate";
  $("outNumber").textContent="#"+e.estimate_number; $("outDate").textContent=new Date().toLocaleDateString();
  $("outScope").textContent=e.scope||"Scope of work to be confirmed with customer.";
  $("outLabor").textContent=money(e.labor); $("outMaterials").textContent=money(e.materials); $("outOther").textContent=money(e.other_costs); $("outMarkup").textContent=money(e.markup_amount); $("outTotal").textContent=money(e.total);
}
function fillEstimate(e){
  $("business").value=e.business_name||"";$("customer").value=e.customer_name||"";$("job").value=e.job_type||"";$("number").value=e.estimate_number||"1001";
  $("labor").value=e.labor??0;$("materials").value=e.materials??0;$("other").value=e.other_costs??0;$("markup").value=e.markup_percent??0;$("scope").value=e.scope||"";
  currentEstimateId=e.id||null;generate();$("app").scrollIntoView({behavior:"smooth"});
}
async function saveEstimate(){
  if(!db()){showAuthError("Account services are still loading. Refresh the page and try again.");$("authModal").hidden=false;return;}
  const {data:{user}}=await supabaseClient.auth.getUser();
  if(!user){$("authIntro").textContent="Create a free account to save estimates and access them from any device.";$("authModal").hidden=false;return;}
  const e=getEstimate(); let result;
  if(currentEstimateId) result=await supabaseClient.from("estimates").update(e).eq("id",currentEstimateId).eq("user_id",user.id).select().single();
  else result=await supabaseClient.from("estimates").insert({...e,user_id:user.id}).select().single();
  if(result.error){alert("Could not save estimate: "+result.error.message);return;}
  currentEstimateId=result.data.id; await loadEstimates(); alert("Estimate saved.");
}
async function loadEstimates(){
  if(!db())return;
  const {data:{user}}=await supabaseClient.auth.getUser(); if(!user)return;
  const list=$("estimateList"); list.innerHTML='<div class="empty-state">Loading estimates…</div>';
  const {data,error}=await supabaseClient.from("estimates").select("*").order("created_at",{ascending:false});
  if(error){list.innerHTML='<div class="empty-state">Unable to load estimates.</div>';return;}
  if(!data.length){list.innerHTML='<div class="empty-state">No saved estimates yet. Create your first quote above.</div>';return;}
  list.innerHTML=data.map(e=>'<article class="estimate-row"><div><strong>'+escapeHtml(e.customer_name||"Customer")+'</strong><span>'+escapeHtml(e.job_type||"Estimate")+' · #'+escapeHtml(e.estimate_number||"1001")+'</span><small>'+new Date(e.created_at).toLocaleDateString()+' · '+money(e.total)+'</small></div><div class="row-actions"><button class="btn secondary" data-load="'+e.id+'">Edit</button><button class="btn secondary" data-delete="'+e.id+'">Delete</button></div></article>').join("");
  list.querySelectorAll("[data-load]").forEach(b=>b.addEventListener("click",()=>{const e=data.find(x=>x.id===b.dataset.load);if(e)fillEstimate(e)}));
  list.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("Delete this estimate?"))return;const {error}=await supabaseClient.from("estimates").delete().eq("id",b.dataset.delete);if(error)alert(error.message);else{if(currentEstimateId===b.dataset.delete)currentEstimateId=null;loadEstimates()}}));
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function updateAuthUI(){
  if(!db()){$("authBtn").hidden=false;$("dashboardBtn").hidden=true;$("logoutBtn").hidden=true;return;}
  const {data:{session}}=await supabaseClient.auth.getSession();
  const logged=!!session;
  $("authBtn").hidden=logged;$("logoutBtn").hidden=!logged;$("dashboardBtn").hidden=!logged;
  if(logged){$("dashboardBtn").textContent="My estimates";loadEstimates();updateAccessUI();}
}
form.addEventListener("submit",e=>{e.preventDefault();generate();$("quoteCard").scrollIntoView({behavior:"smooth",block:"start"})});
document.querySelectorAll("#quoteForm input,#quoteForm textarea").forEach(el=>el.addEventListener("input",generate));
$("clearBtn").addEventListener("click",()=>{form.reset();["business","customer","job","number","labor","materials","other","markup","scope"].forEach(id=>{const el=$(id);if(el)el.value=""});currentEstimateId=null;$("outBusiness").textContent="Your Business";$("outCustomer").textContent="Customer";$("outJob").textContent="Job description";$("outNumber").textContent="#1001";$("outDate").textContent="";$("outScope").textContent="Your scope will appear here.";$("outLabor").textContent=money(0);$("outMaterials").textContent=money(0);$("outOther").textContent=money(0);$("outMarkup").textContent=money(0);$("outTotal").textContent=money(0);});
$("saveBtn").addEventListener("click",saveEstimate);
$("dashboardBtn").addEventListener("click",()=>{const h=$("history");h.hidden=false;h.scrollIntoView({behavior:"smooth"});loadEstimates()});

const authModal=$("authModal");
$("authBtn").addEventListener("click",()=>{authModal.hidden=false});
$("closeAuth").addEventListener("click",()=>authModal.hidden=true);
authModal.addEventListener("click",e=>{if(e.target===authModal)authModal.hidden=true});
$("togglePassword").addEventListener("click",()=>{const input=$("authPassword"),button=$("togglePassword");const showing=input.type==="text";input.type=showing?"password":"text";button.textContent=showing?"Show":"Hide";button.setAttribute("aria-label",showing?"Show password":"Hide password");button.setAttribute("aria-pressed",String(!showing));input.focus()});
$("authSwitch").addEventListener("click",()=>{authMode=authMode==="signup"?"login":"signup";$("authTitle").textContent=authMode==="signup"?"Save your estimates":"Welcome back";$("authIntro").textContent=authMode==="signup"?"Create a free account to save quotes and access them from any device.":"Log in to access your saved estimates.";$("authSubmit").textContent=authMode==="signup"?"Create account":"Log in";$("authSwitch").textContent=authMode==="signup"?"Already have an account? Log in":"Need an account? Sign up";$("authStatus").textContent=""});
$("authForm").addEventListener("submit",async e=>{e.preventDefault();const email=$("authEmail").value.trim(),password=$("authPassword").value;let result;
  if(authMode==="signup")result=await supabaseClient.auth.signUp({email,password,options:{emailRedirectTo:window.location.href.split("#")[0]}});else result=await supabaseClient.auth.signInWithPassword({email,password});
  if(result.error){$("authStatus").textContent=result.error.message;return;}
  $("authStatus").textContent=authMode==="signup"&& !result.data.session?"Check your email to confirm your account.":"Logged in.";
  if(result.data.session){authModal.hidden=true;updateAuthUI();}
});
$("logoutBtn").addEventListener("click",async()=>{await supabaseClient.auth.signOut();currentEstimateId=null;$("history").hidden=true;updateAuthUI()});
if(db()) supabaseClient.auth.onAuthStateChange(()=>updateAuthUI());

const BUSINESS_PAYPAL_PAYMENT_URL="https://www.paypal.com/ncp/payment/D6A9GAYFFR4XW";
const foundingBtn=$("foundingBtn"),foundingModal=$("foundingModal"),closeFounding=$("closeFounding"),payPalBtn=$("payPalBtn"),paymentHelp=$("paymentHelp"),accessStatus=$("accessStatus");
async function updateAccessUI(){if(!accessStatus)return;accessStatus.textContent="";const {data:{user}}=await supabaseClient.auth.getUser();if(!user){accessStatus.textContent="Log in before purchasing so your Founding access can be linked to your account.";return;}const {data,error}=await supabaseClient.from("entitlements").select("status,plan,paid_at").eq("user_id",user.id).maybeSingle();if(error){accessStatus.textContent="Unable to check Founding access right now.";return;}if(data?.status==="active"){accessStatus.textContent="✓ Founding access is active on this account.";payPalBtn.disabled=true;payPalBtn.textContent="Founding access active";}else if(data?.status==="pending"){accessStatus.textContent="Payment is being verified. Refresh this window in a moment.";}}
foundingBtn?.addEventListener("click",async()=>{foundingModal.hidden=false;await updateAccessUI()});
closeFounding?.addEventListener("click",()=>foundingModal.hidden=true);
foundingModal?.addEventListener("click",e=>{if(e.target===foundingModal)foundingModal.hidden=true});
payPalBtn?.addEventListener("click",async()=>{const {data:{user}}=await supabaseClient.auth.getUser();if(!user){foundingModal.hidden=true;authModal.hidden=false;showAuthError("Log in or create your QuotePilot account first. This lets us automatically link your $49 payment to your account.");return;}paymentHelp.textContent="Opening secure PayPal payment…";window.location.href=BUSINESS_PAYPAL_PAYMENT_URL;});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(foundingModal)foundingModal.hidden=true;if(authModal)authModal.hidden=true}});
generate();updateAuthUI();