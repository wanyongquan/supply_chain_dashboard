<script setup>
import {computed} from 'vue';
import SupplierDirectory from '../../components/SupplierDirectory.vue';
import SupplierDirectoryFilters from '../../components/SupplierDirectoryFilters.vue';
import SupplierMap from '../../components/SupplierMap.vue';
import {useDashboard} from '../../composables/useDashboard';
const {D,NAV,active,profileSub,deliverySub,role,alertOpen,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,deliveryStart,deliveryEnd,deliveryStatus,deliveryOrderQuery,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,riskAlerts,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,deliveryStatusOptions,selectedFlowOrder,workflowNodes,deliverySummaryCards,abnormalOrders,fulfillmentRows,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare}=useDashboard();
const provinceRanking=computed(()=>Object.entries(provinceOverview.value)
  .map(([name,count])=>({name,count:Number(count)}))
  .sort((a,b)=>b.count-a.count));
const maxProvinceCount=computed(()=>Math.max(1,...provinceRanking.value.map(item=>item.count)));
</script>
<template>
<section class="page-stack">
          <SupplierDirectoryFilters/>
          <div class="stat-grid six"><Stat label="供应商总数" :value="profileOverview.supplier_count+'家'"/><Stat label="在供供应商" :value="profileOverview.active_supplier_count+'家'" tone="green"/><Stat label="中高风险供应商" :value="profileOverview.risk_supplier_count+'家'" tone="amber"/><Stat label="平均评级得分" :value="profileOverview.average_score+'分'"/><Stat label="准时交付率" :value="profileOverview.on_time_delivery_rate===null?'暂无':profileOverview.on_time_delivery_rate+'%'" tone="green"/><Stat label="批次质量合格率" :value="profileOverview.quality_pass_rate===null?'暂无':profileOverview.quality_pass_rate+'%'" tone="green"/></div>
          <div class="grid map-layout">
            <Card title="供应商省份分布"><SupplierMap :data="provinceOverview" /></Card>
            <Card title="省份供应商数量排行">
              <div class="province-ranking">
                <div v-for="item in provinceRanking" :key="item.name" class="province-ranking-row">
                  <span>{{item.name}}</span>
                  <div class="province-ranking-track"><i :style="{width:(item.count/maxProvinceCount*100)+'%'}"></i></div>
                  <b>{{item.count}}</b>
                </div>
              </div>
            </Card>
          </div>
          <SupplierDirectory/>
</section>
</template>

<style scoped>
.province-ranking {
  height: 100%;
  overflow-y: auto;
}

.province-ranking-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 38px;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  color: #334155;
  font-size: 12px;
}

.province-ranking-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #eaf3fb;
}

.province-ranking-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #0070db;
}

.province-ranking-row b {
  color: #1f2937;
  text-align: right;
}
</style>
