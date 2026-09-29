<script setup>
import {computed,ref,watch} from 'vue';
import {useDashboard} from '../composables/useDashboard';
import SupplierRatingPie from '../components/SupplierRatingPie.vue';
const {D,role,ratingList}=useDashboard();
const ratingQuery=ref('');
const appliedRatingQuery=ref('');
const pageSize=ref(10);
const page=ref(1);
const selectedSupplierId=ref('');
const pageSizes=[10,20,50];
const ratingResults=computed(()=>{
  const query=appliedRatingQuery.value;
  return D.value.suppliers
    .filter(item=>!query||`${item.name} ${item.id}`.toLocaleLowerCase().includes(query))
    .slice()
    .sort((first,second)=>(Number(second.score)||0)-(Number(first.score)||0));
});
const totalPages=computed(()=>Math.max(1,Math.ceil(ratingResults.value.length/pageSize.value)));
const pageRows=computed(()=>ratingResults.value.slice((page.value-1)*pageSize.value,page.value*pageSize.value));
const selectedRatingSupplier=computed(()=>D.value.suppliers.find(item=>item.id===selectedSupplierId.value)||null);
const selectedDimensions=computed(()=>{
  const scores=selectedRatingSupplier.value?.ratingDimensions||[];
  return [['质量',45],['交付',30],['技术',16],['成本',7],['廉洁合作',2]].map(([name,full],index)=>{
    const value=scores[index];
    return {name,full,score:value==null||value===''?null:Number(value)};
  });
});
const ratingCorrectionFactor=computed(()=>{
  const scoreValue=selectedRatingSupplier.value?.score;
  if(!selectedRatingSupplier.value||scoreValue==null||scoreValue===''||selectedDimensions.value.some(item=>item.score===null||!Number.isFinite(item.score)))return null;
  const score=Number(scoreValue);
  if(!Number.isFinite(score))return null;
  const dimensionTotal=selectedDimensions.value.reduce((sum,item)=>sum+item.score,0);
  return dimensionTotal?score/dimensionTotal:null;
});
const firstVisibleRow=computed(()=>ratingResults.value.length?(page.value-1)*pageSize.value+1:0);
const lastVisibleRow=computed(()=>Math.min(page.value*pageSize.value,ratingResults.value.length));
const submitRatingQuery=()=>{
  appliedRatingQuery.value=ratingQuery.value.trim().toLocaleLowerCase();
  page.value=1;
  selectedSupplierId.value='';
};
watch(pageSize,()=>{page.value=1;});
const selectRatingSupplier=item=>{selectedSupplierId.value=item.id;};
</script>
<template>
<section class="page-stack">
          <Divider label="供应商评级整体分析" :hot="role==='公司管理层'" :role="role"/>
          <div class="stat-grid six">
            <Stat label="已评级供应商" :value="D.ratingSummary.total+'家'"/>
            <Stat label="A级供应商总数" :value="D.ratingSummary.counts.A+'家'" tone="green"/>
            <Stat label="B级供应商总数" :value="D.ratingSummary.counts.B+'家'" tone="blue"/>
            <Stat label="C级供应商总数" :value="D.ratingSummary.counts.C+'家'" tone="amber"/>
            <Stat label="D级供应商总数" :value="D.ratingSummary.counts.D+'家'" tone="amber"/>
            <Stat label="整体平均分" :value="D.ratingSummary.averageScore.toFixed(1)"/></div>
          <div class="grid two"><Card title="等级分布"><SupplierRatingPie :rows="D.ratingDistribution" :total="D.ratingSummary.total"/></Card><BarBox title="综合得分排名" :values="ratingList.map(s=>s.score)" :labels="ratingList.map(s=>s.name.slice(0,5))"/></div>
          <Divider label="供应商评级详情查询" :hot="role==='中层管理层'" :role="role"/>
          <form class="query-panel rating-query" @submit.prevent="submitRatingQuery"><input v-model="ratingQuery" aria-label="供应商名称或编号" placeholder="供应商名称 / 编号"><button type="submit">查询</button></form>
          <article class="data-box rating-results">
            <header>评级结果明细</header>
            <div class="rating-table-wrap"><table><thead><tr><th>供应商</th><th>分类</th><th>评级</th><th>得分</th><th>最近评审</th></tr></thead><tbody>
              <tr v-for="item in pageRows" :key="item.id" :class="{'rating-selected-row':selectedSupplierId===item.id}" tabindex="0" @click="selectRatingSupplier(item)" @keydown.enter="selectRatingSupplier(item)"><td>{{item.name}}</td><td>{{item.category}}</td><td>{{item.level}}级</td><td>{{item.score??'暂无'}}</td><td>{{item.lastEval}}</td></tr>
              <tr v-if="!pageRows.length"><td colspan="5" class="rating-empty">没有找到匹配的供应商</td></tr>
            </tbody></table></div>
            <footer class="rating-pagination"><span>显示 {{firstVisibleRow}}-{{lastVisibleRow}} 条，共 {{ratingResults.length}} 家</span><label>每页<select v-model.number="pageSize"><option v-for="size in pageSizes" :key="size" :value="size">{{size}}条/页</option></select></label><button type="button" :disabled="page<=1" @click="page--">上一页</button><span>{{page}} / {{totalPages}}</span><button type="button" :disabled="page>=totalPages" @click="page++">下一页</button></footer>
          </article>
          <div v-if="selectedRatingSupplier" class="rating-result"><div class="rating-score"><small>综合评级</small><b>{{selectedRatingSupplier.level}}级</b><strong>{{selectedRatingSupplier.score??'暂无'}}</strong><span>/ 100分</span></div><div class="dimension-list"><div v-for="item in selectedDimensions" :key="item.name"><span>{{item.name}}</span><i><b :style="{width:item.score===null?'0%':(item.score/item.full*100)+'%'}"></b></i><strong>{{item.score??'暂无'}} / {{item.full}}</strong></div></div><div class="rating-adjustment"><small>修正系数</small><strong>{{ratingCorrectionFactor===null?'暂无':ratingCorrectionFactor.toFixed(3)}}</strong><span>按综合分 ÷ 五项分合计反算</span></div></div>
          <div v-else class="rating-result-empty">点击上方列表中的供应商查看综合评级、分项得分和修正系数</div>
        </section>
