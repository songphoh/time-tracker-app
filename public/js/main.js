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

  // ดึง LIFF ID จากฐานข้อมูล
  $.ajax({
    method: "GET",
    url: "/api/getLiffId",
    success: function(response) {
      if (response && response.liffId) {
        initializeLiff(response.liffId);
      } else {
        console.error("ไม่พบ LIFF ID ในฐานข้อมูล");
        $('#message').html("ไม่สามารถเชื่อมต่อกับ LINE ได้ กรุณาติดต่อผู้ดูแลระบบ");
        document.getElementById('message').className = 'alert alert-danger';
      }
    },
    error: function(error) {
      console.error("เกิดข้อผิดพลาดในการดึง LIFF ID", error);
      $('#message').html("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      document.getElementById('message').className = 'alert alert-danger';
    }
  });
});

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
    $('#message').html("ไม่สามารถเชื่อมต่อกับ LINE ได้ กรุณาติดต่อผู้ดูแลระบบ");
    document.getElementById('message').className = 'alert alert-danger';
    
    // แม้จะมีปัญหากับ LIFF ก็ยังให้ใช้งานแอปได้
    initApp();
  });
}

// ฟังก์ชันเริ่มต้นแอป
function initApp() {
  document.getElementById('message').innerText = owner;
  document.getElementById('message').className = 'alert msgBg';
  
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
          source: availableTags
        });
      });
    }
  });

  // ดึงรายชื่อพนักงานสำหรับ dropdown
  getEmployees();
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

// ฟังก์ชันดึงเวลาไคลเอ็นต์พร้อมดีบั๊ก
function getClientTime() {
  // สร้างวัตถุเวลาปัจจุบัน
  var currentTime = new Date();
  
  // แปลงเป็นใช้เวลา UTC ตามมาตรฐาน
  var isoString = currentTime.toISOString();
 
  // แสดงข้อมูลการดีบั๊ก
  console.group('Client Time Debugging');
  console.log('Original Time (Local):', currentTime);
  console.log('Original Time (ISO):', isoString);
  console.log('Timezone Offset:', 
    -currentTime.getTimezoneOffset(), 
    'minutes (Difference from UTC)'
  );
  console.groupEnd();
 
  // คืนค่าเวลาในรูปแบบ ISO string (ซึ่งเป็น UTC)
  return isoString;
}

// แก้ไขฟังก์ชัน ClockIn
async function ClockIn() {
  event.preventDefault();
  
  var employee = document.getElementById("employee").value;
  var userinfo = document.getElementById("userinfo").value;

  if (employee != '') {
    $('#message').html("<span class='spinner-border spinner-border-sm text-primary'></span> โปรดรอสักครู่ ...!");
    
    // ข้อมูลที่จะส่งไปยัง API
    const clientTime = getClientTime(); // เรียกฟังก์ชันดึงเวลา
    
    const apiData = {
      employee,
      userinfo,
      lat: gps ? gps[0] : null,
      lon: gps ? gps[1] : null,
      client_time: clientTime // เพิ่มเวลาจากไคลเอ็นต์
    };
    
    // เพิ่มข้อมูล LINE ถ้ามี profile
    if (profile) {
      apiData.line_name = profile.displayName;
      apiData.line_picture = profile.pictureUrl;
    }
    
    // เพิ่มการแสดงข้อมูลการส่ง
    console.group('Clock In Request');
    console.log('API Data:', apiData);
    console.log('Sent Client Time:', clientTime);
    console.groupEnd();
    
    $.ajax({
      method: 'POST',
      url: scripturl + "/clockin",
      data: apiData,
      success: function (res) {
        // เพิ่มการแสดงข้อมูลการตอบกลับ
        console.group('Clock In Response');
        console.log('Server Response:', res);
        console.groupEnd();
        
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
            // ใช้ค่า return_date จาก server โดยตรงไม่ต้องแปลงอีก
            var returnDate = res.return_date;
            
            var message = res.employee + '<br> บันทึกเวลามา ' + returnDate;
            $('#message').html(message);
            document.getElementById("message").className = "alert alert-primary";
            clearForm();
          }, 500);
        } else {
          var message = res.employee + ' ' + res.msg;
          $('#message').html(message);
          document.getElementById("message").className = "alert alert-warning";
          clearForm();
        }
      },
      error: function(xhr, status, error) {
        // เพิ่มการจัดการข้อผิดพลาด
        console.error('Clock In Error:', status, error);
        console.log('Response Text:', xhr.responseText);
        
        $('#message').html('เกิดข้อผิดพลาดในการส่งข้อมูล');
        document.getElementById("message").className = "alert alert-danger";
        clearForm();
      }
    });
  } else {
    $('#message').html('กรุณาเลือกรายชื่อพนักงาน ...!');
    document.getElementById('message').className = 'alert alert-warning text-danger';
    clearForm();
  }
}

