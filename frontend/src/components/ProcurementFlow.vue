<script setup>
import {computed} from 'vue';
const props=defineProps({cards:{type:Array,default:()=>[]},statuses:{type:Array,default:()=>[]}});
defineEmits(['stage','status']);
const labels=['请购','采购下单','供应商确认','送货/运输','收货检验','入库'];
const icons=['M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5','M3 6h18v15H3z M7 3v6 M17 3v6 M3 11h18','M4 12l5 5L20 6','M2 6h12v12H2z M14 10h4l4 4v4h-8 M6 18a2 2 0 1 0 0 .1 M18 18a2 2 0 1 0 0 .1','M10 3l7 3v6c0 4-7 8-7 8s-7-4-7-8V6z M6 11l3 3 5-6','M3 10l9-7 9 7v11H3z M8 21v-8h8v8'];
const total=computed(()=>props.statuses.reduce((sum,x)=>sum+x.value,0));
const percent=value=>total.value?(value/total.value*100).toFixed(1):'0.0';
const attention=x=>Number(x.pending)>0;
</script>

<template>
  <section class="procurement-flow">
    <div class="flow-caption"><span><i/>业务单据流转</span><small>节点可点击查看明细</small></div>
    <div class="flow-track">
      <template v-for="(x,i) in cards" :key="i">
        <button :class="['flow-node',{'needs-attention':attention(x),'has-issue':x.overtime>0,'stage-empty':!x.pending}]" :title="`${labels[i]}：未完结${x.pending}单；超时${x.overtime}单；平均停留${x.avgDays??'暂无'}天（${x.known}单有时间记录）。点击查看对应单据`" @click="$emit('stage',i)">
          <span class="node-order">{{String(i+1).padStart(2,'0')}}</span>
          <span class="node-symbol"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="icons[i]"/></svg></span>
          <h3>{{labels[i]}}</h3><strong>{{x.pending}}</strong><span class="node-label">当前未完结订单</span>
          <span class="node-secondary">超时 <b>{{x.overtime}}</b> 单</span><span class="node-secondary">平均停留 {{x.avgDays==null?'暂无':x.avgDays+'天'}}</span>
        </button>
        <span v-if="i<cards.length-1" class="flow-link" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 12h17m-6-6 6 6-6 6"/></svg></span>
      </template>
    </div>
    <section class="order-state-panel">
      <header><h3 title="按订单创建日期筛选，按当前流转状态归类。">在途订单状态色带</h3><span>共 <b>{{total}}</b> 单 · 按订单号去重</span></header>
      <div v-if="total" class="order-state-bar" role="img" :aria-label="statuses.map(x=>`${x.name}${x.value}单，物料数量${x.materialQuantity}`).join('，')"><button v-for="x in statuses" :key="x.name" :style="{'--status-color':x.color}" :title="`${x.name}：${x.value}单，物料数量${x.materialQuantity}件（${percent(x.value)}%）；点击查看明细`" @click="$emit('status',x.name)">{{x.name}}</button></div>
      <p v-else class="state-empty">当前日期范围内暂无订单</p>
      <div class="order-state-legend"><span v-for="x in statuses" :key="x.name" :title="`${x.name}：${x.value}单，物料数量${x.materialQuantity}件，占比${percent(x.value)}%`"><i :style="{background:x.color}"/><em :style="{color:x.color}">{{x.name}}</em><b :style="{color:x.color}">{{x.value}} 单</b><small>物料数量 {{x.materialQuantity}} 件</small><small>{{percent(x.value)}}%</small></span></div>
    </section>
  </section>
</template>

