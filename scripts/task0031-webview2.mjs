// Real WebView2 + CDP input. No simulated DOM, alternate renderer or product data source.
import assert from "node:assert/strict";
import {writeFile, rename, stat, realpath} from "node:fs/promises";
import {setTimeout as pause} from "node:timers/promises";
const port=Number(process.argv[2]); const variant=process.argv[3];
assert(/^task0031-[a-f0-9]+$/.test(variant));
let target;
for(let n=0;n<100;n++) {
  try {const pages=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target=pages.find(p=>p.type==="page"); if(target) break;} catch {}
  await pause(200);
}
assert(target,"WebView2 CDP page unavailable");
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener("open",resolve,{once:true});ws.addEventListener("error",reject,{once:true});});
let serial=0; const pending=new Map(); const fatal=[];
ws.addEventListener("message",({data})=>{const event=JSON.parse(data); if(event.id){const p=pending.get(event.id);pending.delete(event.id);if(event.error)p?.reject(new Error(JSON.stringify(event.error)));else p?.resolve(event.result);}else if(event.method==="Runtime.exceptionThrown" || event.method==="Log.entryAdded" && event.params.entry.level==="error") fatal.push(event);});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const r=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);return r.result.value;}
async function until(expression,limit=180000){const start=Date.now();while(Date.now()-start<limit){if(await evaluate(expression))return;await pause(100);}throw new Error(`timeout: ${expression}`);}
const invoke=(command,args={})=>evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(command)},${JSON.stringify(args)})`);
await send("Runtime.enable");await send("Log.enable");
await until(`document.querySelector('[data-testid="lifecycle-open"]') && !document.querySelector('[data-testid="lifecycle-open"]').disabled`);
await evaluate(`window.task0031Keys=[];document.addEventListener('keydown',e=>window.task0031Keys.push({key:e.key,trusted:e.isTrusted}),true)`);
async function key(key,modifiers=0){
  const code=key==="Enter"?"Enter":key.startsWith("Arrow")?key:key==="Home"?"Home":undefined;
  const vk=key==="Enter"?13:key==="ArrowRight"?39:key==="Home"?36:0;
  await send("Input.dispatchKeyEvent",{type:"keyDown",key,code,modifiers,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,...(key==="Enter"?{text:"\r",unmodifiedText:"\r"}:{})});
  await send("Input.dispatchKeyEvent",{type:"keyUp",key,code,modifiers,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk});await pause(120);
}
async function activate(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await key("Enter");}
const world=()=>evaluate(`document.querySelector('[data-testid="composed-world"]').getAttribute('transform')`);
const active=()=>evaluate(`document.querySelector('[role="tree"]').getAttribute('aria-activedescendant')`);
async function measure(brainId) {
  const view=await invoke("map_view",{brainId});
  const counts=await evaluate(`(()=>{const t=document.querySelector('.map-territory[data-brain-id="${brainId}"]');return {nodes:t.querySelectorAll('[role="treeitem"]').length,aggregates:t.querySelectorAll('[data-aggregate]').length,edges:t.querySelectorAll('.map-hierarchy-edge').length,svgElements:t.querySelectorAll('*').length};})()`);
  assert.equal(counts.nodes,view.materializedCount);assert.equal(counts.aggregates,view.aggregates.length);assert.equal(counts.edges,view.hierarchyEdges.length);assert(counts.nodes+counts.aggregates<=view.viewBudget);
  await evaluate(`document.querySelector('[role="tree"]').focus()`);
  await key("Home");const previous=await active();let start=performance.now();await key("ArrowRight");await until(`document.querySelector('[role="tree"]').getAttribute('aria-activedescendant')!==${JSON.stringify(previous)}`);const selectionMs=performance.now()-start;
  const beforeZoom=await world();start=performance.now();for(let i=0;i<6;i++)await key("+");const zoomMs=performance.now()-start;assert.notEqual(await world(),beforeZoom);
  const beforePan=await world();start=performance.now();await key("ArrowRight",1);const panMs=performance.now()-start;assert.notEqual(await world(),beforePan);
  await key("r");
  return {brainId,indexed:view.nodeCount,materialized:view.materializedCount,nonMaterialized:view.nonMaterializedCount,budget:view.viewBudget,payloadBytes:Buffer.byteLength(JSON.stringify(view)),...counts,selectionMs,zoomMs,panMs,panChanged:true,zoomChanged:true,selectionChanged:true};
}
const sourceRoot=`.filetopo-sandbox/variants/${variant}/fixtures/quasi-empty`;
assert.equal(await stat(sourceRoot).then(()=>true,()=>false),false,"opening must not prepare source");
const notBuilt=await evaluate(`window.__TAURI_INTERNALS__.invoke('map_open',{brainId:'brain-alpha'}).then(()=>null,e=>String(e))`);
assert.match(notBuilt,/map_not_built/);
assert.equal(await stat(`.filetopo-sandbox/variants/${variant}/brains/brain-alpha/map/index.sqlite`).then(()=>true,()=>false),false);
await activate('[data-testid="lifecycle-prepare"]');
await until(`!document.querySelector('[data-testid="lifecycle-prepare"]').disabled`);
await activate('[data-testid="lifecycle-refresh"]');
await until(`document.querySelectorAll('[role="treeitem"]').length === 12 && !document.querySelector('[data-testid="lifecycle-open"]').disabled`);
const initial=await invoke("map_open",{brainId:"brain-alpha"});
const actionEvidence={};
for (const action of ["open","refresh","rebuild"]) {
  const before=await invoke("map_open",{brainId:"brain-alpha"});
  await activate(`[data-testid="lifecycle-${action}"]`);
  await until(`!document.querySelector('[data-testid="lifecycle-open"]').disabled`);
  const after=await invoke("map_open",{brainId:"brain-alpha"});
  assert.equal(after.indexId,before.indexId);
  assert.equal(after.revision,before.revision+(action==="open"?0:1));
  actionEvidence[action]={buttonActivatedByTrustedKey:true,beforeRevision:before.revision,afterRevision:after.revision,indexIdUnchanged:after.indexId===before.indexId};
}
const beforeOffline=await invoke("map_open",{brainId:"brain-alpha"});
const viewBeforeOffline=await invoke("map_view",{brainId:"brain-alpha"});
// Both paths are fixed under this newly-created repository sandbox; restore even on failure.
const fixtureBoundary=await realpath(`.filetopo-sandbox/variants/${variant}/fixtures`);
const originalSource=await realpath(sourceRoot);
assert(originalSource.startsWith(fixtureBoundary));
const heldSource=fixtureBoundary+"/task0031-held-source";
assert.equal(await stat(heldSource).then(()=>true,()=>false),false);
async function renameWithRetry(from,to) {
  for(let attempt=0;;attempt++) {
    try { await rename(from,to); return; }
    catch(error) { if(attempt>=20 || !["EPERM","EBUSY"].includes(error.code))throw error; await pause(100); }
  }
}
await renameWithRetry(originalSource,heldSource);
try {
  await activate('[data-testid="lifecycle-open"]');
  await until(`!document.querySelector('[data-testid="lifecycle-open"]').disabled`);
  assert.deepEqual(await invoke("map_open",{brainId:"brain-alpha"}),beforeOffline);
  assert.deepEqual(await invoke("map_view",{brainId:"brain-alpha"}),viewBeforeOffline);
  await activate('[data-testid="lifecycle-refresh"]');
  await until(`document.body.textContent.includes('Le dernier index enregistré reste disponible')`);
  assert.deepEqual(await invoke("map_open",{brainId:"brain-alpha"}),beforeOffline);
  assert.equal(await stat(originalSource).then(()=>true,()=>false),false);
} finally { await renameWithRetry(heldSource,originalSource); }
const host=await invoke("map_host_info");
const small=await measure("brain-alpha");assert.equal(small.indexed,12);
await invoke("map_prepare_synthetic_source",{brainId:"brain-beta"});
await invoke("map_refresh",{brainId:"brain-beta"});
await activate('[data-testid="composition-add-trigger"]');
await until(`!!document.querySelector('[data-testid="composition-add-item-brain-beta"]')`);
await activate('[data-testid="composition-add-item-brain-beta"]');
await until(`document.querySelectorAll('.map-territory[data-brain-id="brain-beta"] [role="treeitem"]').length > 0`);
await activate('[data-testid="composition-chip-brain-beta"]');
const large=await measure("brain-beta");assert.equal(large.indexed,6001);
const first=await invoke("map_view",{brainId:"brain-beta"});
await activate('[data-testid="expand-aggregate"]');
await until(`!document.querySelector('.map-territory[data-brain-id="brain-beta"] [data-node-id="${first.nodes[1].id}"]')`);
const cursor=first.aggregates[0].nextCursor;
const second=await invoke("map_view",{brainId:"brain-beta",focusId:first.rootId,after:cursor});
assert(second.nodes.slice(1).every(n=>!first.nodes.some(p=>p.id===n.id)));
const observedIds=await evaluate(`Array.from(document.querySelectorAll('.map-territory[data-brain-id="brain-beta"] [role="treeitem"]')).map(n=>Number(n.dataset.nodeId))`);
assert.deepEqual(observedIds,second.nodes.map(n=>n.id));
const screenshot=await send("Page.captureScreenshot",{format:"png"});
await writeFile(`.filetopo-sandbox/${variant}/projection.png`,Buffer.from(screenshot.data,"base64"));
const keys=await evaluate("window.task0031Keys");assert(keys.length>0 && keys.every(k=>k.trusted));
assert.equal(fatal.length,0,"fatal page/console errors");
const after=await invoke("map_integrity",{brainId:"brain-beta"});assert.equal(after.filetopoArtifacts.length,0);
const artifact={task:"TASK-0031",status:"NONCANONICAL_ENGINEERING_EVIDENCE",engine:"Windows Tauri / real WebView2",webviewVersion:host.webviewVersion,tauriVersion:host.tauriVersion,sqliteVersion:host.sqliteVersion,source:"explicit map_refresh -> canonical Index -> read-only map_open -> map_view -> MapApp/MapView",lifecycle:{notBuilt:true,sourceAbsentOpen:true,failedRefreshPreservesIndex:true,identityPreserved:true,revisionAdvancesOnlyOnPublication:true,actionEvidence,initialRevision:initial.revision,finalAlphaRevision:beforeOffline.revision},small,large,progressiveNavigation:{pageReplaced:true,noDuplicatePageMembers:true,domMatchesProductPage:true},trustedKeydowns:keys.length,fatalConsoleErrors:fatal.length,sourceArtifacts:after.filetopoArtifacts,limits:["Development workstation; not a modest-laptop acceptance test", "No GPU-disabled claim", "100k product DTO is covered by Rust and jsdom; this WebView2 pass uses 6001 physically scanned synthetic nodes", "Gesture timings include deliberate CDP settling waits; not renderer latency benchmarks"]};
await writeFile("docs/performance/runs/TASK-0031-webview2.json",JSON.stringify(artifact,null,2)+"\n");
console.log(JSON.stringify(artifact));
ws.close();
