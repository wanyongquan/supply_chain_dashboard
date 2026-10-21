<script setup>
import {computed,ref,watch} from 'vue';
import {useRouter} from 'vue-router';
import {useDashboard} from '../composables/useDashboard';
import {supplierStatusLabel} from '../utils/supplierStatus';

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
const pageSizes=[10,20,50];
const pageSize=ref(10);
const page=ref(1);
const totalPages=computed(()=>Math.max(1,Math.ceil(filteredSuppliers.value.length/pageSize.value)));
const pageSuppliers=computed(()=>filteredSuppliers.value.slice((page.value-1)*pageSize.value,page.value*pageSize.value));
const firstVisible=computed(()=>filteredSuppliers.value.length?(page.value-1)*pageSize.value+1:0);
const lastVisible=computed(()=>Math.min(page.value*pageSize.value,filteredSuppliers.value.length));
watch([appliedQuery,statusFilter,ratingFilter],()=>{page.value=1;});
watch(pageSize,()=>{page.value=1;});
watch(totalPages,value=>{if(page.value>value)page.value=value;});

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
          <tr v-for="item in pageSuppliers" :key="item.id">
            <td>{{item.name}}</td>
            <td>{{item.id}}</td>
            <td>{{item.category||'—'}}</td>
            <td>{{item.level?`${item.level}级`:'未评级'}}</td>
            <td>{{item.status?supplierStatusLabel(item.status):'—'}}</td>
            <td>{{item.region||'—'}}</td>
            <td>
              <button class="supplier-directory-view" type="button" @click="viewSupplier(item)">
                查看供应商画像
              </button>
            </td>
          </tr>
          <tr v-if="!pageSuppliers.length">
            <td class="supplier-directory-empty" colspan="7">没有符合条件的供应商</td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer class="supplier-directory-pagination">
      <span>显示 {{firstVisible}}-{{lastVisible}} 条，共 {{filteredSuppliers.length}} 家</span>
      <label>每页<select v-model.number="pageSize"><option v-for="size in pageSizes" :key="size" :value="size">{{size}}条/页</option></select></label>
      <button type="button" :disabled="page<=1" @click="page--">上一页</button>
      <span>{{page}} / {{totalPages}}</span>
      <button type="button" :disabled="page>=totalPages" @click="page++">下一页</button>
    </footer>
  </article>
</template>

<style scoped>
.supplier-directory-pagination{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid #1e293b;color:#94a3b8;font-size:12px;}
.supplier-directory-pagination>span:first-child{margin-right:auto;}
.supplier-directory-pagination label{display:flex;align-items:center;gap:6px;}
.supplier-directory-pagination select,.supplier-directory-pagination button{height:30px;padding:0 9px;border:1px solid #334155;border-radius:5px;background:#111827;color:#cbd5e1;}
.supplier-directory-pagination button{cursor:pointer;}
.supplier-directory-pagination button:disabled{opacity:.45;cursor:not-allowed;}
</style>
