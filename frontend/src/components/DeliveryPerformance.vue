<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
import * as echarts from 'echarts';
const props=defineProps({due:{type:Array,default:()=>[]},records:{type:Array,default:()=>[]}});
const el=ref(null);let chart,observer;
function draw(){
  if(!chart)return;
  const months=new Map();props.due.forEach(lines=>{const month=lines[0].expected_delivery_date.slice(0,7),v=months.get(month)||{total:0,onTime:0};v.total++;if(lines.every(x=>x.actual_delivery_date&&x.actual_delivery_date<=x.expected_delivery_date))v.onTime++;months.set(month,v);});
  const trend=[...months.entries()].sort(([a],[b])=>a.localeCompare(b));
  const delivered=props.records.filter(x=>x.actual&&x.expected);
  const deviation=[{name:'提前/按期',color:'#46d4b1',value:delivered.filter(x=>x.late===0).length},{name:'延迟1–3天',color:'#edb563',value:delivered.filter(x=>x.late>0&&x.late<=3).length},{name:'延迟4–7天',color:'#f19767',value:delivered.filter(x=>x.late>3&&x.late<=7).length},{name:'延迟7天以上',color:'#ef7c87',value:delivered.filter(x=>x.late>7).length}];
  chart.setOption({title:[{text:'按期到货率趋势',left:8,top:10,textStyle:{color:'#c3deed',fontSize:12,fontWeight:600}},{text:'实际到货交期偏差',left:8,top:'63%',textStyle:{color:'#c3deed',fontSize:12,fontWeight:600}}],tooltip:{trigger:'axis',confine:true},grid:[{left:48,right:18,top:48,bottom:'40%'},{left:18,right:18,top:'78%',bottom:28}],xAxis:[{type:'category',data:trend.map(x=>x[0]),axisLabel:{color:'#a1bed2',fontSize:10},axisTick:{show:false}},{type:'value',gridIndex:1,show:false}],yAxis:[{type:'value',min:0,max:100,splitNumber:4,axisLabel:{color:'#a1bed2',fontSize:10,formatter:'{value}%'},splitLine:{lineStyle:{color:'#233d52'}}},{type:'category',gridIndex:1,data:['到货订单'],show:false}],legend:{bottom:0,itemWidth:8,itemHeight:8,textStyle:{color:'#a5bfd2',fontSize:10},data:deviation.map(x=>x.name)},series:[{name:'按期到货率（%）',type:'line',data:trend.map(([,v])=>Number((v.onTime/v.total*100).toFixed(1))),itemStyle:{color:'#45c9e6'},areaStyle:{color:'#45c9e622'},symbolSize:7},...deviation.map(x=>({name:x.name,type:'bar',stack:'deviation',xAxisIndex:1,yAxisIndex:1,barMaxWidth:15,data:[x.value],itemStyle:{color:x.color},label:{show:x.value>0,formatter:'{c}',fontSize:9,color:'#092034'}}))]},true);
}
onMounted(()=>{chart=echarts.init(el.value);draw();observer=new ResizeObserver(()=>chart?.resize());observer.observe(el.value);});watch(()=>[props.due,props.records],draw,{deep:true});onBeforeUnmount(()=>{observer?.disconnect();chart?.dispose();});
</script>
<template><div ref="el" class="delivery-performance"/></template>
<style scoped>.delivery-performance{width:100%;height:280px;min-height:220px;flex:1}</style>
