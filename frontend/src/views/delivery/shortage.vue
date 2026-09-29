<script setup>
import {useDashboard} from '../../composables/useDashboard';
const {D,NAV,active,profileSub,deliverySub,role,alertOpen,apiError,supplierId,detailTab,priceTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,deliveryStart,deliveryEnd,deliveryStatus,deliveryOrderQuery,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,riskAlerts,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,filteredDeliveryOrders,deliveryStatusOptions,selectedFlowOrder,workflowNodes,deliverySummaryCards,abnormalOrders,fulfillmentRows,shortageRows,shortageSupplierChart,shortageMaterialChart,supplyExecution,supplierNameById,materialNameById,selectSupplier,toggleCompare}=useDashboard();
</script>
<template>
<section class="page-stack"><div class="grid two"><BarBox title="按供应商缺件订单数（前20）" :values="shortageSupplierChart.map(x=>x[1])" :labels="shortageSupplierChart.map(x=>x[0].slice(0,6))"/><BarBox title="按物料缺件数量（前20）" :values="shortageMaterialChart.map(x=>x[1])" :labels="shortageMaterialChart.map(x=>x[0].slice(0,6))"/></div><DataBox title="物料在途与缺件明细" :headers="['订单号','物料编号','物料名称','供应商','订单量','在途量','可用库存','安全库存','缺口数量','预计到达日期','风险']" :rows="shortageRows"/></section>
</template>
