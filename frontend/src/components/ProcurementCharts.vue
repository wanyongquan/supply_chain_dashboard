<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
import * as echarts from 'echarts';
const props=defineProps({type:{type:String,required:true},rows:{type:Array,default:()=>[]}});const el=ref(null);let chart;
const render=()=>{if(!chart)return;const names=props.rows.map(x=>x.name);const base={tooltip:{trigger:'axis'},grid:{left:52,right:20,top:props.type==='progress'?38:24,bottom:54},xAxis:{type:'category',data:names,axisLabel:{color:'#b7c9e2',rotate:names.length>5?28:0}},yAxis:{type:'value',name:'请购数量',nameTextStyle:{color:'#94a3b8'},axisLabel:{color:'#94a3b8'},splitLine:{lineStyle:{color:'#243653'}}}};base.series=props.type==='request'?[{name:'请购总数',type:'line',smooth:true,data:props.rows.map(x=>x.requested),symbol:'circle',symbolSize:8,lineStyle:{color:'#22d3ee',width:3},itemStyle:{color:'#22d3ee'},areaStyle:{color:'rgba(34,211,238,.12)'}}]:[{name:'请购总数',type:'bar',data:props.rows.map(x=>x.requested),itemStyle:{color:'#3b82f6'}},{name:'已采购总数',type:'bar',data:props.rows.map(x=>x.purchased),itemStyle:{color:'#22d3ee'}},{name:'已入库总数',type:'bar',data:props.rows.map(x=>x.warehoused),itemStyle:{color:'#22c55e'}}];if(props.type==='progress')base.legend={top:0,textStyle:{color:'#cbd5e1'}};chart.setOption(base,true)};
onMounted(()=>{chart=echarts.init(el.value);render();window.addEventListener('resize',render)});watch(()=>props.rows,render,{deep:true});onBeforeUnmount(()=>{window.removeEventListener('resize',render);chart?.dispose()});
</script>
<template><div ref="el" class="procurement-chart"></div></template>
