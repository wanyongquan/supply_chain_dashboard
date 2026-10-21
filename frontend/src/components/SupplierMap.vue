<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({ data: { type: Object, default: () => ({}) },dark:Boolean });
const emit=defineEmits(['select']);
const container = ref(null);
const error = ref('');
let chart, observer, stopped = false;
let controller;
const provinceName = name => ['北京','天津','上海','重庆'].includes(name) ? `${name}市` : ({内蒙古:'内蒙古自治区',广西:'广西壮族自治区',宁夏:'宁夏回族自治区',新疆:'新疆维吾尔自治区',西藏:'西藏自治区',香港:'香港特别行政区',澳门:'澳门特别行政区'})[name] || `${name}省`;
function update() {
  if (!chart) return;
  const data = Object.entries(props.data)
    .filter(([,value]) => Number(value) > 0)
    .flatMap(([name,value]) => [{name,value}, {name:provinceName(name),value}]);
  chart.setOption({
    tooltip: {trigger:'item',formatter:p=>`${p.name}<br/>供应商数量：${Number.isFinite(Number(p.value)) ? Number(p.value) : 0} 家`},
    visualMap: {
      type:'piecewise',
      left:12,
      bottom:12,
      itemWidth:14,
      itemHeight:10,
      itemGap:6,
      calculable:false,
      textStyle:{color:props.dark?'#b9d4ee':'#334155',fontSize:10},
      pieces:[
        {min:101,label:'100家以上',color:'#0057b8'},
        {min:51,max:100,label:'51-100家',color:'#2478c8'},
        {min:11,max:50,label:'11-50家',color:'#60a5fa'},
        {min:0,max:10,label:'0-10家',color:'#bfdbfe'}
      ]
    },
    series:[{type:'map',map:'china',roam:false,layoutCenter:['50%','48%'],layoutSize:'116%',label:{show:true,color:'#334155',fontSize:9},itemStyle:{areaColor:'#dbeafe',borderColor:'#fff',borderWidth:1},emphasis:{label:{color:'#fff'},itemStyle:{areaColor:'#003f8c'}},data}]
  });
}
onMounted(async () => {
  controller = new AbortController();
  try {
    if (!echarts.getMap('china')) {
      const response = await fetch('https://geojson.cn/api/china/china.json', {signal:controller.signal});
      if (!response.ok) throw new Error('Map request failed');
      const geo = await response.json();
      if (stopped) return;
      echarts.registerMap('china',geo);
    }
    if (stopped) return;
    chart=echarts.init(container.value);
    chart.on('click',params=>emit('select',Object.keys(props.data).find(name=>params.name===name||params.name===provinceName(name))||params.name));
    update();
    observer=new ResizeObserver(()=>chart?.resize());
    observer.observe(container.value);
  } catch (e) {
    if (!stopped) error.value='地图边界数据加载失败，请检查网络连接';
  }
});
watch(()=>props.data,update,{deep:true});
onBeforeUnmount(()=>{stopped=true;controller?.abort();observer?.disconnect();chart?.dispose();chart=null;});
</script>

<template><div ref="container" class="supplier-map-chart" :style="dark?{background:'transparent'}:{}"><div v-if="error" class="map-loading">{{error}}</div></div></template>

<style scoped>
.supplier-map-chart {
  background: #fff;
}
</style>
