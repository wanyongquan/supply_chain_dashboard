<script setup>
import {computed,watch} from 'vue';
import {useRoute,useRouter} from 'vue-router';
import {useDashboard} from '../composables/useDashboard';

const route=useRoute();
const router=useRouter();
const {
  D,profileSub,supplier,supplierId,selectSupplier,
  supplierDetailQuery:query,
  supplierDetailSearchMode:searchMode,
  supplierDetailStatus:statusFilter,
  supplierDetailRating:ratingFilter,
  supplierDetailQueryMessage:queryMessage
}=useDashboard();
const tabs=[
  {id:'basic',label:'基础信息'},
  {id:'capacity',label:'供应能力'},
  {id:'delivery',label:'履约分析'},
  {id:'credit',label:'信用风险'},
  {id:'quality',label:'质量管理'}
];
const selectedSupplier=computed(()=>D.value.suppliers.find(item=>item.id===supplierId.value));
const statuses=computed(()=>[...new Set(D.value.suppliers.map(item=>item.status).filter(Boolean))].sort());
const ratings=computed(()=>[...new Set(D.value.suppliers.map(item=>item.level).filter(Boolean))].sort());

watch(
  [()=>route.params.supplierId,()=>D.value.suppliers.length],
  ([routeSupplierId])=>{
    if(!routeSupplierId||!D.value.suppliers.length)return;
    const match=D.value.suppliers.find(item=>item.id===routeSupplierId);
    if(match){
      if(supplierId.value!==match.id)selectSupplier(match.id);
    }else{
      router.replace('/profile/overview');
    }
  },
  {immediate:true}
);

function querySupplier(){
  const term=query.value.trim().toLocaleLowerCase();
  const match=D.value.suppliers.find(item=>
    (!term||(searchMode.value==='id'
      ?item.id.toLocaleLowerCase().includes(term)
      :item.name.toLocaleLowerCase().includes(term)))
    &&(!statusFilter.value||item.status===statusFilter.value)
    &&(!ratingFilter.value||item.level===ratingFilter.value)
  );
  if(!match){
    queryMessage.value='没有符合条件的供应商';
    return;
  }
  queryMessage.value='';
  if(match.id!==supplierId.value){
    selectSupplier(match.id);
    router.replace(`/profile/supplier/${encodeURIComponent(match.id)}/${profileSub.value}`);
  }
}

function openTab(id){
  if(id!==profileSub.value)router.push(`/profile/supplier/${encodeURIComponent(supplierId.value)}/${id}`);
}
</script>

<template>
  <section class="page-stack supplier-detail-page">
    <RouterLink class="supplier-overview-link" to="/profile/overview">← 返回主页概览</RouterLink>
    <form class="supplier-filter-bar supplier-detail-filter" @submit.prevent="querySupplier">
      <input
        v-model="query"
        type="search"
        :placeholder="searchMode==='name'?'输入供应商名称':'输入供应商编号'"
        aria-label="供应商查询条件"
      >
      <div class="supplier-query-modes" role="radiogroup" aria-label="供应商查询方式">
        <label :class="{active:searchMode==='name'}">
          <input v-model="searchMode" type="radio" value="name" name="detail-search-mode">
          <span>按供应商名称</span>
        </label>
        <label :class="{active:searchMode==='id'}">
          <input v-model="searchMode" type="radio" value="id" name="detail-search-mode">
          <span>按供应商编号</span>
        </label>
      </div>
      <select v-model="statusFilter" aria-label="按供应商状态筛选">
        <option value="">全部状态</option>
        <option v-for="status in statuses" :key="status" :value="status">{{status}}</option>
      </select>
      <select v-model="ratingFilter" aria-label="按供应商等级筛选">
        <option value="">全部等级</option>
        <option v-for="rating in ratings" :key="rating" :value="rating">{{rating}}级</option>
      </select>
      <button type="submit">查询</button>
      <span v-if="queryMessage" class="supplier-query-message" role="status">{{queryMessage}}</span>
    </form>
    <div class="supplier-detail-heading">
      <div>
        <h1>{{supplier.name||selectedSupplier?.name||'供应商画像'}}</h1>
        <p>供应商编号：{{supplier.id||selectedSupplier?.id||supplierId}}</p>
      </div>
    </div>
    <div class="supplier-detail-tabs" role="tablist" aria-label="供应商画像信息">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="profileSub===tab.id"
        :class="{active:profileSub===tab.id}"
        @click="openTab(tab.id)"
      >
        {{tab.label}}
      </button>
    </div>
    <RouterView />
  </section>
</template>
