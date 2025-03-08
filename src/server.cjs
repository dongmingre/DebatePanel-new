const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: '*', // Allow all origins in development
  credentials: true
}));
app.use(express.json());

const db = new sqlite3.Database('./debate.db');

const ADMIN_USER = 'cxy';
const ADMIN_PASS = 'cxy';
const SECRET_KEY = 'mysecretkey';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: '令牌无效或已过期' });
    next();
  });
}

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username: ADMIN_USER }, SECRET_KEY, { expiresIn: '8h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: '用户名或密码错误' });
});

// Move database initialization into a function
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    console.log('Starting database initialization...');
    
    db.serialize(() => {
      try {
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');

        // Create tables first
        console.log('Creating tables...');
        
        // Create teams table first since it's referenced by others
        db.run(`CREATE TABLE IF NOT EXISTS teams (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        )`, (err) => {
          if (err) {
            console.error('Error creating teams table:', err);
            reject(err);
            return;
          }
          
          // Create matches table
          db.run(`CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round INTEGER NOT NULL,
            order_num INTEGER NOT NULL,
            team1_id INTEGER,
            team2_id INTEGER,
            winner_id INTEGER,
            topic TEXT,
            start_time TEXT,
            location TEXT,
            next_match_id INTEGER,
            next_match_slot INTEGER,
            FOREIGN KEY (team1_id) REFERENCES teams(id),
            FOREIGN KEY (team2_id) REFERENCES teams(id),
            FOREIGN KEY (winner_id) REFERENCES teams(id)
          )`, (err) => {
            if (err) {
              console.error('Error creating matches table:', err);
              reject(err);
              return;
            }

            // Create votes table
            db.run(`CREATE TABLE IF NOT EXISTS votes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              team_id INTEGER NOT NULL,
              ip TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (team_id) REFERENCES teams(id)
            )`, (err) => {
              if (err) {
                console.error('Error creating votes table:', err);
                reject(err);
                return;
              }

              // Now check if we need to insert initial data
              db.get('SELECT COUNT(*) as count FROM teams', [], (err, result) => {
                if (err) {
                  console.error('Error checking teams count:', err);
                  reject(err);
                  return;
                }

                if (result.count === 0) {
                  console.log('Inserting initial data...');
                  db.run('BEGIN TRANSACTION');

                  const teams = [
                    '土土土辩论队', '经管辩论队', '数大院汇文辩论队', '机电博闻辩论队',
                    '化爆言之辩论队', '电信院辩论队', '演协',
                    '力物学院辩论队', '鹿鸣辩论队', '材料院辩论队',
                    '空测停云辩论队', '能源恒理辩论队', '人文昭德辩论队',
                    '外国语鸿祯辩论队', '计算机宏辞辩论队'
                  ];

                  let teamIds = [];
                  let promises = teams.map((name) => {
                    return new Promise((resolve, reject) => {
                      db.run('INSERT INTO teams (name) VALUES (?)', [name], function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                      });
                    });
                  });

                  Promise.all(promises)
                    .then((ids) => {
                      teamIds = ids;
                      console.log('Teams inserted, inserting matches...');
                      
                      const matchPromises = [
                        [1, 1, teamIds[0], teamIds[1], '人工智能的普及讲加剧/减少社会不平等', '2025-03-15 09:00', '天工南101'],
                        [1, 2, teamIds[2], teamIds[3], '当代社会，终身学习是个人追求还是生存必须', '2025-03-15 09:00', '天工南105'],
                        [1, 3, teamIds[4], teamIds[5], '社交媒体强化/削弱了真实的人际关系', '2025-03-15 15:00', '天工南101'],
                        [1, 4, teamIds[6], teamIds[7], '大数据时代的隐私保护应优先于商业利益/商业利益优于隐私保护', '2025-03-15 15:00', '天工南105'],
                        [1, 5, teamIds[8], teamIds[9], '全球化进程中，文化多样性应被保护/应自然融合', '2025-03-16 09:00', '天工南101'],
                        [1, 6, teamIds[10], teamIds[11], '应对气候变化，个人责任重于制度约束/制度约束重于个人责任', '2025-03-16 09:00', '天工南105'],
                        [1, 7, teamIds[12], teamIds[13], '"躺平"是年轻人对现实的消极逃避/理性反抗', '2025-03-16 15:00', '天工南101'],
                        [1, 8, teamIds[14], null, '轮空', '2025-03-16 15:00', '天工南105']
                      ].map(match => {
                        return new Promise((resolve, reject) => {
                          db.run(`
                            INSERT INTO matches (round, order_num, team1_id, team2_id, topic, start_time, location)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                          `, match, (err) => {
                            if (err) reject(err);
                            else resolve();
                          });
                        });
                      });

                      return Promise.all(matchPromises);
                    })
                    .then(() => {
                      db.run('COMMIT', (err) => {
                        if (err) {
                          console.error('Transaction failed:', err);
                          db.run('ROLLBACK');
                          reject(err);
                        } else {
                          console.log('All data inserted successfully');
                          resolve();
                        }
                      });
                    })
                    .catch(error => {
                      console.error('Error during data insertion:', error);
                      db.run('ROLLBACK');
                      reject(error);
                    });
                } else {
                  console.log('Database already contains data, skipping initialization');
                  resolve();
                }
              });
            });
          });
        });
      } catch (error) {
        console.error('Database initialization failed:', error);
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
}

app.get('/api/teams', (req, res) => {
  console.log('GET /api/teams request received');
  const sql = `SELECT id, name FROM teams ORDER BY id`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching teams:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log(`Returning ${rows.length} teams`);
    res.json(rows);
  });
});