<style scoped>
.procurement-flow{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(ellipse at 50% 35%,#134d643d,transparent 70%)}
.flow-caption{display:flex;justify-content:space-between;align-items:center;color:#84b2cb;font-size:11px;margin:2px 0 8px}.flow-caption span{display:flex;align-items:center;gap:6px}.flow-caption i{width:5px;height:5px;background:#65e5e0;border-radius:50%;box-shadow:0 0 8px #47dcd0}.flow-caption small{font-size:10px;color:#7195b1}
.flow-track{display:grid;grid-template-columns:repeat(5,minmax(0,1fr) 22px) minmax(0,1fr);align-items:stretch;flex:1;min-height:145px}.flow-node{--node-color:#62dcf1;min-width:0;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 2px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#b6d8e8!important;text-align:center;transition:background .2s,transform .2s}.flow-node:hover,.flow-node:focus-visible{background:#19425a80!important;transform:translateY(-3px);outline:1px solid var(--node-color)}.flow-node.needs-attention{--node-color:#ffbb68}.flow-node.has-issue{--node-color:#ff7e87}.node-order{position:absolute;top:5px;left:6px;font-size:10px;color:#658da7}.node-symbol{margin:auto;display:grid;place-items:center;width:40px;height:40px;color:var(--node-color);border:1px solid currentColor;border-radius:12px;background:#11344a;box-shadow:0 0 20px #49d9ef15,inset 0 0 15px #49d9ef15;transform:rotate(45deg)}.node-symbol svg{width:21px;height:21px;transform:rotate(-45deg);fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.flow-node h3{margin:13px 0 3px;font-size:13px;font-weight:500;color:#d9eff9}.flow-node strong{font-size:29px;font-variant-numeric:tabular-nums;color:var(--node-color);line-height:1.15;display:block}.node-label{display:block;font-size:10px;margin:3px 0 8px;color:#89abc3}.node-secondary{font-size:10px;color:#87a6bf;white-space:nowrap}.node-secondary b{color:var(--node-color);font-size:11px;margin-left:2px}.flow-link{display:grid;place-items:center;min-width:0;align-self:stretch}.flow-link svg{width:19px;height:19px;overflow:visible;fill:none;stroke:#72d4e8;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 4px #5be3ff55)}
.order-state-panel{border-top:1px solid #254b64;margin-top:10px;padding-top:10px}.order-state-panel header{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}.order-state-panel h3{font-size:12px;font-weight:500;color:#c1e0f3;margin:0}.order-state-panel header>span{font-size:10px;color:#779ab6}.order-state-panel header b{color:#bfe5f6}.order-state-bar{display:flex;height:28px;border-radius:4px;overflow:hidden;background:#16334d}.order-state-bar button{flex:1 1 25%;min-width:0;font-size:10px;text-align:center;line-height:28px;color:#071b2c;font-weight:700;border-right:2px solid #102940;transition:filter .2s}.order-state-legend{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:9px}.order-state-legend>span{display:grid;grid-template-columns:8px minmax(0,1fr);align-items:center;gap:3px 5px;padding:7px;border:1px solid #254b64;border-radius:5px;background:#0e2940;color:#98b9ce;font-size:10px}.order-state-legend>span i{grid-row:span 3;width:8px;height:8px;border-radius:2px;box-shadow:0 0 7px currentColor}.order-state-legend>span em{font-style:normal;font-weight:600}.order-state-legend b{font-weight:600}.order-state-legend small{font-size:9px;color:#8ba6ba}
 .flow-node.stage-empty{--node-color:#7291a8}.node-secondary{display:block;margin-top:3px;font-size:9px}.flow-node h3{font-size:12px}.order-state-bar button{flex-shrink:1;border:0!important;border-right:2px solid #102940!important;padding:0!important;border-radius:0!important;background:var(--status-color)!important;background-image:none!important;line-height:28px;font-size:10px;color:#071b2c!important;font-weight:700;opacity:1}.procurement-flow{flex:1 1 0;min-height:0}
@media(prefers-reduced-motion:reduce){.flow-node,.order-state-bar span{transition:none}}
@media(max-width:650px){.flow-track{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;min-height:0}.flow-node{min-height:125px}.flow-link{display:none}.procurement-flow{min-height:0}.flow-caption{margin-bottom:14px}}
@media(max-width:700px){.order-state-legend{grid-template-columns:repeat(2,minmax(0,1fr));}}
</style>
