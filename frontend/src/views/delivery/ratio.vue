<script setup>
import {computed,ref,watch} from 'vue';
import {useDashboard} from '../../composables/useDashboard';
import SupplyRatioCharts from '../../components/SupplyRatioCharts.vue';

const {D,buildSupplyExecution}=useDashboard();
const startDate=ref('');
const endDate=ref('');
const appliedStartDate=ref('');
const appliedEndDate=ref('');
const selectedMaterialId=ref('');
const dateError=ref('');
const flow=computed(()=>D.value.deliveryFlow||{});
const dateBounds=computed(()=>{
  const dates=[
    ...(flow.value.rawOrders||[]).map(item=>item.order_date),
    ...(flow.value.receipts||[]).map(item=>item.arrived_at?.slice(0,10))
  ].filter(Boolean).sort();
  return {start:dates[0]||'',end:dates[dates.length-1]||''};
});
watch(dateBounds,bounds=>{
  if(!startDate.value&&bounds.start)startDate.value=bounds.start;
  if(!endDate.value&&bounds.end)endDate.value=bounds.end;
  if(!appliedStartDate.value&&bounds.start)appliedStartDate.value=bounds.start;
  if(!appliedEndDate.value&&bounds.end)appliedEndDate.value=bounds.end;
},{immediate:true});

const ratioRows=computed(()=>buildSupplyExecution(appliedStartDate.value,appliedEndDate.value));
const materialGroups=computed(()=>{
  const grouped=new Map();
  ratioRows.value.forEach(row=>{
    if(!grouped.has(row.materialId))grouped.set(row.materialId,{materialId:row.materialId,name:row.material,rows:[]});
    grouped.get(row.materialId).rows.push(row);
  });
  return [...grouped.values()].map(group=>({
    ...group,
    rows:group.rows.slice().sort((first,second)=>first.supplier.localeCompare(second.supplier,'zh-CN')),
    totalOrderQty:group.rows.reduce((sum,row)=>sum+row.orderQty,0),
    totalReceiptQty:group.rows.reduce((sum,row)=>sum+row.receiptQty,0)
  })).sort((first,second)=>first.name.localeCompare(second.name,'zh-CN'));
});
const selectedGroup=computed(()=>materialGroups.value.find(group=>group.materialId===selectedMaterialId.value)||materialGroups.value[0]||null);
watch(materialGroups,groups=>{
  if(!groups.some(group=>group.materialId===selectedMaterialId.value))selectedMaterialId.value=groups[0]?.materialId||'';
},{immediate:true});

const submitDateFilter=()=>{
  dateError.value='';
  if(startDate.value&&endDate.value&&startDate.value>endDate.value){
    dateError.value='开始日期不能晚于结束日期';
    return;
  }
  appliedStartDate.value=startDate.value;
  appliedEndDate.value=endDate.value;
};
const selectMaterial=materialId=>{selectedMaterialId.value=materialId;};
const detailRows=computed(()=>selectedGroup.value?.rows.map(row=>[
  row.materialId,
  row.material,
  row.supplier,
  `${row.agreement.toFixed(1)}%`,
  row.orderQty.toLocaleString(),
  `${row.orderRatio.toFixed(1)}%`,
  row.receiptQty.toLocaleString(),
  `${row.arrivalRatio.toFixed(1)}%`,
  `${Math.abs(row.deviation).toFixed(1)}%`,
  row.receiptQty===0?'暂无到货':Math.abs(row.deviation)>10?'明显偏离':'正常'
])||[]);
</script>

<template>
  <section class="page-stack supply-ratio-page">
    <form class="query-panel ratio-date-filter" @submit.prevent="submitDateFilter">
      <label>开始日期<input v-model="startDate" type="date"></label>
      <label>结束日期<input v-model="endDate" type="date"></label>
      <button type="submit">查询分析</button>
      <span v-if="dateError" class="ratio-date-error">{{dateError}}</span>
    </form>

    <SupplyRatioCharts :groups="materialGroups" :selected-material-id="selectedMaterialId" @select-material="selectMaterial"/>

    <DataBox v-if="selectedGroup" :title="`${selectedGroup.name} · 供货比例执行明细`" :headers="['物料编码','物料名称','供应商','设定比例','订单数量','订单比例','实际到货量','实际到货占比','偏离绝对值','执行状态']" :rows="detailRows"/>
    <div v-else class="ratio-empty">当前时间范围内没有可展示的供货协议或订单到货记录</div>
  </section>
</template>

<style scoped>
.ratio-date-filter{align-items:flex-end;}
.ratio-date-filter label{min-width:180px;}
.ratio-date-error{color:#fca5a5;font-size:12px;}
.ratio-empty{padding:22px;border:1px solid #1e293b;border-radius:8px;background:#0f172a;color:#94a3b8;text-align:center;}
</style>