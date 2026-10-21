<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
import * as echarts from 'echarts';
const props=defineProps({rows:{type:Array,default:()=>[]},kind:{default:'bar'},unit:{default:'家'},nameWidth:{type:Number,default:100}});
const emit=defineEmits(['select']);
const el=ref(null);let chart,observer;
const ratingColors={A:'#34d399',B:'#38bdf8',C:'#fbbf24',D:'#fb7185','未评级':'#94a3b8'};
function draw(){
  if(!chart)return;
  const rows=props.rows;
  chart.setOption({color:['#29b6f6','#26d9bd','#ffbb54','#8c8dff','#f27798','#55a8ff'],tooltip:{trigger:props.kind==='pie'?'item':'axis',confine:true},
    ...(props.kind==='pie'?{legend:{type:'scroll',bottom:0,textStyle:{color:'#d1e4f5'}},series:[{type:'pie',radius:['36%','62%'],center:['50%','43%'],stillShowZeroSum:false,itemStyle:{borderColor:'#0b1d34',borderWidth:2},label:{color:'#e2f1ff',formatter:p=>`${p.name}\n${p.value}${props.unit}`},labelLine:{length:8,length2:8,lineStyle:{color:'#8da9c3'}},emphasis:{scaleSize:9},data:rows.map(x=>({name:x.name,value:x.value,...(ratingColors[x.name]?{itemStyle:{color:ratingColors[x.name]}}:{})}))}]}:
    {grid:{left:8,right:34,top:10,bottom:8,containLabel:true},xAxis:{type:'value',axisLabel:{color:'#8eaac9'},splitLine:{lineStyle:{color:'#203854'}}},yAxis:{type:'category',inverse:true,data:rows.map(x=>x.name),axisLabel:{color:'#bfd3e8',width:props.nameWidth,overflow:'truncate'},axisTick:{show:false}},series:[{type:'bar',barMaxWidth:15,data:rows.map(x=>x.value),label:{show:true,position:'right',color:'#d7efff',formatter:p=>`${Number(p.value).toLocaleString('zh-CN')}${props.unit==='家'?'':props.unit}`}}]}),graphic:rows.length?[]:[{type:'text',left:'center',top:'middle',style:{text:'暂无有效数据',fill:'#a3b9cf'}}]},true);
}
onMounted(()=>{chart=echarts.init(el.value);chart.on('click',p=>emit('select',p.name));draw();observer=new ResizeObserver(()=>chart?.resize());observer.observe(el.value);});
watch(()=>[props.rows,props.kind],draw,{deep:true});onBeforeUnmount(()=>{observer?.disconnect();chart?.dispose();});
</script>
<template><div ref="el" class="screen-chart"></div></template>
<style scoped>.screen-chart{width:100%;height:100%;min-height:190px;}</style>
