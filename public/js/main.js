@font-face {
  font-family: 'Digital dream Fat';
  src: url('https://semicon.github.io/fonts/DigitaldreamFat.woff2') format('woff2'),
    url('https://semicon.github.io/fonts/DigitaldreamFat.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500&family=K2D&family=Kanit&family=Sriracha&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Prompt', sans-serif;
}

html, body {
  height: 100%;
  overflow: hidden;
  position: fixed;
  width: 100%;
}

body {
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0;
  touch-action: manipulation;
}

.container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
}

.wrapper {
  background: rgba(255, 255, 255, 0.85);
  width: 100%;
  max-width: 500px;
  min-width: 280px;
  height: 85%;
  min-height: 400px;
  padding: 20px 15px;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  max-height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 15px;
  position: relative;
  overflow: hidden;
}

.app-title {
  color: #4a148c;
  margin-bottom: 10px;
  font-weight: 500;
  font-size: 1.2rem;
  text-align: center;
}

.site-logo {
  content: url("https://github.com/songphoh/time-tracker-app/blob/main/images/logo_v1.png?raw=true");
  display: block;
  margin: 5px auto;
  width: auto;
  height: 25%;
  min-height: 50px;
  max-width: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
  animation: float 3s infinite ease-in-out;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
}

.clock-container {
  margin: 10px 0;
  text-align: center;
}

/** #### digital clock #### **/
.clock {
  font-family: 'Digital dream Fat', monospace;
  font-size: 1.5rem;
  color: #00c9ff;
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(0, 249, 255, 0.5);
  background: #2c3e50;
  padding: 12px 3px;
  display: inline-block;
  border: none;
  border-radius: 8px;
  width: 100%;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
  text-align: center;
  animation: glow 2s infinite ease-in-out;
  position: relative;
  overflow: hidden;
  min-height: 50px; /* เพิ่มความสูงขั้นต่ำ */
  line-height: 1.5; /* เพิ่มระยะห่างระหว่างบรรทัด */
  box-sizing: border-box; /* รวมขอบและ padding ในการคำนวณขนาด */
}

/* เพิ่มการตอบสนองสำหรับอุปกรณ์ขนาดต่างๆ */
@media screen and (max-width: 480px) {
  .clock {
    font-size: 1.3rem;
    padding: 10px 2px;
  }
}

/* สำหรับหน้าจอขนาดเล็กมาก */
@media screen and (max-width: 320px) {
  .clock {
    font-size: 1.1rem;
    padding: 8px 2px;
  }
}

.clock::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: rotate(30deg);
  animation: clockShine 4s infinite linear;
}

@keyframes clockShine {
  0% {
    transform: translateX(-100%) rotate(30deg);
  }
  100% {
    transform: translateX(100%) rotate(30deg);
  }
}

/* Form Elements */
.form-label {
  color: #4a148c;
  font-weight: 500;
  margin-bottom: 4px;
  font-size: 0.85rem;
  display: block;
}

input#employee {
  font-family: 'Kanit', sans-serif;
  height: 45px;
  background-color: #1a237e;
  color: #ffeb3b;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-bottom: 0;
  border: none;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  padding: 12px;
  text-align: center;
  transition: all 0.3s ease;
}

input#employee:focus {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.form-control {
  border-radius: 8px;
  padding: 8px;
  font-size: 0.85rem;
  border: 1px solid #ddd;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  width: 100%;
}

.form-control:focus {
  border-color: #7c4dff;
  box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.25);
  outline: none;
  transform: translateY(-2px);
  transition: all 0.3s ease;
}

.row {
  display: flex;
  flex-wrap: wrap;
  margin: 8px -5px 15px -5px;
  gap: 10px;
}

.col {
  flex: 1 0 0%;
  padding: 0 5px;
}

.col-6 {
  flex: 0 0 auto;
  width: 50%;
  padding: 0 5px;
  margin-bottom: 10px;
}

/* ปรับแต่งปุ่ม Clock In/Out ให้อยู่แถวเดียวกัน */
.row.btn-controls {
  display: flex;
  gap: 10px;
  margin: 15px 0;
  justify-content: space-between;
}

.row.btn-controls .col-6 {
  flex: 0 0 calc(50% - 5px);
  max-width: calc(50% - 5px);
  padding: 0;
  margin-bottom: 0;
}

/* Buttons */
.btn {
  font-weight: 500;
  padding: 10px;
  border-radius: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
  display: inline-block;
  text-align: center;
  text-decoration: none;
  width: 100%;
}

.btn-primary {
  background: linear-gradient(45deg, #3949ab, #1e88e5);
  border: none;
  color: white;
  position: relative;
  z-index: 1;
}

.btn-primary:hover {
  background: linear-gradient(45deg, #303f9f, #1976d2);
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
  z-index: -1;
}

.btn-primary:hover::before {
  width: 100%;
}

.btn-warning {
  background: linear-gradient(45deg, #ff9800, #ff5722);
  border: none;
  color: white;
  position: relative;
  z-index: 1;
}

.btn-warning:hover {
  background: linear-gradient(45deg, #f57c00, #e64a19);
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.btn-warning::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
  z-index: -1;
}

.btn-warning:hover::before {
  width: 100%;
}

/* Button Animation */
.btn-animate {
  animation: buttonPulse 0.5s ease;
}

.btn {
  position: relative;
  overflow: hidden;
}

.btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.5);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%, -50%);
  transform-origin: 50% 50%;
}

.btn:focus:not(:active)::after {
  animation: ripple 1s ease-out;
}

@keyframes ripple {
  0% {
    transform: scale(0, 0);
    opacity: 0.5;
  }
  20% {
    transform: scale(25, 25);
    opacity: 0.3;
  }
  100% {
    opacity: 0;
    transform: scale(40, 40);
  }
}

@keyframes buttonPulse {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(0, 201, 255, 0.5); }
  50% { box-shadow: 0 0 20px rgba(0, 201, 255, 0.8); }
  100% { box-shadow: 0 0 5px rgba(0, 201, 255, 0.5); }
}

