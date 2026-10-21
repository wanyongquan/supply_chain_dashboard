<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
import * as echarts from 'echarts';

const props=defineProps({dimensions:{type:Array,default:()=>[]}});
const element=ref(null);
let chart,observer;

function draw(){
  if(!chart)return;
  chart.setOption({
    tooltip:{
      trigger:'axis',
      axisPointer:{type:'shadow'},
      formatter:items=>{
        const item=items[0];
        const dimension=props.dimensions[item.dataIndex];
        return `${dimension.name}<br>${dimension.score}/${dimension.full}（${item.value.toFixed(1)}%）`;
      }
    },
    grid:{left:92,right:176,top:18,bottom:28},
    xAxis:{
      type:'value',
      min:0,
      max:100,
      axisLabel:{color:'#9dbbd4',formatter:'{value}%'},
      splitLine:{lineStyle:{color:'#203854'}}
    },
    yAxis:{
      type:'category',
      inverse:true,
      data:props.dimensions.map(item=>item.name),
      axisLabel:{color:'#bdd6ed'},
      axisTick:{show:false},
      axisLine:{lineStyle:{color:'#476987'}}
    },
    series:[{
      name:'达成率',
      type:'bar',
      barMaxWidth:22,
      data:props.dimensions.map(item=>({
        value:item.full?item.score/item.full*100:0,
        score:item.score,
        full:item.full,
        itemStyle:{color:'#29b6f6'}
      })),
      label:{
        show:true,
        position:'right',
        color:'#d7efff',
        formatter:item=>`${item.data.score}/${item.data.full}（${item.value.toFixed(1)}%）`
      },
      markLine:{
        silent:true,
        symbol:'none',
        lineStyle:{color:'#fb7185',type:'dashed',width:2},
        label:{show:false},
        data:[{xAxis:100}]
      }
    }]
  },true);
}

onMounted(()=>{
  chart=echarts.init(element.value);
  draw();
  observer=new ResizeObserver(()=>chart?.resize());
  observer.observe(element.value);
});
watch(()=>props.dimensions,draw,{deep:true});
onBeforeUnmount(()=>{
  observer?.disconnect();
  chart?.dispose();
});
</script>

<template><div ref="element" class="supplier-performance-bar-chart"></div></template>

<style scoped>
.supplier-performance-bar-chart{width:100%;height:300px;min-height:260px;}
</style>
