const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const { Pool } = require('pg'); // เปลี่ยนจาก sqlite3 เป็น pg
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// กำหนดค่า connection string สำหรับ PostgreSQL
// ใช้ environment variables สำหรับการเชื่อมต่อ (สำคัญสำหรับการ deploy)
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/time_tracker';

// สร้าง connection pool
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ทดสอบการเชื่อมต่อ
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('ไม่สามารถเชื่อมต่อฐานข้อมูลได้:', err.message);
  } else {
    console.log('เชื่อมต่อฐานข้อมูลสำเร็จ เวลาปัจจุบันของ server:', res.rows[0].now);
    initializeDatabase();
  }
});

// ฟังก์ชันสร้างตารางและข้อมูลเริ่มต้น
async function initializeDatabase() {
  console.log('กำลังตรวจสอบและสร้างตาราง...');
  
  const client = await pool.connect();
  
  try {
    // เริ่ม transaction
    await client.query('BEGIN');
    
    // สร้างตารางเก็บรายชื่อพนักงาน
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        emp_code TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        position TEXT,
        department TEXT,
        line_id TEXT,
        line_name TEXT,
        line_picture TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('ตาราง employees สร้างหรือมีอยู่แล้ว');

    // สร้างตารางเก็บบันทึกเวลา
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_logs (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        clock_in TIMESTAMP,
        clock_out TIMESTAMP,
        note TEXT,
        latitude_in REAL,
        longitude_in REAL,
        latitude_out REAL,
        longitude_out REAL,
        line_id TEXT,
        line_name TEXT,
        line_picture TEXT,
        status TEXT DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      )
    `);
    console.log('ตาราง time_logs สร้างหรือมีอยู่แล้ว');

    // สร้างตารางเก็บค่า settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        setting_name TEXT NOT NULL UNIQUE,
        setting_value TEXT,
        description TEXT
      )
    `);
    console.log('ตาราง settings สร้างหรือมีอยู่แล้ว');
    
    // Commit transaction
    await client.query('COMMIT');
    
    // ตรวจสอบและเพิ่มข้อมูลเริ่มต้น
    await addInitialSettings(client);
    await addSampleEmployees(client);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', err.message);
  } finally {
    client.release();
  }
}

// เพิ่มข้อมูลการตั้งค่าเริ่มต้น
async function addInitialSettings(client) {
  try {
    // ตรวจสอบว่ามีข้อมูลในตาราง settings หรือไม่
    const countResult = await pool.query('SELECT COUNT(*) as count FROM settings');
    
    if (parseInt(countResult.rows[0].count) === 0) {
      console.log('กำลังเพิ่มการตั้งค่าเริ่มต้น...');
      
      const settings = [
        { name: 'organization_name', value: 'องค์การบริหารส่วนตำบลหัวนา', desc: 'ชื่อหน่วยงาน' },
        { name: 'work_start_time', value: '08:30', desc: 'เวลาเริ่มงาน' },
        { name: 'work_end_time', value: '16:30', desc: 'เวลาเลิกงาน' },
        { name: 'allowed_ip', value: '', desc: 'IP Address ที่อนุญาต' },
        { name: 'telegram_bot_token', value: '', desc: 'Token สำหรับ Telegram Bot' },
        { name: 'telegram_groups', value: '[{"name":"กลุ่มหลัก","chat_id":"","active":true}]', desc: 'กลุ่มรับการแจ้งเตือน Telegram' },
        { name: 'notify_clock_in', value: '1', desc: 'แจ้งเตือนเมื่อลงเวลาเข้า' },
        { name: 'notify_clock_out', value: '1', desc: 'แจ้งเตือนเมื่อลงเวลาออก' },
        { name: 'admin_username', value: 'admin', desc: 'ชื่อผู้ใช้สำหรับแอดมิน' },
        { name: 'admin_password', value: 'admin123', desc: 'รหัสผ่านสำหรับแอดมิน' }
      ];
      
      const insertQuery = 'INSERT INTO settings (setting_name, setting_value, description) VALUES ($1, $2, $3)';
      
      for (const setting of settings) {
        await pool.query(insertQuery, [setting.name, setting.value, setting.desc]);
      }
      
      console.log('เพิ่มการตั้งค่าเริ่มต้นเรียบร้อยแล้ว');
    }
  } catch (err) {
    console.error('Error adding initial settings:', err.message);
  }
}

