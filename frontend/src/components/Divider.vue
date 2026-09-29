<script>
export default {props:["label","hot","role"]};
</script>
<template><div :class="['divider',{hot}]"><i></i><b>{{label}}</b></div></template>
