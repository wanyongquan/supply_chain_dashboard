<script>
export default {props:["rows","series"],computed:{points:function(){const all=this.series.flatMap(s=>this.rows.map(r=>Number(r[s[0]])));const mn=Math.min(...all),mx=Math.max(...all),range=mx-mn||1;return this.series.map(s=>({color:s[1],p:this.rows.map((r,i)=>`${18+i*(360/(this.rows.length-1||1))},${112-(Number(r[s[0]])-mn)/range*88}`).join(' ')}))}}};
</script>
<template><div class="mini-chart"><svg viewBox="0 0 396 130" preserveAspectRatio="none"><g class="grid-lines"><line v-for="y in [24,46,68,90,112]" x1="18" :y1="y" x2="378" :y2="y"/></g><polyline v-for="p in points" :points="p.p" :stroke="p.color"/></svg><div><span v-for="r in rows">{{r.month}}</span></div></div></template>
