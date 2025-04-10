// กำหนด URL ของ API
var scripturl = '/api';
var owner = 'หน่วยงานราชการ';

// ตัวแปรสำหรับเก็บข้อมูลโปรไฟล์และพิกัด
var profile = null;
var gps;

// เริ่มดึงตำแหน่ง GPS
$.when(getlocation()).done(function (res) {
  console.log(res);
  console.log(gps);
});

// เมื่อโหลดหน้าเสร็จ
$(document).ready(function () {
  // กำหนดการทำงานของปุ่ม
  $('#clockin').click(() => ClockIn());
  $('#clockout').click(() => ClockOut());

  // เพิ่ม event listener สำหรับการกดปุ่ม Enter ในช่อง input
  $('#employee').keypress(function(e) {
    if(e.which == 13) {
      e.preventDefault();
      ClockIn();
    }
  });

  // ดึง LIFF ID จากฐานข้อมูล
  $.ajax({
    method: "GET",
    url: "/api/getLiffId",
    success: function(response) {
      if (response && response.liffId) {
        initializeLiff(response.liffId);
      } else {
        console.error("ไม่พบ LIFF ID ในฐานข้อมูล");
        showMessage("ไม่สามารถเชื่อมต่อกับ LINE ได้ กรุณาติดต่อผู้ดูแลระบบ", "danger");
      }
    },
    error: function(error) {
      console.error("เกิดข้อผิดพลาดในการดึง LIFF ID", error);
      showMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง", "danger");
    }
  });
});

// ฟังก์ชันแสดงข้อความในกล่องแจ้งเตือน
function showMessage(text, type = "primary") {
  const message = document.getElementById('message');
  message.innerHTML = text;
  message.className = `alert alert-${type}`;
  message.classList.remove('d-none');
}

// ฟังก์ชันแสดง Loading
function showLoading(text = "โปรดรอสักครู่...") {
  showMessage(`<div class="d-flex align-items-center">
    <div class="spinner-border spinner-border-sm me-2" role="status">
      <span class="visually-hidden">กำลังโหลด...</span>
    </div>
    <span>${text}</span>
  </div>`, "info");
}

function initializeLiff(liffId) {
  console.log("กำลังเริ่มต้น LIFF ด้วย ID:", liffId);
  
  // เริ่มต้น LINE LIFF
  liff.init({
    liffId: liffId,
    withLoginOnExternalBrowser: true
  }).then(() => {
    console.log("LIFF initialized successfully");
    
    // ตรวจสอบว่าได้เข้าสู่ระบบแล้วหรือไม่
    if (!liff.isLoggedIn()) {
      console.log("User not logged in, triggering login");
      liff.login();
      return;
    }
    
    // ดึงข้อมูลโปรไฟล์
    try {
      // ใช้ liff.getProfile() แทน getDecodedIDToken()
      liff.getProfile().then(userProfile => {
        profile = userProfile;
        console.log("🚀 ~ profile:", profile);
        console.log("User ID: " + profile.userId);
        console.log("Display Name: " + profile.displayName);
        console.log("Picture URL: " + (profile.pictureUrl || "ไม่พบรูปโปรไฟล์"));
        
        // เริ่มต้นแอป
        initApp();
      }).catch(err => {
        console.error("Error getting profile:", err);
        // กรณีไม่สามารถดึงโปรไฟล์ได้ แต่ยังใช้งานต่อได้
        initApp();
      });
    } catch (err) {
      console.error("Error in profile retrieval:", err);
      // กรณีเกิดข้อผิดพลาด แต่ยังใช้งานต่อได้
      initApp();
    }
  }).catch(err => {
    console.error("LIFF initialization failed", err);
    showMessage("ไม่สามารถเชื่อมต่อกับ LINE ได้ กรุณาติดต่อผู้ดูแลระบบ", "danger");
    
    // แม้จะมีปัญหากับ LIFF ก็ยังให้ใช้งานแอปได้
    initApp();
  });
}

