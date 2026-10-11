<script setup>
import {computed} from 'vue';
import {useDashboard} from '../composables/useDashboard';

const {
  D,
  supplierDirectoryQuery:query,
  supplierDirectorySearchMode:searchMode,
  supplierDirectoryAppliedQuery:appliedQuery,
  profileStatus:statusFilter,
  profileLevel:ratingFilter
}=useDashboard();

const statuses=computed(()=>[...new Set(D.value.suppliers.map(item=>item.status).filter(Boolean))].sort());
const ratings=computed(()=>[...new Set(D.value.suppliers.map(item=>item.level).filter(Boolean))].sort());

function applyFilters(){
  appliedQuery.value=query.value;
}
</script>

<template>
  <form class="supplier-filter-bar supplier-directory-filters" @submit.prevent="applyFilters">
    <input
      v-model="query"
      type="search"
      :placeholder="searchMode==='name'?'输入供应商名称':'输入供应商编号'"
      aria-label="供应商查询条件"
    >
    <div class="supplier-query-modes" role="radiogroup" aria-label="供应商查询方式">
      <label :class="{active:searchMode==='name'}">
        <input v-model="searchMode" type="radio" value="name" name="directory-search-mode">
        <span>按供应商名称</span>
      </label>
      <label :class="{active:searchMode==='id'}">
        <input v-model="searchMode" type="radio" value="id" name="directory-search-mode">
        <span>按供应商编号</span>
      </label>
    </div>
    <select v-model="statusFilter" aria-label="按供应商状态筛选">
      <option value="全部">全部状态</option>
      <option v-for="status in statuses" :key="status" :value="status">{{status}}</option>
    </select>
    <select v-model="ratingFilter" aria-label="按供应商等级筛选">
      <option value="全部">全部等级</option>
      <option v-for="rating in ratings" :key="rating" :value="rating">{{rating==='未评级'?'未评级':`${rating}级`}}</option>
    </select>
    <button type="submit">查询</button>
  </form>
</template>
