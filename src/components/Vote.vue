<template>
  <el-card class="vote-card">
    <template #header>
      <div class="card-header">
        <span>投票</span>
      </div>
    </template>
    
    <el-form :model="voteForm" label-width="120px">
      <el-form-item label="选择支持的队伍">
        <el-radio-group v-model="voteForm.teamId">
          <el-radio 
            v-for="team in teams" 
            :key="team.id"
            :value="team.id"  <!-- Changed from :label to :value -->
          >
            {{ team.name }} ({{ team.votes || 0 }}票)
          </el-radio>
        </el-radio-group>
      </el-form-item>
      
      <el-form-item>
        <el-button type="primary" @click="submitVote">投票</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

const teams = ref([]);
const voteForm = ref({
  teamId: ''
});

const fetchTeamsAndResults = async () => {
  try {
    const { data } = await axios.get('/api/votes/popularity');
    teams.value = data;
  } catch (error) {
    console.error('获取投票结果失败:', error);
    ElMessage.error('获取投票结果失败');
  }
};

const submitVote = async () => {
  if (!voteForm.value.teamId) {
    ElMessage.warning('请选择要支持的队伍');
    return;
  }
  
  try {
    await axios.post('/api/votes/popularity', {
      teamId: voteForm.value.teamId
    });
    ElMessage.success('投票成功');
    await fetchTeamsAndResults();
  } catch (error) {
    console.error('投票失败:', error);
    ElMessage.error(error.response?.data?.error || '投票失败');
  }
};

onMounted(() => {
  fetchTeamsAndResults();
});
</script>

<style scoped>
.vote-card {
  margin: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
