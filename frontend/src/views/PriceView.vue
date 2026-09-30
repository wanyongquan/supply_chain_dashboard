<script setup>
import {computed,ref} from 'vue';
import {useDashboard} from '../composables/useDashboard';
import PriceHistoryChart from '../components/PriceHistoryChart.vue';

const {D,priceTab,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,selectedMaterial}=useDashboard();
const materialCode=ref('G000000011028');
const startDate=ref('2026-07-01');
const endDate=ref('2026-09-30');
const appliedFilters=ref({materialCode:materialCode.value,startDate:startDate.value,endDate:endDate.value});
const materialOptions=computed(()=>[...new Set((D.value.purchaseHistory||[]).map(item=>item.material_id))]);
const historyRows=computed(()=>{
  const filters=appliedFilters.value;
  return (D.value.purchaseHistory||[])
    .filter(item=>(!filters.materialCode||item.material_id===filters.materialCode)
      &&(!filters.startDate||item.order_date>=filters.startDate)
      &&(!filters.endDate||item.order_date<=filters.endDate))
    .sort((a,b)=>a.order_date.localeCompare(b.order_date)||a.order_id.localeCompare(b.order_id));
});
const applyHistoryFilters=()=>{
  appliedFilters.value={materialCode:materialCode.value.trim(),startDate:startDate.value,endDate:endDate.value};
};
const historyTableRows=computed(()=>historyRows.value.map(item=>[
  item.order_id,item.supplier_name,item.material_name,item.specification||'-',
  Number(item.quantity).toLocaleString(),`¥${Number(item.unit_price).toFixed(2)}`
]));
</script>
<template>
  <section class="page-stack">
    <Tabs :items="['物料历史价格']" v-model="priceTab"/>
    <template v-if="priceTab===0">
      <form class="price-history-filter" @submit.prevent="applyHistoryFilters">
        <label>物料编码
          <input v-model="materialCode" list="purchase-history-materials" placeholder="输入物料编码">
          <datalist id="purchase-history-materials"><option v-for="code in materialOptions" :key="code" :value="code"/></datalist>
        </label>
        <label>采购起始日期<input v-model="startDate" type="date"></label>
        <label>采购结束日期<input v-model="endDate" type="date"></label>
        <button type="submit">查询</button>
      </form>
      <article class="price-history-chart-block">
        <header>供应商成交价趋势</header>
        <PriceHistoryChart :records="historyRows"/>
      </article>
      <DataBox title="采购单明细" :headers="['采购单号','供应商名称','物料名称','规格','数量','成交价']" :rows="historyTableRows"/>
    </template>
    <template v-else>
      <div class="query-panel"><label>物料<select v-model="selectedMaterial"><option v-for="(m,i) in D.materials" :key="m[0]" :value="i">{{m[1]}}</option></select></label></div>
      <template v-if="priceTab===1"><BarBox title="所选物料成交价对比" :values="selectedPriceComparison.map(x=>x[2])" :labels="selectedPriceComparison.map(x=>x[0].slice(0,5))"/><DataBox title="多供应商成交价明细" :headers="['供应商','物料','成交价','基准价','偏差','采购数量','质量合格率','时间遵守率']" :rows="selectedPriceComparison.map(x=>[x[0],x[1],'¥'+x[2].toFixed(2),'¥'+x[3].toFixed(2),x[4]+'%',x[5],x[6],x[7]])"/></template>
      <template v-else><DataBox title="所选物料成交价差估算" :headers="['供应商与物料','推算基准价','执行价差','偏差率','口径']" :rows="selectedCostFactors.map(x=>[x[0],'¥'+x[1].toFixed(2),(x[2]>0?'+':'')+'¥'+x[2].toFixed(2),x[3],x[4]])"/></template>
    </template>
  </section>
</template>
