<script setup>
import {useDashboard} from '../composables/useDashboard';

const {selectedSupplierProfile}=useDashboard();
</script>

<template>
  <Card title="绩效指标">
    <div class="supplier-profile-metrics">
      <Stat label="订单确认时效（均）" :value="selectedSupplierProfile?.statistics.average_confirmation_days==null?'暂无':selectedSupplierProfile.statistics.average_confirmation_days+'天'"/>
      <Stat label="准时交付率" :value="selectedSupplierProfile?.statistics.on_time_delivery_rate==null?'暂无':selectedSupplierProfile.statistics.on_time_delivery_rate+'%'" tone="green"/>
      <Stat label="逾期订单数" :value="(selectedSupplierProfile?.statistics.overdue_order_count||0)+'单'" tone="amber"/>
      <Stat label="平均到货周期" :value="selectedSupplierProfile?.statistics.arrival_cycle_days==null?'暂无':selectedSupplierProfile.statistics.arrival_cycle_days+'天'"/>
      <Stat label="质量保证金余额" :value="selectedSupplierProfile?.credit.deposit_amount==null?'暂无':'¥'+selectedSupplierProfile.credit.deposit_amount.toLocaleString()"/>
      <Stat label="本月变动" :value="selectedSupplierProfile?.credit.monthly_change==null?'暂无':(selectedSupplierProfile.credit.monthly_change>0?'+':'')+'¥'+selectedSupplierProfile.credit.monthly_change.toLocaleString()" :tone="selectedSupplierProfile?.credit.monthly_change==null?'':selectedSupplierProfile.credit.monthly_change>=0?'green':'amber'"/>
      <Stat label="累计扣款（本年）" :value="selectedSupplierProfile?.credit.annual_deduction==null?'暂无':'¥'+selectedSupplierProfile.credit.annual_deduction.toLocaleString()" tone="amber"/>
      <Stat label="来料批次合格率" :value="selectedSupplierProfile?.statistics.quality_pass_rate==null?'暂无':selectedSupplierProfile.statistics.quality_pass_rate+'%'" tone="green"/>
      <Stat label="PPM（百万缺陷率）" :value="selectedSupplierProfile?.statistics.ppm==null?'暂无':selectedSupplierProfile.statistics.ppm" tone="green"/>
      <Stat label="退货批次率" :value="selectedSupplierProfile?.statistics.return_batch_rate==null?'暂无':selectedSupplierProfile.statistics.return_batch_rate+'%'"/>
      <Stat label="8D整改闭环率" :value="selectedSupplierProfile?.statistics.eight_d_closure_rate==null?'暂无':selectedSupplierProfile.statistics.eight_d_closure_rate+'%'" tone="green"/>
    </div>
  </Card>
</template>

<style scoped>
.supplier-profile-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}
@media(max-width:900px){.supplier-profile-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}}
</style>
