<script setup>
import {computed} from 'vue';
import {useDashboard} from '../composables/useDashboard';
import trackingMock from '../../../data/mock_new_product_tracking.json';

const props=defineProps({detailed:{type:Boolean,default:false}});
const emit=defineEmits(['detail']);
const {D}=useDashboard();
const materialsById=computed(()=>new Map(D.value.materials.map(([id,name])=>[id,name])));
const today=new Date().toLocaleDateString('sv-SE');
const rows=computed(()=>trackingMock.items.map(item=>{
  const overdue=item.project_node_time<today&&item.arrival_quantity<item.required_quantity;
  const status=item.arrival_quantity>=item.required_quantity
    ?'已到齐'
    :overdue?'节点逾期':'在途跟踪';
  return {
    ...item,
    material_name:materialsById.value.get(item.material_id)||'暂无物料名称',
    status
  };
}));
</script>

<template>
  <article :class="['screen-block','new-product-tracking-block',{'detailed':props.detailed}]">
    <header>
      <h2>新产品开发到货跟踪</h2>
      <button v-if="!props.detailed" type="button" @click="emit('detail')">详情 ↗</button>
      <small v-else>样件物料在途跟踪 · 演示数据 · 共 {{rows.length}} 条</small>
    </header>
    <div class="screen-table new-product-tracking-table">
      <table>
        <thead>
          <tr><th>物料编号</th><th>物料名称</th><th>项目节点时间</th><th>到货数量 / 需求数量</th><th>节点提醒</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in (props.detailed?rows:rows.slice(0,5))" :key="item.tracking_id" :class="{'tracking-overdue':item.status==='节点逾期'}">
            <td :title="item.material_id">{{item.material_id}}</td>
            <td>{{item.material_name}}</td>
            <td>{{item.project_node_time}}</td>
            <td>{{item.arrival_quantity}} / {{item.required_quantity}}</td>
            <td><span :class="['tracking-status',{'overdue':item.status==='节点逾期','complete':item.status==='已到齐'}]">{{item.status}}</span></td>
          </tr>
          <tr v-if="!rows.length"><td colspan="5">暂无新产品样件跟踪数据</td></tr>
        </tbody>
      </table>
    </div>
    <p class="screen-note">节点与到货数量为演示数据；正式预警需接入项目节点计划及样件收货记录。</p>
  </article>
</template>

<style scoped>
.new-product-tracking-block{--block-accent:#51d6c4;}
.new-product-tracking-table{height:0;min-height:0;}
.new-product-tracking-table table{table-layout:fixed;font-size:11px;}
.new-product-tracking-table th,.new-product-tracking-table td{padding:7px 5px;}
.new-product-tracking-table th:nth-child(1){width:25%;}
.new-product-tracking-table th:nth-child(2){width:19%;}
.new-product-tracking-table th:nth-child(3){width:17%;}
.new-product-tracking-table th:nth-child(4){width:23%;}
.new-product-tracking-table th:nth-child(5){width:16%;}
.new-product-tracking-table td{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.tracking-status{color:#f5c16c;}
.tracking-status.overdue,.tracking-overdue td:last-child{color:#ff8292;}
.tracking-status.complete{color:#54dbb2;}
.tracking-overdue td{background:rgba(239,124,135,.07);}
.new-product-tracking-block>.screen-note{flex:none;font-size:9px;line-height:1.3;}
.new-product-tracking-block.detailed{height:auto;min-height:0;max-height:70vh;}
.new-product-tracking-block.detailed .new-product-tracking-table{height:auto;min-height:0;max-height:56vh;}
.new-product-tracking-block.detailed .new-product-tracking-table table{font-size:12px;}
.new-product-tracking-block.detailed .new-product-tracking-table th,.new-product-tracking-block.detailed .new-product-tracking-table td{padding:10px 8px;}
.new-product-tracking-block.detailed>.screen-note{font-size:11px;}
@media(max-width:650px){.new-product-tracking-table table{min-width:640px;}}
</style>
