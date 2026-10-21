<script setup>
import {computed,ref,watch} from 'vue';
import {useRoute} from 'vue-router';
import {useDashboard} from '../composables/useDashboard';
import {buildDeliveryExecution,stageNames,demoStageLimits} from '../composables/deliveryExecution';
import ScreenChart from '../components/ScreenChart.vue';
import ProcurementFlow from '../components/ProcurementFlow.vue';
import ScreenModal from '../components/ScreenModal.vue';
import SupplierMap from '../components/SupplierMap.vue';
import SupplierClassificationPie from '../components/SupplierClassificationPie.vue';
import SupplierQualityTrend from '../components/SupplierQualityTrend.vue';
import SupplierPerformanceBarChart from '../components/SupplierPerformanceBarChart.vue';
import SupplierProfileMetrics from '../components/SupplierProfileMetrics.vue';
import NewProductArrivalTracking from '../components/NewProductArrivalTracking.vue';
import PriceHistoryChart from '../components/PriceHistoryChart.vue';
import ProcurementCharts from '../components/ProcurementCharts.vue';
import {supplierStatusLabel} from '../utils/supplierStatus';
import SupplierBasic from './profile/basic.vue';
import SupplierCapacity from './profile/capacity.vue';
import SupplierDelivery from './profile/delivery.vue';
import SupplierQuality from './profile/quality.vue';
import FlowDetail from './delivery/flow.vue';
import FulfillmentDetail from './delivery/fulfillment.vue';
import ShortageDetail from './delivery/shortage.vue';
import RatioDetail from './delivery/ratio.vue';
import PriceDetail from './PriceView.vue';
import classification from '../../../data/mock_supplier_classification.json';
import ratingMock from '../../../data/mock_supplier_rating.json';
import monthlyQualityMock from '../../../data/mock_supplier_monthly_quality.json';
import purchaseRankingMock from '../../../data/mock_supplier_purchase_ranking.json';
import synergy from '../../../data/mock_supplier_synergy.json';
import '../screen.css';
const route=useRoute();
const {D,provinceOverview,deliveryStart,deliveryEnd,deliverySummaryCards:summaryCards,fulfillmentSummary,procurementMaterialAnalysis:allMaterialAnalysis,shortageMaterialChart,buildSupplyExecution,selectSupplier,selectedSupplierProfile,deliveryOrderQuery,flowOrderStatus,flowSupplierQuery,flowBuyerQuery,flowOrderType,selectFlowOrder}=useDashboard();
const isSupplier=computed(()=>route.meta.module==='profile');
const modal=ref(''),title=ref(''),query=ref(''),page=ref(1),pageSize=ref(10),group=ref(''),groupType=ref(''),detailId=ref('');
const shortageMaterial=ref('');
const start=ref(deliveryStart.value),end=ref(deliveryEnd.value),dateError=ref('');
const suppliers=computed(()=>D.value.suppliers.filter(s=>s.id));
const ratingDimensionDefinitions=[
  {name:'质量',full:45,criteria:['质量体系认证','来料检验批次反馈率','零部件不良率','零公里反馈率（PPM）','3MIS指标','改进有效性','索销比','服务（质量改进）']},
  {name:'交付',full:30,criteria:['数量遵守率','时间遵守率','样件交付','超额运费','服务']},
  {name:'技术',full:16,criteria:['技术开发能力、创新与合作','技术-服务']},
  {name:'成本',full:7,criteria:['成本降低配合度','服务']},
  {name:'廉洁合作',full:2,criteria:['廉洁合规情况']},
  {name:'供货修正系数',full:1.1,criteria:['供货系统修正']}
];
const rated=computed(()=>suppliers.value.filter(s=>['A','B','C','D'].includes(s.level)));
const scored=computed(()=>rated.value.filter(s=>Number.isFinite(s.score)));
const selectedRatingSupplier=computed(()=>suppliers.value.find(s=>s.id===detailId.value));
const supplierRatingDetails=computed(()=>{
  const source=selectedRatingSupplier.value?.ratingDimensions||[];
  const dimensions=ratingDimensionDefinitions.map((dimension,index)=>{
    if(dimension.name==='供货修正系数'){
      return {...dimension,score:Number((0.9+Math.random()*0.2).toFixed(2))};
    }
    const existing=source[index];
    const score=existing!==null&&existing!==''&&Number.isFinite(Number(existing))
      ?Math.max(0,Math.min(dimension.full,Number(existing)))
      :Number((dimension.full*(0.7+Math.random()*0.3)).toFixed(1));
    return {...dimension,score};
  });
  const groups=ratingDimensionDefinitions.map((dimension,index)=>({
    dimension:dimension.name,
    criteria:dimension.criteria.map(name=>({
      name,
      score:index===ratingDimensionDefinitions.length-1
        ?dimensions[index].score
        :Number((Math.random()*dimension.full).toFixed(1))
    }))
  }));
  return {dimensions,groups};
});
const ratings=ratingMock.items;
const classificationTop=computed(()=>[...classification.items].sort((a,b)=>b.count-a.count).slice(0,5));
const statusCount=name=>Number((D.value.profileOverview.status_distribution||[]).find(x=>x.name===name)?.count)||0;
const purchaseRanking=purchaseRankingMock.items.slice(0,5).map(item=>({id:item.supplier_id,name:item.supplier_name,amount:item.amount}));
const creditRiskTop=computed(()=>suppliers.value.filter(s=>{
  const credit=s.credit||{};
  return [credit.deposit_amount,credit.monthly_change,credit.annual_deduction].some(Number.isFinite);
}).map(s=>({
  id:s.id,name:s.name,deposit:s.credit.deposit_amount,change:s.credit.monthly_change,deduction:s.credit.annual_deduction,
  riskScore:(Number(s.credit.annual_deduction)||0)+Math.max(0,-(Number(s.credit.monthly_change)||0))
})).sort((a,b)=>b.riskScore-a.riskScore).slice(0,5));
const purchaseAmountByMaterial=computed(()=>{
  const totals=new Map();
  for(const row of [...(D.value.purchaseHistory||[]),...(D.value.priceHistory||[])]){
    const quantity=Number(row.quantity??row.purchase_qty),price=Number(row.unit_price);
    if(!row.material_id||!Number.isFinite(quantity)||!Number.isFinite(price)||quantity<=0||price<=0)continue;
    totals.set(row.material_id,(totals.get(row.material_id)||0)+quantity*price);
  }
  return totals;
});
const singleSourceRisks=computed(()=>{
  const byMaterial=new Map();
  suppliers.value.filter(s=>s.primaryMaterialId&&['关键','核心','独家'].includes(s.supplyRole)).forEach(s=>{
    if(!byMaterial.has(s.primaryMaterialId))byMaterial.set(s.primaryMaterialId,new Map());
    byMaterial.get(s.primaryMaterialId).set(s.id,s);
  });
  return [...byMaterial.entries()]
    .filter(([,vendors])=>vendors.size===1)
    .map(([materialId,vendors])=>{
      const supplier=[...vendors.values()][0];
      return {materialId,material:D.value.materials.find(x=>x[0]===materialId)?.[1]||materialId,supplier:supplier.name,role:supplier.supplyRole,amount:purchaseAmountByMaterial.value.get(materialId)||0,risk:supplier.risk};
    })
    .sort((a,b)=>b.amount-a.amount)
    .slice(0,5);
});
const delayedSuppliers=computed(()=>{
  const groups=new Map();
  (D.value.deliveryFlow.rawOrders||[]).forEach(order=>{
    const expected=order.expected_delivery_date?.slice(0,10),actual=order.actual_delivery_date?.slice(0,10);
    const delayed=Boolean(expected&&actual&&actual>expected)||(!actual&&order.status==='逾期未完');
    if(!delayed) return;
    if(!groups.has(order.supplier_id))groups.set(order.supplier_id,{id:order.supplier_id,name:suppliers.value.find(s=>s.id===order.supplier_id)?.name||order.supplier_id,orders:new Set()});
    groups.get(order.supplier_id).orders.add(order.order_id);
  });
  return [...groups.values()].map(row=>({name:row.name,value:row.orders.size})).sort((a,b)=>b.value-a.value).slice(0,5);
});
const monthlyQuality=computed(()=>{
  const actual=new Map();
  (D.value.deliveryFlow.quality||[]).forEach(row=>{
    const month=row.inspection_date?.slice(0,7),inspected=Number(row.inspected_quantity),defects=Number(row.defect_quantity);
    if(!month||!Number.isFinite(inspected)||inspected<=0||!Number.isFinite(defects))return;
    const totals=actual.get(month)||{inspected:0,defects:0};
    totals.inspected+=inspected;totals.defects+=defects;actual.set(month,totals);
  });
  const months=new Map(monthlyQualityMock.items.map(row=>[row.month,{month:row.month,passRate:row.passRate,isMock:true}]));
  actual.forEach((totals,month)=>months.set(month,{month,passRate:Number(((totals.inspected-totals.defects)/totals.inspected*100).toFixed(1)),isMock:false}));
  return [...months.values()].sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);
});
const monthlyQualityActualCount=computed(()=>monthlyQuality.value.filter(row=>!row.isMock).length);
const monthlyQualityMockCount=computed(()=>monthlyQuality.value.filter(row=>row.isMock).length);
const costDownRanking=computed(()=>{
  const groups=new Map();
  (D.value.priceHistory||[]).forEach(row=>{
    const quantity=Number(row.purchase_qty),benchmark=Number(row.benchmark_price),price=Number(row.unit_price);
    if(!row.supplier_name||!Number.isFinite(quantity)||!Number.isFinite(benchmark)||!Number.isFinite(price)||quantity<=0)return;
    groups.set(row.supplier_name,(groups.get(row.supplier_name)||0)+(benchmark-price)*quantity);
  });
  return [...groups].map(([name,value])=>({name,value:Number(value.toFixed(2))})).sort((a,b)=>b.value-a.value).slice(0,5);
});
const ranked=computed(()=>suppliers.value.filter(s=>Number.isFinite(s.score)).sort((a,b)=>b.score-a.score).slice(0,5));
const risks=computed(()=>suppliers.value.filter(s=>['中','高'].includes(s.risk)));
const deliverySummaryCards=computed(()=>{
  const cards=summaryCards.value.map(x=>({...x}));
  const orders=(D.value.deliveryFlow.rawOrders||[]).filter(inRange),ids=new Set(orders.map(x=>x.order_id));
  const confirmations=(D.value.deliveryFlow.confirmations||[]).filter(x=>ids.has(x.order_id));
  const confirmed=new Set(confirmations.filter(x=>x.status==='已确认').map(x=>x.order_id));
  orders.filter(x=>['已接受','已受理'].includes(x.acceptance_status)).forEach(x=>confirmed.add(x.order_id));
  cards[2].a='已确认订单';cards[2].av=confirmed.size;cards[2].bv=Math.max(0,ids.size-confirmed.size);
  cards[3].a='送货单数';cards[3].av=(D.value.deliveryFlow.deliveryNotes||[]).filter(x=>ids.has(x.order_id)).length;
  return cards;
});
const flowOrderRows=computed(()=>{
  const orders=(D.value.deliveryFlow.rawOrders||[]).filter(inRange);
  const names=new Map(suppliers.value.map(s=>[s.id,s.name]));
  return orders.map(x=>({orderId:x.order_id,supplier:names.get(x.supplier_id)||x.supplier_id,orderStatus:x.status}));
});
const calculatedAt=ref(new Date());
const execution=computed(()=>buildDeliveryExecution(D.value.deliveryFlow,deliveryStart.value,deliveryEnd.value,calculatedAt.value));
const stageExecution=computed(()=>execution.value.stages);
const orderStatuses=computed(()=>execution.value.statuses);
const executionRows=computed(()=>execution.value.records.map(x=>({...x,supplier:suppliers.value.find(s=>s.id===x.supplierId)?.name||x.supplierId||'暂无'})));
const overdueOrders=computed(()=>executionRows.value.filter(x=>x.late>0||x.risk).sort((a,b)=>(b.late||0)-(a.late||0)));
const deliveryHighRiskTop=computed(()=>overdueOrders.value.slice(0,5).map(row=>({name:row.id,value:row.late||0,order:row})));
const detailRows=ref([]);
function showRows(rows,label){detailRows.value=rows.map(x=>({...x,supplier:suppliers.value.find(s=>s.id===x.supplierId)?.name||x.supplierId||'暂无'}));open('execution',label);}
function showStage(index){showRows(stageExecution.value[index].rows,stageNames[index]+' · 当前未完结明细');}
const dueOrders=computed(()=>{
  const groups=new Map();
  (D.value.deliveryFlow.rawOrders||[]).filter(x=>x.expected_delivery_date&&(!deliveryStart.value||x.expected_delivery_date>=deliveryStart.value)&&(!deliveryEnd.value||x.expected_delivery_date<=deliveryEnd.value)&&x.expected_delivery_date.slice(0,10)<=calculatedAt.value.toLocaleDateString('sv-SE')).forEach(x=>{if(!groups.has(x.order_id))groups.set(x.order_id,[]);groups.get(x.order_id).push(x);});
  return [...groups.values()];
});
const deliveryMetrics=computed(()=>{
  const records=execution.value.records.filter(x=>x.lines.length),due=dueOrders.value;
  const ontime=due.filter(lines=>lines.every(x=>x.actual_delivery_date&&x.actual_delivery_date<=x.expected_delivery_date));
  const quality=(D.value.deliveryFlow.quality||[]).filter(x=>x.inspection_date&&(!deliveryStart.value||x.inspection_date>=deliveryStart.value)&&(!deliveryEnd.value||x.inspection_date<=deliveryEnd.value));
  const inspected=quality.reduce((s,x)=>s+(Number(x.inspected_quantity)||0),0),defects=quality.reduce((s,x)=>s+(Number(x.defect_quantity)||0),0);
  const purchases=(D.value.purchaseHistory||[]).filter(inRange),amount=purchases.reduce((s,x)=>s+(Number(x.quantity)||0)*(Number(x.unit_price)||0),0);
  return [['采购流水金额',purchases.length?(amount/10000).toFixed(1):'暂无','万元'],['应交订单数',due.length,'单'],['按期到货率',due.length?(ontime.length/due.length*100).toFixed(1):'暂无','%'],['订单完成率',records.length?(records.filter(x=>x.complete).length/records.length*100).toFixed(1):'暂无','%'],['已发货/在途',records.filter(x=>x.state==='已发货/在途').length,'单'],['未到货逾期',records.filter(x=>x.deadlineExceeded).length,'单'],['来料合格率',inspected?((inspected-defects)/inspected*100).toFixed(1):'暂无','%'],['库存缺件物料',shortageMaterialChart.value.length,'种']];
});
const exceptionTypes=computed(()=>[
  {name:'待确认超时',value:stageExecution.value[2].overtime,rows:executionRows.value.filter(x=>x.stage===2&&x.overtime)},
  {name:'延迟发货',value:executionRows.value.filter(x=>x.shipmentLate).length,rows:executionRows.value.filter(x=>x.shipmentLate)},
  {name:'未到货逾期',value:executionRows.value.filter(x=>x.deadlineExceeded).length,rows:executionRows.value.filter(x=>x.deadlineExceeded)},
  {name:'待检超时',value:stageExecution.value[4].overtime,rows:executionRows.value.filter(x=>x.stage===4&&x.overtime)},
  {name:'待入库超时',value:stageExecution.value[5].overtime,rows:executionRows.value.filter(x=>x.stage===5&&x.overtime)}
]);
const exceptionTypeTop=computed(()=>[...exceptionTypes.value].sort((a,b)=>b.value-a.value).slice(0,5));
const bottleneck=computed(()=>stageExecution.value.reduce((best,x,i)=>x.pending>best.pending?{name:['请购','采购下单','供应商确认','送货/运输','收货检验','入库'][i],...x}:best,{name:'暂无',pending:0,overtime:0}));
const procurementMaterialAnalysis=computed(()=>{
  const orders=(D.value.deliveryFlow.rawOrders||[]).filter(inRange),ids=new Set(orders.map(x=>x.order_id));
  return allMaterialAnalysis.value.map(row=>({...row,
    requested:(D.value.deliveryFlow.requisitions||[]).filter(x=>ids.has(x.order_id)&&x.material_id===row.id).reduce((s,x)=>s+(Number(x.quantity)||0),0),
    purchased:orders.filter(x=>x.material_id===row.id).reduce((s,x)=>s+(Number(x.order_quantity)||0),0),
    warehoused:(D.value.deliveryFlow.warehouseEntries||[]).filter(x=>ids.has(x.order_id)&&x.material_id===row.id).reduce((s,x)=>s+(Number(x.quantity)||0),0)
  })).filter(x=>x.requested||x.purchased||x.warehoused);
});
const metrics=computed(()=>isSupplier.value?[
  ['供应商总数',suppliers.value.length,'家'],['合格供应商',statusCount('合格'),'家'],['淘汰供应商',statusCount('淘汰'),'家'],['陌生供应商',statusCount('陌生'),'家'],['黑名单供应商',statusCount('黑名单'),'家'],['中高风险',risks.value.length,'家'],['已评级供应商',rated.value.length,'家'],['平均评级得分',scored.value.length?(scored.value.reduce((s,x)=>s+x.score,0)/scored.value.length).toFixed(1):'暂无','分'],
  ['带动中小企业转型数量',synergy.sme_transformation_count??'待补充','个'],['上下游订单产能共享',synergy.order_capacity_sharing_rate??'待补充','%']
]:deliveryMetrics.value);
const metricNotes=computed(()=>({
  '供应商总数':'供应商主数据当前记录总量',
  '合格供应商':`${suppliers.value.length?Math.round(statusCount('合格')/suppliers.value.length*100):0}% · 占当前供应商总数`,
  '淘汰供应商':`${suppliers.value.length?Math.round(statusCount('淘汰')/suppliers.value.length*100):0}% · 占当前供应商总数`,
  '陌生供应商':`${suppliers.value.length?Math.round(statusCount('陌生')/suppliers.value.length*100):0}% · 占当前供应商总数`,
  '黑名单供应商':`${suppliers.value.length?Math.round(statusCount('黑名单')/suppliers.value.length*100):0}% · 占当前供应商总数`,
  '中高风险':'汇总中、高风险供应商记录',
  '已评级供应商':`评级记录覆盖 ${suppliers.value.length?Math.round(rated.value.length/suppliers.value.length*100):0}%`,
  '平均评级得分':`基于 ${scored.value.length} 家有评分记录的供应商`,
  '带动中小企业转型数量':'模拟统计 · 个数口径待确认',
  '上下游订单产能共享':'模拟统计 · 共享比例口径待确认'
}));
function inRange(x){return (!deliveryStart.value||x.order_date>=deliveryStart.value)&&(!deliveryEnd.value||x.order_date<=deliveryEnd.value);}
const material=ref('');
const history=computed(()=>(D.value.purchaseHistory||[]).filter(inRange));
const materialOptions=computed(()=>[...new Map([...history.value.map(x=>[x.material_id,x.material_name]),...procurementMaterialAnalysis.value.map(x=>[x.id,x.name])]).entries()]);
watch(materialOptions,rows=>{if(!rows.some(x=>x[0]===material.value))material.value=rows[0]?.[0]||'';},{immediate:true});
const prices=computed(()=>history.value.filter(x=>x.material_id===material.value));
const supplyRatioRows=computed(()=>buildSupplyExecution(deliveryStart.value,deliveryEnd.value));
const supplyRatioMetrics=computed(()=>{
  const materialIds=new Set(supplyRatioRows.value.map(row=>row.materialId));
  const deviationIds=new Set(supplyRatioRows.value.filter(row=>row.receiptQty<=0||Math.abs(row.deviation)>10).map(row=>row.materialId));
  return [
    {label:'监控物料数',value:materialIds.size,tone:'cyan'},
    {label:'执行正常数',value:Math.max(0,materialIds.size-deviationIds.size),tone:'green'},
    {label:'偏差物料数',value:deviationIds.size,tone:'amber'}
  ];
});
const supplierResults=computed(()=>suppliers.value.filter(s=>(!query.value||`${s.id} ${s.name}`.includes(query.value))&&(!group.value||(groupType.value==='region'?s.region===group.value:groupType.value==='risk'?['中','高'].includes(s.risk):groupType.value==='riskLevel'?(s.risk||'未填写')===group.value:groupType.value==='status'?s.status===group.value:s.level===group.value))));
const pages=computed(()=>Math.max(1,Math.ceil(supplierResults.value.length/pageSize.value)));
const supplierRows=computed(()=>supplierResults.value.slice((page.value-1)*pageSize.value,page.value*pageSize.value));
watch([query,pageSize],()=>page.value=1);
function open(type,label){modal.value=type;title.value=label;detailId.value='';shortageMaterial.value='';}
function openShortage(name=''){open('shortage',name?'缺件明细 · '+name:'物料在途与缺件明细');shortageMaterial.value=name;}
function openFlow(orderId='',stage='全部'){deliveryOrderQuery.value=orderId;flowOrderStatus.value=stage;flowSupplierQuery.value='';flowBuyerQuery.value='';flowOrderType.value='全部';if(orderId)selectFlowOrder(orderId);open('flow',orderId?'订单链路 · '+orderId:'订单全链路跟踪');}
function list(type='',value=''){query.value='';page.value=1;groupType.value=type;group.value=value;open('suppliers',value?`${value} · 供应商列表`:'供应商查询');}
function supplierDetail(id){detailId.value=id;selectSupplier(id);}
function applyDates(){dateError.value='';if(start.value&&end.value&&start.value>end.value){dateError.value='开始日期不能晚于结束日期';return;}deliveryStart.value=start.value;deliveryEnd.value=end.value;calculatedAt.value=new Date();}
watch(()=>route.path,()=>{modal.value='';});
</script>

