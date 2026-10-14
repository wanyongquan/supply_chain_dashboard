import {ref,computed,onMounted,watch,provide,inject} from 'vue';
import {useRoute,useRouter} from 'vue-router';
import SupplierApi from '../api';
const dashboardKey=Symbol('dashboard');
const NAV = [
  {id:'profile',label:'供应商画像',icon:'◉'},
  {id:'rating',label:'供应商评级',icon:'☆'},
  {id:'delivery',label:'采购全流程协同',icon:'⇄'},
  {id:'price',label:'采购价格',icon:'▥'}
];


export function createDashboard(){
const D=ref(SupplierApi.emptyModel());
    const route=useRoute(),router=useRouter();
 const active=computed({get:()=>route.meta.module||'profile',set:id=>router.push('/'+id)});
 const profileSub=computed({get:()=>route.meta.sub||'overview',set:id=>router.push('/profile/'+id)});
 const deliverySub=computed({get:()=>route.meta.sub||'overview',set:id=>router.push('/delivery/'+id)});
 const role=ref('公司管理层'),alertOpen=ref(true);
    const apiError=ref('');
    const supplierId=ref('218502'), detailTab=ref(0), priceTab=ref(0), searchMode=ref('name'), search=ref(''), ratingSearch=ref(''), selectedMaterial=ref(0);
    const selectedSupplierDetail=ref(null), selectedSupplierProfile=ref(null);
    const profileYear=ref('2026'), profileStatus=ref('全部'), profileLevel=ref('全部');
    const supplierDirectoryQuery=ref(''),supplierDirectorySearchMode=ref('name'),supplierDirectoryAppliedQuery=ref('');
    const supplierDetailQuery=ref(''),supplierDetailSearchMode=ref('name'),supplierDetailStatus=ref(''),supplierDetailRating=ref(''),supplierDetailQueryMessage=ref('');
    const deliveryStart=ref('2026-01-01'), deliveryEnd=ref('2026-12-31'), deliveryOrderQuery=ref(''), flowSupplierQuery=ref(''), flowBuyerQuery=ref(''),flowOrderType=ref('全部'),flowOrderStatus=ref('全部');
    const selectedFlowOrderId=ref(''),activeWorkflowStage=ref(0);
    const compareIds=ref(['S001','S002']);
    const current=computed(()=>NAV.find(n=>n.id===active.value));
    const profileOverview=computed(()=>D.value.profileOverview);
    const supplier=computed(()=>selectedSupplierDetail.value||D.value.suppliers.find(s=>s.id===supplierId.value)||D.value.suppliers[0]);
    const supplierList=computed(()=>D.value.suppliers);
    const riskAlerts=computed(()=>[
      ...D.value.suppliers.filter(item=>item.risk==='高').map(item=>`${item.name}：${item.risk}风险，${item.status}`),
      ...D.value.anomalies.map(item=>`${item[0]} ${item[3]}：交付比例 ${item[5]}，${item[9]}`),
      ...D.value.shortages.filter(item=>item[8]==='高').map(item=>`${item[7]}：${item[0]}供货天数 ${item[4]} 天，库存预警`)
    ]);
    const provinceOverview=computed(()=>{
      const counts=new Map();
      D.value.suppliers.forEach(item=>{
        const province=(item.region||'').trim();
        if(!province||province==='未填写')return;
        counts.set(province,(counts.get(province)||0)+1);
      });
      return Object.fromEntries(counts);
    });
    const overviewRatingDistribution=computed(()=> (profileOverview.value?.rating_distribution||[]).map(item=>({level:item.name==='未评级'?item.name:`${item.name}级`,count:Number(item.count)||0,color:({A:'#22c55e',B:'#3b82f6',C:'#f59e0b',D:'#ef4444'})[item.name]||'#64748b'})));
    const ratingDonutStyle=computed(()=>{
      const total=overviewRatingDistribution.value.reduce((sum,item)=>sum+item.count,0);
      const colors=overviewRatingDistribution.value.map(item=>item.color);
      let offset=0;
      const stops=overviewRatingDistribution.value.map((item,index)=>{
        const start=total?offset/total*100:0;
        offset+=item.count;
        const end=total?offset/total*100:0;
        return `${colors[index]} ${start}% ${end}%`;
      });
      return {'--donut-gradient':total?`conic-gradient(${stops.join(',')})`:'conic-gradient(#64748b 0 100%)'};
    });
    const fullRatingDonutStyle=computed(()=>{
      const counts=D.value.ratingDistribution.map(item=>({...item,count:Number(item.count)}));
      const total=counts.reduce((sum,item)=>sum+item.count,0);
      let offset=0;
      const stops=counts.map(item=>{
        const start=total?offset/total*100:0;
        offset+=item.count;
        return `${item.color} ${start}% ${total?offset/total*100:0}%`;
      });
      return {'--donut-gradient':total?`conic-gradient(${stops.join(',')})`:'conic-gradient(#64748b 0 100%)'};
    });
    const overviewSuppliers=computed(()=>profileOverview.value.suppliers||[]);
    const ratingList=computed(()=>D.value.suppliers.filter(s=>!ratingSearch.value||`${s.name}${s.id}`.includes(ratingSearch.value)).sort((a,b)=>b.score-a.score));
    const dims=computed(()=>{const v=D.value.dimensionScores[supplierId.value]||[];return [['质量',v[0]??0,45],['交付',v[1]??0,30],['技术',v[2]??0,16],['成本',v[3]??0,7],['廉洁合作',v[4]??0,2]]});
    const selectedPriceSummary=computed(()=>{
      const material=D.value.materials[selectedMaterial.value];
      return material?D.value.priceSummaries[material[0]]:null;
    });
    const selectedPriceComparison=computed(()=>selectedPriceSummary.value?.records.map(item=>[
      item.supplier_name,item.material_name,item.unit_price,item.benchmark_price,item.gap,
      item.purchase_qty,item.quality_rate,item.time_compliance
    ])||[]);
    const selectedCostFactors=computed(()=>selectedPriceSummary.value?.records.map(item=>{
      const priceGap=item.unit_price-item.benchmark_price;
      const impact=priceGap*item.purchase_qty;
      return [
        `${item.supplier_name} · ${item.material_name}`,
        item.benchmark_price,
        priceGap,
        `${item.gap.toFixed(1)}%`,
        `采购数量 ${item.purchase_qty.toLocaleString()}，估算价差 ¥${impact.toFixed(2)}`
      ];
    })||[]);
    const flow=computed(()=>D.value.deliveryFlow||{});
    const supplierNameById=id=>D.value.suppliers.find(x=>x.id===id)?.name||id;
    const materialNameById=id=>D.value.materials.find(x=>x[0]===id)?.[1]||id;
    const filteredDeliveryOrders=computed(()=> (flow.value.rawOrders||[]).filter(x=>(!deliveryStart.value||!x.order_date||x.order_date>=deliveryStart.value)&&(!deliveryEnd.value||!x.order_date||x.order_date<=deliveryEnd.value)));
    const matchesFlowOrderStatus=x=>{
      if(flowOrderStatus.value==='全部')return true;
      const requisitions=(flow.value.requisitions||[]).filter(item=>item.order_id===x.order_id);
      const confirmations=(flow.value.confirmations||[]).filter(item=>item.order_id===x.order_id);
      const shipments=(flow.value.deliveryNotes||[]).filter(item=>item.order_id===x.order_id);
      const quality=(flow.value.quality||[]).filter(item=>
        item.order_id===x.order_id
        ||(!item.order_id&&item.supplier_id===x.supplier_id&&item.material_id===x.material_id)
      );
      const warehouse=(flow.value.warehouseEntries||[]).filter(item=>item.order_id===x.order_id);
      switch(flowOrderStatus.value){
        case '请购单':return requisitions.length>0;
        case '采购单':return Boolean(x.order_date);
        case '已受理':return ['已受理','已接受'].includes(x.acceptance_status)||confirmations.some(item=>['已受理','已接受','已确认'].includes(item.status));
        case '已发货':return shipments.length>0||['已发货','交货中','部分交付'].includes(x.status);
        case '检验中':return x.status==='检验中'||quality.some(item=>!['合格','不合格','退货','让步接收'].includes(item.conclusion));
        case '已入库':return warehouse.length>0||x.status==='已入库';
        default:return true;
      }
    };
    const matchesFlowOrderFilters=x=>{
      const supplier=supplierNameById(x.supplier_id),buyer=x.buyer||'';
      const orderType=[x.order_type,x.order_category,x.plan_type].filter(Boolean).join(' ');
      return(!flowSupplierQuery.value||supplier.includes(flowSupplierQuery.value))
        &&(!flowBuyerQuery.value||buyer.includes(flowBuyerQuery.value))
        &&(flowOrderType.value==='全部'||orderType.includes(flowOrderType.value))
        &&(!deliveryOrderQuery.value||(x.order_id||'').toLowerCase().includes(deliveryOrderQuery.value.trim().toLowerCase()))
        &&(!deliveryStart.value||!x.order_date||x.order_date>=deliveryStart.value)
        &&(!deliveryEnd.value||!x.order_date||x.order_date<=deliveryEnd.value)
        &&matchesFlowOrderStatus(x);
    };
    const matchingFlowOrders=computed(()=> (flow.value.rawOrders||[]).filter(matchesFlowOrderFilters));
    const selectedFlowOrder=computed(()=>{
      const orders=matchingFlowOrders.value;
      return orders.find(order=>order.order_id===selectedFlowOrderId.value)||orders[0]||null;
    });
    const selectFlowOrder=id=>{
      selectedFlowOrderId.value=id;
      activeWorkflowStage.value=0;
    };
    const workflowNodes=computed(()=>{const o=selectedFlowOrder.value;if(!o)return[];const pick=(rows,key='order_id')=>(rows||[]).find(x=>x[key]===o.order_id);const req=pick(flow.value.requisitions),con=pick(flow.value.confirmations),note=pick(flow.value.deliveryNotes),quality=(flow.value.quality||[]).find(x=>x.material_id===o.material_id&&x.supplier_id===o.supplier_id),entry=pick(flow.value.warehouseEntries);const nodes=[['请购',req?.created_at,req?.requisition_id],['下单',o.order_date,o.order_id],['确认',con?.confirmed_at,con?.status],['送货',note?.shipped_at,note?.delivery_no],['到货检验',quality?.inspection_date,quality?.conclusion],['入库',entry?.entered_at,entry?.entry_id]];let current=nodes.findIndex(x=>!x[1]);if(current<0)current=nodes.length-1;const duration=(start,end)=>{if(!start)return'尚未开始';const hours=Math.max(0,(new Date(end||new Date())-new Date(start))/3600000);return hours<24?`${hours.toFixed(1)}小时`:`${(hours/24).toFixed(1)}天`};return nodes.map((x,i)=>({name:x[0],time:x[1]||'暂无',detail:x[2]||'未开始',duration:duration(x[1],nodes[i+1]?.[1]),state:i<current?'done':i===current?'current':'pending'}))});
    const flowOrderRows=computed(()=> (flow.value.rawOrders||[]).filter(matchesFlowOrderFilters).map(x=>{const requisition=(flow.value.requisitions||[]).some(y=>y.order_id===x.order_id),confirmation=(flow.value.confirmations||[]).find(y=>y.order_id===x.order_id),notes=(flow.value.deliveryNotes||[]).filter(y=>y.order_id===x.order_id),receipts=(flow.value.receipts||[]).filter(y=>y.order_id===x.order_id),quality=(flow.value.quality||[]).some(y=>y.material_id===x.material_id&&y.supplier_id===x.supplier_id),entry=(flow.value.warehouseEntries||[]).some(y=>y.order_id===x.order_id);const shipped=notes.reduce((sum,item)=>sum+(Number(item.shipped_quantity)||0),0);const hasReceiptDetails=notes.some(item=>item.received_quantity!==undefined);const received=hasReceiptDetails?notes.reduce((sum,item)=>sum+(Number(item.received_quantity)||0),0):receipts.reduce((sum,item)=>sum+(Number(item.received_quantity)||0),0);const hasUnreceivedDetails=notes.some(item=>item.unreceived_quantity!==undefined);const unreceived=hasUnreceivedDetails?notes.reduce((sum,item)=>sum+(Number(item.unreceived_quantity)||0),0):Math.max(0,shipped-received);const noteNumbers=[...new Set(notes.map(item=>item.delivery_no).filter(Boolean))];const progress=[requisition,Boolean(x.order_date),x.acceptance_status==='已接受'||confirmation?.status==='已确认',notes.length>0||x.status==='交货中',quality,entry];return{orderId:x.order_id,orderDate:x.order_date||'-',buyer:x.buyer||'-',supplier:supplierNameById(x.supplier_id),lineCount:x.line_count??'-',orderStatus:x.status||'-',acceptanceStatus:x.acceptance_status|| (confirmation?.status==='已确认'?'已接受':'待受理'),hasShipment:notes.length>0,shipped,received,unreceived,deliveryNotes:noteNumbers.join('、')||'-',progress}}));
    const deliverySummaryCards=computed(()=>{const orders=filteredDeliveryOrders.value, ids=new Set(orders.map(x=>x.order_id));const req=(flow.value.requisitions||[]).filter(x=>ids.has(x.order_id));const con=(flow.value.confirmations||[]).filter(x=>ids.has(x.order_id));const notes=(flow.value.deliveryNotes||[]).filter(x=>ids.has(x.order_id));const quality=(flow.value.quality||[]).filter(x=>orders.some(o=>o.material_id===x.material_id&&o.supplier_id===x.supplier_id));const entries=(flow.value.warehouseEntries||[]).filter(x=>ids.has(x.order_id));return [
      {title:'请购',a:'请购总数',av:req.length,b:'未执行',bv:req.filter(x=>x.status!=='已执行').length,tone:'blue'},
      {title:'采购',a:'采购订单',av:ids.size,b:'采购数量',bv:orders.reduce((sum,x)=>sum+(Number(x.order_quantity)||0),0),tone:'cyan'},
      {title:'订单确认',a:'订单总数',av:ids.size,b:'待确认',bv:con.filter(x=>x.status==='待确认').length,tone:'purple'},
      {title:'已发货',a:'确认总数',av:con.filter(x=>x.status==='已确认').length,b:'延迟发货',bv:notes.filter(x=>x.status==='延迟发货').length,tone:'green'},
      {title:'质检',a:'质检总数',av:quality.length,b:'质检问题',bv:quality.filter(x=>x.conclusion!=='合格').length,tone:'amber'},
      {title:'入库',a:'入库总数',av:entries.length,b:'已完成',bv:entries.filter(x=>x.status==='已入库').length,tone:'teal'}]});
    const procurementMaterialAnalysis=computed(()=>{const rows=new Map();const ensure=id=>{if(!rows.has(id))rows.set(id,{id,name:materialNameById(id),requested:0,purchased:0,warehoused:0});return rows.get(id)};(flow.value.requisitions||[]).forEach(x=>{ensure(x.material_id).requested+=Number(x.quantity)||0});(flow.value.rawOrders||[]).forEach(x=>{ensure(x.material_id).purchased+=Number(x.order_quantity)||0});(flow.value.warehouseEntries||[]).forEach(x=>{ensure(x.material_id).warehoused+=Number(x.quantity)||0});return [...rows.values()]});
    const abnormalOrders=computed(()=>{const q=deliveryOrderQuery.value.trim().toLowerCase();return (flow.value.rawOrders||[]).filter(x=>(x.risk_level==='高'||x.risk_level==='中'||x.status.includes('待')||x.status.includes('逾期')||x.status.includes('受理'))&&(!q||x.order_id.toLowerCase().includes(q))).map(x=>[x.order_id,x.material_id,materialNameById(x.material_id),supplierNameById(x.supplier_id),x.order_quantity||'-',x.expected_delivery_date,x.status,x.deviation||'-',x.impact||'-'])});
    const fulfillmentRows=computed(()=>filteredDeliveryOrders.value.map(order=>{
      const expected=order.expected_delivery_date||'';
      const today=new Date();
      const todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      const expectedDays=expected?Math.ceil((new Date(`${expected.slice(0,10)}T00:00:00`)-new Date(`${todayKey}T00:00:00`))/86400000):null;
      const receipts=(flow.value.receipts||[]).filter(item=>item.order_id===order.order_id);
      const deliveryNotes=(flow.value.deliveryNotes||[]).filter(item=>item.order_id===order.order_id);
      const noteReceipts=deliveryNotes.filter(item=>item.received_quantity!==undefined);
      const receiptQuantity=receipts.length
        ?receipts.reduce((sum,item)=>sum+(Number(item.received_quantity)||0),0)
        :noteReceipts.reduce((sum,item)=>sum+(Number(item.received_quantity)||0),0);
      const receiptDates=[...receipts.map(item=>item.arrived_at),...noteReceipts.map(item=>item.received_at)].filter(Boolean).sort();
      return[
        order.status||'-',
        expectedDays===null?'-':expectedDays<0?`逾期${Math.abs(expectedDays)}天`:`${expectedDays}天`,
        order.order_id,
        supplierNameById(order.supplier_id),
        order.material_id||'-',
        materialNameById(order.material_id)||'-',
        order.purchase_unit||order.unit||'-',
        order.order_quantity??'-',
        receiptQuantity||'-',
        receiptDates.at(-1)||'-',
        expected||'-'
      ];
    }));
    const fulfillmentSummary=computed(()=>{
      const orders=filteredDeliveryOrders.value;
      const today=new Date();
      const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const todayKey=dateKey(today);
      const soonDate=new Date(today);
      soonDate.setDate(soonDate.getDate()+3);
      const soonKey=dateKey(soonDate);
      const countOrders=predicate=>new Set(orders.filter(predicate).map(order=>order.order_id)).size;
      const deliveryRatio=order=>Number.parseFloat(String(order.delivery_ratio||'').replace('%',''))||0;
      const fullyDelivered=order=>Boolean(order.actual_delivery_date)||deliveryRatio(order)>=100||order.status==='已完成';
      return[
        {label:'准时交付的订单数',value:countOrders(order=>Boolean(order.actual_delivery_date&&order.expected_delivery_date&&order.actual_delivery_date.slice(0,10)<=order.expected_delivery_date.slice(0,10))),tone:'green'},
        {label:'预期未交付订单数',value:countOrders(order=>Boolean(order.expected_delivery_date&&order.expected_delivery_date.slice(0,10)<todayKey&&!fullyDelivered(order))),tone:'amber'},
        {label:'部分交付的订单数',value:countOrders(order=>order.status==='部分交付'||(order.status!=='已完成'&&deliveryRatio(order)>0&&deliveryRatio(order)<100)),tone:'blue'},
        {label:'3天内即将到期未交付订单数',value:countOrders(order=>Boolean(order.expected_delivery_date&&order.expected_delivery_date.slice(0,10)>=todayKey&&order.expected_delivery_date.slice(0,10)<=soonKey&&!fullyDelivered(order))),tone:'red'}
      ];
    });
    const shortageRows=computed(()=> (flow.value.inventory||[]).filter(x=>x.days_of_supply<5).map(x=>{const orders=(flow.value.rawOrders||[]).filter(o=>o.material_id===x.material_id&&o.supplier_id===x.supplier_id&&o.status!=='已完成');const qty=orders.reduce((s,o)=>s+(Number(o.order_quantity)||0),0);const transit=(flow.value.deliveryNotes||[]).filter(n=>n.material_id===x.material_id&&n.supplier_id===x.supplier_id).reduce((s,n)=>s+(Number(n.shipped_quantity)||0),0);return[orders.map(o=>o.order_id).join('、')||'-',x.material_id,materialNameById(x.material_id),supplierNameById(x.supplier_id),qty,transit,x.stock_amount,'-',Math.max(0,qty-transit),orders.map(o=>o.expected_delivery_date).sort()[0]||'-',x.risk_level]}));
    const shortageSupplierChart=computed(()=>{const counts={};shortageRows.value.forEach(x=>counts[x[3]]=(counts[x[3]]||0)+(x[0]==='-'?0:x[0].split('、').length));return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,20)});
    const shortageMaterialChart=computed(()=>shortageRows.value.map(x=>[x[2],x[8]]).sort((a,b)=>b[1]-a[1]).slice(0,20));
    const buildSupplyExecution=(startDate='',endDate='')=>{
      const inRange=(value,start,end)=>{const day=(value||'').slice(0,10);return Boolean(day)&&(!start||day>=start)&&(!end||day<=end)};
      const orders=(flow.value.rawOrders||[]).filter(item=>inRange(item.order_date,startDate,endDate));
      const receipts=(flow.value.receipts||[]).filter(item=>inRange(item.arrived_at,startDate,endDate));
      const agreements=(flow.value.agreements||[]).filter(item=>(!startDate||!item.effective_to||item.effective_to>=startDate)&&(!endDate||!item.effective_from||item.effective_from<=endDate));
      return agreements.map(agreement=>{
        const materialOrders=orders.filter(item=>item.material_id===agreement.material_id);
        const supplierOrders=materialOrders.filter(item=>item.supplier_id===agreement.supplier_id);
        const materialReceipts=receipts.filter(item=>item.material_id===agreement.material_id);
        const supplierReceipts=materialReceipts.filter(item=>item.supplier_id===agreement.supplier_id);
        const orderTotal=materialOrders.reduce((sum,item)=>sum+(Number(item.order_quantity)||0),0);
        const receiptTotal=materialReceipts.reduce((sum,item)=>sum+(Number(item.received_quantity)||0),0);
        const orderQty=supplierOrders.reduce((sum,item)=>sum+(Number(item.order_quantity)||0),0);
        const receiptQty=supplierReceipts.reduce((sum,item)=>sum+(Number(item.received_quantity)||0),0);
        const agreementRatio=Number(agreement.agreement_ratio)||0;
        const orderRatio=orderTotal?orderQty/orderTotal*100:0;
        const arrivalRatio=receiptTotal?receiptQty/receiptTotal*100:0;
        return{materialId:agreement.material_id,supplierId:agreement.supplier_id,material:materialNameById(agreement.material_id),supplier:supplierNameById(agreement.supplier_id),agreement:agreementRatio,orderQty,orderRatio,receiptQty,arrivalRatio,deviation:arrivalRatio-agreementRatio};
      });
    };
    const supplyExecution=computed(()=>buildSupplyExecution(deliveryStart.value,deliveryEnd.value));
    const loadSupplierProfile=async id=>{
      selectedSupplierDetail.value=null;selectedSupplierProfile.value=null;
      try {
        const profile=await SupplierApi.getSupplierProfile(id);
        if(id!==supplierId.value)return;
        selectedSupplierProfile.value=profile;
        selectedSupplierDetail.value=SupplierApi.supplierView(profile.supplier);
      } catch (error) { apiError.value=error.message; }
    };
    const selectSupplier=id=>{supplierId.value=id;detailTab.value=0};
    watch(supplierId,id=>{
      if(D.value.suppliers.length>0 && D.value.suppliers[0].id)loadSupplierProfile(id);
    });
    let profileOverviewRequest=0;
    watch([profileStatus,profileLevel],async()=>{
      const request=++profileOverviewRequest;
      try {
        const result=await SupplierApi.getProfileOverview({status:profileStatus.value,rating:profileLevel.value});
        if(request===profileOverviewRequest)D.value.profileOverview=result;
      } catch (error) { apiError.value=error.message; }
    });
    const toggleCompare=id=>{const a=compareIds.value;a.includes(id)?compareIds.value=a.filter(x=>x!==id):a.length<4&&a.push(id)};
    onMounted(async()=>{
      try {
        D.value=await SupplierApi.loadModel();
        await loadSupplierProfile(supplierId.value);
      }
      catch (error) { apiError.value=error.message; }
    });
    const state={D,NAV,active,profileSub,deliverySub,role,alertOpen,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,supplierDirectoryQuery,supplierDirectorySearchMode,supplierDirectoryAppliedQuery,supplierDetailQuery,supplierDetailSearchMode,supplierDetailStatus,supplierDetailRating,supplierDetailQueryMessage,deliveryStart,deliveryEnd,deliveryOrderQuery,flowSupplierQuery,flowBuyerQuery,flowOrderType,flowOrderStatus,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,riskAlerts,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,selectedFlowOrder,selectedFlowOrderId,activeWorkflowStage,selectFlowOrder,workflowNodes,flowOrderRows,deliverySummaryCards,procurementMaterialAnalysis,abnormalOrders,fulfillmentRows,fulfillmentSummary,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,buildSupplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare};
 provide(dashboardKey,state);return state;
}
export function useDashboard(){const state=inject(dashboardKey);if(!state)throw Error('Dashboard provider missing');return state;}
