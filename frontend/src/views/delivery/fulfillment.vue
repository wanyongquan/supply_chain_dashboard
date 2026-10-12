<script setup>
import {useDashboard} from '../../composables/useDashboard';
const {deliveryStart,deliveryEnd,fulfillmentSummary,fulfillmentRows}=useDashboard();
</script>
<template>
<section class="page-stack">
  <div class="query-panel fulfillment-query">
    <label class="fulfillment-date">开始日期<input type="date" v-model="deliveryStart"></label>
    <label class="fulfillment-date">结束日期<input type="date" v-model="deliveryEnd"></label>
    <button type="button">查询</button>
  </div>
  <div class="stat-grid four indicator-card-group delivery-risk-stats">
    <Stat v-for="item in fulfillmentSummary" :key="item.label" :label="item.label" :value="item.value" :tone="item.tone" />
  </div>
  <DataBox title="交付风险明细" :headers="['状态','预期天数','订单号','供应商名称','物料编码','物料名称','单位','采购数量','到货数量','收货日期','要求交货日期']" :rows="fulfillmentRows"/>
</section>
</template>
