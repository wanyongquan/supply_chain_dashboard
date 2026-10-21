<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue';
import * as echarts from 'echarts';

const props=defineProps({rows:{type:Array,default:()=>[]},dark:Boolean,compact:Boolean});
const emit=defineEmits(['select']);
const el=ref(null);
let chart,observer;
const render=()=>{
  if(!chart)return;
  const total=props.rows.reduce((sum,item)=>sum+Number(item.count),0);
  chart.setOption({
    color:['#0070db','#14b8a6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#84cc16','#ec4899','#6366f1','#10b981','#fb923c','#a855f7','#0ea5e9','#eab308','#f43f5e','#22c55e','#64748b','#d946ef','#0891b2'],
    tooltip:{trigger:'item',formatter:'{b}<br/>{c} 家（{d}%）',confine:true},
    legend:{show:!props.compact,type:'scroll',orient:'horizontal',bottom:8,left:12,right:12,textStyle:{color:props.dark?'#bdd6ed':'#334155',fontSize:12},pageTextStyle:{color:'#94a3b8'}},
    graphic:{type:'text',left:'center',top:'39%',style:{text:`${total}\n家供应商`,textAlign:'center',fill:props.dark?'#bdd6ed':'#334155',fontSize:props.compact?12:16,fontWeight:600,lineHeight:20}},
    series:[{type:'pie',radius:['26%','48%'],center:['50%','44%'],avoidLabelOverlap:true,
      itemStyle:{borderColor:props.dark?'#102940':'#fff',borderWidth:2},
      label:{show:true,position:'outside',color:props.dark?'#bdd6ed':'#334155',fontSize:props.compact?9:11,lineHeight:15,
        formatter:params=>props.compact&&params.name.length>6?params.name.slice(0,6)+'…':params.name.length>11?`${params.name.slice(0,11)}\n${params.name.slice(11)}`:params.name},
      labelLine:{show:true,length:14,length2:12,lineStyle:{color:'#94a3b8'}},
      labelLayout:{hideOverlap:false,moveOverlap:'shiftY'},
      emphasis:{scale:true,scaleSize:10,itemStyle:{shadowBlur:12,shadowColor:'rgba(15,23,42,0.2)'},label:{show:true}},
      data:props.rows.map(item=>({name:item.classify_name,value:Number(item.count)}))}]
  },true);
};
onMounted(()=>{
  chart=echarts.init(el.value);
  chart.on('click',params=>emit('select',params.name));
  render();
  observer=new ResizeObserver(()=>chart?.resize());
  observer.observe(el.value);
});
watch(()=>props.rows,render,{deep:true});
onBeforeUnmount(()=>{observer?.disconnect();chart?.dispose();});
</script>

<template><div ref="el" class="classification-pie" role="img" aria-label="19类供应商数量分布，模拟数据，共863家"></div></template>

<style scoped>
.classification-pie{width:100%;height:100%;min-height:500px;}
</style>
