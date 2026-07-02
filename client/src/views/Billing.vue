<template>
  <div class="page">
    <div class="toolbar">
      <div class="filter-bar">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD"
          style="width:240px" />
        <el-input v-model="orderNo" placeholder="订单号" style="width:160px;margin-left:10px" clearable />
        <el-input v-model="subOrderNo" placeholder="子订单号" style="width:150px;margin-left:10px" clearable />
        <el-input v-model="productId" placeholder="商品ID" style="width:120px;margin-left:10px" clearable />
        <el-input v-model="flowNo" placeholder="业务流水号" style="width:160px;margin-left:10px" clearable />
        <el-button type="primary" style="margin-left:10px" @click="loadData">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>
      <div class="btn-bar">
        <el-button type="primary" @click="openAdd"><el-icon style="margin-right:4px"><Plus /></el-icon>新增</el-button>
        <el-button type="warning" @click="showImport=true"><el-icon style="margin-right:4px"><Upload /></el-icon>导入CSV</el-button>
        <el-button type="danger" :disabled="!selectedIds.length" @click="batchDelete"><el-icon style="margin-right:4px"><Delete /></el-icon>批量删除({{ selectedIds.length }})</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="kpi-row">
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">账单总数</div><div class="kpi-value">{{ total }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">总收入</div><div class="kpi-value" style="color:#67c23a">¥{{ fmt(totalIncome) }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">总退款</div><div class="kpi-value" style="color:#f56c6c">¥{{ fmt(totalRefund) }}</div></div></el-card></el-col>
      <el-col :span="6"><el-card shadow="hover"><div class="kpi"><div class="kpi-label">净收入</div><div class="kpi-value" style="color:#409eff">¥{{ fmt(totalIncome-totalRefund) }}</div></div></el-card></el-col>
    </el-row>

    <el-card shadow="hover">
      <el-table :data="billings" stripe v-loading="loading" @selection-change="onSelect" height="calc(100vh - 380px)">
        <el-table-column type="selection" width="45" fixed="left" />
        <el-table-column prop="accountPeriod" label="账期" width="90" />
        <el-table-column prop="billCategory" label="账单大类" width="100" />
        <el-table-column prop="businessCategory" label="业务大类" width="100" />
        <el-table-column prop="subCategory" label="业务小类" width="100" />
        <el-table-column label="订单号" width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.orderNo }}</span>
            <el-icon style="margin-left:6px;cursor:pointer;color:#409eff" @click="copyText(row.orderNo)"><CopyDocument /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="subOrderNo" label="子订单号" width="180" show-overflow-tooltip />
        <el-table-column label="下单时间" width="160"><template #default="{ row }">{{ row.orderTime ? new Date(row.orderTime).toLocaleString('zh-CN') : '-' }}</template></el-table-column>
        <el-table-column label="确认收货" width="160"><template #default="{ row }">{{ row.confirmTime ? new Date(row.confirmTime).toLocaleString('zh-CN') : '-' }}</template></el-table-column>
        <el-table-column prop="productId" label="商品ID" width="130" />
        <el-table-column prop="sku" label="SKU" width="200" show-overflow-tooltip />
        <el-table-column prop="productName" label="商品名称" width="200" show-overflow-tooltip />
        <el-table-column label="数量" width="60" align="right"><template #default="{ row }">{{ row.quantity }}</template></el-table-column>
        <el-table-column label="单价" width="90" align="right"><template #default="{ row }">{{ fmt(row.unitPrice) }}</template></el-table-column>
        <el-table-column label="实际金额" width="100" align="right"><template #default="{ row }">{{ fmt(row.actualAmount) }}</template></el-table-column>
        <el-table-column prop="refundNo" label="退款单号" width="160" show-overflow-tooltip />
        <el-table-column label="退款金额" width="90" align="right"><template #default="{ row }">{{ row.refundAmount ? fmt(row.refundAmount) : '-' }}</template></el-table-column>
        <el-table-column prop="paymentChannel" label="收/付渠道" width="120" />
        <el-table-column prop="paymentFlowNo" label="业务流水号" width="200" show-overflow-tooltip />
        <el-table-column prop="merchantOrderNo" label="商户订单号" width="180" show-overflow-tooltip />
        <el-table-column label="打款时间" width="160"><template #default="{ row }">{{ row.paymentTime ? new Date(row.paymentTime).toLocaleString('zh-CN') : '-' }}</template></el-table-column>
        <el-table-column label="打款更新" width="160"><template #default="{ row }">{{ row.paymentUpdateTime ? new Date(row.paymentUpdateTime).toLocaleString('zh-CN') : '-' }}</template></el-table-column>
        <el-table-column prop="remarks" label="备注" width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDetail(row)">详情</el-button>
            <el-button type="warning" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="delOne(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10,20,50,100]" :total="total"
          layout="total, sizes, prev, pager, next" @current-change="loadList" @size-change="loadList" />
      </div>
    </el-card>

    <!-- 新增/编辑 -->
    <el-dialog v-model="showForm" :title="formMode==='add'?'新增账单':'编辑账单'" width="1100px" :close-on-click-modal="false">
      <el-form :model="form" label-width="120px">
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="账期"><el-input v-model="form.accountPeriod" placeholder="如：202605" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="账单大类"><el-input v-model="form.billCategory" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="业务大类"><el-input v-model="form.businessCategory" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="业务小类"><el-input v-model="form.subCategory" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="订单号" required><el-input v-model="form.orderNo" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="子订单号"><el-input v-model="form.subOrderNo" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="商户订单号"><el-input v-model="form.merchantOrderNo" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="商品ID"><el-input v-model="form.productId" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="SKU"><el-input v-model="form.sku" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24"><el-form-item label="商品名称"><el-input v-model="form.productName" /></el-form-item></el-col>
        </el-row>

        <el-divider content-position="left">金额</el-divider>
        <el-row :gutter="20">
          <el-col :span="6"><el-form-item label="数量"><el-input-number v-model="form.quantity" :min="0" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="单价"><el-input-number v-model="form.unitPrice" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="实际金额"><el-input-number v-model="form.actualAmount" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="退款金额"><el-input-number v-model="form.refundAmount" :min="0" :precision="2" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="退款单号"><el-input v-model="form.refundNo" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="收/付渠道"><el-input v-model="form.paymentChannel" /></el-form-item></el-col>
        </el-row>

        <el-divider content-position="left">流水 & 时间</el-divider>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="业务流水号"><el-input v-model="form.paymentFlowNo" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="备注"><el-input v-model="form.remarks" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8"><el-form-item label="下单时间"><el-date-picker v-model="form.orderTime" type="datetime" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="确认收货"><el-date-picker v-model="form.confirmTime" type="datetime" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="打款时间"><el-date-picker v-model="form.paymentTime" type="datetime" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12"><el-form-item label="打款更新"><el-date-picker v-model="form.paymentUpdateTime" type="datetime" style="width:100%" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item></el-col>
          <el-col :span="12"></el-col>
        </el-row>
      </el-form>
      <template #footer><el-button @click="showForm=false">取消</el-button><el-button type="primary" @click="saveForm" :loading="saving">保存</el-button></template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog v-model="showDetail" title="账单详情" width="900px">
      <el-descriptions :column="3" border v-if="detail">
        <el-descriptions-item label="账期">{{ detail.accountPeriod||'-' }}</el-descriptions-item>
        <el-descriptions-item label="账单大类">{{ detail.billCategory||'-' }}</el-descriptions-item>
        <el-descriptions-item label="业务大类">{{ detail.businessCategory||'-' }}</el-descriptions-item>
        <el-descriptions-item label="业务小类">{{ detail.subCategory||'-' }}</el-descriptions-item>
        <el-descriptions-item label="订单号" :span="2">{{ detail.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="子订单号">{{ detail.subOrderNo||'-' }}</el-descriptions-item>
        <el-descriptions-item label="商户订单号">{{ detail.merchantOrderNo||'-' }}</el-descriptions-item>
        <el-descriptions-item label="商品ID">{{ detail.productId||'-' }}</el-descriptions-item>
        <el-descriptions-item label="SKU">{{ detail.sku||'-' }}</el-descriptions-item>
        <el-descriptions-item label="商品名称" :span="3">{{ detail.productName||'-' }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ detail.quantity||0 }}</el-descriptions-item>
        <el-descriptions-item label="单价">¥{{ fmt(detail.unitPrice) }}</el-descriptions-item>
        <el-descriptions-item label="实际金额">¥{{ fmt(detail.actualAmount) }}</el-descriptions-item>
        <el-descriptions-item label="退款单号">{{ detail.refundNo||'-' }}</el-descriptions-item>
        <el-descriptions-item label="退款金额">¥{{ fmt(detail.refundAmount) }}</el-descriptions-item>
        <el-descriptions-item label="收/付渠道">{{ detail.paymentChannel||'-' }}</el-descriptions-item>
        <el-descriptions-item label="业务流水号" :span="2">{{ detail.paymentFlowNo||'-' }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ detail.orderTime ? new Date(detail.orderTime).toLocaleString('zh-CN') : '-' }}</el-descriptions-item>
        <el-descriptions-item label="确认收货">{{ detail.confirmTime ? new Date(detail.confirmTime).toLocaleString('zh-CN') : '-' }}</el-descriptions-item>
        <el-descriptions-item label="打款时间">{{ detail.paymentTime ? new Date(detail.paymentTime).toLocaleString('zh-CN') : '-' }}</el-descriptions-item>
        <el-descriptions-item label="打款更新">{{ detail.paymentUpdateTime ? new Date(detail.paymentUpdateTime).toLocaleString('zh-CN') : '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remarks||'-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 导入 -->
    <el-dialog v-model="showImport" title="导入交易货款CSV" width="500px">
      <el-upload drag action="/api/billing/import" :headers="hdrs" :before-upload="()=>true" :on-success="onImportOk" :on-error="onImportErr" accept=".csv">
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽 CSV 文件到此处，或 <em>点击上传</em></div>
        <template #tip><div class="el-upload__tip">支持"交易货款.csv"格式（GBK编码）</div></template>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Upload, UploadFilled, Delete, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const dateRange=ref([]), orderNo=ref(''), subOrderNo=ref(''), productId=ref(''), flowNo=ref('')
const billings=ref([]), total=ref(0), page=ref(1), pageSize=ref(20)
const loading=ref(false), saving=ref(false)
const showForm=ref(false), showDetail=ref(false), showImport=ref(false)
const formMode=ref('add'), editingId=ref(null), selectedIds=ref([]), detail=ref(null)

const hdrs=computed(()=>{const t=localStorage.getItem('token');return t?{Authorization:`Bearer ${t}`}:{} })
const blank={accountPeriod:'',billCategory:'',businessCategory:'',subCategory:'',orderNo:'',subOrderNo:'',merchantOrderNo:'',productId:'',sku:'',productName:'',quantity:0,unitPrice:0,actualAmount:0,refundNo:'',refundAmount:0,paymentChannel:'',paymentFlowNo:'',orderTime:'',confirmTime:'',paymentTime:'',paymentUpdateTime:'',remarks:'',platform:'tmall',monthPeriod:'',isBrushOrder:false}
const form=ref({...blank})

function fmt(v){return(v||0).toLocaleString('zh-CN',{minimumFractionDigits:2})}
function copyText(text){navigator.clipboard.writeText(text).then(()=>ElMessage.success('已复制')).catch(()=>ElMessage.error('复制失败'))}
const totalIncome=computed(()=>billings.value.reduce((s,b)=>s+(b.actualAmount||0),0))
const totalRefund=computed(()=>billings.value.reduce((s,b)=>s+(b.refundAmount||0),0))

function resetSearch(){
  dateRange.value=[];orderNo.value='';subOrderNo.value='';productId.value='';flowNo.value=''
  loadData()
}

async function loadData(){page.value=1;loadList()}
async function loadList(){
  loading.value=true
  try{
    const p={page:page.value,pageSize:pageSize.value}
    if(dateRange.value?.length===2){p.startDate=dateRange.value[0];p.endDate=dateRange.value[1]}
    if(orderNo.value)p.orderNo=orderNo.value
    if(subOrderNo.value)p.subOrderNo=subOrderNo.value
    if(productId.value)p.productId=productId.value
    if(flowNo.value)p.flowNo=flowNo.value
    const r=(await api.get('/billing/list',{params:p})).data
    billings.value=r.data||[];total.value=r.total||0
  }catch(e){console.error(e)}
  loading.value=false
}
function onSelect(rows){selectedIds.value=rows.map(r=>r._id)}

function openAdd(){formMode.value='add';editingId.value=null;form.value={...blank};showForm.value=true}
function openEdit(row){
  formMode.value='edit';editingId.value=row._id
  Object.assign(form.value, blank, row)
  const dateKeys = ['orderTime','confirmTime','paymentTime','paymentUpdateTime']
  dateKeys.forEach(function(k){
    if(form.value[k])form.value[k]=new Date(form.value[k]).toISOString().slice(0,19).replace('T',' ')
  })
  showForm.value=true
}
function openDetail(row){detail.value=row;showDetail.value=true}

async function saveForm(){
  if(!form.value.orderNo)return ElMessage.error('订单号不能为空')
  saving.value=true
  try{
    if(formMode.value==='edit'){await api.put(`/billing/${editingId.value}`,form.value);ElMessage.success('更新成功')}
    else{await api.post('/billing',form.value);ElMessage.success('添加成功')}
    showForm.value=false;loadData()
  }catch(e){ElMessage.error(e.response?.data?.error||'操作失败')}
  saving.value=false
}
async function delOne(row){
  try{await ElMessageBox.confirm(`确认删除 ${row.orderNo}？`,'删除确认',{type:'warning'});
    await api.delete(`/billing/${row._id}`);ElMessage.success('已删除');loadData()
  }catch(e){if(e!=='cancel')ElMessage.error(e.response?.data?.error||'删除失败')}
}
async function batchDelete(){
  if(!selectedIds.value.length)return
  try{await ElMessageBox.confirm(`确认删除 ${selectedIds.value.length} 条？`,'批量删除',{type:'warning'});
    const r=await api.delete('/billing/batch',{data:{ids:selectedIds.value}});
    ElMessage.success(`已删除 ${r.data.deleted} 条`);selectedIds.value=[];loadData()
  }catch(e){if(e!=='cancel')ElMessage.error('删除失败')}
}
function onImportOk(res){
  if(res.success){
    let msg=`共 ${res.total} 条，新增 ${res.inserted} 条`
    if(res.skipped)msg+=`，跳过 ${res.skipped} 条（已存在）`
    ElMessage.success(msg);showImport.value=false;loadData()
  }else ElMessage.error(res.error||'导入失败')
}
function onImportErr(){ElMessage.error('上传失败')}

onMounted(loadData)
</script>

<style scoped>
.toolbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px}
.filter-bar{display:flex;align-items:center;flex-wrap:wrap}
.btn-bar{display:flex;gap:8px;flex-wrap:wrap}
.kpi-row{margin-bottom:16px}
.kpi{text-align:center}
.kpi-label{font-size:13px;color:#909399}
.kpi-value{font-size:24px;font-weight:700;margin-top:4px}
.pagination{margin-top:12px;display:flex;justify-content:flex-end}
</style>
