<script setup>
import {computed} from 'vue';
import {useDashboard} from '../../composables/useDashboard';

const {
  deliveryStart,deliveryEnd,deliveryOrderQuery,flowSupplierQuery,flowBuyerQuery,flowOrderType,
  flowOrderRows,selectedFlowOrder,selectedFlowOrderId,activeWorkflowStage,
  selectFlowOrder,D
}=useDashboard();

const materialNameById=id=>D.value.materials.find(item=>item[0]===id)?.[1]||id||'未知物料';
const flow=computed(()=>D.value.deliveryFlow||{});
const inspectionStatus=conclusion=>{
  if(conclusion==='合格'||conclusion==='让步接收')return'合格';
  if(conclusion==='退货'||conclusion==='不合格')return'不合格';
  return conclusion?'检验中':'待检';
};
const orderStages=computed(()=>{
  const order=selectedFlowOrder.value;
  if(!order)return[];
  const entries=flow.value.requisitions?.filter(item=>item.order_id===order.order_id)||[];
  const purchaseLines=(flow.value.rawOrders||[]).filter(item=>item.order_id===order.order_id);
  const confirmations=(flow.value.confirmations||[]).filter(item=>item.order_id===order.order_id);
  const shipments=(flow.value.deliveryNotes||[]).filter(item=>item.order_id===order.order_id);
  const receipts=(flow.value.receipts||[]).filter(item=>item.order_id===order.order_id);
  const exactQuality=(flow.value.quality||[]).filter(item=>item.order_id===order.order_id);
  const quality=exactQuality.length?exactQuality:(flow.value.quality||[]).filter(item=>
    !item.order_id
    &&item.supplier_id===order.supplier_id
    &&purchaseLines.some(line=>line.material_id&&line.material_id===item.material_id)
  );
  const warehouse=(flow.value.warehouseEntries||[]).filter(item=>item.order_id===order.order_id);
  const hasRequisition=entries.length>0;
  const hasPurchase=Boolean(order.order_date);
  const hasConfirmation=confirmations.some(item=>item.status==='已确认'||item.confirmed_at)||order.acceptance_status==='已接受';
  const hasShipment=shipments.length>0;
  const hasReceipt=receipts.length>0||shipments.some(item=>item.received_quantity!==undefined);
  const hasQuality=quality.length>0;
  const hasWarehouse=warehouse.length>0;
  const complete=[hasRequisition,hasPurchase,hasConfirmation,hasShipment,hasReceipt&&hasQuality,hasWarehouse];
  const current=complete.findIndex(done=>!done);
  const statusLabel=(index)=>{
    if(complete[index])return'已完成';
    return index===current?'当前阶段':'未完成';
  };
  const requisitionLines=entries.map(item=>({
    name:materialNameById(item.material_id),
    quantity:item.quantity,
    unit:item.unit||''
  }));
  const purchaseItems=purchaseLines.filter(item=>item.material_id).map(item=>({
    name:materialNameById(item.material_id),
    quantity:item.order_quantity,
    unit:item.purchase_unit||''
  }));
  const shipmentItems=shipments.map(item=>({
    name:item.material_name||materialNameById(item.material_id),
    quantity:item.shipped_quantity,
    unit:item.purchase_unit||''
  }));
  const receiptRows=receipts.length?receipts:shipments
    .filter(item=>item.received_quantity!==undefined)
    .map(item=>({...item,received_quantity:item.received_quantity,arrived_at:item.received_at,status:item.receipt_status||item.status}));
  const receiptItems=receiptRows.map(item=>{
    const inspection=quality.find(q=>q.material_id===item.material_id);
    return{
      name:materialNameById(item.material_id),
      quantity:item.received_quantity,
      status:inspectionStatus(inspection?.conclusion)
    };
  });
  const warehouseItems=warehouse.map(item=>({
    name:materialNameById(item.material_id),
    location:[item.warehouse_name,item.storage_location].filter(Boolean).join(' / ')||'暂无数据',
    quantity:item.quantity
  }));
  return[
    {
      title:'请购单阶段',time:entries[0]?.created_at,reference:entries[0]?.requisition_id,
      status:statusLabel(0),owner:entries[0]?.created_by||'暂无数据',
      summary:[{label:'请购单号',value:entries.map(item=>item.requisition_id).filter(Boolean).join('、')||'暂无数据'},
        {label:'创建人',value:entries[0]?.created_by||'暂无数据'},
        {label:'创建时间',value:entries[0]?.created_at||'暂无数据'}],
      items:requisitionLines,itemHeading:'请购物料',itemType:'request'
    },
    {
      title:'采购单阶段',time:order.order_date,reference:order.order_id,
      status:statusLabel(1),owner:order.buyer||'暂无数据',
      summary:[{label:'采购单号',value:order.order_id},
        {label:'采购员',value:order.buyer||'暂无数据'},
        {label:'创建时间',value:order.order_date||'暂无数据'}],
      items:purchaseItems,itemHeading:'采购物料',itemType:'request'
    },
    {
      title:'供应商确认阶段',time:confirmations.find(item=>item.confirmed_at)?.confirmed_at,
      reference:confirmations.map(item=>item.status).filter(Boolean).join('、')||order.acceptance_status||'暂无数据',
      status:statusLabel(2),owner:confirmations[0]?.contact_name||'暂无数据',
      summary:[{label:'受理状态',value:order.acceptance_status||confirmations[0]?.status||'待受理'},
        {label:'供应商联系人',value:confirmations[0]?.contact_name||'暂无数据'},
        {label:'受理时间',value:confirmations.find(item=>item.confirmed_at)?.confirmed_at||'暂无数据'},
        {label:'承诺交期',value:confirmations[0]?.promised_delivery_date||order.expected_delivery_date||'暂无数据'}],
      items:[],itemHeading:'确认差异',itemType:'request'
    },
    {
      title:'发货阶段',time:shipments[0]?.shipped_at,
      reference:[...new Set(shipments.map(item=>item.delivery_no).filter(Boolean))].join('、')||'暂无数据',
      status:statusLabel(3),owner:'暂无数据',
      summary:[{label:'发货批次',value:[...new Set(shipments.map(item=>item.delivery_no).filter(Boolean))].join('、')||'暂无数据'},
        {label:'发货时间',value:shipments.map(item=>item.shipped_at).filter(Boolean).join('、')||'暂无数据'},
        {label:'发货状态',value:[...new Set(shipments.map(item=>item.status).filter(Boolean))].join('、')||'未发货'}],
      items:shipmentItems,itemHeading:'发货物料明细',itemType:'shipment'
    },
    {
      title:'收货 / 质检阶段',time:receiptRows[0]?.arrived_at||quality[0]?.inspection_date,
      reference:receiptRows.map(item=>item.receipt_id).filter(Boolean).join('、')||'暂无数据',
      status:statusLabel(4),owner:'暂无数据',
      summary:[{label:'到货状态',value:[...new Set(receiptRows.map(item=>item.status).filter(Boolean))].join('、')||'待到货'},
        {label:'质检单创建时间',value:quality.map(item=>item.inspection_date).filter(Boolean).join('、')||'暂无数据'},
        {label:'质检关联说明',value:exactQuality.length?'按订单号匹配':quality.length?'按供应商及物料匹配（数据源无订单号）':'暂无质检关联数据'},
        {label:'质检状态',value:[...new Set(quality.map(item=>item.conclusion).filter(Boolean))].join('、')||'待检'}],
      items:receiptItems,itemHeading:'到货及检验明细',itemType:'inspection',
      extraItems:quality.map(item=>({
        name:materialNameById(item.material_id),
        batch:item.batch_id||'暂无批次号',
        quantity:item.inspected_quantity,
        status:item.conclusion||'待检'
      }))
    },
    {
      title:'入库阶段',time:warehouse[0]?.entered_at,
      reference:warehouse.map(item=>item.entry_id).filter(Boolean).join('、')||'暂无数据',
      status:statusLabel(5),owner:'暂无数据',
      summary:[{label:'入库单号',value:warehouse.map(item=>item.entry_id).filter(Boolean).join('、')||'暂无数据'},
        {label:'入库时间',value:warehouse.map(item=>item.entered_at).filter(Boolean).join('、')||'暂无数据'},
        {label:'入库状态',value:[...new Set(warehouse.map(item=>item.status).filter(Boolean))].join('、')||'未入库'}],
      items:warehouseItems,itemHeading:'入库物料明细',itemType:'warehouse'
    }
  ].map((stage,index)=>({
    ...stage,
    index,
    state:complete[index]?'done':index===current?'current':'pending',
    time:stage.time||'待更新'
  }));
});

