<template>
  <div class="phone-tournament">
    <h1 class="phone-title">2025年安徽理工大学"校庆杯"校辩论赛</h1>
    
    <div class="round-tabs">
      <div 
        v-for="round in processedRounds"
        :key="round.round"
        :class="['round-tab', { active: currentRound === round.round }]"
        @click="currentRound = round.round"
      >
        第{{ chineseNumbers[round.round] }}轮
      </div>
    </div>

    <div class="matches-list">
      <div 
        v-for="match in currentMatches" 
        :key="match.id"
        class="match-card"
      >
        <div class="match-topic">{{ match.topic || '待定' }}</div>
        <div class="teams-container">
          <div class="team" :class="{ 'winner': isWinner(match, 1) }">
            <span class="team-name">{{ getTeam(match.team1_id) }}</span>
            <span class="score">{{ match.scores?.[0] || '—' }}</span>
          </div>
          <div class="vs">VS</div>
          <div class="team" :class="{ 'winner': isWinner(match, 2) }">
            <span class="team-name">{{ getTeam(match.team2_id) }}</span>
            <span class="score">{{ match.scores?.[1] || '—' }}</span>
          </div>
        </div>
        <div class="match-info">
          <span>🕒 {{ formatTime(match.start_time) }}</span>
          <span>📍 {{ match.location || 'AUST' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { matchesApi } from '../api'
import axios from 'axios'

const matches = ref([])
const teams = ref([])
const currentRound = ref(1)
const chineseNumbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八']

const processedRounds = computed(() => {
  if (!matches.value?.length) return []
  return processMatches(matches.value)
})

const currentMatches = computed(() => {
  const round = processedRounds.value.find(r => r.round === currentRound.value)
  return round?.matches || []
})

// Reuse the same helper functions from Schedule.vue
const processMatches = (matchesData) => {
  if (!Array.isArray(matchesData)) return []
  
  const rounds = {}
  matchesData.forEach(match => {
    const round = match.round || 1
    if (!rounds[round]) rounds[round] = []
    rounds[round].push({
      ...match,
      id: match.id,
      round: match.round,
      order_num: match.order_num,
      team1: match.team1_name || '待定',
      team2: match.team2_name || '待定',
      start: match.start_time,
      venue: match.location,
      topic: match.topic || '待定'
    })
  })

  return Object.entries(rounds)
    .map(([round, matches]) => ({
      round: parseInt(round),
      matches: matches.sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    }))
    .sort((a, b) => a.round - b.round)
}

const formatTime = (time) => {
  if (!time) return '待定'
  return new Date(time).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const isWinner = (match, teamNum) => {
  if (!match.winner_id) return false
  return match.winner_id === (teamNum === 1 ? match.team1_id : match.team2_id)
}

const getTeam = (teamId) => {
  const team = teams.value.find(t => t.id === teamId)
  return team ? team.name : `队伍${teamId}`
}

onMounted(async () => {
  try {
    const [teamsRes, matchesRes] = await Promise.all([
      axios.get('http://localhost:3000/api/teams'),
      matchesApi.getAllMatches()
    ])
    teams.value = teamsRes.data
    matches.value = matchesRes.data.data
  } catch (error) {
    console.error('加载数据失败:', error)
  }
})
</script>

<style scoped>
.phone-tournament {
  min-height: 100vh;
  padding: 1rem;
  background: linear-gradient(180deg, #0a0a1a, #1a1a2a);
}

.phone-title {
  font-size: 1.5rem;
  text-align: center;
  color: #fff;
  margin-bottom: 1.5rem;
  padding: 0 1rem;
}

.round-tabs {
  display: flex;
  overflow-x: auto;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 1rem;
}

.round-tab {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: #fff;
  white-space: nowrap;
  cursor: pointer;
}

.round-tab.active {
  background: #7d4aff;
}

.matches-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem;
}

.match-card {
  background: rgba(18, 20, 32, 0.95);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.match-topic {
  color: #00f7ff;
  font-size: 1rem;
  margin-bottom: 1rem;
  text-align: center;
}

.teams-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 1rem 0;
}

.team {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.team.winner {
  color: #2ed573;
}

.team-name {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.score {
  font-size: 1.2rem;
  font-weight: bold;
}

.vs {
  margin: 0 1rem;
  color: #ff4757;
  font-weight: bold;
}

.match-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #a0aec0;
  margin-top: 1rem;
}
</style>
