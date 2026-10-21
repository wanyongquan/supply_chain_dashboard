<script setup>
import {createDashboard} from './composables/useDashboard';
const {D,NAV,active,profileSub,deliverySub,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,deliveryStart,deliveryEnd,deliveryOrderQuery,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,selectedFlowOrder,workflowNodes,deliverySummaryCards,abnormalOrders,fulfillmentRows,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare}=createDashboard();
</script>
<template>
  <div class="figma-app">
    <div v-if="apiError" class="figma-alert"><b>数据接口异常</b><span>{{apiError}}</span></div>
    <div class="app-workspace">
      <aside class="figma-sidebar" aria-label="主导航"><button v-for="n in NAV" :key="n.id" :title="n.label" :aria-label="n.label" :class="{active:active===n.id}" @click="active=n.id"><i aria-hidden="true">{{n.icon}}</i><span><b>{{n.label}}</b></span></button></aside>
      <main class="figma-main"><div class="page-heading"><div><h1>{{current.label}}</h1></div></div>

        <RouterView />
      </main>
    </div>
  </div></template>
