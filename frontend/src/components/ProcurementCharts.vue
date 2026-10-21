<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
import * as echarts from 'echarts';
const props=defineProps({type:{type:String,required:true},rows:{type:Array,default:()=>[]}});
const el=ref(null);let chart,observer;
const render=()=>{
  if(!chart)return;
  const names=props.rows.map(x=>x.name);
  const horizontal=props.type==='progress';
  const base={
    tooltip:{trigger:'axis'},
    grid:{left:horizontal?82:78,right:20,top:props.type==='progress'?42:32,bottom:horizontal?24:54,containLabel:true},
    xAxis:horizontal
      ?{type:'value',name:'请购数量',nameLocation:'middle',nameGap:24,nameTextStyle:{color:'#94a3b8'},axisLabel:{color:'#94a3b8'},splitLine:{lineStyle:{color:'#243653'}}}
      :{type:'category',data:names,axisLabel:{color:'#b7c9e2',interval:0,hideOverlap:false,rotate:names.length>2?32:0,margin:10}},
    yAxis:horizontal
      ?{type:'category',data:names,axisLabel:{color:'#b7c9e2',interval:0,hideOverlap:false,width:74,overflow:'truncate'},axisTick:{show:false}}
      :{type:'value',name:'请购数量',nameLocation:'middle',nameGap:38,nameTextStyle:{color:'#94a3b8'},axisLabel:{color:'#94a3b8'},splitLine:{lineStyle:{color:'#243653'}}}
  };
  base.series=props.type==='request'
    ?[{name:'请购总数',type:'line',smooth:true,data:props.rows.map(x=>x.requested),symbol:'circle',symbolSize:8,lineStyle:{color:'#22d3ee',width:3},itemStyle:{color:'#22d3ee'},areaStyle:{color:'rgba(34,211,238,.12)'}}]
    :[{name:'请购总数',type:'bar',data:props.rows.map(x=>x.requested),itemStyle:{color:'#3b82f6'}},{name:'已采购总数',type:'bar',data:props.rows.map(x=>x.purchased),itemStyle:{color:'#22d3ee'}},{name:'已入库总数',type:'bar',data:props.rows.map(x=>x.warehoused),itemStyle:{color:'#22c55e'}}];
  if(props.type==='progress')base.legend={top:0,textStyle:{color:'#cbd5e1'}};
  chart.setOption(base,true);
};
const renderCompact=()=>{
  render();
  if(el.value?.clientWidth<400){
    const compactOptions={
      grid:{left:props.type==='progress'?74:48,right:10,top:42,bottom:props.type==='progress'?20:32,containLabel:true},
      legend:{itemWidth:10,itemHeight:7,itemGap:6,textStyle:{fontSize:9}}
    };
    if(props.type==='progress'){
      compactOptions.xAxis={name:'',splitNumber:3,axisLabel:{fontSize:9,formatter:v=>Math.abs(v)>=1000?`${v/1000}k`:v}};
      compactOptions.yAxis={axisLabel:{fontSize:9,width:66,overflow:'truncate',interval:0,hideOverlap:false}};
    }else{
      compactOptions.xAxis={axisLabel:{fontSize:9,width:72,overflow:'truncate',interval:0,hideOverlap:false}};
      compactOptions.yAxis={name:'',splitNumber:3,axisLabel:{fontSize:10,formatter:v=>Math.abs(v)>=1000?`${v/1000}k`:v}};
    }
    chart?.setOption(compactOptions);
  }
};
onMounted(()=>{chart=echarts.init(el.value);renderCompact();observer=new ResizeObserver(()=>{chart?.resize();renderCompact();});observer.observe(el.value)});watch(()=>props.rows,renderCompact,{deep:true});onBeforeUnmount(()=>{observer?.disconnect();chart?.dispose()});
</script>
<template><div ref="el" class="procurement-chart"></div></template>