// เพิ่มข้อมูลพนักงานตัวอย่าง
async function addSampleEmployees() {
  try {
    // ตรวจสอบว่ามีข้อมูลในตาราง employees หรือไม่
    const countResult = await pool.query('SELECT COUNT(*) as count FROM employees');
    
    if (parseInt(countResult.rows[0].count) === 0) {
      console.log('กำลังเพิ่มพนักงานตัวอย่าง...');
      
      const employees = [
        { code: '001', name: 'สมชาย ใจดี', position: 'ผู้จัดการ', department: 'บริหาร' },
        { code: '002', name: 'สมหญิง รักเรียน', position: 'เจ้าหน้าที่', department: 'ธุรการ' }
      ];
      
      const insertQuery = 'INSERT INTO employees (emp_code, full_name, position, department) VALUES ($1, $2, $3, $4)';
      
      for (const emp of employees) {
        await pool.query(insertQuery, [emp.code, emp.name, emp.position, emp.department]);
      }
      
      console.log('เพิ่มพนักงานตัวอย่างเรียบร้อยแล้ว');
    }
  } catch (err) {
    console.error('Error adding sample employees:', err.message);
  }
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// จัดการเส้นทางสำหรับไฟล์สถิติก
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

// ตรวจสอบว่า log เข้าถึงทุก API
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

// API - ดึงรายชื่อพนักงานสำหรับ autocomplete
app.post('/api/getdata', async (req, res) => {
  console.log('API: getdata - ดึงรายชื่อพนักงานสำหรับ autocomplete');
  
  try {
    const result = await pool.query('SELECT full_name FROM employees WHERE status = $1', ['active']);
    const names = result.rows.map(e => e.full_name);
    res.json(names);
  } catch (err) {
    console.error('Error in getdata:', err.message);
    return res.json({ error: err.message });
  }
});

// API - ดึงรายชื่อพนักงานทั้งหมด
app.post('/api/getemployee', async (req, res) => {
  console.log('API: getemployee - ดึงรายชื่อพนักงานทั้งหมด');
  
  try {
    const result = await pool.query('SELECT emp_code, full_name FROM employees WHERE status = $1', ['active']);
    const data = result.rows.map(e => [e.full_name, e.emp_code]);
    res.json(data);
  } catch (err) {
    console.error('Error in getemployee:', err.message);
    return res.json({ error: err.message });
  }
});

// API - บันทึกเวลาเข้า
app.post('/api/clockin', async (req, res) => {
  console.log('API: clockin - บันทึกเวลาเข้า', req.body);
  
  try {
    const { employee, userinfo, lat, lon, line_name, line_picture } = req.body;
    
    // ตรวจสอบว่ามีชื่อพนักงาน
    if (!employee) {
      return res.json({ msg: 'กรุณาระบุชื่อพนักงาน' });
    }
    
    // ค้นหาพนักงานจากชื่อหรือรหัส
    const empResult = await pool.query('SELECT id FROM employees WHERE emp_code = $1 OR full_name = $1', [employee]);
    
    if (empResult.rows.length === 0) {
      return res.json({ msg: 'ไม่พบข้อมูลพนักงาน' });
    }
    
    const emp = empResult.rows[0];
    
    // ตรวจสอบว่าลงเวลาเข้าซ้ำหรือไม่
    const today = new Date().toISOString().split('T')[0];
    
    const checkExistingResult = await pool.query(
      'SELECT id FROM time_logs WHERE employee_id = $1 AND DATE(clock_in) = $2',
      [emp.id, today]
    );
    
    if (checkExistingResult.rows.length > 0) {
      return res.json({ 
        msg: 'คุณได้ลงเวลาเข้าแล้ววันนี้', 
        employee
      });
    }
    
    // บันทึกเวลาเข้า
    const now = new Date().toISOString();
    
    await pool.query(
      `INSERT INTO time_logs 
      (employee_id, clock_in, note, latitude_in, longitude_in, line_name, line_picture)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [emp.id, now, userinfo || null, lat || null, lon || null, line_name || null, line_picture || null]
    );
    
    // ดึง token สำหรับส่งแจ้งเตือน
    const notifySettingResult = await pool.query(
      'SELECT setting_value FROM settings WHERE setting_name = $1',
      ['notify_clock_in']
    );
    
    // สร้างข้อความสำหรับส่งแจ้งเตือน
    const returnDate = new Date().toLocaleTimeString('th-TH');
    let message = `${employee} ลงเวลาเข้างาน ${returnDate}`;
    if (userinfo) {
      message += `\nหมายเหตุ: ${userinfo}`;
    }
    
    // ส่งการแจ้งเตือนถ้าตั้งค่าไว้
    if (notifySettingResult.rows.length > 0 && notifySettingResult.rows[0].setting_value === '1') {
      await sendTelegramToAllGroups(message, lat, lon);
    }
    
    return res.json({
      msg: 'SUCCESS',
      employee,
      return_date: returnDate
    });
  } catch (error) {
    console.error('Error in clockin:', error);
    return res.json({ msg: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// API - บันทึกเวลาออก
app.post('/api/clockout', async (req, res) => {
  console.log('API: clockout - บันทึกเวลาออก', req.body);
  
  try {
    const { employee, lat, lon, line_name, line_picture } = req.body;
    
    // ตรวจสอบว่ามีชื่อพนักงาน
    if (!employee) {
      return res.json({ msg: 'กรุณาระบุชื่อพนักงาน' });
    }
    
    // ค้นหาพนักงานจากชื่อหรือรหัส
    const empResult = await pool.query(
      'SELECT id FROM employees WHERE emp_code = $1 OR full_name = $1',
      [employee]
    );
    
    if (empResult.rows.length === 0) {
      return res.json({ msg: 'ไม่พบข้อมูลพนักงาน' });
    }
    
    const emp = empResult.rows[0];
    
    // ตรวจสอบว่าลงเวลาเข้าวันนี้หรือไม่
    const today = new Date().toISOString().split('T')[0];
    
    const recordResult = await pool.query(
      'SELECT id, clock_out FROM time_logs WHERE employee_id = $1 AND DATE(clock_in) = $2 ORDER BY clock_in DESC LIMIT 1',
      [emp.id, today]
    );
    
    if (recordResult.rows.length === 0) {
      return res.json({ 
        msg: 'คุณยังไม่ได้ลงเวลาเข้าวันนี้', 
        employee
      });
    }
    
    const record = recordResult.rows[0];
    
    if (record.clock_out) {
      return res.json({ 
        msg: 'คุณได้ลงเวลาออกแล้ววันนี้', 
        employee
      });
    }
    
    // บันทึกเวลาออก
    const now = new Date().toISOString();
    
    await pool.query(
      `UPDATE time_logs SET 
      clock_out = $1, latitude_out = $2, longitude_out = $3, line_name = $4, line_picture = $5
      WHERE id = $6`,
      [now, lat || null, lon || null, line_name || null, line_picture || null, record.id]
    );
    
    // ดึง token สำหรับส่งแจ้งเตือน
    const notifySettingResult = await pool.query(
      'SELECT setting_value FROM settings WHERE setting_name = $1',
      ['notify_clock_out']
    );
    
    // สร้างข้อความสำหรับส่งแจ้งเตือน
    const returnDate = new Date().toLocaleTimeString('th-TH');
    let message = `${employee} ลงเวลาออกงาน ${returnDate}`;
    
    // ส่งการแจ้งเตือนถ้าตั้งค่าไว้
    if (notifySettingResult.rows.length > 0 && notifySettingResult.rows[0].setting_value === '1') {
      await sendTelegramToAllGroups(message, lat, lon);
    }
    
    return res.json({
      msg: 'SUCCESS',
      employee,
      return_date: returnDate
    });
  } catch (error) {
    console.error('Error in clockout:', error);
    return res.json({ msg: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// API - ส่งแจ้งเตือน Telegram
app.post('/api/sendnotify', async (req, res) => {
  console.log('API: sendnotify - ส่งแจ้งเตือน Telegram', req.body);
  
  try {
    const { message, token, chat_id, lat, lon } = req.body;
    
    if (!token || !chat_id || !message) {
      return res.json({ success: false, msg: 'ข้อมูลไม่ครบถ้วน' });
    }
    
    // เตรียมข้อความ
    let notifyMessage = message;
    
    // เพิ่มลิงก์แผนที่ถ้ามีพิกัด
    if (lat && lon) {
      notifyMessage += `\nพิกัด: https://www.google.com/maps?q=${lat},${lon}`;
    }
    
    console.log('Sending Telegram message:', notifyMessage);
    
    try {
      // ส่งแจ้งเตือนไปยัง Telegram Bot API
      const response = await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chat_id,
          text: notifyMessage
        }
      );
      
      console.log('Telegram response:', response.data);
      res.json({ success: true });
    } catch (error) {
      console.error('Error sending Telegram message:', error.response?.data || error.message);
      res.json({ success: false, error: error.response?.data?.message || error.message });
    }
  } catch (error) {
    console.error('Error in sendnotify:', error);
    res.json({ success: false, error: error.message });
  }
});

