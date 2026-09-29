<script setup>
import SupplierMap from '../../components/SupplierMap.vue';
import {useDashboard} from '../../composables/useDashboard';
const {D,NAV,active,profileSub,deliverySub,role,alertOpen,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,deliveryStart,deliveryEnd,deliveryStatus,deliveryOrderQuery,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,riskAlerts,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,deliveryStatusOptions,selectedFlowOrder,workflowNodes,deliverySummaryCards,abnormalOrders,fulfillmentRows,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare}=useDashboard();
</script>
<template>
<section class="page-stack">
          <Divider label="整体供应商统计概览" :hot="role==='公司管理层'" :role="role"/>
          <div class="query-panel compact"><label>状态<select v-model="profileStatus"><option value="全部">全部</option><option v-for="item in profileOverview.lifecycle_distribution" :value="item.name">{{item.name}}</option></select></label><label>供应商等级<select v-model="profileLevel"><option value="全部">全部</option><option v-for="item in profileOverview.rating_distribution" :value="item.name">{{item.name==='未评级'?'未评级':item.name+'级'}}</option></select></label><button @click="profileStatus='全部';profileLevel='全部'">重置</button></div>
          <div class="stat-grid six"><Stat label="供应商总数" :value="profileOverview.supplier_count+'家'"/><Stat label="在供供应商" :value="profileOverview.active_supplier_count+'家'" tone="green"/><Stat label="中高风险供应商" :value="profileOverview.risk_supplier_count+'家'" tone="amber"/><Stat label="平均评级得分" :value="profileOverview.average_score+'分'"/><Stat label="准时交付率" :value="profileOverview.on_time_delivery_rate===null?'暂无':profileOverview.on_time_delivery_rate+'%'" tone="green"/><Stat label="批次质量合格率" :value="profileOverview.quality_pass_rate===null?'暂无':profileOverview.quality_pass_rate+'%'" tone="green"/></div>
          <div class="grid map-layout"><Card title="供应商省份分布"><SupplierMap :data="provinceOverview" /></Card><DataBox title="省份供应商数量排行" :headers="['省份','供应商数量']" :rows="Object.entries(provinceOverview).sort((a,b)=>b[1]-a[1]).map(x=>[x[0],x[1]+'家'])"/></div>
          </section>
</template>