</template>

<style scoped>
.rating-query{justify-content:flex-start;}
.rating-results{min-width:0;}
.rating-table-wrap{overflow-x:auto;}
.rating-results table{width:100%;border-collapse:collapse;}
.rating-results th,.rating-results td{padding:10px 12px;text-align:left;white-space:nowrap;}
.rating-results th{color:#94a3b8;font-weight:500;border-bottom:1px solid #1e293b;}
.rating-results tbody tr{cursor:pointer;}
.rating-results tbody tr:hover,.rating-results tbody tr.rating-selected-row{background:#17243a;}
.rating-results tbody tr:focus-visible{outline:2px solid #60a5fa;outline-offset:-2px;}
.rating-empty{text-align:center!important;color:#94a3b8;padding:22px!important;}
.rating-pagination{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid #1e293b;color:#94a3b8;font-size:12px;}
.rating-pagination>span:first-child{margin-right:auto;}
.rating-pagination label{display:flex;align-items:center;gap:6px;}
.rating-pagination select,.rating-pagination button{height:30px;padding:0 9px;border:1px solid #334155;border-radius:5px;background:#111827;color:#cbd5e1;}
.rating-pagination button{cursor:pointer;}
.rating-pagination button:disabled{opacity:.45;cursor:not-allowed;}
.rating-adjustment{display:flex;flex-direction:column;align-items:flex-start;gap:5px;padding:12px;border-left:1px solid #1e293b;}
.rating-adjustment small,.rating-adjustment span,.rating-result-empty{color:#94a3b8;}
.rating-adjustment strong{font-size:20px;color:#f8fafc;}
.rating-adjustment span{font-size:11px;}
.rating-result-empty{padding:20px;border:1px solid #1e293b;border-radius:8px;background:#0f172a;}
@media(max-width:700px){.rating-adjustment{grid-column:1/-1;border-left:0;border-top:1px solid #1e293b;}}
</style>
