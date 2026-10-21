<script setup>
import {computed} from 'vue';
import {useDashboard} from '../../composables/useDashboard';
const {D,NAV,active,profileSub,deliverySub,role,alertOpen,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,deliveryStart,deliveryEnd,deliveryStatus,deliveryOrderQuery,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,riskAlerts,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,deliveryStatusOptions,selectedFlowOrder,workflowNodes,deliverySummaryCards,abnormalOrders,fulfillmentRows,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare}=useDashboard();
const hiddenProfileFields=new Set(['成立日期','注册地址','经营范围','年营业额','主营产品','注册资本']);
const profileFields=computed(()=> (selectedSupplierProfile.value?.profile_fields||[])
  .filter(field=>!hiddenProfileFields.has(field.label))
  .map(field=>({
    ...field,
    value:field.value==null||field.value===''||field.value==='-'?'无数据':field.value
  })));
</script>
<template>
<section class="page-stack supplier-basic-page">
  <Card title="基础信息">
    <div class="supplier-profile-metrics">
      <Stat v-for="field in profileFields" :key="field.label" :label="field.label" :value="field.value"/>
    </div>
  </Card>
</section>
</template>

<style scoped>
.supplier-profile-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}
@media(max-width:900px){.supplier-profile-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}}
</style>
