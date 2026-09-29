<script setup>
import {useDashboard} from '../../composables/useDashboard';
const {D,NAV,active,profileSub,deliverySub,role,alertOpen,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,deliveryStart,deliveryEnd,deliveryStatus,deliveryOrderQuery,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,riskAlerts,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,deliveryStatusOptions,selectedFlowOrder,workflowNodes,deliverySummaryCards,abnormalOrders,fulfillmentRows,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare}=useDashboard();
</script>
<template>
<section class="page-stack"><div class="query-panel"><input v-model="deliveryOrderQuery" placeholder="订单号"><button>查询</button><button @click="deliveryOrderQuery=''">重置</button></div><DataBox title="异常订单监控" :headers="['订单号','物料编号','物料名称','供应商','订单数量','预计交期','当前状态','交付偏差','影响情况']" :rows="abnormalOrders"/></section>
</template>
