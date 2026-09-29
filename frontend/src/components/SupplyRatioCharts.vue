<script setup>
import {computed,ref,onMounted,onBeforeUnmount,watch} from 'vue';
import * as echarts from 'echarts';

const props=defineProps({
  groups:{type:Array,default:()=>[]},
  selectedMaterialId:{type:String,default:''}
});
const emit=defineEmits(['select-material']);
const barEl=ref(null);
const ringEl=ref(null);
let barChart;
let ringChart;
const palette=['#38bdf8','#f59e0b','#22c55e','#f472b6','#ef4444','#14b8a6','#a78bfa','#eab308'];
const supplierColors=computed(()=>Object.fromEntries([...new Set(props.groups.flatMap(group=>group.rows.map(row=>row.supplier)))].map((name,index)=>[name,palette[index%palette.length]])));
const selectedGroup=computed(()=>props.groups.find(group=>group.materialId===props.selectedMaterialId)||props.groups[0]||null);
const barHeight=computed(()=>`${Math.max(320,props.groups.length*48+105)}px`);

const renderBar=()=>{
  if(!barChart)return;
  const categories=props.groups.flatMap(group=>[`${group.name}\n协议`,`${group.name}\n实际`]);
  const suppliers=Object.keys(supplierColors.value);
  barChart.setOption({
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'},valueFormatter:value=>`${Number(value).toFixed(1)}%`},
    legend:{type:'scroll',bottom:0,textStyle:{color:'#cbd5e1',fontSize:10}},
    grid:{left:112,right:24,top:14,bottom:58},
    xAxis:{type:'value',min:0,max:100,axisLabel:{color:'#94a3b8',formatter:'{value}%'},splitLine:{lineStyle:{color:'#243653'}}},
    yAxis:{type:'category',inverse:true,data:categories,axisTick:{show:false},axisLine:{show:false},axisLabel:{color:'#cbd5e1',fontSize:10,interval:0}},
    series:suppliers.map(name=>({
      name,
      type:'bar',
      stack:'ratio-total',
      barMaxWidth:22,
      itemStyle:{color:supplierColors.value[name]},
      label:{show:true,position:'inside',color:'#0b1220',fontSize:10,fontWeight:600,formatter:params=>params.value>=8?`${Number(params.value).toFixed(0)}%`:''},
      data:props.groups.flatMap(group=>{
        const row=group.rows.find(item=>item.supplier===name);
        return [row?.agreement||0,row?.arrivalRatio||0];
      })
    }))
  },true);
};

const renderRing=()=>{
  if(!ringChart)return;
  const group=selectedGroup.value;
  if(!group){
    ringChart.clear();
    return;
  }
  const pieRows=group.rows.map(row=>({
    name:row.supplier,
    value:row.receiptQty,
    itemStyle:{color:supplierColors.value[row.supplier]}
  }));
  ringChart.setOption({
    tooltip:{trigger:'item',formatter:params=>params.seriesName==='协议供货比例'?`${params.name}<br/>协议比例：${Number(params.value).toFixed(1)}%`:`${params.name}<br/>实际到货：${Number(params.value).toLocaleString()} 件 (${Number(params.percent).toFixed(1)}%)`},
    legend:{type:'scroll',bottom:0,textStyle:{color:'#cbd5e1',fontSize:10}},
    graphic:[{type:'text',left:'center',top:'center',style:{text:`${Number(group.totalReceiptQty).toLocaleString()}\n件到货`,textAlign:'center',fill:'#e2e8f0',fontSize:14,fontWeight:600,lineHeight:21}}],
    series:[
      {
        name:'协议供货比例',
        type:'pie',
        radius:['19%','43%'],
        center:['50%','47%'],
        itemStyle:{borderColor:'#0f172a',borderWidth:2},
        label:{position:'inside',color:'#fff',fontSize:10,formatter:params=>params.value>=8?`${Number(params.value).toFixed(0)}%`:''},
        labelLine:{show:false},
        data:group.rows.map(row=>({name:row.supplier,value:row.agreement,itemStyle:{color:supplierColors.value[row.supplier]}}))
      },
      {
        name:'实际到货占比',
        type:'pie',
        radius:['57%','78%'],
        center:['50%','47%'],
        itemStyle:{borderColor:'#0f172a',borderWidth:2},
        label:{position:'outside',color:'#cbd5e1',fontSize:10,formatter:params=>params.value?`${params.name} ${Number(params.percent).toFixed(1)}%`:''},
        labelLine:{length:12,length2:14,lineStyle:{color:'#64748b'}},
        data:pieRows
      }
    ]
  },true);
};

const handleBarClick=params=>{
  if(params.componentType!=='series')return;
  const group=props.groups[Math.floor(params.dataIndex/2)];
  if(group)emit('select-material',group.materialId);
};

onMounted(()=>{
  barChart=echarts.init(barEl.value);
  ringChart=echarts.init(ringEl.value);
  barChart.on('click',handleBarClick);
  renderBar();
  renderRing();
  window.addEventListener('resize',resizeCharts);
});
const resizeCharts=()=>{barChart?.resize();ringChart?.resize();};
watch(()=>[props.groups,props.selectedMaterialId],()=>{renderBar();renderRing();},{deep:true});
onBeforeUnmount(()=>{
  window.removeEventListener('resize',resizeCharts);
  barChart?.dispose();
  ringChart?.dispose();
});
</script>

<template>
  <div class="supply-ratio-chart-grid">
    <article class="figma-card">
      <header><div><b>多物料配额偏离度排查看板</b></div></header>
      <section><div ref="barEl" class="ratio-bar-chart" :style="{height:barHeight}"></div></section>
    </article>
    <article class="figma-card">
      <header><div><b>{{selectedGroup?`${selectedGroup.name} · 单物料配额对比`:'单物料配额对比'}}</b><small v-if="selectedGroup">实际到货 {{Number(selectedGroup.totalReceiptQty).toLocaleString()}} 件</small></div></header>
      <section><div ref="ringEl" class="ratio-ring-chart"></div></section>
    </article>
  </div>
</template>

<style scoped>
.supply-ratio-chart-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;align-items:start;}
.supply-ratio-chart-grid>article{min-width:0;}
.ratio-bar-chart{width:100%;min-height:320px;}
.ratio-ring-chart{width:100%;height:410px;}
@media(max-width:900px){.supply-ratio-chart-grid{grid-template-columns:1fr;}}
</style>