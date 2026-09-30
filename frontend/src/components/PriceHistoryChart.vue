<script setup>
import {onBeforeUnmount,onMounted,ref,watch} from 'vue';
import * as echarts from 'echarts';

const props=defineProps({records:{type:Array,default:()=>[]}});
const chartElement=ref(null);
let chart;
const colors=['#39c6c8','#f0ad4e','#7dbb79','#e47b66','#729be8'];

const render=()=>{
  if(!chart)return;
  const dates=[...new Set(props.records.map(item=>item.order_date))].sort();
  const suppliers=[...new Set(props.records.map(item=>item.supplier_name))];
  chart.setOption({
    color:colors,
    tooltip:{trigger:'axis',valueFormatter:value=>value==null?'-':`¥${Number(value).toFixed(2)}`},
    legend:{top:8,textStyle:{color:'#cbd5e1'}},
    grid:{left:68,right:24,top:48,bottom:42,containLabel:true},
    xAxis:{type:'category',data:dates,boundaryGap:false,axisLabel:{color:'#94a3b8'},axisLine:{lineStyle:{color:'#334155'}},axisTick:{show:false}},
    yAxis:{type:'value',name:'成交价（元）',nameTextStyle:{color:'#94a3b8'},axisLabel:{color:'#94a3b8',formatter:value=>`¥${value}`},splitLine:{lineStyle:{color:'#243653'}}},
    series:suppliers.map(supplier=>({
      name:supplier,
      type:'line',
      smooth:false,
      connectNulls:false,
      symbol:'circle',
      symbolSize:8,
      lineStyle:{width:3},
      data:dates.map(date=>{
        const prices=props.records.filter(item=>item.order_date===date&&item.supplier_name===supplier).map(item=>Number(item.unit_price)).filter(Number.isFinite);
        return prices.length?prices.reduce((sum,value)=>sum+value,0)/prices.length:null;
      })
    })),
    graphic:props.records.length?[]:[{type:'text',left:'center',top:'middle',style:{text:'当前筛选条件下暂无采购记录',fill:'#94a3b8',fontSize:13}}]
  },true);
};

onMounted(()=>{
  chart=echarts.init(chartElement.value);
  render();
  window.addEventListener('resize',render);
});
watch(()=>props.records,render,{deep:true});
onBeforeUnmount(()=>{
  window.removeEventListener('resize',render);
  chart?.dispose();
});
</script>

<template><div ref="chartElement" class="price-history-chart"></div></template>