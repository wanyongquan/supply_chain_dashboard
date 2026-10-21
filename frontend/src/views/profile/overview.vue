<script setup>
import {computed} from 'vue';
import SupplierDirectory from '../../components/SupplierDirectory.vue';
import SupplierDirectoryFilters from '../../components/SupplierDirectoryFilters.vue';
import SupplierMap from '../../components/SupplierMap.vue';
import SupplierClassificationPie from '../../components/SupplierClassificationPie.vue';
import classificationMock from '../../../../data/mock_supplier_classification.json';
import {useDashboard} from '../../composables/useDashboard';
const {D,NAV,active,profileSub,deliverySub,role,alertOpen,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,deliveryStart,deliveryEnd,deliveryStatus,deliveryOrderQuery,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,riskAlerts,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,deliveryStatusOptions,selectedFlowOrder,workflowNodes,deliverySummaryCards,abnormalOrders,fulfillmentRows,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare}=useDashboard();
const provinceRanking=computed(()=>Object.entries(provinceOverview.value)
  .map(([name,count])=>({name,count:Number(count)}))
  .sort((a,b)=>b.count-a.count));
const maxProvinceCount=computed(()=>Math.max(1,...provinceRanking.value.map(item=>item.count)));
const overviewMetrics=computed(()=>[
  {label: '供应商总数', value: `${profileOverview.value?.supplier_count ?? 0}家`},
  {label: '合格供应商', value: `${profileOverview.value?.active_supplier_count ?? 839}家`, tone: 'green'},
  {label: '淘汰供应商', value: '2家', tone: 'amber'},
  {label: '陌生供应商', value: '1家'},
  {label: '黑名单供应商', value: '1家', tone: 'red'},
  {label: '中高风险供应商', value: `${profileOverview.value?.risk_supplier_count ?? 0}家`, tone: 'amber'}
]);
</script>
<template>
<section class="page-stack">
          <SupplierDirectoryFilters/>
          <div class="stat-grid six indicator-card-group supplier-overview-stats"><Stat v-for="item in overviewMetrics" :key="item.label" :label="item.label" :value="item.value" :tone="item.tone" /></div>
          <div class="grid map-layout">
            <Card title="供应商省份分布"><SupplierMap :data="provinceOverview" /></Card>
            <Card title="供应商分类数量（模拟数据）"><SupplierClassificationPie :rows="classificationMock.items" /></Card>
            <!-- 保留省份排行，后续可恢复展示。 -->
            <Card v-if="false" title="省份供应商数量排行">
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
