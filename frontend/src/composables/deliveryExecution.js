// A stage contains only orders waiting at that stage. Missing timestamps stay unknown.
export const stageNames=['请购','采购下单','供应商确认','送货/运输','收货检验','入库'];
export const demoStageLimits=[2,1,2,5,1,1];
const stamp=value=>{
  if(!value)return null;
  const time=new Date(String(value).replace(' ','T')).getTime();
  return Number.isFinite(time)?time:null;
};
const earliest=values=>values.filter(x=>stamp(x)!=null).sort((a,b)=>stamp(a)-stamp(b))[0]||null;
const latest=values=>values.filter(x=>stamp(x)!=null).sort((a,b)=>stamp(b)-stamp(a))[0]||null;
const count=rows=>new Set(rows.map(x=>x.id)).size;
export function buildDeliveryExecution(flow,start,end,asOf=new Date()){
  const inRange=date=>Boolean(date)&&(!start||date.slice(0,10)>=start)&&(!end||date.slice(0,10)<=end);
  const orders=(flow.rawOrders||[]).filter(x=>inRange(x.order_date)),groups=new Map();
  for(const x of orders){if(!groups.has(x.order_id))groups.set(x.order_id,[]);groups.get(x.order_id).push(x);}
  const records=[];
  for(const [id,lines] of groups){
    const notes=(flow.deliveryNotes||[]).filter(x=>x.order_id===id),receipts=(flow.receipts||[]).filter(x=>x.order_id===id),entries=(flow.warehouseEntries||[]).filter(x=>x.order_id===id);
    const confirmation=(flow.confirmations||[]).find(x=>x.order_id===id&&x.status==='已确认');
    // Material + supplier alone cannot prove which order a quality batch belongs to.
    const inspections=(flow.quality||[]).filter(x=>x.order_id===id||receipts.some(r=>x.receipt_id&&x.receipt_id===r.receipt_id));
    const qty=lines.reduce((s,x)=>s+(Number(x.order_quantity)||0),0),entered=entries.reduce((s,x)=>s+(Number(x.quantity)||0),0);
    const complete=lines.every(x=>['已完成','已入库'].includes(x.status))||(qty>0&&entered>=qty);
    const ordered=earliest(lines.map(x=>x.order_date)),confirmed=confirmation||lines.some(x=>['已接受','已受理'].includes(x.acceptance_status)||x.status==='已受理');
    const arrived=latest([...receipts.map(x=>x.arrived_at),...notes.filter(x=>Number(x.received_quantity)>0).map(x=>x.received_at),...lines.map(x=>x.actual_delivery_date)]);
    const hasReceipt=Boolean(arrived)||receipts.length>0||notes.some(x=>Number(x.received_quantity)>0);
    const shipped=notes.length>0||lines.some(x=>['交货中','部分交付'].includes(x.status));
    const inspected=inspections.some(x=>['合格','不合格','退货','让步接收'].includes(x.conclusion));
    const stage=complete?-1:inspected?5:hasReceipt?4:shipped||confirmed?3:2;
    const stageStart=stage===2?ordered:stage===3?(shipped?earliest(notes.map(x=>x.shipped_at)):confirmation?.confirmed_at):stage===4?arrived:stage===5?latest(inspections.map(x=>x.inspection_date)):null;
    const dwell=stamp(stageStart)!=null?Math.max(0,(asOf.getTime()-stamp(stageStart))/86400000):null;
    const expected=earliest(lines.map(x=>x.expected_delivery_date));
    const actual=lines.every(x=>x.actual_delivery_date)?latest(lines.map(x=>x.actual_delivery_date)):null;
    const late=stamp(expected)!=null?Math.max(0,Math.floor(((stamp(actual)??asOf.getTime())-stamp(expected))/86400000)):null;
    const state=complete?'已完成':stage===2?'待确认':stage===3?(shipped?'已发货/在途':'待发货'):stage===4?'待检验':'待入库';
    records.push({id,lines,supplierId:lines[0].supplier_id,stage,state,dwell,expected,actual,late,complete,arrived,stageStart,
      overtime:stage>=0&&dwell!=null?dwell>demoStageLimits[stage]:null,
      risk:lines.some(x=>['高','中'].includes(x.risk_level)),shipped,
      deadlineExceeded:!complete&&!actual&&late>0,
      shipmentLate:notes.some(x=>x.status==='延迟发货'),
      inspectionIssue:inspections.some(x=>['不合格','退货','让步接收'].includes(x.conclusion))});
  }
  // Requisitions without an order must remain visible too, filtered by creation date.
  for(const req of flow.requisitions||[]){
    if(!inRange(req.created_at)||req.status==='已执行'||groups.has(req.order_id))continue;
    const dwell=stamp(req.created_at)!=null?Math.max(0,(asOf.getTime()-stamp(req.created_at))/86400000):null;
    records.push({id:req.requisition_id,lines:[],supplierId:req.supplier_id,stage:0,state:'请购未执行',dwell,expected:null,actual:null,late:null,complete:false,overtime:dwell==null?null:dwell>2});
  }
  const stages=stageNames.map((name,i)=>{
    const rows=records.filter(x=>x.stage===i),known=rows.filter(x=>x.dwell!=null);
    return {name,pending:count(rows),overtime:count(rows.filter(x=>x.overtime)),avgDays:known.length?(known.reduce((s,x)=>s+x.dwell,0)/known.length).toFixed(1):null,known:known.length,rows};
  });
  const statuses=[
    {name:'待发货',states:['待发货'],color:'#edb563'},
    {name:'已发货',states:['已发货/在途'],color:'#49b7d4'},
    {name:'待检验',states:['待检验'],color:'#a78bfa'},
    {name:'待入库',states:['待入库'],color:'#46d4b1'}
  ].map(({name,states,color})=>{
    const rows=records.filter(item=>states.includes(item.state));
    return {
      name,
      value:count(rows),
      materialQuantity:rows.reduce((sum,item)=>sum+item.lines.reduce((lineSum,line)=>lineSum+(Number(line.order_quantity)||0),0),0),
      color,
      rows
    };
  });
  return {orders,records,stages,statuses};
}