// เพิ่มฟังก์ชันสำหรับส่งข้อความไปยังทุกกลุ่ม Telegram ที่เปิดใช้งาน
async function sendTelegramToAllGroups(message, lat, lon) {
  try {
    // ดึง token
    const tokenResult = await pool.query(
      'SELECT setting_value FROM settings WHERE setting_name = $1',
      ['telegram_bot_token']
    );
    
    if (tokenResult.rows.length === 0 || !tokenResult.rows[0].setting_value) {
      console.error('Error getting Telegram token or token not set');
      return;
    }
    
    const token = tokenResult.rows[0].setting_value;
    
    // ดึงข้อมูลกลุ่ม
    const groupsResult = await pool.query(
      'SELECT setting_value FROM settings WHERE setting_name = $1',
      ['telegram_groups']
    );
    
    if (groupsResult.rows.length === 0 || !groupsResult.rows[0].setting_value) {
      console.error('No Telegram groups configured');
      return;
    }
    
    try {
      const groups = JSON.parse(groupsResult.rows[0].setting_value);
      
      // เตรียมข้อความ
      let notifyMessage = message;
      if (lat && lon) {
        notifyMessage += `\nพิกัด: https://www.google.com/maps?q=${lat},${lon}`;
      }
      
      // ส่งข้อความไปยังแต่ละกลุ่มที่เปิดใช้งาน
      for (const group of groups) {
        if (group.active && group.chat_id) {
          try {
            console.log(`Sending Telegram message to ${group.name} (${group.chat_id})`);
            
            await axios.post(
              `https://api.telegram.org/bot${token}/sendMessage`,
              {
                chat_id: group.chat_id,
                text: notifyMessage
              }
            );
            
            console.log(`Message sent to ${group.name} successfully`);
          } catch (error) {
            console.error(`Error sending message to ${group.name}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing Telegram groups:', error.message);
    }
  } catch (error) {
    console.error('Error in sendTelegramToAllGroups:', error.message);
  }
}

// --- API สำหรับระบบแอดมิน ---

// ตรวจสอบการเข้าสู่ระบบแอดมิน
app.post('/api/admin/login', async (req, res) => {
  console.log('API: admin/login - ตรวจสอบการเข้าสู่ระบบแอดมิน', req.body);
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }
    
    console.log(`Login attempt: ${username}`);
    
    // ตรวจสอบด้วยค่าเริ่มต้น admin/admin123 ก่อน
    if (username === 'admin' && password === 'admin123') {
      console.log('Admin login successful with default credentials');
      return res.json({ success: true });
    }
    
    // ตรวจสอบกับข้อมูลในฐานข้อมูล
    const adminUserResult = await pool.query(
      'SELECT setting_value FROM settings WHERE setting_name = $1',
      ['admin_username']
    );
    
    if (adminUserResult.rows.length === 0) {
      return res.json({ success: false, message: 'ไม่พบข้อมูลผู้ดูแลระบบ' });
    }
    
    const adminPassResult = await pool.query(
      'SELECT setting_value FROM settings WHERE setting_name = $1',
      ['admin_password']
    );
    
    if (adminPassResult.rows.length === 0) {
      return res.json({ success: false, message: 'ไม่พบข้อมูลผู้ดูแลระบบ' });
    }
    
    if (username === adminUserResult.rows[0].setting_value && password === adminPassResult.rows[0].setting_value) {
      console.log('Admin login successful with database credentials');
      return res.json({ success: true });
    }
    
    console.log('Admin login failed: invalid credentials');
    return res.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  } catch (error) {
    console.error('Error in admin login:', error);
    return res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// API - ดึงข้อมูลการลงเวลาทั้งหมด
app.get('/api/admin/time-logs', async (req, res) => {
  console.log('API: admin/time-logs - ดึงข้อมูลการลงเวลาทั้งหมด', req.query);
  
  try {
    const { from_date, to_date, employee_id } = req.query;
    
    let query = `
      SELECT t.id, e.emp_code, e.full_name, e.position, e.department, 
             t.clock_in, t.clock_out, t.note, t.status,
             t.latitude_in, t.longitude_in, t.latitude_out, t.longitude_out
      FROM time_logs t
      JOIN employees e ON t.employee_id = e.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (from_date) {
      query += ` AND DATE(t.clock_in) >= $${paramIndex++}`;
      params.push(from_date);
    }
    
    if (to_date) {
      query += ` AND DATE(t.clock_in) <= $${paramIndex++}`;
      params.push(to_date);
    }
    
    if (employee_id) {
      query += ` AND t.employee_id = $${paramIndex++}`;
      params.push(employee_id);
    }
    
    query += ' ORDER BY t.clock_in DESC';
    
    console.log('Running query:', query, 'with params:', params);
    
    const result = await pool.query(query, params);
    
    console.log(`Found ${result.rows.length} time logs`);
    
    // ปรับรูปแบบวันที่เวลาให้อ่านง่าย และตรวจสอบค่า null
    const formattedLogs = result.rows.filter(log => log && log.clock_in).map(log => {
      const clockInDate = new Date(log.clock_in);
      const clockOutDate = log.clock_out ? new Date(log.clock_out) : null;
      
      return {
        ...log,
        clock_in_date: clockInDate.toLocaleDateString('th-TH'),
        clock_in_time: clockInDate.toLocaleTimeString('th-TH'),
        clock_out_date: clockOutDate ? clockOutDate.toLocaleDateString('th-TH') : '',
        clock_out_time: clockOutDate ? clockOutDate.toLocaleTimeString('th-TH') : '',
        duration: clockOutDate ? calculateDuration(clockInDate, clockOutDate) : ''
      };
    });
    
    res.json({ success: true, logs: formattedLogs });
  } catch (error) {
    console.error('Error getting time logs:', error);
    res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// คำนวณระยะเวลาทำงาน
function calculateDuration(startDate, endDate) {
  const diff = Math.abs(endDate - startDate);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours} ชั่วโมง ${minutes} นาที`;
}

// API - ดึงข้อมูลพนักงานทั้งหมด
app.get('/api/admin/employees', async (req, res) => {
  console.log('API: admin/employees - ดึงข้อมูลพนักงานทั้งหมด');
  
  try {
    const result = await pool.query(`
      SELECT id, emp_code, full_name, position, department, 
             line_id, line_name, status, created_at
      FROM employees
      ORDER BY emp_code
    `);
    
    console.log(`Found ${result.rows.length} employees`);
    res.json({ success: true, employees: result.rows });
  } catch (error) {
    console.error('Error getting employees:', error);
    res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// API - เพิ่มพนักงานใหม่
app.post('/api/admin/employees', async (req, res) => {
  console.log('API: admin/employees POST - เพิ่มพนักงานใหม่', req.body);
  
  try {
    const { emp_code, full_name, position, department, status } = req.body;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!emp_code || !full_name) {
      return res.json({ success: false, message: 'กรุณาระบุรหัสและชื่อพนักงาน' });
    }
    
    // ตรวจสอบว่ารหัสพนักงานซ้ำหรือไม่
    const existingResult = await pool.query(
      'SELECT id FROM employees WHERE emp_code = $1',
      [emp_code]
    );
    
    if (existingResult.rows.length > 0) {
      return res.json({ success: false, message: 'รหัสพนักงานนี้มีในระบบแล้ว' });
    }
    
    // เพิ่มพนักงานใหม่
    const result = await pool.query(
      `INSERT INTO employees (emp_code, full_name, position, department, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [emp_code, full_name, position || null, department || null, status || 'active']
    );
    
    console.log('Added new employee:', full_name, 'with ID:', result.rows[0].id);
    res.json({ success: true, message: 'เพิ่มพนักงานเรียบร้อยแล้ว', id: result.rows[0].id });
  } catch (error) {
    console.error('Error adding employee:', error);
    res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// API - แก้ไขข้อมูลพนักงาน
app.put('/api/admin/employees/:id', async (req, res) => {
  console.log('API: admin/employees PUT - แก้ไขข้อมูลพนักงาน', req.params, req.body);
  
  try {
    const { id } = req.params;
    const { emp_code, full_name, position, department, status } = req.body;
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!emp_code || !full_name) {
      return res.json({ success: false, message: 'กรุณาระบุรหัสและชื่อพนักงาน' });
    }
    
    // ตรวจสอบว่าพนักงานมีในระบบหรือไม่
    const employeeResult = await pool.query(
      'SELECT id FROM employees WHERE id = $1',
      [id]
    );
    
    if (employeeResult.rows.length === 0) {
      return res.json({ success: false, message: 'ไม่พบข้อมูลพนักงาน' });
    }
    
    // ตรวจสอบว่ารหัสพนักงานซ้ำหรือไม่ (ยกเว้นรหัสของพนักงานคนเดิม)
    const existingResult = await pool.query(
      'SELECT id FROM employees WHERE emp_code = $1 AND id != $2',
      [emp_code, id]
    );
    
    if (existingResult.rows.length > 0) {
      return res.json({ success: false, message: 'รหัสพนักงานนี้มีในระบบแล้ว' });
    }
    
    // แก้ไขข้อมูลพนักงาน
    await pool.query(
      `UPDATE employees
       SET emp_code = $1, full_name = $2, position = $3, department = $4, status = $5
       WHERE id = $6`,
      [emp_code, full_name, position || null, department || null, status || 'active', id]
    );
    
    console.log('Updated employee:', full_name, 'with ID:', id);
    res.json({ success: true, message: 'แก้ไขข้อมูลพนักงานเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// API - ลบพนักงาน (soft delete)
app.delete('/api/admin/employees/:id', async (req, res) => {
  console.log('API: admin/employees DELETE - ลบพนักงาน', req.params);
  
  try {
    const { id } = req.params;
    
    // ตรวจสอบว่าพนักงานมีในระบบหรือไม่
    const employeeResult = await pool.query(
      'SELECT id, full_name FROM employees WHERE id = $1',
      [id]
    );
    
    if (employeeResult.rows.length === 0) {
      return res.json({ success: false, message: 'ไม่พบข้อมูลพนักงาน' });
    }
    
    const employee = employeeResult.rows[0];
    
    // ลบพนักงาน (soft delete โดยเปลี่ยนสถานะเป็น inactive)
    await pool.query(
      'UPDATE employees SET status = $1 WHERE id = $2',
      ['inactive', id]
    );
    
    console.log('Deleted (set inactive) employee with ID:', id, '(', employee.full_name, ')');
    res.json({ success: true, message: 'ลบพนักงานเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// API - ดึงการตั้งค่าทั้งหมด
app.get('/api/admin/settings', async (req, res) => {
  console.log('API: admin/settings - ดึงการตั้งค่าทั้งหมด');
  
  try {
    const result = await pool.query('SELECT * FROM settings');
    
    // ซ่อนรหัสผ่านแอดมิน
    const filteredSettings = result.rows.map(setting => {
      if (setting.setting_name === 'admin_password') {
        return { ...setting, setting_value: '' };
      }
      return setting;
    });
    
    console.log(`Found ${result.rows.length} settings`);
    res.json({ success: true, settings: filteredSettings });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// API - บันทึกการตั้งค่า
app.post('/api/admin/settings', async (req, res) => {
  console.log('API: admin/settings POST - บันทึกการตั้งค่า', req.body);
  
  try {
    const { settings } = req.body;
    
    if (!Array.isArray(settings) || settings.length === 0) {
      return res.json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
    }
    
    const client = await pool.connect();
    
    try {
      // เริ่มต้น transaction
      await client.query('BEGIN');
      
      // บันทึกการตั้งค่าทีละรายการ
      for (const setting of settings) {
        if (setting.name && setting.value !== undefined) {
          await client.query(
            'UPDATE settings SET setting_value = $1 WHERE setting_name = $2',
            [setting.value, setting.name]
          );
        }
      }
      
      await client.query('COMMIT');
      console.log('Settings updated successfully');
      res.json({ success: true, message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating settings:', err);
      res.json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า: ' + err.message });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// API - ดึงข้อมูลรายงานสรุป
app.get('/api/admin/dashboard', async (req, res) => {
  console.log('API: admin/dashboard - ดึงข้อมูลรายงานสรุป');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // จำนวนพนักงานทั้งหมด
    const totalEmployeesResult = await pool.query(
      'SELECT COUNT(*) as count FROM employees WHERE status = $1',
      ['active']
    );
    const totalEmployees = parseInt(totalEmployeesResult.rows[0].count);
    
    // จำนวนพนักงานที่ลงเวลาวันนี้
    const checkedInTodayResult = await pool.query(
      `SELECT COUNT(DISTINCT employee_id) as count 
       FROM time_logs 
       WHERE DATE(clock_in) = $1`,
      [today]
    );
    const checkedInToday = parseInt(checkedInTodayResult.rows[0].count);
    
    // จำนวนพนักงานที่ยังไม่ลงเวลาออกวันนี้
    const notCheckedOutTodayResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM time_logs 
       WHERE DATE(clock_in) = $1 AND clock_out IS NULL`,
      [today]
    );
    const notCheckedOutToday = parseInt(notCheckedOutTodayResult.rows[0].count);
    
    // ข้อมูลการลงเวลาล่าสุด 10 รายการ
    const recentLogsResult = await pool.query(
      `SELECT t.id, e.emp_code, e.full_name, t.clock_in, t.clock_out, t.note
       FROM time_logs t
       JOIN employees e ON t.employee_id = e.id
       ORDER BY t.clock_in DESC
       LIMIT 10`
    );
    
    // ปรับรูปแบบวันที่เวลา และตรวจสอบค่า null
    const formattedLogs = recentLogsResult.rows.filter(log => log && log.clock_in).map(log => {
      const clockInDate = new Date(log.clock_in);
      const clockOutDate = log.clock_out ? new Date(log.clock_out) : null;
      
      return {
        ...log,
        clock_in_date: clockInDate.toLocaleDateString('th-TH'),
        clock_in_time: clockInDate.toLocaleTimeString('th-TH'),
        clock_out_time: clockOutDate ? clockOutDate.toLocaleTimeString('th-TH') : ''
      };
    });
    
    console.log('Dashboard data fetched successfully');
    
    res.json({
      success: true,
      dashboard: {
        totalEmployees,
        checkedInToday,
        notCheckedOutToday,
        recentLogs: formattedLogs
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// เพิ่ม route สำหรับหน้าแอดมิน
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', req.path));
});

// API พิเศษสำหรับรีเซ็ตข้อมูลแอดมิน
app.get('/api/reset-admin', async (req, res) => {
  console.log('API: reset-admin - รีเซ็ตข้อมูลแอดมิน');
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // ลบข้อมูลเดิม (ถ้ามี)
      await client.query(
        'DELETE FROM settings WHERE setting_name = $1 OR setting_name = $2',
        ['admin_username', 'admin_password']
      );
      
      // เพิ่มข้อมูลใหม่
      await client.query(
        'INSERT INTO settings (setting_name, setting_value, description) VALUES ($1, $2, $3)',
        ['admin_username', 'admin', 'ชื่อผู้ใช้สำหรับแอดมิน']
      );
      
      await client.query(
        'INSERT INTO settings (setting_name, setting_value, description) VALUES ($1, $2, $3)',
        ['admin_password', 'admin123', 'รหัสผ่านสำหรับแอดมิน']
      );
      
      await client.query('COMMIT');
      console.log('Admin credentials reset successfully');
      res.json({ success: true, message: 'รีเซ็ตข้อมูลแอดมินเรียบร้อยแล้ว' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error resetting admin credentials:', err);
      res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error resetting admin:', error);
    res.json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});