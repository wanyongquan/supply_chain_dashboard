<script>
export default {props:["items","modelValue"],emits:["update:modelValue"]};
</script>
<template><div class="figma-tabs"><button v-for="(x,i) in items" :class="{active:modelValue===i}" @click="$emit('update:modelValue',i)">{{x}}</button></div></template>