// ฟังก์ชันเริ่มต้นแอป
function initApp() {
  showMessage(owner, "msgBg");
  
  // ดึงรายชื่อพนักงานสำหรับ autocomplete
  $.ajax({
    method: "POST",
    url: scripturl + "/getdata",
    data: {},
    success: function (dataPerson) {
      console.log(dataPerson);
      $(function () {
        var availableTags = dataPerson;
        $("#employee").autocomplete({
          maxShowItems: 3,
          source: availableTags,
          autoFocus: true,
          delay: 300,
          minLength: 1,
          select: function(event, ui) {
            // ปรับแต่งการแสดงผลเมื่อเลือก
            setTimeout(() => {
              $(this).blur();
              $("#userinfo").focus();
            }, 100);
          }
        }).autocomplete("instance")._renderItem = function(ul, item) {
          // ปรับแต่งการแสดงผลในรายการ autocomplete
          return $("<li>")
            .append("<div class='autocomplete-item'>" + item.label + "</div>")
            .appendTo(ul);
        };
      });
    }
  });

  // ดึงค่าชดเชยเวลาจากเซิร์ฟเวอร์
  $.ajax({
    method: "GET",
    url: "/api/getTimeOffset",
    success: function(response) {
      if (response.success && response.time_offset !== undefined) {
        // เก็บค่าชดเชยเวลาไว้ใน localStorage
        localStorage.setItem('time_offset', response.time_offset);
        console.log("ค่าชดเชยเวลา:", response.time_offset, "นาที");
      }
    }
  });

  // ดึงรายชื่อพนักงานสำหรับ dropdown
  getEmployees();
  
  // แสดงชื่อผู้ใช้ LINE ถ้ามี
  if (profile && profile.displayName) {
    const welcomeText = `ยินดีต้อนรับ: ${profile.displayName}`;
    showMessage(welcomeText, "success");
    
    // ซ่อนข้อความต้อนรับหลังจาก 3 วินาที
    setTimeout(() => {
      showMessage(owner, "msgBg");
    }, 3000);
  }
}

// ฟังก์ชันดึงรายชื่อพนักงาน
function getEmployees() {
  $.ajax({
    method: "POST",
    url: scripturl + "/getemployee",
    data: {},
    success: function (ar) {
      var employeeSelect = document.getElementById("employee");

      let option = document.createElement("option");
      option.value = "";
      option.text = "";
      employeeSelect.appendChild(option);

      ar.forEach(function (item, index) {
        let option = document.createElement("option");
        var employee = item[0];
        option.value = item[0];
        option.text = item[0];
        employeeSelect.appendChild(option);
      });
    }
  });
}

// ฟังก์ชันลงเวลาเข้า
async function ClockIn() {
  event.preventDefault();
  
  var employee = document.getElementById("employee").value;
  var userinfo = document.getElementById("userinfo").value;

  if (employee != '') {
    showLoading("กำลังบันทึกเวลาเข้า...");
    
    // เพิ่มเอฟเฟกต์ที่ปุ่ม
    animateButton('#clockin');
    
    // ข้อมูลที่จะส่งไปยัง API
    const apiData = {
      employee,
      userinfo,
      lat: gps ? gps[0] : null,
      lon: gps ? gps[1] : null
    };
    
    // เพิ่มข้อมูล LINE ถ้ามี profile
    if (profile) {
      // ใช้ค่าตามโครงสร้างของ liff.getProfile()
      apiData.line_name = profile.displayName;
      apiData.line_picture = profile.pictureUrl;
    }
    
    $.ajax({
      method: 'POST',
      url: scripturl + "/clockin",
      data: apiData,
      success: function (res) {
        console.log(res);
        
        if (res.msg == 'SUCCESS') {
          if (profile) {
            // ส่งแจ้งเตือนถ้ามี profile
            $.ajax({
              method: 'POST',
              url: scripturl + "/sendnotify",
              data: {
                message: res.message,
                token: res.token,
                lat: gps ? gps[0] : null,
                lon: gps ? gps[1] : null,
              }
            });
          }

          setTimeout(() => {
            var message = `<i class="fas fa-check-circle me-2"></i>${res.employee}<br>บันทึกเวลามา ${res.return_date}`;
            showMessage(message, "success");
            clearForm();
          }, 500);
        } else {
          var message = `<i class="fas fa-exclamation-triangle me-2"></i>${res.employee} ${res.msg}`;
          showMessage(message, "warning");
          clearForm();
        }
      },
      error: function(err) {
        showMessage(`<i class="fas fa-times-circle me-2"></i>เกิดข้อผิดพลาดในการบันทึกข้อมูล`, "danger");
        clearForm();
      }
    });
  } else {
    showMessage('<i class="fas fa-exclamation-circle me-2"></i>กรุณาเลือกรายชื่อพนักงาน', "warning");
    // Focus ไปที่ช่องกรอกชื่อพนักงาน
    $('#employee').focus();
  }
}