app.post('/api/teams', authenticateToken, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: '队伍名称不能为空' });
  }
  const sql = `INSERT INTO teams(name) VALUES(?)`;
  db.run(sql, [name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

app.put('/api/teams/:id', authenticateToken, (req, res) => {
  const { name } = req.body;
  const { id } = req.params;
  if (!name) {
    return res.status(400).json({ error: '队伍名称不能为空' });
  }
  const sql = `UPDATE teams SET name = ? WHERE id = ?`;
  db.run(sql, [name, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ error: '找不到该队伍' });
    }
    res.json({ id: Number(id), name });
  });
});

// 获取所有比赛数据
app.get('/api/matches', (req, res) => {
  const sql = `
    SELECT m.id, m.round, m.order_num, 
           m.team1_id, t1.name as team1_name,
           m.team2_id, t2.name as team2_name,
           m.winner_id,
           m.topic, m.start_time, m.location,
           m.next_match_id, m.next_match_slot
    FROM matches m
    LEFT JOIN teams t1 ON m.team1_id = t1.id
    LEFT JOIN teams t2 ON m.team2_id = t2.id
    ORDER BY m.round, m.order_num
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ data: rows });
  });
});

// 创建新比赛
app.post('/api/matches', authenticateToken, (req, res) => {
  const { team1_id, team2_id, round, order, start_time, location, topic } = req.body;
  
  // 添加参数验证
  if (!team1_id || !team2_id || !round || !order) {
    return res.status(400).json({ error: '必填字段不能为空' });
  }

  const sql = `
    INSERT INTO matches (team1_id, team2_id, round, order_num, start_time, location, topic)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(sql, [team1_id, team2_id, round, order, start_time, location, topic], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // 查询新创建的比赛完整信息
    const fetchSql = `
      SELECT m.*, 
             t1.name as team1_name, 
             t2.name as team2_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      WHERE m.id = ?
    `;
    
    db.get(fetchSql, [this.lastID], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });
});