<template>
<section class="unified-screen" :class="{'supplier-dense':isSupplier,'delivery-cockpit':!isSupplier}">
  <div class="screen-toolbar"><button v-if="isSupplier" @click="list()">供应商查询 ↗</button><h1>{{isSupplier?'供应商画像和绩效评级':'采购交付保障驾驶舱'}}</h1><form v-if="!isSupplier" @submit.prevent="applyDates"><label>开始日期 <input v-model="start" type="date"></label><label>结束日期 <input v-model="end" type="date"></label><button>查询</button><small>{{dateError}}</small></form></div>
  <div class="screen-metrics"><article v-for="[label,value,unit] in metrics" :key="label" :title="value==='待补充'?'暂缺数据来源与统计口径，尚未填报':label"><span>{{label}}</span><strong :class="{'metric-pending':value==='待补充'}">{{value}}<small v-if="unit">{{unit}}</small></strong><small v-if="isSupplier" class="metric-note">{{metricNotes[label]}}</small></article></div>
  <div v-if="isSupplier" class="supplier-screen-grid">
    <div class="supplier-upper-grid">
      <div class="supplier-column supplier-left-column">
        <article class="screen-block classification-block"><header><h2>供应商类别 TOP 5</h2><small>19 类模拟 · {{classification.total}} 家</small></header><ScreenChart :rows="classificationTop.map(item=>({name:item.classify_name,value:item.count}))" unit="家" :name-width="68" @select="name=>{open('classification',name+' · 分类数量');group=name;}"/><p class="screen-note">按模拟分类数量排序；点击查看分类汇总</p></article>
        <article class="screen-block rating-block"><header><h2>供应商评级分布</h2><small>模拟数据 · {{ratingMock.total}} 家</small></header><ScreenChart kind="pie" :rows="ratings"/><p class="screen-note">等级实际记录不完整，此处使用独立 mock 分布</p></article>
        <article class="screen-block composite-ranking-block"><header><h2>综合评级前 5</h2><small>{{ranked.length}} 家有评分记录</small></header><ScreenChart :rows="ranked.map(s=>({name:s.name,value:s.score}))" unit="分" :name-width="70" @select="name=>{list();supplierDetail(ranked.find(s=>s.name===name).id);}"/><p class="screen-note">按供应商主数据综合评分排序</p></article>
      </div>
      <article class="screen-block map-block"><header><h2>全国供应商分布</h2><small>{{suppliers.length}} 家建档 · 点击省份查看</small></header><SupplierMap dark :data="provinceOverview" @select="name=>list('region',name)"/><p class="screen-note">已定位 {{Object.values(provinceOverview).reduce((a,b)=>a+b,0)}} 家；其余供应商暂无省份信息</p></article>
      <div class="supplier-column supplier-right-column">
        <article class="screen-block purchase-ranking-block"><header><h2>采购排名前 5</h2><small>模拟数据 · {{purchaseRanking.length}} 家</small></header><ScreenChart :rows="purchaseRanking.map(s=>({name:s.name,value:s.amount}))" unit="元" :name-width="70"/><p class="screen-note">演示用采购金额排名，不代表真实采购流水</p></article>
        <article class="screen-block quality-trend-block"><header><h2>月度来料合格率</h2><small>{{monthlyQualityActualCount}} 月真实 · {{monthlyQualityMockCount}} 月模拟</small></header><SupplierQualityTrend :rows="monthlyQuality"/><p class="screen-note">真实月份按检验数量加权；模拟月份仅作趋势展示</p></article>
        <article class="screen-block cost-down-block"><header><h2>降本贡献 TOP 5</h2><small>成交价基准差额 · 元</small></header><ScreenChart :rows="costDownRanking" unit="元" :name-width="70"/><p class="screen-note">正值为低于基准价的估算贡献；负值表示高于基准价，不代表已核验实绩</p></article>
      </div>
    </div>
    <div class="supplier-bottom-grid">
      <article class="screen-block single-source-block"><header><h2>关键物料单一来源风险</h2><small>{{singleSourceRisks.length}} 项 · 主数据唯一供应关系</small></header><div class="single-source-list"><div class="single-source-row single-source-heading"><span>物料名称</span><span>供应商</span><span>采购金额</span></div><div v-for="row in singleSourceRisks" :key="row.materialId" class="single-source-row"><span :title="row.material">{{row.material}}</span><span :title="`${row.supplier} · ${row.role}`">{{row.supplier}}<small>{{row.role}} · {{row.risk}}风险</small></span><strong>{{row.amount?`¥${Math.round(row.amount).toLocaleString('zh-CN')}`:'暂无采购流水'}}</strong></div><p v-if="!singleSourceRisks.length" class="screen-note">暂无关键物料唯一供应关系记录</p></div><p class="screen-note">采购金额汇总采购流水与成交价记录；缺少流水时不以 0 代替</p></article>
      <article class="screen-block delayed-ranking-block"><header><h2>延迟交货供应商 TOP 5</h2><small>{{delayedSuppliers.length}} 家有延迟订单</small></header><ScreenChart :rows="delayedSuppliers" unit="单"/><p class="screen-note">按实际交货日晚于预计交货日，或状态为逾期未完的订单数统计</p></article>
      <article class="screen-block credit-risk-block"><header><h2>供应商信用风险 TOP 5</h2><small>质量保证金与信用扣款</small></header><div class="credit-risk-table"><table><thead><tr><th>供应商</th><th>保证金余额</th><th>本月变动</th><th>本年扣款</th></tr></thead><tbody><tr v-for="s in creditRiskTop" :key="s.id" @click="list();supplierDetail(s.id)"><td :title="s.name">{{s.name}}</td><td>{{s.deposit==null?'暂无':s.deposit.toLocaleString()}}</td><td :class="{'credit-alert':s.change<0}">{{s.change==null?'暂无':(s.change>0?'+':'')+s.change.toLocaleString()}}</td><td :class="{'credit-alert':s.deduction>0}">{{s.deduction==null?'暂无':s.deduction.toLocaleString()}}</td></tr><tr v-if="!creditRiskTop.length"><td colspan="4">暂无信用风险数据</td></tr></tbody></table></div><p class="screen-note">按本年累计扣款＋本月保证金减少额排序；金额单位：元</p></article>
    </div>
  </div>
  <div v-else class="delivery-dashboard">
    <div class="delivery-upper-grid">
      <div class="delivery-side-column delivery-left-column">
        <article class="screen-block procurement-progress-block"><header><h2>不同物料请购进度</h2><button @click="open('procurement','采购需求与请购进度')">详情 ↗</button></header><ProcurementCharts type="progress" :rows="procurementMaterialAnalysis"/></article>
        <article class="screen-block"><header><h2>成交价格趋势</h2><button @click="open('price','物料成交价格分析')">详情 ↗</button></header><select v-model="material" aria-label="物料筛选"><option v-for="[id,name] in materialOptions" :key="id" :value="id">{{name}}</option></select><PriceHistoryChart :records="prices"/></article>
        <article class="screen-block supply-ratio-summary-block"><header><h2>供货比例执行</h2><button @click="open('ratio','供货比例到货数量执行情况')">详情 ↗</button></header><div class="supply-ratio-summary-cards"><div v-for="item in supplyRatioMetrics" :key="item.label" :class="['supply-ratio-summary-card',item.tone]"><span>{{item.label}}</span><strong>{{item.value}}</strong><small>种物料</small></div></div><p class="screen-note">当前日期范围 · 到货偏差超过 10 个百分点或暂无到货时计入偏差</p></article>
      </div>
      <article class="screen-block process-block execution-process-block"><header><div><h2>采购交付全流程执行链</h2><p>当前主要堵点：<b>{{bottleneck.name}}</b>，积压 {{bottleneck.pending}} 单，其中超时 {{bottleneck.overtime}} 单</p></div><button @click="openFlow()">订单查询 ↗</button></header><ProcurementFlow :cards="stageExecution" :statuses="orderStatuses" @stage="showStage" @status="name=>showRows(orderStatuses.find(x=>x.name===name)?.rows||[],name+' · 订单明细')"/><NewProductArrivalTracking class="central-new-product-tracking" @detail="open('newProductTracking','新产品开发到货跟踪详情')"/><p class="screen-note" :title="stageNames.map((name,i)=>name+'：'+demoStageLimits[i]+'天').join('；')">演示超时阈值：请购2天 / 下单1天 / 确认2天 / 运输5天 / 检验1天 / 入库1天（待业务确认）</p><p class="screen-note">计算时间 {{calculatedAt.toLocaleString('zh-CN')}} · 业务快照，尚未接入实时物流</p></article>
      <div class="delivery-side-column delivery-right-column">
        <article class="screen-block delivery-high-risk-block"><header><h2>高风险订单 TOP5</h2><button @click="showRows(overdueOrders,'高风险订单明细')">明细 ↗</button></header><ScreenChart :rows="deliveryHighRiskTop" unit="天" @select="name=>openFlow(name)"/><p class="screen-note">柱长为逾期天数；点击订单查看完整链路</p></article>
        <article class="screen-block"><header><h2>缺件风险 TOP5</h2><button @click="openShortage()">明细 ↗</button></header><ScreenChart :rows="shortageMaterialChart.slice(0,5).map(x=>({name:x[0],value:x[1]}))" unit="件" @select="openShortage"/><p class="screen-note">当前库存快照；生产影响需接入MES计划与BOM后判定</p></article>
        <article class="screen-block"><header><h2>异常类型分布 TOP5</h2><button @click="open('fulfillment','交付履约与风险明细')">全部异常 ↗</button></header><ScreenChart :rows="exceptionTypeTop" unit="单" @select="name=>showRows(exceptionTypes.find(x=>x.name===name)?.rows||[],name+' · 订单明细')"/><p class="screen-note">同一订单可能涉及多种异常，不作简单加总</p></article>
      </div>
    </div>
  </div>
  <ScreenModal v-if="modal" :title="detailId?'供应商画像详情':title" @close="modal=''">
    <template v-if="modal==='execution'"><p class="screen-note">当前订单队列，按订单号去重；缺失时间不计为0天。超时按演示阈值判定。</p><div class="screen-table"><table><thead><tr><th>订单/请购号</th><th>供应商</th><th>当前阶段</th><th>停留时长</th><th>预计交货日期</th><th>超时</th><th>操作</th></tr></thead><tbody><tr v-for="row in detailRows" :key="row.id"><td>{{row.id}}</td><td>{{row.supplier}}</td><td>{{row.state}}</td><td>{{row.dwell==null?'暂无':row.dwell.toFixed(1)+'天'}}</td><td>{{row.expected||'暂无'}}</td><td>{{row.overtime==null?'待补时间':row.overtime?'已超时':'未超时'}}</td><td><button v-if="row.lines.length" @click="openFlow(row.id)">查看链路 ↗</button></td></tr><tr v-if="!detailRows.length"><td colspan="7">当前筛选范围内暂无记录</td></tr></tbody></table></div></template>
    <template v-else-if="modal==='suppliers'">
      <template v-if="detailId"><button @click="detailId=''">← 返回列表</button><h2>{{selectedSupplierProfile?.supplier?.supplier_name||'供应商资料加载中'}}</h2><SupplierBasic/><SupplierProfileMetrics/><article class="screen-detail-rating"><h3>供应商评级</h3><div class="screen-rating-summary"><p>综合评级：{{selectedRatingSupplier?.level||'未评级'}}</p><div class="screen-rating-score"><span>综合得分</span><strong>{{selectedRatingSupplier?.score??'暂无'}}</strong><small>/ 100分</small></div></div><div class="screen-rating-layout"><SupplierPerformanceBarChart :dimensions="supplierRatingDetails.dimensions"/><div class="screen-table screen-rating-table"><table><thead><tr><th>一级维度</th><th>二级指标</th><th>得分（模拟）</th></tr></thead><tbody><template v-for="group in supplierRatingDetails.groups" :key="group.dimension"><tr v-for="(item,index) in group.criteria" :key="`${group.dimension}-${item.name}`"><td v-if="index===0" :rowspan="group.criteria.length">{{group.dimension}}</td><td>{{item.name}}</td><td>{{group.dimension==='供货修正系数'?item.score.toFixed(2):item.score.toFixed(1)}}{{group.dimension==='供货修正系数'?'':'分'}}</td></tr></template></tbody></table></div></div></article><SupplierCapacity/><SupplierDelivery :show-metrics="false"/><SupplierQuality :show-metrics="false"/></template>
      <template v-else><input v-model="query" placeholder="供应商名称或编号" aria-label="查询供应商"><div class="screen-table"><table><thead><tr><th>供应商编号</th><th>供应商名称</th><th>省份</th><th>状态</th><th>评级</th><th>操作</th></tr></thead><tbody><tr v-for="s in supplierRows" :key="s.id"><td>{{s.id}}</td><td>{{s.name}}</td><td>{{s.region}}</td><td>{{supplierStatusLabel(s.status)}}</td><td>{{s.level}}</td><td><button @click="supplierDetail(s.id)">查看画像</button></td></tr><tr v-if="!supplierRows.length"><td colspan="6">没有匹配的供应商</td></tr></tbody></table></div><footer class="screen-pagination"><span>共 {{supplierResults.length}} 家</span><select v-model.number="pageSize"><option v-for="n in [10,20,50]" :value="n" :key="n">{{n}}条/页</option></select><button :disabled="page<=1" @click="page--">上一页</button>{{page}} / {{pages}}<button :disabled="page>=pages" @click="page++">下一页</button></footer></template>
    </template>
    <template v-else-if="modal==='classification'"><p>{{group}}：{{classification.items.find(x=>x.classify_name===group)?.count}} 家。当前为模拟汇总数量，尚未建立分类与单个供应商的真实对应关系。</p><SupplierClassificationPie dark :rows="classification.items"/></template>
    <FlowDetail v-else-if="modal==='flow'"/><FulfillmentDetail v-else-if="modal==='fulfillment'"/><ShortageDetail v-else-if="modal==='shortage'" :material-name="shortageMaterial"/><RatioDetail v-else-if="modal==='ratio'" :initial-material="material" :initial-start="deliveryStart" :initial-end="deliveryEnd"/><PriceDetail v-else-if="modal==='price'" :initial-material="material" :initial-start="deliveryStart" :initial-end="deliveryEnd"/>
    <template v-else-if="modal==='procurement'"><ProcurementCharts type="request" :rows="procurementMaterialAnalysis"/><ProcurementCharts type="progress" :rows="procurementMaterialAnalysis"/></template>
    <NewProductArrivalTracking v-else-if="modal==='newProductTracking'" detailed/>
  </ScreenModal>
