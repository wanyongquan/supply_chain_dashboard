<script setup>
import {onBeforeUnmount,onMounted,ref,watch} from 'vue';
import * as echarts from 'echarts';

const props=defineProps({rows:{type:Array,default:()=>[]}});
const element=ref(null);
let chart,observer;

function render(){
  if(!chart)return;
  chart.setOption({
    tooltip:{trigger:'axis',confine:true,valueFormatter:value=>`${Number(value).toFixed(1)}%`},
    grid:{left:38,right:14,top:18,bottom:26},
    xAxis:{type:'category',data:props.rows.map(item=>item.month),axisLabel:{color:'#9fb8d1',fontSize:10},axisLine:{lineStyle:{color:'#34506a'}},axisTick:{show:false}},
    yAxis:{type:'value',min:95,max:100,axisLabel:{color:'#9fb8d1',fontSize:10,formatter:value=>`${value}%`},splitLine:{lineStyle:{color:'#203854'}}},
    series:[{type:'line',smooth:true,symbol:'circle',symbolSize:6,data:props.rows.map(item=>item.passRate),lineStyle:{width:3,color:'#45d6b0'},itemStyle:{color:'#45d6b0'},areaStyle:{color:'rgba(69,214,176,0.14)'}}],
    graphic:props.rows.length?[]:[{type:'text',left:'center',top:'middle',style:{text:'暂无来料检验记录',fill:'#a3b9cf'}}]
  },true);
}

onMounted(()=>{
  chart=echarts.init(element.value);
  render();
  observer=new ResizeObserver(()=>chart?.resize());
  observer.observe(element.value);
});
watch(()=>props.rows,render,{deep:true});
onBeforeUnmount(()=>{observer?.disconnect();chart?.dispose();});
</script>

<template><div ref="element" class="supplier-quality-trend"></div></template>

<style scoped>
.supplier-quality-trend{width:100%;height:100%;min-height:0}
</style>
