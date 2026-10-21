<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
import * as echarts from 'echarts';

const props=defineProps({rows:{type:Array,default:()=>[]}});
const el=ref(null);
let chart,observer;

function render(){
  if(!chart)return;
  const rows=props.rows;
  chart.setOption({
    animationDuration:350,
    tooltip:{
      trigger:'axis',
      axisPointer:{type:'shadow'},
      confine:true,
      formatter:items=>{
        const row=rows[items[0]?.dataIndex];
        if(!row)return '';
        return `${row.material}<br/>${row.supplier}<br/>系统设定比例：${Number(row.agreement).toFixed(1)}%<br/>实际到货比例：${Number(row.arrivalRatio).toFixed(1)}%`;
      }
    },
    legend:{top:0,textStyle:{color:'#cbd5e1',fontSize:11}},
    grid:{left:110,right:24,top:36,bottom:24,containLabel:true},
    xAxis:{type:'value',min:0,max:100,axisLabel:{color:'#94a3b8',formatter:'{value}%'},splitLine:{lineStyle:{color:'#243653'}}},
    yAxis:{type:'category',inverse:true,data:rows.map(row=>row.supplier),axisLabel:{color:'#cbd5e1',width:100,overflow:'truncate',interval:0},axisTick:{show:false},axisLine:{show:false}},
    series:[
      {name:'系统设定比例',type:'bar',barMaxWidth:16,data:rows.map(row=>row.agreement),itemStyle:{color:'#38bdf8',borderRadius:[0,3,3,0]},label:{show:true,position:'right',color:'#bfdbfe',fontSize:9,formatter:params=>`${Number(params.value).toFixed(1)}%`}},
      {name:'实际到货比例',type:'bar',barMaxWidth:16,data:rows.map(row=>row.arrivalRatio),itemStyle:{color:'#f59e0b',borderRadius:[0,3,3,0]},label:{show:true,position:'right',color:'#fde68a',fontSize:9,formatter:params=>`${Number(params.value).toFixed(1)}%`}}
    ],
    graphic:rows.length?[]:[{type:'text',left:'center',top:'middle',style:{text:'当前条件下暂无供货比例数据',fill:'#94a3b8',fontSize:13}}]
  },true);
}

onMounted(()=>{
  chart=echarts.init(el.value);
  render();
  observer=new ResizeObserver(()=>chart?.resize());
  observer.observe(el.value);
});
watch(()=>props.rows,render,{deep:true});
onBeforeUnmount(()=>{observer?.disconnect();chart?.dispose();});
</script>

<template><div ref="el" class="supply-ratio-execution-chart" :style="{height:`${Math.max(190,rows.length*44+60)}px`}"/></template>

<style scoped>
.supply-ratio-execution-chart{width:100%;min-height:190px;}
</style>
