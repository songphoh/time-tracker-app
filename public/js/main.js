// กำหนด URL ของ API
var scripturl = '/api';
var owner = 'หน่วยงานราชการ';

// ตัวแปรสำหรับเก็บข้อมูลโปรไฟล์และพิกัด
var profile, gps;

// เริ่มดึงตำแหน่ง GPS
$.when(getlocation()).done(function (res) {
  console.log(res);
  console.log(gps);
});

// เมื่อโหลดหน้าเสร็จ
$(document).ready(function () {
  let profile = null; // ประกาศตัวแปร profile ที่ระดับสูงกว่า

  // กำหนดการทำงานของปุ่ม
  $('#clockin').click(() => ClockIn());
  $('#clockout').click(() => ClockOut());

  // เริ่มต้น LINE LIFF
  liff.init({
    liffId: '2001032478-VR5Akj0k',
    withLoginOnExternalBrowser: true
  });

  // เมื่อ LIFF พร้อมใช้งาน
  liff.ready.then(() => {
    profile = liff.getDecodedIDToken(); // ดึงข้อมูลโปรไฟล์

    if (profile) {
      console.log("🚀 ~ profile:", profile);
      console.log("User ID (sub): " + profile.sub);
      console.log("Display Name (name): " + profile.name);
      console.log("Email: " + (profile.email || "ไม่พบอีเมล"));
      console.log("Picture URL: " + (profile.picture || "ไม่พบรูปโปรไฟล์"));
    } else {
      console.log("โปรไฟล์ยังไม่พร้อมใช้งานหรือไม่มีข้อมูลโปรไฟล์");
    }

    initApp(); // เรียกฟังก์ชันเริ่มต้นแอป
  });

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
});

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
    $('#message').html("<span class='spinner-border spinner-border-sm text-primary'></span> โปรดรอสักครู่ ...!");
    profile = liff.getDecodedIDToken(); // ดึงข้อมูลโปรไฟล์
    
    $.ajax({
      method: 'POST',
      url: scripturl + "/clockin",
      data: {
        employee,
        userinfo,
        lat: gps[0],
        lon: gps[1],
        line_name: profile.name,
        line_picture: profile.picture
      },
      success: function (res) {
        console.log(res);
        
        if (res.msg == 'SUCCESS') {
          $.ajax({
            method: 'POST',
            url: scripturl + "/sendnotify",
            data: {
              message: res.message,
              token: res.token,
              lat: gps[0],
              lon: gps[1],
            }
          });

          setTimeout(() => {
            var message = res.employee + '<br> บันทึกเวลามา ' + res.return_date;
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
      }
    });
  } else {
    $('#message').html('กรุณาเลือกรายชื่อพนักงาน ...!');
    document.getElementById('message').className = 'alert alert-warning text-danger';
    clearForm();
  }
}

// ฟังก์ชันลงเวลาออก
async function ClockOut() {
  event.preventDefault();
  
  var employee = document.getElementById("employee").value;

  if (employee != '') {
    $('#message').html("<span class='spinner-border spinner-border-sm text-warning'></span> โปรดรอสักครู่ ...!");
    profile = liff.getDecodedIDToken(); // ดึงข้อมูลโปรไฟล์
    
    $.ajax({
      method: 'POST',
      url: scripturl + "/clockout",
      data: {
        employee,
        lat: gps[0],
        lon: gps[1],
        line_name: profile.name,
        line_picture: profile.picture
      },
      success: function (res) {
        if (res.msg == 'SUCCESS') {
          $.ajax({
            method: 'POST',
            url: scripturl + "/sendnotify",
            data: {
              message: res.message,
              token: res.token,
              lat: gps[0],
              lon: gps[1],
            }
          });

          setTimeout(() => {
            var message = res.employee + '<br> บันทึกเวลากลับ ' + res.return_date;
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
    geolocation = [lat, lon];
    console.log("Latitude: " + lat + " Longitude: " + lon);
    return geolocation;
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
  var h = date.getHours(); // 0 - 23
  var m = date.getMinutes(); // 0 - 59
  var s = date.getSeconds(); // 0 - 59
  var dot = document.textContent = '.';

  if (s % 2 == 1) {
    dot = document.textContent = '.';
  } else {
    dot = document.textContent = '\xa0';
  }

  h = h < 10 ? "0" + h : h;
  m = m < 10 ? "0" + m : m;
  s = s < 10 ? "0" + s : s;

  var time = h + ":" + m + ":" + s + '' + dot;
  document.getElementById("MyClockDisplay").innerText = time;
  document.getElementById("MyClockDisplay").textContent = time;

  setTimeout(showTime, 1000);
}

// เริ่มแสดงเวลาเมื่อโหลดหน้า
showTime();