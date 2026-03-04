import { useState, useEffect } from 'react';
import { VEHICLE_TYPES, HAZARD_VEHICLE_MAP } from '../DispatchEngine';

const TC = { CRITICAL:'#ff3a5c', HIGH:'#ff8c00', MODERATE:'#f0c040', LOW:'#00ff9d' };

function ProgressBar({ d, onCancel }) {
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { const t = setInterval(()=>setNow(Date.now()),250); return()=>clearInterval(t); },[]);
  const v = VEHICLE_TYPES[d.vehicleKey] || {};
  let pct=0, label='', color=v.color||'#00d4ff', timeLeft='';
  if (d.status==='en_route') {
    pct = Math.min(1,(now-d.departedAt)/d.travelMs);
    const rem = Math.max(0,Math.ceil((d.travelMs-(now-d.departedAt))/1000));
    label='EN ROUTE'; timeLeft=rem>0?`${rem}s`:'arriving...'; color='#f97316';
  } else if (d.status==='on_scene') {
    label='ON SCENE'; timeLeft='working'; color='#00ff9d'; pct=1;
  } else if (d.status==='returning') {
    pct = Math.min(1,(now-(d.returnDepartedAt||now))/(d.returnMs||d.travelMs));
    const rem = Math.max(0,Math.ceil(((d.returnMs||d.travelMs)-(now-(d.returnDepartedAt||now)))/1000));
    label='RTB'; timeLeft=rem>0?`${rem}s`:'landing...'; color='#6b7280';
  }
  const canCancel = onCancel && d.isAutoDispatch && (d.status==='en_route' || d.status==='on_scene');
  return (
    <div style={{background:'rgba(0,180,255,0.04)',border:`1px solid ${confirming?'rgba(255,58,92,0.4)':'rgba(0,180,255,0.1)'}`,borderRadius:'8px',padding:'8px 10px',marginBottom:'5px',transition:'border 0.2s'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <span style={{fontSize:'13px'}}>{v.icon}</span>
          <div>
            <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'8px',color,fontWeight:600}}>{d.id}{d.isAutoDispatch?' 🤖':' 👤'}</div>
            <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'7px',color:'#2a4a6a'}}>{d.zoneName}</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'7px',color,letterSpacing:'0.1em'}}>{label}</div>
            <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'7px',color:'#1a3a54'}}>{timeLeft}</div>
          </div>
          {canCancel && !confirming && (
            <button onClick={()=>setConfirming(true)} title="Cancel AI dispatch" style={{background:'rgba(255,58,92,0.08)',border:'1px solid rgba(255,58,92,0.25)',borderRadius:'5px',padding:'3px 7px',color:'#ff3a5c',fontSize:'9px',cursor:'pointer',fontFamily:'IBM Plex Mono,monospace',lineHeight:1,flexShrink:0}}>✕</button>
          )}
          {canCancel && confirming && (
            <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
              <span style={{fontFamily:'IBM Plex Mono,monospace',fontSize:'7px',color:'#ff3a5c'}}>Recall?</span>
              <button onClick={()=>{onCancel(d.id);setConfirming(false);}} style={{background:'rgba(255,58,92,0.15)',border:'1px solid rgba(255,58,92,0.5)',borderRadius:'5px',padding:'3px 8px',color:'#ff3a5c',fontSize:'8px',cursor:'pointer',fontFamily:'IBM Plex Mono,monospace',fontWeight:700}}>YES</button>
              <button onClick={()=>setConfirming(false)} style={{background:'rgba(0,180,255,0.08)',border:'1px solid rgba(0,180,255,0.2)',borderRadius:'5px',padding:'3px 8px',color:'#2a6080',fontSize:'8px',cursor:'pointer',fontFamily:'IBM Plex Mono,monospace'}}>NO</button>
            </div>
          )}
        </div>
      </div>
      <div style={{height:'2px',background:'rgba(0,180,255,0.08)',borderRadius:'1px'}}>
        <div style={{height:'100%',width:`${pct*100}%`,background:color,borderRadius:'1px',transition:'width 0.25s linear'}}/>
      </div>
    </div>
  );
}

