<script setup>
import {computed} from 'vue';
import {useRouter} from 'vue-router';
import {useDashboard} from '../composables/useDashboard';

const router=useRouter();
const {
  D,
  selectSupplier,
  supplierDirectoryQuery:nameQuery,
  supplierDirectorySearchMode:searchMode,
  supplierDirectoryAppliedQuery:appliedQuery,
  profileStatus:statusFilter,
  profileLevel:ratingFilter
}=useDashboard();
const filteredSuppliers=computed(()=>{
  const query=appliedQuery.value.trim().toLocaleLowerCase();
  return D.value.suppliers.filter(item=>
    (!query||(searchMode.value==='id'
      ?item.id.toLocaleLowerCase().includes(query)
      :item.name.toLocaleLowerCase().includes(query)))
    &&(statusFilter.value==='全部'||item.status===statusFilter.value)
    &&(ratingFilter.value==='全部'||(ratingFilter.value==='未评级'?!item.level:item.level===ratingFilter.value))
  );
});

function viewSupplier(item){
  selectSupplier(item.id);
  router.push(`/profile/supplier/${encodeURIComponent(item.id)}/basic`);
}
</script>

<template>
  <article class="data-box supplier-directory">
    <header>
      <span>供应商列表</span>
      <small>共 {{filteredSuppliers.length}} / {{D.suppliers.length}} 家</small>
    </header>
    <div class="supplier-directory-table">
      <table>
        <thead>
          <tr>
            <th>供应商名称</th>
            <th>供应商编号</th>
            <th>分类</th>
            <th>等级</th>
            <th>状态</th>
            <th>地区</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredSuppliers" :key="item.id">
            <td>{{item.name}}</td>
            <td>{{item.id}}</td>
            <td>{{item.category||'—'}}</td>
            <td>{{item.level?`${item.level}级`:'未评级'}}</td>
            <td>{{item.status||'—'}}</td>
            <td>{{item.region||'—'}}</td>
            <td>
              <button class="supplier-directory-view" type="button" @click="viewSupplier(item)">
                查看供应商画像
              </button>
            </td>
          </tr>
          <tr v-if="!filteredSuppliers.length">
            <td class="supplier-directory-empty" colspan="7">没有符合条件的供应商</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>
