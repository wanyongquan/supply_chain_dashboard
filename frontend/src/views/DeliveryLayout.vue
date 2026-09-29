<script setup>
import {useDashboard} from '../composables/useDashboard';
const {D,NAV,active,profileSub,deliverySub,role,alertOpen,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,deliveryStart,deliveryEnd,deliveryStatus,deliveryOrderQuery,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,riskAlerts,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,deliveryStatusOptions,selectedFlowOrder,workflowNodes,deliverySummaryCards,abnormalOrders,fulfillmentRows,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare}=useDashboard();
</script>
<template>
<section class="page-stack"><div class="profile-subnav delivery-subnav"><button v-for="x in [{id:'overview',label:'采购综合分析'},{id:'flow',label:'订单全链路跟踪'},{id:'exceptions',label:'异常订单监控'},{id:'fulfillment',label:'交付履约分析'},{id:'shortage',label:'缺件分析'},{id:'ratio',label:'供货比例分析'}]" :class="{active:deliverySub===x.id}" @click="deliverySub=x.id">{{x.label}}</button></div><RouterView /></section>
</template>