</section>
</template>

<style scoped>
.delivery-upper-grid .execution-process-block{display:flex;flex-direction:column;justify-content:flex-start;gap:6px;overflow:hidden!important;}
.delivery-upper-grid .execution-process-block>header{flex:none;}
.delivery-upper-grid .execution-process-block>.procurement-flow{flex:1 1 0;min-height:0;}
.delivery-upper-grid .execution-process-block>.screen-note{flex:none;}
.supply-ratio-summary-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:center;gap:6px;flex:1;min-height:0;}
.supply-ratio-summary-card{display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 4px;border:1px solid #28516c;border-radius:6px;background:linear-gradient(145deg,#12334b,#0b2036);text-align:center;}
.supply-ratio-summary-card span{color:#a5c5dc;font-size:10px;line-height:1.3;}
.supply-ratio-summary-card strong{color:#60d9ce;font-size:24px;line-height:1.1;font-variant-numeric:tabular-nums;}
.supply-ratio-summary-card small{color:#7f9db5;font-size:9px;}
.supply-ratio-summary-card.green strong{color:#5ee0b0;}
.supply-ratio-summary-card.amber strong{color:#ffbd69;}
@media(max-width:1100px){.supply-ratio-summary-cards{gap:3px}.supply-ratio-summary-card{padding:6px 2px}.supply-ratio-summary-card span{font-size:9px}.supply-ratio-summary-card strong{font-size:20px}}
.screen-rating-summary{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.screen-rating-summary>p{margin:0;font-weight:600;color:#e0f2fe!important;}
.screen-rating-score{display:flex;align-items:baseline;gap:8px;padding:10px 14px;border:1px solid #31506c;border-radius:8px;background:#0b1d34;}
.screen-rating-score span{color:#a9c7df;}
.screen-rating-score strong{font-size:26px;color:#75eeff;}
.screen-rating-score small{color:#9dbbd4;}
.screen-rating-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start;}
.screen-detail-rating h4{margin:18px 0 8px;color:#d5ebfa;}
.screen-rating-table{height:340px;max-height:340px;min-width:0;flex:none;overflow:auto;}
.screen-rating-table table{width:100%;table-layout:fixed;}
.screen-rating-table th:first-child,.screen-rating-table td:first-child{width:27%;}
.screen-rating-table th:last-child,.screen-rating-table td:last-child{width:28%;white-space:nowrap;}
.screen-rating-table td{overflow-wrap:anywhere;}
@media(max-width:800px){.screen-rating-layout{grid-template-columns:1fr;}}
</style>
