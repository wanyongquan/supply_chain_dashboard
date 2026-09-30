<script setup>
import {createDashboard} from './composables/useDashboard';
const {D,NAV,active,profileSub,deliverySub,role,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,deliveryStart,deliveryEnd,deliveryStatus,deliveryOrderQuery,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,deliveryStatusOptions,selectedFlowOrder,workflowNodes,deliverySummaryCards,abnormalOrders,fulfillmentRows,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare}=createDashboard();
</script>
<template>
  <div class="figma-app">
    <div v-if="apiError" class="figma-alert"><b>数据接口异常</b><span>{{apiError}}</span></div>
    <header class="figma-top">
      <div class="figma-brand"><span>◈</span><div><b>供应链数据中台</b><small>Supplier Intelligence Platform</small></div></div>
      <div class="top-actions"><small>数据源：Demo 原始记录</small><select v-model="role"><option>公司管理层</option><option>中层管理层</option></select><i>采</i></div>
    </header>
    <div class="app-workspace">
      <aside class="figma-sidebar"><div class="side-caption">供应链主题看板</div><button v-for="n in NAV" :class="{active:active===n.id}" @click="active=n.id"><i>{{n.icon}}</i><span><b>{{n.label}}</b></span></button><div class="side-status"><b>数据源状态</b><span><i></i>Demo JSON 已加载</span><small>统计由原始记录生成</small></div></aside>
      <main class="figma-main"><div class="page-heading"><div><h1>{{current.label}}</h1></div></div>

        <RouterView />
      </main>
    </div>
  </div></template>
