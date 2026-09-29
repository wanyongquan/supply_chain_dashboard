<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({ data: { type: Object, default: () => ({}) } });
const container = ref(null);
const error = ref('');
let chart, observer, stopped = false;
let controller;
const provinceName = name => ['北京','天津','上海','重庆'].includes(name) ? `${name}市` : ({内蒙古:'内蒙古自治区',广西:'广西壮族自治区',宁夏:'宁夏回族自治区',新疆:'新疆维吾尔自治区',西藏:'西藏自治区',香港:'香港特别行政区',澳门:'澳门特别行政区'})[name] || `${name}省`;
function update() {
  if (!chart) return;
  const data = Object.entries(props.data).flatMap(([name, value]) => [{name,value}, {name:provinceName(name),value}]);
  chart.setOption({
    tooltip: {trigger:'item',formatter:p=>`${p.name}<br/>供应商数量：${Number.isFinite(Number(p.value)) ? Number(p.value) : 0} 家`},
    visualMap: {min:0,max:Math.max(20,...data.map(x=>x.value)),left:12,bottom:12,text:['多','少'],calculable:false,textStyle:{color:'#94a3b8',fontSize:10},inRange:{color:['#102a43','#1d4ed8','#06b6d4']}},
    series:[{type:'map',map:'china',roam:false,layoutCenter:['50%','48%'],layoutSize:'108%',label:{show:true,color:'#b7c9e2',fontSize:9},itemStyle:{areaColor:'#12233d',borderColor:'#3b82f680',borderWidth:1},emphasis:{label:{color:'#fff'},itemStyle:{areaColor:'#22d3ee'}},data}]
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

<template><div ref="container" class="supplier-map-chart"><div v-if="error" class="map-loading">{{error}}</div></div></template>