function selectOrder(id){
  selectFlowOrder(id);
}

function focusStage(index){
  activeWorkflowStage.value=index;
  document.getElementById(`order-stage-${index}`)?.scrollIntoView({behavior:'smooth',block:'start'});
}
</script>

<template>
  <section class="page-stack">
    <div class="query-panel flow-query">
      <label>订单编号<input v-model="deliveryOrderQuery" placeholder="请输入订单编号"></label>
      <label>订单类型<select v-model="flowOrderType"><option>全部</option><option>量产订单</option><option>新品开发</option></select></label>
      <label>供应商<input v-model="flowSupplierQuery" placeholder="请输入供应商名称"></label>
      <label>采购员<input v-model="flowBuyerQuery" placeholder="请输入采购员"></label>
      <label>开始日期<input type="date" v-model="deliveryStart"></label>
      <label>结束日期<input type="date" v-model="deliveryEnd"></label>
      <button type="button">查询</button>
    </div>
    <article class="data-box order-detail-table">
      <header>采购订单与送货进度</header>
      <div>
        <table>
          <thead>
            <tr>
              <th v-for="heading in ['订单号','订单日期','采购员','供应商名称','订单笔数','订单状态','供应商受理','累计发货','累计收货','未收数量','送货单号']" :key="heading">{{heading}}</th>
              <th class="order-progress-heading">
                <span>订单进度</span>
                <div class="order-progress-labels">
                  <span v-for="step in ['请购','下单','确认','送货','到货检验','入库']" :key="step">{{step}}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in flowOrderRows"
              :key="item.orderId"
              :class="{'flow-order-selected':selectedFlowOrder?.order_id===item.orderId}"
              tabindex="0"
              @click="selectOrder(item.orderId)"
              @keydown.enter="selectOrder(item.orderId)"
            >
              <td>{{item.orderId}}</td><td>{{item.orderDate}}</td><td>{{item.buyer}}</td><td>{{item.supplier}}</td>
              <td>{{item.lineCount}}笔</td><td><span :class="['flow-status',item.orderStatus]">{{item.orderStatus}}</span></td>
              <td>{{item.acceptanceStatus}}</td><td>{{item.hasShipment?item.shipped:'-'}}</td>
              <td>{{item.hasShipment?item.received:'-'}}</td><td>{{item.hasShipment?item.unreceived:'-'}}</td>
              <td>{{item.deliveryNotes}}</td>
              <td><div class="order-progress"><i v-for="(done,index) in item.progress" :key="index" :class="{done}"></i></div></td>
            </tr>
            <tr v-if="!flowOrderRows.length"><td colspan="12" class="empty-cell">暂无符合条件的订单</td></tr>
          </tbody>
        </table>
      </div>
    </article>

    <section v-if="selectedFlowOrder" class="order-lifecycle">
      <header class="order-lifecycle-header">
        <div>
          <span class="order-lifecycle-kicker">ORDER LIFECYCLE</span>
          <h2>订单全链路状态</h2>
          <p>{{selectedFlowOrder.order_id}} <i>·</i> {{selectedFlowOrder.supplier_id}} <i>·</i> {{selectedFlowOrder.order_date||'订单日期待更新'}}</p>
        </div>
        <span class="order-lifecycle-current">
          当前状态 <b>{{selectedFlowOrder.status||'状态待更新'}}</b>
        </span>
      </header>

      <div class="lifecycle-timeline" aria-label="订单阶段时间轴">
        <button
          v-for="stage in orderStages"
          :key="stage.index"
          type="button"
          class="lifecycle-node"
          :class="[{done:stage.state==='done',current:stage.state==='current',pending:stage.state==='pending'},{'is-selected':activeWorkflowStage===stage.index}]"
          :aria-current="activeWorkflowStage===stage.index?'step':undefined"
          @click="focusStage(stage.index)"
        >
          <span class="lifecycle-node-marker">{{stage.state==='done'?'✓':String(stage.index+1).padStart(2,'0')}}</span>
          <strong>{{stage.title}}</strong>
          <small class="lifecycle-node-time">{{stage.time}}</small>
          <span class="lifecycle-node-status">{{stage.status}}</span>
        </button>
      </div>

      <div class="lifecycle-stage-list">
        <article
          v-for="stage in orderStages"
          :id="`order-stage-${stage.index}`"
          :key="stage.index"
          class="lifecycle-stage-detail"
          :class="{current:stage.state==='current',focused:activeWorkflowStage===stage.index}"
        >
          <header>
            <span class="lifecycle-stage-index">0{{stage.index+1}}</span>
            <div>
              <h3>{{stage.title}}</h3>
              <small>{{stage.reference}}</small>
            </div>
            <span class="lifecycle-stage-status" :class="stage.state">{{stage.status}}</span>
          </header>
          <div class="lifecycle-stage-summary">
            <div v-for="item in stage.summary" :key="item.label">
              <small>{{item.label}}</small>
              <strong>{{item.value}}</strong>
            </div>
          </div>
          <div v-if="stage.items.length" class="lifecycle-materials">
            <h4>{{stage.itemHeading}}</h4>
            <table>
              <thead>
                <tr>
                  <th>物料名称</th>
                  <th v-if="stage.itemType==='request'">数量</th>
                  <th v-if="stage.itemType==='shipment'">发货数量</th>
                  <th v-if="stage.itemType==='inspection'">到货数量</th>
                  <th v-if="stage.itemType==='inspection'">检验状态</th>
                  <th v-if="stage.itemType==='warehouse'">库位</th>
                  <th v-if="stage.itemType==='warehouse'">入库数量</th>
                  <th v-if="stage.itemType==='warehouse'">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item,index) in stage.items" :key="`${item.name}-${index}`">
                  <td>{{item.name}}</td>
                  <td v-if="stage.itemType==='request'">{{item.quantity??'暂无数据'}} {{item.unit}}</td>
                  <td v-if="stage.itemType==='shipment'">{{item.quantity??'暂无数据'}} {{item.unit}}</td>
                  <td v-if="stage.itemType==='inspection'">{{item.quantity??'暂无数据'}}</td>
                  <td v-if="stage.itemType==='inspection'">{{item.status}}</td>
                  <td v-if="stage.itemType==='warehouse'">{{item.location}}</td>
                  <td v-if="stage.itemType==='warehouse'">{{item.quantity??'暂无数据'}}</td>
                  <td v-if="stage.itemType==='warehouse'">{{item.action||'—'}}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="stage.extraItems?.length" class="lifecycle-materials">
            <h4>质检批次明细</h4>
            <table>
              <thead><tr><th>物料名称</th><th>批次号</th><th>检验数量</th><th>检验状态</th></tr></thead>
              <tbody>
                <tr v-for="item in stage.extraItems" :key="item.batch">
                  <td>{{item.name}}</td><td>{{item.batch}}</td><td>{{item.quantity??'暂无数据'}}</td><td>{{item.status}}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!stage.items.length&&!stage.extraItems?.length" class="lifecycle-empty">
            暂无阶段明细数据
          </p>
        </article>
      </div>
    </section>
    <div v-else class="order-lifecycle-empty">请先选择订单查看全链路详情</div>
  </section>
</template>
