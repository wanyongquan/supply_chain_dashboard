<script setup>
import {useDashboard} from '../composables/useDashboard';
const {D,NAV,active,profileSub,deliverySub,role,alertOpen,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,deliveryStart,deliveryEnd,deliveryStatus,deliveryOrderQuery,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,riskAlerts,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,deliveryStatusOptions,selectedFlowOrder,workflowNodes,deliverySummaryCards,abnormalOrders,fulfillmentRows,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare}=useDashboard();
</script>
<template>
<section class="page-stack"><div class="profile-subnav"><button v-for="x in [{id:'overview',label:'主页概览'},{id:'basic',label:'基础信息'},{id:'capacity',label:'供应能力'},{id:'delivery',label:'履约分析'},{id:'credit',label:'信用风险'},{id:'quality',label:'质量管理'}]" :class="{active:profileSub===x.id}" @click="profileSub=x.id">{{x.label}}</button></div><RouterView /></section>
</template>
