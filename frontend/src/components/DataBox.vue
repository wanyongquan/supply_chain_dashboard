<script>
export default {props:["title","headers","rows"]};
</script>
<template><article class="data-box"><header>{{title}}</header><div><table><thead><tr><th v-for="h in headers">{{h}}</th></tr></thead><tbody><tr v-for="r in rows"><td v-for="v in r"><span>{{v}}</span></td></tr></tbody></table></div></article></template>
