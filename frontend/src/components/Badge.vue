<script>
export default {props:["text","tone"]};
</script>
<template><em :class="['badge',tone]">{{text}}</em></template>