/* Alert Message */
.alert {
  border-radius: 8px;
  padding: 12px 15px;
  margin-top: 8px;
  background-color: #f8f9fa;
  border-left: 4px solid #4a148c;
  min-height: 40px;
  font-size: 0.85rem;
  word-wrap: break-word;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
  animation: fadeIn 0.5s ease-in-out;
}

/* Alert variations */
.alert-success {
  border-left-color: #28a745;
  background-color: rgba(40, 167, 69, 0.1);
}

.alert-warning {
  border-left-color: #ffc107;
  background-color: rgba(255, 193, 7, 0.1);
}

.alert-danger {
  border-left-color: #dc3545;
  background-color: rgba(220, 53, 69, 0.1);
}

.alert-info {
  border-left-color: #17a2b8;
  background-color: rgba(23, 162, 184, 0.1);
}

.msgBg {
  border-left-color: #4a148c;
  background-color: rgba(74, 20, 140, 0.05);
}

/* Autocomplete Styling */
.ui-autocomplete {
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 9999;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
  border: 1px solid #ddd;
  background: white;
  font-family: 'Kanit', sans-serif;
  padding: 5px;
}

.ui-menu-item {
  padding: 0;
  margin: 0;
}

.autocomplete-item {
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
  margin: 2px 0;
}

.ui-state-focus .autocomplete-item,
.ui-state-active .autocomplete-item {
  background-color: #7c4dff !important;
  color: white !important;
  border: none !important;
  margin: 2px 0 !important;
}

/* Icons */
.fas, .fa {
  margin-right: 5px;
}

.form-group {
  margin-bottom: 0;
}

/* แก้ไขปุ่มตามหน้าจอขนาดต่างๆ */
@media screen and (max-height: 570px) {
  .site-logo {
    height: 10%;
    min-height: 40px;
  }
  
  .wrapper {
    padding: 12px 10px;
    height: 90%;
  }
  
  .row {
    margin-top: 5px;
    display: flex;
    flex-wrap: nowrap;
  }
  
  .clock-container {
    margin: 5px 0;
  }
  
  .app-title {
    margin-bottom: 5px;
    font-size: 1rem;
  }
  
  .alert {
    margin-top: 5px;
    min-height: 35px;
    padding: 8px;
  }
  
  .form-label {
    margin-bottom: 2px;
  }
  
  input#employee, .form-control {
    height: 36px;
    padding: 8px;
  }
  
  .btn {
    padding: 8px;
  }
  
  /* แน่ใจว่าปุ่มอยู่แถวเดียวกัน */
  .clock-buttons {
    display: flex;
    gap: 5px;
  }
}

/* Larger phones (iPhone 6,7,8, X, 11, 12, 13) */
@media screen and (min-height: 650px) and (max-height: 850px) {
  .site-logo {
    height: 12%;
    min-height: 50px;
  }
  
  .wrapper {
    height: 85%;
    padding: 15px 12px;
  }
}

/* Larger screens */
@media screen and (min-height: 850px) {
  .site-logo {
    height: 15%;
    min-height: 70px;
  }
  
  .wrapper {
    height: 80%;
    padding: 25px 20px;
  }
  
  .app-title {
    font-size: 1.3rem;
  }
  
  .clock {
    font-size: 1.8rem;
  }
  
  .form-label {
    font-size: 1rem;
  }
  
  input#employee {
    height: 45px;
    font-size: 1rem;
  }
  
  .form-control {
    padding: 10px;
    font-size: 1rem;
  }
  
  .btn {
    padding: 12px;
    font-size: 1rem;
  }
}

/* Tablet and larger screens */
@media (min-width: 768px) {
  .wrapper {
    min-width: 450px;
    max-width: 600px;
    padding: 30px 25px;
    height: 75%;
  }
  
  .row {
    margin-top: 15px;
  }
  
  .clock {
    font-size: 24px;
  }
  
  .site-logo {
    height: 15%;
    min-height: 80px;
  }
  
  .app-title {
    font-size: 1.4rem;
    margin-bottom: 15px;
  }
  
  .form-label {
    font-size: 1rem;
    margin-bottom: 6px;
  }
  
  input#employee {
    height: 45px;
    font-size: 1rem;
  }
  
  .btn {
    padding: 12px;
    font-size: 1rem;
  }
  
  .alert {
    margin-top: 15px;
    min-height: 45px;
  }
}

/* Larger screens (desktops) */
@media (min-width: 992px) {
  .wrapper {
    min-width: 500px;
    max-width: 650px;
    padding: 40px 35px;
    height: 70%;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
  }
  
  .site-logo {
    height: 18%;
    min-height: 100px;
  }
  
  .clock {
    font-size: 28px;
  }
  
  .btn {
    padding: 14px;
  }
}

/* Fix for iOS devices */
@supports (-webkit-touch-callout: none) {
  html, body {
    height: -webkit-fill-available;
  }
  
  body {
    min-height: -webkit-fill-available;
  }
  
  .container {
    min-height: -webkit-fill-available;
  }
}
