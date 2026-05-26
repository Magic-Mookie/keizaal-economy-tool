import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const LOCATIONS = [
  "Whiterun","Windhelm","Riften","Solitude","Markarth","Falkreath","Dawnstar","Morthal","Winterhold",
  "Riverwood","Rorikstead","Ivarstead","Kynesgrove","Shor's Stone","Karthwasten","Stonehills","Dragon Bridge","Darkwater Crossing","Helgen"
];

const NAV_TABS = [
  {id:"home",label:"Home",icon:"⚔"},
  {id:"materials",label:"Materials",icon:"🧱"},
  {id:"blacksmith",label:"Blacksmith",icon:"🔨"},
  {id:"hunter",label:"Hunter",icon:"🏹"},
  {id:"cook",label:"Cook",icon:"🍖"},
  {id:"tailor",label:"Tailor",icon:"🧵"},
  {id:"alchemist",label:"Alchemist",icon:"⚗"},
  {id:"miner",label:"Miner",icon:"⛏"},
  {id:"woodworker",label:"Woodworker",icon:"🪓"},
  {id:"generalstore",label:"General Store",icon:"🏪"},
];

const PROFESSIONS = ["blacksmith","hunter","cook","tailor","alchemist","miner","woodworker"];
const CRAFTER_TABS = ["blacksmith","cook","tailor","alchemist"];
const GATHERER_TABS = ["hunter","miner","woodworker"];
const PROF_LABELS = {blacksmith:"Blacksmith",hunter:"Hunter",cook:"Cook",tailor:"Tailor",alchemist:"Alchemist",miner:"Miner",woodworker:"Woodworker",general:"General"};
const PROF_ICONS = {blacksmith:"🔨",hunter:"🏹",cook:"🍖",tailor:"🧵",alchemist:"⚗",miner:"⛏",woodworker:"🪓"};
const ALL_TABS_OPT = ["general",...PROFESSIONS];
const TAB_COLORS = {blacksmith:"#c87020",hunter:"#40a860",cook:"#c85050",tailor:"#8060c8",alchemist:"#20a0a0",miner:"#a08040",woodworker:"#806030",general:"#607080"};
const ADMIN_USERNAME = "MagicMookie";

const initItems = () => Object.fromEntries(PROFESSIONS.map(p=>[p,[]]));
const initLocPrices = () => Object.fromEntries(LOCATIONS.map(l=>[l,{buy:0,sell:0}]));
const matMatchesProf = (mat,prof) => (mat.tabs||["general"]).includes("general")||(mat.tabs||["general"]).includes(prof);

function getMatPrice(mat,loc,type){
  if(!loc) return type==="buy"?mat.buy_price:mat.sell_price;
  const lp=mat.location_prices?.[loc];
  if(lp){const v=type==="buy"?lp.buy:lp.sell; if(v&&v>0)return v;}
  return type==="buy"?mat.buy_price:mat.sell_price;
}

function downloadCSV(filename,rows,headers){
  const csv=[headers.join(","),...rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","))].join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}

const S={
  app:{display:"flex",height:"100vh",fontFamily:"Georgia,serif",background:"#1a1208",color:"#e8d5a3",overflow:"hidden"},
  sidebar:(open)=>({width:open?200:56,background:"#0d0a04",borderRight:"1px solid #5a4010",transition:"width 0.2s",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}),
  navItem:(active)=>({display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer",background:active?"rgba(200,169,81,0.15)":"none",borderLeft:active?"3px solid #c8a951":"3px solid transparent",color:active?"#c8a951":"#9a8060",fontSize:13,whiteSpace:"nowrap",overflow:"hidden",userSelect:"none"}),
  main:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},
  topbar:{background:"#0d0a04",borderBottom:"1px solid #5a4010",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"},
  content:{flex:1,overflow:"auto",padding:24},
  card:{background:"#120e04",border:"1px solid #5a4010",borderRadius:6,padding:20,marginBottom:20},
  h2:{color:"#c8a951",fontSize:16,marginBottom:16,borderBottom:"1px solid #3a2d10",paddingBottom:8},
  inp:{background:"#1a1208",border:"1px solid #5a4010",color:"#e8d5a3",borderRadius:4,padding:"6px 10px",fontSize:13,fontFamily:"Georgia,serif",width:"100%",boxSizing:"border-box"},
  sel:{background:"#1a1208",border:"1px solid #5a4010",color:"#e8d5a3",borderRadius:4,padding:"6px 10px",fontSize:13,fontFamily:"Georgia,serif",width:"100%",boxSizing:"border-box"},
  btn:{background:"#3a2400",border:"1px solid #c8a951",color:"#c8a951",borderRadius:4,padding:"7px 16px",cursor:"pointer",fontSize:13,fontFamily:"Georgia,serif",whiteSpace:"nowrap"},
  btnG:{background:"#1a3010",border:"1px solid #4a8040",color:"#70cc70",borderRadius:4,padding:"7px 16px",cursor:"pointer",fontSize:13,fontFamily:"Georgia,serif",whiteSpace:"nowrap"},
  btnD:{background:"#2a0d0d",border:"1px solid #8b3a3a",color:"#cc6666",borderRadius:4,padding:"5px 10px",cursor:"pointer",fontSize:12,fontFamily:"Georgia,serif"},
  tbl:{width:"100%",borderCollapse:"collapse",fontSize:13},
  th:{background:"#0d0a04",color:"#c8a951",padding:"8px 10px",textAlign:"left",borderBottom:"1px solid #5a4010",fontWeight:"normal"},
  td:{padding:"8px 10px",borderBottom:"1px solid #2a2010",color:"#e8d5a3",verticalAlign:"top"},
  lbl:{fontSize:12,color:"#9a8060",marginBottom:4,display:"block"},
  badge:{background:"#3a2400",border:"1px solid #5a4010",borderRadius:3,padding:"2px 8px",fontSize:11,color:"#c8a951",display:"inline-block",marginBottom:3},
};

function TabPill({t,active,onClick}){
  const col=TAB_COLORS[t]||"#607080";
  return <span onClick={onClick} style={{cursor:"pointer",padding:"3px 9px",borderRadius:3,fontSize:11,border:`1px solid ${active?col:"#3a3020"}`,background:active?`${col}22`:"transparent",color:active?col:"#5a4a30",userSelect:"none"}}>{t==="general"?"General":PROF_LABELS[t]}</span>;
}

function TabPillGroup({selected,onChange,readonly}){
  const toggle=(t)=>{
    if(readonly)return;
    if(selected.includes(t)){if(selected.length>1)onChange(selected.filter(x=>x!==t));}
    else onChange([...selected,t]);
  };
  return <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{ALL_TABS_OPT.map(t=><TabPill key={t} t={t} active={selected.includes(t)} onClick={()=>toggle(t)}/>)}</div>;
}

function LocationFilter({value,onChange,label="Location"}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,background:"#0d0a04",border:"1px solid #5a4010",borderRadius:6,padding:"10px 16px"}}>
      <span style={{fontSize:16}}>📍</span>
      <label style={{fontSize:13,color:"#9a8060",whiteSpace:"nowrap"}}>{label}:</label>
      <select style={{...S.sel,maxWidth:220}} value={value} onChange={e=>onChange(e.target.value)}>
        <option value="">— All Locations (Base Price) —</option>
        {LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}
      </select>
      {value&&<span style={{fontSize:12,color:"#c8a951"}}>Showing: <strong>{value}</strong></span>}
    </div>
  );
}

