<script>
export default {props:["label","value","sub","tone"]};
</script>
<template><div :class="['stat',tone]"><small>{{label}}</small><b>{{value}}</b><span v-if="sub">{{sub}}</span></div></template>
