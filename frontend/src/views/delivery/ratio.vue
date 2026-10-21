<script setup>
import {computed,ref,watch} from 'vue';
import {useDashboard} from '../../composables/useDashboard';
import SupplyRatioExecutionChart from '../../components/SupplyRatioExecutionChart.vue';

const {D,buildSupplyExecution}=useDashboard();
const props=defineProps({initialMaterial:String,initialStart:String,initialEnd:String});
const startDate=ref(props.initialStart||'');
const endDate=ref(props.initialEnd||'');
const appliedStartDate=ref(props.initialStart||'');
const appliedEndDate=ref(props.initialEnd||'');
const materialQuery=ref(props.initialMaterial||'');
const appliedMaterialQuery=ref(props.initialMaterial||'');
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
const filteredRows=computed(()=>{
  const query=appliedMaterialQuery.value.trim().toLocaleLowerCase();
  return ratioRows.value.filter(row=>!query||`${row.materialId} ${row.material}`.toLocaleLowerCase().includes(query))
    .sort((a,b)=>a.material.localeCompare(b.material,'zh-CN')||a.supplier.localeCompare(b.supplier,'zh-CN'));
});
const monitoredMaterialCount=computed(()=>new Set(filteredRows.value.map(row=>row.materialId)).size);
const deviationMaterialCount=computed(()=>new Set(filteredRows.value.filter(row=>row.receiptQty<=0||Math.abs(row.deviation)>10).map(row=>row.materialId)).size);
const normalMaterialCount=computed(()=>Math.max(0,monitoredMaterialCount.value-deviationMaterialCount.value));

const submitDateFilter=()=>{
  dateError.value='';
  if(startDate.value&&endDate.value&&startDate.value>endDate.value){
    dateError.value='开始日期不能晚于结束日期';
    return;
  }
  appliedStartDate.value=startDate.value;
  appliedEndDate.value=endDate.value;
  appliedMaterialQuery.value=materialQuery.value;
};
</script>

<template>
  <section class="page-stack supply-ratio-page">
    <section class="ratio-detail-section ratio-query-section">
      <header><h3>查询条件</h3><p>按时间区间和物料范围查询供货比例到货执行情况</p></header>
      <form class="query-panel ratio-date-filter" @submit.prevent="submitDateFilter">
        <label>开始日期<input v-model="startDate" type="date"></label>
        <label>结束日期<input v-model="endDate" type="date"></label>
        <label class="ratio-material-query">物料编码或名称<input v-model="materialQuery" type="search" placeholder="输入物料编码或名称"></label>
        <button type="submit">查询分析</button>
        <span v-if="dateError" class="ratio-date-error">{{dateError}}</span>
      </form>
    </section>

    <section class="ratio-detail-section">
      <header><h3>目标与实际比例对比</h3><p>系统设定比例与实际到货数量占比，横向对比供应商执行情况</p></header>
      <div class="ratio-execution-kpis">
        <article><span>监控物料数</span><strong>{{monitoredMaterialCount}}</strong></article>
        <article><span>执行正常数</span><strong>{{normalMaterialCount}}</strong></article>
        <article class="ratio-kpi-warning"><span>偏差物料数</span><strong>{{deviationMaterialCount}}</strong></article>
      </div>
      <SupplyRatioExecutionChart :rows="filteredRows"/>
    </section>

    <section class="ratio-detail-section ratio-material-details">
      <header><h3>物料及供应商明细</h3><p>共 {{filteredRows.length}} 条供应商协议记录；到货占比偏离设定比例超过 10 个百分点或暂无到货时标记为偏差</p></header>
      <div v-if="filteredRows.length" class="screen-table">
        <table>
          <thead><tr><th>物料编码</th><th>物料名称</th><th>供应商</th><th>系统设定比例</th><th>采购订单数量</th><th>实际到货数量</th><th>实际到货比例</th><th>偏差</th><th>执行状态</th></tr></thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="`${row.materialId}-${row.supplierId}`">
              <td>{{row.materialId}}</td><td>{{row.material}}</td><td>{{row.supplier}}</td>
              <td>{{row.agreement.toFixed(1)}}%</td><td>{{row.orderQty.toLocaleString()}}</td><td>{{row.receiptQty.toLocaleString()}}</td>
              <td>{{row.arrivalRatio.toFixed(1)}}%</td><td :class="{'ratio-deviation':row.receiptQty<=0||Math.abs(row.deviation)>10}">{{row.deviation>0?'+':''}}{{row.deviation.toFixed(1)}}个百分点</td>
              <td><span :class="['ratio-status',{warning:row.receiptQty<=0||Math.abs(row.deviation)>10}]">{{row.receiptQty<=0?'暂无到货':Math.abs(row.deviation)>10?'比例偏差':'执行正常'}}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="ratio-empty">当前查询条件下没有可展示的供货协议或订单到货记录</div>
    </section>
  </section>
</template>

<style scoped>
.ratio-detail-section{min-width:0;padding:16px;border:1px solid #25445f;border-radius:8px;background:linear-gradient(145deg,#102940,#0a1c31);}
.ratio-detail-section>header{margin-bottom:12px;}
.ratio-detail-section>header h3{margin:0;color:#d8efff;font-size:15px;}
.ratio-detail-section>header p{margin:4px 0 0;color:#90abc2;font-size:11px;}
.ratio-date-filter{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;}
.ratio-date-filter label{display:flex;flex-direction:column;gap:5px;min-width:175px;color:#a9c5dc;font-size:12px;}
.ratio-date-filter .ratio-material-query{flex:1 1 240px;}
.ratio-date-filter input{min-width:0;}
.ratio-date-error{color:#fca5a5;font-size:12px;}
.ratio-execution-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:8px;}
.ratio-execution-kpis article{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border:1px solid #2b526b;border-radius:6px;background:#0b2138;}
.ratio-execution-kpis span{color:#9bb8d0;font-size:11px;}
.ratio-execution-kpis strong{color:#62ddca;font-size:20px;font-variant-numeric:tabular-nums;}
.ratio-execution-kpis .ratio-kpi-warning strong{color:#ffbd69;}
.ratio-material-details .screen-table{max-height:360px;}
.ratio-material-details table{min-width:880px;font-size:11px;}
.ratio-material-details th,.ratio-material-details td{padding:8px 6px;}
.ratio-status{color:#62ddca;}
.ratio-status.warning,.ratio-deviation{color:#ff9b85!important;}
.ratio-empty{padding:22px;border:1px solid #25445f;border-radius:8px;background:#0b2138;color:#94a3b8;text-align:center;}
@media(max-width:700px){.ratio-detail-section{padding:10px}.ratio-execution-kpis article{align-items:flex-start;flex-direction:column;padding:8px}.ratio-execution-kpis span{font-size:10px}}
</style>