// ─── LOGIN SCREEN ───────────────────────────────────────────────────────────
function LoginScreen({onLogin}){
  const [username,setUsername]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");

  const login=async()=>{
    const u=username.trim();
    if(!u)return;
    setLoading(true);setErr("");
    try{
      const {data:existing}=await supabase.from("profiles").select("username,is_admin").eq("username",u).single();
      if(existing){
        onLogin(existing);
      } else {
        const {error}=await supabase.from("profiles").insert({username:u,is_admin:false});
        if(error)throw error;
        onLogin({username:u,is_admin:false});
      }
    }catch(e){setErr("Could not connect. Check your internet connection.");}
    setLoading(false);
  };

  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#1a1208"}}>
      <div style={{background:"#120e04",border:"1px solid #c8a951",borderRadius:8,padding:40,width:360,textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>⚔</div>
        <div style={{fontSize:22,color:"#c8a951",letterSpacing:3,marginBottom:4}}>KEIZAAL ONLINE</div>
        <div style={{fontSize:12,color:"#9a8060",letterSpacing:2,marginBottom:32}}>ECONOMY TOOL</div>
        <label style={{...S.lbl,textAlign:"left"}}>Enter your username</label>
        <input style={{...S.inp,marginBottom:16,fontSize:15}} placeholder="e.g. IronForgeSmith" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/>
        {err&&<div style={{color:"#cc6666",fontSize:12,marginBottom:12}}>{err}</div>}
        <button style={{...S.btn,width:"100%",padding:"10px 0",fontSize:15}} onClick={login} disabled={loading}>
          {loading?"Entering...":"Enter the Hold →"}
        </button>
        <div style={{marginTop:16,fontSize:11,color:"#5a4010"}}>New usernames are created automatically.</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function App(){
  const [user,setUser]=useState(null);
  const [activeTab,setActiveTab]=useState("home");
  const [open,setOpen]=useState(true);
  const [materials,setMaterials]=useState([]);
  const [items,setItems]=useState(initItems());
  const [margin,setMargin]=useState(30);
  const [loading,setLoading]=useState(false);
  const isAdmin=user?.username===ADMIN_USERNAME;

  useEffect(()=>{
    if(user)loadAllData();
  },[user]);

  const loadAllData=async()=>{
    setLoading(true);
    // Load shared materials
    const {data:mats}=await supabase.from("shared_materials").select("*").order("name");
    if(mats)setMaterials(mats);
    // Load personal items
    const {data:personalItems}=await supabase.from("personal_items").select("*").eq("username",user.username);
    if(personalItems){
      const grouped=initItems();
      personalItems.forEach(item=>{
        if(grouped[item.profession])grouped[item.profession].push({...item,ingredients:item.ingredients||[]});
      });
      setItems(grouped);
    }
    // Load personal settings
    const {data:settings}=await supabase.from("personal_settings").select("*").eq("username",user.username).single();
    if(settings?.margin)setMargin(settings.margin);
    setLoading(false);
  };

  const saveMargin=async(val)=>{
    setMargin(val);
    await supabase.from("personal_settings").upsert({username:user.username,margin:val});
  };

  if(!user)return <LoginScreen onLogin={setUser}/>;

  return(
    <div style={S.app}>
      <div style={S.sidebar(open)}>
        <div style={{padding:"12px 8px",borderBottom:"1px solid #5a4010",display:"flex",alignItems:"center",justifyContent:open?"space-between":"center"}}>
          {open&&<span style={{fontSize:13,fontWeight:"bold",color:"#c8a951",letterSpacing:1,whiteSpace:"nowrap"}}>KEIZAAL</span>}
          <button style={{background:"none",border:"none",color:"#c8a951",cursor:"pointer",fontSize:18,padding:0}} onClick={()=>setOpen(o=>!o)}>{open?"◀":"▶"}</button>
        </div>
        {NAV_TABS.map(t=>(
          <div key={t.id} style={S.navItem(activeTab===t.id)} onClick={()=>setActiveTab(t.id)}>
            <span style={{fontSize:16,flexShrink:0}}>{t.icon}</span>
            {open&&<span>{t.label}</span>}
          </div>
        ))}
        <div style={{marginTop:"auto",padding:"10px 12px",borderTop:"1px solid #5a4010"}}>
          {open&&<div style={{fontSize:11,color:"#9a8060",marginBottom:4}}>Signed in as</div>}
          {open&&<div style={{fontSize:13,color:"#c8a951"}}>{user.username}{isAdmin&&<span style={{fontSize:10,color:"#e8a030",marginLeft:6}}>ADMIN</span>}</div>}
          {open&&<div style={{fontSize:11,color:"#5a4010",marginTop:4,cursor:"pointer"}} onClick={()=>setUser(null)}>← Switch user</div>}
        </div>
      </div>

      <div style={S.main}>
        <div style={S.topbar}>
          <span style={{fontSize:18,color:"#c8a951",fontWeight:"bold",letterSpacing:2}}>⚔ KEIZAAL ONLINE — ECONOMY TOOL</span>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            {loading&&<span style={{fontSize:12,color:"#9a8060"}}>Loading...</span>}
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
              <span style={{color:"#9a8060"}}>Margin:</span>
              <input type="number" min="0" max="500" value={margin} onChange={e=>saveMargin(Math.max(0,parseInt(e.target.value)||0))} style={{...S.inp,width:60,padding:"4px 8px"}}/>
              <span style={{color:"#c8a951"}}>%</span>
            </div>
          </div>
        </div>
        <div style={S.content}>
          {activeTab==="home"&&<HomeTab setActiveTab={setActiveTab} user={user} isAdmin={isAdmin}/>}
          {activeTab==="materials"&&<MaterialsTab materials={materials} setMaterials={setMaterials} isAdmin={isAdmin}/>}
          {CRAFTER_TABS.includes(activeTab)&&<ProfessionTab profession={activeTab} materials={materials} items={items} setItems={setItems} margin={margin} username={user.username}/>}
          {GATHERER_TABS.includes(activeTab)&&<GathererTab profession={activeTab} materials={materials} margin={margin}/>}
          {activeTab==="generalstore"&&<GeneralStoreTab materials={materials} items={items} margin={margin}/>}
        </div>
      </div>
    </div>
  );
}

// ─── HOME ───────────────────────────────────────────────────────────────────
function HomeTab({setActiveTab,user,isAdmin}){
  return(
    <div>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:40,marginBottom:8}}>⚔</div>
        <div style={{fontSize:24,color:"#c8a951",letterSpacing:3,marginBottom:4}}>KEIZAAL ONLINE</div>
        <div style={{fontSize:13,color:"#9a8060",letterSpacing:2}}>ECONOMY TOOL</div>
      </div>
      {isAdmin&&(
        <div style={{...S.card,borderColor:"#e8a030",marginBottom:20,textAlign:"center"}}>
          <span style={{color:"#e8a030",fontSize:13}}>⚡ You are logged in as <strong>Admin</strong>. You can edit shared materials visible to all users.</span>
        </div>
      )}
      <div style={{background:"#120e04",border:"1px solid #c8a951",borderRadius:6,padding:24,maxWidth:640,margin:"0 auto"}}>
        <div style={{color:"#c8a951",fontSize:15,marginBottom:12,textAlign:"center",letterSpacing:1}}>⚠ DISCLAIMER ⚠</div>
        <p style={{fontSize:13,color:"#c8aa70",lineHeight:1.8,marginBottom:12}}>This is an <strong style={{color:"#c8a951"}}>unofficial fan-made economy calculator</strong> for the <strong style={{color:"#c8a951"}}>Keizaal Online</strong> Skyrim roleplay server. Not affiliated with Bethesda Softworks or ZeniMax Media.</p>
        <p style={{fontSize:13,color:"#c8aa70",lineHeight:1.8,marginBottom:12}}>Shared materials are managed by the server admin. Your personal items and settings are saved to your username <strong style={{color:"#c8a951"}}>{user.username}</strong>.</p>
        <p style={{fontSize:13,color:"#c8aa70",lineHeight:1.8}}>May your coffers overflow with Septims. <em>Dovahlaan!</em></p>
        <hr style={{border:"none",borderTop:"1px solid #5a4010",margin:"16px 0"}}/>
        <div style={{textAlign:"center"}}><button style={S.btn} onClick={()=>setActiveTab("materials")}>Begin →</button></div>
      </div>
    </div>
  );
}

// ─── MATERIALS (admin edit, all read) ───────────────────────────────────────
function MaterialsTab({materials,setMaterials,isAdmin}){
  const [form,setForm]=useState({name:"",buy_price:"",sell_price:"",tabs:["general"]});
  const [expandedId,setExpandedId]=useState(null);
  const [saving,setSaving]=useState(false);

  const add=async()=>{
    if(!form.name.trim()||!isAdmin)return;
    setSaving(true);
    const {data,error}=await supabase.from("shared_materials").insert({name:form.name.trim(),buy_price:parseFloat(form.buy_price)||0,sell_price:parseFloat(form.sell_price)||0,tabs:form.tabs,location_prices:{}}).select().single();
    if(!error&&data)setMaterials(m=>[...m,data]);
    setForm({name:"",buy_price:"",sell_price:"",tabs:["general"]});
    setSaving(false);
  };

  const remove=async(id)=>{
    if(!isAdmin)return;
    await supabase.from("shared_materials").delete().eq("id",id);
    setMaterials(m=>m.filter(x=>x.id!==id));
    if(expandedId===id)setExpandedId(null);
  };

  const updField=async(id,field,val)=>{
    if(!isAdmin)return;
    const parsed=field.includes("price")?parseFloat(val)||0:val;
    setMaterials(m=>m.map(x=>x.id===id?{...x,[field]:parsed}:x));
    await supabase.from("shared_materials").update({[field]:parsed}).eq("id",id);
  };

  const updTabs=async(id,tabs)=>{
    if(!isAdmin)return;
    setMaterials(m=>m.map(x=>x.id===id?{...x,tabs}:x));
    await supabase.from("shared_materials").update({tabs}).eq("id",id);
  };

  const updLoc=async(id,loc,type,val)=>{
    if(!isAdmin)return;
    const mat=materials.find(m=>m.id===id);
    const lp={...(mat?.location_prices||{}),[loc]:{...(mat?.location_prices?.[loc]||{buy:0,sell:0}),[type]:parseFloat(val)||0}};
    setMaterials(m=>m.map(x=>x.id===id?{...x,location_prices:lp}:x));
    await supabase.from("shared_materials").update({location_prices:lp}).eq("id",id);
  };

  return(
    <div>
      {!isAdmin&&<div style={{...S.card,borderColor:"#5a4010",color:"#9a8060",fontSize:13,marginBottom:20}}>📖 Materials are managed by the server admin. You can view all prices below.</div>}
      {isAdmin&&(
        <div style={S.card}>
          <div style={S.h2}>Add Shared Material</div>
          <div style={{display:"flex",gap:12,marginBottom:12,alignItems:"flex-end"}}>
            <div style={{flex:2}}>
              <label style={S.lbl}>Material Name</label>
              <input style={S.inp} placeholder="e.g. Iron Ingot" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add()}/>
            </div>
            <div style={{flex:1}}>
              <label style={S.lbl}>Base Buy (⚜)</label>
              <input style={S.inp} type="number" min="0" value={form.buy_price} onChange={e=>setForm(f=>({...f,buy_price:e.target.value}))}/>
            </div>
            <div style={{flex:1}}>
              <label style={S.lbl}>Base Sell (⚜)</label>
              <input style={S.inp} type="number" min="0" value={form.sell_price} onChange={e=>setForm(f=>({...f,sell_price:e.target.value}))}/>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={S.lbl}>Assign to Tabs</label>
            <TabPillGroup selected={form.tabs} onChange={tabs=>setForm(f=>({...f,tabs}))}/>
          </div>
          <button style={S.btn} onClick={add} disabled={saving}>{saving?"Saving...":"Add Material"}</button>
        </div>
      )}

      {materials.length>0&&(
        <div style={S.card}>
          <div style={S.h2}>Shared Materials ({materials.length}){isAdmin&&<span style={{fontSize:11,color:"#9a8060",marginLeft:8}}>— Admin: click fields to edit</span>}</div>
          <table style={S.tbl}>
            <thead>
              <tr>
                <th style={S.th}>Material</th>
                <th style={S.th}>Tabs</th>
                <th style={S.th}>Base Buy (⚜)</th>
                <th style={S.th}>Base Sell (⚜)</th>
                {isAdmin&&<th style={S.th}>Location Prices</th>}
                {isAdmin&&<th style={S.th}></th>}
              </tr>
            </thead>
            <tbody>
              {materials.map(m=>[
                <tr key={m.id}>
                  <td style={S.td}>{m.name}</td>
                  <td style={S.td}><TabPillGroup selected={m.tabs||["general"]} onChange={tabs=>updTabs(m.id,tabs)} readonly={!isAdmin}/></td>
                  <td style={S.td}>{isAdmin?<input style={{...S.inp,width:80}} type="number" min="0" value={m.buy_price} onChange={e=>updField(m.id,"buy_price",e.target.value)}/>:<span>{m.buy_price} ⚜</span>}</td>
                  <td style={S.td}>{isAdmin?<input style={{...S.inp,width:80}} type="number" min="0" value={m.sell_price} onChange={e=>updField(m.id,"sell_price",e.target.value)}/>:<span>{m.sell_price} ⚜</span>}</td>
                  {isAdmin&&<td style={S.td}><button style={{...S.btn,padding:"4px 10px",fontSize:12}} onClick={()=>setExpandedId(expandedId===m.id?null:m.id)}>{expandedId===m.id?"▲ Hide":"▼ Set Prices"} ({LOCATIONS.filter(l=>m.location_prices?.[l]?.buy>0||m.location_prices?.[l]?.sell>0).length}/{LOCATIONS.length})</button></td>}
                  {isAdmin&&<td style={S.td}><button style={S.btnD} onClick={()=>remove(m.id)}>Remove</button></td>}
                </tr>,
                isAdmin&&expandedId===m.id&&(
                  <tr key={`${m.id}-exp`}>
                    <td colSpan={6} style={{padding:0,background:"#0d0a04"}}>
                      <div style={{padding:16}}>
                        <div style={{fontSize:13,color:"#c8a951",marginBottom:10}}>📍 Location Prices for <strong>{m.name}</strong></div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:8}}>
                          {LOCATIONS.map(loc=>(
                            <div key={loc} style={{background:"#120e04",border:"1px solid #3a2d10",borderRadius:4,padding:"8px 12px"}}>
                              <div style={{fontSize:12,color:"#c8a951",marginBottom:6,fontWeight:"bold"}}>{loc}</div>
                              <div style={{display:"flex",gap:8}}>
                                <div style={{flex:1}}>
                                  <label style={{...S.lbl,fontSize:11}}>Buy (⚜)</label>
                                  <input style={{...S.inp,padding:"4px 6px"}} type="number" min="0" placeholder={String(m.buy_price)} value={m.location_prices?.[loc]?.buy||""} onChange={e=>updLoc(m.id,loc,"buy",e.target.value)}/>
                                </div>
                                <div style={{flex:1}}>
                                  <label style={{...S.lbl,fontSize:11}}>Sell (⚜)</label>
                                  <input style={{...S.inp,padding:"4px 6px"}} type="number" min="0" placeholder={String(m.sell_price)} value={m.location_prices?.[loc]?.sell||""} onChange={e=>updLoc(m.id,loc,"sell",e.target.value)}/>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              ])}
            </tbody>
          </table>
        </div>
      )}
      {materials.length===0&&<div style={{textAlign:"center",color:"#5a4010",padding:40,fontSize:13}}>No shared materials yet.{isAdmin?" Add the first one above.":""}</div>}
    </div>
  );
}

// ─── PROFESSION TAB (crafters) ───────────────────────────────────────────────
function ProfessionTab({profession,materials,items,setItems,margin,username}){
  const profLabel=PROF_LABELS[profession];
  const myItems=items[profession]||[];
  const [newItem,setNewItem]=useState({name:"",ingredients:[]});
  const [ingPick,setIngPick]=useState({matId:"",qty:1});
  const [location,setLocation]=useState("");
  const [saving,setSaving]=useState(false);

  const availMats=materials.filter(m=>matMatchesProf(m,profession));

  const addIng=()=>{
    if(!ingPick.matId)return;
    const mat=materials.find(m=>m.id===parseInt(ingPick.matId));
    if(!mat)return;
    setNewItem(n=>({...n,ingredients:n.ingredients.some(i=>i.matId===mat.id)?n.ingredients.map(i=>i.matId===mat.id?{...i,qty:i.qty+parseInt(ingPick.qty||1)}:i):[...n.ingredients,{matId:mat.id,matName:mat.name,qty:parseInt(ingPick.qty)||1}]}));
    setIngPick({matId:"",qty:1});
  };
  const remIng=(matId)=>setNewItem(n=>({...n,ingredients:n.ingredients.filter(i=>i.matId!==matId)}));
  const calcCost=(ings,loc)=>ings.reduce((s,ing)=>{const mat=materials.find(m=>m.id===ing.matId);return s+(mat?getMatPrice(mat,loc,"buy")*ing.qty:0);},0);
  const suggested=(cost)=>Math.ceil(cost*(1+margin/100));

  const saveItem=async()=>{
    if(!newItem.name.trim())return;
    setSaving(true);
    const {data,error}=await supabase.from("personal_items").insert({username,profession,name:newItem.name.trim(),ingredients:newItem.ingredients}).select().single();
    if(!error&&data){
      setItems(prev=>({...prev,[profession]:[...(prev[profession]||[]),{...data,ingredients:data.ingredients||[]}]}));
      setNewItem({name:"",ingredients:[]});
    }
    setSaving(false);
  };

  const remItem=async(id)=>{
    await supabase.from("personal_items").delete().eq("id",id);
    setItems(prev=>({...prev,[profession]:prev[profession].filter(x=>x.id!==id)}));
  };

  const exportItems=()=>{
    if(!myItems.length)return;
    downloadCSV(`keizaal_${profession}.csv`,myItems.map(item=>{const cost=calcCost(item.ingredients,location);return[item.name,item.ingredients.map(i=>`${i.qty}x ${i.matName}`).join("; "),cost,suggested(cost),location||"Base"];}),["Item Name","Ingredients","Production Cost","Suggested Price","Location"]);
  };

  return(
    <div>
      <div style={{fontSize:20,color:"#c8a951",marginBottom:16}}>{PROF_ICONS[profession]} {profLabel}</div>
      <LocationFilter value={location} onChange={setLocation} label="Price Location"/>
      {availMats.length===0&&<div style={{...S.card,borderColor:"#8b3a3a",color:"#cc9966",fontSize:13}}>⚠ No materials tagged for {profLabel} or General. Ask your admin to add materials.</div>}
      <div style={S.card}>
        <div style={S.h2}>Add New Item</div>
        <div style={{marginBottom:12}}>
          <label style={S.lbl}>Item Name</label>
          <input style={S.inp} placeholder="e.g. Iron Sword" value={newItem.name} onChange={e=>setNewItem(n=>({...n,name:e.target.value}))}/>
        </div>
        <div style={S.h2}>Ingredients</div>
        {newItem.ingredients.length>0&&(
          <div style={{marginBottom:12}}>
            {newItem.ingredients.map(ing=>(
              <div key={ing.matId} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={S.badge}>{ing.qty}x {ing.matName}</span>
                <button style={S.btnD} onClick={()=>remIng(ing.matId)}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:12,marginBottom:12,alignItems:"flex-end"}}>
          <div style={{flex:2}}>
            <label style={S.lbl}>Material</label>
            <select style={S.sel} value={ingPick.matId} onChange={e=>setIngPick(p=>({...p,matId:e.target.value}))}>
              <option value="">-- Select Material --</option>
              {availMats.map(m=><option key={m.id} value={m.id}>{m.name} (buy: {getMatPrice(m,location,"buy")}⚜)</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <label style={S.lbl}>Quantity</label>
            <input style={S.inp} type="number" min="1" value={ingPick.qty} onChange={e=>setIngPick(p=>({...p,qty:e.target.value}))}/>
          </div>
          <button style={S.btn} onClick={addIng}>Add Ingredient</button>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <button style={S.btnG} onClick={saveItem} disabled={saving}>{saving?"Saving...":"✔ Save Item"}</button>
          {myItems.length>0&&<button style={S.btnG} onClick={exportItems}>⬇ Export</button>}
        </div>
      </div>
      {myItems.length>0&&(
        <div style={S.card}>
          <div style={S.h2}>Your {profLabel} Items ({myItems.length}) — Margin: {margin}%{location?` — 📍 ${location}`:""}</div>
          <table style={S.tbl}>
            <thead><tr><th style={S.th}>Item</th><th style={S.th}>Ingredients</th><th style={S.th}>Production Cost</th><th style={S.th}>Profit</th><th style={S.th}>Suggested Price</th><th style={S.th}></th></tr></thead>
            <tbody>
              {myItems.map(item=>{
                const cost=calcCost(item.ingredients,location);
                const sp=suggested(cost);
                return(
                  <tr key={item.id}>
                    <td style={S.td}>{item.name}</td>
                    <td style={S.td}>{item.ingredients.length===0?<span style={{color:"#5a4010"}}>—</span>:item.ingredients.map(ing=><div key={ing.matId}><span style={S.badge}>{ing.qty}x {ing.matName}</span></div>)}</td>
                    <td style={S.td}><span style={{color:"#e8a030"}}>{cost.toLocaleString()} ⚜</span></td>
                    <td style={S.td}><span style={{color:"#70cc70"}}>+{(sp-cost).toLocaleString()} ⚜</span></td>
                    <td style={S.td}><span style={{color:"#c8a951",fontWeight:"bold"}}>{sp.toLocaleString()} ⚜</span></td>
                    <td style={S.td}><button style={S.btnD} onClick={()=>remItem(item.id)}>Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── GATHERER TAB ───────────────────────────────────────────────────────────
function GathererTab({profession,materials,margin}){
  const profLabel=PROF_LABELS[profession];
  const availMats=materials.filter(m=>(m.tabs||["general"]).includes(profession));
  const [rows,setRows]=useState([]);
  const [pick,setPick]=useState({matId:"",qty:1});
  const [location,setLocation]=useState("");

  const addRow=()=>{
    if(!pick.matId)return;
    const mat=materials.find(m=>m.id===parseInt(pick.matId));
    if(!mat)return;
    setRows(r=>r.some(x=>x.matId===mat.id)?r.map(x=>x.matId===mat.id?{...x,qty:x.qty+parseInt(pick.qty||1)}:x):[...r,{matId:mat.id,matName:mat.name,qty:parseInt(pick.qty)||1}]);
    setPick({matId:"",qty:1});
  };
  const updQty=(matId,qty)=>setRows(r=>r.map(x=>x.matId===matId?{...x,qty:Math.max(1,parseInt(qty)||1)}:x));
  const remRow=(matId)=>setRows(r=>r.filter(x=>x.matId!==matId));
  const getAdj=(row)=>{const mat=materials.find(m=>m.id===row.matId);return mat?Math.ceil(getMatPrice(mat,location,"sell")*(1+margin/100)):0;};
  const total=rows.reduce((s,x)=>s+getAdj(x)*x.qty,0);

  const exportCalc=()=>{
    if(!rows.length)return;
    downloadCSV(`keizaal_${profession}_sales.csv`,[...rows.map(x=>{const mat=materials.find(m=>m.id===x.matId);const base=mat?getMatPrice(mat,location,"sell"):0;const sp=Math.ceil(base*(1+margin/100));return[x.matName,base,sp,x.qty,sp*x.qty,location||"Base"];}),["TOTAL","","","",total,""]],["Material","Base Sell","Adjusted","Qty","Subtotal","Location"]);
  };

  return(
    <div>
      <div style={{fontSize:20,color:"#c8a951",marginBottom:16}}>{PROF_ICONS[profession]} {profLabel} — Sales Calculator</div>
      <LocationFilter value={location} onChange={setLocation} label="Selling Location"/>
      {availMats.length===0&&<div style={{...S.card,borderColor:"#8b3a3a",color:"#cc9966",fontSize:13}}>⚠ No materials tagged for {profLabel}. Ask your admin to tag materials.</div>}
      {availMats.length>0&&(
        <div style={S.card}>
          <div style={S.h2}>Select Materials to Sell</div>
          <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
            <div style={{flex:2}}>
              <label style={S.lbl}>Material</label>
              <select style={S.sel} value={pick.matId} onChange={e=>setPick(p=>({...p,matId:e.target.value}))}>
                <option value="">-- Select {profLabel} Material --</option>
                {availMats.map(m=><option key={m.id} value={m.id}>{m.name} (sell: {getMatPrice(m,location,"sell")}⚜)</option>)}
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={S.lbl}>Quantity</label>
              <input style={S.inp} type="number" min="1" value={pick.qty} onChange={e=>setPick(p=>({...p,qty:e.target.value}))}/>
            </div>
            <button style={S.btn} onClick={addRow}>Add</button>
          </div>
        </div>
      )}
      {rows.length>0&&(
        <div style={S.card}>
          <div style={S.h2}>Sales Breakdown — Margin: {margin}%{location?` — 📍 ${location}`:""}</div>
          <table style={S.tbl}>
            <thead><tr><th style={S.th}>Material</th><th style={S.th}>Base Sell</th><th style={S.th}>Adjusted (+{margin}%)</th><th style={S.th}>Qty</th><th style={S.th}>Subtotal</th><th style={S.th}></th></tr></thead>
            <tbody>
              {rows.map(x=>{
                const mat=materials.find(m=>m.id===x.matId);
                const base=mat?getMatPrice(mat,location,"sell"):0;
                const adj=Math.ceil(base*(1+margin/100));
                return(
                  <tr key={x.matId}>
                    <td style={S.td}>{x.matName}</td>
                    <td style={S.td}>{base.toLocaleString()} ⚜</td>
                    <td style={S.td}><span style={{color:"#c8a951",fontWeight:"bold"}}>{adj.toLocaleString()} ⚜</span></td>
                    <td style={S.td}><input style={{...S.inp,width:70}} type="number" min="1" value={x.qty} onChange={e=>updQty(x.matId,e.target.value)}/></td>
                    <td style={S.td}><span style={{color:"#70cc70"}}>{(adj*x.qty).toLocaleString()} ⚜</span></td>
                    <td style={S.td}><button style={S.btnD} onClick={()=>remRow(x.matId)}>Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{marginTop:16,padding:"12px 16px",background:"#0d0a04",borderRadius:4,border:"1px solid #c8a951",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:"#9a8060",fontSize:13}}>{rows.reduce((s,x)=>s+x.qty,0)} units</span>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,color:"#9a8060",marginBottom:2}}>Total Earnings</div>
              <div style={{fontSize:24,color:"#c8a951",fontWeight:"bold"}}>{total.toLocaleString()} ⚜</div>
            </div>
          </div>
          <div style={{marginTop:10,display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button style={S.btnG} onClick={exportCalc}>⬇ Export</button>
            <button style={S.btnD} onClick={()=>setRows([])}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GENERAL STORE ───────────────────────────────────────────────────────────
function GeneralStoreTab({materials,items,margin}){
  const [matCart,setMatCart]=useState([]);
  const [itemCart,setItemCart]=useState([]);
  const [matPick,setMatPick]=useState({matId:"",qty:1});
  const [itemPick,setItemPick]=useState({profession:"blacksmith",itemId:"",qty:1});
  const [location,setLocation]=useState("");

  const calcItemCost=(item,loc)=>item.ingredients.reduce((s,ing)=>{const mat=materials.find(m=>m.id===ing.matId);return s+(mat?getMatPrice(mat,loc,"buy")*ing.qty:0);},0);
  const getMatBuy=(row)=>{const mat=materials.find(m=>m.id===row.matId);return mat?getMatPrice(mat,location,"buy"):0;};
  const getItemPrice=(x)=>Math.ceil(calcItemCost({ingredients:x.ingredients},location)*(1+margin/100));

  const addMatToCart=()=>{
    if(!matPick.matId)return;
    const mat=materials.find(m=>m.id===parseInt(matPick.matId));
    if(!mat)return;
    setMatCart(c=>c.some(x=>x.matId===mat.id)?c.map(x=>x.matId===mat.id?{...x,qty:x.qty+parseInt(matPick.qty||1)}:x):[...c,{matId:mat.id,matName:mat.name,qty:parseInt(matPick.qty)||1}]);
    setMatPick(p=>({...p,matId:"",qty:1}));
  };

  const addItemToCart=()=>{
    if(!itemPick.itemId)return;
    const profItems=items[itemPick.profession]||[];
    const item=profItems.find(i=>i.id===parseInt(itemPick.itemId));
    if(!item)return;
    const uid=`${itemPick.profession}-${item.id}`;
    setItemCart(c=>c.some(x=>x.uid===uid)?c.map(x=>x.uid===uid?{...x,qty:x.qty+parseInt(itemPick.qty||1)}:x):[...c,{uid,profession:itemPick.profession,itemId:item.id,itemName:item.name,ingredients:item.ingredients,qty:parseInt(itemPick.qty)||1}]);
    setItemPick(p=>({...p,itemId:"",qty:1}));
  };

  const matTotal=matCart.reduce((s,x)=>s+getMatBuy(x)*x.qty,0);
  const itemTotal=itemCart.reduce((s,x)=>s+getItemPrice(x)*x.qty,0);
  const grandTotal=matTotal+itemTotal;
  const profItemsForPick=items[itemPick.profession]||[];

  const exportCart=()=>{
    if(!matCart.length&&!itemCart.length)return;
    downloadCSV("keizaal_general_store.csv",[...matCart.map(x=>{const bp=getMatBuy(x);return["Material",x.matName,bp,x.qty,bp*x.qty,location||"Base"];}), ...itemCart.map(x=>{const sp=getItemPrice(x);return[PROF_LABELS[x.profession]+" Item",x.itemName,sp,x.qty,sp*x.qty,location||"Base"];}),["","TOTAL","","",grandTotal,""]],["Type","Name","Unit Price","Qty","Subtotal","Location"]);
  };

  return(
    <div>
      <div style={{fontSize:20,color:"#c8a951",marginBottom:16}}>🏪 General Store</div>
      <LocationFilter value={location} onChange={setLocation} label="Buying Location"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={S.card}>
          <div style={S.h2}>🧱 Add Materials</div>
          <div style={{marginBottom:10}}><label style={S.lbl}>Material</label>
            <select style={S.sel} value={matPick.matId} onChange={e=>setMatPick(p=>({...p,matId:e.target.value}))}>
              <option value="">-- Select --</option>
              {materials.map(m=><option key={m.id} value={m.id}>{m.name} — {getMatPrice(m,location,"buy")}⚜</option>)}
            </select>
          </div>
          <div style={{marginBottom:10}}><label style={S.lbl}>Quantity</label><input style={S.inp} type="number" min="1" value={matPick.qty} onChange={e=>setMatPick(p=>({...p,qty:e.target.value}))}/></div>
          <button style={S.btn} onClick={addMatToCart}>Add to List</button>
        </div>
        <div style={S.card}>
          <div style={S.h2}>⚒ Add Crafted Items</div>
          <div style={{marginBottom:10}}><label style={S.lbl}>Profession</label>
            <select style={S.sel} value={itemPick.profession} onChange={e=>setItemPick(p=>({...p,profession:e.target.value,itemId:""}))}>
              {CRAFTER_TABS.map(p=><option key={p} value={p}>{PROF_ICONS[p]} {PROF_LABELS[p]}</option>)}
            </select>
          </div>
          <div style={{marginBottom:10}}><label style={S.lbl}>Item</label>
            <select style={S.sel} value={itemPick.itemId} onChange={e=>setItemPick(p=>({...p,itemId:e.target.value}))}>
              <option value="">-- Select Item --</option>
              {profItemsForPick.map(item=><option key={item.id} value={item.id}>{item.name} — {Math.ceil(calcItemCost(item,location)*(1+margin/100))}⚜</option>)}
            </select>
          </div>
          <div style={{marginBottom:10}}><label style={S.lbl}>Quantity</label><input style={S.inp} type="number" min="1" value={itemPick.qty} onChange={e=>setItemPick(p=>({...p,qty:e.target.value}))}/></div>
          <button style={S.btn} onClick={addItemToCart}>Add to List</button>
        </div>
      </div>

      {(matCart.length>0||itemCart.length>0)&&(
        <div style={S.card}>
          <div style={S.h2}>Shopping List{location?` — 📍 ${location}`:""}</div>
          {matCart.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,color:"#c8a951",marginBottom:8}}>🧱 Materials</div>
              <table style={S.tbl}>
                <thead><tr><th style={S.th}>Material</th><th style={S.th}>Buy (each)</th><th style={S.th}>Qty</th><th style={S.th}>Subtotal</th><th style={S.th}></th></tr></thead>
                <tbody>{matCart.map(x=>{const bp=getMatBuy(x);return(<tr key={x.matId}><td style={S.td}>{x.matName}</td><td style={S.td}>{bp.toLocaleString()} ⚜</td><td style={S.td}><input style={{...S.inp,width:70}} type="number" min="1" value={x.qty} onChange={e=>setMatCart(c=>c.map(r=>r.matId===x.matId?{...r,qty:Math.max(1,parseInt(e.target.value)||1)}:r))}/></td><td style={S.td}><span style={{color:"#e8a030"}}>{(bp*x.qty).toLocaleString()} ⚜</span></td><td style={S.td}><button style={S.btnD} onClick={()=>setMatCart(c=>c.filter(r=>r.matId!==x.matId))}>Remove</button></td></tr>);})}</tbody>
              </table>
            </div>
          )}
          {itemCart.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,color:"#c8a951",marginBottom:8}}>⚒ Crafted Items</div>
              <table style={S.tbl}>
                <thead><tr><th style={S.th}>Item</th><th style={S.th}>Profession</th><th style={S.th}>Price (each)</th><th style={S.th}>Qty</th><th style={S.th}>Subtotal</th><th style={S.th}></th></tr></thead>
                <tbody>{itemCart.map(x=>{const sp=getItemPrice(x);return(<tr key={x.uid}><td style={S.td}>{x.itemName}</td><td style={S.td}><span style={{fontSize:12,color:TAB_COLORS[x.profession]||"#9a8060"}}>{PROF_ICONS[x.profession]} {PROF_LABELS[x.profession]}</span></td><td style={S.td}><span style={{color:"#c8a951"}}>{sp.toLocaleString()} ⚜</span></td><td style={S.td}><input style={{...S.inp,width:70}} type="number" min="1" value={x.qty} onChange={e=>setItemCart(c=>c.map(r=>r.uid===x.uid?{...r,qty:Math.max(1,parseInt(e.target.value)||1)}:r))}/></td><td style={S.td}><span style={{color:"#e8a030"}}>{(sp*x.qty).toLocaleString()} ⚜</span></td><td style={S.td}><button style={S.btnD} onClick={()=>setItemCart(c=>c.filter(r=>r.uid!==x.uid))}>Remove</button></td></tr>);})}</tbody>
              </table>
            </div>
          )}
          <div style={{padding:"12px 16px",background:"#0d0a04",borderRadius:4,border:"1px solid #c8a951",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:"#9a8060",fontSize:13}}>{matCart.reduce((s,x)=>s+x.qty,0)+itemCart.reduce((s,x)=>s+x.qty,0)} total units</span>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,color:"#9a8060",marginBottom:2}}>Grand Total</div>
              <div style={{fontSize:24,color:"#c8a951",fontWeight:"bold"}}>{grandTotal.toLocaleString()} ⚜</div>
            </div>
          </div>
          <div style={{marginTop:10,display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button style={S.btnG} onClick={exportCart}>⬇ Export</button>
            <button style={S.btnD} onClick={()=>{setMatCart([]);setItemCart([]);}}>Clear All</button>
          </div>
        </div>
      )}
      {matCart.length===0&&itemCart.length===0&&<div style={{textAlign:"center",color:"#5a4010",padding:32,fontSize:13}}>Your shopping list is empty.</div>}
    </div>
  );
}