// ฟังก์ชันลงเวลาออก
async function ClockOut() {
  event.preventDefault();
  
  var employee = document.getElementById("employee").value;

  if (employee != '') {
    showLoading("กำลังบันทึกเวลาออก...");
    
    // เพิ่มเอฟเฟกต์ที่ปุ่ม
    animateButton('#clockout');
    
    // ข้อมูลที่จะส่งไปยัง API
    const apiData = {
      employee,
      lat: gps ? gps[0] : null,
      lon: gps ? gps[1] : null
    };
    
    // เพิ่มข้อมูล LINE ถ้ามี profile
    if (profile) {
      // ใช้ค่าตามโครงสร้างของ liff.getProfile()
      apiData.line_name = profile.displayName;
      apiData.line_picture = profile.pictureUrl;
    }
    
    $.ajax({
      method: 'POST',
      url: scripturl + "/clockout",
      data: apiData,
      success: function (res) {
        if (res.msg == 'SUCCESS') {
          if (profile) {
            // ส่งแจ้งเตือนถ้ามี profile
            $.ajax({
              method: 'POST',
              url: scripturl + "/sendnotify",
              data: {
                message: res.message,
                token: res.token,
                lat: gps ? gps[0] : null,
                lon: gps ? gps[1] : null,
              }
            });
          }

          setTimeout(() => {
            var message = `<i class="fas fa-check-circle me-2"></i>${res.employee}<br>บันทึกเวลากลับ ${res.return_date}`;
            showMessage(message, "success");
            clearForm();
          }, 500);
        } else {
          var message = `<i class="fas fa-exclamation-triangle me-2"></i>${res.employee} ${res.msg}`;
          showMessage(message, "warning");
          clearForm();
        }
      },
      error: function(err) {
        showMessage(`<i class="fas fa-times-circle me-2"></i>เกิดข้อผิดพลาดในการบันทึกข้อมูล`, "danger");
        clearForm();
      }
    });
  } else {
    showMessage('<i class="fas fa-exclamation-circle me-2"></i>กรุณาเลือกรายชื่อพนักงาน', "warning");
    // Focus ไปที่ช่องกรอกชื่อพนักงาน
    $('#employee').focus();
  }
}

// ฟังก์ชันสร้างเอฟเฟกต์ animation สำหรับปุ่ม
function animateButton(buttonSelector) {
  const button = $(buttonSelector);
  button.addClass('btn-animate');
  
  // นำคลาส animation ออกหลังจาก 500ms
  setTimeout(() => {
    button.removeClass('btn-animate');
  }, 500);
}

// ฟังก์ชันดึงตำแหน่ง GPS
function getlocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition, getLocationFromApi);
  } else {
    console.log("Geolocation is not supported by this browser.");
  }
}

// ฟังก์ชันเมื่อดึงตำแหน่ง GPS สำเร็จ
function showPosition(position) {
  var lat = position.coords.latitude;
  var lon = position.coords.longitude;
  gps = [lat, lon];
  console.log("🚀 ~ gps:", gps);
  console.log("Latitude: " + lat + " Longitude: " + lon);
}

// ฟังก์ชันดึงตำแหน่งจากพารามิเตอร์ URL
function getLocationFromParameter() {
  var url = new URL(window.location.href);
  var lat = url.searchParams.get("lat");
  var lon = url.searchParams.get("lon");
  gps = [lat, lon];
  console.log("Latitude: " + lat + " Longitude: " + lon);
}

// ฟังก์ชันดึงตำแหน่งจาก API (กรณีไม่สามารถใช้ Geolocation)
function getLocationFromApi() {
  $.getJSON('https://ipapi.co/json/', function (data) {
    var lat = data.latitude;
    var lon = data.longitude;
    gps = [lat, lon];
    console.log("Latitude: " + lat + " Longitude: " + lon);
    return gps;
  });
}

// ฟังก์ชันล้างฟอร์ม
function clearForm() {
  setTimeout(function () {
    showMessage(owner, "msgBg");
    document.getElementById("myForm").reset();
    $('#employee').focus();
  }, 5000);
}

// ฟังก์ชันแสดงเวลาใหม่ที่รองรับการชดเชยเวลา
function showTime() {
  // ใช้ Date ใหม่
  var date = new Date();
  
  // ดึงค่าชดเชยเวลาจาก localStorage (ถ้ามี)
  var timeOffset = localStorage.getItem('time_offset') || 0;
  timeOffset = parseInt(timeOffset);
  
  // ปรับเวลาให้เป็นเวลาท้องถิ่นก่อน (UTC+0)
  var utcHours = date.getUTCHours();
  var utcMinutes = date.getUTCMinutes();
  var utcSeconds = date.getUTCSeconds();
  
  // คำนวณเวลาไทย (UTC+7) และปรับตามค่าชดเชยเวลา
  var totalMinutes = (utcHours * 60 + utcMinutes) + 420 + timeOffset; // 420 คือ 7 ชั่วโมงเป็นนาที
  var h = Math.floor(totalMinutes / 60) % 24; // ทำให้ชั่วโมงอยู่ในช่วง 0-23
  var m = totalMinutes % 60;
  var s = utcSeconds;
  
  var dot = (s % 2 === 0) ? '\xa0' : '.'; // กระพริบจุดทุกวินาที

  // จัดรูปแบบเวลาให้มี 2 หลักเสมอ
  h = h < 10 ? "0" + h : h;
  m = m < 10 ? "0" + m : m;
  s = s < 10 ? "0" + s : s;

  var time = h + ":" + m + ":" + s + dot;
  
  // กำหนดให้ element ที่มี id เป็น MyClockDisplay แสดงเวลา
  var clockDisplay = document.getElementById("MyClockDisplay");
  if (clockDisplay) {
    clockDisplay.innerText = time;
    clockDisplay.textContent = time;
  }

  setTimeout(showTime, 1000);
}

// เริ่มแสดงเวลาเมื่อโหลดหน้า
showTime();