// 更新比赛信息
app.put('/api/matches/:id', authenticateToken, (req, res) => {
  const { team1_id, team2_id, round, order, start_time, location, topic } = req.body;
  
  // Validate required fields
  if (!team1_id || !team2_id || !round || !order) {
    return res.status(400).json({ error: '必填字段不能为空' });
  }

  const sql = `
    UPDATE matches 
    SET team1_id = ?, team2_id = ?, round = ?, order_num = ?, 
        start_time = ?, location = ?, topic = ?
    WHERE id = ?`;
  
  db.run(sql, [team1_id, team2_id, round, order, start_time, location, topic, req.params.id], 
    function(err) {
      if (err) {
        console.error('Update error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '比赛不存在' });
      }
      
      // Return updated match data
      const fetchSql = `
        SELECT m.*, 
               t1.name as team1_name, 
               t2.name as team2_name
        FROM matches m
        LEFT JOIN teams t1 ON m.team1_id = t1.id
        LEFT JOIN teams t2 ON m.team2_id = t2.id
        WHERE m.id = ?
      `;
      
      db.get(fetchSql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    });
});

app.put('/api/matches/:id/winner', authenticateToken, (req, res) => {
  const matchId = req.params.id;
  const winnerId = req.body.winner_id;
  
  if (!winnerId) {
    return res.status(400).json({ error: '缺少胜者ID' });
  }

  const querySql = `SELECT * FROM matches WHERE id = ?`;
  db.get(querySql, [matchId], (err, match) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!match) {
      return res.status(404).json({ error: '比赛不存在' });
    }
    if (winnerId !== match.team1_id && winnerId !== match.team2_id) {
      return res.status(400).json({ error: '胜者ID无效' });
    }
    const updateWinnerSql = `UPDATE matches SET winner_id = ? WHERE id = ?`;
    db.run(updateWinnerSql, [winnerId, matchId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (match.next_match_id) {
        const nextSlotCol = match.next_slot === 1 ? 'team1_id' : 'team2_id';
        const updateNextSql = `UPDATE matches SET ${nextSlotCol} = ? WHERE id = ?`;
        db.run(updateNextSql, [winnerId, match.next_match_id], function(err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          return res.json({ message: '胜者已晋级' });
        });
      } else {
        return res.json({ message: '胜者已更新' });
      }
    });
  });
});

// 添加删除比赛路由
app.delete('/api/matches/:id', authenticateToken, (req, res) => {
  const { id } = req.params
  const sql = `DELETE FROM matches WHERE id = ?`
  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Delete match error:', err)
      return res.status(500).json({ error: err.message })
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '比赛不存在' })
    }
    // 返回204表示成功删除，无内容
    res.status(204).end()
  })
})

app.get('/api/votes/popularity', (req, res) => {
  const sql = `
    SELECT teams.id, teams.name,
           COALESCE(vcount.votes, 0) AS votes
    FROM teams
    LEFT JOIN (
      SELECT team_id, COUNT(*) AS votes 
      FROM votes 
      GROUP BY team_id
    ) AS vcount
    ON teams.id = vcount.team_id
    ORDER BY votes DESC, teams.id;
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/votes/popularity', (req, res) => {
  const teamId = req.body.teamId;
  if (!teamId) {
    return res.status(400).json({ error: '缺少队伍ID' });
  }
  const ip = req.ip;

  const checkSql = `SELECT id FROM votes WHERE ip = ?`;
  db.get(checkSql, [ip], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      return res.status(403).json({ error: '每个IP只能投一票' });
    }
    const insertSql = `INSERT INTO votes(team_id, ip) VALUES(?, ?)`;
    db.run(insertSql, [teamId, ip], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: '投票成功' });
    });
  });
});

// 添加健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Remove both existing startServer functions and replace with this single one
const startServer = async (port) => {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    const server = app.listen(port, '0.0.0.0')
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} is busy, trying ${port + 1}`);
          startServer(port + 1);
        } else {
          console.error('Server error:', err);
          process.exit(1);
        }
      })
      .on('listening', () => {
        const addr = server.address();
        console.log(`Server is running on http://${addr.address}:${addr.port}`);
      });

  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Start the server
startServer(3000);
