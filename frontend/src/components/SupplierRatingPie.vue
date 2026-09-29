<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
import * as echarts from 'echarts';

const props=defineProps({
  rows:{type:Array,default:()=>[]},
  total:{type:Number,default:0}
});
const el=ref(null);
let chart;

const render=()=>{
  if(!chart)return;
  const data=props.rows
    .filter(item=>Number(item.count)>0)
    .map(item=>({name:item.level,value:Number(item.count),itemStyle:{color:item.color},label:{color:item.color}}));
  chart.setOption({
    tooltip:{trigger:'item',formatter:'{b}供应商<br/>{c}家 ({d}%)'},
    graphic:[{type:'text',left:'center',top:'center',style:{text:`${props.total}\n家供应商`,textAlign:'center',fill:'#334155',fontSize:14,fontWeight:600,lineHeight:21}}],
    series:[{
      type:'pie',
      radius:['40%','60%'],
      center:['50%','50%'],
      avoidLabelOverlap:true,
      label:{show:true,position:'outside',formatter:'{b}供应商 {c}家',fontSize:12},
      labelLine:{show:true,length:18,length2:22,lineStyle:{color:'#94a3b8',width:1}},
      labelLayout:{moveOverlap:'shiftY'},
      data
    }]
  },true);
};

onMounted(()=>{
  chart=echarts.init(el.value);
  render();
  window.addEventListener('resize',render);
});
watch(()=>[props.rows,props.total],render,{deep:true});
onBeforeUnmount(()=>{
  window.removeEventListener('resize',render);
  chart?.dispose();
});
</script>

<template><div ref="el" class="rating-pie-chart"></div></template>

<style scoped>
.rating-pie-chart{width:100%;height:350px;}
</style>