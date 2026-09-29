<script>
export default {props:["title","sub"]};
</script>
<template><article class="figma-card"><header><div><b>{{title}}</b><small v-if="sub">{{sub}}</small></div></header><section><slot/></section></article></template>
