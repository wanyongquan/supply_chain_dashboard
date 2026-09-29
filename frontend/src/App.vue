<script setup>
import {createDashboard} from './composables/useDashboard';
const {D,NAV,active,profileSub,deliverySub,role,alertOpen,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,deliveryStart,deliveryEnd,deliveryStatus,deliveryOrderQuery,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,riskAlerts,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,deliveryStatusOptions,selectedFlowOrder,workflowNodes,deliverySummaryCards,abnormalOrders,fulfillmentRows,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare}=createDashboard();
</script>
<template>
  <div class="figma-app">
    <div v-if="apiError" class="figma-alert"><b>数据接口异常</b><span>{{apiError}}</span></div>
    <header class="figma-top">
      <div class="figma-brand"><span>◈</span><div><b>供应链数据中台</b><small>Supplier Intelligence Platform</small></div></div>
      <div class="top-actions"><small>数据源：Demo 原始记录</small><button class="alert-pill" @click="alertOpen=!alertOpen">⚠ {{riskAlerts.length}} 条预警</button><select v-model="role"><option>公司管理层</option><option>中层管理层</option></select><i>采</i></div>
    </header>
    <div v-if="alertOpen" class="figma-alert"><b>风险预警</b><span v-for="alert in riskAlerts"><i></i>{{alert}}</span><span v-if="!riskAlerts.length">当前没有符合预警条件的数据</span><button @click="alertOpen=false">×</button></div>
    <div :class="['viewbar',role==='公司管理层'?'blue':'purple']"><b>当前视角：{{role}}</b><span>— {{role==='公司管理层'?'优先展示公司层面整体统计与分析':'优先关注日常操作明细与查询功能'}}</span></div>
    <div class="app-workspace">
      <aside class="figma-sidebar"><div class="side-caption">供应链主题看板</div><button v-for="n in NAV" :class="{active:active===n.id}" @click="active=n.id"><i>{{n.icon}}</i><span><b>{{n.label}}</b><small>{{n.sub}}</small></span></button><div class="side-status"><b>数据源状态</b><span><i></i>Demo JSON 已加载</span><small>统计由原始记录生成</small></div></aside>
      <main class="figma-main"><div class="page-heading"><div><h1>{{current.label}}</h1><p>{{current.sub}}</p></div></div>

        <RouterView />
      </main>
    </div>
  </div></template>
