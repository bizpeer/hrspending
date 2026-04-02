import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL DB 연결 셋업 (로컬 또는 외부 DB 정보)
export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hr_management',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// DB 초기화 스크립트 작성 (스키마 생성)
export const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        position VARCHAR(50) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('WORKER', 'HR_ADMIN', 'DIRECTOR')),
        annual_leave_total INT DEFAULT 15,
        annual_leave_used INT DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS Attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES Users(id),
        work_date DATE NOT NULL,
        check_in_time TIMESTAMP WITH TIME ZONE,
        check_out_time TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'MISSING',
        ip_address VARCHAR(50)
      );
      
      CREATE TABLE IF NOT EXISTS LeaveRequests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES Users(id),
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'PENDING_HR',
        reject_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS Holidays (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        holiday_date DATE NOT NULL,
        name VARCHAR(100) NOT NULL
      );
    `);
    console.log('Database tables initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize local DB tables:', error);
  } finally {
    client.release();
  }
};
