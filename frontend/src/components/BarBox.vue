<script>
export default {props:["title","values","labels","tone","suffix"]};
</script>
<template><article class="figma-card"><header><div><b>{{title}}</b></div></header><section :class="['bars-chart',tone]"><div v-for="(v,i) in values"><i><b :style="{height:(v/Math.max(...values)*100)+'%'}"></b></i><span>{{labels?.[i]||v}}</span><small>{{labels?v+(suffix||''):''}}</small></div></section></article></template>