export default function CommandCenter({ zones=[], dispatches=[], aiMode, setAiMode, aiThoughts=[], onDispatch, cancelDispatch }) {
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [tab, setTab] = useState('dispatch');

  const active = dispatches.filter(d=>d.status!=='returned');
  const aiActive = active.filter(d=>d.isAutoDispatch);
  const humanActive = active.filter(d=>!d.isAutoDispatch);
  const suggested = selectedZone ? (HAZARD_VEHICLE_MAP[selectedZone.hazard_type]||[]) : [];

  const handleDispatch = () => {
    if (!selectedZone||!selectedVehicle) return;
    onDispatch(selectedZone, selectedVehicle, false);
    setSelectedZone(null); setSelectedVehicle(null);
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',fontFamily:'IBM Plex Mono,monospace',background:'rgba(3,6,14,0.8)'}}>

      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:'1px solid rgba(0,180,255,0.1)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <div style={{width:'5px',height:'5px',borderRadius:'50%',background:aiMode?'#00ff9d':'#ff3a5c',boxShadow:aiMode?'0 0 8px #00ff9d':'none'}}/>
          <span style={{fontSize:'9px',color:'#1a4060',letterSpacing:'0.16em'}}>COMMAND CENTER</span>
        </div>
        <div onClick={()=>setAiMode(m=>!m)} style={{display:'flex',alignItems:'center',gap:'7px',background:aiMode?'rgba(0,255,157,0.08)':'rgba(255,58,92,0.06)',border:`1px solid ${aiMode?'rgba(0,255,157,0.3)':'rgba(255,58,92,0.2)'}`,borderRadius:'20px',padding:'4px 14px',cursor:'pointer',userSelect:'none',transition:'all 0.3s'}}>
          <div style={{width:'7px',height:'7px',borderRadius:'50%',background:aiMode?'#00ff9d':'#ff3a5c',transition:'background 0.3s'}}/>
          <span style={{fontSize:'8px',color:aiMode?'#00ff9d':'#ff3a5c',letterSpacing:'0.12em',fontWeight:600}}>AI {aiMode?'ON':'OFF'}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1px',background:'rgba(0,180,255,0.05)',flexShrink:0}}>
        {[{l:'AI UNITS',v:aiActive.length,c:aiActive.length>0?'#a78bfa':'#2a4a6a'},{l:'MANUAL',v:humanActive.length,c:humanActive.length>0?'#f97316':'#2a4a6a'},{l:'TOTAL',v:active.length,c:active.length>0?'#00d4ff':'#2a4a6a'}].map(({l,v,c})=>(
          <div key={l} style={{padding:'8px 12px',background:'rgba(8,16,40,0.6)',textAlign:'center'}}>
            <div style={{fontSize:'18px',fontWeight:800,color:c,lineHeight:1}}>{v}</div>
            <div style={{fontSize:'6.5px',color:'#1a3050',letterSpacing:'0.12em',marginTop:'3px'}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'2px',padding:'6px 10px',borderBottom:'1px solid rgba(0,180,255,0.08)',flexShrink:0}}>
        {[{id:'dispatch',l:'DISPATCH'},{id:'thoughts',l:'AI LOG'},{id:'zones',l:'ZONES'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'4px',background:tab===t.id?'rgba(0,180,255,0.1)':'transparent',border:tab===t.id?'1px solid rgba(0,180,255,0.2)':'1px solid transparent',borderRadius:'6px',color:tab===t.id?'#00d4ff':'#1a3a54',fontSize:'7.5px',cursor:'pointer',letterSpacing:'0.1em',transition:'all 0.15s'}}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'10px'}}>

        {tab==='dispatch'&&(<>
          {active.length>0&&(
            <div style={{marginBottom:'12px'}}>
              <div style={{fontSize:'7px',color:'#1a3a54',letterSpacing:'0.14em',marginBottom:'6px'}}>ACTIVE UNITS</div>
              {active.map(d=><ProgressBar key={d.id} d={d} onCancel={cancelDispatch}/>)}
            </div>
          )}
          <div style={{borderTop:active.length?'1px solid rgba(0,180,255,0.08)':'none',paddingTop:active.length?'10px':0}}>
            <div style={{fontSize:'7px',color:'#1a3a54',letterSpacing:'0.14em',marginBottom:'8px'}}>👤 MANUAL DISPATCH</div>
            <div style={{fontSize:'7px',color:'#1a3a54',marginBottom:'5px'}}>SELECT ZONE</div>
            <div style={{display:'flex',flexDirection:'column',gap:'3px',marginBottom:'10px',maxHeight:'130px',overflowY:'auto'}}>
              {zones.map(z=>{
                const tc=TC[z.threat_label]||'#22c55e';
                const sel=selectedZone?.zone_id===z.zone_id;
                return (
                  <div key={z.zone_id} onClick={()=>{setSelectedZone(z);setSelectedVehicle(null);}} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 8px',background:sel?`${tc}15`:'rgba(0,180,255,0.03)',border:sel?`1px solid ${tc}50`:'1px solid rgba(0,180,255,0.08)',borderRadius:'6px',cursor:'pointer',transition:'all 0.15s'}}>
                    <span style={{fontSize:'8px',color:sel?tc:'#4a7090'}}>{z.name}</span>
                    <span style={{fontSize:'7px',color:tc,background:`${tc}18`,padding:'1px 5px',borderRadius:'3px'}}>{z.threat_label}</span>
                  </div>
                );
              })}
            </div>
            {selectedZone&&(<>
              <div style={{fontSize:'7px',color:'#1a3a54',marginBottom:'5px'}}>SELECT UNIT {suggested.length>0&&<span style={{color:'#00d4ff'}}>★ = recommended</span>}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px',marginBottom:'10px'}}>
                {Object.entries(VEHICLE_TYPES).map(([vk,v])=>{
                  const sel=selectedVehicle===vk;
                  const rec=suggested.includes(vk);
                  return (
                    <div key={vk} onClick={()=>setSelectedVehicle(vk)} style={{padding:'6px 8px',background:sel?`${v.color}18`:'rgba(0,180,255,0.03)',border:sel?`1px solid ${v.color}`:`1px solid ${rec?'rgba(0,212,255,0.25)':'rgba(0,180,255,0.08)'}`,borderRadius:'7px',cursor:'pointer',position:'relative',transition:'all 0.15s'}}>
                      {rec&&<div style={{position:'absolute',top:'2px',right:'4px',fontSize:'7px',color:'#00d4ff'}}>★</div>}
                      <div style={{fontSize:'14px',marginBottom:'2px'}}>{v.icon}</div>
                      <div style={{fontSize:'7.5px',color:sel?v.color:'#4a7090',fontWeight:sel?600:400}}>{v.label}</div>
                      <div style={{fontSize:'6.5px',color:'#1a3050',marginTop:'1px'}}>−{v.severityReduction} SEV</div>
                    </div>
                  );
                })}
              </div>
              <button onClick={handleDispatch} disabled={!selectedVehicle} style={{width:'100%',padding:'9px',background:selectedVehicle?'rgba(0,180,255,0.1)':'rgba(0,180,255,0.03)',border:selectedVehicle?'1px solid rgba(0,180,255,0.3)':'1px solid rgba(0,180,255,0.08)',borderRadius:'8px',color:selectedVehicle?'#00d4ff':'#1a3a54',fontSize:'8px',letterSpacing:'0.12em',cursor:selectedVehicle?'pointer':'not-allowed',fontFamily:'IBM Plex Mono,monospace',fontWeight:600,transition:'all 0.15s'}}>
                {selectedVehicle?`▶ DISPATCH ${VEHICLE_TYPES[selectedVehicle]?.icon} → ${selectedZone.name}`:'SELECT A UNIT'}
              </button>
            </>)}
          </div>
        </>)}

        {tab==='thoughts'&&(
          <div>
            <div style={{fontSize:'7px',color:'#1a3a54',letterSpacing:'0.14em',marginBottom:'8px',display:'flex',alignItems:'center',gap:'6px'}}>
              <div style={{width:'5px',height:'5px',borderRadius:'50%',background:aiMode?'#00ff9d':'#ff3a5c'}}/>AI DECISION LOG
            </div>
            {(!aiThoughts||aiThoughts.length===0)&&(
              <div style={{padding:'24px',textAlign:'center',color:'#1a3a54',fontSize:'8px',border:'1px dashed rgba(0,180,255,0.1)',borderRadius:'8px'}}>Waiting for AI activity...</div>
            )}
            {(aiThoughts||[]).map((t,i)=>{
              const c=t.includes('⚠')?'#ff8c00':t.includes('👤')?'#f97316':t.includes('✓')?'#00ff9d':t.includes('🤖')?'#a78bfa':'#2a4a6a';
              return (
                <div key={i} style={{padding:'6px 8px',background:'rgba(0,180,255,0.03)',border:'1px solid rgba(0,180,255,0.07)',borderLeft:`2px solid ${c}`,borderRadius:'5px',marginBottom:'4px'}}>
                  <div style={{fontSize:'7.5px',color:c,lineHeight:1.5}}>{t}</div>
                </div>
              );
            })}
          </div>
        )}

        {tab==='zones'&&(
          <div>
            <div style={{fontSize:'7px',color:'#1a3a54',letterSpacing:'0.14em',marginBottom:'8px'}}>ZONE STATUS</div>
            {zones.map(z=>{
              const tc=TC[z.threat_label]||'#22c55e';
              const zd=active.filter(d=>d.zoneId===z.zone_id);
              return (
                <div key={z.zone_id} style={{padding:'8px 10px',background:'rgba(0,180,255,0.03)',border:`1px solid ${tc}20`,borderLeft:`2px solid ${tc}`,borderRadius:'7px',marginBottom:'5px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'3px'}}>
                    <span style={{fontSize:'9px',color:tc,fontWeight:600}}>{z.name}</span>
                    <span style={{fontSize:'7px',color:tc,background:`${tc}15`,padding:'1px 6px',borderRadius:'3px'}}>{z.threat_label}</span>
                  </div>
                  <div style={{display:'flex',gap:'8px',fontSize:'7.5px',color:'#2a4060',marginBottom:zd.length?'4px':0}}>
                    <span>SEV {(z.severity_level||0).toFixed(1)}</span>
                    <span>PRI {((z.priority||0)*100).toFixed(0)}%</span>
                    <span>{((z.population_at_risk||0)/1000).toFixed(0)}K</span>
                  </div>
                  {zd.length>0&&<div style={{display:'flex',gap:'4px'}}>{zd.map(d=><span key={d.id} style={{fontSize:'12px'}}>{VEHICLE_TYPES[d.vehicleKey]?.icon}</span>)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