// แก้ไขฟังก์ชัน ClockOut
async function ClockOut() {
  event.preventDefault();
  
  var employee = document.getElementById("employee").value;

  if (employee != '') {
    $('#message').html("<span class='spinner-border spinner-border-sm text-warning'></span> โปรดรอสักครู่ ...!");
    
    // ข้อมูลที่จะส่งไปยัง API
    const clientTime = getClientTime(); // เรียกฟังก์ชันดึงเวลา
    
    const apiData = {
      employee,
      lat: gps ? gps[0] : null,
      lon: gps ? gps[1] : null,
      client_time: clientTime // เพิ่มเวลาจากไคลเอ็นต์
    };
    
    // เพิ่มข้อมูล LINE ถ้ามี profile
    if (profile) {
      apiData.line_name = profile.displayName;
      apiData.line_picture = profile.pictureUrl;
    }
    
    // เพิ่มการแสดงข้อมูลการส่ง
    console.group('Clock Out Request');
    console.log('API Data:', apiData);
    console.log('Sent Client Time:', clientTime);
    console.groupEnd();
    
    $.ajax({
      method: 'POST',
      url: scripturl + "/clockout",
      data: apiData,
      success: function (res) {
        // เพิ่มการแสดงข้อมูลการตอบกลับ
        console.group('Clock Out Response');
        console.log('Server Response:', res);
        console.groupEnd();
        
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
            // ใช้ค่า return_date จาก server โดยตรงไม่ต้องแปลงอีก
            var returnDate = res.return_date;
            
            var message = res.employee + '<br> บันทึกเวลากลับ ' + returnDate;
            $('#message').html(message);
            document.getElementById("message").className = "alert alert-primary";
            clearForm();
          }, 500);
        } else {
          var message = res.employee + ' ' + res.msg;
          $('#message').html(message);
          document.getElementById("message").className = "alert alert-warning";
          clearForm();
        }
      },
      error: function(xhr, status, error) {
        // เพิ่มการจัดการข้อผิดพลาด
        console.error('Clock Out Error:', status, error);
        console.log('Response Text:', xhr.responseText);
        
        $('#message').html('เกิดข้อผิดพลาดในการส่งข้อมูล');
        document.getElementById("message").className = "alert alert-danger";
        clearForm();
      }
    });
  } else {
    $('#message').html("กรุณาเลือกรายชื่อพนักงาน ...!");
    document.getElementById("message").className = "alert alert-warning text-danger";
    clearForm();
  }
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
    document.getElementById('message').innerText = owner;
    document.getElementById("message").className = "alert msgBg";
    document.getElementById("myForm").reset();
  }, 5000);
}

// ฟังก์ชันแสดงเวลา
function showTime() {
  var date = new Date();
  var h = date.getHours(); // 0 - 23 (เวลาท้องถิ่น)
  var m = date.getMinutes(); // 0 - 59
  var s = date.getSeconds(); // 0 - 59
  var dot = ':'; // ให้เริ่มต้นเป็น : เสมอ

  // ควบคุมจุดกระพริบ (ใช้เทคนิค CSS visibility แทน)
  var separator = s % 2 === 0 ? '<span class="blink">:</span>' : '<span class="blink" style="visibility:hidden">:</span>';

  // เพิ่ม 0 นำหน้าตัวเลขถ้าจำเป็น
  h = h < 10 ? "0" + h : h;
  m = m < 10 ? "0" + m : m;
  s = s < 10 ? "0" + s : s;

  // แสดงเวลาโดยใช้ innerHTML เพื่อรองรับ HTML tags
  // แบ่งเป็น 3 ส่วนคือ ชั่วโมง:นาที:วินาที
  var timeDisplay = document.getElementById("MyClockDisplay");
  timeDisplay.innerHTML = h + separator + m + '<span class="dot">:</span>' + s;

  // เรียกฟังก์ชันนี้ทุก 1 วินาที
  setTimeout(showTime, 1000);
}

// เพิ่ม CSS สำหรับควบคุมการกระพริบ
var style = document.createElement('style');
style.innerHTML = `
.blink {
  animation: blink-animation 1s steps(2, start) infinite;
}
@keyframes blink-animation {
  to {
    visibility: hidden;
  }
}
.dot {
  display: inline-block;
  min-width: 8px;
}
`;
document.head.appendChild(style);

// เริ่มแสดงเวลาเมื่อโหลดหน้า
showTime();
